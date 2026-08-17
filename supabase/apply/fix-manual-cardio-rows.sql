-- ─────────────────────────────────────────────────────────────────────────────
-- ONE-OFF DATA CORRECTION — not a migration, and deliberately not numbered.
--
-- Fixes rows already saved with the two cardio bugs fixed in code on 2026-08-17:
-- a session that was one hand-entered cardio bout kept the WALL CLOCK as its
-- duration (Kim's 20-minute walk saved as 28 minutes), and a session started
-- from "Start a freestyle workout" kept the literal name `Freestyle Workout`.
--
-- The code fix is not retroactive, which is why this exists. Run it in the
-- Supabase SQL editor. There is no CLI or service key on this project.
--
-- ⚠ WHY THIS IS A PREVIEW AND THEN AN UPDATE, RATHER THAN ONE STATEMENT.
--
-- `source` — 'tracked' (GPS measured it) vs 'manual' (typed in) — lives ONLY in
-- the client session shape. It has never been written to any column. So SQL
-- cannot tell the two apart, and the difference is exactly what decides whether
-- a row is wrong:
--
--   · a TYPED bout: the wall clock is how long the app sat open. Wrong, fix it.
--   · a TRACKED bout: the wall clock is the truth, and it legitimately runs a
--     little longer than the bout (the seconds spent confirming the numbers).
--
-- Both look identical here. STEP 1 shows you the gap so you can judge; STEP 2
-- corrects only the ids you name. Do not turn STEP 2 into a blanket update —
-- it would quietly shave real time off every tracked run in the table.
-- ─────────────────────────────────────────────────────────────────────────────


-- ══ STEP 1 · PREVIEW ═════════════════════════════════════════════════════════
-- Candidate rows: a workout that is ONE cardio block whose stored duration is
-- longer than the bout inside it. Edit the handle on the marked line.
--
-- Read `gap_min`. A few seconds is a tracked bout and should be LEFT ALONE.
-- Minutes — Kim's row shows 8 — is the app having sat open, and is the bug.

with one_block as (
  select
    w.id,
    w.workout_name,
    w.saved_at,
    w.duration_sec                  as stored_sec,
    s.duration_sec                  as bout_sec,
    e.name                          as block_name
  from public.workouts w
  join public.profiles p on p.id = w.athlete_id
  join public.workout_exercises e on e.workout_id = w.id
  join public.workout_sets s on s.workout_exercise_id = e.id
  where p.handle = 'kim'          -- ⚠ EDIT ME (profiles.handle, case-insensitive)
    and e.catalog_key like 'cardio:%'
    and s.duration_sec is not null
    and s.duration_sec > 0
    -- the block IS the session: exactly one exercise on the workout.
    and (select count(*) from public.workout_exercises e2 where e2.workout_id = w.id) = 1
)
select
  id,
  saved_at,
  workout_name,
  block_name,
  stored_sec,
  bout_sec,
  round((stored_sec - bout_sec) / 60.0, 1) as gap_min,
  case when workout_name = 'Freestyle Workout' then block_name else null end as name_would_become
from one_block
where stored_sec > bout_sec
order by saved_at desc;


-- ══ STEP 2 · CORRECT ═════════════════════════════════════════════════════════
-- Paste the ids from STEP 1 that you judged to be typed-in bouts. Both
-- statements are scoped to that list and touch nothing else.
--
-- ⚠ Take a copy of STEP 1's output first — there is no undo, and the wall clock
--   is not recoverable once overwritten.

-- 2a · the duration becomes the bout the athlete actually entered.
update public.workouts w
set duration_sec = s.duration_sec
from public.workout_exercises e
join public.workout_sets s on s.workout_exercise_id = e.id
where e.workout_id = w.id
  and w.id in (
    -- ⚠ EDIT ME
    '00000000-0000-0000-0000-000000000000'
  )
  and e.catalog_key like 'cardio:%'
  and s.duration_sec is not null
  and s.duration_sec > 0;

-- 2b · the placeholder name becomes the block's own name ("Treadmill Walk").
--      Only ever replaces the literal placeholder — a name the athlete typed is
--      theirs, and the same rule guards `sessionWorkoutName` in the app.
update public.workouts w
set workout_name = e.name
from public.workout_exercises e
where e.workout_id = w.id
  and w.id in (
    -- ⚠ EDIT ME — the same list as 2a
    '00000000-0000-0000-0000-000000000000'
  )
  and w.workout_name = 'Freestyle Workout'
  and e.catalog_key like 'cardio:%';


-- ══ STEP 3 · VERIFY ══════════════════════════════════════════════════════════
-- Re-run STEP 1. The rows you corrected should be gone from the results, because
-- stored_sec no longer exceeds bout_sec.
