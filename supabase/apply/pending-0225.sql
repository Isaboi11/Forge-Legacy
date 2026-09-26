-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0225: blocking someone actually stops them contacting you (Guideline 1.2 · QA R2-F2)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: `create or replace` on unchanged signatures, drop-policy-if-exists + create,
-- cleanup deletes that find nothing the second time, a self-check that RAISES, and a read-only §3.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- QA round 2 blocked sandbox from claudetest. Afterwards, in both directions: the blocked athlete could
-- still send a friend request, see "Training now", open the live workout, Ask to Join and see the JOIN
-- row on Home; the blocker's inbox kept the blocked athlete's reactions and comments, and a request sent
-- during the block survived the unblock. Apple requires a working block (Guideline 1.2).
--
-- ⚠ TEN FUNCTIONS ARE REDEFINED. Each is its LATEST definition copied verbatim, with only lines marked
--   `0225` added (verified by diffing each body against its source: 0 removed lines except the three
--   whose closing `;` moved down one line). Sources: request_friend 0073 · block_athlete, unblock_athlete
--   0171 · notification_events_for 0164 · training_now 0086 · training_partners 0092 ·
--   athlete_training_status 0089 · live_session_of 0181 · workout_invite, pending_join_requests 0121.
--
-- ⚠ IT DELETES ROWS, ONCE: every friendship and every PENDING workout ask between two athletes who are
--   blocked right now (claudetest ↔ sandbox's leftovers from QA, and anything else the old functions let
--   through). That is exactly what `block_athlete` would have removed at the moment of the block.
--
-- ⚠ SAFE IN EITHER ORDER WITH THE APP. No signature, return type or grant changes, so every installed
--   build keeps working. The app change (athlete profile hides Add Friend / Challenge / Train With / Join
--   and "Training now" when a block exists) uses `is_blocked`, which has been live since 0171.
--
-- ⚠ RUN AFTER 0224. Depends only on migrations already applied (0073 … 0181).
--
-- ══ §1 + §2 are the migration below, verbatim (its own `begin … commit`, self-check included).
-- ══ §3 is the read-only row at the very end — the only result the editor will show.
--
-- ══ WHAT THE LAST RESULT SHOULD SAY (prediction) ══
--
--   guarded_readers_expect_8 = 8 · block_unblock_clear_asks_expect_2 = 2 · union_branches_expect_17 = 17 ·
--   invite_policy_restrictive_expect_true = true · notif_events_for_client_callable_expect_false = false ·
--   authed_can_call_all_expect_true = true · anon_can_call_any_expect_false = false ·
--   friendships_between_blocked_expect_0 = 0 · pending_asks_between_blocked_expect_0 = 0 ·
--   blocked_pairs = at least 1 if claudetest still blocks sandbox (informational — any number is fine)
--
--   If the self-check raises, NOTHING is applied (the whole migration is one transaction). Send me the
--   error text.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- Forge Legacy — 0225: a block that actually stops contact (App Store Guideline 1.2 · QA R2-F2)
--
-- ══ WHAT WAS BROKEN ══
--
-- 0171 built the block and enforced it on everything RLS can reach, plus `friends_feed`. It did not reach
-- the SECURITY DEFINER functions that build contact, and RLS does not apply inside those. QA round 2
-- (2026-09-26, social2-01) blocked sandbox from claudetest and found, in BOTH directions:
--
--   · the blocked athlete could still send a friend request, and the blocker's inbox showed it with Accept;
--   · "Training now · View →" on the profile, the live workout with its sets, Ask to Join, and the Home
--     Live Now row with JOIN all still worked;
--   · "Claude posted in QA Squad R2" still arrived for a post the blocked athlete cannot see, and the
--     blocker's inbox kept the blocked athlete's reactions and comments;
--   · a request sent during the block was still waiting after the unblock.
--
-- ══ WHAT THIS DOES ══
--
--   1. `request_friend`          (body from 0073) — blocked either way: writes nothing, returns 'outgoing',
--                                exactly what a fresh send returns. The block is not revealed.
--   2. `block_athlete`           (body from 0171) — also deletes PENDING `workout_invites` between the pair.
--                                (It already deleted the `friendships` row, which includes pending requests.)
--   3. `unblock_athlete`         (body from 0171) — when a block is actually lifted, deletes anything still
--                                PENDING between the pair: it can only have been asked during the block.
--   4. `notification_events_for` (body from 0164) — the seventeen branches verbatim, wrapped in one filter on
--                                `actor_id`. Covers the inbox, the unread count AND the push sender.
--   5. `training_now`            (body from 0086) — the Home Live Now row and the Join screen's roster.
--   6. `training_partners`       (body from 0092) — the Train With picker.
--   7. `athlete_training_status` (body from 0089) — "Training now · View →" on a profile. Null when blocked.
--   8. `live_session_of`         (body from 0181) — the live workout view. Null when blocked.
--   9. `workout_invite`          (body from 0121) — a PENDING ask is invisible to its recipient when blocked.
--  10. `pending_join_requests`   (body from 0121) — the host's in-workout banner.
--  11. a RESTRICTIVE select policy on `workout_invites` — the same rule as 9 for direct table reads.
--  12. a one-time cleanup: every friendship and every PENDING workout ask between a pair that is blocked
--      right now (the QA leftovers, and anything the old functions let through).
--
-- ⚠ EVERY FUNCTION ABOVE IS ITS LATEST DEFINITION, COPIED VERBATIM FROM THE FILE NAMED, WITH ONLY THE LINES
--   MARKED `0225` ADDED. Grepped across all migrations first; none has a later redefinition. `create or
--   replace` with an unchanged signature and return type preserves every grant and revoke, including
--   0147 §3's revoke of `notification_events_for` from `authenticated` (restated below anyway).
--
-- ⚠ "JOIN REFUSES SILENTLY" IS DONE BY HIDING, NOT BY RAISING. The ask still inserts (so the asker's app
--   behaves exactly as for a host who never answers), but the host never sees it — not in the banner, the
--   inbox, a push, `workout_invite()` or a direct read — and unblocking deletes it. A raise would be a
--   visible error that tells the blocked athlete something is different about this one person.
--
-- ⚠ WHAT IS DELIBERATELY NOT CHANGED:
--   · squad membership and squad join requests — PO decision 2026-08-19 (0171 header): blocked athletes who
--     share a squad both stay in it. Their squad join request is hidden from the owner's INBOX by (4), not
--     from the squad's request queue.
--   · `set_training_status`'s `teammates` count (0217) may count a blocked squad-mate who will not in fact be
--     told. It is a number Holt reads to the athlete about their own announcement; nothing reaches the
--     blocked person. Not worth a drop-and-recreate of that function.
--   · challenge standings — 0171's recorded decision.
--
-- Depends on 0073, 0086, 0089, 0092, 0121, 0164, 0171, 0181 (all applied). Idempotent: `create or replace`,
-- drop-policy-if-exists + create, and deletes that find nothing on a second run. RUN AFTER 0224.

begin;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1 · FRIEND REQUESTS — the blocked pair cannot create one
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.request_friend(p_athlete uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  f     public.friendships%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_athlete is null or p_athlete = v_uid then
    raise exception 'you cannot add yourself';
  end if;
  if not exists (select 1 from public.profiles where id = p_athlete) then
    raise exception 'athlete not found';
  end if;

  -- 0225. A block in EITHER direction: write nothing, and answer exactly what a fresh send answers, so the
  -- block is not revealed. To the sender this reads like a request that was later declined (0073 deletes
  -- a declined row, so the button quietly returns to Add Friend) — which is already a normal outcome.
  if public.is_blocked(v_uid, p_athlete) then
    return 'outgoing';
  end if;

  select * into f from public.friendships
   where low_id = least(v_uid, p_athlete) and high_id = greatest(v_uid, p_athlete);

  if found then
    if f.status = 'ACCEPTED' then
      return 'friends';
    end if;
    -- They already asked you, and now you have asked them: that is mutual consent. Accept it rather than
    -- leaving two people each waiting on the other.
    if f.requested_by <> v_uid then
      update public.friendships
         set status = 'ACCEPTED', accepted_at = now()
       where low_id = f.low_id and high_id = f.high_id;
      return 'friends';
    end if;
    return 'outgoing';
  end if;

  insert into public.friendships (low_id, high_id, requested_by, status)
  values (least(v_uid, p_athlete), greatest(v_uid, p_athlete), v_uid, 'PENDING');
  return 'outgoing';
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2 · BLOCK / UNBLOCK — clear what is pending between the pair
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.block_athlete(p_athlete uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'block_athlete: no authenticated athlete' using errcode = '28000';
  end if;
  if p_athlete is null or p_athlete = v_uid then
    raise exception 'block_athlete: cannot block yourself' using errcode = '22023';
  end if;

  insert into public.athlete_blocks (blocker_id, blocked_id)
       values (v_uid, p_athlete)
  on conflict do nothing;

  /*
   * ⚠ `friendships` IS KEYED ON CANONICAL ORDERING, NOT ON WHO ASKED. Its own comment states the rule —
   * *"one row can only ever describe one pair, in one direction"* — so the pair is `(low_id, high_id)` with
   * `requested_by` carrying the direction separately. Matching on requester/addressee raises 42703, and a
   * two-branch OR on the pair is not needed: `least`/`greatest` name the row exactly once.
   */
  delete from public.friendships
   where low_id  = least(v_uid, p_athlete)
     and high_id = greatest(v_uid, p_athlete);

  -- 0225. Pending Train Together rows between the pair, in both directions and of both kinds (INVITE and
  -- JOIN_REQUEST). Accepted rows are training history and partner credit, and stay.
  delete from public.workout_invites
   where status = 'PENDING'
     and ((from_id = v_uid and to_id = p_athlete) or (from_id = p_athlete and to_id = v_uid));
end;
$$;

create or replace function public.unblock_athlete(p_athlete uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  n     int;   -- 0225
begin
  if v_uid is null then
    raise exception 'unblock_athlete: no authenticated athlete' using errcode = '28000';
  end if;
  delete from public.athlete_blocks where blocker_id = v_uid and blocked_id = p_athlete;

  -- 0225. Anything still PENDING between the pair was asked while the block stood (the block itself cleared
  -- everything pending), so it must not survive the unblock and surface as if it had just been sent. Only
  -- when a block was actually lifted — an unblock of somebody never blocked must not erase a real request.
  get diagnostics n = row_count;
  if n > 0 then
    delete from public.friendships
     where low_id  = least(v_uid, p_athlete)
       and high_id = greatest(v_uid, p_athlete)
       and status  = 'PENDING';
    delete from public.workout_invites
     where status = 'PENDING'
       and ((from_id = v_uid and to_id = p_athlete) or (from_id = p_athlete and to_id = v_uid));
  end if;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3 · THE INBOX AND THE PUSH SENDER
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.notification_events_for(p_user uuid)
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid, share_id uuid, post_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  -- 0225. THE SEVENTEEN BRANCHES BELOW ARE 0164'S, VERBATIM. They are wrapped rather than edited one by one:
  -- a filter on the shared `actor_id` covers every branch at once, including any branch added later
  -- inside the wrapper. Rows with no actor (squad_recap, request_approved/declined) are the squad's or
  -- your own and stay. This also filters the push sender, which reads this same union.
  select e.kind, e.at, e.squad_id, e.actor_id, e.challenge_id, e.invite_id, e.share_id, e.post_id
    from (
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
     and cp.joined_at > now() - interval '14 days'
    ) as e (kind, at, squad_id, actor_id, challenge_id, invite_id, share_id, post_id)
   where e.actor_id is null
      or not public.is_blocked(p_user, e.actor_id);   -- 0225
$$;

-- Restated, never granted: SECURITY DEFINER over ANY user id (0120, 0147 §3).
revoke execute on function public.notification_events_for(uuid) from public, anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4 · PRESENCE, LIVE SESSIONS, TRAIN TOGETHER
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.training_now()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cut timestamptz;
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;

  v_cut := now() - interval '4 hours';

  return coalesce((
    select jsonb_agg(t.obj order by
             -- Squad first: the people you actually train alongside outrank a friend you have never
             -- lifted with. Then whoever started most recently, so the row keeps moving.
             case when t.source = 'squad' then 0 else 1 end,
             t.training_since desc)
      from (
        select distinct on (p.id)
               p.id,
               p.training_since,
               case when sm.squad_id is not null then 'squad' else 'friend' end as source,
               jsonb_build_object(
                 'user_id', p.id,
                 'name', coalesce(p.name, 'Athlete'),
                 'avatar_url', p.avatar_url,
                 'label', p.training_label,
                 'started_at', p.training_since,
                 'source', case when sm.squad_id is not null then 'squad' else 'friend' end,
                 'squad_name', s.name
               ) as obj
          from public.profiles p

          -- A squad we share. `distinct on` keeps one row per athlete when we share several.
          left join lateral (
            select a.squad_id
              from public.squad_members a
              join public.squad_members b on b.squad_id = a.squad_id
             where a.user_id = p.id and b.user_id = v_uid
             limit 1
          ) sm on true
          left join public.squads s on s.id = sm.squad_id

         where p.id <> v_uid
           and p.training_since is not null
           and p.training_since > v_cut
           and not public.is_blocked(v_uid, p.id)   -- 0225
           and (
             sm.squad_id is not null
             or exists (
               select 1 from public.friendships f
                where f.status = 'ACCEPTED'
                  and ((f.low_id = v_uid and f.high_id = p.id) or (f.low_id = p.id and f.high_id = v_uid))
             )
           )
           -- Their audience, not ours. `private` is the off switch.
           and public.vis_clears(
                 coalesce(p.visibility->>'training', 'squads'),
                 case when sm.squad_id is not null then 'squad' else 'friend' end
               )
         order by p.id, p.training_since desc
      ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.training_partners()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(t.obj order by t.is_squad desc, t.name), '[]'::jsonb)
    from (
      select distinct on (p.id)
             p.id,
             coalesce(p.name, 'Athlete') as name,
             (sm.squad_id is not null) as is_squad,
             jsonb_build_object(
               'id', p.id,
               'name', coalesce(p.name, 'Athlete'),
               'handle', p.handle,
               'avatar_url', p.avatar_url,
               'squad_name', s.name
             ) as obj
        from public.profiles p
        left join lateral (
          select a.squad_id
            from public.squad_members a
            join public.squad_members b on b.squad_id = a.squad_id
           where a.user_id = p.id and b.user_id = auth.uid()
           limit 1
        ) sm on true
        left join public.squads s on s.id = sm.squad_id
       where p.id <> auth.uid()
         and not public.is_blocked(auth.uid(), p.id)   -- 0225
         and (
           sm.squad_id is not null
           or exists (
             select 1 from public.friendships f
              where f.status = 'ACCEPTED'
                and ((f.low_id = auth.uid() and f.high_id = p.id) or (f.low_id = p.id and f.high_id = auth.uid()))
           )
         )
       order by p.id, sm.squad_id nulls last
    ) t;
$$;

create or replace function public.athlete_training_status(p_athlete uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  p       public.profiles%rowtype;
  v_clear text;
begin
  if v_uid is null then
    return null;
  end if;

  select * into p from public.profiles where id = p_athlete;
  if not found then
    return null;
  end if;

  -- 0225. Blocked either way: null, the same "not yours to read" a private athlete returns.
  if p.id <> v_uid and public.is_blocked(v_uid, p.id) then
    return null;
  end if;

  -- Same ladder every other section uses (0069), with `friend` now reachable (0073).
  v_clear := case
    when p.id = v_uid then 'owner'
    when exists (
      select 1 from public.friendships f
       where f.status = 'ACCEPTED'
         and ((f.low_id = v_uid and f.high_id = p.id) or (f.low_id = p.id and f.high_id = v_uid))
    ) then 'friend'
    when exists (
      select 1
        from public.squad_members a
        join public.squad_members b on b.squad_id = a.squad_id
       where a.user_id = v_uid and b.user_id = p_athlete
    ) then 'squad'
    else 'stranger'
  end;

  -- Not cleared: the status never leaves the server. Null is "not yours to read", which the client
  -- renders identically to "not training" — a viewer cannot tell a private athlete from a resting one,
  -- and that is the point.
  if not public.vis_clears(coalesce(p.visibility->>'training', 'squads'), v_clear) then
    return null;
  end if;

  if p.training_since is null or p.training_since <= now() - interval '4 hours' then
    return jsonb_build_object('training', false);
  end if;

  return jsonb_build_object(
    'training', true,
    'label', p.training_label,
    'started_at', p.training_since
  );
end;
$$;

create or replace function public.live_session_of(p_athlete uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  p        public.profiles%rowtype;
  v_clear  text;
  v_cut    timestamptz := now() - interval '4 hours';
  v_base   jsonb;
  ls       public.live_sessions%rowtype;
begin
  if v_uid is null then
    return null;
  end if;

  select * into p from public.profiles pr where pr.id = p_athlete;
  if not found then
    return null;
  end if;

  -- 0225. Blocked either way: null, the same answer as a private athlete.
  if p.id <> v_uid and public.is_blocked(v_uid, p.id) then
    return null;
  end if;

  v_clear := case
    when p.id = v_uid then 'owner'
    when exists (
      select 1 from public.friendships f
       where f.status = 'ACCEPTED'
         and ((f.low_id = v_uid and f.high_id = p.id) or (f.low_id = p.id and f.high_id = v_uid))
    ) then 'friend'
    when exists (
      select 1
        from public.squad_members a
        join public.squad_members b on b.squad_id = a.squad_id
       where a.user_id = v_uid and b.user_id = p_athlete
    ) then 'squad'
    else 'stranger'
  end;

  -- Gate 1: may they know the athlete is training at all? (0086/0089's rule, unchanged.)
  if not public.vis_clears(coalesce(p.visibility->>'training', 'squads'), v_clear) then
    return null;
  end if;

  v_base := jsonb_build_object(
    'name', coalesce(p.name, 'Athlete'),
    'avatar_url', p.avatar_url
  );

  if p.training_since is null or p.training_since <= v_cut then
    return v_base || jsonb_build_object('training', false);
  end if;

  v_base := v_base || jsonb_build_object(
    'training', true,
    'label', p.training_label,
    'started_at', p.training_since
  );

  -- Gate 2: may they see what the session IS? Default private — an opt-in, never an inheritance.
  if not public.vis_clears(coalesce(p.visibility->>'live_session', 'private'), v_clear) then
    return v_base || jsonb_build_object('sharing', false);
  end if;

  select * into ls
    from public.live_sessions l
   where l.athlete_id = p_athlete
     and l.updated_at > v_cut;
  if not found then
    return v_base || jsonb_build_object('sharing', true, 'payload', null);
  end if;

  return v_base || jsonb_build_object(
    'sharing', true,
    'payload', ls.payload,
    'updated_at', ls.updated_at
  );
end;
$$;

create or replace function public.workout_invite(p_invite uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
           'id', i.id,
           'kind', i.kind,
           'from_id', i.from_id,
           'from_name', coalesce(p.name, 'Athlete'),
           'from_avatar_url', p.avatar_url,
           'to_id', i.to_id,
           'to_name', coalesce(h.name, 'Athlete'),
           'to_avatar_url', h.avatar_url,
           'workout_name', i.workout_name,
           'template_id', i.template_id,
           'exercises', i.exercises,
           'start_index', i.start_index,
           'template_summary', case
             when jsonb_array_length(i.exercises) > 0 then jsonb_build_object(
               'lifts', jsonb_array_length(i.exercises),
               'sets', (select coalesce(sum((e->>'sets')::int), 0) from jsonb_array_elements(i.exercises) e)
             )
             else null
           end,
           'note', i.note,
           'status', i.status,
           'created_at', i.created_at,
           'accepted_at', i.accepted_at
         )
    from public.workout_invites i
    join public.profiles p on p.id = i.from_id
    join public.profiles h on h.id = i.to_id
   where i.id = p_invite
     and (i.to_id = auth.uid() or i.from_id = auth.uid())
     -- 0225. A PENDING ask between a blocked pair is invisible to its recipient. The sender still reads
     -- their own row, so to them it is simply an ask that has not been answered.
     and (i.from_id = auth.uid() or i.status <> 'PENDING' or not public.is_blocked(i.from_id, i.to_id));
$$;

create or replace function public.pending_join_requests()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', i.id,
      'from_id', i.from_id,
      'from_name', coalesce(p.name, 'Athlete'),
      'from_avatar_url', p.avatar_url,
      'note', i.note,
      'created_at', i.created_at
    ) order by i.created_at),
    '[]'::jsonb
  )
    from public.workout_invites i
    join public.profiles p on p.id = i.from_id
   where i.to_id = auth.uid()
     and i.kind = 'JOIN_REQUEST'
     and i.status = 'PENDING'
     and not public.is_blocked(i.from_id, i.to_id);   -- 0225
$$;

-- The same rule as `workout_invite()` for anything that reads the table directly. RESTRICTIVE, so it is
-- ANDed with 0092's `workout_invites_select` and can only narrow it (0171's technique). The sender always
-- reads their own row; accepted rows are history and stay readable.
drop policy if exists workout_invites_not_blocked on public.workout_invites;
create policy workout_invites_not_blocked on public.workout_invites
  as restrictive for select
  using (from_id = auth.uid() or status <> 'PENDING' or not public.is_blocked(from_id, to_id));

-- ══════════════════════════════════════════════════════════════════════════════
-- 5 · ONE-TIME CLEANUP — pairs that are blocked right now
-- ══════════════════════════════════════════════════════════════════════════════
--
-- What `block_athlete` would have removed had these rows existed when the block was made: every friendship
-- row (a request sent during a block could even have been ACCEPTED), and every PENDING workout ask.

do $$
declare
  v_friend int;
  v_asks   int;
begin
  delete from public.friendships f
   where public.is_blocked(f.low_id, f.high_id);
  get diagnostics v_friend = row_count;

  delete from public.workout_invites i
   where i.status = 'PENDING'
     and public.is_blocked(i.from_id, i.to_id);
  get diagnostics v_asks = row_count;

  raise notice '0225 cleanup: % friendship row(s) and % pending workout ask(s) between blocked pairs removed.', v_friend, v_asks;
end $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6 · SELF-CHECK — BY SOURCE, NEVER BY CALLING (the editor is `postgres`; auth.uid() is null)
-- ══════════════════════════════════════════════════════════════════════════════

do $$
declare
  f      text;
  v_def  text;
  guarded text[] := array[
    'public.request_friend(uuid)',
    'public.notification_events_for(uuid)',
    'public.training_now()',
    'public.training_partners()',
    'public.athlete_training_status(uuid)',
    'public.live_session_of(uuid)',
    'public.workout_invite(uuid)',
    'public.pending_join_requests()'
  ];
  client_called text[] := array[
    'public.request_friend(uuid)',
    'public.block_athlete(uuid)',
    'public.unblock_athlete(uuid)',
    'public.training_now()',
    'public.training_partners()',
    'public.athlete_training_status(uuid)',
    'public.live_session_of(uuid)',
    'public.workout_invite(uuid)',
    'public.pending_join_requests()'
  ];
begin
  if to_regprocedure('public.is_blocked(uuid, uuid)') is null then
    raise exception '0225: is_blocked(uuid, uuid) is missing — 0171 is not applied';
  end if;

  foreach f in array guarded loop
    v_def := pg_get_functiondef(f::regprocedure);
    if v_def !~ 'public\.is_blocked\(' then
      raise exception '0225: % has no is_blocked guard', f;
    end if;
    if v_def !~ 'SECURITY DEFINER' then
      raise exception '0225: % is no longer SECURITY DEFINER', f;
    end if;
  end loop;

  foreach f in array array['public.block_athlete(uuid)', 'public.unblock_athlete(uuid)'] loop
    v_def := pg_get_functiondef(f::regprocedure);
    if v_def !~ 'delete from public\.workout_invites' then
      raise exception '0225: % does not clear pending workout asks', f;
    end if;
  end loop;
  if pg_get_functiondef('public.block_athlete(uuid)'::regprocedure) !~ 'delete from public\.friendships' then
    raise exception '0225: block_athlete lost 0171''s friendship delete';
  end if;
  if pg_get_functiondef('public.unblock_athlete(uuid)'::regprocedure) !~ 'delete from public\.athlete_blocks' then
    raise exception '0225: unblock_athlete no longer lifts the block';
  end if;

  -- The union must still be 0164's: seventeen branches, branch 17 present, 0163's widened gate present.
  v_def := pg_get_functiondef('public.notification_events_for(uuid)'::regprocedure);
  if (length(v_def) - length(replace(v_def, 'union all', ''))) / 9 <> 16 then
    raise exception '0225: notification_events_for no longer has seventeen branches';
  end if;
  if v_def !~ 'challenge_joined' or v_def !~ 'ENROLLMENT'', ''ACTIVE' then
    raise exception '0225: notification_events_for was not rebuilt from 0164''s body';
  end if;

  -- request_friend must answer a blocked send the way it answers a fresh one.
  if pg_get_functiondef('public.request_friend(uuid)'::regprocedure) !~ 'is_blocked\(v_uid, p_athlete\) then\s+return ''outgoing''' then
    raise exception '0225: request_friend does not return ''outgoing'' on a blocked send';
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'workout_invites'
       and policyname = 'workout_invites_not_blocked' and permissive = 'RESTRICTIVE'
  ) then
    raise exception '0225: workout_invites_not_blocked is missing or not RESTRICTIVE — a PERMISSIVE one would WIDEN reads';
  end if;

  foreach f in array client_called loop
    if not has_function_privilege('authenticated', f, 'execute') then
      raise exception '0225: authenticated lost EXECUTE on % — the app would break', f;
    end if;
  end loop;
  if has_function_privilege('authenticated', 'public.notification_events_for(uuid)', 'execute')
     or has_function_privilege('anon', 'public.notification_events_for(uuid)', 'execute') then
    raise exception '0225: notification_events_for is callable by a client role — any athlete''s notifications by id';
  end if;

  raise notice '0225 OK: 8 guarded readers, block/unblock clear pending asks, 17-branch union intact, restrictive invite policy, grants intact.';
end $$;

commit;

-- ══ VERIFY BY HAND (optional — needs two real athlete ids, one blocking the other) ═══════════════════
--   begin;
--   select set_config('request.jwt.claims', json_build_object('sub','<blocked>','role','authenticated')::text, true);
--   set local role authenticated;
--   select public.request_friend('<blocker>');          -- 'outgoing'
--   select public.athlete_training_status('<blocker>'); -- null
--   select public.live_session_of('<blocker>');         -- null
--   rollback;   -- ⚠ rollback, so the test request is not kept



-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- §3 READ-ONLY — what the paste changed. One row, every answer (the editor shows only the last result).
-- The self-check above RAISES on anything wrong, so reaching this output already means it held.
-- Verified by SOURCE (pg_get_functiondef), never by calling: the editor is `postgres`, auth.uid() is null.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

select
  (select count(*) from unnest(array[
      'public.request_friend(uuid)', 'public.notification_events_for(uuid)', 'public.training_now()',
      'public.training_partners()', 'public.athlete_training_status(uuid)', 'public.live_session_of(uuid)',
      'public.workout_invite(uuid)', 'public.pending_join_requests()']) f
    where pg_get_functiondef(f::regprocedure) ~ 'public\.is_blocked\(')                    as guarded_readers_expect_8,
  (select count(*) from unnest(array['public.block_athlete(uuid)', 'public.unblock_athlete(uuid)']) f
    where pg_get_functiondef(f::regprocedure) ~ 'delete from public\.workout_invites')     as block_unblock_clear_asks_expect_2,
  (select (length(d) - length(replace(d, 'union all', ''))) / 9 + 1
     from pg_get_functiondef('public.notification_events_for(uuid)'::regprocedure) d)     as union_branches_expect_17,
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_invites'
           and policyname = 'workout_invites_not_blocked' and permissive = 'RESTRICTIVE')  as invite_policy_restrictive_expect_true,
  (has_function_privilege('authenticated', 'public.notification_events_for(uuid)', 'execute')
     or has_function_privilege('anon', 'public.notification_events_for(uuid)', 'execute')) as notif_events_for_client_callable_expect_false,
  (select bool_and(has_function_privilege('authenticated', f, 'execute')) from unnest(array[
      'public.request_friend(uuid)', 'public.block_athlete(uuid)', 'public.unblock_athlete(uuid)',
      'public.training_now()', 'public.training_partners()', 'public.athlete_training_status(uuid)',
      'public.live_session_of(uuid)', 'public.workout_invite(uuid)', 'public.pending_join_requests()']) f)
                                                                                           as authed_can_call_all_expect_true,
  (select bool_or(has_function_privilege('anon', f, 'execute')) from unnest(array[
      'public.request_friend(uuid)', 'public.block_athlete(uuid)', 'public.unblock_athlete(uuid)',
      'public.training_now()', 'public.training_partners()', 'public.athlete_training_status(uuid)',
      'public.live_session_of(uuid)', 'public.workout_invite(uuid)', 'public.pending_join_requests()']) f)
                                                                                           as anon_can_call_any_expect_false,
  (select count(*) from public.friendships fr where public.is_blocked(fr.low_id, fr.high_id))
                                                                                           as friendships_between_blocked_expect_0,
  (select count(*) from public.workout_invites wi
    where wi.status = 'PENDING' and public.is_blocked(wi.from_id, wi.to_id))              as pending_asks_between_blocked_expect_0,
  (select count(*) from public.athlete_blocks)                                             as blocked_pairs;
