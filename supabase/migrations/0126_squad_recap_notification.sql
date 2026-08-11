-- Forge Legacy — 0126: the weekly review finally notifies the squad
--
-- ══ WHAT THIS CLOSES ══
--
-- PO review: *"There should be a notification when a squad weekly review happens."*
--
-- There never was one, and the reason is a single NULL comparison in two places.
--
-- `ensure_weekly_recap` (0057) writes the weekly summary into `squad_posts` as an ordinary row of type
-- 'weekly' — and with **`author_id = NULL`**, because nobody wrote it. That migration dropped the NOT
-- NULL on the column for exactly this purpose and moved both feed RPCs to LEFT JOIN so an authorless row
-- would still render. What it could not know is that 0122 would later fan `squad_posts` out into the
-- notification union with:
--
--     where sp.author_id <> p_user          -- branch 10
--     where m.user_id <> new.author_id      -- the push trigger
--
-- `x <> NULL` is NULL, never true. So the weekly recap was excluded from the inbox by the union and from
-- push by the trigger — silently, and in both directions at once. Nothing errored; the row simply never
-- became an event.
--
-- ══ WHY A NEW KIND RATHER THAN JUST FIXING THE COMPARISON ══
--
-- `is distinct from` alone would let the recap through as a `squad_post`, whose wording is
-- `coalesce(pr.name, 'An athlete') || ' posted in ' || squad`. Nobody posted it. The athlete would be
-- told a person did a thing no person did, which is the same class of small lie this schema keeps
-- removing. A recap is authored by the squad itself, so it gets its own branch, its own sentence, and —
-- in the client — the squad crest rather than an avatar.
--
-- Branch 10 therefore NARROWS to authored posts (`author_id is not null`), and branch 12 takes the
-- authorless ones. The two are disjoint by construction, so no post can produce both events.
--
-- ══ WINDOW ══
--
-- 14 days, same as the two fan-out branches beside it — see 0122's header for why that predicate is
-- load-bearing rather than tidy. A recap covers the week just gone, so the window never truncates a live
-- one; it bounds the backfill on a squad with a year of them.
--
-- ROUTING: `/squad/[id]`, via `destinationFor`'s existing default arm. The recap has its own screen
-- (`/squad-recap/[id]`) but the union carries no `post_id` and adding one touches eleven files — 0122
-- weighed exactly this and deferred it. The squad feed is one tap from the card.
--
-- ⚠ TWELVE BRANCHES after this migration. 0122 had eleven. THIS BODY IS REBUILT FROM 0122'S, which is
--   the newest. Rebuilding from a stale predecessor has silently deleted a shipped feature three times
--   in this schema (0088 and 0092 each dropped both friend branches; 0106 dropped program graduation).
-- ⚠ CREATE OR REPLACE, NEVER DROP — a drop resets 0120's revoke from PUBLIC and re-opens the
--   SECURITY DEFINER escalation. The return shape is unchanged, so 42P13 does not apply.
--
-- Depends on 0057 (ensure_weekly_recap), 0122 (branches 10–11). Idempotent. RUN AFTER 0122.

-- ── The union: branch 10 narrowed, branch 12 added ───────────────────────────
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
  -- 10 (0122, narrowed 0126) — THE FIRST FAN-OUT BRANCH. Windowed at 14 days; see 0122's header for why
  --     that predicate is load-bearing rather than tidy.
  --     `author_id is not null` keeps the AUTHORLESS weekly recap out of this branch and in branch 12,
  --     where it is worded as the squad's own summary instead of as somebody's post.
  select 'squad_post'::text, sp.created_at, sp.squad_id, sp.author_id, null::uuid, null::uuid, null::uuid
    from public.squad_posts sp
    join public.squad_members m on m.squad_id = sp.squad_id and m.user_id = p_user
   where sp.author_id is not null
     and sp.author_id <> p_user
     and sp.created_at > now() - interval '14 days'

  union all
  -- 11 (0122)
  select 'squad_checkin'::text, sc.created_at, sc.squad_id, sc.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_checkins sc
    join public.squad_members m on m.squad_id = sc.squad_id and m.user_id = p_user
   where sc.user_id <> p_user
     and sc.created_at > now() - interval '14 days'

  union all
  -- 12 (0126) — the weekly review. `actor_id` is null on purpose: the SQUAD wrote this, not a member,
  --     and the client draws the crest rather than an avatar for exactly that reason.
  select 'squad_recap'::text, sp.created_at, sp.squad_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_posts sp
    join public.squad_members m on m.squad_id = sp.squad_id and m.user_id = p_user
   where sp.type = 'weekly'
     and sp.author_id is null
     and sp.created_at > now() - interval '14 days';
$$;

comment on function public.notification_events_for(uuid) is
  'THE definition of a notification event. TWELVE branches: join_request, member_joined, request_approved/declined, friend_request, friend_accepted, challenge_invite, workout_invite, program_shared, workout_join_request, squad_post, squad_checkin, squad_recap. The last three are FAN-OUT — one squad row becomes one event per member — and are windowed at 14 days so the inbox does not become a second feed and push_enqueue_for does not re-scan a squad''s whole history per member. squad_post and squad_recap partition squad_posts by author_id (authored vs the authorless weekly summary) and cannot both fire for one row. Read by notification_events() for the viewer and by push_enqueue_for() for the sender. Rebuild from THIS body, never an older one — 0088, 0092 and 0106 each rebuilt from a predecessor and silently dropped a shipped feature. Use CREATE OR REPLACE: a DROP resets 0120''s revoke from PUBLIC.';

-- ── Preferences ──────────────────────────────────────────────────────────────
-- The recap rides the `squad_feed` toggle ("Squad Posts & Activity") rather than earning a fifth one.
-- It IS squad activity, and P-5 §3.2's ambient rule applies to it exactly as it does to a post. Default
-- stays false for the same reason 0122 gave: a fan-out branch defaulting to ON pushes a squad's whole
-- week at everyone in it.
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
    else null
  end;
$$;

-- Restated VERBATIM from 0122, unchanged. It is here for the same reason 0122 restated it: the
-- client-parity test parses the NEWEST migration that defines these functions, and a default living
-- only in an older file would be compared against a body the database no longer runs.
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

-- ── The sender: one new arm ──────────────────────────────────────────────────
-- Rebuilt from 0122's body with a `squad_recap` case in the title and body expressions. The route falls
-- to the `else` arm — already `/squad/<id>` — so no new case is needed there.
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
      when 'squad_recap'          then 'Weekly review'
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
      -- No actor to name. The squad is the subject of the sentence, which is what the row shows too.
      when 'squad_recap'          then coalesce(sq.name, 'Your squad') || '''s week is in'
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

-- ── The trigger: an authorless insert must still fan out ──────────────────────
--
-- ⚠ THE SECOND HALF OF THE SAME NULL BUG. `m.user_id <> new.author_id` selected NO members when the
-- recap arrived with a null author, so `push_enqueue_for` was never called for anybody and the branch
-- above would have had nothing to send even after being added. `is distinct from` is the null-safe
-- form: it excludes the author when there is one and excludes nobody when there is not.
--
-- The loop stays as deliberately stupid as 0120's — it answers only "who might have a new event". What
-- an event IS remains the union's business, and the author is still excluded there.
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
     where m.squad_id = new.squad_id and m.user_id is distinct from new.author_id
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

-- ── Grants ───────────────────────────────────────────────────────────────────
-- Restated for the same reason 0121 and 0122 restate it: `notification_events_for` is SECURITY DEFINER
-- over any user id and must never be directly callable. Reached only through `notification_events()`
-- and `push_enqueue_for`, both of which pin the caller themselves.
revoke execute on function public.notification_events_for(uuid) from public;
