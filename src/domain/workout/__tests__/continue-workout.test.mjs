/**
 * continue-workout.test.mjs — reopening a workout you ended by accident.
 *
 * ══ THE FAILURE THIS GUARDS ══
 *
 * Finishing a workout is not one write. `save_workout` inserts the workout, its exercises and sets, any
 * personal records, a timeline event each, bumps `chapters.workout_count`, marks the program session
 * complete and evaluates honors. Continuing therefore CANNOT be a second save — it would double every
 * one of those, and none of the doubling would raise an error. Two entries in history for one session,
 * a chapter count claiming you trained twice, a duplicate PR event for the same lift on the same day.
 *
 * So the whole feature rests on one thing: **only the unsaved sets travel.** That is what these test.
 *
 * Run:  node --test --experimental-strip-types src/domain/workout/__tests__/continue-workout.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildAppendExercises, buildSaveExercises, withinContinueWindow, CONTINUE_WINDOW_MIN } from '../save-core.ts';

const here = path.dirname(fileURLToPath(import.meta.url));

const set = (i, weight, reps, extra = {}) => ({
  setIndex: i,
  weight,
  targetReps: reps,
  actualReps: reps,
  done: true,
  ...extra,
});

const session = (exercises) => ({
  workoutName: 'Heavy Pull',
  activityType: 'strength',
  startedAt: '2026-08-09T09:00:00.000Z',
  exercises,
});

// ─────────────────────────────────────────────────────────────────────────────
// ONLY THE NEW WORK TRAVELS
// ─────────────────────────────────────────────────────────────────────────────

test('sets already committed are not written a second time', () => {
  const s = session([
    {
      name: 'Barbell Deadlift',
      catalogKey: 'barbell-deadlift',
      section: 'main',
      position: 0,
      sets: [
        set(0, 315, 5, { saved: true }), // logged before the accidental finish
        set(1, 315, 5, { saved: true }),
        set(2, 335, 3), // added after reopening
      ],
    },
  ]);

  const [row] = buildAppendExercises(s);
  assert.equal(row.sets.length, 1, 'only the set added after reopening may travel');
  assert.equal(row.sets[0].weight, 335);
});

test('an exercise with nothing new is dropped entirely', () => {
  // ⚠ Otherwise continuing a session and doing nothing appends a row of empty exercises to it.
  const s = session([
    {
      name: 'Barbell Deadlift',
      catalogKey: 'barbell-deadlift',
      section: 'main',
      position: 0,
      sets: [set(0, 315, 5, { saved: true })],
    },
    {
      name: 'Barbell Row',
      catalogKey: 'barbell-row',
      section: 'main',
      position: 1,
      sets: [set(0, 135, 10)],
    },
  ]);

  const rows = buildAppendExercises(s);
  assert.equal(rows.length, 1, 'the untouched exercise must not be appended');
  assert.equal(rows[0].name, 'Barbell Row');
});

test('a reopened session with no new work appends nothing at all', () => {
  const s = session([
    { name: 'Back Squat', catalogKey: 'barbell-back-squat', section: 'main', position: 0, sets: [set(0, 225, 5, { saved: true })] },
  ]);
  assert.deepEqual(buildAppendExercises(s), []);
});

test('an ordinary session is unaffected — nothing is marked saved', () => {
  // The flag only ever appears on a REOPENED workout. A normal finish must still write everything.
  const s = session([
    { name: 'Bench Press', catalogKey: 'barbell-bench-press', section: 'main', position: 0, sets: [set(0, 185, 5), set(1, 185, 5)] },
  ]);
  assert.equal(buildAppendExercises(s)[0].sets.length, 2);
  assert.equal(buildSaveExercises(s)[0].sets.length, 2);
});

test('an unfinished set never travels, saved or not', () => {
  const s = session([
    {
      name: 'Overhead Press',
      catalogKey: 'barbell-overhead-press',
      section: 'main',
      position: 0,
      sets: [set(0, 95, 5), { setIndex: 1, weight: null, targetReps: 5, actualReps: null, done: false }],
    },
  ]);
  assert.equal(buildAppendExercises(s)[0].sets.length, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE WINDOW
// ─────────────────────────────────────────────────────────────────────────────

test('the window is short, and closes', () => {
  const now = Date.parse('2026-08-09T12:00:00.000Z');
  const at = (mins) => new Date(now - mins * 60000).toISOString();

  assert.equal(withinContinueWindow(at(1), now), true, 'a minute ago is the case this exists for');
  assert.equal(withinContinueWindow(at(59), now), true);
  assert.equal(withinContinueWindow(at(61), now), false, 'past the hour it stops being one workout');
  assert.equal(withinContinueWindow(at(60 * 8), now), false);
});

test('a missing or unparseable timestamp never opens the window', () => {
  for (const bad of [null, undefined, '', 'yesterday']) {
    assert.equal(withinContinueWindow(bad), false, `${String(bad)} must not offer a continue`);
  }
});

test('a future timestamp is refused rather than treated as recent', () => {
  // Clock skew, not a workout from the future. `now - t` goes negative and must not read as "0 minutes".
  const now = Date.parse('2026-08-09T12:00:00.000Z');
  assert.equal(withinContinueWindow(new Date(now + 5 * 60000).toISOString(), now), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE MIGRATION — what it must NOT do
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The executable body of 0125, with comments stripped.
 *
 * ⚠ SCOPED, AND THE FIRST VERSION WAS NOT. Asserting `doesNotMatch(sql, /workout_count/)` over the whole
 * file failed on the migration's own header — the paragraph explaining that the chapter counter must not
 * move contains the words "workout_count". The test was reading prose and calling it code, which is the
 * same mistake in the opposite direction: a guard that fires on its own explanation.
 */
function bodyOf0125() {
  const sql = readFileSync(path.join(here, '../../../../supabase/migrations/0125_continue_workout.sql'), 'utf8');
  const body = sql.slice(sql.indexOf('as $fn$'), sql.lastIndexOf('$fn$;'));
  return body
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

test('0125 appends without re-running the things that already happened', () => {
  const body = bodyOf0125();

  assert.match(body, /insert into public\.workout_exercises/, 'it must append exercises');
  assert.match(body, /60 minutes/, 'the window is enforced server-side — a device clock is an input, not a fact');

  /*
   * ⚠ THE ASSERTIONS THAT MATTER. Each of these would be silent: no error, no failing query, just a
   * number that quietly overstates the athlete's training.
   */
  assert.doesNotMatch(body, /workout_count/, 'the chapter counter must not move — this is the same session');
  assert.doesNotMatch(body, /insert into public\.program_sessions/, 'the program slot was claimed at the first save');
  assert.doesNotMatch(body, /PROGRAM_GRADUATED/, 'graduation already happened, or already did not');
  assert.doesNotMatch(body, /started_at\s*=/, 'the session started when it started');
});

test('0125 only ever lengthens the recorded duration', () => {
  const sql = readFileSync(path.join(here, '../../../../supabase/migrations/0125_continue_workout.sql'), 'utf8');
  // A continue adds time. `greatest` means a shorter number from a re-opened session cannot shrink it.
  assert.match(sql, /greatest\(coalesce\(duration_sec, 0\), p_duration_sec\)/);
});

test('the client window and the server window agree', () => {
  const sql = readFileSync(path.join(here, '../../../../supabase/migrations/0125_continue_workout.sql'), 'utf8');
  assert.equal(CONTINUE_WINDOW_MIN, 60);
  assert.match(sql, new RegExp(`${CONTINUE_WINDOW_MIN} minutes`), 'two windows that disagree is a button that lies');
});
