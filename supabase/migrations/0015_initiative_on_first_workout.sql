-- Forge Legacy — 0015: Initiative also earned by the first logged workout
-- Onboarding-Amendment-003 §3: "Initiative" is the fresh athlete's FIRST MOVE — earned by whichever comes
-- first: building a program, choosing a suggested one (both grant client-side via claim_initiative_honor,
-- migration 0014), OR simply finishing the first workout for someone who trains without a program. This adds
-- the third trigger DB-side so it grants ATOMICALLY with the workout (appears in the workout-complete honor
-- hero, like first_workout_logged) and stays idempotent — honor_once + ON CONFLICT DO NOTHING make it a
-- no-op when the pick/build path already granted it. Redefines evaluate_honors only to add the branch;
-- everything else is verbatim from 0012.

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

  -- initiative (one-time): the FIRST-MOVE honor, also earned by the first logged session (for athletes who
  -- train without first building/choosing a program). Idempotent — a no-op if claim_initiative_honor (0014)
  -- already granted it at program build/choose.
  if v_total >= 1 then
    insert into honor_instances (athlete_id, honor_type, display_name, source)
    values (v_uid, 'initiative', 'Initiative', p_source) on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type','initiative','display_name','Initiative'));
      if v_live then insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', 'Initiative', now(), 'honor_instance'); end if;
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
