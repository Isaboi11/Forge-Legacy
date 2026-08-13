-- Forge Legacy — 0150: give `evaluate_honors` back to `authenticated`. 0147 broke every workout save.
--
-- ══ THE DEFECT ══
--
-- 0147 §3 (`0147_revoke_anon_execute.sql:135`) added `public.evaluate_honors(text)` to a list of twelve
-- "internal + destructive" functions and revoked EXECUTE from `anon, authenticated`, on this premise:
--
--     `evaluate_honors` — its only real caller — is SECURITY DEFINER and so executes as its owner
--     regardless of this grant.
--
-- Half of that is true and the half that matters is not. SECURITY DEFINER decides **who the function runs
-- as** once it is running. It says nothing about **who is allowed to call it** — the caller still needs
-- EXECUTE, checked against the caller's own effective role. The two are independent, and 0147 read the
-- first as implying the second.
--
-- The escape hatch it was reaching for is real, but it belongs to the CALLER, not the callee: a call made
-- from inside a SECURITY DEFINER function is checked against that function's OWNER. That is exactly why
-- the other eleven entries in the list are safe — every one of their in-database callers is SECURITY
-- DEFINER (verified: all thirteen functions in 0120 are `security definer`, so the push triggers and the
-- `notification_events()` wrapper are unaffected; the prune/rollup functions are called by pg_cron as
-- `postgres`; `honor_metrics` is called only from `evaluate_honors`, which IS definer, so it stays
-- revoked and 0146's supersession still holds).
--
-- `evaluate_honors` is the one entry whose callers are `security invoker`. They run as the athlete, so the
-- revoke landed on them:
--
--   · `save_workout`          (0124:49 invoker → 0124:208)  — **Finish Workout**
--   · `continue_workout`      (0125:43 invoker → 0125:129)  — **Continue Training**
--   · `skip_program_session`  (0123:145 invoker → 0123:202) — **skipping a program session**
--
-- Every one of them now fails with `42501 permission denied for function evaluate_honors`, and because the
-- call sits at the END of `save_workout`, the whole transaction rolls back: the athlete finishes a session,
-- gets "Couldn't save", and loses the workout. Observed live on device 2026-08-12, 30-set lower-body
-- session, nothing written.
--
-- ══ WHY A GRANT AND NOT A DEFINER FLIP ══
--
-- Making `save_workout` SECURITY DEFINER would also fix the symptom, and would be the wrong fix: it is
-- `security invoker` on purpose so that every table write inside it is still checked against the athlete's
-- own RLS policies. Flipping it would silently take the entire save path out from under RLS to repair a
-- grant. Three call sites would each need the same flip, and each would be a new hole.
--
-- ══ WHY THIS IS NOT REOPENING WHAT 0147 CLOSED ══
--
-- 0147's subject was `anon` — the unauthenticated role. This grants `authenticated` only; `anon` stays
-- revoked, and §2 below asserts it. What a signed-in athlete gets is the ability to evaluate THEIR OWN
-- honors:
--
--   · `evaluate_honors` derives its subject from `auth.uid()` and from nothing else (0099:551) — there is
--     no user parameter to point at somebody else's account, and it raises `not authenticated` on a null
--     uid (0099:561-563).
--   · Calling it spuriously does nothing: the two partial unique indexes make a re-run a no-op, which
--     `supabase/seed/honor-roundtrip.mjs:57-59` asserts.
--   · This is the grant the function carried from 0012 until 0147 — a restoration, not a widening.
--
-- Idempotent. RUN ANY TIME, and run it BEFORE anything else — workout saving is broken until it lands.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · The grant
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Named signature, not `all functions in schema public` — the eleven other revokes from 0147 §3 must stay.

grant execute on function public.evaluate_honors(text) to authenticated;

comment on function public.evaluate_honors(text) is
  'Awards every honor the caller has newly earned, scoped to auth.uid(). SECURITY DEFINER, but its callers (save_workout, continue_workout, skip_program_session) are all SECURITY INVOKER, so `authenticated` needs an EXECUTE grant of its own — 0147 revoked it and broke every workout save until 0150 put it back. Do not add this function to a revoke sweep without first checking the security mode of its callers, not its own.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · Assert — both directions
-- ─────────────────────────────────────────────────────────────────────────────
--
-- A grant that did not land must not report success, and neither must one that overshot into `anon`.

do $$
begin
  if not has_function_privilege('authenticated', 'public.evaluate_honors(text)', 'execute') then
    raise exception '0150: the grant did not land — authenticated still cannot execute evaluate_honors(text). Workout saving is still broken.';
  end if;

  if has_function_privilege('anon', 'public.evaluate_honors(text)', 'execute') then
    raise exception '0150: anon can execute evaluate_honors(text) — this migration overshot, or 0147 was rolled back. Run: revoke execute on function public.evaluate_honors(text) from anon;';
  end if;

  -- The other eleven from 0147 §3 must be untouched by this file.
  if has_function_privilege('authenticated', 'public.honor_metrics(uuid)', 'execute') then
    raise exception '0150: honor_metrics(uuid) is reachable by authenticated again — 0146/0147 regressed. This migration does not grant it.';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · Result, as ROWS (the SQL editor does not display `raise notice`)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Expect: t, f, 0.

select
  has_function_privilege('authenticated', 'public.evaluate_honors(text)', 'execute')
                                                                        as authenticated_can_evaluate_expect_t,
  has_function_privilege('anon', 'public.evaluate_honors(text)', 'execute')
                                                                        as anon_can_evaluate_expect_f,
  -- 0147 §3 minus evaluate_honors: the eleven that must stay unreachable from the client.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.proname in ('push_drain','push_reconcile','push_enqueue_for','notification_events_for',
                        'app_events_prune','metrics_rollup','metrics_rollup_backfill',
                        'squad_checkin_prune','squad_checkin_mark_reclaimed','squad_checkin_orphans',
                        'honor_metrics')
      and (has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute')))
                                                                        as maintenance_still_reachable_expect_0;
