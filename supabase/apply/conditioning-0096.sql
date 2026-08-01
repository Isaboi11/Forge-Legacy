-- Forge Legacy - APPLY: 0096 (conditioning legs)
--
-- Adds per-set duration + distance so a run can be part of a workout, anywhere in it, more than once.
-- Replaces save_workout (same 11-arg signature as 0095 - no drop needed) and save_workout_as_template.
--
-- RUN AFTER 0095. Idempotent.

-- Forge Legacy — 0096: a run can be part of a workout, anywhere in it
--
-- Until now a session was either strength (exercises and sets) or a distance activity (one `workouts.distance`
-- on the row). A program day ending "…then 20 minutes easy" had no representation: you logged the lifts,
-- then logged a run, and Activity History showed two things because that is what they were.
--
-- ══ WHY THE DISTANCE MOVES TO THE SET ══
--
-- `workouts.distance` is ONE number on the workout row. That is right for a pure run and wrong for a
-- session, for two reasons:
--
--   1. A CONDITIONING LEG HAS A POSITION. "Row 500m, then squat, then run a mile" is an ordinary session,
--      and a single column on the parent cannot say where in the session the distance happened.
--   2. THERE CAN BE MORE THAN ONE. Two legs collapse into one number and stop being two legs.
--
-- A conditioning leg is therefore an ordinary `workout_exercises` row whose set carries duration and
-- distance instead of weight and reps. Everything that already walks a session — Activity Detail, the
-- template deriver, the honor evaluator — keeps working, because the shape did not change; it gained
-- columns that are null for every strength set ever written.
--
-- ══ THE ROLL-UP ══
--
-- `workouts.distance` is still SET, from the sum of the session's conditioning legs, whenever the caller
-- did not supply one directly. So a mixed session appears in Activity History with its miles, and the
-- distance-goal machinery from 0034–0039 counts it, without a single reader being changed. A pure run
-- (saveActivity) passes `p_distance` explicitly and is untouched by this.
--
-- Depends on 0001 (workout_sets), 0095 (the 11-arg save_workout). Idempotent. RUN AFTER 0095.

alter table public.workout_sets add column if not exists duration_sec  integer;
alter table public.workout_sets add column if not exists distance      numeric;
alter table public.workout_sets add column if not exists distance_unit text;

comment on column public.workout_sets.duration_sec is
  'Seconds this bout lasted. Set on a conditioning leg (a run, row, ride); null on a strength set, where the meaningful numbers are weight and reps.';
comment on column public.workout_sets.distance is
  'Distance covered in this bout, in the unit named by distance_unit (always ''mi'' as written by this app — miles are the canonical stored unit, converted only for display). Null on a strength set.';

-- ── save_workout carries them ─────────────────────────────────────────────────
-- Same 11-argument signature as 0095, so `create or replace` is enough — no drop, no ambiguity. The set
-- insert gains three columns and the workout gains the roll-up.
create or replace function save_workout(
  p_workout_name  text,
  p_activity_type modality,
  p_started_at    timestamptz,
  p_duration_sec  integer,
  p_notes         text,
  p_exercises     jsonb,
  p_prs           jsonb,
  p_program_id    uuid default null,
  p_distance      numeric default null,
  p_distance_unit text default null,
  p_template_id   uuid default null
) returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid      uuid := auth.uid();
  v_chapter  uuid;
  v_workout  uuid;
  v_wex      uuid;
  v_ex       jsonb;
  v_set      jsonb;
  v_pr       jsonb;
  v_tl       int := 0;
  v_program  uuid := null;
  v_template uuid := null;
  v_honors   jsonb := '[]'::jsonb;
  v_legs     numeric := 0;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select id into v_chapter from chapters where athlete_id = v_uid and is_active limit 1;

  if p_program_id is not null then
    select id into v_program from programs where id = p_program_id and athlete_id = v_uid;
  end if;

  if p_template_id is not null then
    select id into v_template from public.workout_templates where id = p_template_id and athlete_id = v_uid;
  end if;

  insert into workouts (athlete_id, chapter_id, program_id, template_id, workout_name, activity_type, started_at, saved_at, duration_sec, state, notes, distance, distance_unit)
  values (v_uid, v_chapter, v_program, v_template, p_workout_name, p_activity_type, p_started_at, now(), p_duration_sec, 'saved', p_notes, p_distance, p_distance_unit)
  returning id into v_workout;

  for v_ex in select value from jsonb_array_elements(coalesce(p_exercises, '[]'::jsonb))
  loop
    insert into workout_exercises (workout_id, catalog_key, name, section, position)
    values (v_workout, v_ex->>'catalog_key', v_ex->>'name',
            coalesce((v_ex->>'section')::workout_section, 'main'), (v_ex->>'position')::int)
    returning id into v_wex;

    for v_set in select value from jsonb_array_elements(coalesce(v_ex->'sets', '[]'::jsonb))
    loop
      insert into workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps, duration_sec, distance, distance_unit)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric,
              coalesce(v_set->>'weight_unit', 'lb'), (v_set->>'reps')::int,
              (v_set->>'duration_sec')::int, (v_set->>'distance')::numeric,
              case when (v_set->>'distance') is not null then coalesce(v_set->>'distance_unit', 'mi') else null end);

      v_legs := v_legs + coalesce((v_set->>'distance')::numeric, 0);
    end loop;
  end loop;

  -- Only when the caller didn't state one: a pure run passes its own distance and must not be doubled.
  if p_distance is null and v_legs > 0 then
    update workouts set distance = v_legs, distance_unit = 'mi' where id = v_workout;
  end if;

  for v_pr in select value from jsonb_array_elements(coalesce(p_prs, '[]'::jsonb))
  loop
    -- `catalogKey` is optional: a caller that doesn't send it stores null and the honor matcher falls back
    -- to the canonical name, exactly as it does for every PR written before this migration.
    insert into personal_records (athlete_id, exercise, catalog_key, achieved_on, measure_kind, load_value, load_unit, load_reps)
    values (v_uid, v_pr->>'exercise', v_pr->>'catalogKey', current_date, 'load', (v_pr->>'weight')::numeric, 'lb', (v_pr->>'reps')::int);
    insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at, source_entity_type)
    values (v_uid, 'ACCOMPLISHMENT', (v_pr->>'exercise') || ' — ' || (v_pr->>'weight') || ' lb PR',
            v_chapter, now(), 'personal_record');
    v_tl := v_tl + 1;
  end loop;

  if v_chapter is not null then
    update chapters set workout_count = workout_count + 1 where id = v_chapter;
  end if;

  -- Inside the transaction, as 0012 intended: a rollback takes the honors with it.
  v_honors := public.evaluate_honors('live_session');

  return jsonb_build_object('workout_id', v_workout, 'timeline_added', v_tl, 'program_id', v_program, 'template_id', v_template, 'honors', v_honors);
end;
$$;

-- ── Templates keep a conditioning leg's target ────────────────────────────────
-- Without this a template made from a session ending in a run comes back as strength-only, and the leg
-- silently disappears the next time you train it.
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
               -- A leg is recognised by having carried distance or duration, not by a stored flag: the
               -- evidence of what it was is the measurement itself.
               'kind', case when max(coalesce(ws.distance, 0)) > 0 or max(coalesce(ws.duration_sec, 0)) > 0
                            then 'distance' else 'strength' end,
               'sets', count(ws.id)::int,
               -- FILTER, not a join predicate. 0094 excluded rep-less sets in the join itself, which was
               -- fine while every set had reps — a conditioning leg has none, so that join would have
               -- counted its sets as zero and dropped the leg from the template entirely. Filtering only
               -- the median keeps strength behaviour identical and lets a leg through.
               'targetReps', coalesce(
                 (percentile_disc(0.5) within group (order by ws.reps) filter (where ws.reps is not null))::int,
                 0
               ),
               -- Kept as the target to aim at next time, the same way median reps are.
               'targetDistanceMi', nullif(sum(coalesce(ws.distance, 0)), 0),
               'targetDurationSec', nullif(sum(coalesce(ws.duration_sec, 0)), 0)
             ) as obj
        from public.workout_exercises we
        left join public.workout_sets ws on ws.workout_exercise_id = we.id
       where we.workout_id = w.id
       group by we.id, we.position, we.catalog_key, we.name, we.section
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
