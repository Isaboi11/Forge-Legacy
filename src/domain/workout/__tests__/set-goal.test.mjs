import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyRepGoal,
  applyTimeGoal,
  fmtGoalSec,
  GOAL_REPS_DEFAULT,
  GOAL_REPS_MAX,
  GOAL_SEC_DEFAULT,
  GOAL_SEC_MAX,
  GOAL_SEC_MIN,
  goalModeOf,
  goalRepsOf,
  goalSecOf,
  parseGoalReps,
  parseGoalSec,
  stepReps,
  stepSec,
} from '../set-goal.ts';
/* The panel writes the set; these decide what that set MEANS. Imported here because the bug this file
   now guards was invisible from inside `set-goal` alone — the marker looked reasonable, and only the
   volume and record math showed what it did. */
import { detectPRs, sessionVolume } from '../metrics.ts';
import { buildSaveExercises } from '../save-core.ts';

/** What the Picker hands back for a lift added as you go: three sets of eight, nothing else. */
const added = (over = {}) => ({
  name: 'Plank',
  section: 'main',
  position: 0,
  sets: Array.from({ length: 3 }, (_, i) => ({ setIndex: i, weight: null, targetReps: 8, actualReps: null, done: false })),
  ...over,
});

// ── reading the standing goal ───────────────────────────────────────────────────────────────────────

test('a freshly added exercise reads as a rep goal of eight', () => {
  const ex = added();
  assert.equal(goalModeOf(ex), 'reps');
  assert.equal(goalRepsOf(ex), 8);
});

test('the mode is read off the next UNLOGGED set, not the first', () => {
  // The regression this guards: set 1 logged against reps, the rest switched to a clock. Reading sets[0]
  // would report 'reps' and flip the panel back the moment the athlete logged their first timed effort.
  const ex = applyTimeGoal(
    { ...added(), sets: [{ setIndex: 0, weight: 95, targetReps: 8, actualReps: 8, done: true }, ...added().sets.slice(1)] },
    40,
  );
  assert.equal(goalModeOf(ex), 'time');
  assert.equal(goalSecOf(ex), 40);
});

test('a timed set carries ZERO reps, and does not report zero as a rep goal', () => {
  // ⚠ THIS ASSERTED `targetReps: 1` AND THE ONE ANNOUNCED A PERSONAL RECORD FOR A CARRY.
  //
  // `bestRecordWeight` skips `reps < 1`, so a set carrying 1 sits inside the 1–5 record band: a 70 lb
  // farmer's carry given a 45s goal measured as 70 lb of rep volume and a 70 lb single, and the next
  // session at 75 would have announced a personal record. Zero is what `sessionSetsFor` already stamps
  // on a prescribed hold, so the two paths into a timed set now agree. See the module header.
  const ex = applyTimeGoal(added(), 45);
  assert.equal(ex.sets[0].targetReps, 0);
  // Tapping Reps must still offer the default rather than prescribing a single repetition of a plank.
  assert.equal(goalRepsOf(ex), GOAL_REPS_DEFAULT);
});

test('⚠ a weighted carry with a time goal sets no record and adds no volume', () => {
  // The regression itself, asserted end to end rather than through the marker value — a later change
  // that "helpfully" restores a rep count would pass the check above and fail this one.
  const ex = applyTimeGoal(added({ name: 'Farmer Carry', catalogKey: 'farmer-carry' }), 45);
  const done = { ...ex, sets: ex.sets.map((s) => ({ ...s, weight: 70, done: true })) };
  const session = { workoutName: 'T', activityType: 'strength', startedAt: new Date(0).toISOString(), programId: null, exercises: [done] };
  assert.equal(sessionVolume(session), 0, 'seconds under load are not rep volume');
  assert.deepEqual(detectPRs(session, {}), [], 'walking with weight is not a one-rep max');
});

test('the seconds still reach the database — zero reps is not zero data', () => {
  const ex = applyTimeGoal(added({ name: 'Plank', catalogKey: 'plank' }), 45);
  const done = { ...ex, sets: ex.sets.map((s) => ({ ...s, done: true })) };
  const [row] = buildSaveExercises({
    workoutName: 'T', activityType: 'strength', startedAt: new Date(0).toISOString(), programId: null, exercises: [done],
  });
  assert.equal(row.sets[0].reps, null, 'a hold has no rep count to store');
  assert.equal(row.sets[0].duration_sec, 45);
});

test('a to-failure set does not report ZERO as its rep goal', () => {
  const ex = added({ sets: [{ setIndex: 0, weight: null, targetReps: 0, toFailure: true, actualReps: null, done: false }] });
  assert.equal(goalRepsOf(ex), GOAL_REPS_DEFAULT);
});

test('an exercise that never had a time goal offers the default', () => {
  // Was 45, while an added Plank arrived carrying 30 — two answers to one question. Now thirty, and
  // `hold-timer.test.mjs` asserts the two constants stay equal so they cannot drift apart again.
  assert.equal(goalSecOf(added()), GOAL_SEC_DEFAULT);
  assert.equal(GOAL_SEC_DEFAULT, 30);
});

// ── writing it ─────────────────────────────────────────────────────────────────────────────────────

test('a rep goal lands on every set', () => {
  const ex = applyRepGoal(added(), 12);
  assert.deepEqual(ex.sets.map((s) => s.targetReps), [12, 12, 12]);
  assert.ok(ex.sets.every((s) => s.targetSec == null), 'and clears any clock, which every renderer checks first');
});

test('a time goal writes the clock onto every unlogged set, and no rep count at all', () => {
  /*
   * ⚠ THIS ASSERTED `[1, 1, 1]`, UNDER THE COMMENT *"Zero is the to-failure marker, reads as 'you did
   * nothing' in the Actual column, and would put a zero-rep set into the volume behind a personal
   * record."* All three of those were true when written; none survives:
   *
   *   · the Actual column renders a timed set's CLOCK now, so zero is never read as a rep count;
   *   · completing a timed set does not back-fill the actual from `targetReps`;
   *   · the save sends `reps: null` and `duration_sec` for anything carrying `targetSec`.
   *
   * And the ONE turned out to be the harmful value — see the test above, and the module header.
   */
  const ex = applyTimeGoal(added(), 30);
  assert.deepEqual(ex.sets.map((s) => s.targetSec), [30, 30, 30]);
  assert.deepEqual(ex.sets.map((s) => s.targetReps), [0, 0, 0]);
});

test('LOGGED SETS KEEP THE TARGET THEY WERE PERFORMED AGAINST', () => {
  const done = { setIndex: 0, weight: 135, targetReps: 8, actualReps: 8, done: true };
  const ex = applyRepGoal({ ...added(), sets: [done, ...added().sets.slice(1)] }, 5);
  assert.equal(ex.sets[0].targetReps, 8, 'editing history to match a decision made afterwards');
  assert.deepEqual(ex.sets.slice(1).map((s) => s.targetReps), [5, 5]);
});

test('a saved set from a continued workout is equally untouchable', () => {
  const saved = { setIndex: 0, weight: 135, targetReps: 8, actualReps: 8, done: true, saved: true };
  const ex = applyTimeGoal({ ...added(), sets: [saved] }, 60);
  assert.equal(ex.sets[0].targetSec, undefined);
  assert.equal(ex.sets[0].targetReps, 8);
});

test('an explicit goal clears the prescription it replaces', () => {
  const ex = added({
    sets: [{ setIndex: 0, weight: null, targetReps: 10, targetRepsMax: 12, toFailure: false, actualReps: null, done: false }],
  });
  const flat = applyRepGoal(ex, 6);
  assert.equal(flat.sets[0].targetRepsMax, null, 'their number replaces the range, it does not sit inside it');
  const timed = applyTimeGoal(ex, 30);
  assert.equal(timed.sets[0].targetRepsMax, null);
  assert.equal(timed.sets[0].toFailure, false);
});

test('goals are clamped at both ends', () => {
  assert.equal(applyRepGoal(added(), 0).sets[0].targetReps, 1);
  assert.equal(applyRepGoal(added(), 99999).sets[0].targetReps, GOAL_REPS_MAX);
  assert.equal(applyTimeGoal(added(), 1).sets[0].targetSec, GOAL_SEC_MIN);
  assert.equal(applyTimeGoal(added(), 99999).sets[0].targetSec, GOAL_SEC_MAX);
});

test('nothing is mutated in place', () => {
  const ex = added();
  const before = JSON.stringify(ex);
  applyRepGoal(ex, 12);
  applyTimeGoal(ex, 60);
  assert.equal(JSON.stringify(ex), before);
});

// ── the steppers ───────────────────────────────────────────────────────────────────────────────────

test('reps step by one and time by fifteen seconds', () => {
  assert.equal(stepReps(8, 1), 9);
  assert.equal(stepReps(8, -1), 7);
  assert.equal(stepSec(45, 1), 60);
  assert.equal(stepSec(45, -1), 30);
});

test('a held thumb cannot run off either end', () => {
  assert.equal(stepReps(1, -1), 1);
  assert.equal(stepSec(GOAL_SEC_MIN, -1), GOAL_SEC_MIN);
  assert.equal(stepSec(GOAL_SEC_MAX, 1), GOAL_SEC_MAX);
});

// ── typing ─────────────────────────────────────────────────────────────────────────────────────────

test('typed reps', () => {
  assert.equal(parseGoalReps('12'), 12);
  assert.equal(parseGoalReps(' 5 '), 5);
  assert.equal(parseGoalReps(''), null, 'a cleared field is not a goal of nothing');
  assert.equal(parseGoalReps('0'), null, 'zero is the to-failure marker, not something anybody typed');
  assert.equal(parseGoalReps('8.5'), null);
  assert.equal(parseGoalReps('abc'), null);
});

test('A BARE NUMBER IS SECONDS HERE — the opposite of parseClock', () => {
  // `parseClock` in `conditioning.ts` reads "30" as thirty MINUTES, because it logs a cardio bout. This
  // sets the work time of a set, which is written in seconds. Both are right; neither can be shared.
  assert.equal(parseGoalSec('30'), 30);
  assert.equal(parseGoalSec('45'), 45);
});

test('typed time as a clock', () => {
  assert.equal(parseGoalSec('1:30'), 90);
  assert.equal(parseGoalSec('0:45'), 45);
  assert.equal(parseGoalSec('10:00'), 600);
  assert.equal(parseGoalSec('1:75'), null, 'a typo, not 2:15');
  assert.equal(parseGoalSec('1:'), null, 'half-typed commits nothing and keeps what was there');
  assert.equal(parseGoalSec(':30'), null);
  assert.equal(parseGoalSec('0:00'), null);
  assert.equal(parseGoalSec(''), null);
});

test('the field reads back what it wrote', () => {
  assert.equal(fmtGoalSec(45), '0:45');
  assert.equal(fmtGoalSec(90), '1:30');
  assert.equal(fmtGoalSec(600), '10:00');
  assert.equal(parseGoalSec(fmtGoalSec(95)), 95, 'a round trip through the field changes nothing');
});
