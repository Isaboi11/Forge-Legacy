-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 0124 — workout notes: finishing a column that has existed since 0001
--
-- RUN AFTER 0123.
--
-- ══ THIS ADDS NO COLUMN ══
--
-- `workout_exercises.notes` was in the very first migration (0001_spine.sql line 94) and `workouts.notes`
-- has taken a value through `save_workout`'s `p_notes` since 0010. **Neither has ever been written.** No
-- client path passed a value and no surface read one back, so both have been empty for every session this
-- app has ever saved — a write-only field of exactly the kind the `ProgramExercise` schema comment cites
-- as its standing warning.
--
-- All this migration does is let `save_workout` carry the per-exercise note that already rides inside
-- `p_exercises`. The session note needs nothing at all: `p_notes` has been in the signature for 114
-- migrations, and the client simply starts passing it.
--
-- ══ WHY `create or replace` IS SAFE HERE ══
--
-- The signature is UNCHANGED — the note travels inside the `p_exercises` jsonb, exactly as 0106's superset
-- fields did. `create or replace` therefore preserves the existing grants, which is the rule this repo
-- learned the hard way: a DROP would be required for a return-type change (42P13, as 0057/0109 each hit)
-- and would silently restore PUBLIC EXECUTE with nothing following to revoke it.
--
-- ⚠ THE BODY BELOW IS 0119's, COPIED WHOLE, WITH ONE INSERT CHANGED. It was not retyped. Rebuilding a
-- function body from a partial reading is how this schema has lost branches four separate times — 0088
-- and 0092 each dropped the friend branches, 0103 zeroed `time_total`, 0106 silently deleted the whole
-- graduation block. If you edit this, diff it against 0119 before running it.
--
-- Idempotent: one `create or replace` and read-only self-checks. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

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
  p_template_id   uuid default null,
  p_program_week  integer default null,
  p_program_day   integer default null
) returns jsonb
language plpgsql
security invoker
as $fn$
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
  v_prog     record;
  v_total    int;
  v_done     int;
  v_grad     jsonb := null;
  v_wk       int;
  v_dy       int;
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
    insert into workout_exercises (workout_id, catalog_key, name, notes, section, position, group_id, group_name, group_kind, group_rounds)
    values (v_workout, v_ex->>'catalog_key', v_ex->>'name', nullif(v_ex->>'notes', ''),
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

  -- Only when the caller did not state one: a pure run passes its own distance and must not be doubled.
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

  -- ══ WHICH SESSION THIS WAS, AND THEN GRADUATION (0119, restoring 0104 — see the header) ══
  --
  -- Its own exception block, on 0018's principle: the session is the thing worth saving. A failure here
  -- is loud in the Postgres log rather than surfacing months later as a graduation that never happened,
  -- which is exactly how 0106's silent deletion of this block went unnoticed.
  if v_program is not null then
    begin
      select p.name, p.structure, p.started_at, p.state
        into v_prog
        from programs p
       where p.id = v_program and p.athlete_id = v_uid
         for update;

      if found and v_prog.state = 'active' then
        -- The athlete's explicit choice, validated against the real schedule; otherwise the first
        -- session with no row against it. Both go through program_slots, so neither can name a session
        -- the program does not prescribe.
        select s.week_index, s.day_index into v_wk, v_dy
          from public.program_slots(v_prog.structure) s
         where (p_program_week is not null and p_program_day is not null
                  and s.week_index = p_program_week and s.day_index = p_program_day)
            or (p_program_week is null and p_program_day is null
                  and not exists (select 1 from public.program_sessions ps
                                   where ps.program_id = v_program
                                     and ps.week_index = s.week_index and ps.day_index = s.day_index))
         order by s.ordinal
         limit 1;

        if v_wk is not null then
          -- `do nothing` on conflict: re-training a session already logged keeps the FIRST record rather
          -- than rewriting which workout satisfied it.
          insert into public.program_sessions (program_id, athlete_id, week_index, day_index, state, workout_id)
          values (v_program, v_uid, v_wk, v_dy, 'completed', v_workout)
          on conflict (program_id, week_index, day_index) do nothing;
        end if;

        v_total := public.program_total_sessions(v_prog.structure);
        select count(*) into v_done from public.program_sessions ps where ps.program_id = v_program;

        -- `>=`, not `=`: two devices racing can put the count past the total, and an athlete past the end
        -- has still finished. A NULL total makes the comparison null, and null is not "graduate".
        if v_done >= v_total then
          update programs
             set state = 'graduated', ended_at = now(), updated_at = now()
           where id = v_program and athlete_id = v_uid and state = 'active';

          -- The `state = active` predicate IS the idempotency guard: a second concurrent save blocks on
          -- the row lock, re-evaluates once granted, and updates nothing.
          if found then
            insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at,
                                         source_entity_type, source_entity_id)
            values (v_uid, 'PROGRAM_GRADUATED', v_prog.name, v_chapter, now(), 'program', v_program);
            v_tl := v_tl + 1;

            v_grad := jsonb_build_object(
              'program_id',   v_program,
              'program_name', v_prog.name,
              'started_at',   v_prog.started_at,
              'graduated_at', now(),
              -- Sessions ACCOUNTED FOR, which is not the same as sessions trained. The ceremony is told
              -- both, so it can never present a skip as a workout.
              'sessions',     v_done,
              'trained',      (select count(*) from public.program_sessions ps
                                where ps.program_id = v_program and ps.state = 'completed'),
              'skipped',      (select count(*) from public.program_sessions ps
                                where ps.program_id = v_program and ps.state = 'skipped')
            );
          end if;
        end if;
      end if;
    exception when others then
      v_grad := null;
      raise warning 'save_workout: session/graduation step failed for program % (% %)', v_program, sqlstate, sqlerrm;
    end;
  end if;

  v_honors := public.evaluate_honors('live_session');

  return jsonb_build_object('workout_id', v_workout, 'timeline_added', v_tl, 'program_id', v_program, 'template_id', v_template, 'honors', v_honors, 'graduated', v_grad);
end;
$fn$;

-- ── SELF-CHECKS (read-only) ────────────────────────────────────────────────────────────────────────
-- Both must be TRUE. The first proves the installed body writes the note; the second proves the grant
-- survived, since that is the thing a careless DROP would have taken with it.
select
  (select pg_get_functiondef(p.oid) like '%nullif(v_ex->>''notes'', )%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'save_workout'
    limit 1)                                                        as writes_exercise_notes,
  has_function_privilege('authenticated', p.oid, 'execute')          as authenticated_can_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'save_workout'
limit 1;

-- And that the two columns this finishes are really the ones that were always there.
select
  (select count(*) from information_schema.columns
    where table_name = 'workout_exercises' and column_name = 'notes') = 1 as exercise_notes_column_exists,
  (select count(*) from information_schema.columns
    where table_name = 'workouts' and column_name = 'notes') = 1          as workout_notes_column_exists;
