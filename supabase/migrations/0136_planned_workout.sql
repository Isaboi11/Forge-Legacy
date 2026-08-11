-- Forge Legacy — 0136: the one-off workout you built for later
--
-- A workout the athlete planned in the builder and has not trained yet. It sits on the Home hero waiting
-- to be started, and it is CONSUMED the moment it is: this is an intention for one session, not a
-- reusable shape.
--
-- ── WHY THIS IS NOT A TEMPLATE ───────────────────────────────────────────────────────────────────────
--
-- The builder's "Save for later" already wrote a `workout_templates` row, which quietly made every
-- one-off permanent: plan Thursday's session, train it, and it stays in the library for ever alongside
-- the shapes actually meant to be reused. A template you will run for months and a workout you are doing
-- on Thursday are different objects, and the library is the wrong home for the second one.
--
-- Saving it as a template stays available — offered at the END of the session, once the athlete knows
-- whether it was worth keeping. That is a better moment to ask than before they have done it.
--
-- ── ONE SLOT, ENFORCED BY THE PRIMARY KEY ────────────────────────────────────────────────────────────
--
-- `athlete_id` IS the primary key, so an athlete has at most one planned workout and an upsert replaces
-- it. That is the product rule ("build another and it replaces the first") expressed as a constraint
-- rather than as application code that has to remember to delete the old row — the shape that has gone
-- wrong here before. No expiry: a plan that silently vanishes is worse than a stale one, so it waits
-- until it is trained or cleared.

create table if not exists public.planned_workouts (
  athlete_id uuid primary key references public.profiles(id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  -- [{ catalogKey, name, sets, targetReps }] in order — the same shape `workout_templates.exercises`
  -- holds and the same one `WorkoutLaunch.exercises` opens, so starting one reuses the existing path.
  exercises  jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.planned_workouts enable row level security;

drop policy if exists planned_workouts_own_select on public.planned_workouts;
drop policy if exists planned_workouts_own_insert on public.planned_workouts;
drop policy if exists planned_workouts_own_update on public.planned_workouts;
drop policy if exists planned_workouts_own_delete on public.planned_workouts;

-- Entirely private. Nothing about a workout you have not done yet is anyone else's to read.
create policy planned_workouts_own_select on public.planned_workouts for select
  using (athlete_id = auth.uid());
create policy planned_workouts_own_insert on public.planned_workouts for insert
  with check (athlete_id = auth.uid());
create policy planned_workouts_own_update on public.planned_workouts for update
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy planned_workouts_own_delete on public.planned_workouts for delete
  using (athlete_id = auth.uid());

comment on table public.planned_workouts is
  'A one-off workout built in advance, waiting on the Home hero. At most one per athlete (athlete_id is '
  'the PK, so an upsert replaces it). Consumed when trained; saving it as a reusable template is offered '
  'at the end of the session instead.';
