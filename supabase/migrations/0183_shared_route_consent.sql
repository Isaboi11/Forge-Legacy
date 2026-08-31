-- 0183 — the shared map, behind the consent that was decided but never built (D-RS-3).
--
-- ══ WHY ══
--
-- `Route-Sharing-Amendment-001` §3 (D-RS-2) names the shared Activity Detail as a place a route MAY
-- appear. §4 (D-RS-3) gates it: *"The map goes on a post only when the athlete includes it while
-- composing that post. Nothing shares retroactively."* Until now the client answered that by hardcoding
-- `route: null` on every shared read, and this function never returned the columns at all — which was
-- honest, and also meant the approved feature did not exist. This builds the gate the amendment asked
-- for, so the map can be shown when, and only when, its author chose to show it.
--
-- ⚠ CONSENT LIVES ON THE POST, IN `workout_summary`. It is a JSONB snapshot, so the choice costs no
--   column and needs no backfill — and every post written before today has no `shareRoute` key, reads
--   as false, and keeps exactly the mapless card it has always had. That IS "nothing shares
--   retroactively", enforced by the absence of a key rather than by a migration that has to guess.
--
-- ⚠ THE GOAL-CONTRIBUTION DOOR NEVER OPENS THE MAP. 0134 added a second entitlement — a session that
--   counted toward a squad goal — and it has no post behind it, therefore no composer, therefore
--   nobody ever chose. It still resolves the SESSION; it can never resolve the route. A consent
--   default of "whatever the other door decided" is how an opt-in becomes decoration.
--
-- ══ ⚠ AND IT RESTORES `duration_sec`, WHICH 0134 DELETED BY ACCIDENT ══
--
-- 0127 added `duration_sec` to each shared set, because a HOLD answers in seconds and has no reps:
-- without it the viewer got `reps: null` and drew an empty line. 0134 then rebuilt this function from
-- 0117's body — the exact trap 0117's own comment warns about — and the key went with it. It has been
-- missing ever since, which is why a shared plank, dead hang, carry, or the duration of a cardio bout
-- reads as a blank row today. `fetchSharedActivityDetail` has been mapping a key nobody was sending.
--
-- ⚠ REBUILD FROM THIS BODY. It is 0134 plus 0127's `duration_sec` plus the two route keys.
--
-- Safe to run twice. `create or replace` only.

create or replace function public.shared_workout_detail(p_workout_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_w           record;
  v_posted      boolean;
  v_share_route boolean;
  v_route       text := null;
  v_climb_m     integer := null;
begin
  if v_uid is null or p_workout_id is null then
    return null;
  end if;

  -- DOOR 1 (0117) — a post carries this workout to an audience this athlete is in. Entitlement is the
  -- POST: unfriend, leave the squad or delete the post and the session stops resolving.
  --
  -- Resolved into a variable rather than tested inline, because the route gate below needs to ask a
  -- narrower version of the same question and the two must not drift apart.
  v_posted := exists (
    select 1
      from public.squad_posts p
     where p.workout_id = p_workout_id
       and (
            p.author_id = v_uid
         or (p.audience in ('FRIENDS', 'BOTH') and public.are_friends(p.author_id, v_uid))
         or (p.audience in ('SQUAD',   'BOTH') and p.squad_id is not null
             and public.is_squad_member(p.squad_id, v_uid))
       )
  );

  -- DOOR 2 (0134) — the session counted toward a goal of a squad this athlete is a MEMBER of.
  -- Entitlement is the shared goal: leave the squad, or let the goal's window close behind the
  -- session, and it stops resolving the same way.
  if not v_posted and not exists (
    -- The same window `squad_goal_detail` uses to LIST the contribution, so the gate cannot refuse a
    -- row the screen just offered. `is_squad_member` is the one deliberate narrowing — see 0134.
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

  -- ══ THE CONSENT (D-RS-3) ══
  --
  -- A post that (a) carries this workout, (b) this athlete is an audience for, and (c) was composed
  -- with the map included. All three, on the SAME post: a route shared to a squad must not become
  -- visible to a friend through a different, mapless post of the same session.
  --
  -- `->>` on a missing key yields NULL, which `coalesce` reads as 'false'. Every post predating this
  -- migration therefore withholds the map without anything having to be written to it.
  v_share_route := exists (
    select 1
      from public.squad_posts p
     where p.workout_id = p_workout_id
       and coalesce(p.workout_summary ->> 'shareRoute', 'false') = 'true'
       and (
            p.author_id = v_uid
         or (p.audience in ('FRIENDS', 'BOTH') and public.are_friends(p.author_id, v_uid))
         or (p.audience in ('SQUAD',   'BOTH') and p.squad_id is not null
             and public.is_squad_member(p.squad_id, v_uid))
       )
  );

  if v_share_route then
    -- The first set carrying a shape wins, and its climb comes from the SAME row — exactly the rule
    -- the owner's own read uses (`activity-live.ts`). One session holds at most one tracked bout
    -- today; ordering makes the answer stable rather than assuming that stays true.
    select ws.route, ws.climb_m
      into v_route, v_climb_m
      from public.workout_sets ws
      join public.workout_exercises we on we.id = ws.workout_exercise_id
     where we.workout_id = v_w.id
       and ws.route is not null
     order by we.position, ws.set_index
     limit 1;
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
    -- Named, not linked — see 0117's header. `program_id` is deliberately not returned.
    'program_name', (select pg.name from public.programs pg where pg.id = v_w.program_id),
    'playlist_url', v_w.playlist_url,
    'playlist_service', v_w.playlist_service,
    'playlist_name', v_w.playlist_name,
    -- NULL unless the author ticked the map on a post this viewer can see. Absent and null are the
    -- same thing to the client, which draws no Route section either way.
    'route', v_route,
    'climb_m', v_climb_m,
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
                              'reps', ws.reps,
                              -- ⚠ RESTORED. Added by 0127, dropped by 0134's rebuild. A hold answers in
                              -- seconds and has no reps at all; without this key the viewer gets
                              -- `reps: null` and draws an empty line.
                              'duration_sec', ws.duration_sec
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
  'Reads one saved workout for somebody who is not its author. TWO entitlements, either sufficient: a squad_posts row carrying it to an audience the caller is in (0117), or a goal contribution in a squad the caller is a MEMBER of, inside that goal''s window (0134). Returns the route ONLY when a post the caller can see was composed with workout_summary->>''shareRoute'' = ''true'' (D-RS-3, 0183) — the goal door never opens the map. Never grants ordinal, chapter, partners or the program id. Rebuild from 0183''s body, never 0117''s or 0134''s: 0134 rebuilt from 0117 and silently deleted the set-level duration_sec that 0127 added.';
