-- 0253 — continuing a finished workout adds to the exercise, not a second copy of it (workout-05, QA 09-26)
--
-- QA 09-26 workout-05: "Continue this workout" after sealing, log one more set of the bench, finish — and
-- the session's record showed Barbell Bench Press TWICE: the three sets from before, and a second bench
-- holding the one new set. `continue_workout` inserted a new `workout_exercises` row for every exercise it
-- was sent, always, at the end of the list. That is right for a lift ADDED after reopening and wrong for
-- a lift that was already there.
--
-- This changes one thing: an exercise sent with `into_position` is appended to the row saved at that
-- position — when that row is still the same lift (same name and catalogue key). Anything else, and every
-- exercise sent without the key, is inserted exactly as before.
--
-- ══ ⚠ HOW THE FUNCTION BODY BELOW WAS PRODUCED ══
--
-- By SCRIPT, from **0242** — the newest definition of `continue_workout` (0242 restated 0162's). One
-- substitution, asserted to match exactly once, and asserted to give back 0242's text byte for byte when
-- undone: the insert of the exercise row is wrapped in `if v_wex is null then … end if;` after a lookup of
-- the row named by `into_position`. The inserted lines keep their old indentation so the splice stays
-- checkable by eye. Nothing else changed — the window, the set insert, the PR insert (with 0242's
-- `workout_id`), the duration and the honors pass are 0242's.
--
-- ⚠ `create or replace` with the SAME signature, never DROP — a drop discards the EXECUTE grants
--   (0147 → 0150). The paste bundle's §2 asserts the grant is still there and that there is one overload.
--
-- ⚠ ORDER DOES NOT MATTER against the client:
--   · Before this is pasted, the new client sends `into_position` and the installed 0242 body ignores an
--     unknown key — the set lands under a second copy of the lift, which is exactly today's behaviour.
--   · After, with an old client that never sends the key, every exercise inserts as before.
--
-- ⚠ NO BACKFILL. Sessions already continued keep their duplicated rows; merging them would rewrite
--   history the athlete has seen.
--
-- Depends on 0125, 0151, 0162, 0242. Idempotent. RUN AFTER 0242.

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
    -- 0253. A set added to an exercise that is ALREADY in this workout goes under that exercise's row,
    -- not under a second copy of it. The client names the row by the position it was saved at
    -- (`into_position`); it is reused only if it is still the same lift — same name, same catalogue key —
    -- so a lift swapped after reopening appends as its own row, exactly as before.
    v_wex := null;
    if nullif(v_ex->>'into_position', '') is not null then
      select we.id into v_wex
        from public.workout_exercises we
       where we.workout_id = p_workout_id
         and we.position = (v_ex->>'into_position')::int
         and we.name = v_ex->>'name'
         and coalesce(we.catalog_key, '') = coalesce(v_ex->>'catalog_key', '')
       limit 1;
    end if;

    if v_wex is null then
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
    end if;

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
