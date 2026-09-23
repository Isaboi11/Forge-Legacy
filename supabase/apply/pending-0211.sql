-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0211: Meal Plan keeps the athlete's week
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded, and §3 is read-only.
--
-- ⚠ Supabase's editor shows only the LAST statement's result, so §3 is the only output you will see.
--   §2 RAISES — the run fails loudly — if anything below did not land.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  creates `meal_plan_weeks` (one row per athlete per Monday), three check constraints, owner-only
--     RLS behind the 0206 preview gate, and the grant
-- §2  asserts table, constraints, RLS and the gated policy — RAISES if not
-- §3  reports what landed
--
-- ⚠ Paste BEFORE deploying the Meal Plan screen. Needs 0210 (already applied).
-- ⚠ EXPECTED §3: constraints 3 · rls_on true · policies 1 · rows 0.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — the migration, verbatim from supabase/migrations/0211_meal_plan_weeks.sql
-- ───────────────────────────────────────────────────────────────────────────────────────────────

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


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — the assertion. RAISES if anything in §1 is missing.
-- ───────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  missing text[] := '{}';
  c text;
begin
  if to_regclass('public.meal_plan_weeks') is null then
    raise exception '0211: table public.meal_plan_weeks is missing';
  end if;
  foreach c in array array['meal_plan_weeks_monday_chk','meal_plan_weeks_days_chk','meal_plan_weeks_target_chk'] loop
    if not exists (select 1 from pg_constraint where conname = c) then missing := missing || c; end if;
  end loop;
  if cardinality(missing) > 0 then
    raise exception '0211: constraints missing: %', missing;
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.meal_plan_weeks'::regclass) then
    raise exception '0211: RLS is not enabled on meal_plan_weeks';
  end if;
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'meal_plan_weeks' and policyname = 'meal_plan_weeks_owner_all'
       and qual like '%has_nutrition_access%' and with_check like '%has_nutrition_access%'
  ) then
    raise exception '0211: meal_plan_weeks_owner_all is missing or does not carry the 0206 gate';
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — the report. Read-only.
-- ───────────────────────────────────────────────────────────────────────────────────────────────

select
  (select count(*) from pg_constraint where conname like 'meal_plan_weeks_%_chk')      as constraints,  -- expect 3
  (select relrowsecurity from pg_class where oid = 'public.meal_plan_weeks'::regclass)  as rls_on,       -- expect true
  (select count(*) from pg_policies where tablename = 'meal_plan_weeks')                as policies,     -- expect 1
  (select count(*) from public.meal_plan_weeks)                                         as rows;         -- expect 0
