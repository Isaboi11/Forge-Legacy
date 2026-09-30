-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0246: the "started training" push says you can send them a message
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: §1 is a `create or replace`, §2 only checks, §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- PO 2026-09-29. Body was "Rachelle started training · Iron Squad"; it becomes
-- "Rachelle started training · Iron Squad. Tap to send them a message." The tap already opens
-- `/workout-join`, where the message box (0231, workout_cheers) lives — nothing else changes.
--
-- ⚠ §1 IS 0164'S `push_enqueue_for` VERBATIM with ONE arm changed. 0164 is the latest definition in both
-- supabase/migrations and supabase/apply. Every other kind's title, body and route is byte-identical.
--
-- §1  replaces push_enqueue_for
-- §2  RAISES unless the live function carries the new words AND still has every other kind's arm
-- §3  shows the live squad_training_started body line (expect the new text) and pushes of this kind
--     enqueued in the last 7 days (their body is the OLD text — only new pushes change).

-- ── §1 · The function ─────────────────────────────────────────────────────────────────────────
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
      -- 0246 (PO 09-29): the push says what to DO with it. Since 0231 the screen it opens (`/workout-join`)
      -- is where a squad-mate writes a message Holt shows them mid-workout, so the lock screen says so.
      when 'squad_training_started'  then coalesce(pr.name, 'An athlete') || ' started training' || coalesce(' · ' || sq.name, '') || '. Tap to send them a message.'
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

revoke execute on function public.push_enqueue_for(uuid) from public;

-- ── §2 · Assert ───────────────────────────────────────────────────────────────────────────────
do $$
declare
  v text := pg_get_functiondef('public.push_enqueue_for(uuid)'::regprocedure);
  k text;
begin
  if position('Tap to send them a message.' in v) = 0 then
    raise exception '0246: push_enqueue_for does not carry the new squad_training_started body';
  end if;
  foreach k in array array['join_request','member_joined','request_approved','friend_request','friend_accepted',
    'challenge_invite','challenge_joined','workout_invite','workout_join_request','program_shared','squad_post',
    'squad_checkin','squad_recap','post_comment','post_reaction','squad_training_started','squad_training_finished'] loop
    if (length(v) - length(replace(v, 'when ''' || k || '''', ''))) / length('when ''' || k || '''') < 2 then
      raise exception '0246: push_enqueue_for lost the % arm', k;
    end if;
  end loop;
end $$;

-- ── §3 · Report (read-only) ──────────────────────────────────────────────────────────────────
select 'live body line' as what,
       trim(substring(pg_get_functiondef('public.push_enqueue_for(uuid)'::regprocedure)
         from 'when ''squad_training_started''  then coalesce[^
]*')) as detail
union all
select 'started-training pushes, last 7 days', count(*)::text
  from public.push_outbox where kind = 'squad_training_started' and created_at > now() - interval '7 days';
