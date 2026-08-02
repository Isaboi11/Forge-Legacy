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
  // catalogKey rides along so honors can match the exercise itself rather than its display name (0078).
  // These fixture exercises carry none, so it's null — which is exactly what a hand-entered lift records.
  assert.deepEqual(prs, [
    { exercise: 'Back Squat', weight: 315, reps: 5, catalogKey: null },
    { exercise: 'Deadlift', weight: 405, reps: 3, catalogKey: null },
  ]);
});

test('detectPRs — no PR when current best already higher', () => {
  const prs = detectPRs(session, { 'Back Squat': e1rm(405, 5), Deadlift: e1rm(500, 3) });
  assert.deepEqual(prs, []);
});

/*
 * A PERSONAL RECORD IS A CLAIM ABOUT THE ATHLETE.
 *
 * From a real athlete's records: "Light treadmill walk — 2 minutes", measure_kind `load`, 40 lb. It is a
 * warm-up row. A weight got typed into it, `detectPRs` read every exercise in every section, and the app
 * told somebody they had set a 40 lb record on a walk. These lock the two exclusions that prevent it.
 */
test('detectPRs — a warm-up never sets a record', () => {
  const warmup = {
    ...session,
    exercises: [
      { name: 'Light treadmill walk — 2 minutes', section: 'warmup', position: 0, sets: [set(0, 40, 1, 1, true)] },
      { name: 'Empty bar', section: 'warmup', position: 1, sets: [set(0, 45, 10, 10, true)] },
    ],
  };
  assert.deepEqual(detectPRs(warmup, {}), [], 'a warm-up produced a personal record');
});

test('detectPRs — a cool-down never sets a record either', () => {
  const cool = {
    ...session,
    exercises: [{ name: 'Farmer Carry', section: 'cooldown', position: 0, sets: [set(0, 200, 1, 1, true)] }],
  };
  assert.deepEqual(detectPRs(cool, {}), []);
});

test('detectPRs — a cardio block never sets a LOAD record, whatever is in the weight column', () => {
  // A run has no load. Anything sitting in that column is noise, not a lift.
  const cardio = {
    ...session,
    exercises: [{
      name: 'Treadmill Run', kind: 'cardio', activity: 'run', section: 'main', position: 0,
      sets: [set(0, 40, 0, null, true)],
    }],
  };
  assert.deepEqual(detectPRs(cardio, {}), []);
});

test('detectPRs — main-section lifting still records, so the fix did not silence the feature', () => {
  const prs = detectPRs(session, { 'Back Squat': 0, Deadlift: 0 });
  assert.equal(prs.length, 2);
  assert.deepEqual(prs.map((p) => p.exercise).sort(), ['Back Squat', 'Deadlift']);
});
