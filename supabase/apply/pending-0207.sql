-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0207: micronutrients on a food the athlete typed, and on a meal they saved
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: both statements are `add column if not exists`, §2 only raises, §3 is read-only.
--
-- ⚠ Supabase's editor shows only the LAST statement's result, so §3 is the only output you will see.
--   That is deliberate — §2 raises on failure, so silence from it means it passed.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- `Create Food.dc.html` has a "More nutrients" section — fibre, sugar, saturated fat, sodium,
-- cholesterol, added sugar, potassium, calcium, iron and vitamin D, all read off the label the athlete
-- is already holding. `0205` gave `food_catalog` a `micros jsonb` for exactly this purpose and gave
-- `user_foods` none, so every one of those ten figures had nowhere to go. Without this column the
-- screen would collect them and throw them away, which is the defect class this project keeps finding.
--
-- `saved_meal_items` has the same hole from the other end. Saving a meal as "Usual Breakfast" copies
-- the macros and drops the micronutrients, so logging it back produces a plate whose breakdown is
-- quietly SHORTER than the one it was saved from — and `mealBreakdown` will then omit a nutrient for
-- the whole meal because one row cannot account for it.
--
-- ⚠ PER 100 g, LIKE EVERY OTHER `micros` IN THIS SCHEMA — never per portion. The row keeps `grams`
--   beside it and the scaling happens at display (`extraRows`, `mealBreakdown`). Storing the portion's
--   figures instead makes an edited portion silently wrong: changing a portion changes the grams and
--   not these.
--
-- ⚠ A NUTRIENT NOT ON THE LABEL IS ABSENT, NEVER 0. The client omits blank fields rather than writing
--   zeros, because "we don't know" and "there is none of it" are different claims and only one of them
--   is ours to make. Do not backfill these with 0.
--
-- ══ ORDER OF OPERATIONS — EITHER WAY IS SAFE ══
--
-- Both columns are additive and nullable, so:
--   · the DEPLOYED client is unaffected — it selects neither column and writes neither;
--   · the NEW client writes them and, if this file has not been pasted yet, catches the
--     "column not found" schema error and retries the insert WITHOUT them. The food is still created;
--     only the extra nutrients are lost until this lands.
-- So this may be pasted before or after the deploy. Before is better — nothing is lost.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  adds `user_foods.micros` and `saved_meal_items.micros` (jsonb, nullable) + column comments
-- §2  asserts both columns exist, and RAISES if not
-- §3  reports both columns and how many rows carry a value. Read-only.
--
-- No RLS work: both tables already carry owner-scoped policies from `0205` covering every verb, and a
-- new column inherits them. No table is rewritten — `add column if not exists` on a nullable column
-- with no default is a catalogue-only change in Postgres and does not touch existing rows.
--
-- ══ PREDICT §3 BEFORE YOU RUN IT ══
--
--   user_foods.micros        present = true,  rows_with_micros = 0
--   saved_meal_items.micros  present = true,  rows_with_micros = 0
--
-- BOTH COUNTS MUST BE 0. The client that writes them is not deployed at the time of writing, so a
-- non-zero count means something is writing columns it should not be — investigate before believing it.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — the statements (verbatim from supabase/migrations/0207_user_food_micros.sql)
--      2 of 2 ALTER statements present; both COMMENT statements present.
-- ───────────────────────────────────────────────────────────────────────────────────────────────

alter table public.user_foods        add column if not exists micros jsonb;
alter table public.saved_meal_items  add column if not exists micros jsonb;

comment on column public.user_foods.micros is
  'Per 100 g, from the label the athlete transcribed in Create Food. Keys match EXTRA_NUTRIENTS / MORE_NUTRIENTS (fiber, sugar, satFat, sodium, cholesterol, addedSugar, potassium, calcium, iron, vitaminD). A nutrient not on the label is ABSENT, never 0.';
comment on column public.saved_meal_items.micros is
  'Per 100 g, carried from the diary row the saved meal was made from, so logging it back reproduces the same breakdown.';


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — the assertion. Silence is success; this RAISES if either column is missing.
-- ───────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  missing text := '';
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'user_foods' and column_name = 'micros'
  ) then
    missing := missing || 'user_foods.micros ';
  end if;

  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'saved_meal_items' and column_name = 'micros'
  ) then
    missing := missing || 'saved_meal_items.micros ';
  end if;

  if missing <> '' then
    raise exception '0207 FAILED — column(s) absent after the alter: %', missing;
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — the report. Read-only. Both counts should be 0 until the client is deployed.
-- ───────────────────────────────────────────────────────────────────────────────────────────────

select
  'user_foods.micros' as column,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'user_foods' and column_name = 'micros') = 1 as present,
  (select count(*) from public.user_foods where micros is not null) as rows_with_micros
union all
select
  'saved_meal_items.micros',
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'saved_meal_items' and column_name = 'micros') = 1,
  (select count(*) from public.saved_meal_items where micros is not null)
order by 1;
