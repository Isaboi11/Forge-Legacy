-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- 0224 · HEALTH-DATA CONSENT — the athlete's Nutrition and AI-sharing opt-ins, stored and provable
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- PO, 2026-09-26: build the in-app consent Washington's My Health My Data Act (and Nevada SB 370) needs.
-- `Docs/Legal/Mock-Legal-Review-2026-09-25.md` item 3: opt-in consent before COLLECTING consumer health
-- data, and a SEPARATE consent before SHARING it (the Anthropic calls behind every AI feature count as
-- sharing). The app asks on first use of Nutrition and before the first AI call
-- (`src/domain/consent/consent.ts`, `src/lib/consent.ts`); this table is where the answers live, so they
-- hold across devices and can be shown to have been given.
--
-- ══ THE RULES THE TABLE CARRIES ══
--
--   · APPEND-ONLY. One row per answer — granted, declined or withdrawn — and the newest row per kind is
--     the athlete's current answer. Nothing is ever updated or deleted by the athlete: a consent record
--     that can be rewritten proves nothing. (Account deletion still removes every row, by cascade from
--     auth.users, as the privacy policy promises.)
--   · THE SERVER STAMPS WHO AND WHEN. `athlete_id` defaults to auth.uid() and `created_at` to now(), and
--     `authenticated` is granted INSERT on the other four columns only — so the client cannot backdate an
--     answer or write one for somebody else. RLS checks the owner as well.
--   · THE POLICY VERSION IS STORED WITH EVERY ANSWER. A grant only counts for the version it was given
--     against (the "Last updated" date of site/health-data.html); raising the version re-asks everybody.
--   · Owner-only SELECT, for the Settings screen (Account Settings → Privacy & Alerts → Health Data & AI).
--
-- ══ has_health_consent(kind, version) ══
--
-- New, for the server-side follow-up: an Edge Function running as the athlete can refuse an AI call
-- without consent. SECURITY INVOKER — it reads only the caller's own rows, through the RLS above. Nothing
-- calls it yet; no Edge Function is changed by this migration.
--
-- ⚠ ADDITIVE ONLY. A new table and a new function; nothing the deployed app reads is touched or revoked.
-- The client that writes here is safe BEFORE this is applied: a missing table reads as "not yet
-- consented" (it asks, and holds the answer for that session only) and never crashes.
--
-- Safe to run twice.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

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
