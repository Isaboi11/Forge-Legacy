-- Forge Legacy — 0094: save_workout_as_template read a column that does not exist
--
-- 0091 named the fallback title `w.name`. The column is `workout_name` — it has been since 0001, where
-- `name` is what `workout_exercises` calls its lift. So every attempt to save a finished session as a
-- template failed with:
--
--     record "w" has no field "name" (42703)
--
-- PL/pgSQL resolves record fields at RUN time, not at CREATE time, so the function compiled cleanly, the
-- migration reported success, and the error only appeared when an athlete pressed the button. Nothing in
-- the apply step could have caught it; only using it could.
--
-- Identical to 0091's function apart from that one identifier.
--
-- Depends on 0091. Idempotent. RUN AFTER 0093.

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
               'sets', count(ws.id)::int,
               -- The set a plan should aim at, not the best one: the median rep count, rounded down, so
               -- one heavy triple among five eights doesn't rewrite the target.
               'targetReps', coalesce(
                 (percentile_disc(0.5) within group (order by ws.reps))::int,
                 0
               )
             ) as obj
        from public.workout_exercises we
        left join public.workout_sets ws on ws.workout_exercise_id = we.id and ws.reps is not null
       where we.workout_id = w.id
       group by we.id, we.position, we.catalog_key, we.name
    ) t;

  -- Nothing was logged; there is no shape to keep.
  if v_ex = '[]'::jsonb then
    return null;
  end if;

  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null then
    -- THE FIX: workouts.workout_name, not workouts.name.
    v_name := left(coalesce(nullif(btrim(w.workout_name), ''), 'Saved Workout'), 60);
  end if;

  insert into public.workout_templates (athlete_id, name, exercises, source_workout_id)
  values (v_uid, v_name, v_ex, w.id)
  returning id into v_id;

  return v_id;
end;
$$;
