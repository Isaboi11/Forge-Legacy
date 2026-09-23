-- 0211 — Meal Plan: the athlete's week, as built.
--
-- ══ WHY ══
--
-- `Meal Plan.dc.html` (Claude Design b029488a) shows a planned week the athlete can swap, lock, add a
-- snack to, log from, and rebuild. The planner is deterministic (`domain/nutrition/meal-planner.ts`) —
-- the same seed and inputs build the same week — but swaps, locks and added snacks are the athlete's
-- edits, so the week itself is stored, not re-derived on every open.
--
-- ══ SHAPE ══
--
-- One row per athlete per week (Monday). `days` is the plan (recipe ids per slot, never numbers —
-- calories are always recomputed from the recipe set, NUT-D4). `locked` maps a spot (`3-dinner`) to the
-- recipe kept there. `logged` maps a spot + recipe to the diary row it created, so "Logged" can be
-- undone by removing exactly that row.
--
-- `target_kcal` and `prefs_updated_at` record what the week was built against. When either moves, the
-- client rebuilds (keeping locks) rather than showing a week fitted to a number that is no longer true.
--
-- ══ PRIVACY (P6-A2-D1 / NUT-D7) + THE PREVIEW GATE (0206) ══
--
-- Owner-only RLS behind `has_nutrition_access()`, like every nutrition table. Cascades with the profile.

create table if not exists public.meal_plan_weeks (
  athlete_id        uuid not null references public.profiles(id) on delete cascade,
  week_start        date not null,
  seed              integer not null default 1,
  target_kcal       integer not null,
  prefs_updated_at  timestamptz,
  days              jsonb not null,
  locked            jsonb not null default '{}'::jsonb,
  logged            jsonb not null default '{}'::jsonb,
  updated_at        timestamptz not null default now(),
  primary key (athlete_id, week_start)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_weeks_monday_chk') then
    alter table public.meal_plan_weeks add constraint meal_plan_weeks_monday_chk
      check (extract(isodow from week_start) = 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_weeks_days_chk') then
    alter table public.meal_plan_weeks add constraint meal_plan_weeks_days_chk
      check (jsonb_typeof(days) = 'array' and jsonb_array_length(days) = 7);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_weeks_target_chk') then
    alter table public.meal_plan_weeks add constraint meal_plan_weeks_target_chk
      check (target_kcal between 500 and 10000);
  end if;
end $$;

alter table public.meal_plan_weeks enable row level security;

drop policy if exists meal_plan_weeks_owner_all on public.meal_plan_weeks;
create policy meal_plan_weeks_owner_all on public.meal_plan_weeks for all
  using (athlete_id = auth.uid() and public.has_nutrition_access())
  with check (athlete_id = auth.uid() and public.has_nutrition_access());

grant select, insert, update, delete on public.meal_plan_weeks to authenticated;
