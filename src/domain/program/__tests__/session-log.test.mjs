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
  plannedDays,
  slotStates,
  swapSessionOrder,
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
  assert.equal(touchedCount(STRUCTURE, marks), 2);
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
  assert.equal(touchedCount(STRUCTURE, marks), 6);
  assert.ok(isProgramFinished(STRUCTURE, marks), 'six accounted-for sessions finish a six-session program');
  assert.equal(nextOpenSlot(STRUCTURE, marks), null, 'a finished program has nothing left to open');
});

/**
 * ⚠ THE HONEST HALF. The tally is what a graduation is allowed to say. Counting a skip toward completion
 * and calling it a workout are different things, and only the first was asked for.
 */
test('a finished program still says how much of it was actually trained', () => {
  const marks = [mark(0, 0), mark(0, 1, 'skipped'), mark(0, 2), mark(1, 0, 'skipped'), mark(1, 1), mark(1, 2)];
  assert.deepEqual(sessionTally(STRUCTURE, marks), { trained: 4, skipped: 2, touched: 6 });
  assert.notEqual(sessionTally(STRUCTURE, marks).trained, 6, 'a skip must never be countable as a session trained');
});

// ─────────────────────────────────────────────────────────────────────────────
// ORPHANED MARKS — a row that outlived the session it was written against
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ THE GRADUATION BUG THESE GUARD. Rows in `program_sessions` are keyed by (week_index, day_index) and
 * nothing deletes them when a structure shrinks. Graduation is `touched >= totalSessions(structure)` with
 * the total recomputed from the CURRENT structure — so counting rows that no longer name a session let a
 * shortened program read as finished, writing a PROGRAM_GRADUATED timeline event and five honors that
 * cannot be revoked (Amendment-001 §1).
 *
 * The structural edit that produces orphans is now blocked at both ends — Edit is future-state only
 * (W-5 Decision 1) and the server rejects a structure write on a started program. These tests hold the
 * arithmetic line behind both, because a UI rule is not a proof and the coach's edit layer will write to
 * live programs by design.
 */
test('a mark with no live slot is not counted', () => {
  // Six rows written against a six-session program, which then shrank to one week.
  const marks = [mark(0, 0), mark(0, 1), mark(0, 2), mark(1, 0), mark(1, 1), mark(1, 2)];
  const shrunk = { ...STRUCTURE, weeks: 1 };
  assert.equal(totalSessions(shrunk), 3);
  assert.equal(touchedCount(shrunk, marks), 3, 'only the three marks that still name a session may count');
});

test('orphaned marks cannot graduate a program', () => {
  const marks = [mark(0, 0), mark(0, 1), mark(0, 2), mark(1, 0), mark(1, 1)];
  // Against the real two-week program: five of six done, not finished.
  assert.ok(!isProgramFinished(STRUCTURE, marks));
  // Shrink it to one week. A raw count says 5 >= 3 and graduates. The slot-validated count says 3 >= 3.
  const shrunk = { ...STRUCTURE, weeks: 1 };
  assert.equal(touchedCount(shrunk, marks), 3, 'the two week-2 rows no longer name a session');
  assert.equal(marks.length, 5, 'the rows themselves are untouched — nothing is deleted, only uncounted');
});

test('the tally never reports work against sessions that no longer exist', () => {
  const marks = [mark(0, 0), mark(0, 1, 'skipped'), mark(1, 0), mark(1, 1, 'skipped'), mark(1, 2)];
  const shrunk = { ...STRUCTURE, weeks: 1 };
  assert.deepEqual(sessionTally(shrunk, marks), { trained: 1, skipped: 1, touched: 2 });
});

test('a mark on a day the structure never had is not counted', () => {
  // Not only shrinking: a mark can also name a day index past the width of its week.
  assert.equal(touchedCount(STRUCTURE, [mark(0, 0), mark(0, 7)]), 1);
  assert.equal(touchedCount(STRUCTURE, [mark(9, 0)]), 0);
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

// ─────────────────────────────────────────────────────────────────────────────
// SWAPPING TWO SESSIONS — a real reorder of the plan
// ─────────────────────────────────────────────────────────────────────────────

test('swapping two sessions changes their order in that week', () => {
  const out = swapSessionOrder(STRUCTURE, 0, 0, 2);
  assert.deepEqual(
    plannedDays(out, 0).map((d) => d.letter),
    ['C', 'B', 'A'],
    'week 1 must show the new order',
  );
});

/**
 * ⚠ THE REASON THIS IS NOT A ONE-LINE ARRAY SWAP. A non-varying program stores ONE `days` array that
 * every week repeats, so reordering it in place would rewrite every remaining week — swapping two days
 * in week 1 because the rack was busy would silently change weeks 2 through 8 too.
 */
test('the other weeks keep the order they had', () => {
  const out = swapSessionOrder(STRUCTURE, 0, 0, 2);
  assert.deepEqual(plannedDays(out, 1).map((d) => d.letter), ['A', 'B', 'C'], 'week 2 must be untouched');
  assert.ok(out.vary, 'the program becomes per-week so one week can differ from another');
  assert.equal(out.weekPlans.length, 2);
});

test('a swap does not change how long the program is', () => {
  const out = swapSessionOrder(STRUCTURE, 0, 0, 2);
  assert.equal(totalSessions(out), totalSessions(STRUCTURE), 'reordering is not adding or removing work');
});

/**
 * The record is keyed by (week, dayIndex), so a swap must never move a session that already has one —
 * it would re-point that row at a different workout and the app would claim a session nobody trained.
 * The screen only offers untouched days; this pins what "untouched" buys.
 */
test('a session at another position keeps its index, so its record still means what it said', () => {
  // Week 1: A done at index 0. Swapping B and C (1 and 2) must leave index 0 alone.
  const marks = [mark(0, 0)];
  const out = swapSessionOrder(STRUCTURE, 0, 1, 2);
  assert.equal(plannedDays(out, 0)[0].letter, 'A', 'the completed session must not move');
  assert.equal(slotStates(out, marks)[0].state, 'completed');
  assert.equal(slotStates(out, marks)[1].state, null);
});

test('the next session follows the new order', () => {
  // Nothing done yet; after swapping positions 0 and 2, the first session up is what was Day C.
  const out = swapSessionOrder(STRUCTURE, 0, 0, 2);
  const next = nextOpenSlot(out, []);
  assert.deepEqual([next.weekIndex, next.dayIndex], [0, 0]);
  assert.equal(next.day.letter, 'C', 'Home must offer whatever now sits first');
});

test('a swap that cannot mean anything is a no-op', () => {
  assert.equal(swapSessionOrder(STRUCTURE, 0, 1, 1), STRUCTURE, 'a day with itself');
  assert.equal(swapSessionOrder(STRUCTURE, 9, 0, 1), STRUCTURE, 'a week that does not exist');
  assert.equal(swapSessionOrder(STRUCTURE, 0, 0, 9), STRUCTURE, 'a day that does not exist');
});

test('swapping inside an already-varying program edits only that week', () => {
  const varied = {
    ...STRUCTURE,
    vary: true,
    weekPlans: [{ days: [day('A'), day('B'), day('C')] }, { days: [day('X'), day('Y'), day('Z')] }],
  };
  const out = swapSessionOrder(varied, 1, 0, 1);
  assert.deepEqual(plannedDays(out, 1).map((d) => d.letter), ['Y', 'X', 'Z']);
  assert.deepEqual(plannedDays(out, 0).map((d) => d.letter), ['A', 'B', 'C'], 'week 1 must not move');
});
