-- Forge Legacy — 0109: friend requests notify again
--
-- ══ THE DEFECT ══
--
-- A tester sent a friend request. The athlete on the other end opened their notification tab and it was
-- empty — not "nothing new" styled as a bug, literally the Nothing New empty state. The request existed:
-- it was in `friendships` as PENDING, it showed on the asker's "Requests Sent" list, and the recipient
-- could have accepted it from `/add-friend` if they had thought to look there. The one surface that is
-- supposed to TELL them said nothing.
--
-- The client was never at fault. `/inbox` has worded, glyphed and routed `friend_request` and
-- `friend_accepted` since 0073 — it wires them to the asker's profile, which is where a request is
-- answered. `notifications-live.ts` lists both in `KINDS`. Every one of those branches has been
-- unreachable, because the server stopped emitting the rows.
--
-- ══ HOW THEY WERE LOST ══
--
-- 0073 added the two friend branches to `notification_events()` and, in the same migration, widened the
-- `squads` join in `notification_feed` from INNER to LEFT — because a friend event has no squad and an
-- inner join silently dropped it. That much was right.
--
-- 0088 needed a `challenge_id` column. A return-type change is 42P13 under `create or replace`, so it
-- dropped all three functions and rebuilt them — and the rebuilt `notification_events()` was written
-- from the 0054 body, which predates friends. Both branches vanished. Nothing errored: the function
-- compiled, the feed kept returning rows, and squad notifications carried on working, so the loss had
-- no symptom until somebody with no squads got a friend request.
--
-- 0092 then repeated the drop-and-rebuild for `invite_id`, and its own comment records the moment the
-- regression was locked in: "Identical to 0088 apart from the new branch and column." It was — faithfully,
-- including the two missing branches. A rebuild that copies its predecessor inherits whatever the
-- predecessor forgot.
--
-- This is why the union in `notification_events()` is the single thing in this schema most worth
-- re-reading in full before touching. It has no tests, no foreign keys, and no failure mode: a dropped
-- branch is indistinguishable from a quiet week.
--
-- ══ THE FIX ══
--
-- The two branches, restored verbatim from 0073 and padded to the current six-column shape. The return
-- type is unchanged, so this is a plain `create or replace` — `notification_feed` and
-- `notification_unread_count` call it by name and pick up the new body untouched.
--
-- Both branches are still DERIVED. There is no notifications table and this does not add one: the
-- request row IS the notification. Withdraw the request and it disappears from the feed, because the
-- fact behind it stopped being true. That property is the reason a notification here can never lie.
--
-- Still no `friend_declined`, deliberately (0073): accepting notifies, declining is silent, because a
-- notification whose entire content is a small rejection is worse than none.

create or replace function public.notification_events()
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id, null::uuid, null::uuid
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = auth.uid() and q.status = 'pending'

  union all

  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id, null::uuid, null::uuid
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = auth.uid() and m.user_id <> auth.uid()

  union all

  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
   where q.user_id = auth.uid()
     and q.status in ('approved', 'declined')
     and q.decided_at is not null

  union all

  -- RESTORED (0073, lost at 0088). Someone wants to be your friend. No squad, hence the null — which is
  -- the whole reason `notification_feed` left-joins `squads`.
  select 'friend_request'::text, f.requested_at, null::uuid, f.requested_by, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'PENDING'
     and auth.uid() in (f.low_id, f.high_id)
     and f.requested_by <> auth.uid()

  union all

  -- RESTORED (0073, lost at 0088). They said yes. Only the asker is told; there is no matching decline
  -- event, by design.
  select 'friend_accepted'::text, f.accepted_at, null::uuid,
         case when f.low_id = auth.uid() then f.high_id else f.low_id end,
         null::uuid, null::uuid
    from public.friendships f
   where f.status = 'ACCEPTED'
     and f.accepted_at is not null
     and f.requested_by = auth.uid()

  union all

  select 'challenge_invite'::text, c.created_at, null::uuid, c.creator_id, c.id, null::uuid
    from public.challenges c
   where c.context = 'FRIENDS'
     and c.state = 'ENROLLMENT'
     and auth.uid() = any(c.invited_ids)
     and not exists (
       select 1 from public.challenge_participants cp
        where cp.challenge_id = c.id and cp.user_id = auth.uid()
     )

  union all

  select 'workout_invite'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id
    from public.workout_invites i
   where i.to_id = auth.uid() and i.status = 'PENDING';
$$;

comment on function public.notification_events() is
  'The derived notification union. SEVEN branches: join_request, member_joined, request_approved/declined, friend_request, friend_accepted, challenge_invite, workout_invite. Any future column change must DROP and rebuild (42P13) — rebuild from THIS body, not from an older one. 0088 and 0092 each rebuilt from a predecessor and silently dropped both friend branches for two migrations.';
