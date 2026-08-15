-- 0162 — the route and the climb: a run's shape survives the screen it was drawn on
--
-- PO, on a real 3.01-mile run: *"We need to make this better... it just looks like a line and not a
-- map."* Building a real map found there was nothing to draw it from. The track lives in React state
-- and is discarded the moment the athlete leaves the card — and so is the elevation gain the PO asked
-- for by name, which the app has measured and thrown away since the climb readout shipped.
--
-- ══ ⚠ THIS COLUMN WAS FORBIDDEN UNTIL A REVIEW SAID OTHERWISE ══
--
-- `Endurance-Statistics-Architecture-Amendment-001.md` §9 forbids storing route/GPS track data
-- "without a separate, dedicated architecture review", on the strength of
-- `External-Activity-Import-Architecture-Evaluation.md` §3's finding that route geometry is a
-- materially higher privacy surface than anything this schema holds — home-location inference.
--
-- That review is `Docs/Amendments/Route-And-Elevation-Persistence-Amendment-001.md`, approved.
-- Its load-bearing decision, D-RTE-1, is the reason this column is safe to add:
--
--   ⚠ THE FIRST AND LAST 200 M ARE REMOVED BEFORE THE ROUTE IS WRITTEN. Not hidden at read time —
--     REMOVED. A route stored whole and masked in the UI still has the athlete's front door in the
--     database, recoverable by any bug, any export, any breach. The trim happens in
--     `src/domain/run/route-privacy.ts` and what reaches this column has never contained it.
--
-- This migration cannot enforce that, and must not pretend to: a client that stops trimming would write
-- an untrimmed route past any check here. §5 asserts what it CAN — that the column takes an encoded
-- polyline and not raw coordinates, which is the shape a forgotten trim would most likely arrive in.
--
-- ══ ⚠ HOW THE TWO FUNCTION BODIES BELOW WERE PRODUCED ══
--
-- By SCRIPT, not by hand, from **0151** — the newest body of each. Two substitutions per function, each
-- asserted to match exactly once, plus structural checks that `PROGRAM_GRADUATED`, the honors call,
-- `program_slots` and the `v_legs` rollup all survived the transform. 0151's header records that
-- rebuilding from a partial read has silently deleted a shipped feature four times here.
--
-- ⚠ `create or replace`, never DROP. A drop discards the EXECUTE grants — including the one 0150 had
--   to restore after 0147 revoked it and broke every workout save. §4 asserts they are still there.
--
-- ⚠ ORDER DOES NOT MATTER against the client. A deploy before this migration sends jsonb keys nothing
--   reads; this migration before the deploy reads keys nothing sends. Both store no route and neither
--   errors. That is deliberate — there is no window in which a save fails.
--
-- Depends on 0096 (`workout_sets` cardio columns), 0151. Idempotent. RUN AFTER 0151.

-- ── 1 · The columns ──────────────────────────────────────────────────────────
--
-- Nullable, and NULL is the common case: every set ever written predates them, every strength set has
-- no route, and every treadmill bout is indoors by definition.

alter table public.workout_sets add column if not exists route   text;
alter table public.workout_sets add column if not exists climb_m integer;

comment on column public.workout_sets.route is
  'Outdoor cardio only — the shape of the bout as a Google-encoded polyline, precision 5 (0162). ⚠ TRIMMED BEFORE IT IS WRITTEN: the first and last 200 m of travel are removed client-side by src/domain/run/route-privacy.ts under D-RTE-1, so this column has never held the athlete''s start or end point. NULL when indoors, untracked, or too short to survive the trim. Never shared with any other athlete (D-RTE-5) and never a source of distance — that is the distance column, computed from the UNtrimmed track.';

comment on column public.workout_sets.climb_m is
  'Total elevation gain for the bout, in METRES (0162). NULL, never 0, when the device reported no usable altitude — "we could not tell" is not "it was flat", the distinction hasClimbData draws client-side. A scalar carries none of the location-inference risk that made the route column need an architecture review.';

-- ── 2 · `save_workout` writes them (0151's body, transformed by script — see the header) ─────────

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
  p_template_id   uuid default null,
  p_program_week  integer default null,
  p_program_day   integer default null
) returns jsonb
language plpgsql
security invoker
as $fn$
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
  v_prog     record;
  v_total    int;
  v_done     int;
  v_grad     jsonb := null;
  v_wk       int;
  v_dy       int;
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
    insert into workout_exercises (workout_id, catalog_key, name, notes, section, position, group_id, group_name, group_kind, group_rounds)
    values (v_workout, v_ex->>'catalog_key', v_ex->>'name', nullif(v_ex->>'notes', ''),
            coalesce((v_ex->>'section')::workout_section, 'main'), (v_ex->>'position')::int,
            nullif(v_ex->>'group_id', ''), nullif(v_ex->>'group_name', ''),
            -- Anything the client did not label is a circuit, which is what the read side assumes too.
            case when nullif(v_ex->>'group_id', '') is null then null
                 when v_ex->>'group_kind' = 'superset' then 'superset'
                 else 'circuit' end,
            (v_ex->>'group_rounds')::int)
    returning id into v_wex;

    for v_set in select value from jsonb_array_elements(coalesce(v_ex->'sets', '[]'::jsonb))
    loop
      insert into workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps, duration_sec, distance, distance_unit, floors, modality, incline_pct, route, climb_m)
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

      v_legs := v_legs + coalesce((v_set->>'distance')::numeric, 0);
    end loop;
  end loop;

  -- Only when the caller did not state one: a pure run passes its own distance and must not be doubled.
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

  -- ══ WHICH SESSION THIS WAS, AND THEN GRADUATION (0119, restoring 0104 — see the header) ══
  --
  -- Its own exception block, on 0018's principle: the session is the thing worth saving. A failure here
  -- is loud in the Postgres log rather than surfacing months later as a graduation that never happened,
  -- which is exactly how 0106's silent deletion of this block went unnoticed.
  if v_program is not null then
    begin
      select p.name, p.structure, p.started_at, p.state
        into v_prog
        from programs p
       where p.id = v_program and p.athlete_id = v_uid
         for update;

      if found and v_prog.state = 'active' then
        -- The athlete's explicit choice, validated against the real schedule; otherwise the first
        -- session with no row against it. Both go through program_slots, so neither can name a session
        -- the program does not prescribe.
        select s.week_index, s.day_index into v_wk, v_dy
          from public.program_slots(v_prog.structure) s
         where (p_program_week is not null and p_program_day is not null
                  and s.week_index = p_program_week and s.day_index = p_program_day)
            or (p_program_week is null and p_program_day is null
                  and not exists (select 1 from public.program_sessions ps
                                   where ps.program_id = v_program
                                     and ps.week_index = s.week_index and ps.day_index = s.day_index))
         order by s.ordinal
         limit 1;

        if v_wk is not null then
          -- `do nothing` on conflict: re-training a session already logged keeps the FIRST record rather
          -- than rewriting which workout satisfied it.
          insert into public.program_sessions (program_id, athlete_id, week_index, day_index, state, workout_id)
          values (v_program, v_uid, v_wk, v_dy, 'completed', v_workout)
          on conflict (program_id, week_index, day_index) do nothing;
        end if;

        v_total := public.program_total_sessions(v_prog.structure);
        select count(*) into v_done from public.program_sessions ps where ps.program_id = v_program;

        -- `>=`, not `=`: two devices racing can put the count past the total, and an athlete past the end
        -- has still finished. A NULL total makes the comparison null, and null is not "graduate".
        if v_done >= v_total then
          update programs
             set state = 'graduated', ended_at = now(), updated_at = now()
           where id = v_program and athlete_id = v_uid and state = 'active';

          -- The `state = active` predicate IS the idempotency guard: a second concurrent save blocks on
          -- the row lock, re-evaluates once granted, and updates nothing.
          if found then
            insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at,
                                         source_entity_type, source_entity_id)
            values (v_uid, 'PROGRAM_GRADUATED', v_prog.name, v_chapter, now(), 'program', v_program);
            v_tl := v_tl + 1;

            v_grad := jsonb_build_object(
              'program_id',   v_program,
              'program_name', v_prog.name,
              'started_at',   v_prog.started_at,
              'graduated_at', now(),
              -- Sessions ACCOUNTED FOR, which is not the same as sessions trained. The ceremony is told
              -- both, so it can never present a skip as a workout.
              'sessions',     v_done,
              'trained',      (select count(*) from public.program_sessions ps
                                where ps.program_id = v_program and ps.state = 'completed'),
              'skipped',      (select count(*) from public.program_sessions ps
                                where ps.program_id = v_program and ps.state = 'skipped')
            );
          end if;
        end if;
      end if;
    exception when others then
      v_grad := null;
      raise warning 'save_workout: session/graduation step failed for program % (% %)', v_program, sqlstate, sqlerrm;
    end;
  end if;

  v_honors := public.evaluate_honors('live_session');

  return jsonb_build_object('workout_id', v_workout, 'timeline_added', v_tl, 'program_id', v_program, 'template_id', v_template, 'honors', v_honors, 'graduated', v_grad);
end;
$fn$;

-- ── 3 · `continue_workout` writes them too (0151's body, same transform) ─────────────────────────

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

-- ── 4 · Assert. A replace that did not land must not report success. ─────────
--
-- ⚠ STRUCTURAL CHECKS DO NOT PROVE THE FUNCTION RUNS. PL/pgSQL binds record fields at RUN time, which
--   is how 0091 shipped a body that compiled clean and failed on the first button press. The button
--   press for this one is at the bottom of the file.

do $$
declare
  v_save     text;
  v_continue text;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'workout_sets' and column_name = 'route'
  ) then
    raise exception '0162: workout_sets.route does not exist — §1 did not land.';
  end if;
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'workout_sets' and column_name = 'climb_m'
  ) then
    raise exception '0162: workout_sets.climb_m does not exist — §1 did not land.';
  end if;

  select string_agg(pg_get_functiondef(p.oid), E'\n') into v_save
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'save_workout';
  select string_agg(pg_get_functiondef(p.oid), E'\n') into v_continue
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'continue_workout';

  if v_save is null or v_save not like '%(v_set->>''climb_m'')::int%' then
    raise exception '0162: the installed save_workout does not write climb_m — the replace did not land.';
  end if;
  if v_continue is null or v_continue not like '%(v_set->>''climb_m'')::int%' then
    raise exception '0162: the installed continue_workout does not write climb_m — the replace did not land.';
  end if;

  -- ⚠ THE NEGATIVE THAT MATTERS. A route must never become a distance. `distance` is computed from the
  --   UNtrimmed track and read as miles by goals (0035), honors (0078), challenges (0061) and squad
  --   totals (0107); deriving it from a TRIMMED polyline would silently shorten every run by 400 m.
  --
  -- ⚠ A REGEX, AND THE FIRST DRAFT OF THIS CHECK WAS A LIKE THAT COULD NEVER PASS.
  --   It read: v_save like '%v_legs%route%' — "v_legs occurs somewhere, and route occurs somewhere
  --   after it". v_legs is DECLARED at the top of the function and the insert carrying the route is
  --   two hundred lines below, so every correct body matches it. It rejected the very migration it
  --   shipped in. The question is local, so the pattern has to be: does the v_legs ASSIGNMENT
  --   EXPRESSION — up to its semicolon — mention the route?
  if v_save ~ 'v_legs\s*:=[^;]*route' then
    raise exception '0162: save_workout is deriving mileage from the route — distance must come from the untrimmed track.';
  end if;
  if v_save not like '%v_legs := v_legs + coalesce((v_set->>''distance'')::numeric, 0)%' then
    raise exception '0162: the v_legs distance rollup is gone from save_workout — the transform damaged the body.';
  end if;

  -- The branches this schema has lost to a rebuild before, checked on the INSTALLED text.
  if v_save not like '%PROGRAM_GRADUATED%'
     or v_save not like '%evaluate_honors(''live_session'')%'
     or v_save not like '%program_slots%' then
    raise exception '0162: save_workout lost a shipped branch in the transform — do not keep this body.';
  end if;

end $$;

-- 0150's lesson, as its own block: a revoke here broke every workout save with every gate green.
do $$
declare r record;
begin
  for r in
    select p.oid, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('save_workout', 'continue_workout')
  loop
    if not has_function_privilege('authenticated', r.oid, 'EXECUTE') then
      raise exception '0162: authenticated cannot EXECUTE %(oid %) — the grant was lost.', r.proname, r.oid;
    end if;
  end loop;
end $$;

-- ── 5 · The shape guard ──────────────────────────────────────────────────────
--
-- What this file CAN check about a privacy rule it cannot enforce. A client that forgot to encode —
-- and therefore almost certainly forgot to trim — writes raw coordinates, and those are refused here.
-- It is a shape check, not a proof of trimming, and is labelled as such deliberately.
--
-- ⚠ THE TEST IS DIGITS, COMMAS AND QUOTES — NOT BRACKETS. An encoded polyline is ASCII 63–126, and that
--   range CONTAINS `[ \ ] { | } ~`; a constraint excluding brackets would reject perfectly valid
--   polylines and break the save it was written to protect. Everything raw coordinates cannot do
--   without — digits (48–57), `,` (44), `.` (46), `"` (34) — sits BELOW 63 and cannot appear in an
--   encoded one, which makes those the honest discriminator.

alter table public.workout_sets drop constraint if exists workout_sets_route_is_polyline;
alter table public.workout_sets add constraint workout_sets_route_is_polyline
  check (route is null or (route !~ '[0-9",]' and length(route) between 2 and 65536));

-- ── 6 · Result, as ROWS ──────────────────────────────────────────────────────

select 'columns' as check, count(*)::text as value
  from information_schema.columns
 where table_schema = 'public' and table_name = 'workout_sets' and column_name in ('route', 'climb_m')
union all
select 'save_workout writes route',
       case when pg_get_functiondef(p.oid) like '%(v_set->>''route'')%' then 'yes' else 'NO' end
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'save_workout'
union all
select 'continue_workout writes route',
       case when pg_get_functiondef(p.oid) like '%(v_set->>''route'')%' then 'yes' else 'NO' end
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'continue_workout'
union all
select 'existing rows with a route', count(*)::text
  from public.workout_sets where route is not null;

-- ── 7 · The button press this file cannot make ───────────────────────────────
--
-- Applying this proves the SQL. It does not prove a run stores its shape, and it cannot: the trim, the
-- encoding and the decision not to send a route at all live in the client. Finish one outdoor bout and
-- confirm (a) a route came back at all, (b) it does NOT start where the run started — D-RTE-1 is the
-- whole reason this column was allowed to exist, and a client that quietly stopped trimming would look
-- exactly like one that is working.
