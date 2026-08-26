-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- OPS · FREE THE HANDLE `@brady`
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- PO, 2026-08-25: *"I deleted an account but it's saying the @ is still taken. We need to get @brady
-- completely erased so it can be taken again."*
--
-- ══ WHY A HANDLE CAN SURVIVE A DELETION ══
--
-- `profiles.id` is `references auth.users(id) on delete cascade` (0001), and `profiles.handle` is
-- `citext not null unique`. So deleting the AUTH USER frees the handle automatically — there is no
-- separate handle table, no reservation list and no tombstone. If `@brady` is still taken, the auth user
-- was **not actually deleted**. The two ways that happens:
--
--   1. The account was removed from the app's `profiles` view or by a partial script, leaving
--      `auth.users` intact. The next signup then collides with the surviving profile row.
--   2. It was "deleted" in a way that soft-deletes — `auth.users.deleted_at` is set and the row stays.
--      A soft-deleted user still holds its `profiles` row, and therefore still holds the handle.
--
-- §1 tells you which. **Read §1's output before running §2.**
--
-- ⚠ THIS IS DESTRUCTIVE AND IRREVERSIBLE. §2 deletes an auth user, which cascades every table that
--   athlete owns. It is guarded so it can only ever fire on a SINGLE row whose handle or username is
--   exactly `brady`: if it matches zero rows, or more than one, it raises and deletes nothing.
--
-- ⚠ STORAGE IS NOT TOUCHED AND CANNOT BE, FROM SQL. `storage.protect_delete()` (0142) raises 42501 on
--   any direct delete from `storage.objects`. Avatars and progress photos for this athlete must be
--   removed from the Supabase dashboard separately — the handle is freed either way, but the files are
--   not gone until you do that.
--
-- Safe to run twice: after a successful §2, §1 reports nothing and §2 raises "already free".
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- §1 · WHERE DOES `brady` STILL LIVE?  — read-only. RUN THIS FIRST, ON ITS OWN.
--
--      Run the file up to the end of this section, read the result, and only then run §2.
--
--      `handle` and `username` are both `citext`, so these comparisons are already case-insensitive —
--      `Brady`, `BRADY` and `brady` are the same value to the unique index and to this query.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

select
  p.id,
  p.handle::text                                    as handle,
  p.username::text                                  as username,
  p.name,
  p.created_at                                      as profile_created,
  (u.id is not null)                                as auth_user_exists,
  u.email,
  u.created_at                                      as auth_created,
  u.last_sign_in_at,
  -- Present on newer Supabase; a non-null value here is the soft-delete case described in the header.
  to_jsonb(u) ->> 'deleted_at'                      as auth_deleted_at,
  (select count(*) from public.workouts w where w.athlete_id = p.id)       as workouts,
  (select count(*) from public.squad_members m where m.user_id = p.id)     as squad_memberships,
  (select count(*) from public.squads s where s.owner_id = p.id)           as squads_owned
from public.profiles p
left join auth.users u on u.id = p.id
where p.handle = 'brady'::citext
   or p.username = 'brady'::citext;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- §2 · FREE IT — destructive. Only run this AFTER reading §1.
--
--      Deletes the auth user, which cascades `profiles` and every athlete-owned table.
--
--      ⚠ IT REFUSES ON ANYTHING OTHER THAN EXACTLY ONE MATCH. Zero means the handle is already free and
--        the problem is elsewhere; more than one should be impossible (the column is unique) and means
--        something is wrong that a delete must not paper over.
--
--      ⚠ SQUAD OWNERSHIP IS HANDED ON FIRST, exactly as `delete_my_account()` does — longest-serving
--        member inherits, and a squad with no other members is dissolved. Without this the cascade would
--        take the squad and every other athlete's posts in it, which is somebody else's data.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_id     uuid;
  v_n      int;
  v_handle text;
  v_squad  record;
  v_heir   uuid;
begin
  select count(*) into v_n
    from public.profiles p
   where p.handle = 'brady'::citext or p.username = 'brady'::citext;

  if v_n = 0 then
    raise exception '`brady` is already free in public.profiles — nothing to delete. If signup still refuses it, the collision is NOT a profiles row: check auth.users for an account whose email/handle metadata reserves it, and check that signup is not reading a cached value.';
  end if;

  if v_n > 1 then
    raise exception '% rows hold `brady`. The handle column is UNIQUE, so this should be impossible — stop and look before deleting anything.', v_n;
  end if;

  select p.id, p.handle::text into v_id, v_handle
    from public.profiles p
   where p.handle = 'brady'::citext or p.username = 'brady'::citext;

  raise notice 'Deleting athlete % (handle %) …', v_id, v_handle;

  -- Hand on any squad they own, so one departure cannot destroy another athlete's posts.
  for v_squad in select id from public.squads where owner_id = v_id loop
    select sm.user_id into v_heir
      from public.squad_members sm
     where sm.squad_id = v_squad.id and sm.user_id <> v_id
     order by sm.joined_at asc
     limit 1;

    if v_heir is null then
      delete from public.squads where id = v_squad.id;
      raise notice '  squad % dissolved (no other members)', v_squad.id;
    else
      -- ⚠ DEMOTE THEN PROMOTE, IN THAT ORDER. `squad_one_owner` (0029) is a partial unique index on
      -- `squad_members(squad_id) where role = 'owner'`, so promoting the heir while the departing owner
      -- still holds the role raises a unique violation — the whole block rolls back and frees nothing.
      -- This script promoted first, and would have failed on any squad `brady` owns that still has
      -- another member in it. `delete_my_account()` (0148) and `transfer_squad_ownership` (0047) both
      -- state the rule; this is now the same three statements in the same order.
      update public.squad_members set role = 'member' where squad_id = v_squad.id and user_id = v_id;
      update public.squad_members set role = 'owner'  where squad_id = v_squad.id and user_id = v_heir;
      update public.squads        set owner_id = v_heir where id = v_squad.id;
      raise notice '  squad % handed to %', v_squad.id, v_heir;
    end if;
  end loop;

  -- The cascade. `profiles` and every athlete-owned table go with it.
  delete from auth.users where id = v_id;

  -- ⚠ BELT AND BRACES. If the auth row was already absent — the "orphaned profile" case from the header
  -- — the delete above matched nothing and the profile is still there holding the handle.
  delete from public.profiles where id = v_id;

  raise notice 'Done. `brady` should now be free.';
end $$;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- §3 · VERIFY — read-only.
--
--      EXPECTED: `profiles_holding: 0` and `auth_holding: 0`. Anything else and the handle is still
--      taken, which means the collision is not where §1 looked.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

select
  (select count(*) from public.profiles p
     where p.handle = 'brady'::citext or p.username = 'brady'::citext)              as profiles_holding,
  (select count(*) from auth.users u
     where lower(u.raw_user_meta_data ->> 'handle') = 'brady')                      as auth_holding,
  (select count(*) from public.profiles)                                           as profiles_total;
