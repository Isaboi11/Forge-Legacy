-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0226: Meal Plan routine (same / a few / mix), shared ingredients, my recipes only, Clear week
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded, and §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- PO 2026-09-27: same breakfast every day, same lunch, different dinners — "or any combination"; "just use
-- our recipes"; and "a button to completely clear the week". The setup now asks each meal same / a few /
-- mix, whether to share ingredients, and whether to plan from My Recipes only. Clear week needs a mark on
-- the stored week, or the planner sees an empty week and fills it straight back in.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  adds meal_plan_prefs.routine (jsonb, default '{}' + object check), .share_ingredients and
--     .own_recipes_only (boolean, default false), and meal_plan_weeks.cleared_at (timestamptz, null)
-- §2  asserts all four columns and the constraint exist, and RAISES if not
-- §3  reports how many setups have answered each question and how many weeks are cleared. Read-only.
--
-- ⚠ THE DEFAULTS CHANGE NO ONE'S PLAN. '{}' means every meal is `vary`, which is exactly how the planner
-- behaved before this question existed (tested: "with no answer the week plans exactly as it did before").
--
-- ⚠ BEFORE THIS IS PASTED the app still works: it reads the old columns, saves the rest of the setup, and
-- says plainly that the meal pattern / Clear week "needs an app update that isn't live yet" instead of
-- dropping the answer silently.
--
-- ⚠ APPLYING IS NOT THE SAME AS WORKING. Until the client is deployed, §3 reports 0 for every count.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — the migration, verbatim from supabase/migrations/0226_meal_plan_routine.sql
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.meal_plan_prefs add column if not exists routine jsonb not null default '{}'::jsonb;
alter table public.meal_plan_prefs add column if not exists share_ingredients boolean not null default false;
alter table public.meal_plan_prefs add column if not exists own_recipes_only boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_prefs_routine_chk') then
    alter table public.meal_plan_prefs add constraint meal_plan_prefs_routine_chk
      check (jsonb_typeof(routine) = 'object');
  end if;
end $$;

alter table public.meal_plan_weeks add column if not exists cleared_at timestamptz;


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  missing text := '';
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_plan_prefs' and column_name = 'routine')
    then missing := missing || ' meal_plan_prefs.routine'; end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_plan_prefs' and column_name = 'share_ingredients')
    then missing := missing || ' meal_plan_prefs.share_ingredients'; end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_plan_prefs' and column_name = 'own_recipes_only')
    then missing := missing || ' meal_plan_prefs.own_recipes_only'; end if;
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_prefs_routine_chk')
    then missing := missing || ' meal_plan_prefs_routine_chk'; end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_plan_weeks' and column_name = 'cleared_at')
    then missing := missing || ' meal_plan_weeks.cleared_at'; end if;
  if missing <> '' then
    raise exception '0226 did not take — missing:%', missing;
  end if;
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — REPORT. Read-only. Expected before the client ships: setups = however many exist, every other
-- count 0. After it ships, the PO's own setup should show routine_answered = 1 once saved.
-- ═════════════════════════════════════════════════════════════════════════════

select
  (select count(*) from public.meal_plan_prefs)                                  as setups,
  (select count(*) from public.meal_plan_prefs where routine <> '{}'::jsonb)     as routine_answered,
  (select count(*) from public.meal_plan_prefs where share_ingredients)          as sharing_ingredients,
  (select count(*) from public.meal_plan_prefs where own_recipes_only)           as own_recipes_only,
  (select count(*) from public.meal_plan_weeks where cleared_at is not null)     as weeks_cleared;
