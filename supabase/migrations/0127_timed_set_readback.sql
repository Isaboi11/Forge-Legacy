-- Forge Legacy — 0127: a hold reads back as a hold
--
-- ══ WHAT THIS CLOSES ══
--
-- PO review: *"There are some workouts we should have with a countdown time. Like planks for example."*
--
-- The prescription layer has carried `durationSec` since the prescription model was extended, and the
-- session layer has carried `targetSec` beside it. The LOGGER did not: a timed set drew its duration in
-- the Target column and then wrote a rep count underneath it. `repTargets` fills an item that prescribes
-- no reps out to the builder's `DEFAULT_REPS`, so a 60s Plank arrived as `targetReps: 10`, completing
-- back-filled the actual to 10, and `save_workout` stored **"Plank — 10 reps"** in the athlete's history.
-- A hold has no rep count; claiming one is a fabrication, not a rounding.
--
-- The client side of the fix is `session-core` (`targetReps: 0` for a timed item, the same treatment a
-- to-failure set already had), `workout.tsx` (back-fill the CLOCK, never the reps) and `save-core`
-- (`reps: null` and `duration_sec` — the column `workout_sets` has held since 0096).
--
-- This migration is the READ side, and it exists because writing `duration_sec` on a strength set breaks
-- an inference that was sound right up until it did.
--
-- ══ 1. `save_workout_as_template` INFERRED "CARDIO" FROM DURATION ALONE ══
--
-- 0106's comment states the rule it was built on: *"A block is recognised by having carried distance or
-- duration, not by a stored flag: the evidence of what it was is the measurement itself."* That was true
-- while duration meant cardio and nothing else. From this release a Plank carries duration too, so the
-- unchanged predicate would turn every hold into a cardio block the moment somebody saved the session as
-- a template — a Plank rendered as a run.
--
-- The narrower evidence is DISTANCE or MODALITY. Every cardio bout writes `modality` ('outdoor' /
-- 'indoor') at log time — `saveCardioLog` has no path that omits it — and no strength set has ever had
-- one. A timed strength set has duration and nothing else, which is now exactly what distinguishes it.
--
-- Known and accepted: a conditioning leg logged in the ONE migration between `duration_sec` arriving
-- (0096) and `modality` arriving (0097), carrying neither distance nor modality, would now derive as
-- 'strength'. That window is one migration wide, the consequence is cosmetic (a derived template shows a
-- row as strength), and the alternative is misreading every hold from here on.
--
-- `targetDurationSec` is unchanged and still sums the column, so a template derived from a session with
-- a 60s Plank in it keeps the sixty seconds either way.
--
-- ══ 2. `shared_workout_detail` NEVER RETURNED IT ══
--
-- 0117's set object is `set_index / weight / weight_unit / reps`. A shared session containing a hold
-- therefore arrived at the viewer with `reps: null` and nothing else, and `setLine` — which never
-- invents the half it does not have — rendered an empty line under the exercise name. Adding the key is
-- additive; the client reads it as optional so an unapplied 0127 degrades to the same blank rather than
-- to an error.
--
-- ⚠ Both functions are rebuilt from their NEWEST bodies: `save_workout_as_template` from 0106 (not
--   0097), `shared_workout_detail` from 0117. Rebuilding from a stale predecessor has silently deleted a
--   shipped feature three times in this schema.
-- ⚠ `save_workout` itself is NOT touched. It already writes `(v_set->>'duration_sec')::int` for every
--   set regardless of kind, so the new field lands with no signature change to the one function every
--   client path calls.
--
-- Depends on 0106 (superset groups), 0117 (shared workout detail). Idempotent. RUN AFTER 0125.

-- ── 1. A hold is not a run ───────────────────────────────────────────────────
-- 0106's body verbatim apart from the `kind` expression and its comment. `w.workout_name` — NOT `w.name`
-- — carried forward by hand for the fourth revision running; see 0106's header for why that line has
-- its own warning.
create or replace function public.save_workout_as_template(p_workout uuid, p_name text default null)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  w      public.workouts%rowtype;
  v_ex   jsonb;
  v_id   uuid;
  v_name text;
begin
  if v_uid is null then
    return null;
  end if;

  select * into w from public.workouts where id = p_workout and athlete_id = v_uid;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(t.obj order by t.position), '[]'::jsonb) into v_ex
    from (
      select we.position,
             jsonb_build_object(
               'catalogKey', we.catalog_key,
               'name', we.name,
               'section', we.section,
               'groupId', we.group_id,
               'groupName', we.group_name,
               'groupKind', we.group_kind,
               'groupRounds', we.group_rounds,
               -- A block is still recognised by its measurement rather than by a stored flag — but
               -- DURATION is no longer part of the evidence. A 60s Plank carries it too (0127). Ground
               -- covered, or a modality the athlete chose, is what only a conditioning bout ever has.
               'kind', case when max(coalesce(ws.distance, 0)) > 0 or max(ws.modality) is not null
                            then 'cardio' else 'strength' end,
               'modality', max(ws.modality),
               'sets', count(ws.id)::int,
               'targetReps', coalesce(
                 (percentile_disc(0.5) within group (order by ws.reps) filter (where ws.reps is not null))::int,
                 0
               ),
               'targetMi', nullif(sum(coalesce(ws.distance, 0)), 0),
               'targetDurationSec', nullif(sum(coalesce(ws.duration_sec, 0)), 0)
             ) as obj
        from public.workout_exercises we
        left join public.workout_sets ws on ws.workout_exercise_id = we.id
       where we.workout_id = w.id
       group by we.id, we.position, we.catalog_key, we.name, we.section, we.group_id, we.group_name, we.group_kind, we.group_rounds
    ) t;

  if v_ex = '[]'::jsonb then
    return null;
  end if;

  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null then
    v_name := left(coalesce(nullif(btrim(w.workout_name), ''), 'Saved Workout'), 60);
  end if;

  insert into public.workout_templates (athlete_id, name, exercises, source_workout_id)
  values (v_uid, v_name, v_ex, w.id)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.save_workout_as_template(uuid, text) is
  'Turns a finished workout into a reusable template. Keeps the shape (lifts, order, block pairings, sets, median target reps) and deliberately drops the load — a template is a plan, and last session''s weights are a record. A block derives as cardio from DISTANCE or MODALITY, never from duration alone: since 0127 a timed strength set (Plank, Dead Hang, loaded carry) carries duration too.';

-- ── 2. A shared hold carries its clock ───────────────────────────────────────
-- 0117's body verbatim apart from one key in the set object. The visibility gate, the `security definer`
-- posture and the grants below are unchanged — see 0117's header for why the gate is the whole point.
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

  -- THE GATE. A post must exist, carry this workout, and be one this athlete is an audience for.
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
                              'reps', ws.reps,
                              -- Added 0127. A hold answers in seconds and has no reps at all; without
                              -- this key the viewer got `reps: null` and drew an empty line.
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
