-- Forge Legacy — 0132: when did this athlete last open the app
--
-- ══ WHY THIS IS ITS OWN TABLE AND NOT A COLUMN ON `profiles` ══
--
-- The obvious move is `alter table profiles add column last_active_at`. `syncAthleteTimezone()` already
-- fires an UPDATE on `profiles` on every launch and every auth change, so the write is free.
--
-- It is also the one place this must not go.
--
-- `0001_spine.sql` is `create policy profiles_read on profiles for select using (true)` — the profile
-- table is WORLD-READABLE, and `0114_athlete_search.sql`'s own header already records that any holder of
-- the anon key can page the whole of it. A `last_active_at` there would publish every athlete's last
-- app-open time to the public internet. That is a presence signal — materially worse than the timezone
-- already sitting there, because it says who is around right now and who has stopped coming.
--
-- So presence lives here, owner-scoped, in the same shape as `push_tokens.last_seen_at` (0120), and the
-- dashboard reads it through a SECURITY DEFINER function rather than directly.
--
-- P-6-Amendment-001 P6-A1-D7. Idempotent. Depends on 0001. RUN AFTER 0131.

create table if not exists public.athlete_activity (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  last_active_at timestamptz not null default now(),
  last_platform  text check (last_platform is null or last_platform in ('ios', 'android', 'web')),
  last_version   text check (last_version is null or length(last_version) <= 32)
);

-- One row per athlete, overwritten each launch. NOT a session history — the policy describes it as
-- "when you last opened the app", and a table that accumulated one row per launch would be an event
-- log wearing a different name.
create index if not exists athlete_activity_recent on public.athlete_activity (last_active_at desc);

alter table public.athlete_activity enable row level security;

drop policy if exists athlete_activity_own on public.athlete_activity;
create policy athlete_activity_own on public.athlete_activity for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

comment on table public.athlete_activity is
  'Last app-open per athlete (P6-A1-D7). Deliberately NOT a column on profiles, whose select policy is `using (true)` — a presence signal on a world-readable table would publish everyone''s activity. Overwritten per launch; not a session history. Read in aggregate only, via SECURITY DEFINER.';
