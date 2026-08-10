-- ────────────────────────────────────────────────────────────────────────────────────────
-- APPLY — 0125 (continue an accidentally ended workout)
--
-- Paste this WHOLE FILE into the Supabase SQL editor and run it once. RUN AFTER 0124.
--
-- Re-runnable: one `create or replace` and read-only self-checks. No bare `create function`, no
-- `create trigger`, nothing that fails on a second pass.
--
-- ⚠ THE EDITOR SHOWS ONLY THE LAST RESULT SET, so the checks are one SELECT returning four columns.
-- Every one must come back TRUE.
--
--   function_exists              — it installed
--   window_enforced              — the 60-minute limit is in the SERVER, not just the app
--   leaves_chapter_count_alone   — ⭐ the one that matters most. Continuing is the SAME session; bumping
--                                  `chapters.workout_count` again would overstate the one number on the
--                                  Legacy screen that says how often you actually showed up, and it
--                                  would do it silently.
--   authenticated_can_execute    — the grant landed
-- ─────────────────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 0125 — continuing a workout you ended by accident
--
-- RUN AFTER 0124.
--
-- ══ WHY THIS CANNOT BE A SECOND `save_workout` ══
--
-- Finishing a workout is not one write. `save_workout` inserts the workout, its exercises and sets, any
-- personal records, a timeline event per record, bumps `chapters.workout_count`, marks the program
-- session complete, evaluates honors, and can graduate the program. Calling it twice for one session
-- would double every one of those — two entries in history, a chapter count that overstates how much the
-- athlete trained, and duplicate PR timeline events for the same lift on the same day.
--
-- So continuing APPENDS to the workout that already exists. What is added: exercises, sets, and any
-- records the new sets actually set. What is deliberately NOT touched:
--
--   · `chapters.workout_count` — this is the same session. Counting it again would inflate the one number
--     on the Legacy screen that is meant to say how many times they showed up.
--   · `program_sessions`  — 0119 already recorded which slot this satisfied, and its insert is
--     `on conflict do nothing` anyway. Graduation already happened or already did not.
--   · `workouts.started_at` — the session started when it started.
--
-- ══ THE WINDOW, AND WHY THE SERVER OWNS IT ══
--
-- Sixty minutes from `saved_at`. The case this exists for is "I tapped End and immediately realised I
-- wasn't done" — an hour covers that generously. Past it, this stops being one workout: reopening the
-- morning's session at night would let a single entry claim a whole day, and every duration, volume and
-- streak reading downstream would quietly inherit the lie.
--
-- The check is HERE rather than in the app because a device clock is an input, not a fact. The client
-- hides the button; the server is what makes it true.
--
-- Idempotent: `create or replace` only. Safe to run twice.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

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
      insert into public.workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps, duration_sec, distance, distance_unit, modality, incline_pct)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric,
              coalesce(v_set->>'weight_unit', 'lb'), (v_set->>'reps')::int,
              (v_set->>'duration_sec')::int, (v_set->>'distance')::numeric,
              case when (v_set->>'distance') is not null then coalesce(v_set->>'distance_unit', 'mi') else null end,
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

-- ── SELF-CHECKS (read-only) ────────────────────────────────────────────────────────────────────────
-- All must be TRUE.
select
  (select count(*) = 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'continue_workout')                as function_exists,
  (select pg_get_functiondef(p.oid) like '%60 minutes%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'continue_workout' limit 1)        as window_enforced,
  -- It must NOT touch the chapter counter. This is the same session, and counting it twice would
  -- overstate the one number on the Legacy screen that says how often they showed up.
  (select pg_get_functiondef(p.oid) not like '%workout_count%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'continue_workout' limit 1)        as leaves_chapter_count_alone,
  (select has_function_privilege('authenticated', p.oid, 'execute')
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'continue_workout' limit 1)        as authenticated_can_execute;
