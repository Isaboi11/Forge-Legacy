-- Forge Legacy — 0027: Rank engine state (Slice 1 of the RCM build)
--
-- The engine (src/domain/rank) computes the earned rank; this table holds the persisted rank + the extra
-- state a re-evaluation needs (journey start, current-family entry date, last promotion fire time for
-- spacing). It is the engine's authoritative record. profiles.rank_family / rank_level stay the
-- denormalized DISPLAY fields the UI already reads; the engine writes both.
--
-- Governance note: the RCM specs a SERVER-authoritative engine (D-RCM-26). This app has no custom server,
-- so per the signed-off decision the engine runs IN-APP and writes as the athlete; RLS scopes every write
-- to the owner. Portable to a Postgres/edge function later with no change to the domain logic.
--
-- Idempotent: safe to run repeatedly.

create table if not exists public.athlete_rank_state (
  athlete_id              uuid primary key references profiles(id) on delete cascade,
  family                  text not null default 'foundation' references rank_families(family),
  sub_tier                smallint not null default 1 check (sub_tier between 1 and 4),
  rank_level              smallint not null default 1 check (rank_level between 1 and 25), -- 1–25 (Legacy = 25)
  journey_start_date      date,        -- earliest training record; recomputed by the engine
  family_entry_date       date,        -- when the current family was entered (within-family AW anchor)
  last_promotion_fired_at timestamptz, -- promotion spacing clock (RCM §15)
  updated_at              timestamptz not null default now()
);

alter table public.athlete_rank_state enable row level security;

drop policy if exists ars_owner_select on public.athlete_rank_state;
drop policy if exists ars_owner_insert on public.athlete_rank_state;
drop policy if exists ars_owner_update on public.athlete_rank_state;
create policy ars_owner_select on public.athlete_rank_state
  for select using (athlete_id = auth.uid());
create policy ars_owner_insert on public.athlete_rank_state
  for insert with check (athlete_id = auth.uid());
create policy ars_owner_update on public.athlete_rank_state
  for update using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- ── backfill ──
-- Give every athlete a display rank so the badge/label never render empty. A real onboarded athlete has
-- rank_family NULL today → Foundation I. An already-set rank (e.g. a seed) is preserved. The engine
-- (Slice 3) recomputes and promotes from real activity on next evaluation.
update public.profiles
   set rank_family = 'foundation', rank_level = 1
 where rank_family is null;

-- Seed the engine state from the (now non-null) display rank. rank_level 1–25 derived from family + sub.
insert into public.athlete_rank_state (athlete_id, family, sub_tier, rank_level, journey_start_date, family_entry_date)
select p.id,
       coalesce(p.rank_family, 'foundation'),
       coalesce(p.rank_level, 1),
       (case coalesce(p.rank_family, 'foundation')
          when 'foundation'  then 0 when 'builder'     then 4  when 'craftsman' then 8
          when 'architect'   then 12 when 'established' then 16 when 'legend'    then 20
          when 'legacy'      then 24 else 0 end) + coalesce(p.rank_level, 1),
       coalesce(p.onboarded_at::date, current_date),
       coalesce(p.onboarded_at::date, current_date)
from public.profiles p
on conflict (athlete_id) do nothing;
