-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0224: health-data consent (Washington MHMDA / Nevada SB 370)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded, and §3 is read-only.
--
-- ADDITIVE ONLY: one new table (`health_consents`) and one new function (`has_health_consent`). Nothing
-- the deployed app reads is changed or revoked, so the order against the client deploy does not matter.
-- The client that writes here treats a missing table as "not yet consented" — before this is applied it
-- still asks, and holds the answer for that session only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- The app now asks for two separate opt-ins: Nutrition (before any food or body data is collected) and
-- AI features (before anything is sent to Anthropic). Every answer — Agree, Not now, Withdraw — is one
-- row here, with the policy version and a server timestamp. The newest row per kind is the answer.
-- Append-only: the athlete can read and add rows, never change or delete one (account deletion still
-- removes them all, by cascade). athlete_id and created_at are set by the server; the client is granted
-- INSERT on kind, action, policy_version and platform only.
--
-- §1  the table, its checks and index, owner-only RLS (select + insert), column-level grants, and
--     has_health_consent(kind, version) for a future server-side check (nothing calls it yet)
-- §2  asserts the table, RLS, both policies, the function and the column grants, and RAISES if not
-- §3  reports what landed. Read-only.
--
-- EXPECTED §3 (one row):
--   table_exists true · rls_on true · policies 2 · has_fn true
--   client_may_insert_athlete_id false · client_may_insert_created_at false · client_may_update false
--   answers 0 · athletes 0
-- `answers` is 0 until the app with the consent sheet is deployed / published and someone taps Agree or
-- Not now. A non-zero count before that means something else is writing here.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0224_health_consents.sql)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. The table ─────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.health_consents (
  id              uuid         primary key default gen_random_uuid(),
  athlete_id      uuid         not null default auth.uid() references auth.users(id) on delete cascade,
  kind            text         not null,
  action          text         not null,
  policy_version  text         not null,
  platform        text,
  created_at      timestamptz  not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'health_consents_kind_check') then
    alter table public.health_consents
      add constraint health_consents_kind_check check (kind in ('nutrition', 'ai_sharing'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'health_consents_action_check') then
    alter table public.health_consents
      add constraint health_consents_action_check check (action in ('granted', 'declined', 'withdrawn'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'health_consents_version_check') then
    alter table public.health_consents
      add constraint health_consents_version_check check (char_length(policy_version) between 1 and 40);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'health_consents_platform_check') then
    alter table public.health_consents
      add constraint health_consents_platform_check check (platform is null or platform in ('ios', 'android', 'web'));
  end if;
end $$;

create index if not exists health_consents_athlete_idx on public.health_consents (athlete_id, kind, created_at desc);

comment on table public.health_consents is
  'Consumer-health-data consents (0224; Washington MHMDA, Nevada SB 370). Append-only: one row per answer (granted / declined / withdrawn) per kind (nutrition = collecting food and body data; ai_sharing = sending what an AI feature needs to Anthropic). The newest row per kind is the current answer, and a grant counts only for its policy_version. athlete_id and created_at are server-set. Written by the app (src/lib/consent.ts); shown at Settings → Health Data & AI.';

alter table public.health_consents enable row level security;

drop policy if exists health_consents_owner_select on public.health_consents;
drop policy if exists health_consents_owner_insert on public.health_consents;
create policy health_consents_owner_select on public.health_consents for select
  using (athlete_id = auth.uid());
create policy health_consents_owner_insert on public.health_consents for insert
  with check (athlete_id = auth.uid());

revoke all on public.health_consents from anon;
revoke all on public.health_consents from authenticated;
grant select on public.health_consents to authenticated;
grant insert (kind, action, policy_version, platform) on public.health_consents to authenticated;

-- ── 2. The check an Edge Function can make (not called yet) ──────────────────────────────────────────

create or replace function public.has_health_consent(p_kind text, p_policy_version text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((
    select hc.action = 'granted' and hc.policy_version = p_policy_version
      from public.health_consents hc
     where hc.athlete_id = auth.uid()
       and hc.kind = p_kind
     order by hc.created_at desc, hc.id desc
     limit 1
  ), false);
$$;

comment on function public.has_health_consent(text, text) is
  'True when the CALLER''s newest answer for p_kind is a grant against p_policy_version (0224). SECURITY INVOKER: reads only the caller''s own rows. For Edge Functions that must refuse an AI call without consent.';

revoke all on function public.has_health_consent(text, text) from public, anon;
grant execute on function public.has_health_consent(text, text) to authenticated;

commit;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  missing text := '';
begin
  if to_regclass('public.health_consents') is null then missing := missing || ' table'; end if;
  if not coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.health_consents')), false) then
    missing := missing || ' rls';
  end if;
  if not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'health_consents' and p.policyname = 'health_consents_owner_select') then
    missing := missing || ' select_policy';
  end if;
  if not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'health_consents' and p.policyname = 'health_consents_owner_insert') then
    missing := missing || ' insert_policy';
  end if;
  if to_regprocedure('public.has_health_consent(text, text)') is null then missing := missing || ' has_health_consent'; end if;
  if not has_column_privilege('authenticated', 'public.health_consents', 'policy_version', 'INSERT') then
    missing := missing || ' insert_grant';
  end if;
  if has_column_privilege('authenticated', 'public.health_consents', 'created_at', 'INSERT') then
    missing := missing || ' created_at_is_client_writable';
  end if;
  if has_table_privilege('authenticated', 'public.health_consents', 'UPDATE') or has_table_privilege('authenticated', 'public.health_consents', 'DELETE') then
    missing := missing || ' not_append_only';
  end if;
  if missing <> '' then
    raise exception '0224 DID NOT APPLY CLEANLY. Wrong or missing:%', missing;
  end if;
  raise notice '0224 OK — health_consents is in, owner-only and append-only.';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — WHAT IS NOW THERE. Read-only.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

select
  to_regclass('public.health_consents') is not null                                                    as table_exists,
  (select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.health_consents'))        as rls_on,
  (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = 'health_consents') as policies,
  to_regprocedure('public.has_health_consent(text, text)') is not null                                 as has_fn,
  has_column_privilege('authenticated', 'public.health_consents', 'athlete_id', 'INSERT')             as client_may_insert_athlete_id,
  has_column_privilege('authenticated', 'public.health_consents', 'created_at', 'INSERT')             as client_may_insert_created_at,
  has_table_privilege('authenticated', 'public.health_consents', 'UPDATE')                            as client_may_update,
  (select count(*) from public.health_consents)                                                        as answers,
  (select count(distinct hc.athlete_id) from public.health_consents hc)                                as athletes;
