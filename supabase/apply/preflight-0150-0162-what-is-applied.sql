-- WHAT IS ACTUALLY APPLIED — 0150 through 0162
--
-- READ-ONLY. It creates nothing, alters nothing, and grants nothing. Paste it, read the table, close it.
--
-- ══ WHY THIS EXISTS ══
--
-- `Forge-Legacy-Master-Status.md` carries the ledger, and the ledger goes stale: rows are written when a
-- migration is AUTHORED and nobody comes back to mark them run. Today it still flags 0150, 0151 and 0152
-- as "AUTHORED, NOT APPLIED" while 0162 — which cannot even install unless 0151's column and 0150's grant
-- are both already there — applied cleanly. A ledger that has been wrong twice in one day is not a ledger.
--
-- ⚠ SO THIS ASKS THE DATABASE, NOT THE DOCUMENT. Every row below is an OBSERVABLE artifact: a column, a
--   table, an enum value, a function body, a privilege. Nothing infers "applied" from a file existing.
--
-- ⚠ AND IT ASKS FOR THE THING THE MIGRATION DID, not for the migration. There is no schema_migrations
--   table in this project — migrations are pasted by hand — so "was 0156 run" is unanswerable and "does
--   `program_earns_credit` exist" is answerable. Where a migration's whole job was to REVOKE something,
--   the check is the absence of a privilege, which is the only honest shape for that question.

with checks(ord, migration, what_it_did, applied) as (

  -- 0150 · restored the EXECUTE grant 0147 revoked, which had broken every workout save.
  select 1, '0150', 'authenticated can EXECUTE evaluate_honors',
         exists (
           select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'evaluate_honors'
              and has_function_privilege('authenticated', p.oid, 'EXECUTE')
         )

  -- 0151 · the stair climber's floors got their own column.
  union all select 2, '0151', 'workout_sets.floors exists',
         exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='workout_sets' and column_name='floors')

  -- 0152a · Discover and Preview count people who TRAINED, via squad_trained_since().
  union all select 3, '0152 (discover)', 'discover_squads calls squad_trained_since',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                  where n.nspname='public' and p.proname='discover_squads'
                    and pg_get_functiondef(p.oid) like '%squad_trained_since%')

  -- 0152b · the weekly review RPC returns created_at. ⚠ TWO MIGRATIONS SHARE THE NUMBER 0152.
  union all select 4, '0152 (weekly)', 'ensure_weekly_review returns created_at',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                  where n.nspname='public' and p.proname='ensure_weekly_review'
                    and pg_get_functiondef(p.oid) like '%''created_at'', v_row.created_at%')

  -- 0153 · squad training push, over a parameterised union.
  union all select 5, '0153', 'push_tg_training_started exists',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                  where n.nspname='public' and p.proname='push_tg_training_started')

  -- 0154 · and those trigger functions are NOT callable by clients. Absence IS the check.
  union all select 6, '0154', 'anon canNOT execute push_tg_training_started',
         not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                      where n.nspname='public' and p.proname='push_tg_training_started'
                        and has_function_privilege('anon', p.oid, 'EXECUTE'))

  -- 0155 · a program can be 'finished' rather than only ended early.
  union all select 7, '0155', 'program_state enum has ''finished''',
         exists (select 1 from pg_type t join pg_enum e on e.enumtypid=t.oid
                  where t.typname='program_state' and e.enumlabel='finished')

  -- 0156 · short programs earn rank credit on their own terms.
  union all select 8, '0156', 'program_earns_credit exists',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                  where n.nspname='public' and p.proname='program_earns_credit')

  -- 0157 · a week is a template you can keep.
  union all select 9, '0157', 'week_templates table exists',
         exists (select 1 from information_schema.tables
                  where table_schema='public' and table_name='week_templates')

  -- 0158 · and you cannot keep unlimited ones.
  union all select 10, '0158', 'week_templates_cap_guard exists',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                  where n.nspname='public' and p.proname='week_templates_cap_guard')

  -- 0159 · the morning briefing, and its copy.
  union all select 11, '0159', 'briefing_lines table exists',
         exists (select 1 from information_schema.tables
                  where table_schema='public' and table_name='briefing_lines')

  -- 0160 · hidden-column grants reapply themselves.
  union all select 12, '0160', 'reapply_hidden_column_grants exists',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                  where n.nspname='public' and p.proname='reapply_hidden_column_grants')

  -- 0161 · the invite-code trigger runs as definer so it can read the column it fills.
  union all select 13, '0161', 'squads_set_invite_code is SECURITY DEFINER',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                  where n.nspname='public' and p.proname='squads_set_invite_code' and p.prosecdef)

  -- 0162 · the route and the climb.
  union all select 14, '0162', 'workout_sets.route exists',
         exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='workout_sets' and column_name='route')
)
select migration,
       case when applied then '✅ applied' else '❌ MISSING' end as status,
       what_it_did
  from checks
 order by ord;

-- ── How to read a ❌ ─────────────────────────────────────────────────────────
--
-- It means THE ARTIFACT IS ABSENT, which is not always the same as "the migration never ran":
--
--   · A later migration may have replaced the function with a body that no longer matches the marker.
--     0159 restates `push_pref_key` and `push_pref_default` from 0153, for instance — which is exactly why
--     0153's row above checks a trigger function that nothing since has touched.
--   · 0154's row is an ABSENCE by design. A ❌ there means anon CAN execute a trigger function, which is
--     the defect 0154 exists to close, and is worth fixing whether or not the file was ever pasted.
--
-- A ✅ is the stronger claim of the two: the thing the migration was for is present and observable.
