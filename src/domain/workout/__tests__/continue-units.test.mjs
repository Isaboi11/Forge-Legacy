/**
 * continue-units.test.mjs — "Continue this workout" for an athlete who lifts in kilograms (UX-004, launch QA B15).
 *
 * ══ THE FAILURE THIS GUARDS ══
 *
 * Storage is canonical POUNDS; the logger holds what the athlete TYPED. "Continue this workout" rebuilt the
 * session straight from `workout_sets.weight`, so a kg athlete's 60 kg came back as "132.27735731092653" in the
 * kg column. Finish then canonicalised it a second time (291.62 lb) and `detectPRs` wrote a personal record of a
 * weight nobody lifted — qa1109-06 still holds one (Barbell Front Squat 291.62 lb × 5 beside the real 132.28).
 *
 * The property that matters: a continued set ROUND-TRIPS UNCHANGED — continue → save puts back the exact pound
 * figure that was stored, and cannot beat itself.
 *
 * Run:  node --test --experimental-strip-types src/domain/workout/__tests__/continue-units.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildAppendExercises, buildSaveExercises, canonicalizeWeights, fromCanonicalWeights } from '../save-core.ts';
import { detectPRs } from '../metrics.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (rel) => readFileSync(path.join(here, '../../../', rel), 'utf8');

const set = (i, weight, o = {}) => ({ setIndex: i, weight, targetReps: 5, actualReps: 5, done: true, ...o });
const ex = (name, position, sets) => ({ name, catalogKey: `k-${name}`, section: 'main', position, savedPosition: position, sets });
const session = (exercises, o = {}) => ({
  workoutName: 'Front Squat Day',
  activityType: 'strength',
  startedAt: '2026-11-09T09:00:00.000Z',
  exerciseIndex: 0,
  exercises,
  ...o,
});

/**
 * What the database hands back: the canonical session as JSON (PostgREST returns `numeric` as a JSON number), and
 * every set the first save committed marked `done` + `saved` — the shape `fetchWorkoutAsSession` builds.
 */
const storedAndReopened = (typed, system) => {
  const canonical = canonicalizeWeights(typed, system);
  const rows = JSON.parse(JSON.stringify(buildSaveExercises(canonical)));
  return {
    rows,
    reopened: session(
      rows.map((r) => ex(r.name, r.position, r.sets.map((s) => set(s.set_index, s.weight, { actualReps: s.reps, targetReps: s.reps, saved: true })))),
      { continuingWorkoutId: 'w-1' },
    ),
  };
};

/** The athlete's best on each lift, as `personal_records` holds it after the first save. */
const priorBestFrom = (rows) => Object.fromEntries(rows.map((r) => [r.catalog_key ?? r.name, Math.max(...r.sets.map((s) => s.weight))]));

test('the defect, as it was: pounds read back into the kg column are converted a second time and sold as a record', () => {
  const { rows, reopened } = storedAndReopened(session([ex('Barbell Front Squat', 0, [set(0, 60)])]), 'metric');
  assert.equal(rows[0].sets[0].weight, 60 / 0.45359237, '60 kg is stored as 132.277… lb');
  // No conversion on the way back in — what "Continue this workout" did before the fix.
  const prs = detectPRs(canonicalizeWeights(reopened, 'metric'), priorBestFrom(rows));
  assert.equal(prs.length, 1, 'the false record the fix removes');
  assert.ok(Math.abs(prs[0].weight - 291.62) < 0.01, `291.62 lb, not ${prs[0].weight}`);
});

test('a kg athlete gets their own number back — 60 kg comes back as 60, not 132.277…', () => {
  const { reopened } = storedAndReopened(session([ex('Barbell Front Squat', 0, [set(0, 60), set(1, 60)])]), 'metric');
  const inUnits = fromCanonicalWeights(reopened, 'metric');
  assert.deepEqual(inUnits.exercises[0].sets.map((s) => s.weight), [60, 60]);
});

test('continue → save round-trips a kg set UNCHANGED: the same pound figure, nothing re-sent, no record', () => {
  const typed = session([ex('Barbell Front Squat', 0, [set(0, 60), set(1, 60), set(2, 60)])]);
  const { rows, reopened } = storedAndReopened(typed, 'metric');

  const resumed = fromCanonicalWeights(reopened, 'metric'); // what the logger holds after Continue
  const atFinish = canonicalizeWeights(resumed, 'metric'); // what `continueWorkout` does first

  assert.deepEqual(
    atFinish.exercises[0].sets.map((s) => s.weight),
    rows[0].sets.map((s) => s.weight),
    'exactly the stored pounds — not one float off',
  );
  assert.deepEqual(detectPRs(atFinish, priorBestFrom(rows)), [], 'a set cannot beat itself');
  assert.deepEqual(buildAppendExercises(atFinish), [], 'nothing new, nothing appended');
});

test('every load a kg athlete can rack round-trips exactly — micro-plates and half plates included', () => {
  for (const kg of [0, 1.25, 2.5, 17, 22.5, 37.5, 60, 62.5, 82.5, 100, 142.5, 227.5, 300.25]) {
    const typed = session([ex('Lift', 0, [set(0, kg)])]);
    const { rows, reopened } = storedAndReopened(typed, 'metric');
    const resumed = fromCanonicalWeights(reopened, 'metric');
    assert.equal(resumed.exercises[0].sets[0].weight, kg, `${kg} kg comes back as itself`);
    assert.equal(canonicalizeWeights(resumed, 'metric').exercises[0].sets[0].weight, rows[0].sets[0].weight, `${kg} kg re-stores identically`);
    assert.deepEqual(detectPRs(canonicalizeWeights(resumed, 'metric'), priorBestFrom(rows)), [], `${kg} kg is no record against itself`);
  }
});

test('a set added after Continue is judged in kg like any other — the same load is not a record, a heavier one is', () => {
  const { rows, reopened } = storedAndReopened(session([ex('Barbell Front Squat', 0, [set(0, 60)])]), 'metric');
  const resumed = fromCanonicalWeights(reopened, 'metric');

  const sameAgain = { ...resumed, exercises: [{ ...resumed.exercises[0], sets: [...resumed.exercises[0].sets, set(1, 60)] }] };
  const same = canonicalizeWeights(sameAgain, 'metric');
  assert.deepEqual(detectPRs(same, priorBestFrom(rows)), [], '60 kg again is not a record');
  const [row] = buildAppendExercises(same);
  assert.equal(row.sets.length, 1, 'only the new set travels');
  assert.equal(row.sets[0].weight, rows[0].sets[0].weight, 'stored in pounds, once');

  const heavier = { ...resumed, exercises: [{ ...resumed.exercises[0], sets: [...resumed.exercises[0].sets, set(1, 62.5)] }] };
  const prs = detectPRs(canonicalizeWeights(heavier, 'metric'), priorBestFrom(rows));
  assert.equal(prs.length, 1, '62.5 kg beats 60 kg');
  assert.ok(Math.abs(prs[0].weight - 62.5 / 0.45359237) < 1e-9, 'the record is 62.5 kg in pounds, not 62.5 kg converted twice');
});

test('imperial is the exact identity — the same object, the stored figure untouched (not even quantised)', () => {
  const reopened = session([ex('Back Squat', 0, [set(0, 132.27735731092653, { saved: true }), set(1, 225, { saved: true })])]);
  assert.equal(fromCanonicalWeights(reopened, 'imperial'), reopened);
});

test('only weight moves — bodyweight (null) sets, reps, flags and cardio are carried through', () => {
  const reopened = session([
    ex('Pull-Up', 0, [set(0, null, { actualReps: 8, saved: true })]),
    { ...ex('Outdoor Walk', 1, [set(0, null, { durationSec: 1200, distanceMi: 1.2, saved: true })]), kind: 'cardio' },
  ]);
  const out = fromCanonicalWeights(reopened, 'metric');
  assert.deepEqual(out.exercises[0].sets[0], reopened.exercises[0].sets[0]);
  assert.deepEqual(out.exercises[1], reopened.exercises[1]);
});

test('the live read converts once, and the screen passes the athlete’s units to it', () => {
  const live = src('data/continue-workout-live.ts');
  assert.match(live, /export async function fetchWorkoutAsSession\(workoutId: string, system: UnitSystem\)/, 'units are required, never defaulted');
  assert.match(live, /withPlanRemainder\(fromCanonicalWeights\(stored, system\), remainder\)/, 'converted before the (already-typed) remainder joins');
  const screen = src('app/workout-complete.tsx');
  assert.match(screen, /fetchWorkoutAsSession\(data\.workoutId, units\)/);
});
