-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- 0277 — The meter knows meal-describe: its own slug in coach_ai_reserve, and the meal photo's soft floor.
--
-- AI Road to 10 Sprint 4a §1.6 (NU-3, lane B). Contract: Docs/AI-Sprint-4a-Build-Notes.md §1.6 — "Meter: p_action
-- 'meal_photo' (1 credit, the same weight on purpose) and the soft floor like meal photo — only if the live
-- coach_ai_reserve needs a change for a new fn (its floor list is by fn) author 0277."
--
-- ══ WHY IT IS NEEDED (read from the LIVE database 2026-11-18, read-only, pg_get_functiondef md5 fe40ac39…) ══
--
--   1. coach_ai_reserve maps p_fn to a known slug or 'other' (`v_fn := case when p_fn in (…13 slugs…) then p_fn else
--      'other' end`). Without this, every meal-describe read is ledgered as fn 'other' (the AI health page cannot
--      show it) — and
--   2. the soft floor (0272, MA12) is keyed by THAT slug: `v_cfg.floor_actions -> v_fn ? p_action`. Live
--      floor_actions = {"coach-ask":["message"],"coach-interpret":["message","day","program"],
--      "meal-photo-read":["meal_photo"]}. Without a "meal-describe" key, an athlete out of credits could still snap a
--      plate (5 a day at 0 credits) but could not describe the same plate. Same job, same rule.
--
-- ══ WHAT IT DOES ══
--
--   §1a coach_ai_reserve's slug list gains 'meal-describe' — PATCHED IN PLACE from the live source, never retyped
--       (feedback_never_retype_an_existing_function): the function's own definition is read with pg_get_functiondef,
--       the ONE line is replaced, and the result is executed. It refuses (raises) unless that line appears exactly
--       once, and checks afterwards that the new definition is the old one with only that line changed. Because it
--       patches whatever is live, it composes with 0276 (lane A's typed-build waiver) in either order: neither undoes
--       the other.
--   §1b revoke from public + anon, grant to authenticated (as 0268/0272 left it — restated, idempotent).
--   §1c coach_ai_config.floor_actions gains "meal-describe": ["meal_photo"] (merged, guarded; nothing else moves).
--
--   Untouched: every weight (meal_photo stays 1 on purpose, PO 09-28), coach_ai_settle, the floor's size (5 a day),
--   the waivers, the consent and Premium AI gates. No table, no column, no RLS change.
--
-- Idempotent: §1a returns early when 'meal-describe' is already listed; §1c is guarded by `not (… ? 'meal-describe')`.
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
