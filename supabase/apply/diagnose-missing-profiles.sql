-- ═════════════════════════════════════════════════════════════════════════════════════════
-- DIAGNOSE · why did three accounts end up with no profiles row? — READ-ONLY, ONE ROW
--
-- 0199's report (2026-09-10): 3 orphans — shadrachwbiggs@ (09-10), isaahaltamirano@ (09-06),
-- iahaltamirano@ (09-04) — while `on_auth_user_created` was PRESENT AND ENABLED. So the trigger did not
-- go missing. Either it fired and the row was later deleted, or the live `handle_new_user()` is not the
-- repo's (e.g. edited in the dashboard to swallow its own failure).
--
-- 0199's backfill gave each orphan a profile stamped with the PASTE time, so `created_at` separates the
-- two kinds of row: within a minute of signup = the trigger made it; later = 0199 minted it.
--
-- Nothing here writes. Safe to run any number of times.
-- ═════════════════════════════════════════════════════════════════════════════════════════

select
  -- Is the live function the repo's (0001)? Look for an `exception` block that would hide a failure.
  pg_get_functiondef('public.handle_new_user()'::regprocedure)                          as live_handle_new_user,

  -- Anything on either table that is not in the repo would show up here.
  (select string_agg(t.tgname::text || ' → ' || t.tgfoid::regproc::text, ', ')
     from pg_trigger t
    where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal)                     as triggers_on_auth_users,
  (select string_agg(t.tgname::text || ' → ' || t.tgfoid::regproc::text, ', ')
     from pg_trigger t
    where t.tgrelid = 'public.profiles'::regclass and not t.tgisinternal)                as triggers_on_profiles,

  -- Did OTHER signups in the same window get their row at signup? If yes, this is not every signup.
  (select count(*) from auth.users u where u.created_at >= '2026-08-25')                 as signups_since_aug25,
  (select count(*) from auth.users u join public.profiles p on p.id = u.id
    where u.created_at >= '2026-08-25'
      and p.created_at <  u.created_at + interval '1 minute')                            as row_made_at_signup,
  (select count(*) from auth.users u join public.profiles p on p.id = u.id
    where u.created_at >= '2026-08-25'
      and p.created_at >= u.created_at + interval '1 minute')                            as row_minted_later,

  -- Every signup in the window, newest first.
  (select jsonb_agg(jsonb_build_object(
            'email',           u.email,
            'signed_up',       u.created_at,
            'profile_created', p.created_at,
            'onboarded',       p.onboarded_at is not null,
            'provider',        u.raw_app_meta_data ->> 'provider'
          ) order by u.created_at desc)
     from auth.users u
     left join public.profiles p on p.id = u.id
    where u.created_at >= '2026-08-25')                                                   as signups;
