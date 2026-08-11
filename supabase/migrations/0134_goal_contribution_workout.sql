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
