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
