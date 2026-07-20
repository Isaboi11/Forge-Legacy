-- Forge Legacy — 0014: Initiative honor (the first-move / "Legacy Unlocked" honor)
-- A one-time honor earned when a fresh athlete commits to a starting program — BUILT or CHOSEN. Unlike the
-- workout-count honors in evaluate_honors (0012), Initiative has no workout to hang on, and the "chose a
-- suggestion" path commits no row to count — so it is granted by its own client-callable RPC rather than
-- inside save_workout. It reuses the EXACT machinery of the workout honors: the honor_instances table, the
-- honor_once partial unique index + ON CONFLICT DO NOTHING for DB-enforced grant-once, and the same live
-- HONOR_EARNED timeline event. So Initiative behaves identically to first_workout_logged — it is simply
-- triggered by program-commit instead of workout-count. It does NOT modify evaluate_honors.

create or replace function claim_initiative_honor(p_source text default 'live_session') returns jsonb
language plpgsql security invoker as $$
declare
  v_uid  uuid := auth.uid();
  v_new  jsonb := '[]'::jsonb;
  v_live boolean := (p_source = 'live_session');
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  -- initiative (one-time): earned on the first program built or chosen. Idempotent via honor_once, so
  -- calling this on every accept / build / re-pick can only ever produce one row.
  insert into honor_instances (athlete_id, honor_type, display_name, source)
  values (v_uid, 'initiative', 'Initiative', p_source) on conflict do nothing;
  if found then
    v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type','initiative','display_name','Initiative'));
    if v_live then insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
      values (v_uid, 'HONOR_EARNED', 'Initiative', now(), 'honor_instance'); end if;
  end if;

  return v_new;
end; $$;
