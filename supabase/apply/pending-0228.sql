-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0228: Plan ahead — pre-log food on a future day, check it off when you eat it
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: the columns are guarded, the backfill only touches rows not yet marked, and §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- PO 2026-09-27: Nutrition Home's › arrow goes into the future. Food added to tomorrow is PLANNED — it shows with
-- a checkbox and counts toward nothing until it is checked. The Meal Plan's meals show the same way on their
-- days (read from the saved week, not copied).
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  adds food_log_entries.planned and food_log_entries.pre_logged (boolean, not null, default false), and marks
--     any row already on a future day (a meal-prep copy) as planned + pre_logged
-- §2  asserts both columns exist, and RAISES if not
-- §3  reports rows, planned rows, pre-logged rows. Read-only.
--
-- ⚠ PASTE THIS BEFORE THE APP UPDATE GOES OUT. The new app asks for these columns; before they exist it falls
-- back to the old diary (no planned rows) and refuses to pre-log a future day with a message instead.
--
-- ⚠ APPLYING IS NOT THE SAME AS WORKING. Expected §3 now: rows = today's count; planned = pre_logged = the number
-- of meal-prep copies sitting on a future date (0 or a handful). Both grow only once the client ships.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — the migration, verbatim from supabase/migrations/0228_food_log_planned.sql
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.food_log_entries add column if not exists planned boolean not null default false;
alter table public.food_log_entries add column if not exists pre_logged boolean not null default false;

update public.food_log_entries
   set planned = true, pre_logged = true
 where logged_on > current_date
   and pre_logged = false;


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT IT TOOK.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'food_log_entries' and column_name = 'planned') then
    raise exception '0228 did not take — missing: food_log_entries.planned';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'food_log_entries' and column_name = 'pre_logged') then
    raise exception '0228 did not take — missing: food_log_entries.pre_logged';
  end if;
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — REPORT. Read-only.
-- ═════════════════════════════════════════════════════════════════════════════

select
  (select count(*) from public.food_log_entries)                   as rows,
  (select count(*) from public.food_log_entries where planned)     as planned,
  (select count(*) from public.food_log_entries where pre_logged)  as pre_logged;
