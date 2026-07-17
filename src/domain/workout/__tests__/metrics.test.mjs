import { test } from 'node:test';
import assert from 'node:assert/strict';
import { e1rm, sessionVolume, doneSetCount, hasLoggedSet, detectPRs } from '../metrics.ts';

const set = (setIndex, weight, targetReps, actualReps, done) => ({ setIndex, weight, targetReps, actualReps, done });
const session = {
  workoutName: 'Lower A', activityType: 'strength', startedAt: '2026-07-17T00:00:00Z',
  exercises: [
    { name: 'Back Squat', section: 'main', position: 0, sets: [
      set(0, 315, 5, 5, true),   // done, 315x5
      set(1, 315, 5, 3, true),   // done, 315x3
      set(2, 315, 5, null, false), // pending
    ] },
    { name: 'Deadlift', section: 'main', position: 1, sets: [
      set(0, 405, 3, null, true), // done, actual null → target 3
    ] },
  ],
};

test('e1rm — Epley', () => {
  assert.equal(e1rm(300, 0), 300);
  assert.equal(e1rm(300, 30), 600);
  assert.equal(Math.round(e1rm(315, 5)), 368);
});

test('sessionVolume — done, weighted sets, actual ?? target', () => {
  // Back Squat: 315*5 + 315*3 = 2520 ; Deadlift: 405*3 (actual null→target) = 1215 → 3735
  assert.equal(sessionVolume(session), 3735);
});

test('doneSetCount + hasLoggedSet', () => {
  assert.equal(doneSetCount(session), 3);
  assert.equal(hasLoggedSet(session), true);
  assert.equal(hasLoggedSet({ ...session, exercises: [{ name: 'x', section: 'main', position: 0, sets: [set(0, 100, 5, null, false)] }] }), false);
});

test('detectPRs — best done set by e1rm vs current best', () => {
  // Back Squat best done = 315x5 (e1rm ~367.5); current best 315x3 (e1rm 346.5) → PR
  // Deadlift best done = 405x3 (e1rm 445.5); current best 0 → PR
  const prs = detectPRs(session, { 'Back Squat': e1rm(315, 3), Deadlift: 0 });
  assert.deepEqual(prs, [
    { exercise: 'Back Squat', weight: 315, reps: 5 },
    { exercise: 'Deadlift', weight: 405, reps: 3 },
  ]);
});

test('detectPRs — no PR when current best already higher', () => {
  const prs = detectPRs(session, { 'Back Squat': e1rm(405, 5), Deadlift: e1rm(500, 3) });
  assert.deepEqual(prs, []);
});
