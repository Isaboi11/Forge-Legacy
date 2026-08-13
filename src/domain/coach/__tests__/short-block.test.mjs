/**
 * short-block.test.mjs — a block too short to ramp is a REPRESENTATIVE week, not an OPENING one.
 *
 * PAS-A7-D2. The failure this guards against is silent and therefore worth asserting directly: a
 * one-week block authored by the ordinary double-progression rule looks like a perfectly ordinary
 * week 1, because that is exactly what it is — the easiest week of a staircase with no second step.
 * Nothing about the output announces that the athlete got the introductory week of a mesocycle that
 * does not exist.
 *
 * The other half of the guard matters just as much: the new rule must NOT leak upward. A 4-week and a
 * 12-week block have to prescribe bit-for-bit what they always did, or this fix has silently rewritten
 * every program in the app.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/short-block.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { prescribeReps } from '../prescribe.ts';
import { SHORT_BLOCK_WEEKS } from '../rulebook/volume.ts';

const ctx = (over = {}) => ({
  category: 'STRENGTH',
  experience: 'intermediate',
  weekIndex: 0,
  isDeload: false,
  ...over,
});

/**
 * The band `prescribeReps` is working inside, read off the rule rather than hardcoded — so this file
 * keeps testing the SHAPE of the prescription even if the numbers in `REP_RANGES` are ever retuned.
 *
 * `lo` is what a deload prescribes, by definition. `hi` is walked rather than read off `repsMax`, which
 * is deliberately `null` at the top of the range — reading it there would silently yield `NaN` and make
 * every comparison below vacuously pass.
 */
const range = (role = 'primary', category = 'STRENGTH') => {
  const lo = prescribeReps(role, ctx({ category, isDeload: true })).reps;
  let hi = lo;
  for (let w = 0; w < 64; w += 1) {
    hi = Math.max(hi, prescribeReps(role, ctx({ category, weekIndex: w })).reps);
  }
  return { lo, hi };
};

// ─────────────────────────────────────────────────────────────────────────────
// THE DEFECT
// ─────────────────────────────────────────────────────────────────────────────

test('a ONE-week block does not prescribe the bottom of the range', () => {
  const { lo } = range();
  const one = prescribeReps('primary', ctx({ totalWeeks: 1 }));

  assert.ok(
    one.reps > lo,
    `a standalone week must not ship the entry rung of an absent ladder — got ${one.reps}, bottom is ${lo}`,
  );
});

test('it anchors at the MIDPOINT — high enough to be a real week, not the peak of one', () => {
  const { lo, hi } = range();
  const one = prescribeReps('primary', ctx({ totalWeeks: 1 }));

  assert.equal(one.reps, lo + Math.round((hi - lo) / 2));
  assert.ok(one.reps < hi, 'a representative week is not a test week either');
});

test('every week of a short block is the same — there is nothing to ramp into', () => {
  const w0 = prescribeReps('primary', ctx({ totalWeeks: SHORT_BLOCK_WEEKS, weekIndex: 0 }));
  const w1 = prescribeReps('primary', ctx({ totalWeeks: SHORT_BLOCK_WEEKS, weekIndex: 1 }));
  const w2 = prescribeReps('primary', ctx({ totalWeeks: SHORT_BLOCK_WEEKS, weekIndex: 2 }));

  assert.equal(w0.reps, w1.reps);
  assert.equal(w1.reps, w2.reps);
});

// ─────────────────────────────────────────────────────────────────────────────
// AND IT MUST NOT LEAK UPWARD
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ a block ONE week past the boundary ramps exactly as it always did', () => {
  const { lo } = range();
  const long = SHORT_BLOCK_WEEKS + 1;

  assert.equal(
    prescribeReps('primary', ctx({ totalWeeks: long, weekIndex: 0 })).reps,
    lo,
    'week 1 of a real block is still deliberately the easiest week',
  );
  assert.equal(prescribeReps('primary', ctx({ totalWeeks: long, weekIndex: 1 })).reps, lo + 1);
  assert.equal(prescribeReps('primary', ctx({ totalWeeks: long, weekIndex: 2 })).reps, lo + 2);
});

test('⚠ an ABSENT totalWeeks reads as "long enough to ramp" — every existing caller keeps its meaning', () => {
  for (const weekIndex of [0, 1, 2, 3]) {
    assert.equal(
      prescribeReps('primary', ctx({ weekIndex })).reps,
      prescribeReps('primary', ctx({ weekIndex, totalWeeks: 12 })).reps,
      `week ${weekIndex} must be unchanged when the caller says nothing about length`,
    );
  }
});

test('a deload still bottoms out, whatever the block length', () => {
  const { lo } = range();
  assert.equal(prescribeReps('primary', ctx({ totalWeeks: 1, isDeload: true })).reps, lo);
  assert.equal(prescribeReps('primary', ctx({ totalWeeks: 12, isDeload: true })).reps, lo);
});

test('a category with no range to climb is unaffected in both regimes', () => {
  // RUNNING/MOBILITY carry `hi === lo`, so there is no midpoint to move to and no ramp to suppress.
  for (const category of ['RUNNING', 'MOBILITY']) {
    const short = prescribeReps('primary', ctx({ category, totalWeeks: 1 }));
    const long = prescribeReps('primary', ctx({ category, totalWeeks: 12, weekIndex: 3 }));
    assert.equal(short.reps, long.reps, `${category} has one honest number either way`);
  }
});
