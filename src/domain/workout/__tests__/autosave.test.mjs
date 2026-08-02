import test from 'node:test';
import assert from 'node:assert/strict';

import { hasLoggedWork } from '../autosave.ts';

/*
 * ══ ONE ANSWER TO "IS THERE A SESSION" ══
 *
 * Home decides whether to say "Continue Workout" and the logger decides whether to offer "Resume", and
 * both ask this. Written twice they would eventually disagree, and the failure is specific: Home offers
 * to continue, the athlete taps it, the logger sees nothing worth resuming and starts them fresh — the
 * offer destroying the thing it advertised.
 */

const set = (done) => ({ setIndex: 0, weight: 100, targetReps: 5, actualReps: 5, done });
const session = (exercises) => ({ startedAt: new Date(0).toISOString(), workoutName: 'W', exercises });

test('no session at all is not work', () => {
  assert.equal(hasLoggedWork(null), false);
  assert.equal(hasLoggedWork(undefined), false);
});

test('STARTED is not LOGGED — an opened session with nothing done offers nothing', () => {
  // Resuming this is indistinguishable from starting, so neither surface should mention it.
  assert.equal(hasLoggedWork(session([])), false, 'no exercises');
  assert.equal(hasLoggedWork(session([{ name: 'Bench', sets: [] }])), false, 'exercises but no sets');
  assert.equal(hasLoggedWork(session([{ name: 'Bench', sets: [set(false), set(false)] }])), false,
    'sets planned but none completed');
});

test('one completed set anywhere is work worth keeping', () => {
  assert.equal(hasLoggedWork(session([{ name: 'Bench', sets: [set(true)] }])), true);
  assert.equal(
    hasLoggedWork(session([
      { name: 'Bench', sets: [set(false)] },
      { name: 'Row', sets: [set(false), set(true)] },
    ])),
    true,
    'the completed set is in the second exercise, and it still counts',
  );
});

test('a malformed session never throws — it just is not work', () => {
  // This is read straight out of storage, which may hold anything an older build wrote.
  assert.equal(hasLoggedWork({}), false);
  assert.equal(hasLoggedWork({ exercises: null }), false);
  assert.equal(hasLoggedWork({ exercises: [{ name: 'X' }] }), false, 'an exercise with no sets array');
});
