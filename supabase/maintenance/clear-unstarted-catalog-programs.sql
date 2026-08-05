-- ============================================================================
-- CLEAR UNSTARTED CATALOG PROGRAMS — the residue of "looking made it planned"
-- ============================================================================
--
-- THIS IS NOT A MIGRATION. It is deliberately outside `supabase/migrations/`:
-- that chain is the schema's history and is applied in order, once. This is a
-- one-off operator action against DATA, run by hand.
--
-- ══ WHY IT EXISTS ══
--
-- Until `187705f`, opening a built-in program to READ it adopted it — Program
-- Detail needed an id to load, and adopting was how a built-in got one. The
-- write itself was correct; it simply should never have happened. Every athlete
-- who browsed the catalog on a build before that fix has a "Planned" program on
-- their list for each program they merely looked at.
--
-- The code is fixed. These are the rows it already made, and no amount of app
-- code will remove them — deleting an athlete's row is an operator action.
--
-- ══ WHAT COUNTS AS RESIDUE ══
--
-- Only a row that is ALL of these:
--   · state = 'future' and never started      — nobody pressed Start on it
--   · source_definition_id is not null        — it came from the built-in
--                                               catalogue, so it is not a
--                                               program the athlete authored
--   · no workouts logged against it           — no training attaches to it
--   · no sealed sibling from the same source  — NOT a "Run it again" copy, which
--                                               is a legitimate planned row
--                                               (`runProgramAgain`)
--   · not the copy of an accepted share       — accepting a shared program lands
--                                               in 'future' ON PURPOSE (0110):
--                                               receiving is not starting
--
-- The last two exclusions are the ones that matter. Without them this deletes
-- programs athletes deliberately hold, and it would look identical in the count.
--
-- It also catches one newer case, correctly: an athlete who pressed Start, saw
-- the max gate and backed out on a build between `187705f` and the gate fix.
-- That row is unasked-for in the same way.
--
-- WHAT IT NEVER TOUCHES: workouts (the training survives its plan either way —
-- 0018 nulls the link rather than cascading), authored programs, active
-- programs, and sealed records, which Amendment-001 §6 forbids deleting at all.
--
-- Run the steps IN ORDER, one at a time, in the Supabase SQL editor. Read the
-- output of step 1 before running step 2.
-- ============================================================================


-- ── STEP 1 · Look at what you are about to delete ───────────────────────────
-- Run this alone, first. Every row listed is a candidate; the columns are the
-- evidence. If a name here is a program you meant to hold, STOP — and tell me,
-- because the filter is wrong and not the plan.

select u.email,
       p.name,
       p.source_definition_id,
       p.created_at
  from public.programs p
  join auth.users u on u.id = p.athlete_id
 where p.state = 'future'
   and p.started_at is null
   and p.source_definition_id is not null
   and not exists (select 1 from public.workouts w where w.program_id = p.id)
   and not exists (select 1 from public.programs s
                    where s.athlete_id = p.athlete_id
                      and s.source_definition_id = p.source_definition_id
                      and s.state in ('graduated', 'ended_early'))
   and not exists (select 1 from public.program_shares sh
                    where sh.to_id = p.athlete_id
                      and sh.status = 'ACCEPTED'
                      and sh.name = p.name)
 order by u.email, p.created_at;


-- ── STEP 2 · Delete them, for ONE athlete ───────────────────────────────────
-- The safe default: your own account. Replace the address. The WHERE clause is
-- the step-1 query verbatim plus the email — do not simplify it, every line of
-- it is keeping something.

delete from public.programs p
 where p.athlete_id = (select id from auth.users where email = 'you@example.com')
   and p.state = 'future'
   and p.started_at is null
   and p.source_definition_id is not null
   and not exists (select 1 from public.workouts w where w.program_id = p.id)
   and not exists (select 1 from public.programs s
                    where s.athlete_id = p.athlete_id
                      and s.source_definition_id = p.source_definition_id
                      and s.state in ('graduated', 'ended_early'))
   and not exists (select 1 from public.program_shares sh
                    where sh.to_id = p.athlete_id
                      and sh.status = 'ACCEPTED'
                      and sh.name = p.name);


-- ── STEP 2b · …or every athlete (use INSTEAD of step 2, not after) ──────────
-- The bug hit every tester who browsed, so their lists carry it too. Deleting
-- other people's rows is a bigger decision than fixing your own — make it
-- deliberately, after reading step 1's full output.
--
--   delete from public.programs p
--    where p.state = 'future'
--      and p.started_at is null
--      and p.source_definition_id is not null
--      and not exists (select 1 from public.workouts w where w.program_id = p.id)
--      and not exists (select 1 from public.programs s
--                       where s.athlete_id = p.athlete_id
--                         and s.source_definition_id = p.source_definition_id
--                         and s.state in ('graduated', 'ended_early'))
--      and not exists (select 1 from public.program_shares sh
--                       where sh.to_id = p.athlete_id
--                         and sh.status = 'ACCEPTED'
--                         and sh.name = p.name);


-- ── STEP 3 · Confirm ────────────────────────────────────────────────────────
-- Re-run STEP 1. It should return nothing for whoever you cleaned.
