-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- 0220 · RECIPE PHOTO IMPORT — the 'recipe_photo' metered action (3 credits)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- PO, 2026-09-25: *"take a screenshot of a recipe and put it into the meals/recipes just like we do with
-- pictures of programs."* The new `recipe-photo-read` Edge Function reads the picture with a vision model
-- and returns only what the page says (name, servings, ingredients as written, steps) — never a calorie
-- (NUT-D4). The app matches the ingredients to its own USDA catalogue and the athlete saves the draft.
--
-- ══ ONE NEW ACTION IN coach_ai_config.action_credits ══
--
--   · 'recipe_photo' = 3. A vision read with structured output: weighted like `photo_read` (3), above
--     `photo_import` (2) because the answer is a whole recipe, not a table's rows.
--   · It goes through `coach_ai_spend_credits`, which is what refuses anyone without Premium AI (0203).
--   An action absent from the map raises 22023 in `coach_ai_spend_credits`, so this MUST be applied
--   before `recipe-photo-read` is deployed — or every read answers "meter unavailable".
--
-- Same merge order as 0174 and 0218: the new key is on the LEFT, so a weight hand-tuned since can never be
-- overwritten, and a second run is a no-op. Safe to run twice.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

begin;

alter table public.coach_ai_config
  alter column action_credits set default
    '{"message": 1, "program": 1, "day": 1, "photo_read": 3, "photo_import": 2, "form_check": 6, "summary": 0, "web": 3, "recipe_photo": 3}'::jsonb;

update public.coach_ai_config
   set action_credits = jsonb_build_object('recipe_photo', 3) || action_credits,
       updated_at = now()
 where not (action_credits ? 'recipe_photo');

comment on column public.coach_ai_config.action_credits is
  'Per-action credit weights. message/program/day 1 · photo_import 2 · photo_read 3 · web 3 · recipe_photo 3 · form_check 6 · summary 0. '
  'An action absent from this map raises 22023 in coach_ai_spend_credits rather than costing zero.';

commit;
