-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- 0223 · MEAL PHOTO LOGGING — the 'meal_photo' metered action (3 credits)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- PO, 2026-09-25: *"let's build the photo food logging."* Nutrition Architecture §2 ("Log a meal from a
-- photo" — Premium AI, credits) and §5, which names this exact weight: *"New coach_ai_config weights
-- (nutrition_ask, meal_photo, plan_ai) through coach_ai_spend_credits (0203 gate)."* The new
-- `meal-photo-read` Edge Function names the foods on a plate and estimates portions — never a calorie
-- (NUT-D4). The app matches each food through `food-search` and takes every number from the database.
--
-- ══ ONE NEW ACTION IN coach_ai_config.action_credits ══
--
--   · 'meal_photo' = 3. A vision read with structured output: weighted like `photo_read` and
--     `recipe_photo` (3) — the same model, a similar image, a shorter answer.
--   · It goes through `coach_ai_spend_credits`, which is what refuses anyone without Premium AI (0203).
--   An action absent from the map raises 22023 in `coach_ai_spend_credits`, so this MUST be applied
--   before `meal-photo-read` is deployed — or every read answers "meter unavailable".
--
-- ⚠ NO STORAGE. The photo is never kept (NUT-D7 asks for a private bucket only IF meal photos are stored;
-- they are not), so there is no bucket and no table here.
--
-- Same merge order as 0174, 0218, 0220 and 0222: the new key is on the LEFT, so a weight hand-tuned since
-- can never be overwritten, and a second run is a no-op. The column default carries 0222's `kitchen` too,
-- so applying this after 0222 never drops it. Safe to run twice.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

begin;

alter table public.coach_ai_config
  alter column action_credits set default
    '{"message": 1, "program": 1, "day": 1, "photo_read": 3, "photo_import": 2, "form_check": 6, "summary": 0, "web": 3, "recipe_photo": 3, "kitchen": 2, "meal_photo": 3}'::jsonb;

update public.coach_ai_config
   set action_credits = jsonb_build_object('meal_photo', 3) || action_credits,
       updated_at = now()
 where not (action_credits ? 'meal_photo');

comment on column public.coach_ai_config.action_credits is
  'Per-action credit weights. message/program/day 1 · photo_import 2 · kitchen 2 · photo_read 3 · web 3 · recipe_photo 3 · meal_photo 3 · form_check 6 · summary 0. '
  'An action absent from this map raises 22023 in coach_ai_spend_credits rather than costing zero.';

commit;
