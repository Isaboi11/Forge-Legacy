-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — PASTE-READY BUNDLE: migrations 0134 + 0135
--
--   1. Supabase Dashboard  →  SQL Editor  →  New query
--   2. Paste this ENTIRE file
--   3. Run
--
-- Nothing in here needs editing, and it is safe to run more than once.
--
-- ⚠ RUN 0126 FIRST. 0135 rebuilds `notification_events_for` from 0126's TWELVE-branch body plus two.
--   Applied out of order it would silently delete `squad_recap`, `squad_post` and `squad_checkin` —
--   the exact fault 0088, 0092 and 0106 each shipped. `ls supabase/migrations | tail` if unsure.
--
-- ⚠ FOURTEEN BRANCHES after this runs. Count them in the union before editing it again.
--
-- WHAT THIS FIXES — both reported by the PO from a live session
--
--   0134 · "I clicked on goal progress, went to the bottom to see recent updates, and clicked on a
--          workout someone logged but it said it couldn't load it."
--
--          The squad goal screen lists the sessions that moved the number and links each one. But
--          `shared_workout_detail`'s gate (0117) only admits a workout somebody POSTED to a feed, and
--          a goal contribution is not a post — so every member except the author got a dead link.
--          The gate now agrees with the listing that offered it.
--
--   0135 · "I got reactions and comments on my last post, but I wasn't notified."
--
--          True on BOTH feeds. The union had twelve branches and not one read `squad_post_comments`
--          or `squad_post_reactions`: the app told your squad when you POSTED and told nobody when
--          they ANSWERED. SOC-D11 has locked "comments generate notifications (to the post author)"
--          since the document locked, and it was never built.
--
-- WHAT AN ATHLETE WILL SEE AFTERWARDS
--   · A comment on your post → inbox row + push. New "Comments on Your Posts" toggle, DEFAULT ON.
--   · A reaction to your post → inbox row. Push only if they switch on "Reactions & Mentions", which
--     P-5 §3.1 locked OFF and 0022 shipped inert — this is the branch it was always waiting for.
--   · A squad-mate's goal contribution → opens the full session, sets and all.
--
-- ⚠ NEEDS NO NEW BUILD. Both are server-side; the client changes ride the next OTA.
--
-- ⚠ HOW TO PROVE IT WORKED (applying only proves the bodies parsed — PL/pgSQL binds at RUN time)
--   1. Have a second account comment on one of your posts. The bell moves.
--   2. Open a squad goal you share and tap a session somebody else logged. Their sets appear.
--
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- MIGRATION 0134
-- ───────────────────────────────────────────────────────────────────────────────────────────────

-- Forge Legacy — 0134: a workout that moved the squad's goal opens, for the squad that shares it
--
-- ══ WHAT WAS BROKEN ══════════════════════════════════════════════════════════════════════════════
--
-- Reported by the PO: *"I clicked on goal progress, went to the bottom to see recent updates, and
-- clicked on a workout someone logged but it said it couldn't load it."*
--
-- This is 0117's bug, one door over. 0117 fixed the dead link on a FEED CARD by adding
-- `shared_workout_detail`, whose gate is "a `squad_posts` row exists carrying this workout on an
-- audience you are in." The squad goal screen (0107) lists the sessions that moved the number —
-- `squad_goal_detail`'s `events` array, naming the member and the session — and links each one to
-- `/activity/[id]`. But a goal contribution is NOT a post. Nobody shared it; it was counted. So the
-- gate refused it, the owner read (`athlete_id = auth.uid()`) refused it, and every member except the
-- author tapped a row that said "Couldn't load this session."
--
-- ⚠ THE LISTING AND THE GATE HAD DIFFERENT ANSWERS, which is the actual defect. A screen that shows
-- you a row and names the session has already made the visibility decision; a gate that then refuses
-- it turns that decision into a broken link. This migration makes the gate agree with the listing.
--
-- ══ WHY THIS IS PERMITTED, AND WHERE IT STOPS ════════════════════════════════════════════════════
--
-- `Squad-System-Architecture-v1.0` SQ-D2 lifts the Performance Firewall for **Squad-internal surfaces
-- only** — the squad's own pages, for the squad's own members, on the strength of SQ-D16 request-only
-- joining. The goal screen is exactly such a surface, and it already renders each contributor by name
-- beside what they logged. Opening the session shows the sets behind a number the screen already gave
-- you. Nothing here touches the Friends Feed, Communities or the Calendar, whose Firewall SQ-D2
-- explicitly preserves.
--
-- ⚠ MEMBERSHIP, NOT VISIBILITY OF THE GOAL SCREEN. `squad_goal_detail` answers for a non-member when
-- the squad's `privacy = 'public'` — so mirroring its predicate exactly would let a stranger browsing
-- a public squad open a member's every logged set. SQ-D2 says *internal*. This gate therefore requires
-- `is_squad_member`, which is narrower than the listing on purpose.
--   (Recorded, not fixed here: the public-squad `events` list still shows non-members the workout
--   NAMES and durations of that squad's members. That is 0107's question to answer, not 0134's.)
--
-- ⚠ AND THE SQUAD MUST ACTUALLY HAVE A GOAL. `goal_started_at` is null for a squad that never set one,
-- and `coalesce(..., '-infinity')` would then admit every workout its members have EVER saved. The
-- screen renders "No goal yet" in that state and lists nothing, so requiring `s.goal is not null`
-- costs nothing and closes a hole that would otherwise be wide open on every goal-less squad.
--
-- ══ WHAT CHANGED IN THE FUNCTION ═════════════════════════════════════════════════════════════════
--
-- The gate, and nothing else. Everything from `select w.id, w.athlete_id, ...` down is 0117's body
-- verbatim — including the four fields a viewer deliberately does NOT get (ordinal, chapter, partners,
-- and the program's id). This file was assembled by splicing 0117's own text rather than retyping it,
-- because 0088, 0092, 0106 and 0122 each rebuilt a function from a partial read and silently dropped a
-- shipped feature.
--
-- Depends on 0103 (squad_goal_window_end), 0107 (squad_goal_detail), 0117 (this function).
-- Idempotent. RUN AFTER 0117.
--
-- ⚠ PL/pgSQL binds column references at RUN time. Applying this proves the body parsed. The proof is
-- opening the goal screen of a squad you are in and tapping a session somebody else logged.

create or replace function public.shared_workout_detail(p_workout_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_w   record;
begin
  if v_uid is null or p_workout_id is null then
    return null;
  end if;

  -- THE GATE — TWO DOORS, EITHER OF WHICH OPENS IT.
  --
  -- 1 (0117) a post carries this workout to an audience this athlete is in. Entitlement is the POST:
  --   unfriend, leave the squad or delete the post and the session stops resolving.
  -- 2 (0134) the session counted toward a goal of a squad this athlete is a MEMBER of. Entitlement is
  --   the shared goal: leave the squad, or let the goal's window close behind the session, and it
  --   stops resolving the same way.
  if not exists (
    select 1
      from public.squad_posts p
     where p.workout_id = p_workout_id
       and (
            p.author_id = v_uid
         or (p.audience in ('FRIENDS', 'BOTH') and public.are_friends(p.author_id, v_uid))
         or (p.audience in ('SQUAD',   'BOTH') and p.squad_id is not null
             and public.is_squad_member(p.squad_id, v_uid))
       )
  ) and not exists (
    -- The same window `squad_goal_detail` uses to LIST the contribution, so the gate cannot refuse a
    -- row the screen just offered. `is_squad_member` is the one deliberate narrowing — see the header.
    select 1
      from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
      join public.squads s on s.id = sm.squad_id
     where w.id = p_workout_id
       and s.goal is not null
       and public.is_squad_member(s.id, v_uid)
       and w.saved_at >= coalesce(s.goal_started_at, '-infinity'::timestamptz)
       and w.saved_at < public.squad_goal_window_end(s.id)
  ) then
    return null;
  end if;

  select w.id, w.athlete_id, w.workout_name, w.activity_type, w.started_at, w.duration_sec,
         w.distance, w.distance_unit, w.program_id,
         w.playlist_url, w.playlist_service, w.playlist_name
    into v_w
    from public.workouts w
   where w.id = p_workout_id
     and w.state = 'saved';

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_w.id,
    'author_id', v_w.athlete_id,
    'author_name', coalesce((select pr.name from public.profiles pr where pr.id = v_w.athlete_id), 'Athlete'),
    'workout_name', v_w.workout_name,
    'activity_type', v_w.activity_type,
    'started_at', v_w.started_at,
    'duration_sec', v_w.duration_sec,
    'distance', v_w.distance,
    'distance_unit', v_w.distance_unit,
    -- Named, not linked — see the header. `program_id` is deliberately not returned.
    'program_name', (select pg.name from public.programs pg where pg.id = v_w.program_id),
    'playlist_url', v_w.playlist_url,
    'playlist_service', v_w.playlist_service,
    'playlist_name', v_w.playlist_name,
    'exercises', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'name', we.name,
                 'section', we.section,
                 'position', we.position,
                 'catalog_key', we.catalog_key,
                 'sets', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'set_index', ws.set_index,
                              'weight', ws.weight,
                              'weight_unit', ws.weight_unit,
                              'reps', ws.reps
                            ) order by ws.set_index)
                     from public.workout_sets ws
                    where ws.workout_exercise_id = we.id
                 ), '[]'::jsonb)
               ) order by we.position)
        from public.workout_exercises we
       where we.workout_id = v_w.id
    ), '[]'::jsonb),
    -- The records set on the day of this session. Narrowed to this session's exercises by the client,
    -- exactly as the owner's own read does — a record set in a different session that day belongs to
    -- that session, not this one.
    'milestones', coalesce((
      select jsonb_agg(
               case when pr.load_value is not null
                    then pr.load_value::text || ' ' || coalesce(pr.load_unit, 'lb') || ' ' || pr.exercise
                    else pr.exercise end)
        from public.personal_records pr
       where pr.athlete_id = v_w.athlete_id
         and pr.achieved_on = (v_w.started_at at time zone 'UTC')::date
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.shared_workout_detail(uuid) from public;
grant execute on function public.shared_workout_detail(uuid) to authenticated;

comment on function public.shared_workout_detail(uuid) is
  'Reads one saved workout for somebody who is not its author. TWO entitlements, either sufficient: a squad_posts row carrying it to an audience the caller is in (0117), or a goal contribution in a squad the caller is a MEMBER of, inside that goal''s window (0134). Never grants ordinal, chapter, partners or the program id. Rebuild from THIS body, never 0117''s.';
-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- MIGRATION 0135
-- ───────────────────────────────────────────────────────────────────────────────────────────────

-- Forge Legacy — 0135: somebody answered you, and now you find out
--
-- ══ WHAT WAS BROKEN ══════════════════════════════════════════════════════════════════════════════
--
-- Reported by the PO: "I got reactions and comments on my last post, but I wasn't notified."
--
-- He is right, and it was true on BOTH feeds. `notification_events_for` had twelve branches and not one
-- of them read `squad_post_comments` or `squad_post_reactions`. The app told your squad when you POSTED
-- (0122) and told nobody when they ANSWERED — the half of a conversation that makes it one.
--
-- `Social-System-Architecture-v1.0` SOC-D11 has locked "Comments generate notifications (to the post
-- author; new P-5 row, §13)" since the document locked. It was never built. Same pattern this project
-- keeps rediscovering: a decision locked and never applied.
--
-- ══ TWO KINDS, TWO DIFFERENT LOCKED DEFAULTS ═════════════════════════════════════════════════════
--
-- `post_comment` — SOC-D11 locks that it notifies. P-5 §3.2's rule is that something aimed AT you
--   defaults ON (a request does; ambient squad activity does not). A comment is written to you, by name,
--   about something you chose to share. New pref key `post_comments`, DEFAULT TRUE.
--
-- `post_reaction` — SOC-D11 locks reaction notifications as optional, mirroring WSR-001's squad-reaction
--   model, DEFAULT OFF. That default is honoured exactly. It rides the EXISTING `squad_reactions`
--   toggle — locked by P-5 §3.1, shipped in 0022, and inert ever since because nothing emitted an event
--   for it. Its own label already reads "When someone reacts to or mentions you", so this is the branch
--   it was always waiting for, not a new promise.
--
-- ⚠ THE DEFAULT-OFF GOVERNS PUSH, NOT THE INBOX. `push_prefs_allows` is read only by
-- `push_enqueue_for`; `notification_feed` never consults it. So a reaction ALWAYS appears in `/inbox`,
-- where the athlete went looking, and reaches a lock screen only if they asked. That is P-5 §4's
-- standing rule — a toggle turned off stops a push leaving the server, it never hides the in-app
-- surface — and it is what lets this satisfy "I should be notified" without overriding a locked default.
--
-- ══ WHO GETS IT, AND WHO DOES NOT ════════════════════════════════════════════════════════════════
--
-- The POST AUTHOR, and nobody else. SOC-D11 says "to the post author" and this builds exactly that:
-- there is deliberately no notification for a comment on a thread you also commented on. That is a
-- second feature (thread participation) with its own volume problem, and inventing it here would be the
-- drift 0120 spent a migration removing.
--
-- Self-actions are excluded in the union's own WHERE, never in a trigger — same rule as 0122.
--
-- ⚠ WINDOWED AT 14 DAYS, like the fan-out branches beside them and for the same reason. Comments and
-- reactions are append-only and unbounded; without the predicate `/inbox` slowly becomes a second copy
-- of the feed and `push_enqueue_for` re-scans an athlete's entire posting history on every trigger.
--
-- ══ A NEW OUT COLUMN, SO THE ROW CAN OPEN THE POST ═══════════════════════════════════════════════
--
-- `post_id` is added to the union. Without it the notification can say somebody commented and cannot
-- take you to the comment, which is the dead-link failure 0117 and 0134 were both about.
--
-- ⚠ THAT FORCES A DROP (42P13 — `create or replace` cannot change a set-returning function's OUT
-- columns), and a DROP RESETS 0120's `revoke from public`. Both functions are therefore re-revoked and
-- re-granted below. 0122's comment warns about exactly this.
--
-- The twelve existing branches were produced by transforming 0126's own text — one `, null::uuid`
-- appended per projection — not retyped. 0088, 0092, 0106 and 0122 each rebuilt this union from a
-- partial read and silently dropped a shipped feature.
--
-- Depends on 0041 (comments/reactions tables), 0074 (audience), 0120 (push), 0126 (branches 1-12).
-- Idempotent. RUN AFTER 0126 and 0134.
--
-- ⚠ Applying this proves the bodies parsed. The proof is a second account commenting on your post and
-- the bell moving.

-- ── The outbox learns the post ───────────────────────────────────────────────
alter table public.push_outbox add column if not exists post_id uuid;

-- ── The union: fourteen branches ─────────────────────────────────────────────
-- ⚠ DROP AND REBUILD, ALWAYS (42P13). Rebuild from THIS body, never from an older one.
drop function if exists public.notification_events();
drop function if exists public.notification_events_for(uuid);

create function public.notification_events_for(p_user uuid)
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
     and r.created_at > now() - interval '14 days';
$$;

-- ⚠ RE-REVOKED, because the DROP above reset it. 0120 revoked this from PUBLIC precisely because it is
-- SECURITY DEFINER over ANY user id — leave this line out and the drop silently re-opens the escalation
-- the revoke exists to close, while every other check still passes. Deliberately NOT granted to
-- `authenticated`: only the two SECURITY DEFINER callers below need it.
revoke execute on function public.notification_events_for(uuid) from public;

comment on function public.notification_events_for(uuid) is
  'THE definition of a notification event. FOURTEEN branches: join_request, member_joined, request_approved/declined, friend_request, friend_accepted, challenge_invite, workout_invite, program_shared, workout_join_request, squad_post, squad_checkin, squad_recap, post_comment, post_reaction. squad_post/squad_checkin/squad_recap are FAN-OUT — one squad row becomes one event per member. post_comment/post_reaction are NOT: each notifies the post author alone (SOC-D11). Everything after branch 9 is windowed at 14 days so the inbox does not become a second feed. Read by notification_events() for the viewer and by push_enqueue_for() for the sender. Rebuild from THIS body, never an older one — 0088, 0092 and 0106 each rebuilt from a predecessor and silently dropped a shipped feature.';

create function public.notification_events()
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid, share_id uuid, post_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select * from public.notification_events_for(auth.uid());
$$;

revoke execute on function public.notification_events() from public;
grant execute on function public.notification_events() to authenticated;

comment on function public.notification_events() is
  'Thin wrapper over notification_events_for(auth.uid()) since 0120. The body lives there — edit it, not this.';


-- ── The feed the inbox reads ─────────────────────────────────────────────────
-- Returns jsonb, so `create or replace` is enough — no OUT columns to collide with. 0110's body with
-- `post_id` and `post_audience` added; every existing join and key is that body's, verbatim.
--
-- `post_audience` is what tells the client which door to open. `squad_id` alone cannot: a BOTH post
-- carries a squad_id AND appears in the Friends feed, so routing on its presence would send a friend to
-- a squad page they may not be in.
create or replace function public.notification_feed(p_limit int default 50)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'kind',             e.kind,
             'at',               e.at,
             'unread',           e.at > coalesce((select notifications_seen_at from public.profiles where id = auth.uid()), '-infinity'::timestamptz),
             'squad_id',         e.squad_id,
             'squad_name',       s.name,
             'squad_crest',      s.crest,
             'squad_photo_url',  s.photo_url,
             'actor_id',         e.actor_id,
             'actor_name',       p.name,
             'actor_avatar_url', p.avatar_url,
             'challenge_id',     e.challenge_id,
             'challenge_name',   ch.name,
             'invite_id',        e.invite_id,
             'invite_name',      wi.workout_name,
             'share_id',         e.share_id,
             'share_name',       sh.name,
             'post_id',          e.post_id,
             'post_audience',    po.audience
           )
           order by e.at desc
         ), '[]'::jsonb)
    from (select * from public.notification_events() order by at desc limit greatest(p_limit, 0)) e
    left join public.squads s on s.id = e.squad_id
    left join public.profiles p on p.id = e.actor_id
    left join public.challenges ch on ch.id = e.challenge_id
    left join public.workout_invites wi on wi.id = e.invite_id
    left join public.program_shares sh on sh.id = e.share_id
    left join public.squad_posts po on po.id = e.post_id;
$$;


-- ── Preferences: one new key, one toggle that finally has an emitter ─────────
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
    -- 0135. `squad_reactions` was locked by P-5 §3.1 in 0022 and has had no emitter for thirteen
    -- migrations; this is the branch it was written for, and its default stays FALSE (SOC-D11).
    when 'post_comment'         then 'post_comments'
    when 'post_reaction'        then 'squad_reactions'
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
    -- 0135. ON, because a comment is aimed at you by name (P-5 §3.2) and SOC-D11 locks that it notifies.
    when 'post_comments'     then true
    else false
  end;
$$;


-- ── The sender: two new arms ─────────────────────────────────────────────────
-- 0122's body with `post_id` carried through and two arms added to each of the three CASEs. The route
-- CASE gains explicit arms because the `else` is `/squad/<id>`, and a comment on a FRIENDS post has no
-- squad — it would have routed to `/squad/` with nothing after it.
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


-- ── Triggers ─────────────────────────────────────────────────────────────────
-- Same shape as 0122's, and as deliberately stupid: each answers only "who might have a new event" and
-- hands off. The author is excluded by the union's own WHERE, never here.
--
-- One recipient, not a loop — the post author. A comment on a post whose author has since been deleted
-- resolves to NULL and `push_enqueue_for` returns 0 on its own null guard.
create or replace function public.push_tg_post_replies()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_author uuid;
begin
  select sp.author_id into v_author from public.squad_posts sp where sp.id = new.post_id;
  perform public.push_enqueue_for(v_author);
  return null;
end;
$$;

drop trigger if exists push_post_comments on public.squad_post_comments;
create trigger push_post_comments
  after insert on public.squad_post_comments
  for each row execute function public.push_tg_post_replies();

-- INSERT only. `set_post_reaction` upserts on (post_id, user_id), so switching respect to honor is an
-- UPDATE — the same person, the same post, already announced once.
drop trigger if exists push_post_reactions on public.squad_post_reactions;
create trigger push_post_reactions
  after insert on public.squad_post_reactions
  for each row execute function public.push_tg_post_replies();

comment on table public.push_outbox is
  'The delivery ledger. `post_id` since 0135 — a comment or reaction notification has to be able to open the post it is about.';


-- ── The sender's payload has to carry the post too ───────────────────────────
-- 0120's body, verbatim, with two keys added to `data`. Without them a TAPPED PUSH and a tapped inbox
-- row would disagree: `destinationFor` reads `postId`/`postAudience`, so a push that omitted them would
-- fall through to the `default` arm and open `/squad/<id>` — or `/inbox` on a friends post.
--
-- `post_audience` is read from `squad_posts` here rather than stored on the outbox. The outbox is a
-- delivery ledger, and audience is a property of the post, not of the delivery; a copy would be one
-- more thing to keep true.
create or replace function public.push_drain(p_limit int default 50)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r          record;
  v_messages jsonb;
  v_req      bigint;
  v_sent     int := 0;
begin
  for r in
    select * from public.push_outbox
     where status = 'PENDING' and attempts < 5
     order by created_at
     limit greatest(p_limit, 0)
  loop
    select jsonb_agg(
             jsonb_build_object(
               'to', t.token,
               'title', r.title,
               'body', r.body,
               'sound', 'default',
               'data', jsonb_build_object(
                 'kind', r.kind,
                 'route', r.route,
                 'outboxId', r.id,
                 'squadId', r.squad_id,
                 'actorId', r.actor_id,
                 'challengeId', r.challenge_id,
                 'inviteId', r.invite_id,
                 'shareId', r.share_id,
                 'postId', r.post_id,
                 'postAudience', (select sp.audience from public.squad_posts sp where sp.id = r.post_id)
               )
             )
           )
      into v_messages
      from public.push_tokens t
     where t.user_id = r.user_id and t.disabled_at is null;

    if v_messages is null then
      update public.push_outbox
         set status = 'FAILED', attempts = attempts + 1, error = 'no active device'
       where id = r.id;
      continue;
    end if;

    select net.http_post(
             url     := 'https://exp.host/--/api/v2/push/send',
             headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
             body    := v_messages
           )
      into v_req;

    update public.push_outbox
       set status = 'SENT', sent_at = now(), attempts = attempts + 1, request_id = v_req
     where id = r.id;

    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;
