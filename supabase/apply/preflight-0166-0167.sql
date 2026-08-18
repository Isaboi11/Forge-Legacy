-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — PREFLIGHT: is 0166 applied? is 0167? (STEP 1 of the ship checklist)
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- It READS ONLY — no insert, update, delete or DDL anywhere in it. Safe at any time, any number of
-- times. There is no Supabase CLI and no service key in this project; the dashboard is the only path.
--
-- ══ WHY THIS EXISTS ══
--
-- `Forge-Legacy-Master-Status.md` records 0166 and 0167 as *"AUTHORED NOT APPLIED"*. That may well be
-- true, and it is also exactly the kind of claim this project has had wrong in BOTH directions —
-- eleven applied files once sat listed as pending, and a "pending" bundle sitting in `supabase/apply/`
-- has never meant more than "a bundle was staged".
--
-- It matters right now because app code in the working tree already depends on both:
--   · `src/data/feedback-live.ts`     inserts into `public.feedback`            (0167)
--   · `src/domain/settings/content.ts` shows a "Send Feedback" row in Settings  (0167)
--   · `src/data/admin-live.ts`        calls `admin_feature_adoption(...)`       (0166)
--
-- Deploying the web build with either missing puts a button in Account Settings that errors when it
-- is tapped. So this asks the database rather than the ledger, BEFORE anything ships.
--
-- ══ TWO RULES INHERITED FROM `preflight-0163-0165.sql`, BOTH LEARNED THE HARD WAY ══
--
--   1. **The Supabase SQL editor returns only the LAST statement's result set.** Everything below is
--      therefore ONE statement returning ONE table. A preflight that silently shows a third of the
--      answer is worse than no preflight.
--
--   2. **Never `pg_get_functiondef()` across a schema.** It raises `42809: "min" is an aggregate
--      function` the moment it meets an aggregate, and an extension puts one in `public`. Existence
--      here is read from the catalogue by name, which cannot raise.
--
-- ══ HOW TO READ THE RESULT ══
--
-- Every row says `PRESENT` or `MISSING`. Then:
--   · all PRESENT              → both applied. Nothing to do; go to step 4 (deploy).
--   · all 0167 rows MISSING    → apply `supabase/migrations/0167_feedback.sql`.
--   · the 0166 row MISSING     → apply `supabase/migrations/0166_admin_programs_finished.sql`.
--   · a MIX inside one file    → say so before applying anything. A half-applied migration is a
--                                different problem from an unapplied one, and it is not for guessing at.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

with expected(migration, kind, obj) as (
  values
    -- 0166 — the admin dashboard's adoption figures.
    ('0166', 'function', 'admin_feature_adoption'),
    -- 0167 — in-app feedback: the table, its guard, and the two triggers that police it.
    ('0167', 'table',    'feedback'),
    ('0167', 'function', 'is_app_admin'),
    ('0167', 'function', 'admin_guard'),
    ('0167', 'function', 'feedback_tg_rate_limit'),
    ('0167', 'function', 'feedback_tg_touch')
),
have_fn as (
  select p.proname as obj
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind = 'f'
),
have_tbl as (
  select c.relname as obj
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind in ('r', 'p')      -- ordinary and partitioned tables
)
select
  e.migration,
  e.kind,
  e.obj                                                       as object_name,
  case
    when e.kind = 'function' and exists (select 1 from have_fn h where h.obj = e.obj) then 'PRESENT'
    when e.kind = 'table'    and exists (select 1 from have_tbl h where h.obj = e.obj) then 'PRESENT'
    else 'MISSING'
  end                                                         as state
from expected e
order by e.migration, e.kind, e.obj;
