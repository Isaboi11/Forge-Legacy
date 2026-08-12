import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSubstitutions } from '../save-core.ts';

const set = (i, done = true) => ({ setIndex: i, targetReps: 8, weight: 135, actualReps: 8, done });

const ex = (over = {}) => ({
  name: 'Barbell Back Squat',
  catalogKey: 'barbell-back-squat',
  section: 'main',
  position: 0,
  sets: [set(0), set(1)],
  ...over,
});

const session = (exercises) => ({
  workoutName: 'Legs',
  activityType: 'strength',
  startedAt: '2026-08-11T17:00:00.000Z',
  exercises,
});

// ─────────────────────────────────────────────────────────────────────────────
// THE ORDINARY SESSION SENDS NOTHING
// ─────────────────────────────────────────────────────────────────────────────

test('a session with no substitutions produces no rows', () => {
  assert.deepEqual(buildSubstitutions(session([ex(), ex({ position: 1, name: 'Leg Press' })])), []);
});

test('logging different weight or reps is not a substitution (EX-002 §10.1)', () => {
  const s = session([ex({ sets: [{ setIndex: 0, targetReps: 8, weight: 95, actualReps: 5, done: true }] })]);
  assert.deepEqual(buildSubstitutions(s), []);
});

// ─────────────────────────────────────────────────────────────────────────────
// WHAT IT REPLACED
// ─────────────────────────────────────────────────────────────────────────────

test('a swap records what the plan actually prescribed', () => {
  const s = session([
    ex({ name: 'Hack Squat', catalogKey: 'hack-squat', prescribedName: 'Barbell Back Squat', prescribedCatalogKey: 'barbell-back-squat' }),
  ]);
  assert.deepEqual(buildSubstitutions(s), [
    { position: 0, prescribed_catalog_key: 'barbell-back-squat', prescribed_name: 'Barbell Back Squat' },
  ]);
});

test('⚠ a second swap keeps the FIRST prescription — A→B→C was prescribed A', () => {
  /* `swapExercise` never overwrites `prescribedName` once set. Recording B would tell the coach the
     program asked for something it never asked for. */
  const s = session([
    ex({ name: 'Goblet Squat', catalogKey: 'goblet-squat', prescribedName: 'Barbell Back Squat', prescribedCatalogKey: 'barbell-back-squat' }),
  ]);
  assert.equal(buildSubstitutions(s)[0].prescribed_name, 'Barbell Back Squat');
});

test('a prescription with no catalogue key still records — the NAME is the authority (§10.2)', () => {
  const s = session([ex({ name: 'Hack Squat', catalogKey: 'hack-squat', prescribedName: 'Coach’s weird squat', prescribedCatalogKey: null })]);
  assert.deepEqual(buildSubstitutions(s), [
    { position: 0, prescribed_catalog_key: null, prescribed_name: 'Coach’s weird squat' },
  ]);
});

test('swapping back to the same movement records nothing', () => {
  // Otherwise the coach reads a rejection of a lift the athlete in fact chose to keep.
  const s = session([ex({ prescribedName: 'Barbell Back Squat', prescribedCatalogKey: 'barbell-back-squat' })]);
  assert.deepEqual(buildSubstitutions(s), []);
});

test('a name differing only by case or padding is the same movement', () => {
  const s = session([ex({ prescribedName: '  barbell back squat ' })]);
  assert.deepEqual(buildSubstitutions(s), []);
});

test('an empty prescribed name is nothing, not a substitution', () => {
  assert.deepEqual(buildSubstitutions(session([ex({ prescribedName: '   ' })])), []);
});

// ─────────────────────────────────────────────────────────────────────────────
// POSITION IS THE JOIN, AND IT HAS TO SURVIVE THE SAME FILTER
// ─────────────────────────────────────────────────────────────────────────────

test('position travels so the update reaches the right row', () => {
  const s = session([
    ex(),
    ex({ position: 1, name: 'Hack Squat', catalogKey: 'hack-squat', prescribedName: 'Front Squat', prescribedCatalogKey: 'front-squat' }),
    ex({ position: 2, name: 'Leg Curl' }),
  ]);
  assert.deepEqual(buildSubstitutions(s).map((r) => r.position), [1]);
});

test('⚠ a cardio block with no logged sets is dropped, exactly as buildSaveExercises drops it', () => {
  /* It is never inserted, so keying an update to its position would either miss or hit somebody else's
     row. The two functions must filter identically. */
  const s = session([
    ex({ kind: 'cardio', position: 0, sets: [set(0, false)], name: 'Treadmill Run', prescribedName: 'Row' }),
    ex({ position: 1, name: 'Hack Squat', prescribedName: 'Front Squat', prescribedCatalogKey: 'front-squat' }),
  ]);
  assert.deepEqual(buildSubstitutions(s).map((r) => r.position), [1]);
});

test('a cardio block that WAS logged still records its substitution', () => {
  const s = session([
    ex({ kind: 'cardio', position: 0, sets: [set(0)], name: 'Treadmill Run', catalogKey: 'treadmill-run', prescribedName: 'Row', prescribedCatalogKey: 'row-erg' }),
  ]);
  assert.deepEqual(buildSubstitutions(s), [{ position: 0, prescribed_catalog_key: 'row-erg', prescribed_name: 'Row' }]);
});
