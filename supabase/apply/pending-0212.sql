-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0212: Grocery List keeps the shopper's marks with the week
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: `add column if not exists`, a guarded constraint, and a read-only §3.
--
-- ⚠ Supabase's editor shows only the LAST statement's result, so §3 is the only output you will see.
--   §2 RAISES if the column or constraint is missing.
--
-- §1  adds `meal_plan_weeks.grocery jsonb not null default '{}'` + an object check
-- §2  asserts both
-- §3  reports what landed
--
-- ⚠ Needs 0211 (applied). Paste before deploying the Grocery List screen.
-- ⚠ EXPECTED §3: has_column true · constraint true · rows_with_marks 0.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — the migration, verbatim from supabase/migrations/0212_meal_plan_grocery.sql
-- ───────────────────────────────────────────────────────────────────────────────────────────────

-- 0212 — Grocery List: the shopper's own marks, kept with the week.
--
-- ══ WHY ══
--
-- `Grocery List.dc.html` (Claude Design b029488a) lets the athlete tick items into the cart, mark what
-- they already have at home, remove an item, and add their own. The design kept that in the browser's
-- localStorage — which would show a different list on the phone and on the web. It belongs with the week
-- it describes, so it is one jsonb column on `meal_plan_weeks` (0211).
--
-- ══ SHAPE ══
--
-- `{ sig, checked, have, removed, extras }` — see `domain/nutrition/grocery.ts` `GroceryState`. `sig`
-- fingerprints the plan the marks were made against; when the week is rebuilt the client clears the
-- cart but keeps "have it" and the athlete's own items.
--
-- The list ITSELF is never stored: it is derived from the week's cooks every time, so a swap or a
-- rebuild can never leave a stale list behind.
--
-- ══ PRIVACY ══
--
-- Rides the existing row, so the existing owner-only RLS behind `has_nutrition_access()` (0211) covers it.

alter table public.meal_plan_weeks add column if not exists grocery jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_weeks_grocery_chk') then
    alter table public.meal_plan_weeks add constraint meal_plan_weeks_grocery_chk
      check (jsonb_typeof(grocery) = 'object');
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — the assertion
-- ───────────────────────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'meal_plan_weeks' and column_name = 'grocery') then
    raise exception '0212: meal_plan_weeks.grocery is missing';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_weeks_grocery_chk') then
    raise exception '0212: meal_plan_weeks_grocery_chk is missing';
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — the report. Read-only.
-- ───────────────────────────────────────────────────────────────────────────────────────────────

select
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'meal_plan_weeks' and column_name = 'grocery')  as has_column,
  exists (select 1 from pg_constraint where conname = 'meal_plan_weeks_grocery_chk')                       as "constraint",
  (select count(*) from public.meal_plan_weeks where grocery <> '{}'::jsonb)                               as rows_with_marks;
