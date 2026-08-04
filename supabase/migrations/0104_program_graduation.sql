-- Forge Legacy — 0104: a program can finally graduate
--
-- ══ THE DEFECT ══
--
-- Nothing in this app or this database has ever written `programs.state = 'graduated'`. The only client
-- call is endProgram(id, 'ended_early'); the only SQL that writes the column is 0017, which sets 'active'
-- and 'ended_early'. Every other mention of 'graduated' across 103 migrations is a READ.
--
-- So `programs_graduated` has been permanently 0 for every athlete, and therefore:
--   · the five Programs honors (0099) could never fire — rows in a catalog waiting on a number that
--     never moved;
--   · `programGraduations` gated the rank ladder at Architect and above, so nobody could pass Craftsman;
--   · the M-4 ceremony, its locked copy, its queue priority and its share plumbing were all built and
--     reachable only from a dev harness;
--   · `PROGRAM_GRADUATED` timeline events were never written, though the read side renders them fine.
--
-- Program-Architecture-Amendment-001 §4 (LOCKED): "A program graduates when the athlete logs the final
-- scheduled workout." Automatic, never manual. M-4 decision M4-D1 (LOCKED): "State transition timing:
-- Active → Graduated AT SESSION SAVE. Transition is atomic with workout log persistence." So it belongs
-- inside save_workout, and that is where this puts it.
--
-- Two live violations of the same locked amendment are closed here too:
--   · start_program never checked the current state, so W-3's "Run Again" REACTIVATED a sealed record.
--     §1: "A Graduated program cannot be reactivated… History cannot be rewritten."
--   · programs could be deleted in any state. §6: graduated and ended programs "may never be deleted."
--
-- Depends on 0013 (programs), 0017 (state + start_program), 0019 (source_definition_id),
-- 0097 (the live save_workout body), 0099/0100 (honor_metrics). Idempotent. RUN AFTER 0103.
--
-- ══ RUN THIS FIRST, ON ITS OWN, AND READ THE ANSWER ══
--
-- The backfill at the end writes `state` across every athlete. This is the same query with no write —
-- it tells you exactly which programs are about to be sealed, before you commit to anything:
--
--   select p.athlete_id, p.name,
--          (select count(*) from public.workouts w where w.program_id = p.id and w.state = 'saved') as logged
--     from public.programs p
--    where p.state = 'active'
--      and (select count(*) from public.workouts w where w.program_id = p.id and w.state = 'saved') > 0
--    order by p.athlete_id;
--
-- (program_total_sessions does not exist until this migration runs, so the dry run shows candidates by
-- logged count; the backfill itself applies the real threshold.)

begin;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. HOW MANY SESSIONS A PROGRAM PRESCRIBES
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- ⚠ THIS RULE EXISTS TWICE. The other copy is `totalSessions` / `weekSizes` in
-- `src/domain/program/progress-core.ts`, and the two must change together.
--
-- It exists twice on purpose: save_workout has to decide graduation WITHOUT TRUSTING THE CLIENT, because
-- what a graduation buys is five never-revocable honors and a rank family. A client-supplied "this was
-- my last session" flag would be the one number in the app that anyone with a PostgREST call could
-- assert. And a stored `sessions_total` column was rejected on this repo's own precedent — 0098 is a
-- whole migration about a stored derived count that "drifts on any path its author did not think of and
-- has no repair path"; it would also go stale the moment W-5 edits a Future program's structure.
--
-- WEEKS ARE NOT ALL THE SAME SIZE. A real block runs six days for two weeks then five, or drops a
-- conditioning day in a deload — so this SUMS each week's own built-day count. It is not
-- weeks × daysPerWeek; deriving one number from week 1 and multiplying reports a length the program
-- does not have (see the comment on `weekSizes`, which was written after that exact bug went live).
--
-- TOTAL BY CONSTRUCTION. It runs inside the Finish commit, so it must never raise, whatever jsonb it is
-- handed: typed reads (`jsonb_typeof(...) = 'number'`), never bare casts — `(j->>'weeks')::int` on
-- {"weeks":"four"} raises and would cost the athlete a logged session.
--
-- NULL means "this structure prescribes no schedule at all". Callers MUST read null as "do not
-- graduate", never as zero.
create or replace function public.program_total_sessions(p_structure jsonb)
returns integer
language sql
immutable
parallel safe
as $$
  with s as (select coalesce(p_structure, '{}'::jsonb) as j),
  n as (
    select case when jsonb_typeof(s.j->'weeks') = 'number'
                then greatest(1, floor((s.j->>'weeks')::numeric)::int) else 1 end as weeks,
           case when jsonb_typeof(s.j->'daysPerWeek') = 'number'
                then floor((s.j->>'daysPerWeek')::numeric)::int else 0 end as dpw,
           s.j as j
      from s
  ),
  -- plannedDays(structure, wi): that week's own plan in Customize mode, else the repeating template.
  wk as (
    select gs.wi,
           case
             when n.j->'vary' = 'true'::jsonb
              and jsonb_typeof(n.j->'weekPlans'->gs.wi->'days') = 'array'
               then n.j->'weekPlans'->gs.wi->'days'
             when jsonb_typeof(n.j->'days') = 'array'
               then n.j->'days'
             else null
           end as days,
           n.dpw
      from n, generate_series(0, n.weeks - 1) as gs(wi)
  ),
  -- trainingDays(): a day the athlete owes is one that prescribes something.
  sized as (
    select wk.wi,
           wk.days is null as no_schedule,
           greatest(1, coalesce(nullif((
             select count(*) from jsonb_array_elements(coalesce(wk.days, '[]'::jsonb)) d
              where jsonb_typeof(d) = 'object'
                and (case when jsonb_typeof(d->'warmup')   = 'array' then jsonb_array_length(d->'warmup')   else 0 end)
                  + (case when jsonb_typeof(d->'main')     = 'array' then jsonb_array_length(d->'main')     else 0 end)
                  + (case when jsonb_typeof(d->'cooldown') = 'array' then jsonb_array_length(d->'cooldown') else 0 end) > 0
           )::int, 0), wk.dpw)) as size
      from wk
  )
  select case when bool_or(no_schedule) then null else sum(size)::int end from sized;
$$;

comment on function public.program_total_sessions(jsonb) is
  'How many sessions a program prescribes: the SUM over weeks of that week''s built-day count (a day with
   no exercises is not a session owed), falling back to the configured daysPerWeek, floored at 1 per week.
   SQL twin of totalSessions()/weekSizes() in src/domain/program/progress-core.ts — it exists twice only
   because save_workout must decide graduation without trusting the client. NULL means the structure
   prescribes no schedule; read it as "do not graduate", never as zero. Total by construction: it never
   raises, whatever jsonb it is handed. Migration 0104.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. SELF-CHECK A — the rule is right, proven at apply time
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- These vectors are duplicated VERBATIM into src/domain/program/__tests__/progress-core.test.mjs. Both
-- lists fail loudly, so the SQL and the TypeScript can only drift through a deliberate edit to both.
do $$
declare
  v record;
  v_got int;
begin
  for v in
    select * from (values
      -- (label, structure, expected)
      ('empty-ish: no days array at all',
       '{"weeks":6,"daysPerWeek":3}'::jsonb, null::int),
      ('repeating week, 3 built days x 6 weeks',
       '{"weeks":6,"daysPerWeek":3,"vary":false,"days":[
          {"main":[{}]},{"main":[{}]},{"main":[{}]}],"weekPlans":null}'::jsonb, 18),
      ('empty days fall back to daysPerWeek',
       '{"weeks":4,"daysPerWeek":3,"vary":false,"days":[{"main":[]},{"main":[]}],"weekPlans":null}'::jsonb, 12),
      ('warmup alone makes a day count',
       '{"weeks":2,"daysPerWeek":9,"vary":false,"days":[{"warmup":[{}]},{"cooldown":[{}]}],"weekPlans":null}'::jsonb, 4),
      ('ragged weeks: 3 then 2',
       '{"weeks":2,"daysPerWeek":3,"vary":true,"days":[{"main":[{}]}],"weekPlans":[
          {"days":[{"main":[{}]},{"main":[{}]},{"main":[{}]}]},
          {"days":[{"main":[{}]},{"main":[{}]}]}]}'::jsonb, 5),
      ('vary with fewer weekPlans than weeks falls back to the template',
       '{"weeks":3,"daysPerWeek":2,"vary":true,"days":[{"main":[{}]},{"main":[{}]}],"weekPlans":[
          {"days":[{"main":[{}]},{"main":[{}]},{"main":[{}]}]}]}'::jsonb, 7),
      ('weeks floored at 1',
       '{"weeks":0,"daysPerWeek":3,"vary":false,"days":[{"main":[{}]},{"main":[{}]}],"weekPlans":null}'::jsonb, 2),
      ('every week floored at 1 even with nothing built and dpw 0',
       '{"weeks":3,"daysPerWeek":0,"vary":false,"days":[{"main":[]}],"weekPlans":null}'::jsonb, 3),
      ('garbage types never raise',
       '{"weeks":"four","daysPerWeek":null,"days":[{"main":[{}]}]}'::jsonb, 1),
      ('null structure',
       null::jsonb, null::int)
    ) as t(label, structure, expected)
  loop
    v_got := public.program_total_sessions(v.structure);
    if v_got is distinct from v.expected then
      raise exception '0104 self-check A FAILED [%]: expected %, got %', v.label, v.expected, v_got;
    end if;
  end loop;
  raise notice '0104: program_total_sessions matches all 10 golden vectors.';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. start_program REFUSES A SEALED RECORD
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- This has been the hole in Amendment-001 §1 since 0017: the function never looked at the current state,
-- so W-3 routed every non-active program into it and "Run Again" on a graduated one flipped the sealed
-- record back to Active. A repeat is a NEW program (W-3 §7.2), created by the client — never this.
create or replace function public.start_program(p_program_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_state program_state;
  v_ended uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select state into v_state from programs where id = p_program_id and athlete_id = v_uid;
  if not found then raise exception 'program not found'; end if;

  -- Legal transitions are Future→Active, Active→Graduated, Active→Ended Early. There are no others.
  if v_state in ('graduated', 'ended_early') then
    raise exception 'a % program cannot be restarted — run it again as a new program', v_state
      using errcode = '22023';
  end if;

  update programs
     set state = 'ended_early', ended_at = now(), updated_at = now()
   where athlete_id = v_uid and state = 'active' and id <> p_program_id
  returning id into v_ended;

  update programs
     set state = 'active', started_at = coalesce(started_at, now()), ended_at = null, updated_at = now()
   where id = p_program_id and athlete_id = v_uid;

  return jsonb_build_object('started', p_program_id, 'ended', v_ended);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. THE INDEX: NARROW IT, DON'T DROP IT
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- 0019 made a second copy of a catalog plan impossible in ANY state. That was right while a program could
-- only be Future or Active, and wrong the moment one could be sealed: an athlete who graduated Strength
-- Foundation I could never run it again, and adoptCatalogProgram would hand them back the graduated row —
-- a dead end with a CTA on it.
--
-- The intent was never "one copy ever". 0019's own header says it: "starting the same catalog program
-- twice resumes the existing row instead of silently forking a second copy with its own separate
-- progress." That is a statement about LIVE copies. Sealed records accumulate without limit
-- (Amendment-001 §1), so the uniqueness narrows to the live states.
--
-- This also closes a defect noted while building the rank work: re-running a program used to LOSE credit
-- rather than gain it. The re-run row keeps its source_definition_id, so `distinctProgramCount`
-- (src/domain/rank/signals.ts) reads two graduations of one plan as programGraduations 2 / distinct 1 —
-- both true, per CAL Q14.
--
-- SAFE BY CONSTRUCTION: the old index was strictly stronger, so no existing row can violate the new one.
drop index if exists public.programs_one_per_source;

create unique index if not exists programs_one_live_per_source
  on public.programs (athlete_id, source_definition_id)
  where source_definition_id is not null and state in ('future', 'active');

comment on index public.programs_one_live_per_source is
  'One LIVE copy of a catalog plan per athlete. Sealed copies (graduated / ended_early) accumulate — they
   are permanent records, and running a program again is a new row, not a reactivation. Narrowed from
   0019''s programs_one_per_source by 0104.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 5. A SEALED RECORD CANNOT BE DELETED
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Amendment-001 §6: "Graduated and Ended Early programs are permanent legacy records. They may never be
-- deleted." A screen enforces that until somebody builds the next screen. 0017 put the one-active rule in
-- a unique index rather than in the client so the invariant would hold even if two devices raced;
-- permanence deserves the same treatment, and a state predicate IS expressible in a policy.
--
-- Deliberately NOT tightening programs_owner_update in the same migration: PostgREST returns 200 with an
-- empty body for an update matching zero rows, so updateProgram would fail SILENTLY. Hiding Edit on a
-- sealed record (W-3 §7 requires it anyway) covers the same ground at no risk.
drop policy if exists programs_owner_delete on public.programs;
create policy programs_owner_delete on public.programs
  for delete using (athlete_id = auth.uid() and state in ('future', 'active'));

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 6. save_workout — GRADUATE AT SESSION SAVE
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- 0097's body verbatim, plus ONE block between the chapter bump and evaluate_honors. The 11-arg signature
-- is unchanged (frozen since 0095), so this is create-or-replace with no client change and no window in
-- which PostgREST cannot find the function.
-- 0097's body, COPIED EXACTLY, plus ONE block between the chapter bump and evaluate_honors. The 11-arg
-- signature, the parameter names, `security invoker`, the snake_case jsonb keys the client actually
-- sends, `workout_name`, `weight_unit`, the `case when` on distance_unit and the `nullif` on modality are
-- all 0097's and are reproduced verbatim — a paraphrase here breaks every workout save for every athlete.
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
  -- 0104 — graduation
  v_prog     record;
  v_done     int := 0;
  v_total    int;
  v_grad     jsonb := null;
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

  -- ══ PROGRAM GRADUATION (Amendment-001 §4 · M4-D1) — the only thing 0104 adds to this function ══
  --
  -- "A program graduates when the athlete logs the final scheduled workout." Automatic, never manual, and
  -- ATOMIC with the workout that caused it: if the app dies before W-17 loads, the program is already
  -- Graduated and the record is intact.
  --
  -- IT MUST LAND BEFORE evaluate_honors. honor_metrics.programs_graduated is
  -- `count(*) from programs where state = 'graduated'` (0100) and honor_metrics is STABLE, so it reads the
  -- snapshot of the statement that calls it — which is after this UPDATE. Written afterwards instead, the
  -- five Programs honors would each fire one workout late, forever. Same mechanism by which workouts_total
  -- already counts the row inserted above.
  --
  -- Its own exception block on 0018's principle — the session is the thing worth saving. It should be
  -- unreachable (program_total_sessions is total by construction); the warning exists so a failure is loud
  -- in the Postgres log rather than surfacing months later as a graduation that silently never happened.
  if v_program is not null then
    begin
      select p.name, p.structure, p.started_at
        into v_prog
        from programs p
       where p.id = v_program and p.athlete_id = v_uid and p.state = 'active'
         for update;

      -- Not found = not active. Future, Graduated and Ended Early are all no-ops here: §1 permits exactly
      -- one transition into Graduated and it starts from Active.
      if found then
        v_total := public.program_total_sessions(v_prog.structure);

        select count(*) into v_done
          from workouts w
         where w.program_id = v_program and w.athlete_id = v_uid and w.state = 'saved';

        -- `>=`, not `=`: two devices racing can put the count past the total, and an athlete past the end
        -- has still finished. A NULL total makes the comparison null, and null is not "graduate".
        if v_done >= v_total then
          update programs
             set state = 'graduated', ended_at = now(), updated_at = now()
           where id = v_program and athlete_id = v_uid and state = 'active';

          -- The `state = 'active'` predicate IS the idempotency guard: under READ COMMITTED a second
          -- concurrent save blocks on the row lock, re-evaluates the predicate once granted, and updates
          -- nothing — so exactly one transaction writes the timeline event and the payload.
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
              'workouts',     v_done
            );
          end if;
        end if;
      end if;
    exception when others then
      v_grad := null;
      raise warning 'save_workout: graduation check failed for program % (% %)', v_program, sqlstate, sqlerrm;
    end;
  end if;

  v_honors := public.evaluate_honors('live_session');

  return jsonb_build_object('workout_id', v_workout, 'timeline_added', v_tl, 'program_id', v_program, 'template_id', v_template, 'honors', v_honors, 'graduated', v_grad);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 7. SELF-CHECK B — the body actually got replaced
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- The direct antidote to this repo's recorded failure mode: "a partial run leaves an OLDER function body
-- and errors nothing". Asserts both that the new content is present AND that 0097's content survived the
-- transcription — a slip that dropped the cardio columns would otherwise be silent until someone logged a
-- treadmill session.
do $$
declare v_src text;
begin
  v_src := pg_get_functiondef(
    'public.save_workout(text, modality, timestamptz, integer, text, jsonb, jsonb, uuid, numeric, text, uuid)'::regprocedure);
  if position('PROGRAM_GRADUATED' in v_src) = 0 then
    raise exception '0104 self-check B FAILED: save_workout was NOT replaced — an older body is installed';
  end if;
  if position('incline_pct' in v_src) = 0 then
    raise exception '0104 self-check B FAILED: save_workout lost 0097''s cardio columns — body transcribed wrong';
  end if;
  raise notice '0104: save_workout replaced, 0097 content intact.';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 8. BACKFILL — athletes already past their final session
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Without this the fix reaches nobody who has already finished, because there is no next save to trigger
-- the transition: W-3's "Continue Training" returns early when nextSession is null, Home offers nothing,
-- and the logger drops to freestyle. They would sit Active forever.
--
-- Dated to the workout that actually completed the program, NOT now() — stamping today would rewrite
-- history to say they finished on migration day. No ceremony fires (M-4 §8.1: a transition outside a live
-- session gets no modal); the record, the timeline entry and W-3's sealed presentation all land.
--
-- Honors are NOT evaluated here: evaluate_honors is security definer on auth.uid(), which is null in the
-- SQL editor. The five Programs honors fire on each athlete's next saved workout, which counts these rows.
-- A delay, not a loss.
--
-- Idempotent: re-running finds no due Active rows. Never violates programs_one_active_per_athlete — rows
-- only LEAVE that partial index.
with due as (
  select p.id, p.athlete_id, p.name,
         (select max(w.saved_at) from workouts w
           where w.program_id = p.id and w.state = 'saved') as last_saved
    from programs p
   where p.state = 'active'
     and public.program_total_sessions(p.structure) is not null
     and (select count(*) from workouts w where w.program_id = p.id and w.state = 'saved')
         >= public.program_total_sessions(p.structure)
),
graduated as (
  update programs p
     set state = 'graduated', ended_at = coalesce(d.last_saved, now()), updated_at = now()
    from due d
   where p.id = d.id and p.state = 'active'
  returning p.id, p.athlete_id, p.name, p.ended_at
)
insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at,
                             source_entity_type, source_entity_id)
select g.athlete_id, 'PROGRAM_GRADUATED', g.name,
       (select c.id from chapters c where c.athlete_id = g.athlete_id and c.is_active limit 1),
       g.ended_at, 'program', g.id
  from graduated g
 where not exists (select 1 from timeline_events t
                    where t.source_entity_id = g.id and t.event_type = 'PROGRAM_GRADUATED');

commit;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFY — read-only. Substitute your athlete id.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- STEP 0 — IN THE APP, BEFORE ANYTHING BELOW. Log one workout, any workout, and confirm it appears in
-- Activity History. Nothing here proves save_workout still SAVES; only that does.
--
-- STEP 1 — Does the SQL rule agree with the screen?
-- Compare `total` with the "Workout N of M" line W-3 prints for the same program. A mismatch means
-- program_total_sessions and totalSessions() have drifted, and nothing else will tell you.
--
--   select p.name, p.state,
--          (select count(*) from public.workouts w where w.program_id = p.id and w.state = 'saved') as logged,
--          public.program_total_sessions(p.structure) as total,
--          case
--            when p.state <> 'active' then p.state::text
--            when public.program_total_sessions(p.structure) is null
--              then 'NO SCHEDULE — cannot graduate (check the structure)'
--            when (select count(*) from public.workouts w where w.program_id = p.id and w.state = 'saved')
--                 >= public.program_total_sessions(p.structure)
--              then 'STUCK — at/past the final session but still Active'
--            else 'in progress'
--          end as verdict
--     from public.programs p
--    where p.athlete_id = '<your-athlete-id>'::uuid
--    order by p.created_at desc;
--
--   Expected: NO row reads 'STUCK'. (This is also the standing detector if the graduation block's
--   exception handler ever fires — re-run it after the first few real graduations.)
--
-- STEP 2 — Did the graduations seal, with their timeline entries?
--
--   select p.name, p.started_at, p.ended_at,
--          (select count(*) from public.workouts w where w.program_id = p.id and w.state = 'saved') as workouts,
--          exists (select 1 from public.timeline_events t
--                   where t.source_entity_id = p.id and t.event_type = 'PROGRAM_GRADUATED') as timeline_written
--     from public.programs p
--    where p.athlete_id = '<your-athlete-id>'::uuid and p.state = 'graduated'
--    order by p.ended_at desc;
--
--   Every row must show timeline_written = true.
--
-- STEP 3 — Do the honors see them? (This is the number that was permanently 0.)
--
--   select public.honor_metrics('<your-athlete-id>'::uuid) ->> 'programs_graduated';
--
--   Must equal STEP 2's row count. The five Programs honors fire on the NEXT saved workout.
--
-- STEP 4 — The guarantees are guarantees, not screen behaviour. Wrap in begin; … rollback;
--
--   delete from public.programs where id = '<a graduated id>';   -- expect DELETE 0
--   select public.start_program('<a graduated id>');             -- expect 'cannot be restarted'
