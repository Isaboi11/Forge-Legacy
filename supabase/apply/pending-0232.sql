-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0232: the 'workout_tidy' action (1 credit) for "Fix it with AI" on written workouts
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded, and §3 is read-only.
--
-- ⚠ APPLY THIS BEFORE deploying the `workout-tidy` Edge Function. Until it is in, the action is
-- unknown to coach_ai_spend_credits (22023) and every tidy answers "meter unavailable".
-- Nothing else reads the new key, so applying it early is harmless. Apply 0223 first (it already is),
-- so the column default carries meal_photo too.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- §1  action_credits gains workout_tidy = 1 (and the column default carries it)
-- §2  asserts the key is present, and RAISES if not
-- §3  reports the weight and how many tidies have been metered. Read-only.
--
-- EXPECTED §3: workout_tidy_credits = 1; meal_photo_credits = 3; tidies = 0 (nothing calls the
-- action until the function is deployed and the app with "Fix it with AI" is live).

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0232_workout_tidy_action.sql)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from public.coach_ai_config c where c.id and c.action_credits ? 'workout_tidy') then
    raise exception '0232 DID NOT APPLY. coach_ai_config.action_credits has no workout_tidy key.';
  end if;
  raise notice '0232 OK — workout_tidy is priced.';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — WHAT IS NOW THERE. Read-only.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

select
  (select c.action_credits ->> 'workout_tidy' from public.coach_ai_config c where c.id)   as workout_tidy_credits,
  (select c.action_credits ->> 'meal_photo' from public.coach_ai_config c where c.id)     as meal_photo_credits,
  (select count(*) from public.coach_ai_spend s where s.action = 'workout_tidy')          as tidies;
