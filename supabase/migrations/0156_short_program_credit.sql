-- Forge Legacy — 0156: a program under four weeks finishes, it does not graduate
--
-- ⚠ RUN 0155 FIRST AND LET IT COMMIT. This file USES the 'finished' and 'PROGRAM_COMPLETED' labels, and
--   a label cannot be used in the transaction that added it (55P04). If 0155's final
--   `select 'finished'::program_state;` raised, do not run this.
--
-- ══ WHAT WAS WRONG ══
--
-- Nothing in this database has ever looked at how long a program is. Graduation is
-- `logged >= program_total_sessions(structure)` (0104, restored by 0119/0151); rank counts rows with
-- `state = 'graduated'`; `honor_metrics()` counts the same rows. So "only programs of four weeks or more
-- count toward rank" was true for exactly one reason: the Program Builder's stepper would not go below 4.
-- A product rule, holding on a UI clamp, with nothing behind it.
--
-- `Program-Architecture-Amendment-002` opens program length to 1–52 weeks so athletes can build a single
-- week — a deload, a travel week, a test week. The moment it lands, that clamp stops holding the rule up,
-- and a one-week block would credit a rank family promotion and fire five NEVER-REVOCABLE honors.
--
-- ══ WHAT THIS DOES ══
--
-- `D-RCM-30`: a graduation credits only from four DESIGNED weeks. Below that the program seals as
-- 'finished' — a permanent, undeletable, un-restartable record that earns nothing on the ladder.
--
-- ⚠ AND NOTE WHAT IS *NOT* IN THIS FILE. `honor_metrics()` is untouched. `rank-live.ts` is untouched.
--   Both filter `state = 'graduated'`, and a short program never reaches that state — so the credit rule
--   is enforced at ONE place (the two terminal writes) rather than in every consumer forever. That is the
--   entire argument for a fifth enum label over a jsonb predicate (PA2-D3), and it is why this migration
--   does not have to rebuild the ~200-line `honor_metrics()` by hand. 0151's header records what happens
--   when this repo does that.
--
-- Depends on 0104 (program_total_sessions, start_program), 0119 (program_sessions, program_slots),
-- 0123 (programs_guard_structure, skip_program_session), 0151 (the live save_workout body), 0155 (labels).
-- Idempotent. RUN AFTER 0155.
--
-- ══ THE TWO BIG BODIES ARE MACHINE-GENERATED, NOT HAND-TYPED ══
--
-- `save_workout` and `skip_program_session` below were produced by extracting the SHIPPED bodies (0151
-- and 0123 respectively) and applying named, asserted substitutions — the same method 0151 itself used,
-- for the reason its header gives: hand-transcription of `save_workout` has silently deleted a shipped
-- branch in this repo four times. The generator asserts each edit landed AND that every marker of the
-- original survived. Section 6 asserts the same thing again against the installed body.

begin;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. THE PREDICATE
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- ⚠ THIS RULE EXISTS TWICE. The other copy is `earnsStructuredDevelopmentCredit()` in
-- `src/domain/program/progress-core.ts`, keyed to `STRUCTURED_DEVELOPMENT_MIN_WEEKS` in
-- `src/domain/rank/thresholds.ts`. The two must change together.
--
-- It exists twice for `program_total_sessions`'s reason, which applies with more force here: the server
-- must decide credit WITHOUT TRUSTING THE CLIENT, because what a graduation buys is a rank family and
-- five permanent honors. A client-supplied "this one counts" flag would be the single most attractive
-- field in the app to anyone with a PostgREST call.
--
-- DESIGNED, NOT ELAPSED (D-RCM-30 R1). It reads the declared `weeks` — the number the athlete chose
-- before logging anything — never the calendar time the program occupied and never the walked schedule.
-- Amendment-001 §4 forbids withholding a graduation because someone was slow, and this does not touch it.
--
-- TOTAL BY CONSTRUCTION. It runs inside the Finish commit, so it must never raise, whatever jsonb it is
-- handed: typed reads (`jsonb_typeof(...) = 'number'`), never a bare cast. `(j->>'weeks')::int` on
-- {"weeks":"four"} raises and would cost the athlete a logged session.
--
-- FALSE IS THE SAFE ANSWER (D-RCM-30 R4). An unreadable structure earns nothing. This mirrors 0104's own
-- rule that a NULL session total means "do not graduate" rather than "graduate at zero": the product
-- never fails open on a claim it cannot revoke.
--
-- ⚠ THE LITERAL 4 IS CORRECT HERE and is not an MA3-D16 violation. MA3-D16 forbids hardcoding *cap*
--   numbers, which are commercial config; this is a rank threshold, the same kind of constant as
--   SELF_DIRECTED_BLOCK's 6. It is named in the comment so the pair stays greppable.
create or replace function public.program_earns_credit(p_structure jsonb)
returns boolean
language sql
immutable
parallel safe
as $$
  select case
    when jsonb_typeof(coalesce(p_structure, '{}'::jsonb)->'weeks') = 'number'
      then floor((p_structure->>'weeks')::numeric) >= 4
    else false
  end;
$$;

comment on function public.program_earns_credit(jsonb) is
  'Does this program earn a structured-development credit? True when its DECLARED weeks >= 4 (D-RCM-30,
   Rank-Computation-Model-Amendment-003). SQL twin of earnsStructuredDevelopmentCredit() in
   src/domain/program/progress-core.ts, keyed to STRUCTURED_DEVELOPMENT_MIN_WEEKS in
   src/domain/rank/thresholds.ts — it exists twice only because save_workout must decide credit without
   trusting the client. Reads DESIGNED length, never elapsed time. Total by construction: never raises,
   whatever jsonb it is handed, and an unreadable structure returns false. Migration 0156.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. SELF-CHECK A — the rule is right, proven at apply time
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- These vectors are duplicated VERBATIM into src/domain/program/__tests__/progress-core.test.mjs, exactly
-- as 0104's are. Both lists fail loudly, so the SQL and the TypeScript can only drift through a
-- deliberate edit to both.
do $$
declare
  v record;
  v_got boolean;
begin
  for v in
    select * from (values
      -- (label, structure, expected)
      ('one week — the case this whole feature exists for',
       '{"weeks":1,"daysPerWeek":3}'::jsonb, false),
      ('three weeks',                '{"weeks":3,"daysPerWeek":3}'::jsonb, false),
      ('EXACTLY FOUR — the boundary','{"weeks":4,"daysPerWeek":3}'::jsonb, true),
      ('five weeks',                 '{"weeks":5,"daysPerWeek":3}'::jsonb, true),
      ('fifty-two weeks',            '{"weeks":52,"daysPerWeek":3}'::jsonb, true),
      ('fractional floors DOWN',     '{"weeks":3.9,"daysPerWeek":3}'::jsonb, false),
      ('fractional at the boundary', '{"weeks":4.7,"daysPerWeek":3}'::jsonb, true),
      ('zero',                       '{"weeks":0,"daysPerWeek":3}'::jsonb, false),
      ('negative',                   '{"weeks":-8,"daysPerWeek":3}'::jsonb, false),
      ('weeks absent',               '{"daysPerWeek":3}'::jsonb, false),
      ('weeks as a STRING — must not raise', '{"weeks":"four"}'::jsonb, false),
      ('weeks null',                 '{"weeks":null}'::jsonb, false),
      ('empty object',               '{}'::jsonb, false),
      ('null structure',             null::jsonb, false)
    ) as t(label, structure, expected)
  loop
    v_got := public.program_earns_credit(v.structure);
    if v_got is distinct from v.expected then
      raise exception '0156 self-check A FAILED [%]: expected %, got %', v.label, v.expected, v_got;
    end if;
  end loop;
  raise notice '0156: program_earns_credit matches all 14 golden vectors.';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. A FINISHED PROGRAM IS SEALED — the three places that already knew about the other two sealed states
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- ⚠ `programs_guard_structure` is the one whose omission is SILENT. It tests 'graduated'/'ended_early'
--   and 'active'; anything else falls through both branches to `return new`. A finished program would be
--   freely restructurable — Amendment-001 §6 permanence violated in a state §6 does not yet name, with no
--   error anywhere. The other two raise, so they fail loudly; this one just quietly allows.
--
-- 0123's body, with 'finished' added to the sealed list and nothing else changed.
create or replace function public.programs_guard_structure()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_before int;
  v_after  int;
begin
  -- jsonb compares by content, not by text: Postgres stores keys sorted and deduplicated, so a re-serialised
  -- structure with the same content is `not distinct` and passes straight through. Only a real edit gets here.
  if new.structure is not distinct from old.structure then
    return new;
  end if;

  -- A sealed record is history (Amendment-001 §1, PA2-D2). Not editable, not deletable, never reactivated.
  if old.state in ('graduated', 'finished', 'ended_early') then
    raise exception 'a % program cannot be restructured', old.state
      using errcode = 'check_violation',
            hint = 'Duplicate it instead — a copy is a new row and leaves the record intact.';
  end if;

  if old.state = 'active' then
    v_before := coalesce(public.program_total_sessions(old.structure), 0);
    v_after  := coalesce(public.program_total_sessions(new.structure), 0);

    -- The whole point. Reordering keeps the count; resizing moves the finish line under an athlete who is
    -- already running at it, and re-points rows that are keyed by position.
    --
    -- ⚠ AND SINCE 0156 IT DOES ONE MORE JOB: it is what makes the credit verdict safe to decide ONCE, at
    -- the seal (PA2-D4). Because an active program's session count cannot move, `weeks` cannot move
    -- either, so a write-once verdict provably equals what a read-time predicate would compute.
    if v_after is distinct from v_before then
      raise exception
        'an active program cannot change its number of sessions (% to %)', v_before, v_after
        using errcode = 'check_violation',
              hint = 'Reordering sessions within a week is allowed. To change the plan itself, duplicate '
                     'the program and start the copy.';
    end if;
  end if;

  return new;
end;
$$;

-- 0104's body, with 'finished' added to the refusal list and nothing else changed.
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

  -- Legal transitions are Future→Active, Active→Graduated, Active→Finished, Active→Ended Early.
  -- There are no others. A finished week is re-run as a NEW program, exactly like a graduated one —
  -- which is what makes a week template worth having: the same week, run four times, is four records.
  if v_state in ('graduated', 'finished', 'ended_early') then
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

-- The delete policy (0104 §5) and the `programs_one_live_per_source` index (0104 §4) are both WHITELISTS
-- of ('future','active'), so 'finished' is already excluded from deletion and already accumulates like
-- any other sealed record. Verified in section 7 rather than assumed.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. save_workout — WHICH sealed state, at session save
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- 0151's body with four asserted substitutions. See the header for why this is generated.

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
  -- 0156 — D-RCM-30. `v_credit` is the verdict; `v_fin` is the short-completion twin of `v_grad`.
  v_credit   boolean;
  v_fin      jsonb := null;
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
      insert into workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps, duration_sec, distance, distance_unit, floors, modality, incline_pct)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric,
              coalesce(v_set->>'weight_unit', 'lb'), (v_set->>'reps')::int,
              (v_set->>'duration_sec')::int, (v_set->>'distance')::numeric,
              case when (v_set->>'distance') is not null then coalesce(v_set->>'distance_unit', 'mi') else null end,
              -- 0151. Its own column. A floor is not a mile and must never reach `distance`, which is
              -- read as miles by goals (0035), honors (0078), challenges (0061) and squad totals (0107).
              (v_set->>'floors')::int,
              nullif(v_set->>'modality', ''), (v_set->>'incline_pct')::numeric);

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
          -- ══ 0156 · D-RCM-30 — WHICH sealed state, decided ONCE, here ══
          --
          -- Read from the structure as it stands at this instant, never re-derived later. That is safe
          -- precisely because 0123 forbids an ACTIVE program changing its session count and a FUTURE one
          -- cannot reach a terminal state — so `weeks` can no longer move, and a write-once verdict
          -- provably equals what a read-time predicate would compute (PA2-D4).
          --
          -- ⚠ A short program must NOT become 'graduated'. `honor_metrics()` counts graduated rows and
          --   so does rank; giving the short case its own state is what lets both stay untouched (PA2-D3).
          v_credit := public.program_earns_credit(v_prog.structure);

          update programs
             set state = case when v_credit then 'graduated' else 'finished' end::program_state,
                 ended_at = now(), updated_at = now()
           where id = v_program and athlete_id = v_uid and state = 'active';

          -- The `state = active` predicate IS the idempotency guard: a second concurrent save blocks on
          -- the row lock, re-evaluates once granted, and updates nothing.
          if found then
            insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at,
                                         source_entity_type, source_entity_id)
            -- Both are permanent records (PA2-D7); they are DIFFERENT events because the timeline's
            -- readers must tell them apart without consulting a program's structure (M4-A1-D4).
            values (v_uid,
                    case when v_credit then 'PROGRAM_GRADUATED' else 'PROGRAM_COMPLETED' end::flm_event_type,
                    v_prog.name, v_chapter, now(), 'program', v_program);
            v_tl := v_tl + 1;

            -- ⚠ `v_grad` IS THE M-4 TRIGGER. It stays NULL for a short block, which is the whole of
            -- M4-A1-D1: no ceremony for a completion the ladder does not count. `v_fin` carries the
            -- same facts for W-17's quiet inline state, so the client never has to ask the database a
            -- second question to find out what just happened.
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
            if (not v_credit) then
              -- Same facts, honest keys: a week that finished did not GRADUATE, and a payload that says
              -- 'graduated_at' would put that word in front of the athlete by the back door.
              v_fin  := (v_grad - 'graduated_at')
                        || jsonb_build_object('finished_at', now(), 'weeks', v_prog.structure->'weeks');
              v_grad := null;
            end if;
          end if;
        end if;
      end if;
    exception when others then
      v_grad := null;
      v_fin  := null;
      raise warning 'save_workout: session/graduation step failed for program % (% %)', v_program, sqlstate, sqlerrm;
    end;
  end if;

  v_honors := public.evaluate_honors('live_session');

  return jsonb_build_object('workout_id', v_workout, 'timeline_added', v_tl, 'program_id', v_program, 'template_id', v_template, 'honors', v_honors, 'graduated', v_grad, 'completed', v_fin);
end;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 5. skip_program_session — THE SECOND COMPLETION DOOR
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- ⚠ THIS IS THE ONE THAT IS EASY TO MISS, AND MISSING IT WOULD LEAVE THE WHOLE FEATURE OPEN.
--
-- A program's final session can be LOGGED or SKIPPED, and both seal it. Gate only `save_workout` and a
-- one-week program can still be *skipped* to a full graduation — `state = 'graduated'`, a
-- PROGRAM_GRADUATED timeline event, `evaluate_honors('live_session')`, and five permanent honors, for
-- four taps and no training at all. D-RCM-30 R3 exists to name this: "A rule applied to only one door is
-- not a rule."
--
-- 0123's body with the same substitutions.

create or replace function public.skip_program_session(
  p_program_id uuid,
  p_week_index integer,
  p_day_index  integer
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_prog  record;
  v_total int;
  v_done  int;
  -- 0156 — D-RCM-30.
  v_credit boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select p.id, p.structure, p.state into v_prog
    from public.programs p
   where p.id = p_program_id and p.athlete_id = v_uid
   for update;
  if not found then raise exception 'program not found'; end if;
  -- A sealed program is history (Amendment-001 §1). Nothing may be added to it.
  if v_prog.state in ('graduated', 'finished', 'ended_early') then
    return jsonb_build_object('ok', false, 'reason', 'program is not active');
  end if;

  if not exists (
    select 1 from public.program_slots(v_prog.structure) s
     where s.week_index = p_week_index and s.day_index = p_day_index
  ) then
    return jsonb_build_object('ok', false, 'reason', 'no such session in this program');
  end if;

  -- Already touched — completed OR skipped — is a no-op rather than an error. Skipping something you
  -- already trained must never overwrite the record of having trained it.
  insert into public.program_sessions (program_id, athlete_id, week_index, day_index, state)
  values (p_program_id, v_uid, p_week_index, p_day_index, 'skipped')
  on conflict (program_id, week_index, day_index) do nothing;

  v_total := coalesce(public.program_total_sessions(v_prog.structure), 0);
  -- ⚠ JOINED, not `count(*)` (0123). A row whose (week_index, day_index) the structure no longer
  -- prescribes is not a session of this program and must not count toward finishing it.
  select count(*) into v_done
    from public.program_sessions ps
    join public.program_slots(v_prog.structure) s
      on s.week_index = ps.week_index and s.day_index = ps.day_index
   where ps.program_id = p_program_id;

  -- `>=` and the `state = 'active'` predicate, both for 0104's reasons: an athlete past the end has
  -- still finished, and the predicate IS the idempotency guard under a concurrent write.
  if v_total > 0 and v_done >= v_total then
    -- ══ 0156 · D-RCM-30, THE SECOND DOOR ══
    -- The same verdict save_workout reaches, for the same reason and from the same structure. R3: a rule
    -- applied to only one completion door is not a rule.
    v_credit := public.program_earns_credit(v_prog.structure);

    update public.programs
       set state = case when v_credit then 'graduated' else 'finished' end::program_state,
           ended_at = now(), updated_at = now()
     where id = p_program_id and athlete_id = v_uid and state = 'active';

    if found then
      insert into public.timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at,
                                          source_entity_type, source_entity_id)
      select v_uid,
             case when v_credit then 'PROGRAM_GRADUATED' else 'PROGRAM_COMPLETED' end::flm_event_type,
             p.name,
             (select c.id from public.chapters c where c.athlete_id = v_uid and c.is_active limit 1),
             now(), 'program', p.id
        from public.programs p where p.id = p_program_id;
      perform public.evaluate_honors('live_session');
      -- `graduated` stays FALSE for a short block — the client reads it to decide whether a ceremony
      -- is owed (M4-A1-D1), and `finished` carries the quieter fact beside it.
      return jsonb_build_object('ok', true, 'graduated', v_credit, 'finished', not v_credit);
    end if;
  end if;

  return jsonb_build_object('ok', true, 'graduated', false, 'finished', false);
end;
$$;

commit;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 6. SELF-CHECK B — the bodies actually got replaced, and nothing was lost in the rebuild
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- The direct antidote to this repo's recorded failure mode: "a partial run leaves an OLDER function body
-- and errors nothing." Asserts both that the NEW content is present AND that the shipped content of every
-- prior migration survived the rebuild — a slip that dropped the floors column or the group columns would
-- otherwise be silent until someone logged a stair session or a superset.
--
-- Run this as its own statement after the transaction commits.
--
--   do $$
--   declare v_src text;
--   begin
--     v_src := pg_get_functiondef(
--       'public.save_workout(text, modality, timestamptz, integer, text, jsonb, jsonb, uuid, numeric, text, uuid, integer, integer)'::regprocedure);
--
--     -- 0156's own additions
--     if position('program_earns_credit' in v_src) = 0 then
--       raise exception '0156 self-check B FAILED: save_workout was NOT replaced — an older body is installed';
--     end if;
--     if position('PROGRAM_COMPLETED' in v_src) = 0 then
--       raise exception '0156 self-check B FAILED: save_workout lost the short-completion event';
--     end if;
--     -- and every predecessor's content, by the migration that added it
--     if position('incline_pct' in v_src) = 0 then raise exception '0156 B FAILED: lost 0097 cardio columns'; end if;
--     if position('floors' in v_src) = 0 then raise exception '0156 B FAILED: lost 0151 stair floors'; end if;
--     if position('group_kind' in v_src) = 0 then raise exception '0156 B FAILED: lost 0106 superset groups'; end if;
--     if position('notes' in v_src) = 0 then raise exception '0156 B FAILED: lost 0124 workout notes'; end if;
--     if position('program_slots' in v_src) = 0 then raise exception '0156 B FAILED: lost 0119 session log'; end if;
--     if position('evaluate_honors' in v_src) = 0 then raise exception '0156 B FAILED: lost the honors call'; end if;
--     if position('PROGRAM_GRADUATED' in v_src) = 0 then raise exception '0156 B FAILED: lost 0104 graduation'; end if;
--     raise notice '0156: save_workout replaced; 0097/0104/0106/0119/0124/0151 content intact.';
--
--     v_src := pg_get_functiondef('public.skip_program_session(uuid, integer, integer)'::regprocedure);
--     if position('program_earns_credit' in v_src) = 0 then
--       raise exception '0156 B FAILED: skip_program_session was NOT replaced — THE SECOND DOOR IS OPEN';
--     end if;
--     if position('program_slots' in v_src) = 0 then raise exception '0156 B FAILED: skip lost 0123 slot join'; end if;
--     raise notice '0156: skip_program_session replaced; 0123 content intact.';
--   end $$;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 7. PRE-FLIGHT AND VERIFY — read-only. Run 7a BEFORE anything above.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ── 7a · PRE-FLIGHT. Is there any program this rule would newly exclude? ──
--
-- Expected: ZERO ROWS. The Builder clamp has held at 4 since it shipped, so no such program should exist
-- and no athlete's rank can move. If a row DOES come back, stop: a `graduated` row that would no longer
-- qualify must be decided explicitly and must NOT be rewritten. History cannot be rewritten.
--
--   select id, name, state, structure->>'weeks' as weeks
--     from public.programs
--    where coalesce(nullif(structure->>'weeks','')::numeric, 0) < 4
--    order by state, created_at;
--
-- ── 7b · The rule agrees with itself across the two languages ──
--
--   select p.name, p.structure->>'weeks' as weeks,
--          public.program_earns_credit(p.structure) as counts_for_rank,
--          p.state
--     from public.programs p
--    where p.athlete_id = '<your-athlete-id>'::uuid
--    order by p.created_at desc;
--
--   Compare `counts_for_rank` against what the Builder showed: every program at 4+ weeks must read true,
--   every program at 1–3 must read false. A disagreement means the SQL and TS twins have drifted.
--
-- ── 7c · THE REAL TEST, in the app. Do this twice. ──
--
--   1. Build a TWO-week × two-day program. Train or skip all four sessions. Then:
--
--        select state from public.programs where id = '<id>';
--          -- expect: finished
--        select count(*) from public.timeline_events
--          where source_entity_id = '<id>' and event_type = 'PROGRAM_GRADUATED';
--          -- expect: 0
--        select count(*) from public.timeline_events
--          where source_entity_id = '<id>' and event_type = 'PROGRAM_COMPLETED';
--          -- expect: 1
--        select public.honor_metrics('<your-athlete-id>'::uuid) ->> 'programs_graduated';
--          -- expect: UNCHANGED from before you started
--
--      And no M-4 ceremony appears on the summary.
--
--   2. Repeat with a FOUR-week program and assert the OPPOSITE on every line: state 'graduated', one
--      PROGRAM_GRADUATED row, no PROGRAM_COMPLETED row, programs_graduated up by one, M-4 fires.
--
--   ⚠ RUN 1 BOTH WAYS — once ending on a LOGGED final session, once ending on a SKIPPED one. That is the
--     two-door rule, and the skip path is the one that would silently keep working the old way.
--
-- ── 7d · Sealed means sealed ──  Wrap in begin; … rollback;
--
--   delete from public.programs where id = '<a finished id>';            -- expect DELETE 0
--   select public.start_program('<a finished id>');                      -- expect 'cannot be restarted'
--   update public.programs set structure = structure || '{"weeks":9}'::jsonb
--    where id = '<a finished id>';                                       -- expect 'cannot be restructured'
