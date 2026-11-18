-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0277: the meter knows meal-describe (AI Road to 10 Sprint 4a §1.6, NU-3)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: §1 patches coach_ai_reserve only while 'meal-describe' is missing and merges the floor key only
-- while it is absent; revoke/grant are idempotent; §2 only raises; §3 is read-only.
--
-- Apply order for Sprint 4a: 0276 → 0277. Either order is safe (§1 patches the LIVE body, so it keeps 0276's
-- change), but the contract's order is 0276 first.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- Describe a meal (the new meal-describe function) reserves its 1 credit as `p_action 'meal_photo'` — the meal photo's
-- weight, on purpose. Two things in the meter are keyed by the function's slug, and neither knows this one yet:
-- coach_ai_reserve's slug list (an unknown slug is ledgered as 'other') and the soft floor's floor_actions (an
-- athlete out of credits may snap a plate 5 times a day at 0 credits, but could not describe one).
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  (verbatim from supabase/migrations/0277_meal_describe_meter.sql)
--     a. coach_ai_reserve: 'meal-describe' joins the slug list — read from the live definition, ONE line replaced,
--        executed, then checked to differ from the old body by that line only (else it raises and rolls back).
--     b. revoke from public + anon; grant to authenticated (as it is today).
--     c. coach_ai_config.floor_actions gains "meal-describe": ["meal_photo"].
-- §2  RAISES if the list or the floor key is missing, if anon can call coach_ai_reserve or authenticated cannot, if
--     any of the function's other parts is gone (Premium AI gate, consent, waivers, floor, the meter call), or if
--     meal_photo's weight is not 1.
-- §3  one row: what landed.
--
-- ⚠ APPLYING IS NOT WORKING: meal-describe must also be deployed (supabase/apply/deploy-meal-describe.ts) and the app
--   published with /describe-meal for anyone to see it. Before this is applied a deployed meal-describe still works
--   (charged 1 credit as meal_photo) — it is just ledgered as 'other' and refused at 0 credits.
--
-- ══ PREDICTED §3 (written 2026-11-18 from the live database, read-only: coach_ai_reserve md5 fe40ac39…, the anchor
--    line found exactly once, no 'meal-describe' in it; floor_actions has 3 keys; authenticated may execute, anon
--    may not; meal_photo = 1) ══
--   reserve_lists_meal_describe = true · reserve_slug_count = 14 · floor_meal_describe = ["meal_photo"] ·
--   floor_keys = 4 · anon_can_reserve = false · authenticated_can_reserve = true · meal_photo_credits = 1
--   Why: 13 slugs + meal-describe; the floor map's 3 keys + meal-describe; grants as they were. If 0276 also changed
--   coach_ai_reserve the row is the same — 0276 does not touch the slug list.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0277_meal_describe_meter.sql)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

begin;

-- §1a · coach_ai_reserve: 'meal-describe' joins the slug list — the live body, one line changed
do $patch$
declare
  v_def text;
  v_old constant text := $q$'workout-card-read', 'workout-tidy', 'bug-plain', 'social-plan') then p_fn$q$;
  v_new constant text := $q$'workout-card-read', 'workout-tidy', 'bug-plain', 'social-plan', 'meal-describe') then p_fn$q$;
  v_n   integer;
begin
  v_def := pg_get_functiondef('public.coach_ai_reserve(text, text)'::regprocedure);
  if position($q$'meal-describe'$q$ in v_def) > 0 then
    raise notice '0277: coach_ai_reserve already lists meal-describe - left as it is';
    return;
  end if;
  v_n := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
  if v_n <> 1 then
    raise exception '0277: coach_ai_reserve''s slug list is not the one 0272 wrote (% matches) - STOP, read the live source', v_n;
  end if;
  execute replace(v_def, v_old, v_new);
  if pg_get_functiondef('public.coach_ai_reserve(text, text)'::regprocedure) is distinct from replace(v_def, v_old, v_new) then
    raise exception '0277: coach_ai_reserve changed by more than its slug list - rolled back';
  end if;
end
$patch$;

-- §1b · who may call it (unchanged: authenticated only)
revoke execute on function public.coach_ai_reserve(text, text) from public, anon;
grant execute on function public.coach_ai_reserve(text, text) to authenticated;

-- §1c · the soft floor: a described meal rides it exactly as a photographed one
update public.coach_ai_config c
   set floor_actions = c.floor_actions || '{"meal-describe": ["meal_photo"]}'::jsonb
 where c.id
   and not (c.floor_actions ? 'meal-describe');

commit;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §2 — THE ASSERTION (raises when 0277 did not land, or took something with it)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

do $check$
declare
  v_def text := pg_get_functiondef('public.coach_ai_reserve(text, text)'::regprocedure);
  v_cfg public.coach_ai_config%rowtype;
begin
  if position($q$'social-plan', 'meal-describe') then p_fn$q$ in v_def) = 0 then
    raise exception '0277 DID NOT APPLY: coach_ai_reserve does not list meal-describe';
  end if;
  if (length(v_def) - length(replace(v_def, $q$'meal-describe'$q$, ''))) / length($q$'meal-describe'$q$) <> 1 then
    raise exception '0277: meal-describe is listed more than once in coach_ai_reserve';
  end if;
  -- Everything else the function did is still there (0203 gate, 0224 consent, 0268 meter call, 0272 waivers + floor).
  if position($q$'not_entitled'::text, null::uuid$q$ in v_def) = 0
     or position($q$if v_consent is distinct from 'granted' then$q$ in v_def) = 0
     or position('from public.coach_ai_spend_credits(p_action) s;' in v_def) = 0
     or position($q$then 'typed_build'$q$ in v_def) = 0
     or position($q$then 'photo_tidy'$q$ in v_def) = 0
     or position($q$coalesce(v_cfg.floor_actions -> v_fn, '[]'::jsonb) ? p_action$q$ in v_def) = 0
     or position($q$else 'other'$q$ in v_def) = 0 then
    raise exception '0277: coach_ai_reserve lost part of its body - restore it from 0272 (and 0276) and do not re-run';
  end if;
  if has_function_privilege('anon', 'public.coach_ai_reserve(text, text)', 'execute') then
    raise exception '0277: anon can execute coach_ai_reserve';
  end if;
  if not has_function_privilege('authenticated', 'public.coach_ai_reserve(text, text)', 'execute') then
    raise exception '0277: authenticated cannot execute coach_ai_reserve - every AI call would fail';
  end if;
  select * into v_cfg from public.coach_ai_config c where c.id;
  if v_cfg.floor_actions -> 'meal-describe' is distinct from '["meal_photo"]'::jsonb then
    raise exception '0277 DID NOT APPLY: floor_actions has no "meal-describe": ["meal_photo"]';
  end if;
  if v_cfg.floor_actions -> 'meal-photo-read' is distinct from '["meal_photo"]'::jsonb then
    raise exception '0277: the meal photo lost its floor';
  end if;
  if (v_cfg.action_credits ->> 'meal_photo')::integer is distinct from 1 then
    raise exception '0277: meal_photo is not 1 credit (PO 09-28: 1 on purpose) - this file never changes it; look at what did';
  end if;
  raise notice '0277 applied. meal-describe is its own slug in the meter and rides the meal photo''s soft floor.';
end
$check$;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §3 — THE REPORT (read-only)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

select
  position($q$'meal-describe') then p_fn$q$ in x.d) > 0                                           as reserve_lists_meal_describe,
  (select count(*) from regexp_matches(substring(x.d from 'when p_fn in \(([^)]*)\)'), '''[a-z-]+''', 'g')) as reserve_slug_count,
  (select c.floor_actions -> 'meal-describe' from public.coach_ai_config c where c.id)             as floor_meal_describe,
  (select count(*) from public.coach_ai_config c, jsonb_object_keys(c.floor_actions) k where c.id) as floor_keys,
  has_function_privilege('anon', 'public.coach_ai_reserve(text, text)', 'execute')                 as anon_can_reserve,
  has_function_privilege('authenticated', 'public.coach_ai_reserve(text, text)', 'execute')        as authenticated_can_reserve,
  (select (c.action_credits ->> 'meal_photo')::integer from public.coach_ai_config c where c.id)   as meal_photo_credits
from (select pg_get_functiondef('public.coach_ai_reserve(text, text)'::regprocedure) as d) x;
