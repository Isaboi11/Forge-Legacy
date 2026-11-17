-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- CHECK — live public tables with row-level security OFF, and SECURITY DEFINER functions still open to
--         public or anon   (READ-ONLY · safe to run any time)
--
-- The live half of PL-1 (Docs/AI-Road-To-10-Plan-v1.0.md §2, platform gate ① "0 public tables without row
-- security", and "every SECURITY DEFINER function revokes public"). The static halves are
-- `node scripts/rls-static-check.mjs` and `node scripts/definer-grants-check.mjs` (both run by
-- src/app/__tests__/rls-static.test.mjs in CI), which replay the migrations. This one asks the database itself, so
-- it also catches a table or a function made in the dashboard — or by another product's SQL — that no migration
-- here knows about.
--
-- Paste into the Supabase SQL editor. It changes nothing. The editor shows the LAST result: the summary row.
--
--   Expected: rls_off = 0 and rls_off_tables = (none).
--   Any row in rls_off_tables is a table the public app key can read or write unless its grants say otherwise —
--   the columns next to it say what anon and authenticated actually hold. (0144 → 0267: coach_ai_config sat here
--   for eight weeks, world-writable.)
--
--   Expected (after 0271): definer_open_unexpected = arcade_ops_push (PUBLIC), arcade_ops_snapshot (PUBLIC) — not
--   in this repo, listed for the PO — and nothing else. Four functions are anon-callable ON PURPOSE and are not
--   counted there: report_client_error (the app reports a crash before sign-in), request_testflight_invite and
--   social_link_hit (the landing site, with the public key), survey_intake (the survey webhook, token-checked).
--   The same four are the allowlist in src/app/__tests__/rls-static.test.mjs. Trigger functions are counted apart:
--   Postgres will not run one outside a trigger, so a grant on it reaches nothing.
--   Before 0271 (read 2026-11-17): 15 unexpected — push_register_token, is_trainer, athlete_respond_to_coach,
--   athlete_revoke_coach, nine trainer_* and Ledger's two.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

with t as (
  select c.oid,
         c.relname::text                                               as table_name,
         c.relrowsecurity                                              as rls_on,
         c.relforcerowsecurity                                         as rls_forced,
         has_table_privilege('anon', c.oid, 'select')                  as anon_select,
         has_table_privilege('anon', c.oid, 'insert,update,delete')    as anon_write,
         has_table_privilege('authenticated', c.oid, 'select')         as auth_select,
         has_table_privilege('authenticated', c.oid, 'insert,update,delete') as auth_write
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind in ('r', 'p')   -- ordinary and partitioned tables (views and sequences are not RLS objects)
),
f as (
  select p.proname::text                                                          as name,
         pg_get_function_result(p.oid) in ('trigger', 'event_trigger')            as is_trigger,
         has_function_privilege('anon', p.oid, 'execute')                         as anon_exec,
         -- A NULL proacl is the default ACL, which includes PUBLIC — so coalesce to acldefault, never to ''.
         exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                  where a.grantee = 0 and a.privilege_type = 'EXECUTE')           as public_exec
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef
     and p.prokind = 'f'
)
select
  (select count(*) from t)                                                           as public_tables,
  (select count(*) from t where not t.rls_on)                                        as rls_off,
  coalesce((select string_agg(
              t.table_name
              || ' (anon ' || case when t.anon_write then 'read+WRITE' when t.anon_select then 'read' else 'none' end
              || ', authenticated ' || case when t.auth_write then 'read+WRITE' when t.auth_select then 'read' else 'none' end
              || ')', ', ' order by t.table_name)
              from t where not t.rls_on), '(none)')                                  as rls_off_tables,
  (select count(*) from t where t.rls_on
      and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.table_name)) as rls_on_no_policy,
  (select count(*) from f)                                                           as definer_fns,
  (select count(*) from f where (f.anon_exec or f.public_exec) and not f.is_trigger) as definer_open,
  coalesce((select string_agg(f.name || case when f.public_exec then ' (PUBLIC)' else ' (anon)' end, ', ' order by f.name)
              from f
             where (f.anon_exec or f.public_exec) and not f.is_trigger
               and f.name not in ('report_client_error', 'request_testflight_invite', 'social_link_hit', 'survey_intake')),
           '(none)')                                                                 as definer_open_unexpected,
  (select count(*) from f where (f.anon_exec or f.public_exec) and f.is_trigger)     as definer_open_triggers,
  now()                                                                              as checked_at;
