-- Forge Legacy — 0148: an athlete can delete their own account, from inside the app
--
-- ══ WHY THIS IS NOT OPTIONAL ══
--
-- **App Store Review Guideline 5.1.1(v)**: an app that lets you create an account must let you delete it
-- from inside the app. Forge Legacy has no delete path at all today — and `src/domain/settings/content.ts:44`
-- already promises one: *"you may export or delete it at any time from Account settings."* That sentence
-- has been shipping in the Terms of Service describing a control that does not exist.
--
-- Found by the 2026-08-12 launch audit (`Docs/Launch-Audit-2026-08-12.md` §4). It is a submission blocker
-- independent of the copy.
--
-- ══ WHAT DELETING ACTUALLY REACHES ══
--
-- Every athlete-owned table hangs off `profiles(id)`, which hangs off `auth.users(id)`, all
-- `on delete cascade` (`0001_spine.sql:36` and the `athlete_id … references profiles(id) on delete
-- cascade` on every table since). So removing the `auth.users` row removes the whole account in one
-- statement — chapters, workouts, sets, PRs, goals, honors, photos rows, squad memberships, friendships,
-- challenge entries, notifications, push tokens.
--
-- SECURITY DEFINER is what makes that reachable without a service key: the function executes as its
-- owner, which has rights in the `auth` schema, and it can only ever name `auth.uid()` — the caller's own
-- id is not a parameter, so there is no id to pass and no other row to reach. This is the same shape as
-- `is_app_admin()` (0129), which is deliberately zero-argument for exactly this reason.
--
-- ══ ⚠ THE PART THAT IS NOT A CASCADE: SQUADS YOU OWN ══
--
-- `squads.owner_id` also references `profiles(id) on delete cascade` (`0029_squads.sql`). Taken as-is,
-- deleting your account DELETES ANY SQUAD YOU OWN — and `squad_posts.squad_id` cascades from there, so
-- every member's posts, check-ins, comments, records and challenge history go with it. Including, per the
-- audit's finding on 0041/0074, their FRIENDS-audience posts, which have nothing to do with that squad.
--
-- One athlete exercising a privacy right must not destroy other people's records. So ownership is moved
-- first, and only a squad with nobody left in it is allowed to go:
--
--   · other members exist  → ownership transfers to the LONGEST-SERVING remaining member. Same rule as
--     `transfer_squad_ownership` (0047) and the same order of operations the `squad_one_owner` partial
--     index requires: demote, then promote.
--   · you are the only member → the squad is deleted with you. There is nobody to inherit it and nothing
--     of anyone else's inside it.
--
-- Blocking the deletion until the athlete transfers by hand was the other option and is rejected: a
-- privacy right that can be withheld pending a chore is not one, and Apple is unlikely to read it as
-- compliant either.
--
-- ══ ⚠ WHAT THIS DOES **NOT** DO — STORAGE ══
--
-- The athlete's uploaded objects (avatar, chapter photos, transformation media, accomplishment media) are
-- NOT removed here, and cannot be: `storage.protect_delete()` (0142:5-12) raises 42501 on any direct
-- delete from the storage tables, which is deliberate. The DB rows pointing at them go; the bytes stay.
--
-- **The client deletes them first**, before calling this, and that is only possible because 0146 gave
-- these buckets owner-scoped delete policies — before that migration an athlete could not remove their
-- own media (and could remove everyone else's). See `deleteMyAccount()` in `src/data/account-live.ts`
-- for the ordering and why it is best-effort: a failed object delete must not block the athlete from
-- leaving.
--
-- Anything the client misses is an orphan of the same class the audit records for photos generally.
-- That gap is real, tracked, and does not belong in the path of somebody trying to delete their account.
--
-- Idempotent (`create or replace`). Depends on 0001 (profiles), 0029 (squads), 0047 (ownership rules),
-- 0146 (owner-scoped storage). RUN ANY TIME.

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid        uuid := auth.uid();
  v_squad      record;
  v_heir       uuid;
  v_transferred int := 0;
  v_dissolved   int := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  /*
   * Hand on every squad this athlete owns BEFORE the cascade can take it.
   *
   * `joined_at` ascending is "longest-serving": the person who has been there the longest is the least
   * arbitrary heir, and it is the same instinct `transfer_squad_ownership` leaves to the owner when they
   * are present to choose. Nobody is asked, because by this point the owner has already decided to leave.
   */
  for v_squad in
    select id from public.squads where owner_id = v_uid
  loop
    select sm.user_id into v_heir
      from public.squad_members sm
     where sm.squad_id = v_squad.id
       and sm.user_id <> v_uid
     order by sm.joined_at asc
     limit 1;

    if v_heir is null then
      -- Nobody else is in it. Nothing of anyone else's is lost.
      delete from public.squads where id = v_squad.id;
      v_dissolved := v_dissolved + 1;
    else
      -- DEMOTE THEN PROMOTE, in that order: `squad_one_owner` is a partial unique index and will refuse
      -- two owners for an instant if this runs the other way round (0047 states the same rule).
      update public.squad_members set role = 'member' where squad_id = v_squad.id and user_id = v_uid;
      update public.squad_members set role = 'owner'  where squad_id = v_squad.id and user_id = v_heir;
      update public.squads        set owner_id = v_heir where id = v_squad.id;
      v_transferred := v_transferred + 1;
    end if;
  end loop;

  /*
   * The account itself. One statement; every athlete-owned row in the schema hangs off this by cascade.
   *
   * ⚠ `auth.users`, not `profiles`. Deleting the profile would take the athlete's DATA and leave the
   *   credential behind — they could sign in again to an empty shell, which is a deactivated account, not
   *   a deleted one, and is not what 5.1.1(v) asks for.
   */
  delete from auth.users where id = v_uid;

  if not found then
    raise exception 'account not deleted' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'squads_transferred', v_transferred,
    'squads_dissolved', v_dissolved
  );
end;
$$;

comment on function public.delete_my_account() is
  'Deletes the CALLER''s account (App Store 5.1.1(v)). Zero-argument on purpose — there is no id to pass, so it can only ever reach auth.uid(). Squads the athlete owns are transferred to the longest-serving remaining member first, or dissolved if they were the only member, so one athlete leaving cannot destroy another''s posts. Removes auth.users, which cascades every athlete-owned table. Does NOT remove storage objects — storage.protect_delete() (0142) forbids it from SQL; the client removes them first under 0146''s owner-scoped policies.';

-- ⚠ `from public, anon` for the reason 0147 exists: Postgres grants EXECUTE to PUBLIC on every new
--   function, AND Supabase's default privileges grant it directly to `anon`. Revoking either alone leaves
--   the other, and both reported success while changing nothing for 33 statements before 0147 caught it.
revoke execute on function public.delete_my_account() from public;
revoke execute on function public.delete_my_account() from anon;
grant  execute on function public.delete_my_account() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify — returns ROWS. `raise notice` is invisible in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'delete_my_account')            as fn_exists_expect_1,
  has_function_privilege('anon', 'public.delete_my_account()', 'execute')       as anon_can_run_expect_false,
  has_function_privilege('authenticated', 'public.delete_my_account()', 'execute') as authed_can_run_expect_true;
