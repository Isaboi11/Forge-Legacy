-- ═════════════════════════════════════════════════════════════════════════════════════════
--
--   0198 — A SKIP CAN BE TAKEN BACK (and only the RPCs may write a session mark)
--
--   PASTE THIS WHOLE FILE INTO THE SUPABASE SQL EDITOR AND RUN IT ONCE.
--   It is idempotent: running it twice is safe and changes nothing the second time.
--
--   ⚠ SAFE TO APPLY BEFORE THE CLIENT SHIPS. Nothing deployed calls `unskip_program_session`, and
--   nothing deployed writes `program_sessions` except `save_workout` and `skip_program_session`,
--   which are unaffected. §2 narrows a policy the client never used.
--
--   It ends with a self-check that ABORTS the whole thing if either half did not take, so a
--   successful run is proof rather than an absence of red text.
--
-- ═════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0198: a skip can be taken back, and only the RPCs may write a session mark
--
-- ══ WHY THIS EXISTS ══
--
-- Skipping a session has been a one-way door since 0119. There is no un-skip anywhere in the product —
-- not in SQL, not in the client — and the button that does it sits in a row of four plain text actions
-- beside "Train this", with no confirmation in front of it.
--
-- That would be a small annoyance if a skip were cosmetic. It is not. A skipped session COUNTS toward
-- finishing the program (PO decision, 2026-08-07), so a mis-tap does not merely mislabel a row: it moves
-- the athlete one session closer to a graduation they did not train for, and if it lands on the last
-- outstanding session it IS the graduation — `state = 'graduated'`, a PROGRAM_GRADUATED timeline event,
-- and `evaluate_honors('live_session')` awarding five permanent honors.
--
-- Program-Architecture-Amendment-001 §1: *a graduated program cannot be reactivated.* So the accidental
-- case has no remedy at all today, and the deliberate-but-regretted case has none either.
--
-- ══ THE WINDOW IS THE RUN, AND THAT IS THE WHOLE DESIGN ══
--
--        ⚠ A SKIP MAY BE UNDONE WHILE THE PROGRAM IS RUNNING. NEVER AFTER IT HAS ENDED.
--
-- Un-skipping on a SEALED program would drop the accounted-for count back below the finish line on a
-- program that has already crossed it — leaving a `graduated` row that its own arithmetic says is not
-- finished, with honors already awarded and no un-graduate path to follow it with. Refusing is not a
-- limitation to lift later; it is the same rule that makes a graduation permanent, seen from the other
-- side. The client puts a confirmation in front of the skip precisely because THIS door closes.
--
-- ⚠ IT DELETES ONLY A SKIP. `state = 'skipped'` is in the where clause, so a `completed` mark cannot be
--   removed by this function at any price. Undoing a skip and erasing the record of a workout look
--   identical from the client; only one of them is what anybody asked for.
--
-- ⚠ IT DOES NOT REDECLARE `save_workout` OR `skip_program_session`. Both are long bodies that would have
--   to be transcribed by hand to change one line, and this repo has been bitten by exactly that (0123 §2
--   declined the same thing for the same reason). Nothing here needs them changed.
--
-- ══ §2 IS THE HALF THAT IS EASY TO MISS ══
--
-- The RPC is the right door, but until now it was not the only one. `program_sessions`' policy has been
-- `for all` since 0119, so a client holding an ordinary anon key could DELETE or UPDATE any of its own
-- session marks straight through PostgREST — including a `completed` one, which is the record that a
-- workout satisfied a particular session, and including on a sealed program. Adding a careful RPC while
-- leaving that open would be theatre.
--
-- ⚠ CLIENT-CODE-FIRST, AND VERIFIED BEFORE WRITING THIS. Narrowing a policy can break a deployed client
--   that still writes through it (the rule this repo learned the hard way). Nothing in `src/` updates or
--   deletes `program_sessions` directly — every write goes through `save_workout`, `skip_program_session`
--   or, from now on, `unskip_program_session`, all of which are `security invoker` and check ownership
--   themselves. So this narrowing is invisible to every build in the field.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — unskip_program_session
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.unskip_program_session(
  p_program_id uuid,
  p_week_index integer,
  p_day_index  integer
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_prog    record;
  v_removed int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  -- `for update`, matching skip_program_session: the state test and the delete must see the same row,
  -- or a concurrent final skip could seal the program between them.
  select p.id, p.state into v_prog
    from public.programs p
   where p.id = p_program_id and p.athlete_id = v_uid
   for update;
  if not found then raise exception 'program not found'; end if;

  -- ⚠ ACTIVE ONLY — stricter than skip's sealed-state list, and deliberately so. `future` has nothing to
  -- un-skip (a program that has not started has no marks), and the three sealed states are history.
  if v_prog.state is distinct from 'active' then
    return jsonb_build_object('ok', false, 'reason', 'program is not active');
  end if;

  -- `state = 'skipped'` is the guard that makes this safe to expose at all. A completed mark carries the
  -- workout that satisfied the session; deleting one would orphan a real workout from the program it was
  -- trained for, and no button in the product is asking for that.
  delete from public.program_sessions
   where program_id = p_program_id
     and athlete_id = v_uid
     and week_index = p_week_index
     and day_index  = p_day_index
     and state      = 'skipped';
  get diagnostics v_removed = row_count;

  -- Nothing removed is `ok` rather than an error: the session was never skipped, or a second tap arrived
  -- after the first. Both leave the schedule in exactly the state the caller wanted.
  return jsonb_build_object('ok', true, 'removed', v_removed > 0);
end;
$$;

comment on function public.unskip_program_session(uuid, integer, integer) is
  'Undo a skip: the session goes back to being owed. ACTIVE programs only — un-skipping a sealed program
   would drop it back below its own finish line with honors already awarded, and Amendment-001 §1 gives
   no way to reverse that. Deletes only a `skipped` mark; a `completed` one is the record of a workout
   and is never touched. Migration 0198.';

grant execute on function public.unskip_program_session(uuid, integer, integer) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — the RPCs become the only writers of a session mark
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Read and insert stay with the owner: the client reads its own marks on every program screen, and
-- `save_workout` / `skip_program_session` are `security invoker`, so their inserts run as the athlete and
-- need the insert policy to exist. UPDATE and DELETE are removed from the client entirely — the only
-- legitimate delete is an un-skip, which now has a function that checks the two things a raw delete
-- cannot: that the program is still running, and that the mark is a skip.

-- Dropped first, all three, so a second run is a no-op rather than "policy already exists".
drop policy if exists program_sessions_own on public.program_sessions;
drop policy if exists program_sessions_select_own on public.program_sessions;
drop policy if exists program_sessions_insert_own on public.program_sessions;

create policy program_sessions_select_own on public.program_sessions
  for select using (athlete_id = auth.uid());

create policy program_sessions_insert_own on public.program_sessions
  for insert with check (athlete_id = auth.uid());

comment on table public.program_sessions is
  'One row per session an athlete has TOUCHED in a program: completed (with the workout that did it) or
   skipped. Progress is the count of these rows, "next up" is the first slot without one, and graduation
   is every slot having one — so a skip carries the athlete forward (PO decision, 2026-08-07) while
   `state` keeps saying, permanently, that it was a skip. Migration 0119.
   ⚠ 0198: the client may SELECT and INSERT only. Removing a mark goes through unskip_program_session,
   which refuses a sealed program and refuses to touch a `completed` row.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — self-check
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Same discipline as 0119 and 0123: a guard nobody proved is a guard nobody has. These abort the
-- migration rather than leaving a function that silently permits what it was written to stop.

do $$
declare
  v_policies text[];
begin
  if to_regprocedure('public.unskip_program_session(uuid,integer,integer)') is null then
    raise exception '0198 self-check: unskip_program_session was not created';
  end if;

  -- `security invoker`, like its twin. A definer function here would delete rows as the owner and the
  -- athlete_id predicate would be the only thing standing between one athlete and another's schedule.
  if exists (
    select 1 from pg_proc
     where oid = 'public.unskip_program_session(uuid,integer,integer)'::regprocedure
       and prosecdef
  ) then
    raise exception '0198 self-check: unskip_program_session must be security invoker';
  end if;

  select array_agg(distinct polcmd::text order by polcmd::text) into v_policies
    from pg_policy where polrelid = 'public.program_sessions'::regclass;

  -- 'r' = select, 'a' = insert, 'w' = update, 'd' = delete, '*' = all.
  --
  -- ⚠ ASSERTED AS "NO WRITE DOOR REMAINS", not as an exact list. An exact-match against ['a','r'] would
  -- abort this migration on replay the moment any later migration adds a policy to this table — turning
  -- a harmless re-run into a failure that looks like the guard caught something.
  if v_policies is null or not ('r' = any(v_policies)) or not ('a' = any(v_policies)) then
    raise exception '0198 self-check: program_sessions must keep a select and an insert policy, found %',
      coalesce(array_to_string(v_policies, ','), 'none');
  end if;
  if 'w' = any(v_policies) or 'd' = any(v_policies) or '*' = any(v_policies) then
    raise exception
      '0198 self-check: program_sessions still grants the client update or delete on a session mark (%)',
      array_to_string(v_policies, ',');
  end if;

  raise notice '0198 self-check passed — unskip_program_session live, program_sessions is select+insert only';
end;
$$;
