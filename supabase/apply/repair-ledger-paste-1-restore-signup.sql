-- ═════════════════════════════════════════════════════════════════════════════════════════
-- OPS · REPAIR 1 of 2 — Forge's signup function, restored after Ledger's SQL landed in this project
--
--   PASTE THIS WHOLE FILE INTO THE FORGE LEGACY SQL EDITOR (project ucqbzoeouvwoyfnnmqoo) AND RUN IT.
--   Safe to run twice. It changes ONE function and deletes nothing.
--
-- ══ WHAT HAPPENED ══
--
-- `diagnose-missing-profiles.sql` (2026-09-10) read the LIVE `public.handle_new_user()` and it is not
-- Forge's. It is the Ledger app's household bootstrap (`C:\Users\isaia\ledger`, whose own project is
-- `kphwbjzokebctqfzutxj`): it inserts into `households` / `household_members`, returns early once any
-- household exists, and swallows every error — and it NEVER inserts a profiles row. Ledger's schema was
-- pasted into the wrong project's SQL editor between 2026-09-01 (last signup that got a profile at
-- signup) and 2026-09-04 (first that did not). Every signup since came in with no profile: 3 of 3.
--
-- `0199` already made onboarding survive this (the finish mints a missing row), so nobody is blocked.
-- This puts the real function back so a profile exists from the moment of signup again — push tokens,
-- analytics and `/admin`'s signup list all need the row before onboarding ends.
--
-- ⚠ LEDGER IS NOT AFFECTED. Its app points at its own project; nothing it runs reads this database.
--
-- ⚠ THE BODY IS 0001's, VERBATIM (`supabase/migrations/0001_spine.sql:185-195`), with the name
--   schema-qualified. Not a rewrite — the repo's schema history never changed; production drifted.
--
-- ══ §3 ALSO ANSWERS THE QUESTION THAT MATTERS MORE ══
--
-- Ledger ships a `wipe.sql` meant to run right before its init, and it contains
-- `drop table if exists goals cascade;`. Forge's Goals feature lives in `public.goals` (0025). If that
-- file was pasted here too, Forge's goals and every athlete's goal rows are gone. §3 says whether
-- `public.goals` still exists, how many rows it has, and whether goal_progress still points at it.
-- REPAIR 2 (removing Ledger's tables from this project) is written only after that answer is read.
-- ═════════════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — Forge's handle_new_user(), as 0001 defines it
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, first_name, handle, initials)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name', 'Athlete'),
          coalesce(new.raw_user_meta_data->>'first_name', 'Athlete'),
          coalesce(new.raw_user_meta_data->>'handle', 'athlete_' || left(new.id::text, 8)),
          coalesce(new.raw_user_meta_data->>'initials', 'A'));
  return new;
end; $$;

-- The trigger already exists and points at this function by oid (the diagnose row showed
-- `on_auth_user_created → handle_new_user`), so `create or replace` is enough. Restored only if absent.
do $$
begin
  if not exists (
    select 1 from pg_trigger t
     where t.tgrelid = 'auth.users'::regclass
       and t.tgfoid  = 'public.handle_new_user()'::regprocedure
       and not t.tgisinternal
  ) then
    create trigger on_auth_user_created after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — assert. Aborts the paste if the live function is still not Forge's.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_def text := pg_get_functiondef('public.handle_new_user()'::regprocedure);
begin
  if v_def not like '%insert into profiles (id, name, first_name, handle, initials)%' then
    raise exception 'repair-1: handle_new_user() does not insert a profile row';
  end if;
  if v_def like '%household%' or v_def like '%exception when others%' then
    raise exception 'repair-1: handle_new_user() still carries Ledger''s household code or its error-swallow';
  end if;
  if not exists (
    select 1 from pg_trigger t
     where t.tgrelid = 'auth.users'::regclass
       and t.tgfoid  = 'public.handle_new_user()'::regprocedure
       and t.tgenabled <> 'D'
       and not t.tgisinternal
  ) then
    raise exception 'repair-1: no enabled trigger on auth.users calls handle_new_user()';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — the report. ONE row. Read-only.
--
-- `query_to_xml` runs a count only when the table exists, so a missing table reads as null instead of
-- aborting the whole paste.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

select
  true                                                                              as signup_restored,

  -- ⭐ THE ANSWER THAT DECIDES REPAIR 2. false = Ledger's wipe ran here and Forge's goals were dropped.
  to_regclass('public.goals') is not null                                           as goals_table_exists,
  case when to_regclass('public.goals') is not null then
    (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.goals', false, true, '')))[1]::text::int
  end                                                                               as goals_rows,
  exists (
    select 1 from pg_constraint c
     where c.conrelid  = to_regclass('public.goal_progress')
       and c.contype   = 'f'
       and c.confrelid = to_regclass('public.goals')
  )                                                                                 as goal_progress_fk_intact,

  -- Ledger objects sitting in Forge's database — the list REPAIR 2 would remove.
  (select string_agg(c.relname::text, ', ' order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v')
      and c.relname in ('households', 'household_members', 'household_invites', 'accounts',
                        'account_balances', 'categories', 'rules', 'imports', 'transactions',
                        'transaction_splits', 'orders', 'reports', 'schedules', 'app_state',
                        'v_month_totals', 'v_spending', 'v_income', 'v_transaction_amounts'))
                                                                                    as ledger_tables_here,
  (select string_agg(p.proname::text, ', ' order by p.proname)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('create_household', 'redeem_invite', 'is_member', 'is_owner',
                        'my_member_id', 'touch_updated_at'))                        as ledger_functions_here,
  case when to_regclass('public.households') is not null then
    (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.households', false, true, '')))[1]::text::int
  end                                                                               as households_rows,
  case when to_regclass('public.transactions') is not null then
    (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.transactions', false, true, '')))[1]::text::int
  end                                                                               as ledger_transactions_rows;
