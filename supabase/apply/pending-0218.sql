-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0218: Holt remembers past chats (a summary each, last ten) + the 'summary' and 'web' actions
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded, and §3 is read-only.
--
-- ⚠ APPLY THIS BEFORE redeploying coach-ask with chat memory / web recipes. Until it is in, the new
-- actions are unknown to coach_ai_spend_credits (22023): summaries silently never save and an online
-- recipe search answers "meter unavailable". Everything else in coach-ask keeps working either way.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- §1  the table, its RLS, the keep-ten trigger, and action_credits gains summary=0 and web=3
-- §2  asserts every piece is present, and RAISES if not
-- §3  reports the policies, the action weights and the row count. Read-only.
--
-- EXPECTED §3: 3 policies (select, insert, delete); summary = 0, web = 3; 0 summaries (nothing writes
-- them until coach-ask is redeployed).

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0218_holt_chat_memory.sql)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. The table ─────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.holt_chat_summaries (
  id          uuid         primary key default gen_random_uuid(),
  athlete_id  uuid         not null default auth.uid() references auth.users(id) on delete cascade,
  summary     varchar(500) not null,
  created_at  timestamptz  not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'holt_chat_summaries_len') then
    alter table public.holt_chat_summaries
      add constraint holt_chat_summaries_len check (char_length(btrim(summary)) >= 10);
  end if;
end $$;

create index if not exists holt_chat_summaries_athlete_idx on public.holt_chat_summaries (athlete_id, created_at desc);

comment on table public.holt_chat_summaries is
  'Coach Holt''s memory of past chats (0218, Coach-AI-Amendment-002): a 2–3 line summary per conversation, the last 10 per athlete. Visible and deletable at /holt-memory. Written by coach-ask as the athlete; medical sentences dropped before storage.';

alter table public.holt_chat_summaries enable row level security;

drop policy if exists holt_chat_summaries_owner_select on public.holt_chat_summaries;
drop policy if exists holt_chat_summaries_owner_insert on public.holt_chat_summaries;
drop policy if exists holt_chat_summaries_owner_delete on public.holt_chat_summaries;
create policy holt_chat_summaries_owner_select on public.holt_chat_summaries for select
  using (athlete_id = auth.uid());
create policy holt_chat_summaries_owner_insert on public.holt_chat_summaries for insert
  with check (athlete_id = auth.uid());
create policy holt_chat_summaries_owner_delete on public.holt_chat_summaries for delete
  using (athlete_id = auth.uid());

revoke all on public.holt_chat_summaries from anon;
revoke update on public.holt_chat_summaries from authenticated;
grant select, insert, delete on public.holt_chat_summaries to authenticated;

-- ── 2. Keep the last ten ─────────────────────────────────────────────────────────────────────────────

create or replace function public.holt_chat_summaries_keep_ten()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  delete from public.holt_chat_summaries s
   where s.athlete_id = new.athlete_id
     and s.id not in (
       select k.id from public.holt_chat_summaries k
        where k.athlete_id = new.athlete_id
        order by k.created_at desc, k.id desc
        limit 10
     );
  return null;
end;
$$;

drop trigger if exists holt_chat_summaries_keep_ten on public.holt_chat_summaries;
create trigger holt_chat_summaries_keep_ten
  after insert on public.holt_chat_summaries
  for each row execute function public.holt_chat_summaries_keep_ten();

-- ── 3. The two actions ───────────────────────────────────────────────────────────────────────────────
--
-- Same merge order as 0174: the new keys are on the LEFT, so a weight hand-tuned since can never be
-- overwritten, and a second run is a no-op.

alter table public.coach_ai_config
  alter column action_credits set default
    '{"message": 1, "program": 1, "day": 1, "photo_read": 3, "photo_import": 2, "form_check": 6, "summary": 0, "web": 3}'::jsonb;

update public.coach_ai_config
   set action_credits = jsonb_build_object('summary', 0, 'web', 3) || action_credits,
       updated_at = now()
 where not (action_credits ? 'summary' and action_credits ? 'web');

comment on column public.coach_ai_config.action_credits is
  'Per-action credit weights. message/program/day 1 · photo_import 2 · photo_read 3 · web 3 · form_check 6 · summary 0. '
  'An action absent from this map raises 22023 in coach_ai_spend_credits rather than costing zero.';

commit;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  missing text := '';
begin
  if to_regclass('public.holt_chat_summaries') is null then missing := missing || ' table'; end if;
  if not exists (select 1 from pg_class c where c.oid = 'public.holt_chat_summaries'::regclass and c.relrowsecurity) then missing := missing || ' rls'; end if;
  if (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = 'holt_chat_summaries') <> 3 then missing := missing || ' policies'; end if;
  if not exists (select 1 from pg_trigger t where t.tgname = 'holt_chat_summaries_keep_ten' and not t.tgisinternal) then missing := missing || ' trigger'; end if;
  if not exists (select 1 from pg_constraint k where k.conname = 'holt_chat_summaries_len') then missing := missing || ' len_check'; end if;
  if not exists (select 1 from public.coach_ai_config c where c.id and c.action_credits ? 'summary' and c.action_credits ? 'web') then missing := missing || ' actions'; end if;
  if missing <> '' then
    raise exception '0218 DID NOT FULLY APPLY. Missing:%', missing;
  end if;
  raise notice '0218 OK — table, RLS, 3 policies, trigger, check, and both actions present.';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — WHAT IS NOW THERE. Read-only.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

select
  (select string_agg(p.policyname, ', ' order by p.policyname) from pg_policies p
    where p.schemaname = 'public' and p.tablename = 'holt_chat_summaries')              as policies,
  (select c.action_credits ->> 'summary' from public.coach_ai_config c where c.id)     as summary_credits,
  (select c.action_credits ->> 'web' from public.coach_ai_config c where c.id)         as web_credits,
  (select count(*) from public.holt_chat_summaries)                                    as summaries_stored;
