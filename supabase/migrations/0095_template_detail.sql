-- Forge Legacy — 0095: W-27 Template Detail — the link from a session back to the template it came from
--
-- 0091 created templates and 0094 made them saveable. Nothing recorded that a WORKOUT came from one, so
-- the detail screen's two most substantial sections had no source: "Times used" and the session history.
--
-- ══ DERIVED, NOT COUNTED ══
--
-- The obvious shape is `workout_templates.use_count`, incremented on start. Two things are wrong with it:
--
--   1. A COUNTER CAN DRIFT AND NEVER SELF-CORRECT. Increment on start and an abandoned session inflates
--      it forever; increment on save and a delete leaves it high. There is no repair path — nothing can
--      tell you what the number SHOULD be.
--   2. IT ANSWERS A DIFFERENT QUESTION. "Times used" means the sessions you actually trained. A workout
--      row IS that fact, already durable, already dated.
--
-- So `workouts.template_id` is the single source and both the count and the last-used date are derived
-- from it — the same rule the notification feed and the timeline follow. An abandoned start is never
-- counted, because a session that was never saved is not a session you trained.
--
-- `on delete set null` is not a default, it is the delete copy holding: "Logged sessions in your history
-- stay." Cascading would make that sentence a lie.
--
-- ══ SECTIONS SURVIVE THE ROUND TRIP ══
--
-- `workout_exercises.section` (warm-up / main / cool-down) has existed since 0001 and the detail screen
-- groups by it, with Main marked in bronze and the other two recessed. 0091 dropped it when deriving a
-- template, so every template read back as one undifferentiated block. Carried through now; a template
-- written before this migration has no `section` and reads as 'main', which is what it was.
--
-- Depends on 0091 (workout_templates), 0094. Idempotent. RUN AFTER 0094.

-- ── 1. The link ───────────────────────────────────────────────────────────────
alter table public.workouts
  add column if not exists template_id uuid references public.workout_templates(id) on delete set null;

create index if not exists workouts_template on public.workouts (template_id, saved_at desc)
  where template_id is not null;

comment on column public.workouts.template_id is
  'The template this session was trained from, when it was. Null for a program session or a freestyle one. ON DELETE SET NULL because deleting a template must not delete the sessions — the delete confirmation promises exactly that. "Times used" and "Last trained" are DERIVED from these rows rather than stored, so they cannot drift out of step with the history shown directly beneath them.';

-- ── 2. save_workout carries it ────────────────────────────────────────────────
-- The 10-arg version is DROPPED, not left alongside. A defaulted 11th parameter creates an OVERLOAD, and
-- a 10-argument call would then match both signatures and fail as ambiguous.
drop function if exists save_workout(text, modality, timestamptz, integer, text, jsonb, jsonb, uuid, numeric, text);

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
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select id into v_chapter from chapters where athlete_id = v_uid and is_active limit 1;

  if p_program_id is not null then
    select id into v_program from programs where id = p_program_id and athlete_id = v_uid;
  end if;

  -- Same ownership check the program attribution makes: a template id you don't own degrades to an
  -- unattributed workout rather than crediting someone else's library.
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
      insert into workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric,
              coalesce(v_set->>'weight_unit', 'lb'), (v_set->>'reps')::int);
    end loop;
  end loop;

  for v_pr in select value from jsonb_array_elements(coalesce(p_prs, '[]'::jsonb))
  loop
    -- `catalogKey` is optional: a caller that doesn't send it stores null and the honor matcher falls back
    -- to the canonical name, exactly as it does for every PR written before this migration.
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

  -- Inside the transaction, as 0012 intended: a rollback takes the honors with it.
  v_honors := public.evaluate_honors('live_session');

  return jsonb_build_object('workout_id', v_workout, 'timeline_added', v_tl, 'program_id', v_program, 'template_id', v_template, 'honors', v_honors);
end;
$$;

-- ── 3. A template keeps its sections ──────────────────────────────────────────
-- Identical to 0094 apart from carrying `section` through into each exercise.
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

-- ── 4. The detail read ────────────────────────────────────────────────────────
-- One call for the whole screen. `history` carries the WORKOUT ID, which is the fix for the design's
-- largest functional gap: there, every history row and "View all" navigated to the same session-less
-- Activity Detail, so tapping the March session and tapping the June one landed identically.
create or replace function public.template_detail(p_template uuid)
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select jsonb_build_object(
           'id', t.id,
           'name', t.name,
           'exercises', t.exercises,
           'created_at', t.created_at,
           -- Derived, both of them. See the header.
           'use_count', (select count(*) from public.workouts w where w.template_id = t.id and w.state = 'saved'),
           'last_used_at', (select max(w.saved_at) from public.workouts w where w.template_id = t.id and w.state = 'saved'),
           'history', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'workout_id', h.id,
                      'at', h.saved_at,
                      'duration_sec', h.duration_sec,
                      'note', h.notes
                    ) order by h.saved_at desc)
               from public.workouts h
              where h.template_id = t.id and h.state = 'saved'
           ), '[]'::jsonb)
         )
    from public.workout_templates t
   where t.id = p_template and t.athlete_id = auth.uid();
$$;

-- ── 5. The list agrees with the detail ────────────────────────────────────────
-- The list screen ordered by the stored `workout_templates.last_used_at`, which nothing has ever written
-- — so "most recently used first" silently meant "most recently created first". Both surfaces now read
-- the same derived values, so the list cannot claim one thing and the detail another.
create or replace function public.workout_templates_list()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(x.obj order by x.last_used_at desc nulls last, x.created_at desc), '[]'::jsonb)
    from (
      select t.created_at,
             (select max(w.saved_at) from public.workouts w where w.template_id = t.id and w.state = 'saved') as last_used_at,
             jsonb_build_object(
               'id', t.id,
               'name', t.name,
               'exercises', t.exercises,
               'created_at', t.created_at,
               'use_count', (select count(*) from public.workouts w where w.template_id = t.id and w.state = 'saved'),
               'last_used_at', (select max(w.saved_at) from public.workouts w where w.template_id = t.id and w.state = 'saved')
             ) as obj
        from public.workout_templates t
       where t.athlete_id = auth.uid()
    ) x;
$$;

comment on function public.template_detail(uuid) is
  'W-27 Template Detail in one read. use_count and last_used_at are DERIVED from workouts.template_id, never stored — a counter would drift on an abandoned start or a deleted session with no way to repair it. Each history entry carries its workout_id so a row opens ITS session.';
