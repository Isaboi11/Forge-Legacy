/**
 * schedule-edit.test.mjs — reordering the sessions in a week of a running program.
 *
 * ══ THE ASK ══
 *
 * PO, 2026-09-09: *"He basically has been doing legs one day, then chest on the next, then back… But he
 * started playing soccer on Saturday and doesn't want to do legs on the day he has… he wants to be able
 * to go into the program and drag the days into different orders… And then have that be the adjustments
 * for the rest of the weeks."*
 *
 * Forge programs are sequential — there is no Saturday in a program to move anything off (PAS §2.2). So
 * the feature is: change the ORDER, keep the change, and do it without disturbing a single session the
 * athlete has already trained or skipped.
 *
 * That last clause is the whole difficulty, and it is a correctness rule rather than a courtesy:
 * `program_sessions` rows are keyed by (week_index, day_index), so a session that moves out from under
 * its own record makes the app claim a workout nobody did.
 *
 * Run:  node --test --experimental-strip-types src/domain/program/__tests__/schedule-edit.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  moveInOrder,
  rawIndexOf,
  reorderTargets,
  reorderWeek,
  swapSessionOrder,
  transposition,
  weekSessionCount,
} from '../schedule-edit.ts';
import { plannedDays, scheduleSlots, totalSessions, trainingDays } from '../progress-core.ts';

const day = (name) => ({
  letter: name[0],
  name,
  warmup: [],
  main: [{ name: `${name} lift`, sets: 3, reps: 5 }],
  cooldown: [],
});
/** An authored gap — a day in the raw array that prescribes nothing, so it is not a session owed. */
const empty = (letter) => ({ letter, name: '', warmup: [], main: [], cooldown: [] });

/** The tester's week: a 4-week, 3-day split. Legs is session 3. */
const SPLIT = {
  name: 'Split',
  weeks: 4,
  daysPerWeek: 3,
  vary: false,
  days: [day('Push'), day('Pull'), day('Legs')],
  weekPlans: null,
};

const mark = (weekIndex, dayIndex, state = 'completed') => ({ weekIndex, dayIndex, state });
/** The names of a week's sessions, in the order they will be trained. */
const namesOf = (s, wi) => trainingDays(plannedDays(s, wi)).map((d) => d.name);

// ── RAW vs SCHEDULE INDICES ──────────────────────────────────────────────────────────────────────────

/**
 * ⚠ THE BUG THIS FUNCTION EXISTS TO PREVENT. Schedule index and raw index are the same number only on a
 * week with no gap in it — which is every week Holt and the catalog author, which is why the old
 * `swapSessionOrder` could index the raw array with schedule indices for a year and never be caught.
 */
test('a gap in the raw days makes schedule index and raw index different numbers', () => {
  const days = [day('Push'), empty('B'), day('Pull'), day('Legs')];
  assert.deepEqual([0, 1, 2].map((k) => rawIndexOf(days, k)), [0, 2, 3]);
  assert.equal(rawIndexOf(days, 3), -1, 'there is no fourth session to find');
});

test('with no gaps the two spaces coincide, which is why this went unnoticed', () => {
  const days = [day('Push'), day('Pull'), day('Legs')];
  assert.deepEqual([0, 1, 2].map((k) => rawIndexOf(days, k)), [0, 1, 2]);
});

test('a week is counted by sessions owed, never by the configured day count', () => {
  assert.equal(weekSessionCount(SPLIT, 0), 3);
  const gappy = { ...SPLIT, days: [day('Push'), empty('B'), day('Pull')] };
  assert.equal(weekSessionCount(gappy, 0), 2, 'the empty day is not a session anyone owes');
});

// ── THE SOCCER CASE ──────────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ THE ASK, END TO END. Legs is session 3; the athlete moves it to the front and asks for it to stick.
 */
test('⭐ moving Legs to the front holds for the rest of the program', () => {
  const out = reorderWeek(SPLIT, [], 0, [2, 0, 1], 'rest_of_block');

  assert.deepEqual(namesOf(out, 0), ['Legs', 'Push', 'Pull']);
  assert.deepEqual(namesOf(out, 3), ['Legs', 'Push', 'Pull'], 'and the last week too — that is the ask');
  assert.equal(totalSessions(out), totalSessions(SPLIT), 'a reorder is not a resize (0123)');
});

test('"this week only" leaves every later week exactly as it was', () => {
  const out = reorderWeek(SPLIT, [], 1, [2, 0, 1], 'this_week');

  assert.deepEqual(namesOf(out, 1), ['Legs', 'Push', 'Pull']);
  assert.deepEqual(namesOf(out, 0), ['Push', 'Pull', 'Legs'], 'the week behind them is untouched');
  assert.deepEqual(namesOf(out, 2), ['Push', 'Pull', 'Legs'], 'and so is the week ahead');
});

/**
 * A non-varying program stores ONE `days` array that every week repeats. Editing it in place would
 * rewrite the weeks already trained, so the first reorder materialises per-week plans — the same
 * "Customize" shape the builder writes.
 */
test('the program flips to per-week plans, and `days` mirrors week one', () => {
  const out = reorderWeek(SPLIT, [], 0, [2, 0, 1], 'this_week');
  assert.equal(out.vary, true);
  assert.equal(out.weekPlans.length, 4);
  assert.deepEqual(
    out.days.map((d) => d.name),
    out.weekPlans[0].days.map((d) => d.name),
    '`days` is what program-share renders as "week one"; leaving it stale showed a pre-edit order',
  );
  /* ⚠ A COPY, NOT THE SAME ARRAY. Sharing it would make an in-place edit of `structure.days` — the
     builder's draft path, `edit-ops` — silently rewrite week 1's plan as well. */
  assert.notEqual(out.days, out.weekPlans[0].days, '`days` must not alias `weekPlans[0].days`');
});

// ── PINNED SESSIONS ──────────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ THE CORRECTNESS RULE. A trained or skipped session has a `program_sessions` row keyed by its
 * POSITION. Move it and that record points at a different workout — the app then claims a session
 * nobody did. Touched positions are pinned and the reorder flows around them.
 */
test('⚠ a session already trained does not move, and the rest reorder around it', () => {
  // Push trained in week 1. The athlete then asks for Legs, Push, Pull.
  const out = reorderWeek(SPLIT, [mark(0, 0)], 0, [2, 0, 1], 'this_week');

  assert.deepEqual(namesOf(out, 0), ['Push', 'Legs', 'Pull'], 'Push stays at position 1; Legs takes the next');
});

test('a session already SKIPPED is pinned for the same reason', () => {
  const out = reorderWeek(SPLIT, [mark(0, 0, 'skipped')], 0, [2, 0, 1], 'this_week');
  assert.deepEqual(namesOf(out, 0), ['Push', 'Legs', 'Pull']);
});

test('a pinned session in the MIDDLE holds its position too', () => {
  // Trained out of order: session 2 done first. Asked for the exact reverse.
  const out = reorderWeek(SPLIT, [mark(0, 1)], 0, [2, 1, 0], 'this_week');
  assert.deepEqual(namesOf(out, 0), ['Legs', 'Pull', 'Push'], 'Pull is untouched in the centre');
});

/**
 * The invariant behind all of it, asserted on the OBJECT rather than the name: the day sitting under a
 * written record must be the same day it always was. Reference identity is the strongest way to say it.
 */
test('⚠ the day under every mark is the identical object afterwards', () => {
  const marks = [mark(0, 0), mark(0, 2, 'skipped')];
  const before = trainingDays(plannedDays(SPLIT, 0));
  const out = reorderWeek(SPLIT, marks, 0, [2, 1, 0], 'this_week');
  const after = trainingDays(plannedDays(out, 0));

  for (const m of marks) {
    assert.equal(after[m.dayIndex], before[m.dayIndex], `session ${m.dayIndex} moved out from under its record`);
  }
});

/**
 * ⚠ A MARK CAN OUTLIVE ITS SLOT. Rows are keyed by (week, day) and nothing deletes them when a structure
 * changes shape, so a stale mark beyond the end of the week must not pin a position that no longer
 * corresponds to it — that would freeze a session the athlete is entitled to move.
 */
test('a stale mark past the end of the week pins nothing', () => {
  const out = reorderWeek(SPLIT, [mark(0, 7)], 0, [2, 1, 0], 'this_week');
  assert.deepEqual(namesOf(out, 0), ['Legs', 'Pull', 'Push'], 'the full reversal still happens');
});

test('a fully trained week cannot be reordered at all, and says so by not moving', () => {
  const out = reorderWeek(SPLIT, [mark(0, 0), mark(0, 1), mark(0, 2)], 0, [2, 1, 0], 'this_week');
  assert.deepEqual(namesOf(out, 0), ['Push', 'Pull', 'Legs']);
});

/**
 * ⚠ MARKS ARE PER WEEK. A session trained in week 1 must not pin the same position in week 3 — the
 * whole point of "the rest of the program" is that the weeks ahead are still free.
 */
test('a mark in an earlier week does not pin the same position in a later one', () => {
  const out = reorderWeek(SPLIT, [mark(0, 0)], 0, [2, 0, 1], 'rest_of_block');
  assert.deepEqual(namesOf(out, 0), ['Push', 'Legs', 'Pull'], 'week 1 works around what was trained');
  assert.deepEqual(namesOf(out, 1), ['Legs', 'Push', 'Pull'], 'week 2 gets the order they actually asked for');
});

// ── RAGGED AND GAPPY WEEKS ───────────────────────────────────────────────────────────────────────────

/** A real block: two six-day weeks, then four five-day weeks. */
const RAGGED = {
  name: 'Ragged',
  weeks: 3,
  daysPerWeek: 6,
  vary: true,
  days: [],
  weekPlans: [
    { days: [day('A1'), day('B1'), day('C1')] },
    { days: [day('A2'), day('B2')] },
    { days: [day('A3'), day('B3'), day('C3')] },
  ],
};

/**
 * ⚠ A WEEK OF A DIFFERENT SHAPE IS LEFT ALONE, NOT GUESSED AT. An order is a permutation of one week's
 * session count; applying it to a week with fewer sessions is not a smaller version of the same edit.
 */
test('⚠ "rest of the program" skips weeks that have a different number of sessions', () => {
  assert.deepEqual(reorderTargets(RAGGED, 0, 'rest_of_block'), [0, 2], 'week 2 has two sessions, not three');

  const out = reorderWeek(RAGGED, [], 0, [2, 0, 1], 'rest_of_block');
  assert.deepEqual(namesOf(out, 0), ['C1', 'A1', 'B1']);
  assert.deepEqual(namesOf(out, 1), ['A2', 'B2'], 'the odd week keeps the order it had');
  assert.deepEqual(namesOf(out, 2), ['C3', 'A3', 'B3']);
});

/**
 * ⚠ AN UNBUILT WEEK HAS NOTHING TO REORDER, and must report that rather than a plausible number.
 * `weekSizes` floors such a week at `daysPerWeek` so a half-authored program still shows a sane shape —
 * those slots resolve to `day: null`. The reorder control is gated on this count, because a sheet built
 * from the LOG's rows would list `daysPerWeek` "Rest" rows and let Save write nothing, silently.
 */
test('⚠ a week with nothing built reports no sessions, and is not a reorder target', () => {
  const unbuilt = {
    ...SPLIT,
    weeks: 2,
    vary: true,
    days: [],
    weekPlans: [{ days: [day('Push'), day('Pull'), day('Legs')] }, { days: [empty('A'), empty('B')] }],
  };
  assert.equal(weekSessionCount(unbuilt, 1), 0);
  assert.deepEqual(reorderTargets(unbuilt, 1, 'this_week'), []);
  assert.equal(reorderWeek(unbuilt, [], 1, [1, 0], 'this_week'), unbuilt, 'and the write is a no-op');
  assert.deepEqual(reorderTargets(unbuilt, 0, 'rest_of_block'), [0], 'week 2 is not a target either');
});

test('reorderTargets names only the source week under "this week"', () => {
  assert.deepEqual(reorderTargets(SPLIT, 2, 'this_week'), [2]);
  assert.deepEqual(reorderTargets(SPLIT, 2, 'rest_of_block'), [2, 3]);
  assert.deepEqual(reorderTargets(SPLIT, 9, 'this_week'), [], 'a week that does not exist changes nothing');
});

/**
 * ⚠ AN EMPTY DAY IS NOT A SESSION, AND IT DOES NOT TRAVEL. It holds a position in the raw array, and
 * moving it would shift the schedule index of every session after it — silently re-pointing the marks.
 */
test('⚠ an authored gap keeps its raw position while the sessions move around it', () => {
  const gappy = {
    ...SPLIT,
    weeks: 1,
    vary: true,
    days: [],
    weekPlans: [{ days: [day('Push'), empty('X'), day('Pull'), day('Legs')] }],
  };
  const out = reorderWeek(gappy, [], 0, [2, 0, 1], 'this_week');
  const raw = out.weekPlans[0].days;

  assert.deepEqual(raw.map((d) => d.name), ['Legs', '', 'Push', 'Pull'], 'the gap stays at raw index 1');
  assert.deepEqual(namesOf(out, 0), ['Legs', 'Push', 'Pull'], 'and the sessions read in the requested order');
  assert.equal(totalSessions(out), totalSessions(gappy));
});

// ── REFUSALS AND NO-OPS ──────────────────────────────────────────────────────────────────────────────

/**
 * The by-reference no-op contract `swapSessionOrder` has always had, and which its own tests assert on.
 * Returning the input object means a caller's optimistic `setProgram` re-renders nothing.
 */
test('a no-op returns the very same structure object', () => {
  assert.equal(reorderWeek(SPLIT, [], 0, [0, 1, 2], 'this_week'), SPLIT, 'the identity permutation');
  assert.equal(reorderWeek(SPLIT, [], 9, [2, 0, 1], 'this_week'), SPLIT, 'a week that does not exist');
  assert.equal(reorderWeek(SPLIT, [], 0, [0, 1], 'this_week'), SPLIT, 'an order of the wrong length');
  assert.equal(reorderWeek(SPLIT, [], 0, [0, 0, 1], 'this_week'), SPLIT, 'a duplicate — that would drop a session');
  assert.equal(reorderWeek(SPLIT, [], 0, [0, 1, 3], 'this_week'), SPLIT, 'an index outside the week');
});

test('the session count is preserved by every legal reorder', () => {
  for (const order of [[2, 0, 1], [1, 2, 0], [2, 1, 0], [0, 2, 1]]) {
    for (const scope of ['this_week', 'rest_of_block']) {
      const out = reorderWeek(SPLIT, [], 0, order, scope);
      assert.equal(totalSessions(out), 12, `${order} / ${scope} changed the finish line`);
      assert.equal(scheduleSlots(out).length, 12);
    }
  }
});

// ── SWAP, WHICH IS NOW A TWO-ELEMENT REORDER ─────────────────────────────────────────────────────────

test('transposition builds the permutation a swap is', () => {
  assert.deepEqual(transposition(3, 0, 2), [2, 1, 0]);
  assert.deepEqual(transposition(3, 1, 1), [0, 1, 2]);
  assert.deepEqual(transposition(3, 0, 9), [0, 1, 2], 'out of range changes nothing');
});

/**
 * ⚠ THE LATENT BUG, NOW FIXED. `swapSessionOrder` took SCHEDULE indices from its callers — both compute
 * them over `trainingDays(...)` — and applied them to the RAW array. On a gapless week those are the
 * same number, which is why this never surfaced. Here they are not.
 */
test('⚠ swapping across an authored gap moves the two sessions, not the gap', () => {
  const gappy = {
    ...SPLIT,
    weeks: 1,
    vary: true,
    days: [],
    weekPlans: [{ days: [day('Push'), empty('X'), day('Pull'), day('Legs')] }],
  };
  // Sessions 0 and 1 — Push and Pull. The old body would have swapped raw 0 and raw 1: Push and the GAP.
  const out = swapSessionOrder(gappy, 0, 0, 1);

  assert.deepEqual(namesOf(out, 0), ['Pull', 'Push', 'Legs']);
  assert.deepEqual(out.weekPlans[0].days.map((d) => d.name), ['Pull', '', 'Push', 'Legs'], 'the gap never moved');
});

// ── THE DRAG HELPER ──────────────────────────────────────────────────────────────────────────────────

test('a drag moves one row and closes the gap behind it', () => {
  assert.deepEqual(moveInOrder([0, 1, 2, 3], 3, 0, new Set()), [3, 0, 1, 2]);
  assert.deepEqual(moveInOrder([0, 1, 2, 3], 0, 2, new Set()), [1, 2, 0, 3]);
  assert.deepEqual(moveInOrder([0, 1, 2], 1, 1, new Set()), [0, 1, 2], 'a cancelled drag changes nothing');
});

test('a pinned position is a fixed point, whatever is dragged past it', () => {
  const pinned = new Set([1]);
  const out = moveInOrder([0, 1, 2, 3], 3, 0, pinned);
  assert.equal(out[1], 1, 'the pinned row still holds its own session');
  assert.deepEqual(out, [3, 1, 0, 2]);
});

test('a pinned row can never itself be dragged', () => {
  assert.deepEqual(moveInOrder([0, 1, 2], 1, 0, new Set([1])), [0, 1, 2]);
});

/** Dropping onto a row that visibly cannot move means "past it", in the direction of travel. */
test('a drop onto a pinned position snaps past it', () => {
  // Dragged from the top onto the pinned row at 1: it snaps to 2, the first free position downward.
  assert.deepEqual(moveInOrder([0, 1, 2, 3], 0, 1, new Set([1])), [2, 1, 0, 3], 'travelling down, lands beyond');
  // Dragged from the bottom onto the pinned row at 2: it snaps to 1, the first free position upward —
  // one place past the pinned row, not all the way to the top.
  assert.deepEqual(moveInOrder([0, 1, 2, 3], 3, 2, new Set([2])), [0, 3, 2, 1], 'travelling up, lands beyond');
});

test('a drop with nowhere legal to land leaves the row where it was', () => {
  // Everything above position 3 is pinned, so there is no unpinned slot upward.
  assert.deepEqual(moveInOrder([0, 1, 2, 3], 3, 0, new Set([0, 1, 2])), [0, 1, 2, 3]);
});

test('the result of a drag is always a permutation of what went in', () => {
  const order = [0, 1, 2, 3, 4];
  for (const pinned of [new Set(), new Set([0]), new Set([2]), new Set([0, 4])]) {
    for (let from = 0; from < 5; from += 1) {
      for (let to = -2; to < 7; to += 1) {
        const out = moveInOrder(order, from, to, pinned);
        assert.deepEqual([...out].sort(), [...order].sort(), `from ${from} to ${to} lost or duplicated a session`);
        for (const p of pinned) assert.equal(out[p], order[p], `pinned position ${p} moved`);
      }
    }
  }
});

// ── THE DRAG AND THE WRITE AGREE ─────────────────────────────────────────────────────────────────────

/**
 * The sheet builds an order with `moveInOrder` and hands it to `reorderWeek`. If the two disagreed about
 * pinning, the athlete would see one thing and the program would save another — the exact class of bug
 * that makes people stop trusting a schedule.
 */
test('⭐ what the drag produces is what the reorder writes', () => {
  const marks = [mark(0, 0)];
  const pinned = new Set(marks.map((m) => m.dayIndex));
  const order = moveInOrder([0, 1, 2], 2, 0, pinned); // drag Legs to the top, past the trained Push

  const out = reorderWeek(SPLIT, marks, 0, order, 'this_week');
  const expected = order.map((d) => ['Push', 'Pull', 'Legs'][d]);

  assert.deepEqual(namesOf(out, 0), expected, 'the saved order is the order the athlete was shown');
  assert.equal(namesOf(out, 0)[0], 'Push', 'and the trained session is still exactly where its record says');
});
