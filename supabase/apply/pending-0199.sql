-- ═════════════════════════════════════════════════════════════════════════════════════════
--
--   0199 — AN ACCOUNT WITH NO PROFILE ROW CAN STILL FINISH ONBOARDING
--
--   PASTE THIS WHOLE FILE INTO THE SUPABASE SQL EDITOR AND RUN IT ONCE.
--   It is idempotent: running it twice is safe, and the second run mints nothing.
--
--   Fixes: "Couldn't finish — insert or update on table chapters violates foreign key constraint
--   chapters_athlete_id_fkey — Key is not present in table profiles (23503)" on the last onboarding
--   step. The athlete's login exists but their profiles row does not.
--
--   ⚠ NO CLIENT DEPLOY IS NEEDED. The app already calls complete_onboarding; this changes what that
--     function does. The stranded athlete taps "Enter Forge" again (or re-runs onboarding) and it works.
--
--   §0 snapshots the BEFORE state (which body was live, who is missing a row, whether the signup
--   trigger exists) so the report can say WHY, not just that it is fixed.
--   §2 ABORTS the whole paste if the repair did not take. §3 is ONE row — the editor shows only the last
--   result set.
--
-- ═════════════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- §0 — the BEFORE snapshot (read-only; a temp table that disappears with the session)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

drop table if exists pg_temp._0199_before;
create temp table _0199_before as
select
  -- Was 0066's guard live? If false, production was still running 0008's body.
  coalesce((
    select bool_or(pg_get_functiondef(p.oid) like '%no profile row for this account%')
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'complete_onboarding'
  ), false)                                                                        as guard_0066_was_live,
  -- Was the signup trigger present, and enabled ('O') rather than disabled ('D')? Null = missing.
  (select string_agg(t.tgname::text || ':' || t.tgenabled::text, ', ')
     from pg_trigger t
    where t.tgrelid = 'auth.users'::regclass
      and not t.tgisinternal
      and t.tgfoid = to_regprocedure('public.handle_new_user()'))  as signup_trigger_before,
  -- Every live account with no profile row — the athletes this repairs.
  (select coalesce(jsonb_agg(jsonb_build_object(
            'email', u.email,
            'signed_up', u.created_at,
            'last_sign_in', u.last_sign_in_at
          ) order by u.created_at desc), '[]'::jsonb)
     from auth.users u
    where not exists (select 1 from public.profiles p where p.id = u.id)
      and (to_jsonb(u) ->> 'deleted_at') is null)                                  as orphans_before;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — the migration, verbatim (supabase/migrations/0199_mint_missing_profile.sql)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

-- Forge Legacy — 0199: an account with no profile row can still finish onboarding
--
-- ══ WHAT WAS REPORTED ══
--
-- A tester (Shadarach, 2026-09-10) went through every onboarding step and was refused at the last one:
--
--   Couldn't finish — insert or update on table "chapters" violates foreign key constraint
--   "chapters_athlete_id_fkey" — Key is not present in table "profiles". (23503). Try again.
--
-- "Try again" can never work. `chapters.athlete_id` references `profiles(id)`, and the error says there
-- is no `profiles` row for his account. His LOGIN exists (`completeOnboarding` calls `auth.getUser()`
-- first, and that is a round-trip to the auth server that fails for a deleted user), so the account is
-- an `auth.users` row with nothing hanging off it.
--
-- ══ WHY NOTHING NOTICED ══
--
-- Every other screen tolerates a missing profile, which is exactly why this reaches the LAST step:
--
--   * The boot router reads the profile, gets null, reads `onboarded_at` as null, and routes to
--     onboarding — which is also what a brand-new, healthy account does. The two are indistinguishable.
--   * Onboarding writes nothing until the finish, so all seven steps "work".
--   * `/admin`'s signup list reads `profiles`, so the account is invisible to the operator too.
--
-- The only statement in the whole path that NEEDS the row is the Chapter I insert, and it is the last
-- one that runs.
--
-- ══ WHY THE ERROR WAS THE FOREIGN KEY, NOT 0066'S MESSAGE ══
--
-- 0066 added `if not found then raise exception 'no profile row for this account'` after the profile
-- update, for exactly this case. Had it been live, the athlete would have seen that sentence instead of a
-- constraint name. He saw the constraint, so the body running in production is almost certainly 0008's —
-- 0066's commit says "must be RUN by hand", and no preflight since has covered anything below 0146. The
-- paste bundle records which body was live before this one replaced it.
--
-- ══ WHAT THIS DOES ══
--
--   1. `ensure_my_profile()` — mints the caller's row from `auth.users`, the same values
--      `handle_new_user()` (0001) would have written, if and only if it is missing. SECURITY DEFINER
--      because it must read `auth.users`; zero-argument so it can only ever name `auth.uid()` (the
--      `delete_my_account()` shape, 0148).
--   2. `complete_onboarding` calls it first. A missing row stops being a dead end and becomes the one
--      thing the finish repairs on its way through. The rest of the body is 0066's, unchanged — rebuilt
--      from the NEWEST body, never a predecessor.
--   3. A one-time backfill mints a row for every live `auth.users` account that has none, so the
--      stranded athlete is repaired before he taps anything, and so is anyone else in the same state.
--   4. If the signup trigger itself is missing from `auth.users`, it is restored — 0001's definition,
--      pointing at the existing `handle_new_user()`, which is NOT retyped here.
--
-- ⚠ THE MINTED ROW IS 0001's DEFAULT ROW, NOT A GUESS. `name = 'Athlete'`, `handle = 'athlete_<8 hex>'`,
--   `onboarded_at` null. Onboarding overwrites all of it a statement later. If the default handle is
--   somehow already held, the handle is left null (legal since 0009) rather than failing the mint —
--   the athlete chooses one on the Account step anyway.
--
-- ⚠ `honor_count` STAYS IN THE CHAPTER INSERT. 0098 marked the column dead and said to drop it "with the
--   next change to that function". This is that change, but the client's L-5 insert
--   (`chapter-detail-live.ts`) names the column too, and a fix for a signup blocker is the wrong place
--   to widen its blast radius. The literal is harmless.
--
-- Depends on 0001 (profiles, handle_new_user), 0009 (handle nullable), 0066 (the body rebuilt here).
-- Idempotent. RUN ANY TIME.

-- ── 1. Mint the caller's profile row if it is missing ─────────────────────────────────────────────────

create or replace function public.ensure_my_profile()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_meta   jsonb;
  v_handle text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- The healthy case, and nearly every call: the signup trigger did its job.
  if exists (select 1 from public.profiles p where p.id = v_uid) then
    return false;
  end if;

  select coalesce(u.raw_user_meta_data, '{}'::jsonb) into v_meta
    from auth.users u
   where u.id = v_uid;
  if not found then
    -- A session for an account that no longer exists. Nothing to attach a profile to.
    raise exception 'no account for this session' using errcode = 'P0001';
  end if;

  -- 0001's default handle. Compared as lower(text) rather than `::citext`, because citext may live in
  -- the `extensions` schema and this function's search_path deliberately does not include it.
  v_handle := coalesce(v_meta ->> 'handle', 'athlete_' || left(v_uid::text, 8));
  if exists (select 1 from public.profiles p where lower(p.handle::text) = lower(v_handle)) then
    v_handle := null;
  end if;

  insert into public.profiles (id, name, first_name, handle, initials)
  values (v_uid,
          coalesce(v_meta ->> 'name', 'Athlete'),
          coalesce(v_meta ->> 'first_name', 'Athlete'),
          v_handle,
          coalesce(v_meta ->> 'initials', 'A'))
  on conflict do nothing;

  if not exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception 'could not create a profile for this account' using errcode = 'P0001';
  end if;

  return true;
end;
$$;

comment on function public.ensure_my_profile() is
  'Mints the CALLER''s profiles row from auth.users if it is missing — the row handle_new_user() (0001) should have written at signup. Zero-argument: it can only ever reach auth.uid(). Returns true when it had to mint. Called first by complete_onboarding, so an account with no profile row can still finish onboarding instead of failing on chapters_athlete_id_fkey. Migration 0199.';

-- ⚠ BOTH revokes, for the reason 0147 exists: PUBLIC's default grant AND Supabase's direct `anon` grant.
-- `authenticated` needs it: complete_onboarding is SECURITY INVOKER, so it calls this as the athlete.
revoke execute on function public.ensure_my_profile() from public;
revoke execute on function public.ensure_my_profile() from anon;
grant  execute on function public.ensure_my_profile() to authenticated;

-- ── 2. The finish repairs a missing row instead of dying on it ────────────────────────────────────────
-- 0066's body. The only change is the `perform public.ensure_my_profile();` line and its comment.

create or replace function complete_onboarding(
  p_name         text,
  p_first_name   text,
  p_handle       text,
  p_initials     text,
  p_sex          sex,
  p_avatar_url   text,
  p_athlete_type athlete_type,
  p_environment  text,
  p_chapter_name text
) returns void
language plpgsql
security invoker
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- 0199: an account whose signup never produced a profile row gets one now, rather than walking all
  -- seven steps to a foreign-key error that no retry can clear.
  perform public.ensure_my_profile();

  update profiles set
    name         = p_name,
    first_name   = p_first_name,
    handle       = p_handle,
    initials     = p_initials,
    sex          = p_sex,
    avatar_url   = p_avatar_url,
    athlete_type = p_athlete_type,
    environment  = p_environment,
    onboarded_at = now(),
    updated_at   = now()
  where id = v_uid;

  -- The athlete's row is minted by `handle_new_user()` on signup, so zero rows updated means the
  -- trigger never fired. Failing loudly beats silently onboarding a profile that doesn't exist.
  if not found then
    raise exception 'no profile row for this account';
  end if;

  -- Chapter I — silent, active, empty (ONB-D14). Only if they don't already have an active chapter:
  -- a second call is a retry, not a request for a second chapter.
  if not exists (select 1 from chapters where athlete_id = v_uid and is_active) then
    insert into chapters (athlete_id, name, start_date, is_active, workout_count, honor_count)
    values (v_uid, p_chapter_name, current_date, true, 0, 0);
  end if;
end;
$$;

-- ── 3. Backfill: every live account with no profile row gets one ──────────────────────────────────────
-- Same values as `handle_new_user()`. `on conflict do nothing` with NO target, so a handle collision
-- skips that one account (reported by the paste bundle) instead of rolling the whole repair back.
-- Soft-deleted auth users (`deleted_at`, on newer Supabase) are left alone.

insert into public.profiles (id, name, first_name, handle, initials)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'name', 'Athlete'),
       coalesce(u.raw_user_meta_data ->> 'first_name', 'Athlete'),
       case
         when exists (
           select 1 from public.profiles p2
            where lower(p2.handle::text)
                = lower(coalesce(u.raw_user_meta_data ->> 'handle', 'athlete_' || left(u.id::text, 8)))
         ) then null
         else coalesce(u.raw_user_meta_data ->> 'handle', 'athlete_' || left(u.id::text, 8))
       end,
       coalesce(u.raw_user_meta_data ->> 'initials', 'A')
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id)
   and (to_jsonb(u) ->> 'deleted_at') is null
on conflict do nothing;

-- ── 4. The signup trigger, restored only if it is missing ─────────────────────────────────────────────
-- Looked up by FUNCTION, not by name, so a trigger renamed in the dashboard still counts as present.
-- `handle_new_user()` is not redefined — if it is missing too, this leaves it alone rather than retyping it.

do $$
begin
  if to_regprocedure('public.handle_new_user()') is not null
     and not exists (
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
-- §2 — assertions. Any failure ABORTS the paste and rolls every statement above back.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regprocedure('public.ensure_my_profile()') is null then
    raise exception '0199: ensure_my_profile() was not created';
  end if;

  -- Definer, or it cannot read auth.users and the mint fails for exactly the athlete it exists for.
  if not (select prosecdef from pg_proc where oid = 'public.ensure_my_profile()'::regprocedure) then
    raise exception '0199: ensure_my_profile() must be SECURITY DEFINER';
  end if;

  if has_function_privilege('anon', 'public.ensure_my_profile()', 'execute') then
    raise exception '0199: anon can execute ensure_my_profile() — both revokes did not take';
  end if;

  -- ⚠ The other direction. complete_onboarding is INVOKER, so without this grant EVERY signup would fail.
  if not has_function_privilege('authenticated', 'public.ensure_my_profile()', 'execute') then
    raise exception '0199: authenticated cannot execute ensure_my_profile() — onboarding would fail for everyone';
  end if;

  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'complete_onboarding') <> 1 then
    raise exception '0199: expected exactly one complete_onboarding — an overload would let the client reach the old body';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'complete_onboarding'
       and pg_get_functiondef(p.oid) like '%perform public.ensure_my_profile();%'
       and pg_get_functiondef(p.oid) like '%no profile row for this account%'
       and pg_get_functiondef(p.oid) like '%if not exists (select 1 from chapters where athlete_id = v_uid and is_active)%'
  ) then
    raise exception '0199: complete_onboarding is not the 0199 body (mint + 0066 guard + retry-safe chapter)';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — the report. ONE row.
--
-- PREDICTED:
--   guard_0066_was_live      false   (the athlete saw the FK error, not 0066's sentence)
--   orphans_before           [ …Shadarach's email… ]  — possibly others in the same state
--   orphans_remaining        0
--   signup_trigger_before    on_auth_user_created:O   → the trigger is fine; his row was lost some other
--                                                       way (deleted by hand, or a partial account delete)
--                            null                     → the trigger was MISSING, every signup since was
--                                                       affected, and §1 step 4 has restored it
--   signup_trigger_after     on_auth_user_created:O
--   ensure_fn_ok             true
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

select
  b.guard_0066_was_live,
  jsonb_array_length(b.orphans_before)                                            as orphans_before_count,
  b.orphans_before,
  (select count(*) from auth.users u
    where not exists (select 1 from public.profiles p where p.id = u.id)
      and (to_jsonb(u) ->> 'deleted_at') is null)                                 as orphans_remaining,
  b.signup_trigger_before,
  (select string_agg(t.tgname::text || ':' || t.tgenabled::text, ', ')
     from pg_trigger t
    where t.tgrelid = 'auth.users'::regclass
      and not t.tgisinternal
      and t.tgfoid = to_regprocedure('public.handle_new_user()')) as signup_trigger_after,
  (to_regprocedure('public.ensure_my_profile()') is not null
     and not has_function_privilege('anon', 'public.ensure_my_profile()', 'execute')
     and has_function_privilege('authenticated', 'public.ensure_my_profile()', 'execute')) as ensure_fn_ok
from _0199_before b;
