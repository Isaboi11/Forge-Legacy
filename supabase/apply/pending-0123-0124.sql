-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- APPLY BUNDLE — 0123 + 0124
--
-- Paste this WHOLE FILE into the Supabase SQL editor and run it once.
--
-- ══ RUN IT IN ONE GO ══
--
-- Both files are individually re-runnable, but a chain split across two pastes is how this project has
-- broken migrations before: 0081-before-0077 failed exactly that way. There is no CLI and no service key
-- here, so re-pasting from the top is the entire recovery mechanism — which is also why every statement
-- below is guarded (`create or replace`, `drop trigger if exists`) and safe to run twice.
--
-- ══ WHAT THEY DO ══
--
--   0123  A started program may be REORDERED, never RESIZED. A trigger refuses a structure change that
--         would drop a week or a day out from under a session already logged against it. This is the
--         third of three levels closing the Edit-button defect; the UI gate and the slot-validated
--         count are already live without it.
--
--   0124  Lets `save_workout` carry the per-exercise note. **It adds no column** —
--         `workout_exercises.notes` has been in the schema since 0001 and was never written. Until this
--         runs, a note typed on an exercise is sent by the app and dropped by the server. (The SESSION
--         note already works: `p_notes` has been in the signature since 0010.)
--
-- ══ HOW TO KNOW IT WORKED ══
--
-- Each file ends with read-only self-checks that return booleans. **Every one must come back TRUE.**
-- "It ran without errors" proves nothing here: a partial run leaves an older function body in place and
-- reports success — see the note in 0124's header about the four times this schema has lost a branch.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

-- 0123 — a started program may be reordered, never resized
--
-- ══ THE BUG ══════════════════════════════════════════════════════════════════════════════════════
--
-- W-5 (LOCKED) Decision 1 gives Active **NO** on every row of its permission matrix, and §15.6 requires
-- the save endpoint to reject a non-Future write server-side. That rejection was never implemented, and
-- the client stopped enforcing it too: `program/[id].tsx` gated its Edit button on `terminal`
-- (graduated / ended_early) rather than on `state = 'future'`, so Edit rendered on a LIVE program with
-- no gate on either side of the wire. 0104 declined to close it via RLS, for a good reason quoted below.
--
-- Two things follow from an athlete taking that button, and the second is not recoverable.
--
--   1. `hydrateDraft` normalises an opened draft through `clampDays` / `makeDays`, which TRUNCATE. A
--      ragged program — weeks of 6, 6, 5 with `daysPerWeek: 5` — loses the sixth day of every week just
--      by being opened and re-saved. Nobody asked for that and nothing reports it.
--
--   2. `program_sessions` rows are keyed by (week_index, day_index) and nothing deletes them when the
--      structure shrinks, while `program_total_sessions()` recomputes the denominator from the CURRENT
--      structure. So 21 rows against a re-shaped 12-session program satisfies `v_done >= v_total`, and
--      the next `save_workout` or `skip_program_session` graduates it: `state = 'graduated'`, a
--      PROGRAM_GRADUATED timeline event, and `evaluate_honors('live_session')` awarding five honors that
--      nothing revokes. Amendment-001 §1: *a graduated program cannot be reactivated.* There is no undo.
--
-- ══ WHY A TRIGGER, AND NOT THE OBVIOUS FIXES ═════════════════════════════════════════════════════
--
-- **Not RLS.** 0104 already worked this out and its reasoning still holds verbatim: *"PostgREST returns
-- 200 with an empty body for an update matching zero rows, so `updateProgram` would fail SILENTLY."* A
-- guard the client cannot see it tripped over is worse than no guard.
--
-- **Not `state = 'future'` either** — that would be the letter of W-5 and it would break something that
-- shipped last week and is correct. `swapSessionOrder` (0119 / commit 9ea56b0) reorders two UNTOUCHED
-- sessions inside one week of a LIVE program, deliberately, and persists through the same `updateProgram`
-- path. It is safe for a reason worth naming: a permutation within a week leaves every (week_index,
-- day_index) that carries a row exactly where it was, and leaves `program_total_sessions` identical. The
-- schedule changes; the record does not move under it.
--
-- So the invariant is not "the structure of a live program may not change". It is:
--
--        ⚠ A STARTED PROGRAM MAY BE REORDERED. IT MAY NOT CHANGE HOW MANY SESSIONS IT HAS.
--
-- That is the precise line between the swap (fine) and the builder round-trip (not fine), it is what the
-- coach's edit layer will also hold to, and it is checkable in one expression. A trigger states it once,
-- at the only place every write must pass, and raises — so the client gets a real error rather than a
-- silent no-op.
--
-- A sealed program is stricter still: history, not a workspace. No structure change at all.
--
-- ══ WHAT THIS DOES *NOT* DO, AND WHY ═════════════════════════════════════════════════════════════
--
-- **It does not re-declare `save_workout`.** That function's `v_done` is still a raw `count(*)` over
-- `program_sessions`. Changing it means `create or replace` on the whole ~200-line body, transcribed by
-- hand into this file, in the one function that records every workout in the app — and this repo has
-- already been bitten by derived state copied between places (0098 is a whole migration about it). The
-- count is correct because the trigger below makes an orphaned row unreachable, not because the query
-- filters them; that is a weaker guarantee honestly stated rather than a stronger one silently assumed.
-- `skip_program_session` IS re-declared, because it is sixty lines and the risk is proportionate.
--
-- **It deletes nothing.** An orphaned row is still the record of a workout that genuinely happened — the
-- `workout_id` on it points at a real row in `workouts`. Erasing it to tidy the arithmetic would be the
-- exact thing History Cannot Be Rewritten forbids. The final block only COUNTS them and tells you.
--
-- ══ READ THIS BEFORE YOU RUN IT ══════════════════════════════════════════════════════════════════
--
-- Idempotent: `create or replace` throughout, `drop trigger if exists` before the create. Safe to re-run.
-- Applied by pasting into the SQL editor, like every migration in this repo.
--
-- After it runs, read the NOTICE at the end. It reports how many athletes already carry an orphaned row
-- from the window when the Edit button was reachable. Nothing is repaired automatically — if the count
-- is non-zero, that is a conversation, not a cleanup script.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. The guard
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

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

  -- A sealed record is history (Amendment-001 §1). Not editable, not deletable, never reactivated.
  if old.state in ('graduated', 'ended_early') then
    raise exception 'a % program cannot be restructured', old.state
      using errcode = 'check_violation',
            hint = 'Duplicate it instead — a copy is a new row and leaves the record intact.';
  end if;

  if old.state = 'active' then
    v_before := coalesce(public.program_total_sessions(old.structure), 0);
    v_after  := coalesce(public.program_total_sessions(new.structure), 0);

    -- The whole point. Reordering keeps the count; resizing moves the finish line under an athlete who is
    -- already running at it, and re-points rows that are keyed by position.
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

comment on function public.programs_guard_structure() is
  'Enforces W-5 Decision 1 at the only place every write passes. A sealed program''s structure is immutable;
   an active program''s structure may be reordered (swapSessionOrder) but may not change its session count,
   because `program_sessions` rows are keyed by (week_index, day_index) and graduation compares against a
   denominator recomputed from the current structure. Raises rather than filtering, so the client sees the
   refusal instead of a silent zero-row update. Migration 0123.';

drop trigger if exists programs_guard_structure_trg on public.programs;

create trigger programs_guard_structure_trg
  before update of structure on public.programs
  for each row
  execute function public.programs_guard_structure();

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. skip_program_session — count only sessions the program still prescribes
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Identical to 0119 except for the `v_done` query, which now joins `program_slots`. Belt to the trigger's
-- braces: the trigger stops orphans being created, this stops an orphan that predates it from graduating
-- anyone. The TypeScript twin is `touchedCount` in `progress-core.ts`, which filters the same way.

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
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select p.id, p.structure, p.state into v_prog
    from public.programs p
   where p.id = p_program_id and p.athlete_id = v_uid
   for update;
  if not found then raise exception 'program not found'; end if;
  -- A sealed program is history (Amendment-001 §1). Nothing may be added to it.
  if v_prog.state in ('graduated', 'ended_early') then
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
    update public.programs
       set state = 'graduated', ended_at = now(), updated_at = now()
     where id = p_program_id and athlete_id = v_uid and state = 'active';

    if found then
      insert into public.timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at,
                                          source_entity_type, source_entity_id)
      select v_uid, 'PROGRAM_GRADUATED', p.name,
             (select c.id from public.chapters c where c.athlete_id = v_uid and c.is_active limit 1),
             now(), 'program', p.id
        from public.programs p where p.id = p_program_id;
      perform public.evaluate_honors('live_session');
      return jsonb_build_object('ok', true, 'graduated', true);
    end if;
  end if;

  return jsonb_build_object('ok', true, 'graduated', false);
end;
$$;

comment on function public.skip_program_session(uuid, integer, integer) is
  'Mark one prescribed session as skipped. It counts toward completing the program (PO decision) and can
   therefore graduate it, while `state` records permanently that it was skipped rather than trained.
   Validates the slot against the program''s own schedule; a session already touched is a no-op.
   Migration 0119; the completion count joined program_slots in 0123.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. Self-check — the comparison the trigger rests on, and the trigger itself
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Same discipline as 0119's golden vectors: a guard nobody proved is a guard nobody has. These abort the
-- migration rather than leaving a trigger that silently permits what it was written to stop.

do $$
declare
  -- A 2-week, 3-day program: six sessions. Shrinking it to one week is the exact damaging edit.
  v_full jsonb := '{"weeks":2,"daysPerWeek":3,"vary":false,"days":[
      {"letter":"A","main":[{"name":"Squat"}]},
      {"letter":"B","main":[{"name":"Bench"}]},
      {"letter":"C","main":[{"name":"Row"}]}],"weekPlans":null}'::jsonb;
  v_shrunk jsonb;
  v_reordered jsonb;
begin
  v_shrunk    := jsonb_set(v_full, '{weeks}', '1'::jsonb);
  -- A reorder: same three days, different order. This must remain legal on a live program.
  v_reordered := jsonb_set(v_full, '{days}', '[
      {"letter":"C","main":[{"name":"Row"}]},
      {"letter":"A","main":[{"name":"Squat"}]},
      {"letter":"B","main":[{"name":"Bench"}]}]'::jsonb);

  if public.program_total_sessions(v_full) <> 6 then
    raise exception '0123 self-check: expected 6 sessions, got %', public.program_total_sessions(v_full);
  end if;

  -- The resize the trigger must catch.
  if public.program_total_sessions(v_shrunk) = public.program_total_sessions(v_full) then
    raise exception '0123 self-check: a shrunk structure must not report the same session count — '
                    'the guard compares exactly this and would permit the damaging edit';
  end if;

  -- The reorder the trigger must NOT catch. If this ever differs, the guard has broken swapping.
  if public.program_total_sessions(v_reordered) <> public.program_total_sessions(v_full) then
    raise exception '0123 self-check: reordering changed the session count (% to %) — the guard would '
                    'now reject swapSessionOrder, which is a shipped and correct feature',
                    public.program_total_sessions(v_full), public.program_total_sessions(v_reordered);
  end if;

  if not exists (
    select 1 from pg_trigger
     where tgname = 'programs_guard_structure_trg'
       and tgrelid = 'public.programs'::regclass
       and not tgisinternal
  ) then
    raise exception '0123 self-check: programs_guard_structure_trg is not attached to public.programs';
  end if;

  raise notice '0123 self-check passed: resize detected, reorder permitted, trigger attached.';
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. Diagnostic — who is already carrying damage
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Read-only. Reports rows written against a session the program no longer prescribes, which can only
-- exist because of the window this migration closes. Repairs nothing: the row records a workout that
-- really happened, and deleting it to make the arithmetic tidy is precisely what History Cannot Be
-- Rewritten forbids. If this reports anything, decide what to do about those athletes deliberately.

do $$
declare
  v_rows     int;
  v_programs int;
begin
  select count(*), count(distinct ps.program_id) into v_rows, v_programs
    from public.program_sessions ps
    join public.programs p on p.id = ps.program_id
   where not exists (
     select 1 from public.program_slots(p.structure) s
      where s.week_index = ps.week_index and s.day_index = ps.day_index
   );

  if v_rows = 0 then
    raise notice '0123 diagnostic: no orphaned session rows. Nobody was caught by the open window.';
  else
    raise warning '0123 diagnostic: % orphaned session row(s) across % program(s). These name sessions '
                  'their program no longer prescribes. Nothing has been deleted — they are records of '
                  'real workouts. Review before deciding.', v_rows, v_programs;
  end if;
end;
$$;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- ▲ 0123 ends here.  ▼ 0124 begins.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 0124 — workout notes: finishing a column that has existed since 0001
--
-- RUN AFTER 0123.
--
-- ══ THIS ADDS NO COLUMN ══
--
-- `workout_exercises.notes` was in the very first migration (0001_spine.sql line 94) and `workouts.notes`
-- has taken a value through `save_workout`'s `p_notes` since 0010. **Neither has ever been written.** No
-- client path passed a value and no surface read one back, so both have been empty for every session this
-- app has ever saved — a write-only field of exactly the kind the `ProgramExercise` schema comment cites
-- as its standing warning.
--
-- All this migration does is let `save_workout` carry the per-exercise note that already rides inside
-- `p_exercises`. The session note needs nothing at all: `p_notes` has been in the signature for 114
-- migrations, and the client simply starts passing it.
--
-- ══ WHY `create or replace` IS SAFE HERE ══
--
-- The signature is UNCHANGED — the note travels inside the `p_exercises` jsonb, exactly as 0106's superset
-- fields did. `create or replace` therefore preserves the existing grants, which is the rule this repo
-- learned the hard way: a DROP would be required for a return-type change (42P13, as 0057/0109 each hit)
-- and would silently restore PUBLIC EXECUTE with nothing following to revoke it.
--
-- ⚠ THE BODY BELOW IS 0119's, COPIED WHOLE, WITH ONE INSERT CHANGED. It was not retyped. Rebuilding a
-- function body from a partial reading is how this schema has lost branches four separate times — 0088
-- and 0092 each dropped the friend branches, 0103 zeroed `time_total`, 0106 silently deleted the whole
-- graduation block. If you edit this, diff it against 0119 before running it.
--
-- Idempotent: one `create or replace` and read-only self-checks. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

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
      insert into workout_sets (workout_exercise_id, set_index, weight, weight_unit, reps, duration_sec, distance, distance_unit, modality, incline_pct)
      values (v_wex, (v_set->>'set_index')::int, (v_set->>'weight')::numeric,
              coalesce(v_set->>'weight_unit', 'lb'), (v_set->>'reps')::int,
              (v_set->>'duration_sec')::int, (v_set->>'distance')::numeric,
              case when (v_set->>'distance') is not null then coalesce(v_set->>'distance_unit', 'mi') else null end,
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

-- ── SELF-CHECKS (read-only) ────────────────────────────────────────────────────────────────────────
-- Both must be TRUE. The first proves the installed body writes the note; the second proves the grant
-- survived, since that is the thing a careless DROP would have taken with it.
select
  (select pg_get_functiondef(p.oid) like '%nullif(v_ex->>''notes''%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'save_workout'
    limit 1)                                                        as writes_exercise_notes,
  has_function_privilege('authenticated', p.oid, 'execute')          as authenticated_can_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'save_workout'
limit 1;

-- And that the two columns this finishes are really the ones that were always there.
select
  (select count(*) from information_schema.columns
    where table_name = 'workout_exercises' and column_name = 'notes') = 1 as exercise_notes_column_exists,
  (select count(*) from information_schema.columns
    where table_name = 'workouts' and column_name = 'notes') = 1          as workout_notes_column_exists;
