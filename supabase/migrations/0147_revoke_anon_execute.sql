-- Forge Legacy — 0147: take EXECUTE away from `anon`, and stop it coming back
--
-- ══ THE DEFECT ══
--
-- Supabase ships this platform default:
--
--     alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
--
-- so every function created in `public` carries a DIRECT grant to `anon`. This schema contains 33
-- `revoke execute … from public` statements and NOT ONE names `anon`, so not one of them removed anything.
-- They ran cleanly and changed nothing, for years.
--
-- Caught by 0146 asserting its own result rather than trusting its own statement. The follow-up audit
-- (`supabase/apply/audit-anon-executable-functions.sql`) then returned ~95 SECURITY DEFINER functions the
-- anonymous role could execute, including:
--
--   · `notification_events_for(uuid)`   — any athlete's entire notification stream, by id. Re-revoked
--                                          `from public` FIVE times (0120, 0121, 0122, 0126, 0135), and
--                                          0135's comment warns that omitting the line "silently re-opens
--                                          the escalation the revoke exists to close". The line was always
--                                          there. It never worked.
--   · `athlete_profile`, `athlete_trophy_case`, `athlete_training_status`, `friendship_with`,
--     `are_friends`, `all_accepted_friends`, `shared_workout_detail`, `challenge_score`,
--     `challenge_baseline`, `metric_over`, `squad_records_book`, `squad_member_contributions`,
--     `squad_metric_sum/total`, `squad_preview`  — population data, by id, no account required.
--   · `squad_invite_info(uuid)`         — invite codes.
--   · `push_enqueue_for(uuid)`          — enqueue a notification to anybody.
--   · `push_drain(int)`, `push_reconcile(int)` — drain or disable the delivery queue for EVERYONE.
--   · `app_events_prune(int)`, `metrics_rollup*`, `squad_checkin_prune(int)`,
--     `squad_checkin_mark_reclaimed(text[])`  — destructive maintenance.
--
-- ══ WHY ONE SWEEP AND NOT 95 REVOKES ══
--
-- Verified before writing this:
--   · **Nothing in the app calls an RPC while signed out.** Every screen is behind the boot router's auth
--     gate; `sign-in.tsx`, `onboarding.tsx` and `lib/auth.tsx` contain zero `supabase.rpc` calls. Sign-up
--     and sign-in go through GoTrue's `auth` schema, not `public`.
--   · **Nothing else runs as `anon`.** pg_cron jobs execute as the role that scheduled them (`postgres`).
--     Trigger functions execute as the table owner. A SECURITY DEFINER function calling another executes
--     as its own owner. None of these consults the `anon` grant.
--
-- So `anon` needs EXECUTE on nothing in `public`, and enumerating 95 functions would be both slower and
-- less complete than removing the class.
--
-- ⚠ ROLLBACK, if this ever proves wrong:
--     grant execute on all functions in schema public to anon;
--   Then re-run the audit query and grant back only what is genuinely needed pre-auth.
--
-- Idempotent. RUN ANY TIME. Ends with a SELECT — the Supabase SQL editor does not display `raise notice`,
-- which is why 0146's reporting block came back blank.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · Take it away from every function that exists today
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ══ ⚠ THERE ARE **TWO** GRANTS, AND REMOVING EITHER ALONE DOES NOTHING ══
--
-- The first run of this migration revoked from `anon` and asserted the result. 158 functions were still
-- anon-executable. Both grants have to go, and they come from different places:
--
--   1. **PostgreSQL itself** grants `EXECUTE` to `PUBLIC` on every function at creation. This is core
--      Postgres behaviour, not Supabase. `anon` is covered by `PUBLIC`, so it inherits execute even with
--      no direct grant of its own. This is what the schema's 33 `revoke … from public` lines were aimed
--      at — and for those ~33 functions they worked. The other ~120 never had one.
--   2. **Supabase's default privileges** additionally grant directly to `anon`. `revoke … from public`
--      cannot touch a direct role grant, which is what 0146's assertion caught.
--
-- So: `revoke from public` alone leaves Supabase's direct anon grant. `revoke from anon` alone leaves
-- Postgres's PUBLIC grant. Only both together close it. Two ineffective revokes, both reporting success,
-- caught only because each attempt asserted its own outcome.
--
-- ══ ⚠ ORDER IS LOAD-BEARING — GRANT BEFORE REVOKE ══
--
-- Some functions predate Supabase's default-privilege setup, or were created by a different role, and
-- `authenticated` may reach those ONLY through the PUBLIC grant. Revoking PUBLIC first would lock the app
-- out of its own database. So `authenticated` is given an explicit direct grant FIRST.
--
-- This is not a widening: `authenticated` can already execute all of these today, via one grant or the
-- other. It only makes the existing reach explicit so it survives the revoke. §3 then removes the twelve
-- that `authenticated` should never have had.

grant  execute on all functions in schema public to   authenticated;
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · Stop the next migration handing it straight back — THE ROOT CAUSE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Without this, the very next `create function` in `public` is granted to `anon` again by the platform
-- default and we are back here. Default privileges are recorded per granting role, so this covers
-- functions created by `postgres` — which is what the SQL editor and every migration in this repo run as.
--
-- ⚠ It does NOT retroactively cover a role that is not `postgres`. If a future function somehow appears
--   with an anon grant, `supabase/apply/audit-anon-executable-functions.sql` is what finds it. Re-run that
--   query after any migration that creates a function.

-- Both sources again, for the same reason as §1: Postgres's own PUBLIC default AND Supabase's anon grant.
-- `authenticated` is left granted so new functions keep working for the app without a follow-up statement.

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · Internal + destructive functions — take them from `authenticated` too
-- ─────────────────────────────────────────────────────────────────────────────
--
-- §1 closes the unauthenticated hole. These are the ones where *any athlete with an account* should still
-- not be able to reach them: maintenance work owned by cron, and internal helpers the client never names.
--
-- Every one verified to have ZERO `supabase.rpc('…')` call sites in `src/`. Their real callers are pg_cron
-- (runs as `postgres`) and other SECURITY DEFINER functions (run as their owner) — neither is affected.
--
-- `push_drain` in particular MUST keep working: it is what actually delivers every notification. It keeps
-- working because `forge-push-drain` is a cron job owned by `postgres`, confirmed scheduled by the
-- 2026-08-12 preflight.

do $$
declare
  f text;
  fns text[] := array[
    -- delivery + queue
    'public.push_drain(int)',
    'public.push_reconcile(int)',
    'public.push_enqueue_for(uuid)',
    'public.notification_events_for(uuid)',
    -- destructive maintenance
    'public.app_events_prune(int)',
    'public.metrics_rollup(int, text)',
    'public.metrics_rollup_backfill(date, date, text)',
    'public.squad_checkin_prune(int)',
    'public.squad_checkin_mark_reclaimed(text[])',
    'public.squad_checkin_orphans()',
    -- engine internals
    --
    -- ⚠ `public.evaluate_honors(text)` WAS IN THIS LIST AND HAD TO BE TAKEN BACK OUT — see 0150.
    --   The reasoning below ("callee is SECURITY DEFINER, so the grant does not matter") is wrong as
    --   written, and revoking `evaluate_honors` broke Finish Workout, Continue Training and session-skip
    --   for every athlete. SECURITY DEFINER on the CALLEE decides who it runs as, not who may call it.
    --   The grant is skipped only when the CALLER is SECURITY DEFINER, because then the permission check
    --   is against the caller's owner. `evaluate_honors`'s callers — `save_workout` (0124:49),
    --   `continue_workout` (0125:43), `skip_program_session` (0123:145) — are all `security invoker`.
    --   Before adding anything to this list: check the security mode of its CALLERS, not its own.
    --
    -- ⚠ SUPERSEDES 0146. That migration granted `honor_metrics` to `authenticated` to preserve its
    --   documented self-read. This audit then confirmed ZERO client call sites, and its only caller —
    --   `evaluate_honors` — IS SECURITY DEFINER, so `honor_metrics` executes as that function's owner and
    --   this revoke cannot reach it. (That is the correct form of the argument above: the caller is the
    --   definer, not the callee.) An unused grant on a function returning a full metrics bundle is not
    --   worth keeping.
    'public.honor_metrics(uuid)'
  ];
begin
  foreach f in array fns loop
    -- Tolerate a signature that does not exist rather than aborting the whole migration: this list spans
    -- 0012→0143 and a function may have been re-typed. Anything skipped shows up in the closing SELECT.
    begin
      execute format('revoke execute on function %s from anon, authenticated', f);
    exception when undefined_function then
      raise warning '0147: no such function, skipped — %', f;
    end;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · Assert. A revoke that did nothing must not report success.
-- ─────────────────────────────────────────────────────────────────────────────

-- ⚠ EXTENSION FUNCTIONS ARE EXCLUDED, AND THAT IS CORRECT — NOT A LOOPHOLE.
--
-- The second run of this migration got the count from 158 down to 45 and still failed. The remainder are
-- functions installed by EXTENSIONS into `public` (pgcrypto, uuid-ossp, pg_trgm and friends). Two facts
-- about them:
--
--   · `revoke … on all functions in schema public` CANNOT touch them. They are owned by the extension's
--     installing role, not `postgres`, and REVOKE silently skips anything the current role has no grant
--     option on. Running it again will never change the number.
--   · They are not the exposure. `gen_random_uuid()`, `digest()`, `similarity()` and the like take their
--     arguments and return a value; none of them reads a table, so none can leak an athlete's data.
--     Supabase intends them to be callable — its own client libraries rely on some.
--
-- So the assertion scopes to functions this project actually wrote. `pg_depend.deptype = 'e'` is the test:
-- it marks an object as a member of an extension.
--
-- The exception NAMES the offenders rather than counting them, because a count told us nothing useful
-- twice in a row.

do $$
declare v_names text;
begin
  select string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', '
                    order by p.proname)
    into v_names
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind = 'f'
     and has_function_privilege('anon', p.oid, 'execute')
     and not exists (                       -- not installed by an extension
       select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
     );

  if v_names is not null then
    raise exception
      '0147: anon can still execute these project function(s): %', v_names;
  end if;

  -- The app must not have been locked out of its own database by the PUBLIC revoke.
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.prokind = 'f'
         and has_function_privilege('authenticated', p.oid, 'execute')) = 0 then
    raise exception '0147: authenticated can execute NOTHING — the grant in §1 did not land. Roll back with: grant execute on all functions in schema public to authenticated;';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · Result, as ROWS
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Expect: anon_executable = 0, and the maintenance functions listed as locked.

select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and has_function_privilege('anon', p.oid, 'execute')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'))
                                                                     as anon_project_fns_expect_0,
  -- Informational: extension utilities (pgcrypto/uuid-ossp/pg_trgm…). Not revocable by `postgres`, and
  -- not an exposure — they compute over their arguments and read no table. Any non-zero value is fine.
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and has_function_privilege('anon', p.oid, 'execute')
      and exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'))
                                                                     as anon_extension_fns_ok,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and has_function_privilege('authenticated', p.oid, 'execute')) as authenticated_executable,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      -- `evaluate_honors` is deliberately NOT here: 0150 grants it back to `authenticated`, so counting it
      -- would make this figure report 1 forever. See the note in §3.
      and p.proname in ('push_drain','push_reconcile','push_enqueue_for','notification_events_for',
                        'app_events_prune','metrics_rollup','metrics_rollup_backfill',
                        'squad_checkin_prune','squad_checkin_mark_reclaimed','squad_checkin_orphans',
                        'honor_metrics')
      and (has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute')))
                                                                     as maintenance_still_reachable_expect_0;
