/**
 * progression.test.mjs — what to do with the weight, read off what they actually lifted.
 *
 * This is the one part of the coach that touches the athlete's own record, so the tests are written
 * around the two ways it could hurt someone: advancing them off a set they did once, and pushing them
 * through a miss. Both are asserted directly.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/progression.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { incrementFor, progressionFor } from '../progression.ts';

const session = (weight, reps, startedAt = '2026-08-01T10:00:00Z') => ({
  startedAt,
  sets: reps.map((r) => ({ weight, reps: r })),
});

const ask = (over = {}) => ({
  exerciseName: 'Barbell Bench Press',
  pattern: 'Horizontal Push',
  experience: 'intermediate',
  prescription: { sets: 3, reps: 8, repsMax: 12 },
  history: [],
  ...over,
});

// ─────────────────────────────────────────────────────────────────────────────
// DOUBLE PROGRESSION — reps inside the range, weight between them
// ─────────────────────────────────────────────────────────────────────────────

test('topping the range on every set moves the weight up and resets the reps', () => {
  const p = progressionFor(ask({ history: [session(135, [12, 12, 12])] }));
  assert.equal(p.action, 'add_weight');
  assert.equal(p.suggestedWeight, 140, 'a horizontal push moves in 5 lb for an intermediate');
  assert.equal(p.suggestedReps, 8, 'back to the bottom of the range — that is the other half of it');
  assert.match(p.message, /140 lb/);
});

test('inside the range means one more rep at the same weight', () => {
  const p = progressionFor(ask({ history: [session(135, [10, 10, 9])] }));
  assert.equal(p.action, 'add_reps');
  assert.equal(p.suggestedWeight, 135);
  assert.equal(p.suggestedReps, 11, 'one more than the best set, capped at the top of the range');
});

test('the rep target never runs past the top of the range', () => {
  const p = progressionFor(ask({ history: [session(135, [12, 11, 11])] }));
  assert.equal(p.action, 'add_reps');
  assert.equal(p.suggestedReps, 12, 'not 13 — the range is the prescription');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE TWO WAYS THIS COULD HURT SOMEONE
// ─────────────────────────────────────────────────────────────────────────────

test('one heavy single does not advance the whole session', () => {
  // Three sets at 135 and a top set of 185. Calling this a "185 session" would put 190 on the bar next
  // time, off one rep they did once. The working weight is the mode, not the max.
  const p = progressionFor(ask({ history: [{ startedAt: '2026-08-01', sets: [
    { weight: 135, reps: 12 }, { weight: 135, reps: 12 }, { weight: 135, reps: 12 }, { weight: 185, reps: 1 },
  ] }] }));
  assert.equal(p.basis.weight, 135, 'the session was trained at 135');
  assert.equal(p.suggestedWeight, 140);
});

test('falling short holds the weight — it never pushes through a miss', () => {
  const p = progressionFor(ask({ history: [session(135, [8, 7, 5])] }));
  assert.equal(p.action, 'hold');
  assert.equal(p.suggestedWeight, 135, 'same weight');
  assert.equal(p.suggestedReps, 8);
  assert.doesNotMatch(p.message, /fail/i, 'a short set is a Tuesday, not a verdict');
});

test('a single bad session is not a deload', () => {
  // Missed reps, but the weight is unchanged from the session before. That is one bad day.
  const p = progressionFor(
    ask({ history: [session(135, [8, 6, 5], '2026-08-08'), session(135, [10, 10, 10], '2026-08-01')] }),
  );
  assert.equal(p.action, 'hold', 'hold, not back off');
});

test('a real drop across two sessions backs off instead of pretending', () => {
  const p = progressionFor(
    ask({ history: [session(115, [8, 8, 8], '2026-08-08'), session(135, [10, 10, 10], '2026-08-01')] }),
  );
  assert.equal(p.action, 'back_off');
  assert.equal(p.suggestedWeight, 115, 'rebuild from where they are, not where they were');
});

// ─────────────────────────────────────────────────────────────────────────────
// NO HISTORY
// ─────────────────────────────────────────────────────────────────────────────

test('a first session asks rather than guesses', () => {
  const p = progressionFor(ask({ history: [] }));
  assert.equal(p.action, 'no_history');
  assert.equal(p.suggestedWeight, null, 'inventing a starting weight for a stranger is worse than asking');
  assert.equal(p.suggestedReps, 8);
});

test('sets with no weight recorded read as no history, not as zero', () => {
  const p = progressionFor(ask({ history: [{ startedAt: '2026-08-01', sets: [{ weight: null, reps: 10 }] }] }));
  assert.equal(p.action, 'no_history');
});

// ─────────────────────────────────────────────────────────────────────────────
// INCREMENTS — the coaching content, not the arithmetic
// ─────────────────────────────────────────────────────────────────────────────

test('a deadlift moves faster than a lateral raise', () => {
  assert.ok(
    incrementFor('Hinge / Hip Dominant', 'intermediate') > incrementFor('Shoulder Isolation', 'intermediate'),
    'telling someone to add 10 lb to a lateral raise is how they learn to ignore the coach',
  );
});

test('beginners add faster than advanced lifters', () => {
  assert.ok(incrementFor('Squat / Knee Dominant', 'beginner') > incrementFor('Squat / Knee Dominant', 'advanced'));
});

test('every increment is something you can actually load', () => {
  for (const pattern of ['Squat / Knee Dominant', 'Horizontal Push', 'Elbow Flexion', 'Core', 'Mobility']) {
    for (const exp of ['beginner', 'intermediate', 'advanced']) {
      const n = incrementFor(pattern, exp);
      assert.equal(n % 2.5, 0, `${pattern}/${exp} = ${n}, which is not a plate pair`);
      assert.ok(n >= 2.5);
    }
  }
});
