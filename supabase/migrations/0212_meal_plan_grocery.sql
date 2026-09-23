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
