-- ══════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0175: a running program may be edited, but its finish line may not move
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once. Idempotent — safe to run twice
-- (`create or replace` + `drop trigger if exists`).
--
-- ⚠ THIS ONE NEEDS A DEPLOY TO BE USEFUL, and is safe without one. The trigger only ever REFUSES a
--   write; nothing starts depending on it. Apply it BEFORE deploying the client that opens the builder
--   on a running program, so the database is already holding the line when the button appears.
--
-- ⚠ IT CHANGES WHAT AN UPDATE CAN DO. After this runs, an UPDATE that changes the session count of an
--   ACTIVE program raises P0001 instead of succeeding. Nothing in the app does that today except the
--   feature this ships with, so the expected blast radius is zero — but that is a prediction, and if a
--   "cannot change length" error appears anywhere unexpected, this is why.
--
-- WHY IT EXISTS: graduation is `completed >= program_total_sessions(structure)`, recomputed live. Shrink
-- a running program and the next logged session clears a bar that just moved down to meet it —
-- `save_workout` writes a PROGRAM_GRADUATED event and five honors, and Amendment-001 §170 says those
-- facts are immutable. There is no un-graduate path.
--
-- WHAT YOU SHOULD SEE in Messages:
--   0175 OK: trigger attached; count separates rename 12 = 12 from shrink 12 -> 6 and emptied day 12 -> 8.
--
-- AND ONE RESULT ROW. Predicted before running:
--   guard_installed 1 · active_programs <however many are running> · active_without_schedule 0
--
--   ⚠ `active_without_schedule` counts running programs whose structure prescribes NO schedule, for
--     which `program_total_sessions` returns NULL. Such a program can never graduate at all, so a
--     non-zero count is a pre-existing bug this migration did not cause and does not fix — report it
--     rather than assuming it is fallout from this.
--
-- Source: supabase/migrations/0175_live_program_edit_guard.sql, carried in verbatim.
-- ══════════════════════════════════════════════════════════════════════════════════════════


-- Forge Legacy — 0175: a running program may be edited, but its FINISH LINE may not move
--
-- ══ WHAT CHANGED ABOVE THIS ══
--
-- W-5 Decisions 1 and 4 forbade modifying an Active program in any way, including rename. The PO
-- overruled the product half of that on 2026-08-20: an athlete should be able to fix the plan they are
-- living in. `Docs/Amendments/Program-Fork-Edit-Amendment-001-Live-Program-Editing.md` is the amendment.
--
-- ══ WHY THE DATABASE HAS TO HOLD THIS ONE ══
--
-- Graduation is decided server-side, in `save_workout`, as
--     completed >= public.program_total_sessions(structure)
-- recomputed LIVE from whatever the row currently holds. The finish line is derived, never stored.
--
-- So shrinking a running program does not merely change a plan — it moves the bar down onto the athlete's
-- existing progress, and the next logged session clears it. `save_workout` then fires the graduation
-- branch: a `PROGRAM_GRADUATED` timeline event and five honors. Program-Architecture-Amendment-001 §170:
-- "These facts are immutable. The product does not provide a mechanism to alter them." There is no
-- un-graduate path, so this is not a mistake anyone can clean up afterwards.
--
-- The builder enforces the same invariant client-side (`liveEditViolation` in `program-draft-model.ts`).
-- That is where the athlete gets a sentence they can act on. This is where it is actually TRUE — an
-- athlete must not be able to assert their own graduation, which is the identical reason
-- `program_total_sessions` exists in SQL at all rather than only in `progress-core.ts`.
--
-- ⚠ THE COUNT, NOT THE SHAPE. `program_total_sessions` counts days that PRESCRIBE something, so emptying
--   a day's exercises removes a session the athlete owed just as surely as deleting the day. Guarding
--   `weeks × daysPerWeek` would have missed that entirely.
--
-- ⚠ WHAT THIS DOES *NOT* GUARD, deliberately: which sessions changed. Freezing sessions the athlete has
--   already trained is enforced in the builder only (`lockedCells`). Rewriting a past session is a
--   correctness and honesty problem; moving the finish line is an IRREVERSIBLE one, and only the second
--   justifies a trigger on every write. Said plainly here so a later reader does not mistake the silence
--   for an oversight.
--
-- ⚠ NOT RETROACTIVE, and it does not need to be. It constrains UPDATEs from now on; no existing row is
--   inspected or rewritten.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — the guard
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.programs_live_edit_guard()
returns trigger
language plpgsql
as $$
declare
  v_old integer;
  v_new integer;
begin
  -- Only a real structure change, and only on a program that is actually running.
  if new.structure is not distinct from old.structure then
    return new;
  end if;
  if old.state is distinct from 'active' then
    return new;
  end if;

  -- A deliberate maintenance hatch. Repairs run as `set local app.allow_program_reshape = 'on'` inside
  -- their own transaction, so the escape cannot be left on by accident and cannot be reached from the
  -- client (PostgREST does not set it).
  if coalesce(current_setting('app.allow_program_reshape', true), 'off') = 'on' then
    return new;
  end if;

  v_old := public.program_total_sessions(old.structure);
  v_new := public.program_total_sessions(new.structure);

  -- `is distinct from`, because NULL here means "prescribes no schedule at all" and crossing that
  -- boundary in either direction moves the finish line just as much as a number changing.
  if v_old is distinct from v_new then
    raise exception
      'This program is running, so its length cannot change (% sessions to %). Edit the sessions ahead of you, or duplicate the program to build a different length.',
      coalesce(v_old::text, 'none'), coalesce(v_new::text, 'none')
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

comment on function public.programs_live_edit_guard() is
  'Refuses an UPDATE that changes the session count of an ACTIVE program. Graduation is
   completed >= program_total_sessions(structure) recomputed live, so a shrink would award a
   PROGRAM_GRADUATED event and five unrevokable honors on the next logged session (0175).';

drop trigger if exists programs_live_edit_guard on public.programs;
create trigger programs_live_edit_guard
  before update of structure on public.programs
  for each row execute function public.programs_live_edit_guard();

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — the assertion
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Two things, and the second is the one that matters. Asserting the trigger EXISTS proves only that it is
-- attached; it says nothing about whether the quantity it compares can actually tell a shrink from a
-- no-op. So the arithmetic is separated against known-positive and known-negative structures — no rows
-- are written and no live program is touched.

do $$
declare
  v_full  jsonb := '{"weeks":4,"daysPerWeek":3,"vary":false,"days":[
                      {"warmup":[],"main":[{"a":1}],"cooldown":[]},
                      {"warmup":[],"main":[{"a":1}],"cooldown":[]},
                      {"warmup":[],"main":[{"a":1}],"cooldown":[]}]}'::jsonb;
  v_shortweeks jsonb;
  v_emptyday   jsonb;
  v_renamed    jsonb;
  n_full int; n_weeks int; n_empty int; n_renamed int;
begin
  if to_regprocedure('public.program_total_sessions(jsonb)') is null then
    raise exception '0175 STOP: program_total_sessions() is absent — 0104 has not been applied. Apply that first.';
  end if;
  if to_regprocedure('public.programs_live_edit_guard()') is null then
    raise exception '0175 self-check: the guard function did not create';
  end if;
  if not exists (
    select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
     where t.tgname = 'programs_live_edit_guard'
       and c.relname = 'programs'
       and not t.tgisinternal
  ) then
    raise exception '0175 self-check: the trigger is not attached to public.programs';
  end if;

  -- NEGATIVE (must NOT trip): renaming changes the structure but not one session.
  v_renamed := jsonb_set(v_full, '{name}', '"Renamed"'::jsonb);
  -- POSITIVE (must trip): fewer weeks, and — the subtle one — a day emptied of its exercises.
  v_shortweeks := jsonb_set(v_full, '{weeks}', '2'::jsonb);
  v_emptyday := jsonb_set(v_full, '{days,2}', '{"warmup":[],"main":[],"cooldown":[]}'::jsonb);

  n_full    := public.program_total_sessions(v_full);
  n_renamed := public.program_total_sessions(v_renamed);
  n_weeks   := public.program_total_sessions(v_shortweeks);
  n_empty   := public.program_total_sessions(v_emptyday);

  if n_full <> 12 then
    raise exception '0175 self-check: baseline should be 4 weeks x 3 built days = 12, got %', n_full;
  end if;
  if n_renamed <> n_full then
    raise exception '0175 self-check: a RENAME moved the count (% -> %) — the guard would block an edit it should allow', n_full, n_renamed;
  end if;
  if n_weeks >= n_full then
    raise exception '0175 self-check: shrinking 4 weeks to 2 did not lower the count (% -> %) — the guard cannot see the case it exists for', n_full, n_weeks;
  end if;
  if n_empty >= n_full then
    raise exception '0175 self-check: EMPTYING a day did not lower the count (% -> %) — this is the case a weeks x days guard would have missed', n_full, n_empty;
  end if;

  raise notice '0175 OK: trigger attached; count separates rename % = % from shrink % -> % and emptied day % -> %.',
    n_full, n_renamed, n_full, n_weeks, n_full, n_empty;
end;
$$;


-- ══ §3 — THE REPORT (read-only, ONE row) ══════════════════════════════════════════════════
--
-- ⚠ ONE ROW ON PURPOSE — the SQL editor shows only the last statement's result.

select
  (select count(*) from pg_trigger t
     join pg_class c on c.oid = t.tgrelid
    where t.tgname = 'programs_live_edit_guard'
      and c.relname = 'programs'
      and not t.tgisinternal)                                          as guard_installed,
  (select count(*) from public.programs where state = 'active')        as active_programs,
  (select count(*) from public.programs)                               as all_programs,
  (select count(*) from public.programs p
    where p.state = 'active'
      and public.program_total_sessions(p.structure) is null)          as active_without_schedule;
