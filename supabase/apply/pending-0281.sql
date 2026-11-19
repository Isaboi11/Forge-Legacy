-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0281: the meter knows coach-rewrite, and a change made in Holt's chat costs ONE credit (Holt Listens, D11/D12)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: §1 patches coach_ai_reserve only while 'coach-rewrite' is missing; revoke/grant are idempotent;
-- §2 only raises; §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- "Add rear delts on Tuesday and Thursday" — Holt's chat (coach-ask) hears it and calls propose_program_change; the
-- phone then sends the weeks ahead to the new function coach-rewrite, which reserves 1 credit as 'program'. The PO's
-- rule (D11) is ONE credit per build/change conversation. A typed build already works that way: coach-author's write
-- rides free on the paid chat turn that opened it (the `typed_build` waiver, 0272/0276). This gives a rewrite the
-- same ride. Without it a change costs 2 (the chat turn + the rewrite) and is ledgered as 'other'.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  (verbatim from supabase/migrations/0281_coach_rewrite_meter.sql)
--     a. coach_ai_reserve, read from the LIVE definition, TWO lines replaced:
--          · the slug list gains 'coach-rewrite'
--          · the waiver line `when v_fn = 'coach-author' and ...` becomes `when v_fn in ('coach-author', 'coach-rewrite') and ...`
--        Raises unless each line is found exactly once; checks the new body is the old one with only those lines changed.
--     b. revoke from public + anon; grant to authenticated (as it is today).
-- §2  RAISES if 'coach-rewrite' is missing from either place, if any other part of the function is gone, if the grants
--     moved, or if 'program' is no longer 1 credit.
-- §3  one row: what landed.
--
-- ⚠ APPLYING IS NOT WORKING: coach-rewrite and the new coach-ask (which marks a propose_program_change turn as
--   opened_build) must be deployed, and the app published, before anyone sees a change card. Until coach-ask is
--   redeployed a rewrite simply costs its own 1 credit — nothing breaks.
--
-- ══ PREDICTED §3 (written 2026-11-19 from the live database, read-only: coach_ai_reserve md5 fb7b8b01…, both anchor
--    lines found exactly once, no 'coach-rewrite' in it; authenticated may execute, anon may not; program = 1) ══
--   reserve_lists_coach_rewrite = true · reserve_slug_count = 15 · waiver_covers_coach_rewrite = true ·
--   anon_can_reserve = false · authenticated_can_reserve = true · program_credits = 1
--   Why: today's 14 slugs + coach-rewrite; grants and weights untouched by this file.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0281_coach_rewrite_meter.sql)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

begin;

-- §1a · coach_ai_reserve: 'coach-rewrite' joins the slug list and the typed-build waiver — the live body, two lines changed
do $patch$
declare
  v_def  text;
  v_old1 constant text := $q$'workout-card-read', 'workout-tidy', 'bug-plain', 'social-plan', 'meal-describe') then p_fn$q$;
  v_new1 constant text := $q$'workout-card-read', 'workout-tidy', 'bug-plain', 'social-plan', 'meal-describe', 'coach-rewrite') then p_fn$q$;
  v_old2 constant text := $q$when v_fn = 'coach-author' and p_action in ('day', 'program') then 'typed_build'$q$;
  v_new2 constant text := $q$when v_fn in ('coach-author', 'coach-rewrite') and p_action in ('day', 'program') then 'typed_build'$q$;
  v_n1   integer;
  v_n2   integer;
  v_want text;
begin
  v_def := pg_get_functiondef('public.coach_ai_reserve(text, text)'::regprocedure);
  if position($q$'coach-rewrite'$q$ in v_def) > 0 then
    raise notice '0281: coach_ai_reserve already knows coach-rewrite - left as it is';
    return;
  end if;
  v_n1 := (length(v_def) - length(replace(v_def, v_old1, ''))) / length(v_old1);
  v_n2 := (length(v_def) - length(replace(v_def, v_old2, ''))) / length(v_old2);
  if v_n1 <> 1 or v_n2 <> 1 then
    raise exception '0281: coach_ai_reserve is not the body 0277 left (slug list % matches, waiver % matches) - STOP, read the live source', v_n1, v_n2;
  end if;
  v_want := replace(replace(v_def, v_old1, v_new1), v_old2, v_new2);
  execute v_want;
  if pg_get_functiondef('public.coach_ai_reserve(text, text)'::regprocedure) is distinct from v_want then
    raise exception '0281: coach_ai_reserve changed by more than its two lines - rolled back';
  end if;
end
$patch$;

-- §1b · who may call it (unchanged: authenticated only)
revoke execute on function public.coach_ai_reserve(text, text) from public, anon;
grant execute on function public.coach_ai_reserve(text, text) to authenticated;

commit;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §2 — THE ASSERTION (raises when 0281 did not land, or took something with it)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

do $check$
declare
  v_def text := pg_get_functiondef('public.coach_ai_reserve(text, text)'::regprocedure);
  v_cfg public.coach_ai_config%rowtype;
begin
  if position($q$'meal-describe', 'coach-rewrite') then p_fn$q$ in v_def) = 0 then
    raise exception '0281 DID NOT APPLY: coach_ai_reserve does not list coach-rewrite';
  end if;
  if position($q$when v_fn in ('coach-author', 'coach-rewrite') and p_action in ('day', 'program') then 'typed_build'$q$ in v_def) = 0 then
    raise exception '0281 DID NOT APPLY: the typed_build waiver does not cover coach-rewrite';
  end if;
  if (length(v_def) - length(replace(v_def, $q$'coach-rewrite'$q$, ''))) / length($q$'coach-rewrite'$q$) <> 2 then
    raise exception '0281: coach-rewrite should appear exactly twice in coach_ai_reserve (slug list + waiver)';
  end if;
  -- Everything else the function did is still there (0203 gate, 0224 consent, 0268 meter call, 0272 waivers + floor,
  -- 0276 opened_build ride, 0277 meal-describe).
  if position($q$'not_entitled'::text, null::uuid$q$ in v_def) = 0
     or position($q$if v_consent is distinct from 'granted' then$q$ in v_def) = 0
     or position('from public.coach_ai_spend_credits(p_action) s;' in v_def) = 0
     or position($q$then 'photo_tidy'$q$ in v_def) = 0
     or position($q$(r.fn = 'coach-ask' and r.opened_build)$q$ in v_def) = 0
     or position($q$'social-plan', 'meal-describe'$q$ in v_def) = 0
     or position($q$coalesce(v_cfg.floor_actions -> v_fn, '[]'::jsonb) ? p_action$q$ in v_def) = 0
     or position($q$else 'other'$q$ in v_def) = 0 then
    raise exception '0281: coach_ai_reserve lost part of its body - restore it from 0272/0276/0277 and do not re-run';
  end if;
  if has_function_privilege('anon', 'public.coach_ai_reserve(text, text)', 'execute') then
    raise exception '0281: anon can execute coach_ai_reserve';
  end if;
  if not has_function_privilege('authenticated', 'public.coach_ai_reserve(text, text)', 'execute') then
    raise exception '0281: authenticated cannot execute coach_ai_reserve - every AI call would fail';
  end if;
  select * into v_cfg from public.coach_ai_config c where c.id;
  if (v_cfg.action_credits ->> 'program')::integer is distinct from 1 then
    raise exception '0281: program is not 1 credit - this file never changes it; look at what did';
  end if;
  raise notice '0281 applied. coach-rewrite is its own slug in the meter and rides the chat turn that asked for it.';
end
$check$;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §3 — THE REPORT (read-only)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

select
  position($q$'coach-rewrite') then p_fn$q$ in x.d) > 0                                            as reserve_lists_coach_rewrite,
  (select count(*) from regexp_matches(substring(x.d from 'when p_fn in \(([^)]*)\)'), '''[a-z-]+''', 'g')) as reserve_slug_count,
  position($q$v_fn in ('coach-author', 'coach-rewrite')$q$ in x.d) > 0                              as waiver_covers_coach_rewrite,
  has_function_privilege('anon', 'public.coach_ai_reserve(text, text)', 'execute')                 as anon_can_reserve,
  has_function_privilege('authenticated', 'public.coach_ai_reserve(text, text)', 'execute')        as authenticated_can_reserve,
  (select (c.action_credits ->> 'program')::integer from public.coach_ai_config c where c.id)      as program_credits
from (select pg_get_functiondef('public.coach_ai_reserve(text, text)'::regprocedure) as d) x;
