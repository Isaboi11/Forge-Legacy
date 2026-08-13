-- Forge Legacy — DIAGNOSTIC: what can the anonymous role actually run?
--
-- Read-only. Creates nothing, changes nothing. Returns ROWS (the Supabase SQL editor does not display
-- `raise notice` output, which is why 0146's reporting block came back blank).
--
-- ══ WHY THIS EXISTS ══
--
-- This schema contains 33 `revoke execute on function … from public` statements and NOT ONE of them names
-- `anon`. Supabase ships this platform default:
--
--     alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
--
-- so every function created in `public` carries a DIRECT grant to `anon`, and `revoke … from public` does
-- not remove a direct role grant. Those 33 statements run cleanly and change nothing. Confirmed for
-- `honor_metrics` by 0146's own assertion, which failed on its first run and caught it.
--
-- This asks the database which functions are actually reachable, so 0147 is written against fact.
--
-- ══ HOW TO READ THE OUTPUT ══
--
--   risk = 'OPEN — triage first'  → SECURITY DEFINER, anon can run it, and nothing inside stops them.
--                                   If it also takes a uuid, it is the `honor_metrics` shape exactly:
--                                   feed it any athlete's id and read their data.
--   risk = 'guarded internally'   → the body calls admin_guard(), or raises on a null auth.uid().
--                                   The grant is still wrong, but a second gate is holding the line.
--   risk = 'invoker — RLS applies'→ not SECURITY DEFINER, so RLS still evaluates as the caller. Lowest.
--
-- ⚠ BEFORE REVOKING ANYTHING on the OPEN list, check who really calls it. `push_drain` and the prune
--   functions are invoked by pg_cron, and `notification_events()` / `evaluate_honors` call other functions
--   internally — a SECURITY DEFINER caller executes as its owner and is unaffected by a grant change, but
--   a cron job running as a plain role is not. Removing a grant blind is how a security fix becomes an
--   outage.

select
  p.proname                                      as function,
  pg_get_function_identity_arguments(p.oid)      as arguments,
  case
    when not p.prosecdef then 'invoker — RLS applies'
    when pg_get_functiondef(p.oid) ilike '%admin_guard%'
      or pg_get_functiondef(p.oid) ilike '%auth.uid() is null%'
      or pg_get_functiondef(p.oid) ilike '%not authenticated%'
      then 'guarded internally'
    else '❌ OPEN — triage first'
  end                                            as risk,
  p.prosecdef                                    as security_definer,
  pg_get_function_identity_arguments(p.oid) like '%uuid%' as takes_a_uuid
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and has_function_privilege('anon', p.oid, 'execute')
order by
  case
    when not p.prosecdef then 3
    when pg_get_functiondef(p.oid) ilike '%admin_guard%'
      or pg_get_functiondef(p.oid) ilike '%auth.uid() is null%'
      or pg_get_functiondef(p.oid) ilike '%not authenticated%' then 2
    else 1
  end,
  (pg_get_function_identity_arguments(p.oid) like '%uuid%') desc,
  p.proname;
