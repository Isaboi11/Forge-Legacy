import { test } from 'node:test';
import assert from 'node:assert/strict';
import { e1rm, sessionVolume, doneSetCount, hasLoggedSet, detectPRs, bestRecordWeight, PR_MAX_REPS } from '../metrics.ts';

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
  const prs = detectPRs(session, { 'Back Squat': 300, Deadlift: 400 });
  assert.equal(prs.length, 2);
  assert.deepEqual(prs.map((p) => p.exercise).sort(), ['Back Squat', 'Deadlift']);
  assert.equal(prs.every((p) => p.isFirst === false), true);
});

// ── A RECORD IS A FACT, NOT A CALCULATION ────────────────────────────────────

test('bestRecordWeight — the heaviest weight moved for 1–5 reps, and nothing above', () => {
  assert.equal(PR_MAX_REPS, 5);
  assert.equal(bestRecordWeight([set(0, 225, 5, 5, true), set(1, 245, 3, 3, true)]), 245);
  // A heavier set at 12 reps is real training and is not a record.
  assert.equal(bestRecordWeight([set(0, 225, 5, 5, true), set(1, 250, 12, 12, true)]), 225);
  // Nothing in the band at all.
  assert.equal(bestRecordWeight([set(0, 135, 12, 12, true)]), null);
  // Pending sets are not performances.
  assert.equal(bestRecordWeight([set(0, 400, 3, null, false)]), null);
});

test('a high-rep light set can no longer out-rank a genuine heavy triple', () => {
  // Under estimated 1RM this was the failure: 60×25 computes to 110, beating 80×3 at 88. A record is now
  // the weight on the bar, so 60 never beats 80 no matter how many times it moves.
  const s = { ...session, exercises: [{ name: 'Press', section: 'main', position: 0, sets: [set(0, 60, 25, 25, true)] }] };
  assert.deepEqual(detectPRs(s, { Press: 80 }), []);
});

test('the FIRST time on a lift is a baseline — recorded, never announced', () => {
  // Straight from a real athlete's records: 3 lb, then 35, then 90 — three "records" in a day on a lift
  // they had only just met. The first is now silent.
  const first = { ...session, exercises: [{ name: 'Dumbbell Bench Press', section: 'main', position: 0, sets: [set(0, 3, 5, 5, true)] }] };
  const prs = detectPRs(first, {}); // {} = never done it
  assert.equal(prs.length, 1, 'the mark must still be written — the next session needs something to beat');
  assert.equal(prs[0].isFirst, true, 'and it must be flagged, so nothing calls it a record');
});

test('the SECOND time is a real record, because now there was something to beat', () => {
  const s = { ...session, exercises: [{ name: 'Dumbbell Bench Press', section: 'main', position: 0, sets: [set(0, 35, 5, 5, true)] }] };
  const prs = detectPRs(s, { 'Dumbbell Bench Press': 3 });
  assert.equal(prs.length, 1);
  assert.equal(prs[0].isFirst, false);
  assert.equal(prs[0].weight, 35);
});

test('an absent lift means NEVER DONE, and must never be read as zero', () => {
  // The whole distinction lives in undefined-vs-0. A `?? 0` anywhere brings the flood straight back:
  // every set a beginner performs would beat it.
  const s = { ...session, exercises: [{ name: 'New Lift', section: 'main', position: 0, sets: [set(0, 95, 5, 5, true)] }] };
  assert.equal(detectPRs(s, {})[0].isFirst, true);
  assert.equal(detectPRs(s, { 'New Lift': 0 })[0].isFirst, false, 'an explicit 0 is a real prior mark and 95 beats it');
});

test('matching your best is not beating it', () => {
  const s = { ...session, exercises: [{ name: 'Squat', section: 'main', position: 0, sets: [set(0, 225, 5, 5, true)] }] };
  assert.deepEqual(detectPRs(s, { Squat: 225 }), []);
});

test('a day of nothing but 4×12 sets no records, and that is correct', () => {
  const s = {
    ...session,
    exercises: [{ name: 'Lateral Raise', section: 'main', position: 0, sets: [
      set(0, 20, 12, 12, true), set(1, 25, 12, 12, true), set(2, 30, 12, 12, true),
    ] }],
  };
  assert.deepEqual(detectPRs(s, { 'Lateral Raise': 15 }), [],
    'going heavier at 12 reps is improvement, shown on the Record — it is not a personal record');
});
