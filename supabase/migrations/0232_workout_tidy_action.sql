-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- 0232 · WORKOUT TIDY — the 'workout_tidy' metered action (1 credit)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- PO, 2026-09-28: *"use AI when needed. For simple workouts it shouldn't be hard, but for workouts like this
-- where it's more complicated it might be difficult. Make sure to build a fool proof plan of when to use ai
-- and when not to."* Import Amendment 002. The code reader reads a written workout first; only when it cannot
-- (`whenToUseAi` in `src/domain/workout/workout-ai-gate.ts`) does the new `workout-tidy` Edge Function rewrite
-- the card's words into the reader's own layout. AI never sets a number: the reader still reads the rewrite,
-- and `checkAiRewrite` throws it away if one number on it is not on the card.
--
-- ══ ONE NEW ACTION IN coach_ai_config.action_credits ══
--
--   · 'workout_tidy' = 1. Text in, text out, no image. Weighted like `message` (1).
--   · It goes through `coach_ai_spend_credits`, which is what refuses anyone without Premium AI (0203).
--   An action absent from the map raises 22023 in `coach_ai_spend_credits`, so this MUST be applied
--   before `workout-tidy` is deployed, or every tidy answers "meter unavailable".
--
-- Same merge order as 0174, 0218, 0220, 0222 and 0223: the new key is on the LEFT, so a weight hand-tuned
-- since can never be overwritten, and a second run is a no-op. The column default carries every key 0223's did.
-- Safe to run twice.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

begin;

alter table public.coach_ai_config
  alter column action_credits set default
    '{"message": 1, "program": 1, "day": 1, "photo_read": 3, "photo_import": 2, "form_check": 6, "summary": 0, "web": 3, "recipe_photo": 3, "kitchen": 2, "meal_photo": 3, "workout_tidy": 1}'::jsonb;

update public.coach_ai_config
   set action_credits = jsonb_build_object('workout_tidy', 1) || action_credits,
       updated_at = now()
 where not (action_credits ? 'workout_tidy');

comment on column public.coach_ai_config.action_credits is
  'Per-action credit weights. message/program/day/workout_tidy 1 · photo_import 2 · kitchen 2 · photo_read 3 · web 3 · recipe_photo 3 · meal_photo 3 · form_check 6 · summary 0. '
  'An action absent from this map raises 22023 in coach_ai_spend_credits rather than costing zero.';

commit;
