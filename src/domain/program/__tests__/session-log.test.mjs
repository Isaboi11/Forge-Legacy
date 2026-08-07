/**
 * session-log.test.mjs — swapping and skipping sessions inside a program.
 *
 * ══ WHAT THE OLD MODEL COULD NOT SAY ══
 *
 * Asked for: *"During a program, should we have the ability to swap workout days or skip days?"*
 *
 * Skipping a DAY was never a thing — programs are sequential, `dayOfWeek` is always null, and missing a
 * Tuesday costs nothing because there is no Tuesday. Swapping or skipping a SESSION was impossible for a
 * deeper reason: a saved workout recorded `program_id` and **not which session it satisfied**. Progress
 * was `count(workouts)` and "next up" was `slots[count]`.
 *
 * So training Day D instead of Day C pushed the count to 3, served D again, and never offered C — while
 * the app believed it had watched both happen. The tests below are written against the model that
 * replaced it, and the first one is the exact scenario that was broken.
 *
 * ⚠ A SKIP COUNTS TOWARD FINISHING (PO decision: "if they skip a day it's okay and it will still count
 * towards completing the program") AND IS STILL NAMED A SKIP. Both halves are asserted, because the
 * second is what stops a graduation claiming work nobody did.
 *
 * Run:  node --test --experimental-strip-types src/domain/program/__tests__/session-log.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isProgramFinished,
  nextOpenSlot,
  sessionTally,
  slotStates,
  totalSessions,
  touchedCount,
} from '../progress-core.ts';

/** A 2-week, 3-day program: 6 sessions, every day prescribing something. */
const day = (letter) => ({ letter, name: `Day ${letter}`, warmup: [], main: [{ name: 'Squat', sets: 3, reps: 5 }], cooldown: [] });
const STRUCTURE = { name: 'Test', weeks: 2, daysPerWeek: 3, vary: false, days: [day('A'), day('B'), day('C')], weekPlans: null };

const mark = (weekIndex, dayIndex, state = 'completed') => ({ weekIndex, dayIndex, state });

test('the program is six sessions, and nothing is touched to begin with', () => {
  assert.equal(totalSessions(STRUCTURE), 6);
  const states = slotStates(STRUCTURE, []);
  assert.equal(states.length, 6);
  assert.ok(states.every((s) => s.state === null));
  assert.deepEqual(
    states.map((s) => [s.weekIndex, s.dayIndex]),
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
    'the schedule must walk week-major; a stride over ragged weeks is what broke Continue Training before',
  );
});

/**
 * ⚠ THE SCENARIO THE OLD MODEL GOT WRONG. Two sessions done, then the athlete trains day 3 of week 1
 * OUT OF ORDER. The count-based model would have served that same session again and never offered the
 * one that was actually skipped over.
 */
test('training a session out of order does not re-serve it', () => {
  const marks = [mark(0, 0), mark(0, 2)]; // did A and C; B untouched
  const next = nextOpenSlot(STRUCTURE, marks);
  assert.deepEqual([next.weekIndex, next.dayIndex], [0, 1], 'next up must be the untouched B, not C again');
  assert.equal(touchedCount(marks), 2);
});

test('next up is the first untouched session, whatever order they were done in', () => {
  assert.deepEqual(
    [nextOpenSlot(STRUCTURE, []).weekIndex, nextOpenSlot(STRUCTURE, []).dayIndex],
    [0, 0],
    'a fresh program opens at its first session',
  );
  const scattered = [mark(1, 1), mark(0, 1), mark(0, 0)];
  const next = nextOpenSlot(STRUCTURE, scattered);
  assert.deepEqual([next.weekIndex, next.dayIndex], [0, 2]);
});

test('a skip is passed over, exactly like a completion', () => {
  // This is the whole point of the PO decision: a skipped session does not come back around.
  const marks = [mark(0, 0), mark(0, 1, 'skipped')];
  const next = nextOpenSlot(STRUCTURE, marks);
  assert.deepEqual([next.weekIndex, next.dayIndex], [0, 2], 'a skipped session must not be offered again');
});

test('a skip counts toward finishing the program', () => {
  const marks = [mark(0, 0), mark(0, 1, 'skipped'), mark(0, 2), mark(1, 0, 'skipped'), mark(1, 1), mark(1, 2)];
  assert.equal(touchedCount(marks), 6);
  assert.ok(isProgramFinished(STRUCTURE, marks), 'six accounted-for sessions finish a six-session program');
  assert.equal(nextOpenSlot(STRUCTURE, marks), null, 'a finished program has nothing left to open');
});

/**
 * ⚠ THE HONEST HALF. The tally is what a graduation is allowed to say. Counting a skip toward completion
 * and calling it a workout are different things, and only the first was asked for.
 */
test('a finished program still says how much of it was actually trained', () => {
  const marks = [mark(0, 0), mark(0, 1, 'skipped'), mark(0, 2), mark(1, 0, 'skipped'), mark(1, 1), mark(1, 2)];
  assert.deepEqual(sessionTally(marks), { trained: 4, skipped: 2, touched: 6 });
  assert.notEqual(sessionTally(marks).trained, 6, 'a skip must never be countable as a session trained');
});

test('an unfinished program is not finished, however the sessions are spread', () => {
  assert.ok(!isProgramFinished(STRUCTURE, []));
  assert.ok(!isProgramFinished(STRUCTURE, [mark(0, 0), mark(1, 2), mark(0, 2)]));
});

test('the per-slot states are what a schedule screen renders', () => {
  const states = slotStates(STRUCTURE, [mark(0, 0), mark(0, 1, 'skipped')]);
  assert.deepEqual(
    states.map((s) => s.state),
    ['completed', 'skipped', null, null, null, null],
    'the screen must be able to tell a trained day from a skipped one from an outstanding one',
  );
  assert.deepEqual(states.map((s) => s.ordinal), [0, 1, 2, 3, 4, 5]);
});

/**
 * Ragged weeks: the shape that killed Continue Training at session 18 before `scheduleSlots` existed.
 * Six sessions in week 1 and five in week 2 — walking with a stride of six asks a five-day week for its
 * sixth day, gets nothing, and dead-ends.
 */
test('a ragged program still resolves the next session', () => {
  const ragged = {
    name: 'Ragged',
    weeks: 2,
    daysPerWeek: 3,
    vary: true,
    days: [day('A'), day('B'), day('C')],
    weekPlans: [{ days: [day('A'), day('B'), day('C')] }, { days: [day('A'), day('B')] }],
  };
  assert.equal(totalSessions(ragged), 5);
  const marks = [mark(0, 0), mark(0, 1), mark(0, 2), mark(1, 0)];
  const next = nextOpenSlot(ragged, marks);
  assert.deepEqual([next.weekIndex, next.dayIndex], [1, 1], 'the last session of a short week must still be reachable');
  assert.ok(isProgramFinished(ragged, [...marks, mark(1, 1)]));
});
