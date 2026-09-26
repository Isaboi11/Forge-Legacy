-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0221: form checks (history + feedback), the private `form-frames` bucket, coach_ai_quote
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded (`if not exists`, `drop policy if exists`,
-- `on conflict`, `create or replace` on a NEW function), and §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- `Coach Holt Form Check.dc.html` (PO 09-25): the read gets Useful / Not useful and Save to form
-- history; a lift gets a form history timeline and a compare view; and an unreadable clip is
-- "Not charged." All three need this file.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  creates `form_checks` (owner-only RLS), the PRIVATE `form-frames` bucket (owner-only folder
--     policies), and `coach_ai_quote(p_action)` — a READ-ONLY "would this spend be allowed, and what
--     does it cost" that the Edge Function asks before the model call.
-- §2  asserts every one of those exists, and RAISES if not.
-- §3  reports what landed. Read-only.
--
-- ⚠ NOTHING EXISTING IS CHANGED. `coach_ai_spend_credits` is not retyped (it is only CALLED later now).
--   The bucket is new, so private-from-birth cannot take anything off the live app (unlike 0188).
--
-- ⚠ ORDER: paste this BEFORE redeploying `coach-form-check`. The new function calls
--   `coach_ai_quote`; without it every read fails as `meter_unavailable` ("That broke on my end").
--   The currently deployed function does not call it, so pasting first is harmless.
--
-- ⚠ PREDICTED §3 (before the new app is published): form_checks 0 rows · bucket public = false ·
--   4 table policies · 3 bucket policies · quote function present. Rows stay 0 until the
--   new build-9 OTA is out, because only that app writes them. Non-zero before then = something wrong.
--
-- ⚠ ACCOUNT WIPE: add the `form-frames` bucket to the dashboard storage step of the wipe procedure.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- ═══ §1 — THE STATEMENTS (verbatim from supabase/migrations/0221_form_checks.sql) ═══

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


-- ═══ §2 — ASSERT IT LANDED ═══

do $$
declare
  v_missing text := '';
begin
  if to_regclass('public.form_checks') is null then v_missing := v_missing || ' table:form_checks'; end if;
  if not exists (select 1 from pg_class where relname = 'form_checks' and relrowsecurity) then
    v_missing := v_missing || ' rls:form_checks';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'form_checks'
        and policyname in ('form_checks_own_select','form_checks_own_insert','form_checks_own_update','form_checks_own_delete')) <> 4 then
    v_missing := v_missing || ' policies:form_checks';
  end if;
  if not exists (select 1 from storage.buckets where id = 'form-frames' and public = false) then
    v_missing := v_missing || ' bucket:form-frames(private)';
  end if;
  if (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
        and policyname in ('form_frames_own_select','form_frames_own_insert','form_frames_own_delete')) <> 3 then
    v_missing := v_missing || ' policies:form-frames';
  end if;
  if to_regprocedure('public.coach_ai_quote(text)') is null then v_missing := v_missing || ' fn:coach_ai_quote'; end if;
  if v_missing <> '' then
    raise exception '0221 did not land:%', v_missing;
  end if;
end $$;

-- ═══ §3 — REPORT (read-only; the editor shows only this last result) ═══

select
  (select count(*) from public.form_checks)                                               as form_check_rows,
  (select public from storage.buckets where id = 'form-frames')                           as bucket_public,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'form_checks')  as table_policies,
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
     and policyname like 'form_frames_%')                                                 as bucket_policies,
  (to_regprocedure('public.coach_ai_quote(text)') is not null)                            as quote_fn;
