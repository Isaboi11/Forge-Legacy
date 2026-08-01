-- Forge Legacy - APPLY: 0097 (cardio modality + incline)
--
-- Adds modality + incline_pct to workout_sets, so a logged cardio bout remembers HOW it was recorded.
-- Without modality, a treadmill run flipped to Outdoor renders a GPS route it never traced.
--
-- Replaces save_workout (same 11-arg signature as 0095/0096 - no drop needed) and
-- save_workout_as_template.
--
-- RUN AFTER 0096. Idempotent.

-- Forge Legacy — 0097: a logged cardio bout remembers HOW it was recorded
--
-- 0096 gave a set duration and distance, which is enough for a run that is only ever a number. It is not
-- enough once a block can be trained outdoors or on a treadmill, because two facts do not survive:
--
-- ══ 1. `modality` — THE ONE THAT PREVENTS A LIE ══
--
-- The athlete can flip the Outdoor/Treadmill toggle AFTER logging. Without a record of how the bout was
-- ACTUALLY recorded, a treadmill session flipped to Outdoor renders a solid, GPS-traced route — the app
-- claiming to know where somebody was when it measured nothing of the kind. In-session this is held on
-- the client as `loggedModality`; this column is where it lands so Activity History and Activity Detail
-- can honour it months later.
--
-- Written ONCE, at log time. The live toggle chooses a LAYOUT; it must never restyle a recorded result.
--
-- ══ 2. `incline_pct` — A TREADMILL FACT WITH NOWHERE TO GO ══
--
-- Incline is the one thing a treadmill knows that the road doesn't, and it changes what a pace means:
-- 10:00/mi at 6% is not 10:00/mi flat. Null outdoors, null on every strength set, and null on every set
-- written before this migration.
--
-- Both are nullable and additive, so nothing already stored changes meaning.
--
-- Depends on 0096. Idempotent. RUN AFTER 0096.

alter table public.workout_sets add column if not exists modality    text;
alter table public.workout_sets add column if not exists incline_pct numeric;

-- Only the two real answers, and only on a set that actually covered ground. A strength set has no
-- modality, and a constraint is cheaper than discovering 'Outdoor' with a capital O in a year's data.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'workout_sets_modality_valid') then
    alter table public.workout_sets
      add constraint workout_sets_modality_valid
      check (modality is null or modality in ('outdoor', 'indoor'));
  end if;
end $$;

comment on column public.workout_sets.modality is
  'How this bout was RECORDED: ''outdoor'' (GPS) or ''indoor'' (a clock, and a distance read off a machine). Written once at log time and never rewritten — the athlete can flip the card''s toggle afterwards, and without this a treadmill session would render a GPS route it never traced. Null on every strength set.';
comment on column public.workout_sets.incline_pct is
  'Treadmill incline for this bout, in percent. Null outdoors and on every strength set. Stored because it changes what a pace means: 10:00/mi at 6% is not 10:00/mi flat.';

-- ── save_workout carries them ─────────────────────────────────────────────────
-- Same 11-argument signature as 0095/0096, so `create or replace` is enough — no drop, no ambiguity.
-- Identical to 0096 apart from the two columns on the set insert.
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
  p_template_id   uuid default null
) returns jsonb
language plpgsql
security invoker
as $$
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
    insert into workout_exercises (workout_id, catalog_key, name, section, position)
    values (v_workout, v_ex->>'catalog_key', v_ex->>'name',
            coalesce((v_ex->>'section')::workout_section, 'main'), (v_ex->>'position')::int)
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

  -- Only when the caller didn't state one: a pure run passes its own distance and must not be doubled.
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

  v_honors := public.evaluate_honors('live_session');

  return jsonb_build_object('workout_id', v_workout, 'timeline_added', v_tl, 'program_id', v_program, 'template_id', v_template, 'honors', v_honors);
end;
$$;

-- ── a template keeps the block, and how it was done ───────────────────────────
-- Identical to 0096's deriver apart from carrying modality through, so a template made from a session
-- that ended on a treadmill comes back as a treadmill block rather than reverting to the road.
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
               'section', we.section,
               -- A block is recognised by having carried distance or duration, not by a stored flag: the
               -- evidence of what it was is the measurement itself.
               'kind', case when max(coalesce(ws.distance, 0)) > 0 or max(coalesce(ws.duration_sec, 0)) > 0
                            then 'cardio' else 'strength' end,
               'modality', max(ws.modality),
               'sets', count(ws.id)::int,
               'targetReps', coalesce(
                 (percentile_disc(0.5) within group (order by ws.reps) filter (where ws.reps is not null))::int,
                 0
               ),
               'targetMi', nullif(sum(coalesce(ws.distance, 0)), 0),
               'targetDurationSec', nullif(sum(coalesce(ws.duration_sec, 0)), 0)
             ) as obj
        from public.workout_exercises we
        left join public.workout_sets ws on ws.workout_exercise_id = we.id
       where we.workout_id = w.id
       group by we.id, we.position, we.catalog_key, we.name, we.section
    ) t;

  if v_ex = '[]'::jsonb then
    return null;
  end if;

  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null then
    v_name := left(coalesce(nullif(btrim(w.workout_name), ''), 'Saved Workout'), 60);
  end if;

  insert into public.workout_templates (athlete_id, name, exercises, source_workout_id)
  values (v_uid, v_name, v_ex, w.id)
  returning id into v_id;

  return v_id;
end;
$$;
