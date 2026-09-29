-- 0242 — a personal record knows the workout that set it (QA F9, 2026-09-29)
--
-- QA 09-26 F9: "QA Workout One" (bench 135×8) wore a trophy for "150 lb Barbell Bench Press", a weight it
-- never lifted, because every workout trained that day with that lift got the chip. `personal_records`
-- carried a date (`current_date` at SAVE time, UTC) and a lift name, and nothing else, so the client had to
-- guess which session a record belonged to. Since f249713a it guesses well — the session whose own sets hold
-- that weight at 1–5 reps (`records-core.ts` `recordsByWorkout`) — but it is still a guess.
--
-- This stops the guessing for every record written from now on:
--
--   · `personal_records.workout_id` — nullable, `on delete set null`. NULL on every row written before
--     this migration; the client keeps its set-matching guess for those rows only.
--   · `save_workout` writes the id of the workout it just inserted (`v_workout`).
--   · `continue_workout` writes the id of the workout it is adding to (`p_workout_id`).
--
-- ══ ⚠ HOW THE TWO FUNCTION BODIES BELOW WERE PRODUCED ══
--
-- By SCRIPT, from **0162** — the newest definition of each (no later migration restates either; 0198
-- says so in its own header). Two substitutions per function, each asserted to match exactly once, and
-- the script asserted that undoing them gives back 0162's text byte for byte. Nothing else changed:
-- the insert gains `workout_id` in its column list and `v_workout` / `p_workout_id` in its values.
-- `achieved_on` is still `current_date` — the record's date is not what this fixes, and changing it would
-- move every new row against the day-matching the old rows still depend on.
--
-- ⚠ `create or replace`, never DROP — a drop discards the EXECUTE grants (0147 → 0150). The paste
--   bundle's §2 asserts they are still there.
--
-- ⚠ ORDER DOES NOT MATTER against the client, and that is deliberate:
--   · This migration BEFORE the client deploy: the server writes a column the old client never selects.
--     Nothing reads it, nothing breaks.
--   · The client BEFORE this migration: `records-live.ts` asks for `workout_id`, gets PostgREST's
--     "column does not exist", and re-reads without it — every row then takes the old set-matching path,
--     exactly what the deployed client does today.
--   It is additive: it removes no access and changes no row.
--
-- ⚠ NO BACKFILL. Old rows keep NULL and the client's set-matching path, which is right for them already.
--
-- Depends on 0001 (personal_records, workouts), 0078 (catalog_key), 0162. Idempotent. RUN AFTER 0162.

-- ── 1 · The column ───────────────────────────────────────────────────────────

alter table public.personal_records add column if not exists workout_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'personal_records_workout_id_fkey') then
    alter table public.personal_records
      add constraint personal_records_workout_id_fkey
      foreign key (workout_id) references public.workouts(id) on delete set null;
  end if;
end $$;

create index if not exists personal_records_workout on public.personal_records (workout_id) where workout_id is not null;

comment on column public.personal_records.workout_id is
  'The saved workout whose set broke this record (0242, QA F9). Written by save_workout / continue_workout. NULL on rows written before 0242 — the client attributes those by matching the record against each session''s own sets (records-core.ts recordsByWorkout). ON DELETE SET NULL: deleting a workout keeps the record, as it always has.';

-- ── 2 · `save_workout` credits the record to the workout it just inserted (0162's body, spliced) ──

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
      insert into workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps, duration_sec, distance, distance_unit, floors, modality, incline_pct, route, climb_m)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric,
              coalesce(v_set->>'weight_unit', 'lb'), (v_set->>'reps')::int,
              (v_set->>'duration_sec')::int, (v_set->>'distance')::numeric,
              case when (v_set->>'distance') is not null then coalesce(v_set->>'distance_unit', 'mi') else null end,
              -- 0151. Its own column. A floor is not a mile and must never reach `distance`, which is
              -- read as miles by goals (0035), honors (0078), challenges (0061) and squad totals (0107).
              (v_set->>'floors')::int,
              nullif(v_set->>'modality', ''), (v_set->>'incline_pct')::numeric,
              -- 0162. The trimmed polyline and the climb. NULLIF on the route because an untracked or
              -- too-short bout sends '' and an empty string is not a shape; climb_m is NULL rather than
              -- 0 so "we could not measure altitude" stays distinguishable from "it was flat".
              nullif(v_set->>'route', ''), (v_set->>'climb_m')::int);

      v_legs := v_legs + coalesce((v_set->>'distance')::numeric, 0);
    end loop;
  end loop;

  -- Only when the caller did not state one: a pure run passes its own distance and must not be doubled.
  if p_distance is null and v_legs > 0 then
    update workouts set distance = v_legs, distance_unit = 'mi' where id = v_workout;
  end if;

  for v_pr in select value from jsonb_array_elements(coalesce(p_prs, '[]'::jsonb))
  loop
    insert into personal_records (athlete_id, exercise, catalog_key, achieved_on, measure_kind, load_value, load_unit, load_reps, workout_id)
    values (v_uid, v_pr->>'exercise', v_pr->>'catalogKey', current_date, 'load', (v_pr->>'weight')::numeric, 'lb', (v_pr->>'reps')::int, v_workout);
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

-- ── 3 · `continue_workout` credits it to the workout it is adding to (0162's body, spliced) ─────────

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
      insert into public.workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps, duration_sec, distance, distance_unit, floors, modality, incline_pct, route, climb_m)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric,
              coalesce(v_set->>'weight_unit', 'lb'), (v_set->>'reps')::int,
              (v_set->>'duration_sec')::int, (v_set->>'distance')::numeric,
              case when (v_set->>'distance') is not null then coalesce(v_set->>'distance_unit', 'mi') else null end,
              -- 0151. Its own column. A floor is not a mile and must never reach `distance`, which is
              -- read as miles by goals (0035), honors (0078), challenges (0061) and squad totals (0107).
              (v_set->>'floors')::int,
              nullif(v_set->>'modality', ''), (v_set->>'incline_pct')::numeric,
              -- 0162. The trimmed polyline and the climb. NULLIF on the route because an untracked or
              -- too-short bout sends '' and an empty string is not a shape; climb_m is NULL rather than
              -- 0 so "we could not measure altitude" stays distinguishable from "it was flat".
              nullif(v_set->>'route', ''), (v_set->>'climb_m')::int);
      v_added := v_added + 1;
    end loop;
  end loop;

  -- Records set by the NEW work only. The client detects these against the same prior bests
  -- `save_workout` used, so a lift that was already a record earlier in this session is not one again.
  for v_pr in select value from jsonb_array_elements(coalesce(p_prs, '[]'::jsonb))
  loop
    insert into public.personal_records (athlete_id, exercise, catalog_key, achieved_on, measure_kind, load_value, load_unit, load_reps, workout_id)
    values (v_uid, v_pr->>'exercise', v_pr->>'catalogKey', current_date, 'load', (v_pr->>'weight')::numeric, 'lb', (v_pr->>'reps')::int, p_workout_id);

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
