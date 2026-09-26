-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0223: the 'meal_photo' action (3 credits) for photo food logging
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded, and §3 is read-only.
--
-- ⚠ APPLY THIS BEFORE deploying the `meal-photo-read` Edge Function. Until it is in, the action is
-- unknown to coach_ai_spend_credits (22023) and every meal photo answers "meter unavailable".
-- Nothing else reads the new key, so applying it early is harmless. Order against 0222 does not matter
-- for the weights (each adds only its own key); run 0222 first anyway so the column default ends with both.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- §1  action_credits gains meal_photo = 3 (and the column default carries it)
-- §2  asserts the key is present, and RAISES if not
-- §3  reports the weight and how many reads have been metered. Read-only.
--
-- EXPECTED §3: meal_photo_credits = 3; recipe_photo_credits = 3; meal_reads = 0 (nothing calls the
-- action until the function is deployed and the app with "Log from a photo" is live).

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0223_meal_photo_action.sql)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from public.coach_ai_config c where c.id and c.action_credits ? 'meal_photo') then
    raise exception '0223 DID NOT APPLY. coach_ai_config.action_credits has no meal_photo key.';
  end if;
  raise notice '0223 OK — meal_photo is priced.';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — WHAT IS NOW THERE. Read-only.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

select
  (select c.action_credits ->> 'meal_photo' from public.coach_ai_config c where c.id)     as meal_photo_credits,
  (select c.action_credits ->> 'recipe_photo' from public.coach_ai_config c where c.id)   as recipe_photo_credits,
  (select count(*) from public.coach_ai_spend s where s.action = 'meal_photo')            as meal_reads;
