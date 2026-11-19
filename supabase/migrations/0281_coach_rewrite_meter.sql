-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- 0281 — The meter knows coach-rewrite, and a change made in Holt's chat costs ONE credit.
--
-- Holt Listens (PO D11/D12, 2026-11-18/19): "AI rewrites, the app checks" — Holt's chat (coach-ask, caps change_v1)
-- calls propose_program_change; the device sends the weeks ahead to the new function `coach-rewrite`, which reserves
-- action 'program'. D11: a build or change conversation costs one credit, however many messages it takes.
--
-- ══ WHY IT IS NEEDED (read from the LIVE database 2026-11-19, read-only, pg_get_functiondef md5 fb7b8b01…) ══
--
--   1. coach_ai_reserve maps p_fn to a known slug or 'other'. Without this every rewrite is ledgered as 'other'.
--   2. The `typed_build` waiver (0272, widened by 0276) lets coach-author's write ride on the paid chat turn that opened
--      it (coach-ask marks it `opened_build`). A rewrite is the same thing for a running program — without the waiver,
--      "add rear delts" costs the chat message AND the rewrite (2 credits).
--
-- ══ WHAT IT DOES ══
--
--   §1a coach_ai_reserve, PATCHED IN PLACE from the live source, never retyped (feedback_never_retype_an_existing_function):
--       TWO lines replaced — the slug list gains 'coach-rewrite', and the waiver's `v_fn = 'coach-author'` becomes
--       `v_fn in ('coach-author', 'coach-rewrite')`. It raises unless each line appears exactly once, and checks the new
--       definition is the old one with only those two lines changed. It patches whatever is live, so it composes with
--       0276/0277 (both already in the live body).
--   §1b revoke from public + anon, grant to authenticated (as 0268/0272/0277 left it — restated, idempotent).
--
--   Untouched: every weight ('program' stays 1), coach_ai_settle, the soft floor, the consent and Premium AI gates, the
--   30-minute window, the per-function "rides once" rule (a rewrite and an author write after the same chat turn each
--   ride once). No table, no column, no RLS change.
--
--   ⚠ The waiver only fires after a coach-ask turn marked `opened_build` — coach-ask sets that for propose_program_change
--   from the same release (index.ts). Until that function is deployed, a rewrite simply costs its own 1 credit.
--
-- Idempotent: §1a returns early when 'coach-rewrite' is already listed.
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
