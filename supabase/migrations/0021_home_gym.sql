-- Forge Legacy — 0021: the Home Gym equipment profile
--
-- One saved list of what the athlete actually owns. The Home Gym Editor is its ONLY writer; every
-- "Home Gym" filter across the app (Exercise Library W-21, Programs Catalog, Onboarding) reads it and
-- shows only what can really be trained.
--
-- WHY IDS AND NOT LABELS: the design persists display labels to localStorage. Here the values outlive
-- the UI, so we store the stable ids from `src/domain/home-gym/equipment.ts` ('barbell', 'latpulldown',
-- …). Renaming "Leg curl / extension" then costs nothing; storing labels would silently empty gyms.
--
-- WHY NULLABLE, AND WHY NULL != '{}': three states have to stay distinguishable.
--   null  — never set up. The filter offers the editor instead of filtering to nothing.
--   '{}'  — set up and deliberately empty: "I own nothing, bodyweight only." A real answer.
--   {...} — the owned list.
-- Defaulting to '{}' would erase the difference and make every existing athlete look like they'd
-- answered "nothing", so there is no default and no backfill.
--
-- Bodyweight is implied and never stored — it needs no equipment, so it is not a selectable item.
--
-- Additive and idempotent; profiles' existing owner-scoped RLS already covers reads and updates.

alter table profiles add column if not exists home_gym_equipment text[];

comment on column profiles.home_gym_equipment is
  'Owned home-gym equipment ids (see src/domain/home-gym/equipment.ts). null = never set up; {} = owns nothing.';
