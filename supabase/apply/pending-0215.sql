-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0215: TestFlight invite requests from forgelegacy.app
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded, and §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- The new site (Clean v2) leads with "Get TestFlight invite" and an email field. PO decision
-- 2026-09-25: those addresses land in a table and the PO invites them from App Store Connect.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  creates `testflight_requests` (RLS on, no policies) and `request_testflight_invite()` (anon)
-- §2  asserts the table, its unique + check constraints, RLS, and anon's EXECUTE grant; RAISES if not
-- §3  reports how many requests exist and how many are still waiting. Read-only.
--
-- ⚠ Additive, touches no existing table. Until the new site is deployed nothing calls the function,
-- so §3 should say 0 requests — that is correct, not a failed migration.
--
-- ⚠ To read the list later:  select email, created_at from testflight_requests where invited_at is null order by created_at;
-- ⚠ After inviting someone:   update testflight_requests set invited_at = now() where email = '...';
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE TABLE AND THE ONE WRITE PATH
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.testflight_requests (
  id          bigint generated always as identity primary key,
  email       text        not null,
  source      text        not null default 'site',
  created_at  timestamptz not null default now(),
  invited_at  timestamptz
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'testflight_requests_email_key') then
    alter table public.testflight_requests add constraint testflight_requests_email_key unique (email);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'testflight_requests_email_check') then
    alter table public.testflight_requests add constraint testflight_requests_email_check
      check (email = lower(email) and length(email) <= 254 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'testflight_requests_source_check') then
    alter table public.testflight_requests add constraint testflight_requests_source_check
      check (length(source) <= 40);
  end if;
end $$;

alter table public.testflight_requests enable row level security;
revoke all on public.testflight_requests from anon, authenticated;

comment on table public.testflight_requests is
  'Emails left on forgelegacy.app asking for a TestFlight invite (0215). Written only by request_testflight_invite(); no RLS policies, read in the SQL editor. invited_at = when the PO sent the invite.';

create or replace function public.request_testflight_invite(p_email text, p_source text default 'site')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  insert into public.testflight_requests (email, source)
  values (v_email, left(coalesce(nullif(btrim(p_source), ''), 'site'), 40))
  on conflict on constraint testflight_requests_email_key do nothing;
end;
$$;

revoke all on function public.request_testflight_invite(text, text) from public;
grant execute on function public.request_testflight_invite(text, text) to anon, authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT IT LANDED
-- ═════════════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public.testflight_requests') is null then
    raise exception '0215: table testflight_requests is missing';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'testflight_requests_email_key') then
    raise exception '0215: unique constraint on email is missing';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'testflight_requests_email_check') then
    raise exception '0215: email check constraint is missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.testflight_requests'::regclass) then
    raise exception '0215: RLS is NOT enabled on testflight_requests';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'testflight_requests') then
    raise exception '0215: testflight_requests has a policy — it must have none';
  end if;
  if not has_function_privilege('anon', 'public.request_testflight_invite(text, text)', 'execute') then
    raise exception '0215: anon cannot execute request_testflight_invite';
  end if;
  if has_table_privilege('anon', 'public.testflight_requests', 'select') then
    raise exception '0215: anon can SELECT testflight_requests — the list would be public';
  end if;
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — REPORT (read-only)
-- Expected before the site deploy: requests = 0, waiting = 0.
-- ═════════════════════════════════════════════════════════════════════════════

select
  '0215 applied'                                            as status,
  count(*)                                                  as requests,
  count(*) filter (where invited_at is null)                as waiting
from public.testflight_requests;
