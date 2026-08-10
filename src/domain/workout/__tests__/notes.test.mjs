/**
 * notes.test.mjs — the workout note, on a session and on a lift.
 *
 * ══ WHAT THIS GUARDS ══
 *
 * Both columns have existed since the first migration and **neither was ever written**. `workouts.notes`
 * took a `p_notes` argument from 0010 that every client path passed as `null`; `workout_exercises.notes`
 * was in 0001 and no code has ever set it. A field that is written but never read — or accepted but never
 * sent — is the failure this repo has shipped more than once, and it is invisible to every other check:
 * the types line up, the query succeeds, and the value is silently nothing.
 *
 * So these assert the two ends that a type cannot: that the payload actually CARRIES the note, and that
 * an empty one becomes null rather than an empty string that renders as an empty quote.
 *
 * Run:  node --test --experimental-strip-types src/domain/workout/__tests__/notes.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildSaveExercises } from '../save-core.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, rel), 'utf8');

const session = (over = {}) => ({
  workoutName: 'Heavy Pull',
  activityType: 'strength',
  startedAt: '2026-08-09T09:00:00.000Z',
  exercises: [],
  ...over,
});

const lift = (over = {}) => ({
  name: 'Barbell Deadlift',
  catalogKey: 'barbell-deadlift',
  section: 'main',
  position: 0,
  sets: [{ setIndex: 0, done: true, weight: 315, actualReps: 5, targetReps: 5 }],
  ...over,
});

// ─────────────────────────────────────────────────────────────────────────────
// THE PAYLOAD ACTUALLY CARRIES IT
// ─────────────────────────────────────────────────────────────────────────────

test('a note on a lift reaches the save payload', () => {
  const [row] = buildSaveExercises(session({ exercises: [lift({ note: 'Grip failed before legs did.' })] }));
  assert.equal(row.notes, 'Grip failed before legs did.');
});

test('no note sends null, not an empty string', () => {
  // ⚠ THE DIFFERENCE IS VISIBLE TO THE ATHLETE. History renders a note as a quote; an empty string is a
  // quote with nothing in it, on every session that opened the sheet and thought better of it.
  const [none] = buildSaveExercises(session({ exercises: [lift()] }));
  assert.equal(none.notes, null);

  const [blank] = buildSaveExercises(session({ exercises: [lift({ note: '' })] }));
  assert.equal(blank.notes, null);

  const [spaces] = buildSaveExercises(session({ exercises: [lift({ note: '   \n  ' })] }));
  assert.equal(spaces.notes, null, 'whitespace is not a note');
});

test('a note is trimmed, not stored as typed', () => {
  const [row] = buildSaveExercises(session({ exercises: [lift({ note: '  belt on from set 3  ' })] }));
  assert.equal(row.notes, 'belt on from set 3');
});

test('the note travels with the right lift when there are several', () => {
  const rows = buildSaveExercises(
    session({
      exercises: [
        lift({ name: 'Back Squat', catalogKey: 'barbell-back-squat', position: 0, note: 'Knees felt fine.' }),
        lift({ name: 'Barbell Deadlift', catalogKey: 'barbell-deadlift', position: 1 }),
        lift({ name: 'Barbell Row', catalogKey: 'barbell-row', position: 2, note: 'Too heavy to stay strict.' }),
      ],
    }),
  );
  assert.equal(rows[0].notes, 'Knees felt fine.');
  assert.equal(rows[1].notes, null);
  assert.equal(rows[2].notes, 'Too heavy to stay strict.');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE SESSION NOTE IS SENT AT ALL — the bug that stood for 114 migrations
// ─────────────────────────────────────────────────────────────────────────────

test('the session note is passed to save_workout, not hardcoded null', () => {
  /*
   * `p_notes: null` was written into the save path in 0010 and never revisited, so `workouts.notes` has
   * been empty for every session this app has ever saved. A behavioural test cannot reach this — it is a
   * literal in an RPC call — so the source is the assertion, deliberately, the same way
   * `root-overlays.test.mjs` asserts the shape of the render tree.
   */
  const src = read('../save.ts');
  assert.doesNotMatch(src, /p_notes:\s*null/, 'the session note is hardcoded null again');
  assert.match(src, /p_notes:\s*session\.note\?\.trim\(\)\s*\|\|\s*null/, 'the session note must be sent, trimmed to null');
});

test('the session and the lift notes are different columns and stay that way', () => {
  // `workouts.reflection` is the keepsake — permanent, shown back months later. `workouts.notes` is the
  // training log. Writing training detail into `reflection` would put "slept badly" in the place the app
  // treats as a legacy artifact, and the two have coexisted since 0001 with only one of them wired.
  const src = read('../../../data/workout-complete-live.ts');
  assert.match(src, /update\(\{ reflection: text \}\)/, 'saveReflection must still write reflection');
  assert.match(src, /update\(\{ notes: text\.trim\(\) \|\| null \}\)/, 'saveWorkoutNote must write notes');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE MIGRATION — 0124 is the only reason any of this lands
// ─────────────────────────────────────────────────────────────────────────────

test('0124 writes the exercise note, and does not disturb the rest of save_workout', () => {
  const m124 = readFileSync(path.join(here, '../../../../supabase/migrations/0124_workout_notes.sql'), 'utf8');
  const m119 = readFileSync(path.join(here, '../../../../supabase/migrations/0119_program_session_log.sql'), 'utf8');

  assert.match(m124, /insert into workout_exercises \(workout_id, catalog_key, name, notes,/);
  assert.match(m124, /nullif\(v_ex->>'notes', ''\)/, "an empty string must land as null, matching the client's trim");

  // ⚠ THE REAL RISK IN THIS MIGRATION. This schema has lost function branches four times by rebuilding a
  // body from a partial reading — 0088 and 0092 dropped the friend branches, 0103 zeroed two totals, 0106
  // silently deleted the entire graduation block. 0124 is 0119's body with two lines changed, and this
  // asserts the branches that matter are all still in it.
  for (const marker of [
    'program_total_sessions',
    "state = 'graduated'",
    'PROGRAM_GRADUATED',
    'insert into public.program_sessions',
    'insert into personal_records',
    'update chapters set workout_count',
    'evaluate_honors',
  ]) {
    if (!m119.includes(marker)) continue; // only assert what 0119 actually had
    assert.ok(m124.includes(marker), `0124 dropped "${marker}" from save_workout — rebuild it from 0119`);
  }
});

test('0124 replaces rather than drops, so the grant survives', () => {
  const m124 = readFileSync(path.join(here, '../../../../supabase/migrations/0124_workout_notes.sql'), 'utf8');
  assert.match(m124, /create or replace function save_workout/);
  // A DROP here would silently restore PUBLIC EXECUTE with nothing following to revoke it — the trap
  // recorded against 0120/0121/0122.
  assert.doesNotMatch(m124, /drop function .*save_workout/i);
});
