import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAppendExercises,
  buildSaveExercises,
  buildSubstitutions,
  recordedExercises,
} from '../save-core.ts';

/**
 * ⚠ THE ROW AND THE EXERCISE MUST DESCRIBE THE SAME LIFT.
 *
 * `buildAppendExercises` pairs each row from `buildSaveExercises` with the session exercise it came from.
 * Both must be read off the SAME list. They were not: the rows came from the filtered list and the
 * exercise was looked up by index in `session.exercises`, so any dropped cardio block shifted every
 * later pairing by one.
 *
 * The failure was silent and total — `continue_workout` received `[]`, reported `sets_added: 0`, raised
 * nothing, and the athlete was sent to the completion screen with their sets discarded.
 *
 * Every test below fails if `recorded[i]` is changed back to `session.exercises[i]`. Verified by mutation.
 */

const set = (i, o = {}) => ({
  setIndex: i,
  weight: 100,
  targetReps: 5,
  actualReps: 5,
  done: true,
  saved: false,
  ...o,
});

const ex = (name, kind, position, sets) => ({
  name,
  kind,
  position,
  sets,
  catalogKey: null,
  note: null,
  section: 'main',
  groupId: null,
  groupName: null,
  groupKind: null,
  groupRounds: null,
  prescribedName: null,
  prescribedCatalogKey: null,
});

/** An unstarted treadmill block, a lift already committed, and three genuinely new sets. */
const sessionWithDroppedCardio = () => ({
  exercises: [
    ex('Treadmill Run', 'cardio', 0, [set(0, { done: false, weight: null })]),
    ex('Barbell Deadlift', 'strength', 1, [set(0, { saved: true })]),
    ex('Barbell Row', 'strength', 2, [set(0), set(1), set(2)]),
  ],
});

test('new sets survive a continue when an un-logged cardio block is in the session', () => {
  const appended = buildAppendExercises(sessionWithDroppedCardio());

  assert.equal(appended.length, 1, 'the one exercise with new work must be appended');
  assert.equal(appended[0].name, 'Barbell Row');
  assert.equal(appended[0].sets.length, 3, 'all three new sets, not none and not some');
  assert.deepEqual(
    appended[0].sets.map((s) => s.set_index),
    [0, 1, 2],
  );
});

test('the appended row is the exercise that owns the sets, not its neighbour', () => {
  // Two lifts with DIFFERENT set counts behind a dropped cardio block. If the pairing slips, the row
  // keeps one exercise's name while its sets are filtered by another's indices.
  const session = {
    exercises: [
      ex('Rower', 'cardio', 0, [set(0, { done: false, weight: null })]),
      ex('Back Squat', 'strength', 1, [set(0), set(1)]),
      ex('Calf Raise', 'strength', 2, [set(0)]),
    ],
  };

  const appended = buildAppendExercises(session);
  const bySquat = appended.find((r) => r.name === 'Back Squat');
  const byCalf = appended.find((r) => r.name === 'Calf Raise');

  assert.ok(bySquat, 'Back Squat must be appended');
  assert.ok(byCalf, 'Calf Raise must be appended');
  assert.equal(bySquat.sets.length, 2, 'Back Squat keeps its own two sets');
  assert.equal(byCalf.sets.length, 1, 'Calf Raise keeps its own one set');
});

test('an exercise whose every logged set is already committed is still dropped', () => {
  const session = {
    exercises: [
      ex('Barbell Deadlift', 'strength', 0, [set(0, { saved: true }), set(1, { saved: true })]),
    ],
  };
  assert.deepEqual(buildAppendExercises(session), [], 'nothing new means nothing appended');
});

test('a cardio block that WAS logged keeps its place in the pairing', () => {
  const session = {
    exercises: [
      ex('Treadmill Run', 'cardio', 0, [
        set(0, { weight: null, durationSec: 900, distanceMi: 1.5, modality: 'indoor' }),
      ]),
      ex('Barbell Row', 'strength', 1, [set(0)]),
    ],
  };

  const appended = buildAppendExercises(session);
  assert.equal(appended.length, 2, 'a logged bout is real work and is appended');
  assert.deepEqual(appended.map((r) => r.name), ['Treadmill Run', 'Barbell Row']);
  assert.equal(appended[1].sets.length, 1, 'the lift keeps its own set, not the cardio leg');
});

test('recordedExercises is the single list every writer walks', () => {
  const session = sessionWithDroppedCardio();
  const recorded = recordedExercises(session);

  assert.deepEqual(
    recorded.map((e) => e.name),
    ['Barbell Deadlift', 'Barbell Row'],
    'the un-logged cardio block is not recorded work',
  );
  // The contract the append pairing depends on: same length, same order, index-for-index.
  assert.deepEqual(
    buildSaveExercises(session).map((r) => r.name),
    recorded.map((e) => e.name),
    'buildSaveExercises must stay index-aligned with recordedExercises',
  );
});

test('substitutions are still keyed by position off that same list', () => {
  const session = {
    exercises: [
      ex('Rower', 'cardio', 0, [set(0, { done: false, weight: null })]),
      { ...ex('Hack Squat', 'strength', 1, [set(0)]), prescribedName: 'Back Squat' },
    ],
  };

  const subs = buildSubstitutions(session);
  assert.equal(subs.length, 1);
  assert.equal(subs[0].position, 1, 'position, not array index — the row it annotates was inserted at 1');
  assert.equal(subs[0].prescribed_name, 'Back Squat');
});
