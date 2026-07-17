-- Forge Legacy — 0012: honor_instances + evaluation (minimal slice of the Honor system)
-- Three count-honors computable from committed data only. Idempotency is DB-enforced: the natural key
-- IS the idempotency key, via TWO partial unique indexes (a single 3-col index would let one-time honors
-- dupe — Postgres treats NULLs as distinct). Evaluation runs INSIDE save_workout's atomic transaction
-- (derived progression commits with the workout, like PRs); ON CONFLICT DO NOTHING makes it re-runnable
-- (the retry-safety the spec's staged model buys, without a worker). Divergence from ES-6 flagged in
-- FORGE_DELTAS. `source='import'` = silent retroactive (no timeline event); 'live_session' = real-time.

create table honor_instances (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid not null references profiles(id) on delete cascade,
  honor_type     text not null,               -- locked catalog id (e.g. first_workout_logged)
  display_name   text not null,               -- snapshotted at earn time (AD-58)
  date_earned    date not null default current_date,
  awarded_at     timestamptz not null default now(),
  chapter_id     uuid references chapters(id), -- null for one-time; set for repeatable-per-chapter
  source         text not null default 'live_session' check (source in ('live_session','offline_sync','import','challenge')),
  schema_version int  not null default 1,
  metadata       jsonb not null default '{}'::jsonb
);
-- earned-once enforcement (§6.3), two shapes → two partial unique indexes:
create unique index honor_once     on honor_instances (athlete_id, honor_type) where chapter_id is null;
create unique index honor_per_chap on honor_instances (athlete_id, honor_type, chapter_id) where chapter_id is not null;
create index honor_athlete_earned  on honor_instances (athlete_id, date_earned desc);

alter table honor_instances enable row level security;
create policy honor_own on honor_instances for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- ── idempotent evaluator (the 3-honor slice) ──
create or replace function evaluate_honors(p_source text default 'live_session') returns jsonb
language plpgsql security invoker as $$
declare
  v_uid   uuid := auth.uid();
  v_total int;
  v_live  boolean := (p_source = 'live_session');
  v_new   jsonb := '[]'::jsonb;
  v_ch    record;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select count(*) into v_total from workouts where athlete_id = v_uid;

  -- first_workout_logged (one-time): total_sessions >= 1
  if v_total >= 1 then
    insert into honor_instances (athlete_id, honor_type, display_name, source)
    values (v_uid, 'first_workout_logged', 'First Workout Logged', p_source) on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type','first_workout_logged','display_name','First Workout Logged'));
      if v_live then insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', 'First Workout Logged', now(), 'honor_instance'); end if;
    end if;
  end if;

  -- workouts_logged_25 (one-time): total_sessions >= 25
  if v_total >= 25 then
    insert into honor_instances (athlete_id, honor_type, display_name, source)
    values (v_uid, 'workouts_logged_25', '25 Workouts Logged', p_source) on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type','workouts_logged_25','display_name','25 Workouts Logged'));
      if v_live then insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', '25 Workouts Logged', now(), 'honor_instance'); end if;
    end if;
  end if;

  -- workouts_in_chapter_10 (repeatable per chapter): every chapter with workout_count >= 10
  for v_ch in select id, name, workout_count from chapters where athlete_id = v_uid and workout_count >= 10 loop
    insert into honor_instances (athlete_id, honor_type, display_name, chapter_id, source, metadata)
    values (v_uid, 'workouts_in_chapter_10', '10 Workouts in a Chapter', v_ch.id, p_source, jsonb_build_object('chapterName', v_ch.name)) on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type','workouts_in_chapter_10','display_name','10 Workouts in a Chapter','chapter', v_ch.name));
      if v_live then insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', '10 Workouts in a Chapter', v_ch.id, now(), 'honor_instance'); end if;
    end if;
  end loop;

  return v_new;
end; $$;

-- ── save_workout now evaluates honors inside the same atomic transaction (progression commits with the
--    workout; a rollback takes the honors with it) ──
create or replace function save_workout(
  p_workout_name text, p_activity_type modality, p_started_at timestamptz,
  p_duration_sec integer, p_notes text, p_exercises jsonb, p_prs jsonb
) returns jsonb
language plpgsql security invoker as $$
declare
  v_uid uuid := auth.uid(); v_chapter uuid; v_workout uuid; v_wex uuid;
  v_ex jsonb; v_set jsonb; v_pr jsonb; v_tl int := 0;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select id into v_chapter from chapters where athlete_id = v_uid and is_active limit 1;
  insert into workouts (athlete_id, chapter_id, workout_name, activity_type, started_at, saved_at, duration_sec, state, notes)
  values (v_uid, v_chapter, p_workout_name, p_activity_type, p_started_at, now(), p_duration_sec, 'saved', p_notes)
  returning id into v_workout;
  for v_ex in select value from jsonb_array_elements(coalesce(p_exercises,'[]'::jsonb)) loop
    insert into workout_exercises (workout_id, catalog_key, name, section, position)
    values (v_workout, v_ex->>'catalog_key', v_ex->>'name', coalesce((v_ex->>'section')::workout_section,'main'), (v_ex->>'position')::int)
    returning id into v_wex;
    for v_set in select value from jsonb_array_elements(coalesce(v_ex->'sets','[]'::jsonb)) loop
      insert into workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric, coalesce(v_set->>'weight_unit','lb'), (v_set->>'reps')::int);
    end loop;
  end loop;
  for v_pr in select value from jsonb_array_elements(coalesce(p_prs,'[]'::jsonb)) loop
    insert into personal_records (athlete_id, exercise, achieved_on, measure_kind, load_value, load_unit, load_reps)
    values (v_uid, v_pr->>'exercise', current_date, 'load', (v_pr->>'weight')::numeric, 'lb', (v_pr->>'reps')::int);
    insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at, source_entity_type)
    values (v_uid, 'ACCOMPLISHMENT', (v_pr->>'exercise') || ' — ' || (v_pr->>'weight') || ' lb PR', v_chapter, now(), 'personal_record');
    v_tl := v_tl + 1;
  end loop;
  if v_chapter is not null then update chapters set workout_count = workout_count + 1 where id = v_chapter; end if;

  return jsonb_build_object('workout_id', v_workout, 'timeline_added', v_tl, 'honors', evaluate_honors('live_session'));
end; $$;
