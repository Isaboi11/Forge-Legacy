-- Forge Legacy — 0164: the other half of the handshake, and an invitation that reaches a phone
--
-- 0163 made the competition invite exist again. Two things it deliberately did not do, both approved as
-- a P-5 amendment rather than smuggled in as a repair:
--
--   1. **An invitation still could not reach a lock screen.** `challenge_updates` defaulted FALSE.
--   2. **Accepting one told nobody.** There was no event, in push or in the inbox, for somebody joining
--      a competition you created. You found out by opening it and counting the roster.
--
-- ══ 1 · ONE TOGGLE, NOT TWO ══
--
-- `challenge_updates` is RETIRED and `challenge_invites` replaces it, defaulting ON.
--
-- The old toggle read *"Invitations and standing changes in your competitions"* and defaulted off, which
-- was a defensible answer to the wrong question — because **there are no standing-change notifications
-- and never have been.** No branch of the union emits one. So the label described a category that did
-- not exist, and its ambient-sounding half is what justified switching off the half that was not ambient
-- at all: somebody putting your name in a competition.
--
-- The obvious fix is to split it in two. That would leave `challenge_updates` governing nothing — an
-- inert control, which `src/domain/settings/notifications.ts` records as the reason 0120 deleted four
-- ceremony toggles outright: *"An inert control is a worse answer than an absent one."* So it is a rename
-- with a new default, not a split.
--
-- BOTH DIRECTIONS RIDE ONE KEY, and there is precedent: `friend_request` and `friend_accepted` have
-- shared `friend_requests` since 0073. An invitation and its answer are one exchange, and a second
-- toggle would be a distinction only the schema cares about.
--
-- ⚠ AN EXPLICIT OPT-OUT IS CARRIED FORWARD (§5). An athlete who deliberately switched Challenge Updates
-- OFF must not be switched back on by a key rename — the new default would silently overrule a choice
-- they made. Anyone who never touched it simply gets the new default.
--
-- ⚠ AND IT DOES NOT REACH BACKWARDS. The push triggers fire on a row event; nothing re-scans. Turning
-- this on does not deliver an invitation that was already sent, and neither did retiring the old key.
--
-- ══ 2 · BRANCH 17 — `challenge_joined` ══
--
-- Somebody opted into a competition you created. The creator is the only recipient, so unlike branches
-- 10/11/12/15/16 this does NOT fan out.
--
-- Bounded twice: the 14-day window every written branch uses, AND the competition's own state, because
-- "who is in" stops being news the moment it is over — without the second bound a COMPLETED season would
-- keep its entire roster in the creator's inbox permanently.
--
-- Derived, not stored, like everything else in this union: withdraw (`leaveChallenge` deletes the row,
-- CS-D3) and the notification stops having existed. Nothing anywhere records that somebody left, which
-- is the rule, and this branch does not become the place that quietly starts to.
--
-- ⚠ NO `challenge_left`, EVER. CS-D3 is explicit that withdrawal leaves no trace, and a notification
-- saying somebody quit your competition is the anti-shame rule broken from the other end.
--
-- ══ 3 · THE TRIGGER RUNS INSIDE SOMEBODY ELSE'S TRANSACTION ══
--
-- `challenge_participants` is written by the JOINING athlete, so an unhandled raise in the fan-out would
-- roll back their opt-in. This schema has already lost Finish Workout to exactly that shape with every
-- other gate green (0150), so the exception block is the load-bearing line, not defensive habit. It also
-- returns early when the joiner IS the creator — `createChallenge` inserts your own row first, and
-- enqueuing a full re-scan for an event branch 17 excludes is pure waste on every creation.
--
-- Depends on 0059 (challenge_participants), 0120 (push), 0153 (the union + sender), 0159 (preferences),
-- 0163 (branch 6's state gate). Idempotent. RUN AFTER 0163.

-- ── 1 · The preference map — `challenge_updates` retires, `challenge_invites` arrives ──
--
-- ⚠ RESTATED WHOLE, from 0159. Patching either of these by rebuilding from an older copy silently
-- reverts every key added since — the failure 0088, 0092 and 0106 each shipped.
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
    -- 0164. `challenge_updates` is retired: it only ever governed this one kind, and its label
    -- promised standing changes that have never existed. Both halves of the invitation handshake
    -- ride the new key, exactly as friend_request/friend_accepted share `friend_requests`.
    when 'challenge_invite'     then 'challenge_invites'
    when 'challenge_joined'     then 'challenge_invites'
    when 'workout_invite'       then 'workout_tags'
    when 'workout_join_request' then 'workout_tags'
    when 'program_shared'       then 'program_shares'
    when 'squad_post'           then 'squad_feed'
    when 'squad_checkin'        then 'squad_feed'
    when 'squad_recap'          then 'squad_feed'
    when 'post_comment'         then 'post_comments'
    when 'post_reaction'        then 'squad_reactions'
    when 'squad_training_started'  then 'squad_training'
    when 'squad_training_finished' then 'squad_training'
    -- 0159. Its own key, and the first one whose event has no actor.
    when 'training_briefing'    then 'training_briefing'
    else null
  end;
$$;

create or replace function public.push_pref_default(p_key text)
returns boolean
language sql
immutable
as $$
  select case p_key
    when 'squad_activity'    then false
    when 'friend_requests'   then true
    -- 0164. TRUE, and the reason is P-5 §3.2's own: ambient activity is off, something aimed at
    -- YOU is on. An invitation is aimed at you and so is the answer to one you sent, which is why
    -- `friend_requests`, `workout_tags` and `program_shares` all default true. Replaces
    -- `challenge_updates` (false), whose only kind this is.
    when 'challenge_invites' then true
    when 'workout_tags'      then true
    when 'program_shares'    then true
    when 'squad_feed'        then false
    when 'squad_reactions'   then false
    when 'squad_goals'       then false
    when 'squad_invites'     then true
    when 'post_comments'     then true
    when 'squad_training'    then true
    -- 0159. FALSE — P-5 §3.1's ambient default. This is the one notification in the app that nobody
    -- else triggers, so nothing about it is a request the athlete would be sorry to miss; and a daily
    -- push that arrives without being asked for is precisely the posture DNA §8 rules out.
    when 'training_briefing' then false
    else false
  end;
$$;

-- ── 2 · The union — a seventeenth branch ────────────────────────────────────
--
-- ⚠ REBUILT FROM 0163'S BODY VERBATIM, never an older one. Sixteen branches in, seventeen out.
-- The OUT columns do not change, so `create or replace` is legal here (42P13 does not apply) and the
-- privileges — including 0120's revoke — are preserved. The revoke is restated below anyway, because
-- the next person to touch this may have to drop it and the line must be one edit away from them.
create or replace function public.notification_events_for(p_user uuid)
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid, share_id uuid, post_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  -- 1
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = p_user and q.status = 'pending'

  union all
  -- 2
  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = p_user and m.user_id <> p_user

  union all
  -- 3
  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
   where q.user_id = p_user
     and q.status in ('approved', 'declined')
     and q.decided_at is not null

  union all
  -- 4 (0073, restored 0109)
  select 'friend_request'::text, f.requested_at, null::uuid, f.requested_by, null::uuid, null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'PENDING'
     and p_user in (f.low_id, f.high_id)
     and f.requested_by <> p_user

  union all
  -- 5 (0073, restored 0109)
  select 'friend_accepted'::text, f.accepted_at, null::uuid,
         case when f.low_id = p_user then f.high_id else f.low_id end,
         null::uuid, null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'ACCEPTED'
     and f.accepted_at is not null
     and f.requested_by = p_user

  union all
  -- 6 (widened 0163) — ENROLLMENT *or* ACTIVE. "Starts today" means midnight this morning, so the
  --   creator's own trip back to the hub calls advance_challenges() and flips the competition to ACTIVE
  --   within seconds of it being created. Gated on ENROLLMENT, this derived event stopped existing before
  --   the invited friend ever opened the app — no notification, no push, and no "Open to Join" row to opt
  --   in from. It now lasts as long as joining does.
  select 'challenge_invite'::text, c.created_at, null::uuid, c.creator_id, c.id, null::uuid, null::uuid, null::uuid
    from public.challenges c
   where c.context = 'FRIENDS'
     and c.state in ('ENROLLMENT', 'ACTIVE')
     and p_user = any(c.invited_ids)
     and not exists (
       select 1 from public.challenge_participants cp
        where cp.challenge_id = c.id and cp.user_id = p_user
     )

  union all
  -- 7 (narrowed 0121)
  select 'workout_invite'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid, null::uuid
    from public.workout_invites i
   where i.to_id = p_user and i.status = 'PENDING' and i.kind = 'INVITE'

  union all
  -- 8 (0110)
  select 'program_shared'::text, ps.created_at, null::uuid, ps.from_id, null::uuid, null::uuid, ps.id, null::uuid
    from public.program_shares ps
   where ps.to_id = p_user and ps.status = 'PENDING'

  union all
  -- 9 (0121)
  select 'workout_join_request'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid, null::uuid
    from public.workout_invites i
    join public.profiles h on h.id = i.to_id
   where i.to_id = p_user
     and i.kind = 'JOIN_REQUEST'
     and i.status = 'PENDING'
     and h.training_since is not null
     and h.training_since > now() - interval '4 hours'

  union all
  -- 10 (0122, narrowed 0126) — THE FIRST FAN-OUT BRANCH. Windowed at 14 days; see 0122's header for why
  --     that predicate is load-bearing rather than tidy.
  --     `author_id is not null` keeps the AUTHORLESS weekly recap out of this branch and in branch 12,
  --     where it is worded as the squad's own summary instead of as somebody's post.
  select 'squad_post'::text, sp.created_at, sp.squad_id, sp.author_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_posts sp
    join public.squad_members m on m.squad_id = sp.squad_id and m.user_id = p_user
   where sp.author_id is not null
     and sp.author_id <> p_user
     and sp.created_at > now() - interval '14 days'

  union all
  -- 11 (0122)
  select 'squad_checkin'::text, sc.created_at, sc.squad_id, sc.user_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_checkins sc
    join public.squad_members m on m.squad_id = sc.squad_id and m.user_id = p_user
   where sc.user_id <> p_user
     and sc.created_at > now() - interval '14 days'

  union all
  -- 12 (0126) — the weekly review. `actor_id` is null on purpose: the SQUAD wrote this, not a member,
  --     and the client draws the crest rather than an avatar for exactly that reason.
  select 'squad_recap'::text, sp.created_at, sp.squad_id, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_posts sp
    join public.squad_members m on m.squad_id = sp.squad_id and m.user_id = p_user
   where sp.type = 'weekly'
     and sp.author_id is null
     and sp.created_at > now() - interval '14 days'

  union all
  -- 13 (0135) — somebody commented on your post. `squad_posts.squad_id` rides along so the row can wear
  --     the squad's crest and open `/squad-post/<id>`; it is NULL on a FRIENDS post, which is how the
  --     client knows to open `/friends` instead. Not fan-out: one comment notifies one person.
  select 'post_comment'::text, c.created_at, sp.squad_id, c.author_id, null::uuid, null::uuid, null::uuid, sp.id
    from public.squad_post_comments c
    join public.squad_posts sp on sp.id = c.post_id
   where sp.author_id = p_user
     and c.author_id is distinct from p_user
     and c.created_at > now() - interval '14 days'

  union all
  -- 14 (0135) — somebody reacted to your post. Default OFF for push (SOC-D11), always present in the
  --     inbox (P-5 §4). The table's primary key is (post_id, user_id), so one reactor is one row and
  --     changing a reaction from respect to honor cannot notify twice.
  select 'post_reaction'::text, r.created_at, sp.squad_id, r.user_id, null::uuid, null::uuid, null::uuid, sp.id
    from public.squad_post_reactions r
    join public.squad_posts sp on sp.id = r.post_id
   where sp.author_id = p_user
     and r.user_id is distinct from p_user
     and r.created_at > now() - interval '14 days'

  union all
  -- 15 (0153) — A SQUAD-MATE STARTED TRAINING. The first branch whose subject is a fact about RIGHT NOW
  --     rather than a row somebody wrote, so it is bounded by the same 4-hour presence ceiling branch 9
  --     uses (0086) instead of the 14-day window: "they stopped training" and "this is over" are the
  --     same event, and a start from yesterday is not news.
  --
  --     THREE GATES, and each is somebody's decision:
  --       · `s.training_alerts`  — the squad LEADER turned this on for the squad. Off by default.
  --       · `me.notify_start`    — the RECIPIENT asked for starts, in this squad. Off by default.
  --       · `vis_clears(…)`      — the ACTOR's own training audience (0086/0069). An athlete who hides
  --                                their training from squads is not announced by it. Their setting
  --                                already governs the Live Now row; a push must not be the back door
  --                                around it.
  --
  --     `distinct on (p.id)`: two people can share several squads, and without it one start becomes one
  --     inbox row per shared squad. The push would already have collapsed (the outbox key coalesces
  --     actor_id first), so only the feed would have doubled — visible to nobody writing the branch.
  select 'squad_training_started'::text, t.at, t.squad_id, t.actor_id, null::uuid, null::uuid, null::uuid, null::uuid
    from (
      select distinct on (p.id)
             p.training_since as at,
             s.id             as squad_id,
             p.id             as actor_id
        from public.squad_members me
        join public.squads s on s.id = me.squad_id and s.training_alerts
        join public.squad_members other on other.squad_id = me.squad_id and other.user_id <> p_user
        join public.profiles p on p.id = other.user_id
       where me.user_id = p_user
         and me.notify_start
         and p.training_since is not null
         and p.training_since > now() - interval '4 hours'
         and public.vis_clears(coalesce(p.visibility->>'training', 'squads'), 'squad')
       order by p.id, p.training_since desc, s.id
    ) t

  union all
  -- 16 (0153) — AND WHEN THEY FINISHED ONE. Same three gates, its own toggle, and a 24-hour window.
  --
  --     ⚠ NOT 14 DAYS. Every windowed branch before this one is about something written down that keeps
  --     its meaning — a post is worth reading a week later. A finished session is only news on the day,
  --     and the fan-out here is far wider than the feed branches: a 50-member squad training four times
  --     a week is ~200 rows a fortnight, per member, which would bury every other notification the
  --     athlete has. One day is the longest window that still survives not opening the app overnight.
  --
  --     `distinct on (w.id)`, keyed on the WORKOUT rather than the athlete: unlike a start, two sessions
  --     in one day are two separate pieces of news, and only the shared-squad duplication is collapsed.
  select 'squad_training_finished'::text, t.at, t.squad_id, t.actor_id, null::uuid, null::uuid, null::uuid, null::uuid
    from (
      select distinct on (w.id)
             w.saved_at   as at,
             s.id         as squad_id,
             w.athlete_id as actor_id
        from public.squad_members me
        join public.squads s on s.id = me.squad_id and s.training_alerts
        join public.squad_members other on other.squad_id = me.squad_id and other.user_id <> p_user
        join public.workouts w on w.athlete_id = other.user_id
        join public.profiles p on p.id = w.athlete_id
       where me.user_id = p_user
         and me.notify_finish
         and w.state = 'saved'
         and w.saved_at is not null
         and w.saved_at > now() - interval '24 hours'
         and public.vis_clears(coalesce(p.visibility->>'training', 'squads'), 'squad')
       order by w.id, s.id
    ) t

  union all
  -- 17 (0164) — SOMEBODY ANSWERED YOUR CHALLENGE. The other half of branch 6, missing since 0087: an
  --   invitation could be sent and accepted with the sender told neither. The creator found out by
  --   opening the competition and counting the roster.
  --
  --   NOT FAN-OUT. One join notifies exactly one person, the creator — unlike branches 10/11/12/15/16,
  --   where one row becomes one event per member. A 50-athlete squad competition is 50 rows for one
  --   person over its lifetime, which is why it is bounded twice:
  --     · 14 days, the window every WRITTEN branch uses (`joined_at` is a row somebody caused).
  --     · the competition's own life — who is in stops being news once it is over, and a COMPLETED
  --       season would otherwise keep its whole roster in the creator's inbox forever.
  --
  --   `cp.user_id <> p_user` because creating a competition inserts YOUR OWN participant row first
  --   (`createChallenge`), and being told you joined your own competition is not news either.
  select 'challenge_joined'::text, cp.joined_at, null::uuid, cp.user_id, c.id, null::uuid, null::uuid, null::uuid
    from public.challenge_participants cp
    join public.challenges c on c.id = cp.challenge_id
   where c.creator_id = p_user
     and cp.user_id <> p_user
     and c.state in ('ENROLLMENT', 'ACTIVE')
     and cp.joined_at > now() - interval '14 days';
$$;

revoke execute on function public.notification_events_for(uuid) from public;

-- ── 3 · The sender — the new kind gets its own words and its own destination ─
--
-- ⚠ REBUILT FROM 0153'S BODY VERBATIM. A kind with no `when` arm enqueues a NULL title and body into
-- two NOT NULL columns, so the whole enqueue raises inside somebody's join — which is why §4's trigger
-- swallows exceptions and why this arm is not optional.
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
    user_id, kind, event_at, actor_id, squad_id, challenge_id, invite_id, share_id, post_id, title, body, route
  )
  select
    p_user, e.kind, e.at, e.actor_id, e.squad_id, e.challenge_id, e.invite_id, e.share_id, e.post_id,
    case e.kind
      when 'join_request'         then 'Squad request'
      when 'member_joined'        then 'New member'
      when 'request_approved'     then 'You''re in'
      when 'friend_request'       then 'Friend request'
      when 'friend_accepted'      then 'Friend request accepted'
      when 'challenge_invite'     then 'Challenge'
      when 'challenge_joined'     then 'They''re in'
      when 'workout_invite'       then 'Train together'
      when 'workout_join_request' then 'Join request'
      when 'program_shared'       then 'Program shared'
      when 'squad_post'           then 'New in ' || coalesce(sq.name, 'your squad')
      when 'squad_checkin'        then 'Check-in'
      when 'squad_recap'          then 'The week in ' || coalesce(sq.name, 'your squad')
      when 'post_comment'         then 'New comment'
      when 'post_reaction'        then 'New reaction'
      -- 0153. Short, because a lock screen shows the title and then the body; the name belongs below.
      when 'squad_training_started'  then 'Training now'
      when 'squad_training_finished' then 'Session logged'
    end,
    -- Worded to match `bodyFor` in src/app/inbox.tsx: the push and the row it opens say the same thing.
    case e.kind
      when 'join_request'         then coalesce(pr.name, 'An athlete') || ' asked to join ' || coalesce(sq.name, 'your squad')
      when 'member_joined'        then coalesce(pr.name, 'An athlete') || ' joined ' || coalesce(sq.name, 'your squad')
      when 'request_approved'     then 'You joined ' || coalesce(sq.name, 'the squad')
      when 'friend_request'       then coalesce(pr.name, 'An athlete') || ' wants to be friends'
      when 'friend_accepted'      then coalesce(pr.name, 'An athlete') || ' accepted your request'
      when 'challenge_invite'     then coalesce(pr.name, 'An athlete') || ' challenged you to ' || coalesce(ch.name, 'a competition')
      when 'challenge_joined'     then coalesce(pr.name, 'An athlete') || ' joined ' || coalesce(ch.name, 'your competition')
      when 'workout_invite'       then coalesce(pr.name, 'An athlete') || ' wants to train ' || coalesce(wi.workout_name, 'together') || ' with you'
      when 'workout_join_request' then coalesce(pr.name, 'An athlete') || ' wants to join your workout'
      when 'program_shared'       then coalesce(pr.name, 'An athlete') || ' sent you ' || coalesce(sh.name, 'a program')
      when 'squad_post'           then coalesce(pr.name, 'An athlete') || ' posted in ' || coalesce(sq.name, 'your squad')
      when 'squad_checkin'        then coalesce(pr.name, 'An athlete') || ' checked in to ' || coalesce(sq.name, 'your squad')
      when 'squad_recap'          then 'Your squad''s week is in'
      when 'post_comment'         then coalesce(pr.name, 'An athlete') || ' commented on your post'
      when 'post_reaction'        then coalesce(pr.name, 'An athlete') || ' reacted to your post'
      -- 0153. Named, and the squad is named too — an athlete in several squads is told which one this
      -- is about, and that is the whole difference between a signal and a buzz.
      when 'squad_training_started'  then coalesce(pr.name, 'An athlete') || ' started training' || coalesce(' · ' || sq.name, '')
      when 'squad_training_finished' then coalesce(pr.name, 'An athlete') || ' finished a workout' || coalesce(' · ' || sq.name, '')
    end,
    -- The destinations `/inbox` already uses, so a tapped push and a tapped row land identically.
    case e.kind
      when 'workout_invite'       then '/workout-invite?id=' || e.invite_id::text
      when 'workout_join_request' then '/workout-invite?id=' || e.invite_id::text
      when 'program_shared'       then '/program-share/' || e.share_id::text
      when 'challenge_invite'     then '/challenge/' || e.challenge_id::text
      when 'challenge_joined'     then '/challenge/' || e.challenge_id::text
      when 'join_request'         then '/squad-requests?id=' || e.squad_id::text
      when 'friend_request'       then '/athlete/' || e.actor_id::text
      when 'friend_accepted'      then '/athlete/' || e.actor_id::text
      -- A post the athlete can only have reached through one of the two feeds. A SQUAD post opens the
      -- post page; a FRIENDS post has no detail screen, so it opens the feed that holds it.
      when 'post_comment'         then case when po.audience = 'FRIENDS' then '/friends' else '/squad-post/' || e.post_id::text end
      when 'post_reaction'        then case when po.audience = 'FRIENDS' then '/friends' else '/squad-post/' || e.post_id::text end
      -- 0153. A start opens the ASK side of Train Together (0121) rather than a profile, because the
      -- only thing to do with "they are training right now" is join them, and that window is minutes
      -- long. A finish has nothing to join, so it opens the athlete.
      when 'squad_training_started'  then '/workout-join?athlete=' || e.actor_id::text
      when 'squad_training_finished' then '/athlete/' || e.actor_id::text
      else '/squad/' || e.squad_id::text
    end
    from public.notification_events_for(p_user) e
    left join public.profiles pr on pr.id = e.actor_id
    left join public.squads sq on sq.id = e.squad_id
    left join public.challenges ch on ch.id = e.challenge_id
    left join public.workout_invites wi on wi.id = e.invite_id
    left join public.program_shares sh on sh.id = e.share_id
    left join public.squad_posts po on po.id = e.post_id
   where e.at > v_baseline
     and public.push_prefs_allows(v_prefs, e.kind)
  on conflict do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── 4 · The trigger — and it must not be able to fail somebody's opt-in ──────
create or replace function public.push_tg_challenge_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid;
begin
  select c.creator_id into v_creator from public.challenges c where c.id = new.challenge_id;

  -- Creating a competition inserts your own participant row first, and branch 17 excludes it anyway.
  if v_creator is null or v_creator = new.user_id then
    return null;
  end if;

  -- ⚠ This runs inside the JOINING athlete's insert. A raise here — a deleted profile, a permission
  -- drift three functions away — would roll back their opt-in and present as "Join does nothing".
  begin
    perform public.push_enqueue_for(v_creator);
  exception when others then
    null;
  end;

  return null;
end;
$$;

drop trigger if exists push_challenge_participants on public.challenge_participants;
create trigger push_challenge_participants
  after insert on public.challenge_participants
  for each row execute function public.push_tg_challenge_participants();

-- ── 5 · Carry an EXPLICIT opt-out across the rename ──────────────────────────
-- Only a stored BOOLEAN counts, which is the same rule `push_prefs_allows` and `sanitizeNotif` use: an
-- athlete who never opened the screen has no key at all and simply takes the new default. One who
-- switched Challenge Updates OFF said something, and a rename must not overrule it.
-- Idempotent: the second run finds `challenge_invites` already boolean and matches nothing.
update public.profiles
   set notif_prefs = jsonb_set(coalesce(notif_prefs, '{}'::jsonb), '{challenge_invites}', notif_prefs -> 'challenge_updates')
 where jsonb_typeof(notif_prefs -> 'challenge_updates') = 'boolean'
   and jsonb_typeof(notif_prefs -> 'challenge_invites') is distinct from 'boolean';

-- ── 6 · Assert the edits landed ──────────────────────────────────────────────
do $$
declare
  v_union text := pg_get_functiondef('public.notification_events_for(uuid)'::regprocedure);
  v_send  text := pg_get_functiondef('public.push_enqueue_for(uuid)'::regprocedure);
begin
  if public.push_pref_key('challenge_invite') <> 'challenge_invites'
     or public.push_pref_key('challenge_joined') <> 'challenge_invites' then
    raise exception '0164: the kind → preference map did not take';
  end if;
  if not public.push_pref_default('challenge_invites') then
    raise exception '0164: challenge_invites must default ON — that is the whole point of the amendment';
  end if;
  if public.push_pref_key('challenge_invite') = 'challenge_updates' then
    raise exception '0164: challenge_updates was not retired';
  end if;

  if v_union !~ 'challenge_joined' then
    raise exception '0164: branch 17 is missing from the union';
  end if;
  -- Seventeen branches: sixteen separators. A rebuild from a pre-0164 body would land here.
  if (length(v_union) - length(replace(v_union, 'union all', ''))) / 9 <> 16 then
    raise exception '0164: the union no longer has seventeen branches — it was rebuilt from an older body';
  end if;
  -- 0163's widening has to have survived this rebuild too.
  if v_union !~ 'ENROLLMENT'', ''ACTIVE' then
    raise exception '0164: 0163''s ENROLLMENT-or-ACTIVE gate was lost — the union came from a stale copy';
  end if;

  -- Title, body AND route. A missing arm writes NULL into a NOT NULL column and takes a join down.
  if (length(v_send) - length(replace(v_send, '''challenge_joined''', ''))) / 18 <> 3 then
    raise exception '0164: push_enqueue_for needs a title, a body and a route for challenge_joined';
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'push_challenge_participants' and not tgisinternal
  ) then
    raise exception '0164: the challenge_participants trigger was not created';
  end if;
end;
$$;
