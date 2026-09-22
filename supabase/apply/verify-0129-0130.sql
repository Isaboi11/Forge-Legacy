-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — VERIFY 0129 + 0130 (Creator Dashboard)
--
--   1. Run `supabase/apply/pending-0129-0130.sql` FIRST.
--   2. Then paste this ENTIRE file and Run.
--
-- Read-only. Changes nothing, safe to run any number of times.
--
-- ══ WHY THIS EXISTS SEPARATELY FROM THE BUNDLE ══
--
-- `pending-0129-0130.sql` ends with a `select` that proves only ONE thing: that your email matched an
-- account and the admin grant landed. That check passes identically whether the seven read models were
-- created or not — so the bundle can return a tidy green having done almost nothing, which is the exact
-- failure this project keeps rediscovering ("applying is not working").
--
-- ⚠ THE SUPABASE EDITOR SHOWS ONLY THE LAST RESULT SET. That is why every check below is folded into
--   ONE row of ONE select at the end. Two security checks have already been run unread in this project
--   because they were earlier statements in a multi-statement paste.
--
-- ⚠ §1 RAISES. If anything is missing you get a red error naming it, not a green screen with a blank
--   spot in it. A verify that can only ever succeed is decoration.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- §1 — ASSERT. Raises on the first thing that did not land.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
do $$
declare
  missing text;
  n_pol   int;
  fns     text[] := array[
    'is_app_admin', 'admin_guard', 'admin_overview', 'admin_growth', 'admin_retention_cohorts',
    'admin_engagement', 'admin_feature_adoption', 'admin_content_popularity', 'admin_social_health'
  ];
begin
  -- The allowlist table itself.
  if to_regclass('public.app_admins') is null then
    raise exception '0129 did not land: table public.app_admins does not exist. Re-paste pending-0129-0130.sql.';
  end if;

  -- ⚠ RLS ON WITH ZERO POLICIES IS THE DESIGN, NOT AN OVERSIGHT (the 0129 header and `app_admins`'
  --   own comment both say so): `profiles` is world-readable, so a readable operator list would be
  --   joinable to it and would publish who holds a privileged seat. Enabled-with-no-policies means
  --   nothing reaches it except SECURITY DEFINER functions. Both halves are asserted, because
  --   "someone helpfully added a policy" and "RLS was never enabled" are different failures.
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'app_admins' and c.relrowsecurity
  ) then
    raise exception 'SECURITY: public.app_admins exists but RLS is NOT enabled. Do not use the dashboard until this is fixed.';
  end if;

  select count(*) into n_pol
    from pg_policies where schemaname = 'public' and tablename = 'app_admins';
  if n_pol <> 0 then
    raise exception 'SECURITY: public.app_admins has % polic(ies); it must have ZERO. A readable operator list is joinable to world-readable profiles.', n_pol;
  end if;

  -- All nine functions.
  select string_agg(f, ', ') into missing
    from unnest(fns) as f
   where not exists (
     select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname::text = f
   );
  if missing is not null then
    raise exception '0130 did not fully land. Missing function(s): %. Re-paste pending-0129-0130.sql from the top.', missing;
  end if;

  -- ⚠ EVERY ONE MUST BE DEFINER WITH A PINNED search_path. Definer is what lets an operator read the
  --   population at all; the pinned path is what stops a caller shadowing a table name and having the
  --   function read theirs instead, as itself. A definer function without one is a privilege escalation.
  select string_agg(p.proname::text, ', ') into missing
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname::text = any(fns)
     and (not p.prosecdef or p.proconfig is null or not exists (
       select 1 from unnest(p.proconfig) cfg where cfg like 'search\_path=%'
     ));
  if missing is not null then
    raise exception 'SECURITY: function(s) % are not SECURITY DEFINER with a pinned search_path.', missing;
  end if;

  -- ⚠ CHECKED HERE SO §2 CAN REFERENCE IT SAFELY. Postgres resolves names per statement at execution,
  --   so §2 reaching a missing `app_events` would fail with a bare "relation does not exist" after this
  --   block had already reported everything green. This turns that into a sentence naming the fix.
  --   `app_events` is 0131's, not 0129/0130's — but it is where the funnel lands and the dashboard reads.
  if to_regclass('public.app_events') is null then
    raise exception 'public.app_events is missing — migration 0131 is not applied. The dashboard has nothing to read. Apply 0131 first.';
  end if;

  -- The grant. 0 here means the email in the bundle matched no account in auth.users.
  if (select count(*) from public.app_admins) = 0 then
    raise exception 'app_admins is EMPTY — the dashboard will refuse you. The email in pending-0129-0130.sql STEP 2 matched no account. Run: select email from auth.users;';
  end if;

  raise notice 'OK — 0129 + 0130 are applied and the gate is shaped correctly.';
end $$;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- §2 — REPORT. One row. This is the only thing the editor will show you.
--
-- EXPECTED, if the bundle ran and nothing else has happened yet:
--
--   admins                 1        (you)
--   read_models            7        the seven admin_* dashboards
--   guard_fns              2        is_app_admin + admin_guard
--   all_definer_pinned     true
--   app_admins_policies    0        ← MUST be 0. Any other number is a security regression.
--   app_events_table       true     0131, already applied — where the funnel events land
--   app_events_rows        0 or a small number
--   events_last_7d         0        ⚠ ZERO IS CORRECT TODAY.
--
-- ⚠ `events_last_7d = 0` IS THE EXPECTED ANSWER AND NOT A FAULT. The activation instrumentation
--   (auth, onboarding steps, workout started/saved, cap attempts) is committed but NOT YET DEPLOYED.
--   Nothing is writing these events from a real device yet. A NON-zero count would mean either the
--   build already shipped, or something is writing events nobody expected — both worth knowing.
--   Once the build is out, this number rising is the proof the funnel actually works end to end.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
select
  (select count(*) from public.app_admins)                                            as admins,
  (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'admin_overview','admin_growth','admin_retention_cohorts','admin_engagement',
      'admin_feature_adoption','admin_content_popularity','admin_social_health'))      as read_models,
  (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('is_app_admin','admin_guard'))        as guard_fns,
  (select count(*) = 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('is_app_admin','admin_guard','admin_overview','admin_growth',
                        'admin_retention_cohorts','admin_engagement','admin_feature_adoption',
                        'admin_content_popularity','admin_social_health')
      and (not p.prosecdef or p.proconfig is null))                                    as all_definer_pinned,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'app_admins')                          as app_admins_policies,
  (to_regclass('public.app_events') is not null)                                       as app_events_table,
  coalesce((select count(*) from public.app_events), 0)                                as app_events_rows,
  coalesce((select count(*) from public.app_events
             where occurred_at > now() - interval '7 days'), 0)                        as events_last_7d;
