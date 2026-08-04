-- Forge Legacy — 0106: a superset survives being saved
--
-- ══ THE GAP ══
--
-- The session model has carried circuit membership since 0096 (`groupId` / `groupName` / `groupRounds` /
-- `groupCapSec` on every exercise), and the program layer has carried it since the prescription model
-- grew ladders and AMRAPs. `workout_exercises` never learned any of it. That was survivable while a
-- circuit only ever came DOWN from a program — the program still held the truth, and the log was just a
-- record of the work — but a superset is created IN the session, by the athlete, on the day. Without
-- these columns, pairing two lifts mid-workout produced a pairing that existed until Finish and then
-- did not: Activity Detail showed two unrelated exercises, and a template saved from that session kept
-- no memory of the pairing at all.
--
-- ══ WHY `group_kind` EXISTS AND WHY ABSENT MEANS CIRCUIT ══
--
-- A superset and a circuit are the same GROUPING with two different performances: a superset alternates
-- set for set and rests only at the end of a round; a circuit runs rounds under a banner and sometimes a
-- clock. Every block that existed before this migration was a circuit, so NULL reads as 'circuit' and the
-- shipped programs, the Bridger Logan import and every AMRAP render exactly as they did.
--
-- ══ WHY THE FUNCTION SIGNATURE DOES NOT CHANGE ══
--
-- The group fields ride inside the `p_exercises` jsonb, so `save_workout` keeps the same 11 arguments it
-- has had since 0095. `create or replace` is enough: no drop, no second overload, no PostgREST
-- `PGRST203` ambiguity for the client to trip over.
--
-- ⚠ PL/pgSQL RESOLVES RECORD FIELDS AT RUN TIME. Applying this proves nothing — this very pair of
-- functions has already shipped one error that only appeared when a button was pressed (0094, 42703).
-- After applying: log a superset, finish it, and save it as a template.
--
-- Depends on 0001 (workout_exercises) and 0097. Idempotent. RUN AFTER 0105.

alter table public.workout_exercises add column if not exists group_id     text;
alter table public.workout_exercises add column if not exists group_name   text;
alter table public.workout_exercises add column if not exists group_kind   text;
alter table public.workout_exercises add column if not exists group_rounds int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'workout_exercises_group_kind_valid') then
    alter table public.workout_exercises
      add constraint workout_exercises_group_kind_valid
      check (group_kind is null or group_kind in ('superset', 'circuit'));
  end if;
end $$;

comment on column public.workout_exercises.group_id is
  'Adjacent rows sharing this id are ONE block. Adjacency, not the id alone, defines the block — two blocks may reuse an id, and filtering by id would fuse them.';
comment on column public.workout_exercises.group_kind is
  '''superset'' (alternated set for set, rest only after the last member) or ''circuit'' (rounds, optionally under a clock). NULL reads as ''circuit'' — every block that existed before 0106 was one.';
comment on column public.workout_exercises.group_rounds is
  'Times through the block. For a superset this is the number of sets each member gets.';

-- ── save_workout carries the block ────────────────────────────────────────────
-- Identical to 0097's apart from the four columns on the exercise insert.
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
    insert into workout_exercises (workout_id, catalog_key, name, section, position, group_id, group_name, group_kind, group_rounds)
    values (v_workout, v_ex->>'catalog_key', v_ex->>'name',
            coalesce((v_ex->>'section')::workout_section, 'main'), (v_ex->>'position')::int,
            nullif(v_ex->>'group_id', ''), nullif(v_ex->>'group_name', ''),
            -- Anything the client did not label is a circuit, which is what the read side assumes too.
            case when nullif(v_ex->>'group_id', '') is null then null
                 when v_ex->>'group_kind' = 'superset' then 'superset'
                 else 'circuit' end,
            (v_ex->>'group_rounds')::int)
    returning id into v_wex;

    for v_set in select value from jsonb_array_elements(coalesce(v_ex->'sets', '[]'::jsonb))
    loop
      insert into workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps, duration_sec, distance, distance_unit, modality, incline_pct)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric,
              coalesce(v_set->>'weight_unit', 'lb'), (v_set->>'reps')::int,
              (v_set->>'duration_sec')::int, (v_set->>'distance')::numeric,
              case when (v_set->>'distance') is not null then coalesce(v_set->>'distance_unit', 'mi') else null end,
              nullif(v_set->>'modality', ''), (v_set->>'incline_pct')::numeric);

      v_legs := v_legs + coalesce((v_set->>'distance')::numeric, 0);
    end loop;
  end loop;

  -- Only when the caller didn't state one: a pure run passes its own distance and must not be doubled.
  if p_distance is null and v_legs > 0 then
    update workouts set distance = v_legs, distance_unit = 'mi' where id = v_workout;
  end if;

  for v_pr in select value from jsonb_array_elements(coalesce(p_prs, '[]'::jsonb))
  loop
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

  v_honors := public.evaluate_honors('live_session');

  return jsonb_build_object('workout_id', v_workout, 'timeline_added', v_tl, 'program_id', v_program, 'template_id', v_template, 'honors', v_honors);
end;
$$;

-- ── a template keeps the pairing ──────────────────────────────────────────────
-- Identical to 0097's deriver apart from the four group keys, so repeating a session that was built
-- around a superset gives you the superset back rather than four loose lifts in a suggestive order.
--
-- `w.workout_name` — NOT `w.name`. 0091 wrote `w.name`, which does not exist on `workouts`, and because
-- PL/pgSQL binds record fields at run time the function compiled cleanly and failed only when an athlete
-- pressed the button (0094). Every later revision has had to carry that correction forward by hand;
-- this one does too.
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
               -- A block is recognised by having carried distance or duration, not by a stored flag: the
               -- evidence of what it was is the measurement itself.
               'kind', case when max(coalesce(ws.distance, 0)) > 0 or max(coalesce(ws.duration_sec, 0)) > 0
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
  'Turns a finished workout into a reusable template. Keeps the shape (lifts, order, block pairings, sets, median target reps) and deliberately drops the load — a template is a plan, and last session''s weights are a record.';
