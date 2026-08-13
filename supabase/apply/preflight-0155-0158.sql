-- Forge Legacy — PRE-FLIGHT: what is actually applied, 0155 → 0158 (the short-program / week-template set)
--
-- Read-only. Creates nothing, changes nothing. Paste it, run it, and read one row per check.
--
-- ⚠ WHY A THIRD FILE. `preflight-0146-0153.sql` (which now also covers 0154) was written before `23ab50a`
--   landed four more migrations. Extending it in place would have been fine; a separate file is used
--   because THESE FOUR ARE A CHAIN WITH A MANDATORY ORDER and the report reads better when the order is
--   visible. Run both files — neither is a superset of the other.
--
-- ⚠ THE ORDER IS NOT ADVISORY:
--     0155 must COMMIT before 0156 is pasted — `alter type … add value` cannot be USED in the
--          transaction that adds it (`55P04 unsafe_new_enum_value_usage`), and "used" includes a SQL
--          function body, an index predicate and a policy expression, all of which parse at creation.
--     0156 defines `program_earns_credit`, which 0158's trigger calls.
--     0157 adds `programs.source_week_template_id`, which 0158's trigger reads.
--   A partial application therefore fails FORWARD, not cleanly: 0155 alone leaves a label nothing writes,
--   so a one-week program still graduates, still fires M-4 and still credits rank. 0155's own footer says
--   it: *"nothing is broken yet and nothing is fixed yet … do not stop here."*
--
-- ⚠ EVERY CHECK IS A CATALOGUE LOOKUP, AND THAT IS NOT A STYLE CHOICE — same rule as the 0146 file.
--   Postgres resolves relation names at PARSE time, so a check that SELECTs from a missing table raises
--   42P01 and takes the WHOLE report down: precisely the case this file exists to report on. Function
--   privilege checks go through a `pg_proc` join rather than `has_function_privilege('public.f()', …)`
--   for the same reason — the literal form ERRORS on a function that does not exist, the join returns
--   false.
--
-- ⚠ AND A BODY CHECK BEATS AN EXISTENCE CHECK for anything rebuilt with `create or replace`. 0156
--   replaces `save_workout`, `skip_program_session` and `start_program`; 0158 replaces
--   `programs_cap_guard` and patches `my_entitlement`. Every one of those functions already existed, so
--   "the function is there" proves nothing — the question is whether the NEW text is in it.
--
-- ⚠ ONE CHECK CANNOT LIVE IN THIS REPORT AND IS RUN SEPARATELY AT THE BOTTOM. See §2.

with checks as (

  -- ── 0155 · two enum labels, and nothing else ───────────────────────────────
  -- Read as text from `pg_enum` rather than by casting a literal: a cast would be the very thing 55P04
  -- forbids if this ran in the wrong transaction, and it would error rather than report.
  select '0155 · program_state has ''finished''' as grp,
         exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                  where t.typname = 'program_state' and e.enumlabel = 'finished') as ok
  union all
  select '0155 · flm_event_type has ''PROGRAM_COMPLETED''',
         exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                  where t.typname = 'flm_event_type' and e.enumlabel = 'PROGRAM_COMPLETED')

  -- ── 0156 · which programs earn rank credit ─────────────────────────────────
  union all
  select '0156 · program_earns_credit(jsonb) exists',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'program_earns_credit')
  union all
  -- ⚠ THE BRANCH, NOT THE FUNCTION. `save_workout` has existed since 0001 and has been rebuilt whole
  --   four times in this schema, each rebuild silently dropping a shipped branch. Its existence proves
  --   nothing; the 'finished' write is what 0156 adds.
  select '0156 · save_workout can finish a short program',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'save_workout'
                    and pg_get_functiondef(p.oid) like '%finished%')
  union all
  select '0156 · skip_program_session can finish a short program',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'skip_program_session'
                    and pg_get_functiondef(p.oid) like '%finished%')
  union all
  select '0156 · programs_guard_structure exists',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'programs_guard_structure')

  -- ── 0157 · a week is a thing you can save ──────────────────────────────────
  union all
  select '0157 · week_templates table',
         to_regclass('public.week_templates') is not null
  union all
  -- RLS on a table holding one athlete's training, checked separately from the policy: 0129 established
  -- that RLS-enabled-with-zero-policies is deny-by-default and sometimes deliberate, so "enabled" and
  -- "has a policy" are genuinely two questions.
  select '0157 · week_templates RLS enabled',
         coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'public' and c.relname = 'week_templates'), false)
  union all
  select '0157 · week_templates owner policy',
         exists (select 1 from pg_policies
                  where schemaname = 'public' and tablename = 'week_templates'
                    and policyname = 'week_templates_owner_all')
  union all
  -- ⚠ THE CLIENT SELECTS THIS COLUMN. PostgREST answers a missing column with 42703 and the whole query
  --   fails, which `if (error) return null` renders as an empty state rather than an error. That is the
  --   0117/0118 failure and 0151 hit it again.
  select '0157 · programs.source_week_template_id column',
         exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'programs'
                    and column_name = 'source_week_template_id')

  -- ── 0158 · a week does not spend a program slot ────────────────────────────
  union all
  select '0158 · athlete_usage.short_programs_created column',
         exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'athlete_usage'
                    and column_name = 'short_programs_created')
  union all
  select '0158 · week_templates_cap_guard_trg on week_templates',
         exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                  where c.relname = 'week_templates' and t.tgname = 'week_templates_cap_guard_trg'
                    and not t.tgisinternal)
  union all
  -- 0145's guard exists either way; what 0158 adds is the two-allowance split. Checked on the column it
  -- reads rather than on the word "short", so a comment mentioning it cannot green this row.
  select '0158 · programs_cap_guard skips an already-paid week',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'programs_cap_guard'
                    and pg_get_functiondef(p.oid) like '%source_week_template_id%'
                    and pg_get_functiondef(p.oid) like '%short_programs_created%')
  union all
  -- The client reads `usage.shortPrograms`. 0158 patches this body by TRANSFORM rather than retyping it,
  -- and `replace()` returns its input unchanged when the anchor has moved — so a silent no-op that
  -- reported success is exactly the failure this row catches.
  select '0158 · my_entitlement reports shortPrograms',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'my_entitlement'
                    and pg_get_functiondef(p.oid) like '%shortPrograms%')
  union all
  -- Re-asserted because 0158 rebuilt this function: the patch must not have cost it its Holt usage.
  select '0158 · my_entitlement kept its Holt usage',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'my_entitlement'
                    and pg_get_functiondef(p.oid) like '%holt_days_used%')
)
select grp as "migration / check",
       case when ok then '✅ APPLIED' else '❌ MISSING' end as "state"
  from checks
 order by grp;


-- ═════════════════════════════════════════════════════════════════════════════
-- 2 · ⛔ RUN THIS SECOND, AS ITS OWN STATEMENT. IT IS THE ONE THAT BREAKS A LAUNCH.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- ⚠ WHY IT IS NOT IN THE REPORT ABOVE. It must SELECT FROM `entitlement_config`, and a relation name is
--   resolved at PARSE time — so if 0145 had not run, including it would raise 42P01 and destroy the
--   entire report instead of failing one row. Separated so the structural report always prints.
--
-- ⚠ WHY IT MATTERS MORE THAN ANY STRUCTURAL ROW. `entitlement_config` holds EXACTLY ONE ROW, inserted by
--   0145. Changing a column DEFAULT does not touch it. If 0158's UPDATE did not run, `my_entitlement()`
--   returns no `short_programs` key, the client's `num()` coerces the absence to 0, `cap_allows(0, 0)` is
--   false — and EVERY ATHLETE ON EVERY TIER, INCLUDING PREMIUM AND INCLUDING THE PO, is blocked from
--   saving a week. The feature ships completely dark while every structural check above reads APPLIED.
--
-- Expected: free = 3, paid = -1. TWO NUMBERS. A NULL in either column means DO NOT SHIP THE CLIENT.

select free_caps -> 'short_programs' as free_expect_3,
       paid_caps -> 'short_programs' as paid_expect_minus_1,
       case
         when free_caps -> 'short_programs' is null or paid_caps -> 'short_programs' is null
           then '⛔ MISSING — every athlete, including Premium, is blocked from saving a week'
         when (paid_caps ->> 'short_programs')::int <> -1
           then '⚠ paid is not unlimited'
         else '✅ config carries short_programs'
       end as verdict
  from public.entitlement_config
 where id;


-- ── WHAT THIS FILE CANNOT ANSWER ─────────────────────────────────────────────
--
-- Structural checks prove the TEXT is installed. Four things still need the app or a scratch account
-- (0158 §6c/§6d spell them out in full):
--
--   1. A 4-week program must spend `programs`; a 2-week program must spend `short_programs`.
--   2. Saving a week template spends `short_programs` — and STARTING it must spend NOTHING MORE. That is
--      the MA4-D4 assertion, and it is the double-charge the `source_week_template_id` column exists to
--      prevent: two charges for one intent would fire a cap of 3 at 2.
--   3. The wall must present as M-7, not as a raw error toast.
--   4. A program under four designed weeks must earn NO rank credit and NO Programs Graduated honor,
--      while still writing its own timeline entry (`PROGRAM_COMPLETED`, distinct copy from a graduation).
