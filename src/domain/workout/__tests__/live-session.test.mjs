/**
 * live-session.test.mjs — the snapshot a friend sees of a session, and the rules that keep it small.
 *
 * Run:  node --test src/domain/workout/__tests__/live-session.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { isLiveSnapshot, liveProgress, liveSessionSnapshot } from '../live-session.ts';

const set = (over = {}) => ({ setIndex: 0, weight: null, targetReps: 8, actualReps: null, done: false, ...over });

const SESSION = {
  workoutName: 'Push A',
  activityType: 'strength',
  startedAt: '2026-08-27T18:00:00.000Z',
  exerciseIndex: 1,
  exercises: [
    {
      name: 'Bench Press',
      section: 'main',
      position: 0,
      note: 'felt heavy',
      coachNote: 'pause on the chest',
      sets: [set({ weight: 135, actualReps: 8, done: true }), set({ setIndex: 1, weight: 135, actualReps: 7, done: true }), set({ setIndex: 2, weight: 135 })],
    },
    {
      name: 'Run',
      kind: 'cardio',
      activity: 'run',
      targetMi: 2,
      section: 'cooldown',
      position: 1,
      sets: [set({ targetReps: 0, targetSec: 900 })],
    },
  ],
};

test('the snapshot carries the plan and the log, and nothing personal', () => {
  const snap = liveSessionSnapshot(SESSION);
  assert.equal(snap.v, 1);
  assert.equal(snap.workoutName, 'Push A');
  assert.equal(snap.exerciseIndex, 1);
  assert.deepEqual(snap.exercises[0].sets[0], { done: true, weight: 135, reps: 8, targetReps: 8, targetSec: null, durationSec: null });
  assert.deepEqual(snap.exercises[0].sets[2], { done: false, weight: 135, reps: null, targetReps: 8, targetSec: null, durationSec: null });
  assert.equal(snap.exercises[1].kind, 'cardio');
  assert.equal(snap.exercises[1].activity, 'run');
  assert.equal(snap.exercises[1].targetMi, 2);
  // ⚠ The athlete's notes and the coach's cue are theirs. Neither crosses the wire.
  const json = JSON.stringify(snap);
  assert.doesNotMatch(json, /felt heavy|pause on the chest|coachNote|note/);
});

test('the exercise index is clamped to the list, and an empty session is index 0', () => {
  assert.equal(liveSessionSnapshot({ ...SESSION, exerciseIndex: 9 }).exerciseIndex, 1);
  assert.equal(liveSessionSnapshot({ ...SESSION, exerciseIndex: -3 }).exerciseIndex, 0);
  assert.equal(liveSessionSnapshot({ ...SESSION, exercises: [], exerciseIndex: 2 }).exerciseIndex, 0);
});

test('progress counts sets and finished exercises', () => {
  const p = liveProgress(liveSessionSnapshot(SESSION));
  assert.deepEqual(p, { setsDone: 2, setsTotal: 4, exercisesDone: 0, exercisesTotal: 2 });
  const all = liveProgress({ exercises: [{ sets: [{ done: true }, { done: true }] }, { sets: [{ done: true }] }] });
  assert.deepEqual(all, { setsDone: 3, setsTotal: 3, exercisesDone: 2, exercisesTotal: 2 });
  assert.deepEqual(liveProgress({ exercises: [] }), { setsDone: 0, setsTotal: 0, exercisesDone: 0, exercisesTotal: 0 });
});

test('the reader trusts only the shape it published', () => {
  assert.equal(isLiveSnapshot(liveSessionSnapshot(SESSION)), true);
  assert.equal(isLiveSnapshot(null), false);
  assert.equal(isLiveSnapshot({ v: 2, workoutName: 'x', startedAt: 'y', exerciseIndex: 0, exercises: [] }), false);
  assert.equal(isLiveSnapshot({ v: 1, workoutName: 'x', startedAt: 'y', exerciseIndex: 0, exercises: [{ name: 'a', sets: [{ done: 'yes' }] }] }), false);
  assert.equal(isLiveSnapshot({ v: 1, workoutName: 'x', startedAt: 'y', exerciseIndex: 0, exercises: [{ name: 'a', sets: [] }] }), true);
});
