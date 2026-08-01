-- Forge Legacy - APPLY BUNDLE 0095-0097 (template detail, conditioning legs, cardio modality)
--
-- 0001-0094 are already applied. This is the remainder of the chain, in order.
-- Every statement is idempotent, so a re-run is safe if you are unsure what landed.
--
--   0095 template detail      workouts.template_id + template_detail() + workout_templates_list()
--   0096 conditioning legs    workout_sets.duration_sec/distance/distance_unit + the roll-up
--   0097 cardio modality      workout_sets.modality/incline_pct, carried into derived templates
--
-- ══ RUN AS ONE BATCH — SPLITTING THIS ONE FAILS SILENTLY, NOT LOUDLY ══
--
-- All three replace the SAME two functions, each superseding the last:
--
--   * `save_workout` — 0095 drops the 10-arg version and creates the 11-arg one (template_id); 0096 and
--     0097 replace that same signature to carry the set's duration/distance, then modality/incline.
--     Stop at 0095 and the client still sends a cardio block's duration and distance in the set JSON —
--     the function just doesn't read those keys, so the bout is written as an empty set. No error.
--
--   * `save_workout_as_template` — 0097's deriver emits `kind: 'cardio'` and `targetMi`; 0096's emits
--     `kind: 'distance'` and `targetDistanceMi`. The app reads the 0097 names (`templates-live.ts`),
--     so stopping at 0096 makes every cardio block in a derived template read back as strength with no
--     distance. Also no error.
--
-- Both failure modes are lost data that looks like a working save, which is why this is one paste.


-- ==========================================================================
-- 0095_template_detail.sql
-- ==========================================================================

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


-- ==========================================================================
-- 0096_conditioning_legs.sql
-- ==========================================================================

-- Forge Legacy — 0096: a run can be part of a workout, anywhere in it
--
-- Until now a session was either strength (exercises and sets) or a distance activity (one `workouts.distance`
-- on the row). A program day ending "…then 20 minutes easy" had no representation: you logged the lifts,
-- then logged a run, and Activity History showed two things because that is what they were.
--
-- ══ WHY THE DISTANCE MOVES TO THE SET ══
--
-- `workouts.distance` is ONE number on the workout row. That is right for a pure run and wrong for a
-- session, for two reasons:
--
--   1. A CONDITIONING LEG HAS A POSITION. "Row 500m, then squat, then run a mile" is an ordinary session,
--      and a single column on the parent cannot say where in the session the distance happened.
--   2. THERE CAN BE MORE THAN ONE. Two legs collapse into one number and stop being two legs.
--
-- A conditioning leg is therefore an ordinary `workout_exercises` row whose set carries duration and
-- distance instead of weight and reps. Everything that already walks a session — Activity Detail, the
-- template deriver, the honor evaluator — keeps working, because the shape did not change; it gained
-- columns that are null for every strength set ever written.
--
-- ══ THE ROLL-UP ══
--
-- `workouts.distance` is still SET, from the sum of the session's conditioning legs, whenever the caller
-- did not supply one directly. So a mixed session appears in Activity History with its miles, and the
-- distance-goal machinery from 0034–0039 counts it, without a single reader being changed. A pure run
-- (saveActivity) passes `p_distance` explicitly and is untouched by this.
--
-- Depends on 0001 (workout_sets), 0095 (the 11-arg save_workout). Idempotent. RUN AFTER 0095.

alter table public.workout_sets add column if not exists duration_sec  integer;
alter table public.workout_sets add column if not exists distance      numeric;
alter table public.workout_sets add column if not exists distance_unit text;

comment on column public.workout_sets.duration_sec is
  'Seconds this bout lasted. Set on a conditioning leg (a run, row, ride); null on a strength set, where the meaningful numbers are weight and reps.';
comment on column public.workout_sets.distance is
  'Distance covered in this bout, in the unit named by distance_unit (always ''mi'' as written by this app — miles are the canonical stored unit, converted only for display). Null on a strength set.';

-- ── save_workout carries them ─────────────────────────────────────────────────
-- Same 11-argument signature as 0095, so `create or replace` is enough — no drop, no ambiguity. The set
-- insert gains three columns and the workout gains the roll-up.
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
      insert into workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps, duration_sec, distance, distance_unit)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric,
              coalesce(v_set->>'weight_unit', 'lb'), (v_set->>'reps')::int,
              (v_set->>'duration_sec')::int, (v_set->>'distance')::numeric,
              case when (v_set->>'distance') is not null then coalesce(v_set->>'distance_unit', 'mi') else null end);

      v_legs := v_legs + coalesce((v_set->>'distance')::numeric, 0);
    end loop;
  end loop;

  -- Only when the caller didn't state one: a pure run passes its own distance and must not be doubled.
  if p_distance is null and v_legs > 0 then
    update workouts set distance = v_legs, distance_unit = 'mi' where id = v_workout;
  end if;

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

-- ── Templates keep a conditioning leg's target ────────────────────────────────
-- Without this a template made from a session ending in a run comes back as strength-only, and the leg
-- silently disappears the next time you train it.
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
               -- A leg is recognised by having carried distance or duration, not by a stored flag: the
               -- evidence of what it was is the measurement itself.
               'kind', case when max(coalesce(ws.distance, 0)) > 0 or max(coalesce(ws.duration_sec, 0)) > 0
                            then 'distance' else 'strength' end,
               'sets', count(ws.id)::int,
               -- FILTER, not a join predicate. 0094 excluded rep-less sets in the join itself, which was
               -- fine while every set had reps — a conditioning leg has none, so that join would have
               -- counted its sets as zero and dropped the leg from the template entirely. Filtering only
               -- the median keeps strength behaviour identical and lets a leg through.
               'targetReps', coalesce(
                 (percentile_disc(0.5) within group (order by ws.reps) filter (where ws.reps is not null))::int,
                 0
               ),
               -- Kept as the target to aim at next time, the same way median reps are.
               'targetDistanceMi', nullif(sum(coalesce(ws.distance, 0)), 0),
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


-- ==========================================================================
-- 0097_cardio_modality_incline.sql
-- ==========================================================================

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
