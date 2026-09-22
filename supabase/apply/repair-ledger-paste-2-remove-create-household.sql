-- ═════════════════════════════════════════════════════════════════════════════════════════
-- OPS · REPAIR 2 of 2 — remove the one Ledger function left in Forge's database
--
--   PASTE INTO THE FORGE LEGACY SQL EDITOR (project ucqbzoeouvwoyfnnmqoo) AND RUN. Safe to run twice.
--
-- Repair 1's report (2026-09-10): `goals_table_exists true · goals_rows 7 · goal_progress_fk_intact true ·
-- ledger_tables_here null · ledger_functions_here create_household`. So Ledger's wipe never ran here —
-- only its `20260903140000_create_household.sql` did, which brought exactly two functions:
-- `handle_new_user()` (restored to Forge's by repair 1) and `create_household(text, text)`, removed here.
--
-- ⚠ WHY THE SIGNUP FAILED SILENTLY: Ledger's `handle_new_user()` began with
--   `if exists (select 1 from households)` — a table that does not exist in this database. That raised
--   42P01 on every signup, its `exception when others then return new` swallowed it, and the profile
--   insert was never reached. The signup itself succeeded, which is why nobody saw an error.
--
-- `create_household` is SECURITY DEFINER and granted to `anon`. It references tables that do not exist
-- here, so it can only ever raise — but a definer function granted to strangers has no business in this
-- schema. Nothing in Forge calls it (grep of src/ and supabase/: no matches).
-- ═════════════════════════════════════════════════════════════════════════════════════════

drop function if exists public.create_household(text, text);
drop function if exists public.create_household();

-- ONE row. Expect: create_household_left 0 · signup_fn_is_forge true.
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'create_household')                   as create_household_left,
  pg_get_functiondef('public.handle_new_user()'::regprocedure)
    like '%insert into profiles (id, name, first_name, handle, initials)%'           as signup_fn_is_forge;
