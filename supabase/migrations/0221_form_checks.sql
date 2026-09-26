-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- 0221 — FORM CHECKS: the record Holt's form reads are kept in, and the quote that stops an
--        unreadable clip from costing a credit
--
-- Built to `Coach Holt Form Check.dc.html` (PO, 2026-09-25) — screens 04 (the read: Useful / Not useful,
-- Save to form history) and 05 (form history timeline + compare). Plan: `Docs/Coach-Holt-Form-Reading-
-- Plan-v1.0.md` §3.5–§3.6, §9.3, §9.5.
--
-- ══ 1. `form_checks` ══
--
-- One row per READ THAT CAME BACK — written by the app after a successful read, never by the Edge
-- Function (which has only the athlete's JWT and no reason to hold state). `saved` is the athlete's
-- "Save to form history"; the history screen reads only saved rows. `useful` is the thumbs.
--
-- `read` is the SANITISED read exactly as the screen drew it — the guard in `src/domain/coach/
-- form-check.ts` has already run on it twice (function + app). Nothing unguarded is stored.
--
-- ⚠ `key_frame_path` IS A STORAGE PATH, NEVER A URL. The bucket below is private, so the app signs a URL
-- at READ time. A persisted signed URL is the exact defect `project_photo_buckets_public_by_decision`
-- records: a 60-minute link written into a permanent row, which the author kept seeing from cache and
-- nobody else ever could.
--
-- ══ 2. `form-frames` — a PRIVATE bucket, from birth ══
--
-- Unlike `chapter-photos` / `transformation-media` (public by PO decision 09-03, and privatising them
-- took 21 photos off the live app), this bucket is new: no deployed client reads it, so it can be
-- private from the first object. One JPEG per saved read — the frame Holt marked — under
-- `<athlete uuid>/<form_check id>.jpg`. Owner-only read/write/delete.
--
-- ⚠ ACCOUNT WIPE: storage is dashboard-only (`project_account_wipe_procedure`). Add `form-frames` to the
-- buckets that procedure empties.
--
-- ══ 3. `coach_ai_quote(p_action)` — read-only ══
--
-- "Would this spend be allowed, and what does it cost?" — WITHOUT spending. Two callers:
--   · `coach-form-check` asks BEFORE the model call, then calls the existing `coach_ai_spend_credits`
--     only AFTER a readable read. That is what makes the design's "Not charged." true on an
--     unreadable clip (Plan §9.3).
--   · The Start screen shows "Uses 6 of your N AI credits this month" from it — the weight stays in
--     `coach_ai_config` (MA3-D16), never a constant in `src/`.
-- Read-only and scoped to `auth.uid()`, so exposing it to `authenticated` gives nothing away that
-- `coach_ai_balance()` does not already. `coach_ai_spend_credits` is NOT touched
-- (`feedback_never_retype_an_existing_function`).
--
-- ⚠ Cost of the change: an athlete with credits can now make a model call that ends unreadable without
-- paying for it. That is the PO's "Not charged." and the price is ours (~one image read). If it is ever
-- abused, cap unreadable reads per day here, not in the client.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. form_checks ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.form_checks (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lift           text not null check (char_length(lift) between 1 and 60),
  exercise_key   text check (exercise_key is null or char_length(exercise_key) <= 120),
  lift_key       text generated always as (coalesce(exercise_key, lower(lift))) stored,
  view           text check (view is null or view in ('side', 'front', 'behind', 'diagonal', 'other')),
  rep_count      int check (rep_count is null or rep_count between 1 and 50),
  read           jsonb not null,
  key_frame_path text check (key_frame_path is null or char_length(key_frame_path) <= 200),
  key_frame_ms   int check (key_frame_ms is null or key_frame_ms between 0 and 600000),
  saved          boolean not null default false,
  useful         boolean,
  created_at     timestamptz not null default now()
);

create index if not exists form_checks_history_idx
  on public.form_checks (athlete_id, lift_key, created_at desc);

alter table public.form_checks enable row level security;

drop policy if exists "form_checks_own_select" on public.form_checks;
create policy "form_checks_own_select" on public.form_checks
  for select to authenticated using (athlete_id = auth.uid());

drop policy if exists "form_checks_own_insert" on public.form_checks;
create policy "form_checks_own_insert" on public.form_checks
  for insert to authenticated with check (athlete_id = auth.uid());

drop policy if exists "form_checks_own_update" on public.form_checks;
create policy "form_checks_own_update" on public.form_checks
  for update to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

drop policy if exists "form_checks_own_delete" on public.form_checks;
create policy "form_checks_own_delete" on public.form_checks
  for delete to authenticated using (athlete_id = auth.uid());

revoke all on public.form_checks from anon;
grant select, insert, update, delete on public.form_checks to authenticated;

-- ── 2. form-frames (private) ───────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('form-frames', 'form-frames', false, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "form_frames_own_select" on storage.objects;
create policy "form_frames_own_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'form-frames' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "form_frames_own_insert" on storage.objects;
create policy "form_frames_own_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'form-frames' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "form_frames_own_delete" on storage.objects;
create policy "form_frames_own_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'form-frames' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── 3. coach_ai_quote ──────────────────────────────────────────────────────────────────────────

create or replace function public.coach_ai_quote(p_action text)
returns table (allowed boolean, cost int, remaining int, allowance int)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_cost      int;
  v_allowance int;
  v_metering  boolean;
  v_spent     int;
  v_period_al int;
begin
  if v_uid is null then
    return query select false, 0, 0, 0;
    return;
  end if;

  -- The same entitlement test `coach_ai_spend_credits` (0203) runs, so the quote and the spend agree.
  if not exists (
    select 1
      from public.athlete_entitlement e
     where e.athlete_id = v_uid
       and e.coach_ai
       and (e.coach_ai_until is null or e.coach_ai_until > now())
  ) then
    return query select false, 0, 0, 0;
    return;
  end if;

  select c.credits_per_period,
         (c.action_credits ->> p_action)::int,
         c.metering_only
    into v_allowance, v_cost, v_metering
    from public.coach_ai_config c
   where c.id;

  if v_cost is null then
    return query select false, 0, 0, coalesce(v_allowance, 0);
    return;
  end if;

  -- ⚠ INTO SEPARATE VARIABLES: with no period row yet (first read of the month) SELECT INTO sets its
  -- targets to NULL, which would wipe the config allowance read above.
  select p.spent, p.allowance
    into v_spent, v_period_al
    from public.coach_ai_period p
   where p.athlete_id = v_uid
     and p.period = date_trunc('month', now())::date;

  v_spent := coalesce(v_spent, 0);
  v_allowance := coalesce(v_period_al, v_allowance, 0);

  return query
    select (v_metering or v_spent + v_cost <= v_allowance),
           v_cost,
           greatest(v_allowance - v_spent, 0),
           v_allowance;
end;
$$;

revoke all on function public.coach_ai_quote(text) from public;
revoke execute on function public.coach_ai_quote(text) from anon;
grant execute on function public.coach_ai_quote(text) to authenticated;

commit;
