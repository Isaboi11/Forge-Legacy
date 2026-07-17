-- Forge Legacy — 0010: save_workout RPC (Active Workout W-9..W-16, finish commit)
-- The Finish commit, ATOMIC (mirrors complete_onboarding). One plpgsql transaction writes the whole
-- session or none of it — a half-written workout (some sets, no chapter bump; or a PR with no workout)
-- is the worst failure. No table/column DDL: all target tables exist since 0001.
--
-- PR detection is domain-side (Epley e1RM, client) — the caller passes already-decided PRs in p_prs;
-- the RPC just persists them + their ACCOMPLISHMENT timeline rows. security invoker → owner RLS applies.

create or replace function save_workout(
  p_workout_name  text,
  p_activity_type modality,
  p_started_at    timestamptz,
  p_duration_sec  integer,
  p_notes         text,
  p_exercises     jsonb,   -- [{name, catalog_key, section, position, sets:[{set_index, weight, weight_unit, reps}]}]
  p_prs           jsonb    -- [{exercise, weight, reps}] — already detected client-side
) returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid     uuid := auth.uid();
  v_chapter uuid;
  v_workout uuid;
  v_wex     uuid;
  v_ex      jsonb;
  v_set     jsonb;
  v_pr      jsonb;
  v_tl      int := 0;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select id into v_chapter from chapters where athlete_id = v_uid and is_active limit 1;

  insert into workouts (athlete_id, chapter_id, workout_name, activity_type, started_at, saved_at, duration_sec, state, notes)
  values (v_uid, v_chapter, p_workout_name, p_activity_type, p_started_at, now(), p_duration_sec, 'saved', p_notes)
  returning id into v_workout;

  for v_ex in select value from jsonb_array_elements(coalesce(p_exercises, '[]'::jsonb))
  loop
    insert into workout_exercises (workout_id, catalog_key, name, section, position)
    values (v_workout, v_ex->>'catalog_key', v_ex->>'name',
            coalesce((v_ex->>'section')::workout_section, 'main'), (v_ex->>'position')::int)
    returning id into v_wex;

    for v_set in select value from jsonb_array_elements(coalesce(v_ex->'sets', '[]'::jsonb))
    loop
      insert into workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric,
              coalesce(v_set->>'weight_unit', 'lb'), (v_set->>'reps')::int);
    end loop;
  end loop;

  for v_pr in select value from jsonb_array_elements(coalesce(p_prs, '[]'::jsonb))
  loop
    insert into personal_records (athlete_id, exercise, achieved_on, measure_kind, load_value, load_unit, load_reps)
    values (v_uid, v_pr->>'exercise', current_date, 'load', (v_pr->>'weight')::numeric, 'lb', (v_pr->>'reps')::int);
    insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at, source_entity_type)
    values (v_uid, 'ACCOMPLISHMENT', (v_pr->>'exercise') || ' — ' || (v_pr->>'weight') || ' lb PR',
            v_chapter, now(), 'personal_record');
    v_tl := v_tl + 1;
  end loop;

  if v_chapter is not null then
    update chapters set workout_count = workout_count + 1 where id = v_chapter;
  end if;

  return jsonb_build_object('workout_id', v_workout, 'timeline_added', v_tl);
end;
$$;
