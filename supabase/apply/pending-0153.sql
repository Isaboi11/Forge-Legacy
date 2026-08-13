-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — PASTE-READY BUNDLE: migration 0153 (your squad knows when you train)
--
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- There is no Supabase CLI and no service key in this project; the dashboard is the only path.
--
-- WHAT IT ADDS: squad-mates can be told when someone in the squad STARTS a session and when they
-- FINISH one. Two new branches on the notification union (15 and 16), the first trigger ever placed
-- on `public.workouts`, and the first one ever placed on the presence column
-- `profiles.training_since` — which 0086 has been writing for thirty migrations with nothing
-- listening to it.
--
-- ⚠ RUN AFTER 0135. This rebuilds `notification_events_for` from 0135's fourteen-branch body. If
-- 0135 has not been applied, this replaces whatever is there with a sixteen-branch union that reads
-- tables 0135 was supposed to create, and the CREATE fails on the first one missing.
--
-- ⚠ IT CHANGES NOTHING UNTIL SOMEBODY TURNS IT ON. All three new switches default to off:
--   · `squads.training_alerts`                         false — no leader has opted a squad in
--   · `squad_members.notify_start` / `notify_finish`  false — no member has asked for either half
-- Applying this to the live database therefore sends zero notifications to anybody, and it is safe
-- to run in the middle of somebody’s training session.
--
-- SAFE TO RUN TWICE: every ALTER is `add column if not exists`, every function is
-- `create or replace`, and both triggers are dropped before they are created. The union is rebuilt
-- IN PLACE rather than dropped, so 0120's `revoke … from public` survives untouched.
--
-- VERIFY AFTER RUNNING:
--   select count(*) from public.notification_events_for(auth.uid());
--   -- Any number, including 0, with no error is the pass: it proves the sixteen-branch body parsed.
--
--   select training_alerts from public.squads limit 5;                      -- all false
--   select notify_start, notify_finish from public.squad_members limit 5;   -- all false
--
-- THEN THE REAL TEST, WHICH TAKES TWO ACCOUNTS IN ONE SQUAD:
--   1. Leader → the squad → Settings → Training Alerts → Announce Sessions ON.
--   2. The other member → the same screen → "When someone starts" ON.
--   3. Leader starts a workout. The other member’s bell moves.
--   Nothing arrives until all three are set, and that is the feature rather than a fault.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0153: your squad knows when you train
--
-- PO: *"Squad leader should be able to set if they want a notification for when someone in the squad
-- starts working out. And then individually you can set whether or not you want those notifications.
-- Either when that squad member starts or finishes."*
--
-- Every piece of this already existed and none of them were connected. `profiles.training_since` has
-- been written the instant a session begins since 0086 and NOTHING has ever triggered off it — the
-- database has known who was training for thirty migrations and only ever answered the question when a
-- screen asked. `workouts` has never carried a trigger of any kind: the only way a finished session
-- reached a squad-mate was the athlete deliberately sharing it to the feed.
--
-- ── THREE SWITCHES, AND THEY ARE THREE DIFFERENT DECISIONS ───────────────────────────────────────────
--
--   `squads.training_alerts`       the LEADER's, per squad, DEFAULT OFF.
--                                   Whether this squad is the kind that watches each other train. A
--                                   member cannot opt into something the squad does not do.
--
--   `squad_members.notify_start`   the MEMBER's own, per squad, both DEFAULT OFF.
--   `squad_members.notify_finish`  Which half they want, in which squads. Separate columns rather than
--                                   one flag because the PO asked for "either … starts or finishes",
--                                   and they are genuinely different notifications: one is an
--                                   invitation to join, the other is applause.
--
--   `notif_prefs.squad_training`   the athlete's global push switch (P-5), DEFAULT ON.
--                                   ⚠ ON, and deliberately, against the habit of this file. Every other
--                                   ambient squad default is OFF because those events arrive whether or
--                                   not you asked. These cannot: two people have to say yes before one
--                                   is ever generated. A global default of OFF would mean a member
--                                   turning on start alerts in squad settings and receiving nothing,
--                                   with the reason on a different screen — the silent dead end this
--                                   schema exists to avoid.
--
-- Every one of the three defaults to producing nothing, so this migration is a no-op for every squad
-- and every athlete already in the database until somebody turns it on.
--
-- ── AND THE FOURTH GATE IS NOT A SWITCH ──────────────────────────────────────────────────────────────
--
-- `vis_clears(profiles.visibility->>'training', 'squad')` — the athlete's OWN audience for their
-- training presence, the same predicate `training_now()` has used since 0086. Somebody who set that to
-- private is invisible on the Live Now row today; a squad-mate's push must not become the back door
-- around it. The person being announced never opted in to being announced, so the only setting that can
-- speak for them is their own.
--
-- ── WHY THE UNION IS REBUILT IN PLACE ────────────────────────────────────────────────────────────────
--
-- `create or replace`, not drop-and-create: the OUT columns are unchanged (`squad_id` and `actor_id`
-- carry both new branches), so 42P13 does not apply and the PUBLIC revoke 0135 had to re-issue survives
-- untouched. The fourteen existing branches and the sender's CASE arms were TRANSFORMED from 0135's own
-- text by a script, not retyped — 0088, 0092, 0106 and 0122 each rebuilt this union from a partial read
-- and silently deleted a shipped feature.
--
-- Depends on 0029 (squads, squad_members), 0069 (vis_clears), 0086 (training presence), 0120 (push),
-- 0135 (branches 1-14). Idempotent. RUN AFTER 0135.
--
-- ⚠ VERIFY BY TRAINING, not by reading. Two accounts in one squad; leader turns Training Alerts on;
-- the other turns "When someone starts" on; then start a workout on the first and watch the second's
-- bell. Nothing arrives until all three switches are set, which is the feature and also the thing
-- easiest to mistake for a broken build.

begin;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1 · THE SWITCHES
-- ══════════════════════════════════════════════════════════════════════════════

-- The leader's, per squad.
alter table public.squads
  add column if not exists training_alerts boolean not null default false;

-- The member's own, per squad. `squad_members` has had exactly four columns since 0029 and has never
-- been extended; these are the first, and they are per-MEMBERSHIP rather than per-profile on purpose —
-- "tell me when my lifting squad trains, not my running one" is the answer people actually want, and a
-- single profile-level flag cannot express it.
alter table public.squad_members
  add column if not exists notify_start  boolean not null default false,
  add column if not exists notify_finish boolean not null default false;

comment on column public.squads.training_alerts is
  'Whether this squad announces its members starting and finishing sessions (0153). The leader''s switch, and the outer gate: a member''s own notify_start/notify_finish do nothing while this is false. Default false, so every squad that existed before 0153 is silent until its leader says otherwise.';

comment on column public.squad_members.notify_start is
  'This member wants to be told when a squad-mate STARTS training, in THIS squad (0153). Gated by squads.training_alerts above it and by the actor''s own visibility.training below it.';

comment on column public.squad_members.notify_finish is
  'This member wants to be told when a squad-mate FINISHES a session, in THIS squad (0153). Separate from notify_start because they are different notifications: one is joinable, the other is done.';

-- Branch 16 walks every squad-mate's saved workouts inside the last day. 0001's `workouts_athlete_saved
-- (athlete_id, saved_at desc)` already serves it; named here so a future reader knows the branch has an
-- index rather than assuming one.



-- ══════════════════════════════════════════════════════════════════════════════
-- 2 · THE UNION — sixteen branches
-- ══════════════════════════════════════════════════════════════════════════════
--
-- ⚠ REBUILD FROM THIS BODY, NEVER FROM AN OLDER ONE.

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
  -- 6
  select 'challenge_invite'::text, c.created_at, null::uuid, c.creator_id, c.id, null::uuid, null::uuid, null::uuid
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
    ) t;
$$;

-- `create or replace` PRESERVES privileges, so 0120's revoke is still in force and this line is a
-- restatement rather than a repair. It is here because the next person to touch this function may well
-- have to drop it (a new OUT column forces that), and the revoke has to be one edit away from them.
revoke execute on function public.notification_events_for(uuid) from public;

comment on function public.notification_events_for(uuid) is
  'THE definition of a notification event. SIXTEEN branches: join_request, member_joined, request_approved/declined, friend_request, friend_accepted, challenge_invite, workout_invite, program_shared, workout_join_request, squad_post, squad_checkin, squad_recap, post_comment, post_reaction, squad_training_started, squad_training_finished. squad_post/squad_checkin/squad_recap and both squad_training_* branches are FAN-OUT — one row becomes one event per opted-in member. Everything after branch 9 is windowed: 14 days for the written branches, 4 hours for a start (the presence ceiling) and 24 hours for a finish. Read by notification_events() for the viewer and by push_enqueue_for() for the sender. Rebuild from THIS body, never an older one — 0088, 0092 and 0106 each rebuilt from a predecessor and silently dropped a shipped feature.';


-- ══════════════════════════════════════════════════════════════════════════════
-- 3 · PREFERENCES — one new key, governing both kinds
-- ══════════════════════════════════════════════════════════════════════════════
--
-- One key, not two. The per-squad columns already answer "starts, finishes, or both", and a global pair
-- would be a second place to express the same thing — with the two able to disagree and only the SQL
-- knowing which won.

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
    when 'squad_recap'          then 'squad_feed'
    when 'post_comment'         then 'post_comments'
    when 'post_reaction'        then 'squad_reactions'
    -- 0153. Not 'squad_feed': an athlete who muted a chatty squad's posts has said nothing about
    -- whether they want to know their training partner just started.
    when 'squad_training_started'  then 'squad_training'
    when 'squad_training_finished' then 'squad_training'
    else null
  end;
$$;

-- ⚠ These MUST equal `NOTIF_DEFAULTS` in src/domain/settings/notifications.ts. A test parses this
-- function and asserts the two agree, because a default that differs between client and sender means the
-- screen shows one thing and the server does another, silently.
create or replace function public.push_pref_default(p_key text)
returns boolean
language sql
immutable
as $$
  select case p_key
    when 'squad_activity'    then false
    when 'friend_requests'   then true
    when 'challenge_updates' then false
    when 'workout_tags'      then true
    when 'program_shares'    then true
    when 'squad_feed'        then false
    when 'squad_reactions'   then false
    when 'squad_goals'       then false
    when 'squad_invites'     then true
    when 'post_comments'     then true
    -- 0153. TRUE, and the header explains why this one breaks the ambient-is-off habit: nothing can
    -- reach this key until a leader and a member have each opted in on a different screen. Defaulting
    -- it off would make those two deliberate acts produce silence.
    when 'squad_training'    then true
    else false
  end;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 4 · THE SENDER — 0135's body with four arms added
-- ══════════════════════════════════════════════════════════════════════════════

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


-- ══════════════════════════════════════════════════════════════════════════════
-- 5 · THE TRIGGERS
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Same deliberately-stupid shape as 0122's: each answers only "who might have a new event" and hands
-- off to the union, which is the one place that decides what an event IS.
--
-- ⚠ BOTH SWALLOW THEIR OWN ERRORS, and that is not defensive habit — it is the difference between a
-- notification and a lost workout. These are AFTER triggers inside somebody else's transaction:
-- `push_tg_training_finished` fires inside `save_workout`, the single most load-bearing RPC in the
-- app, and a raise here would roll back the session the athlete just trained. This schema has already
-- lost Finish Workout once to a permission change three functions away, with every other gate green.
-- A push that fails to send is a push that fails to send.

create or replace function public.push_tg_training_started()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  begin
    for r in
      select distinct m.user_id
        from public.squad_members mine
        join public.squads s on s.id = mine.squad_id and s.training_alerts
        join public.squad_members m on m.squad_id = mine.squad_id and m.user_id <> new.id
       where mine.user_id = new.id
         and m.notify_start
    loop
      perform public.push_enqueue_for(r.user_id);
    end loop;
  exception when others then
    null;
  end;
  return null;
end;
$$;

-- `update of training_since` plus a WHEN clause, because `profiles` is written on almost every launch
-- — the timezone, the notifications-seen stamp, the avatar. Without both, every one of those would walk
-- the athlete's squads.
--
-- `is not null` is what makes this a START and not an end: `set_training_status(false, …)` clears the
-- column, and that update lands here too.
drop trigger if exists push_training_started on public.profiles;
create trigger push_training_started
  after update of training_since on public.profiles
  for each row
  when (new.training_since is not null and new.training_since is distinct from old.training_since)
  execute function public.push_tg_training_started();

create or replace function public.push_tg_training_finished()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  begin
    for r in
      select distinct m.user_id
        from public.squad_members mine
        join public.squads s on s.id = mine.squad_id and s.training_alerts
        join public.squad_members m on m.squad_id = mine.squad_id and m.user_id <> new.athlete_id
       where mine.user_id = new.athlete_id
         and m.notify_finish
    loop
      perform public.push_enqueue_for(r.user_id);
    end loop;
  exception when others then
    null;
  end;
  return null;
end;
$$;

-- THE FIRST TRIGGER EVER PUT ON `public.workouts`.
--
-- ⚠ IN PRACTICE ONLY THE INSERT ARM EVER FIRES TODAY, and it is worth saying so rather than implying
-- otherwise. `save_workout` writes `saved_at = now()` and `state = 'saved'` in the SAME insert, so a
-- finished session arrives complete. Nothing in this schema updates `saved_at` afterwards — every other
-- UPDATE on this table sets `distance`, `duration_sec` or the playlist columns, and `continue_workout`
-- (0125) extends `duration_sec` and deliberately leaves the finish timestamp where it was.
--
-- `or update of saved_at` is kept anyway, and narrowly: it costs nothing, and the shape it guards
-- against — a row written first and finished later — is the obvious way somebody would add draft
-- workouts. Without it that change would ship a save path that silently notifies nobody, which is a
-- harder bug to see than a duplicate. The outbox keys on `event_at`, so even then it would announce
-- once per finish rather than once per write.
drop trigger if exists push_workout_saved on public.workouts;
create trigger push_workout_saved
  after insert or update of saved_at on public.workouts
  for each row
  when (new.state = 'saved' and new.saved_at is not null)
  execute function public.push_tg_training_finished();


-- ══════════════════════════════════════════════════════════════════════════════
-- 6 · HOW A MEMBER SETS THEIRS
-- ══════════════════════════════════════════════════════════════════════════════
--
-- ⚠ AN RPC, AND NOT AN UPDATE POLICY. `squad_members` has had SELECT, INSERT and DELETE policies since
-- 0029/0046 and deliberately no UPDATE one — nothing has ever needed to change a membership row in
-- place. The obvious way to add these two toggles is `for update using (user_id = auth.uid())`, and it
-- is wrong in a way that reads as correct: RLS gates WHICH ROWS, never WHICH COLUMNS. That policy would
-- also let any member rewrite their own `role` to 'owner', and rewrite their own `squad_id` to any
-- squad in the database — joining a private squad by updating a row they already legitimately own, past
-- every approval path 0050 and 0053 exist to enforce.
--
-- A SECURITY DEFINER function names the two columns it may write and cannot be persuaded to write a
-- third. Same shape as `set_training_status` (0086) and `mark_honors_celebrated` (0112).
--
-- `coalesce` on each argument so a caller can set one half and leave the other alone; the client sends
-- both today, and that is the client's business rather than the schema's.

create or replace function public.set_squad_notify(p_squad uuid, p_start boolean, p_finish boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_n int;
begin
  if auth.uid() is null or p_squad is null then
    return false;
  end if;

  update public.squad_members
     set notify_start  = coalesce(p_start,  notify_start),
         notify_finish = coalesce(p_finish, notify_finish)
   where squad_id = p_squad
     and user_id  = auth.uid();

  get diagnostics v_n = row_count;
  -- FALSE means "you are not in that squad", which is the only way to match zero rows here. The caller
  -- reports it rather than showing a toggle that moved and saved nothing.
  return v_n > 0;
end;
$$;

-- Explicit, not inherited. 0147 revoked the PUBLIC and anon default privileges on new functions in this
-- schema and left the platform's `authenticated` default in place — so this grant is a restatement
-- today. It is written out anyway because the next person to read this file should not have to
-- reconstruct that chain to know who can call it.
revoke execute on function public.set_squad_notify(uuid, boolean, boolean) from public;
revoke execute on function public.set_squad_notify(uuid, boolean, boolean) from anon;
grant  execute on function public.set_squad_notify(uuid, boolean, boolean) to   authenticated;

comment on function public.set_squad_notify(uuid, boolean, boolean) is
  'Set the caller''s own training-alert toggles for one squad (0153). A definer function rather than an UPDATE policy on squad_members, because RLS gates rows and not columns: the policy form would also let a member rewrite their own role and squad_id.';

commit;
