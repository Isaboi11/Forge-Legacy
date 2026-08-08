-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — PASTE-READY BUNDLE: migration 0122 (squad feed notifications)
--
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- There is no Supabase CLI and no service key in this project; the dashboard is the only path.
--
-- ⚠ RUN 0121 FIRST. This rebuilds `notification_events_for` from 0121's NINE-branch body plus two.
--   Applied out of order it would silently delete `workout_join_request` — the exact fault 0088, 0092
--   and 0106 each shipped.
--
-- ⚠ TWO FAN-OUT BRANCHES. One squad post becomes one event per member. Read this migration's header
--   before changing the 14-day window: it is what stops the inbox becoming a second feed and what stops
--   `push_enqueue_for` re-scanning a squad's whole history once per member, inside the insert.
--
-- ⚠ THE LAST STATEMENT TOUCHES `storage.buckets`. If the dashboard role cannot update it, set the
--   `squad-media` limit by hand in Storage → Buckets → squad-media → 50 MB. Everything above it is
--   independent and will already have applied.
--
-- Body below is byte-identical to supabase/migrations/0122_squad_feed_notifications.sql.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0122: the Squad Feed finally notifies anybody
--
-- ══ WHAT THIS CLOSES ══
--
-- PO review: *"Notifications should be when someone in the squad has posted something or checks in. Or
-- friend request or squad invite or different things that matter like that."*
--
-- Friend requests already worked (branch 4). Squad posts and check-ins did not, and the toggle that
-- claimed to control them — `squad_feed`, "Squad Posts & Activity" — has been sitting in Settings since
-- 0022 with nothing behind it: no branch, no trigger, no route. Switching it on did nothing at all, and
-- had done nothing for a hundred migrations.
--
-- ══ THESE ARE THE FIRST FAN-OUT BRANCHES, AND THAT IS A REAL DIFFERENCE ══
--
-- Every branch before these answers "a row ABOUT ME": a pending request, a decided one, an invitation
-- aimed at me. They are self-limiting — one row per relationship, and most of them vanish when answered.
-- `squad_posts` and `squad_checkins` are append-only and unbounded, and joining through `squad_members`
-- multiplies each row by the size of the squad. Three things break if that goes in unqualified:
--
--   1. THE INBOX BECOMES A SECOND FEED. `notification_feed` takes 50 rows ordered by time; one chatty
--      squad fills every slot and pushes a friend request off the screen entirely.
--   2. THE BELL LIES BY VOLUME. `notification_unread_count()` has no limit at all. "127" is not
--      information, and the athlete stops reading the number.
--   3. THE SENDER GOES QUADRATIC. `push_enqueue_for` re-scans the WHOLE union per call, and one post in
--      a twenty-person squad is twenty calls — each scanning every squad post that member can see, from
--      the beginning of time, inside the insert's transaction. `profiles.push_baseline_at` bounds what
--      gets ENQUEUED; it does not bound what gets SCANNED, and it does nothing for the inbox.
--
-- ══ THE ANSWER: A 14-DAY WINDOW, IN THE UNION ══
--
-- One predicate, at the one place the definition lives, and therefore hit by the viewer and the sender
-- alike because they read the same function. It bounds the inbox, the unread count and the enqueue scan
-- together. The justification is not merely technical: a squad post from three weeks ago is not news.
-- The FEED is where it lives; the inbox is for things aimed at you, and these two are the closest the
-- inbox comes to ambient. Both supporting indexes already exist (`squad_posts_squad` from 0041,
-- `squad_checkins_recent` from 0049).
--
-- Residual risk, recorded honestly: a very chatty squad can still dominate fourteen days of one
-- member's inbox. A per-squad cap would bound that properly and a `union all` cannot express one
-- cleanly. Fourteen days is the pragmatic line, not the perfect one.
--
-- ══ ROUTING ══
--
-- Both go to `/squad/[id]` on the `squad_id` the union already carries. For a check-in that is not even
-- a compromise — there is no per-check-in route, they are watched in the squad screen's story viewer.
-- For a post it lands one tap from the post. Adding a `post_id` column to the union would touch eleven
-- files (the union, both wrappers, `notification_feed`, the `push_outbox` column AND its unique-index
-- expression, `push_drain`, `targetFrom`, two client types, `destinationFor`, `FeedRow`); it is a clean
-- follow-up when it is worth that, and today it is not.
--
-- ⚠ ELEVEN BRANCHES after this migration. 0120 had eight; 0121 made it nine. THIS BODY IS REBUILT FROM
--   0121'S, NOT 0120'S. Rebuilding from a stale predecessor has silently deleted a shipped feature three
--   times in this schema (0088 and 0092 each dropped both friend branches; 0106 dropped program
--   graduation). Count them before editing this again.
-- ⚠ CREATE OR REPLACE, NEVER DROP — a drop resets 0120's revoke from PUBLIC and re-opens the
--   SECURITY DEFINER escalation. The return shape is unchanged, so 42P13 does not apply.
--
-- Also folds in the `squad-media` bucket limits, so the client's pre-flight size guard and the server's
-- ceiling are set in one migration and cannot drift apart.
--
-- Depends on 0041 (squad_posts), 0049 (squad_checkins), 0120 (push), 0121 (branch 9). Idempotent.
-- RUN AFTER 0121.

-- ── The union: branches 10 and 11 ────────────────────────────────────────────
create or replace function public.notification_events_for(p_user uuid)
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid, share_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  -- 1
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = p_user and q.status = 'pending'

  union all
  -- 2
  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = p_user and m.user_id <> p_user

  union all
  -- 3
  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
   where q.user_id = p_user
     and q.status in ('approved', 'declined')
     and q.decided_at is not null

  union all
  -- 4 (0073, restored 0109)
  select 'friend_request'::text, f.requested_at, null::uuid, f.requested_by, null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'PENDING'
     and p_user in (f.low_id, f.high_id)
     and f.requested_by <> p_user

  union all
  -- 5 (0073, restored 0109)
  select 'friend_accepted'::text, f.accepted_at, null::uuid,
         case when f.low_id = p_user then f.high_id else f.low_id end,
         null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'ACCEPTED'
     and f.accepted_at is not null
     and f.requested_by = p_user

  union all
  -- 6
  select 'challenge_invite'::text, c.created_at, null::uuid, c.creator_id, c.id, null::uuid, null::uuid
    from public.challenges c
   where c.context = 'FRIENDS'
     and c.state = 'ENROLLMENT'
     and p_user = any(c.invited_ids)
     and not exists (
       select 1 from public.challenge_participants cp
        where cp.challenge_id = c.id and cp.user_id = p_user
     )

  union all
  -- 7 (narrowed 0121)
  select 'workout_invite'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid
    from public.workout_invites i
   where i.to_id = p_user and i.status = 'PENDING' and i.kind = 'INVITE'

  union all
  -- 8 (0110)
  select 'program_shared'::text, ps.created_at, null::uuid, ps.from_id, null::uuid, null::uuid, ps.id
    from public.program_shares ps
   where ps.to_id = p_user and ps.status = 'PENDING'

  union all
  -- 9 (0121)
  select 'workout_join_request'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid
    from public.workout_invites i
    join public.profiles h on h.id = i.to_id
   where i.to_id = p_user
     and i.kind = 'JOIN_REQUEST'
     and i.status = 'PENDING'
     and h.training_since is not null
     and h.training_since > now() - interval '4 hours'

  union all
  -- 10 (0122) — THE FIRST FAN-OUT BRANCH. Windowed at 14 days; see this migration's header for why
  --     that predicate is load-bearing rather than tidy.
  select 'squad_post'::text, sp.created_at, sp.squad_id, sp.author_id, null::uuid, null::uuid, null::uuid
    from public.squad_posts sp
    join public.squad_members m on m.squad_id = sp.squad_id and m.user_id = p_user
   where sp.author_id <> p_user
     and sp.created_at > now() - interval '14 days'

  union all
  -- 11 (0122)
  select 'squad_checkin'::text, sc.created_at, sc.squad_id, sc.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_checkins sc
    join public.squad_members m on m.squad_id = sc.squad_id and m.user_id = p_user
   where sc.user_id <> p_user
     and sc.created_at > now() - interval '14 days';
$$;

comment on function public.notification_events_for(uuid) is
  'THE definition of a notification event. ELEVEN branches: join_request, member_joined, request_approved/declined, friend_request, friend_accepted, challenge_invite, workout_invite, program_shared, workout_join_request, squad_post, squad_checkin. The last two are FAN-OUT — one row becomes one event per squad member — and are windowed at 14 days so the inbox does not become a second feed and push_enqueue_for does not re-scan a squad''s whole history per member. Read by notification_events() for the viewer and by push_enqueue_for() for the sender. Rebuild from THIS body, never an older one — 0088, 0092 and 0106 each rebuilt from a predecessor and silently dropped a shipped feature. Use CREATE OR REPLACE: a DROP resets 0120''s revoke from PUBLIC.';

-- ── Preferences: the inert toggle becomes live ───────────────────────────────
create or replace function public.push_pref_key(p_kind text)
returns text
language sql
immutable
as $$
  select case p_kind
    when 'join_request'         then 'squad_activity'
    when 'member_joined'        then 'squad_activity'
    when 'request_approved'     then 'squad_activity'
    when 'friend_request'       then 'friend_requests'
    when 'friend_accepted'      then 'friend_requests'
    when 'challenge_invite'     then 'challenge_updates'
    when 'workout_invite'       then 'workout_tags'
    when 'workout_join_request' then 'workout_tags'
    when 'program_shared'       then 'program_shares'
    when 'squad_post'           then 'squad_feed'
    when 'squad_checkin'        then 'squad_feed'
    else null
  end;
$$;

-- ⚠ `squad_feed` needs an EXPLICIT arm here. It had none and fell to the catch-all `false` — which
-- happens to be the right value, but the client-parity test asserts every key `push_pref_key` can
-- return has an explicit default, precisely so "right by accident" cannot survive a change to the
-- catch-all. Default stays false: squad activity is ambient (P-5 §3.2), and a fan-out branch defaulting
-- to ON would push a twenty-person squad's whole morning at everyone in it.
create or replace function public.push_pref_default(p_key text)
returns boolean
language sql
immutable
as $$
  select case p_key
    when 'squad_activity'    then false
    when 'squad_feed'        then false
    when 'friend_requests'   then true
    when 'challenge_updates' then false
    when 'workout_tags'      then true
    when 'program_shares'    then true
    else false
  end;
$$;

-- ── The sender: two new arms ─────────────────────────────────────────────────
create or replace function public.push_enqueue_for(p_user uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_baseline timestamptz;
  v_prefs    jsonb;
  v_count    int;
begin
  if p_user is null then return 0; end if;

  select p.push_baseline_at, coalesce(p.notif_prefs, '{}'::jsonb)
    into v_baseline, v_prefs
    from public.profiles p
   where p.id = p_user;

  if v_baseline is null then return 0; end if;
  if not exists (select 1 from public.push_tokens t where t.user_id = p_user and t.disabled_at is null) then
    return 0;
  end if;

  insert into public.push_outbox (
    user_id, kind, event_at, actor_id, squad_id, challenge_id, invite_id, share_id, title, body, route
  )
  select
    p_user, e.kind, e.at, e.actor_id, e.squad_id, e.challenge_id, e.invite_id, e.share_id,
    case e.kind
      when 'join_request'         then 'Squad request'
      when 'member_joined'        then 'New member'
      when 'request_approved'     then 'You''re in'
      when 'friend_request'       then 'Friend request'
      when 'friend_accepted'      then 'Friend request accepted'
      when 'challenge_invite'     then 'Challenge'
      when 'workout_invite'       then 'Train together'
      when 'workout_join_request' then 'Join request'
      when 'program_shared'       then 'Program shared'
      when 'squad_post'           then 'New in ' || coalesce(sq.name, 'your squad')
      when 'squad_checkin'        then 'Check-in'
    end,
    -- Worded to match `bodyFor` in src/app/inbox.tsx: the push and the row it opens say the same thing.
    case e.kind
      when 'join_request'         then coalesce(pr.name, 'An athlete') || ' asked to join ' || coalesce(sq.name, 'your squad')
      when 'member_joined'        then coalesce(pr.name, 'An athlete') || ' joined ' || coalesce(sq.name, 'your squad')
      when 'request_approved'     then 'You joined ' || coalesce(sq.name, 'the squad')
      when 'friend_request'       then coalesce(pr.name, 'An athlete') || ' wants to be friends'
      when 'friend_accepted'      then coalesce(pr.name, 'An athlete') || ' accepted your request'
      when 'challenge_invite'     then coalesce(pr.name, 'An athlete') || ' challenged you to ' || coalesce(ch.name, 'a competition')
      when 'workout_invite'       then coalesce(pr.name, 'An athlete') || ' wants to train ' || coalesce(wi.workout_name, 'together') || ' with you'
      when 'workout_join_request' then coalesce(pr.name, 'An athlete') || ' wants to join your workout'
      when 'program_shared'       then coalesce(pr.name, 'An athlete') || ' sent you ' || coalesce(sh.name, 'a program')
      when 'squad_post'           then coalesce(pr.name, 'An athlete') || ' posted in ' || coalesce(sq.name, 'your squad')
      when 'squad_checkin'        then coalesce(pr.name, 'An athlete') || ' checked in to ' || coalesce(sq.name, 'your squad')
    end,
    -- The destinations `/inbox` already uses, so a tapped push and a tapped row land identically. Both
    -- new kinds fall to the `else` arm, which is already `/squad/<id>` — no new case needed.
    case e.kind
      when 'workout_invite'       then '/workout-invite?id=' || e.invite_id::text
      when 'workout_join_request' then '/workout-invite?id=' || e.invite_id::text
      when 'program_shared'       then '/program-share/' || e.share_id::text
      when 'challenge_invite'     then '/challenge/' || e.challenge_id::text
      when 'join_request'         then '/squad-requests?id=' || e.squad_id::text
      when 'friend_request'       then '/athlete/' || e.actor_id::text
      when 'friend_accepted'      then '/athlete/' || e.actor_id::text
      else '/squad/' || e.squad_id::text
    end
    from public.notification_events_for(p_user) e
    left join public.profiles pr on pr.id = e.actor_id
    left join public.squads sq on sq.id = e.squad_id
    left join public.challenges ch on ch.id = e.challenge_id
    left join public.workout_invites wi on wi.id = e.invite_id
    left join public.program_shares sh on sh.id = e.share_id
   where e.at > v_baseline
     and public.push_prefs_allows(v_prefs, e.kind)
  on conflict do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── Triggers ─────────────────────────────────────────────────────────────────
--
-- Two functions rather than one, because `squad_posts` names its author `author_id` and
-- `squad_checkins` names it `user_id`, and `NEW` is not polymorphic across tables in plpgsql. Each is a
-- five-line loop, and each is as deliberately stupid as 0120's: it answers only "who might have a new
-- event" and hands off. The author is excluded by the union's own WHERE, never here — a trigger that
-- started deciding what an event IS would be the first step back towards the drift 0120 removed.
create or replace function public.push_tg_squad_posts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid;
begin
  for v_user in
    select m.user_id from public.squad_members m
     where m.squad_id = new.squad_id and m.user_id <> new.author_id
  loop
    perform public.push_enqueue_for(v_user);
  end loop;
  return null;
end;
$$;

drop trigger if exists push_squad_posts on public.squad_posts;
create trigger push_squad_posts
  after insert on public.squad_posts
  for each row execute function public.push_tg_squad_posts();

create or replace function public.push_tg_squad_checkins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid;
begin
  for v_user in
    select m.user_id from public.squad_members m
     where m.squad_id = new.squad_id and m.user_id <> new.user_id
  loop
    perform public.push_enqueue_for(v_user);
  end loop;
  return null;
end;
$$;

drop trigger if exists push_squad_checkins on public.squad_checkins;
create trigger push_squad_checkins
  after insert on public.squad_checkins
  for each row execute function public.push_tg_squad_checkins();

-- ── The check-in bucket gets an actual ceiling ───────────────────────────────
--
-- `squad-media` was created with (id, name, public) only (0042) — no `file_size_limit` — so the
-- project-global default applied and the client had no idea what it was. Set here, in the same
-- migration, so the 50 MB the client refuses at and the size the server refuses at are one number.
-- Matches `MAX_CHECKIN_BYTES` in src/lib/storage-upload.ts.
update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
 where id = 'squad-media';

-- ── Grants ───────────────────────────────────────────────────────────────────
-- Restated for the same reason 0121 restates it: `notification_events_for` is SECURITY DEFINER over any
-- user id and must never be directly callable. Reached only through `notification_events()` and
-- `push_enqueue_for`, both of which pin the caller themselves.
revoke execute on function public.notification_events_for(uuid) from public;
