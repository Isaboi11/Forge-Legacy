-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- CHECK — live public tables with row-level security OFF   (READ-ONLY · safe to run any time)
--
-- The live half of PL-1 (Docs/AI-Road-To-10-Plan-v1.0.md §2, platform gate ① "0 public tables without row
-- security"). The static half is `node scripts/rls-static-check.mjs` (and src/app/__tests__/rls-static.test.mjs),
-- which replays the migrations. This one asks the database itself, so it also catches a table made in the
-- dashboard that no migration knows about.
--
-- Paste into the Supabase SQL editor. It changes nothing. The editor shows the LAST result: the summary row.
--
--   Expected: rls_off = 0 and rls_off_tables = (none).
--   Any row in rls_off_tables is a table the public app key can read or write unless its grants say otherwise —
--   the columns next to it say what anon and authenticated actually hold. (0144 → 0267: coach_ai_config sat here
--   for eight weeks, world-writable.)
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
  now()                                                                              as checked_at;
