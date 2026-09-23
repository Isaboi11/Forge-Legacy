-- ─────────────────────────────────────────────────────────────────────────────
-- 0207 — micronutrients on a food the athlete typed, and on a meal they saved
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `Create Food.dc.html` has a "More nutrients" section: fibre, sugar, saturated fat, sodium,
-- cholesterol, added sugar, potassium, calcium, iron and vitamin D, all off the label the athlete is
-- already holding. `0205` gave `food_catalog` a `micros jsonb` for exactly this and gave `user_foods`
-- none, so every one of those figures had nowhere to go.
--
-- `saved_meal_items` has the same hole from the other end: a meal saved as "Usual Breakfast" copied
-- the macros and dropped the micronutrients, so logging it back produced a plate whose breakdown was
-- quietly shorter than the one it was saved from.
--
-- ⚠ PER 100 g, LIKE EVERY OTHER `micros` IN THIS SCHEMA — never per portion. The row keeps `grams`
--   beside it and the scaling happens at display (`extraRows`, `mealBreakdown`). Storing the portion's
--   figures instead makes an edited portion silently wrong, because changing a portion changes the
--   grams and not these.
--
-- ⚠ ADDITIVE AND NULLABLE, so the currently deployed client is unaffected: it never selects these
--   columns and never writes them. The new client writes them and falls back to an insert without
--   them if this migration has not been pasted yet, so the two orders are both safe.
--
-- Paste the whole file at once. Safe to run twice.

alter table public.user_foods        add column if not exists micros jsonb;
alter table public.saved_meal_items  add column if not exists micros jsonb;

comment on column public.user_foods.micros is
  'Per 100 g, from the label the athlete transcribed in Create Food. Keys match EXTRA_NUTRIENTS / MORE_NUTRIENTS (fiber, sugar, satFat, sodium, cholesterol, addedSugar, potassium, calcium, iron, vitaminD). A nutrient not on the label is ABSENT, never 0.';
comment on column public.saved_meal_items.micros is
  'Per 100 g, carried from the diary row the saved meal was made from, so logging it back reproduces the same breakdown.';
