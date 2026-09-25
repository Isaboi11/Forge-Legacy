-- Forge Legacy — 0215: TestFlight invite requests from forgelegacy.app
--
-- ══ WHY ══
--
-- The site redesign ("Forge Legacy Site - Clean v2", 2026-09-25) leads with an email field: "Get
-- TestFlight invite". The previous site deliberately took no emails. PO decision 2026-09-25: the
-- address goes into a Supabase table, and the PO sends invites from App Store Connect by hand.
--
-- ══ WHAT THIS DOES ══
--
--   1. `testflight_requests` — one row per address (lowercased, unique). RLS on, NO policies: nobody
--      reads or writes it through the API. The list is read in the SQL editor (or /admin later).
--   2. `request_testflight_invite(p_email, p_source)` — the ONLY write path, granted to anon. It
--      validates the address, lowercases it, and ignores a repeat. It returns nothing either way, so
--      the site cannot be used to test whether an address is already on the list.
--
-- ══ ⚠ ══
--
-- The site calls this with the PUBLIC anon key. That is what the anon key is for, and it can do
-- exactly one thing here: add a syntactically valid address. `invited_at` is for the PO to set when
-- the TestFlight invite goes out, so the list doubles as the record of who is still waiting.

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
