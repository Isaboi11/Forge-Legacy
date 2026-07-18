-- 0013 — user-authored programs (the "build my own" path, BU-1 first slice).
--
-- A program is stored as ONE JSONB blob shaped to the full Forge Program Builder .dc model:
--   { name, weeks, daysPerWeek, vary, days: [ { letter, name, warmup, main, cooldown } ], weekPlans }
-- B1 (this cut) writes a SUBSET — name + daysPerWeek + each day's `main` (warmup/cooldown empty,
-- vary:false, weeks default) — and the full builder (C) fills in the rest with NO schema change.
-- Owner-scoped like the rest of the spine (athlete_id = auth.uid()).

create table if not exists public.programs (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references profiles(id) on delete cascade,
  name        text not null,
  structure   jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists programs_athlete_created on public.programs (athlete_id, created_at desc);

alter table public.programs enable row level security;

create policy programs_owner_select on public.programs for select using (athlete_id = auth.uid());
create policy programs_owner_insert on public.programs for insert with check (athlete_id = auth.uid());
create policy programs_owner_update on public.programs for update using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy programs_owner_delete on public.programs for delete using (athlete_id = auth.uid());
