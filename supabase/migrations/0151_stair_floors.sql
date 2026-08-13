-- Forge Legacy — 0151: the stair climber finally reports what it did
--
-- ══ WHAT THIS CLOSES ══
--
-- PO, 2026-08-12: *"Stair master needs to be changed to floors climbed."*
--
-- A stair bout has been recorded as bare minutes since cardio blocks were built. It is the one activity
-- in the app that reports back nothing about what it actually did — `TRACKS_DISTANCE.stair` is false and
-- correctly so, and nothing was ever put in the gap that left. `conditioning.ts` has carried the comment
-- *"A stair climber counts floors, and floors are not miles"* the whole time, and
-- `Endurance-Programming-Standard-v1.0` §0.1 records *"carries a distance: everything except stair
-- (which counts floors)"* as a fact about the data model. Floors were named in two places and stored in
-- none.
--
-- ══ ⚠ WHY A NEW COLUMN AND NOT `distance` WITH A 'floors' UNIT ══
--
-- `workout_sets.distance_unit` already exists and already carries 'mi', so tagging a stair set 'floors'
-- looks like the cheap answer. It is the expensive one. `save_workout` sums every set's `distance` into
-- `workouts.distance` (the `v_legs` rollup, unchanged below), and that column is read as MILES by:
--
--   · `goal_metric_value`      (0035, 0037, 0039)  — distance goals
--   · distance honors          (0078, 0079, 0081, 0082, 0099)
--   · `challenge_score`        (0061, 0062, 0063)  — leaderboards
--   · squad totals             (0048, 0051, 0103, 0107)
--
-- Sixty floors would enter the record as sixty miles: a marathon goal completed on a stair machine, a
-- distance honor awarded for it, a squad challenge won with it. None of those would raise anything — the
-- number would simply be wrong everywhere, forever, and it would look like data.
--
-- A swim's yards CAN ride in `distance` because a yard converts to a mile exactly. A floor converts to
-- nothing. So floors get their own column, and nothing sums them into anything.
--
-- ══ ⚠ HOW THE TWO FUNCTION BODIES BELOW WERE PRODUCED ══
--
-- By SCRIPT, not by hand: `save_workout` from **0124** (0127's header states in terms that it does not
-- touch that function, so 0124 is the newest body) and `continue_workout` from **0125**. Two
-- substitutions each, both asserted to match exactly once, and six structural checks that the branches
-- this schema has lost before — `PROGRAM_GRADUATED`, the notes write, the honors call, `program_slots`,
-- the chapter counter, the `v_legs` rollup — all survived the transform. Rebuilding from a partial read
-- has silently deleted a shipped feature four times here; this is the same guard 0135 used.
--
-- ⚠ `create or replace`, never DROP. A drop would discard the EXECUTE grants — including the one 0150
--   had to restore after 0147 revoked it and broke every workout save. Replace preserves them; §4 below
--   asserts they are still there rather than trusting that.
--
-- Depends on 0096 (`workout_sets` cardio columns), 0124, 0125. Idempotent. RUN AFTER 0150.

-- ── 1 · The column ───────────────────────────────────────────────────────────
--
-- Nullable and untyped-by-default on purpose: every set ever written predates it, and a floor count of
-- zero is a claim ("climbed nothing") where NULL is the truth ("this was not a stair bout").

alter table public.workout_sets add column if not exists floors integer;

comment on column public.workout_sets.floors is
  'Stair climber only — the machine''s floor count (0151). NOT a distance and NEVER summed into workouts.distance: that column is read as miles by goals, honors, challenges and squad totals, so a floor landing there is a fabricated mile. There is no unit system for floors and no conversion; a floor is the same for a metric athlete as an imperial one.';

-- ── 2 · `save_workout` writes it (0124's body, transformed by script — see the header) ───────────

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
      insert into workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps, duration_sec, distance, distance_unit, floors, modality, incline_pct)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric,
              coalesce(v_set->>'weight_unit', 'lb'), (v_set->>'reps')::int,
              (v_set->>'duration_sec')::int, (v_set->>'distance')::numeric,
              case when (v_set->>'distance') is not null then coalesce(v_set->>'distance_unit', 'mi') else null end,
              -- 0151. Its own column. A floor is not a mile and must never reach `distance`, which is
              -- read as miles by goals (0035), honors (0078), challenges (0061) and squad totals (0107).
              (v_set->>'floors')::int,
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

-- ── 3 · `continue_workout` writes it too (0125's body, same transform) ───────────────────────────
--
-- Appending to a reopened session must record floors for the same reason the first save does; a stair
-- bout continued after the fact would otherwise lose the half that came second.

create or replace function public.continue_workout(
  p_workout_id   uuid,
  p_exercises    jsonb,
  p_prs          jsonb,
  p_duration_sec integer
) returns jsonb
language plpgsql
security invoker
as $fn$
declare
  v_uid     uuid := auth.uid();
  v_w       record;
  v_chapter uuid;
  v_ex      jsonb;
  v_set     jsonb;
  v_pr      jsonb;
  v_wex     uuid;
  v_pos     int;
  v_added   int := 0;
  v_honors  jsonb := '[]'::jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select id, athlete_id, chapter_id, saved_at, state
    into v_w
    from public.workouts
   where id = p_workout_id and athlete_id = v_uid
   for update;

  if not found then
    raise exception 'workout not found';
  end if;

  -- The window. Raising rather than returning quietly: the athlete pressed a button and deserves to know
  -- it did not take, and a silent no-op here would look exactly like a successful continue.
  if v_w.saved_at is null or v_w.saved_at < now() - interval '60 minutes' then
    raise exception 'that workout closed more than an hour ago — start a new one and it stays its own session';
  end if;

  v_chapter := v_w.chapter_id;

  -- Append AFTER whatever is already there, so the order the athlete trained in survives.
  select coalesce(max(position), -1) + 1 into v_pos
    from public.workout_exercises where workout_id = p_workout_id;

  for v_ex in select value from jsonb_array_elements(coalesce(p_exercises, '[]'::jsonb))
  loop
    insert into public.workout_exercises (workout_id, catalog_key, name, notes, section, position, group_id, group_name, group_kind, group_rounds)
    values (p_workout_id, v_ex->>'catalog_key', v_ex->>'name', nullif(v_ex->>'notes', ''),
            coalesce((v_ex->>'section')::workout_section, 'main'), v_pos,
            nullif(v_ex->>'group_id', ''), nullif(v_ex->>'group_name', ''),
            case when nullif(v_ex->>'group_id', '') is null then null
                 when v_ex->>'group_kind' = 'superset' then 'superset'
                 else 'circuit' end,
            (v_ex->>'group_rounds')::int)
    returning id into v_wex;

    v_pos := v_pos + 1;

    for v_set in select value from jsonb_array_elements(coalesce(v_ex->'sets', '[]'::jsonb))
    loop
      insert into public.workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps, duration_sec, distance, distance_unit, floors, modality, incline_pct)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric,
              coalesce(v_set->>'weight_unit', 'lb'), (v_set->>'reps')::int,
              (v_set->>'duration_sec')::int, (v_set->>'distance')::numeric,
              case when (v_set->>'distance') is not null then coalesce(v_set->>'distance_unit', 'mi') else null end,
              -- 0151. Its own column. A floor is not a mile and must never reach `distance`, which is
              -- read as miles by goals (0035), honors (0078), challenges (0061) and squad totals (0107).
              (v_set->>'floors')::int,
              nullif(v_set->>'modality', ''), (v_set->>'incline_pct')::numeric);
      v_added := v_added + 1;
    end loop;
  end loop;

  -- Records set by the NEW work only. The client detects these against the same prior bests
  -- `save_workout` used, so a lift that was already a record earlier in this session is not one again.
  for v_pr in select value from jsonb_array_elements(coalesce(p_prs, '[]'::jsonb))
  loop
    insert into public.personal_records (athlete_id, exercise, catalog_key, achieved_on, measure_kind, load_value, load_unit, load_reps)
    values (v_uid, v_pr->>'exercise', v_pr->>'catalogKey', current_date, 'load', (v_pr->>'weight')::numeric, 'lb', (v_pr->>'reps')::int);

    insert into public.timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at, source_entity_type)
    values (v_uid, 'ACCOMPLISHMENT', (v_pr->>'exercise') || ' — ' || (v_pr->>'weight') || ' lb PR',
            v_chapter, now(), 'personal_record');
  end loop;

  -- The session ran longer than it thought it had. Never shorter: a continue only adds time.
  if p_duration_sec is not null and p_duration_sec > 0 then
    update public.workouts
       set duration_sec = greatest(coalesce(duration_sec, 0), p_duration_sec)
     where id = p_workout_id;
  end if;

  -- Honors re-evaluate against the fuller session. `evaluate_honors` is guarded by
  -- `on conflict do nothing` on `honor_instances`, so anything already earned is not earned twice.
  begin
    v_honors := public.evaluate_honors('live_session');
  exception when others then
    v_honors := '[]'::jsonb;
  end;

  return jsonb_build_object('workout_id', p_workout_id, 'sets_added', v_added, 'honors', v_honors);
end;
$fn$;

-- ── 4 · Assert. A replace that did not land must not report success. ─────────
--
-- ⚠ THESE ARE STRUCTURAL CHECKS AND THEY DO NOT PROVE THE FUNCTION RUNS. PL/pgSQL binds record fields at
--   RUN time, which is how 0091 shipped a body that compiled clean and failed on the first button press.
--   The button press for this one is at the bottom of the file.

do $$
declare
  v_save     text;
  v_continue text;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'workout_sets' and column_name = 'floors'
  ) then
    raise exception '0151: workout_sets.floors does not exist — §1 did not land.';
  end if;

  -- The NEWEST body of each. `bool_or` rather than a signature literal: an older overload may still
  -- exist from a pre-0119 signature, and §5 reports that separately rather than failing here.
  select string_agg(pg_get_functiondef(p.oid), E'\n') into v_save
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'save_workout';
  select string_agg(pg_get_functiondef(p.oid), E'\n') into v_continue
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'continue_workout';

  if v_save is null or v_save not like '%(v_set->>''floors'')::int%' then
    raise exception '0151: the installed save_workout does not write floors — the replace did not land.';
  end if;
  if v_continue is null or v_continue not like '%(v_set->>''floors'')::int%' then
    raise exception '0151: the installed continue_workout does not write floors — the replace did not land.';
  end if;

  -- ⚠ THE NEGATIVE THAT MATTERS. A floor must never reach the mileage rollup. If a later edit folds it
  --   in, every distance goal, honor and challenge silently gains stair sessions as miles, and nothing
  --   downstream can tell the difference. Assert what the function must NOT do.
  if v_save like '%v_legs + coalesce((v_set->>''floors''%' then
    raise exception '0151: save_workout is summing floors into v_legs — floors would be written to workouts.distance as MILES.';
  end if;
  if v_save not like '%v_legs := v_legs + coalesce((v_set->>''distance'')::numeric, 0)%' then
    raise exception '0151: the v_legs distance rollup is gone from save_workout — the transform damaged the body.';
  end if;

  -- The branches this schema has lost to a rebuild before. Checked on the INSTALLED text, not the file.
  if v_save not like '%PROGRAM_GRADUATED%'
     or v_save not like '%evaluate_honors(''live_session'')%'
     or v_save not like '%workout_count = workout_count + 1%'
     or v_save not like '%program_slots%' then
    raise exception '0151: save_workout lost a branch in the rebuild — graduation, honors, chapter count or program_slots is missing.';
  end if;

  -- 0150's grant must have survived. `create or replace` preserves it; a DROP would not, and this is the
  -- exact failure that broke every workout save last night.
  if not (select bool_and(has_function_privilege('authenticated', p.oid, 'execute'))
            from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('save_workout', 'continue_workout')) then
    raise exception '0151: authenticated lost EXECUTE on save_workout/continue_workout. Run: grant execute on function public.save_workout(text, modality, timestamptz, integer, text, jsonb, jsonb, uuid, numeric, text, uuid, integer, integer) to authenticated;';
  end if;
end $$;

-- ── 5 · Result, as ROWS ──────────────────────────────────────────────────────
--
-- Expect: t, t, t, 0.

select
  (select count(*) = 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'workout_sets' and column_name = 'floors')
                                                                  as floors_column_expect_t,
  (select bool_or(pg_get_functiondef(p.oid) like '%(v_set->>''floors'')::int%')
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'save_workout')     as save_writes_floors_expect_t,
  (select bool_or(pg_get_functiondef(p.oid) like '%(v_set->>''floors'')::int%')
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'continue_workout') as continue_writes_floors_expect_t,
  -- Any set-writing overload left behind by an older signature. Non-zero means a stale function could
  -- still be reached and would drop the floor count silently — worth knowing, not worth aborting for.
  (select count(*)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('save_workout', 'continue_workout')
      and pg_get_functiondef(p.oid) like '%insert into%workout_sets%'
      and pg_get_functiondef(p.oid) not like '%floors%')           as stale_overloads_expect_0;

-- ── 6 · The button press this file cannot make ───────────────────────────────
--
-- Structural checks prove the text; only the app proves the behaviour:
--   1. Log a stair-climber block with a floor count, Finish Workout, and read it back on the completion
--      screen.
--   2. Then check the damage this migration exists to prevent:
--        select distance, distance_unit, floors from workout_sets where floors is not null;
--      `distance` must be NULL on every one of those rows. A number there is the mileage bug.
