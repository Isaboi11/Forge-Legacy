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

import { backOffTo, incrementFor, loadableStep, progressionFor, sessionPerformance } from '../progression.ts';

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
      // 0 is now a real answer, not a floor breach — Mobility adds no weight, and neither does a band.
      assert.ok(n === 0 || n >= 2.5);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BODYWEIGHT — weight: 0 is an answer, and it is never the thing that progresses
// ─────────────────────────────────────────────────────────────────────────────

test('topping the range on a bodyweight lift adds reps, never 2.5 lb', () => {
  const p = progressionFor(
    ask({ exerciseName: 'Push-Up', pattern: 'Horizontal Push', history: [session(0, [12, 12, 12])] }),
  );
  assert.equal(p.action, 'add_reps', 'a push-up does not take a plate');
  assert.equal(p.suggestedWeight, 0, 'still bodyweight — 0 is the answer, not a missing value');
  assert.doesNotMatch(p.message, /lb/, 'naming a weight on a push-up is how they learn to ignore the coach');
});

test('a bodyweight lift short of the range holds rather than advancing', () => {
  const p = progressionFor(
    ask({ exerciseName: 'Pull-Up', pattern: 'Vertical Pull', history: [session(0, [8, 6, 5])] }),
  );
  assert.equal(p.action, 'hold');
  assert.equal(p.suggestedReps, 8, 'back to the bottom of the range, not past it');
});

test('a loaded lift is untouched by the bodyweight rule', () => {
  const p = progressionFor(ask({ history: [session(135, [12, 12, 12])] }));
  assert.equal(p.action, 'add_weight');
  assert.equal(p.suggestedWeight, 140);
});

// ─────────────────────────────────────────────────────────────────────────────
// sessionPerformance — the figure the Active Workout's "Last" column shows
// ─────────────────────────────────────────────────────────────────────────────

test('one session reduces to the working weight and the best reps at it', () => {
  const p = sessionPerformance({ startedAt: '2026-08-01', sets: [
    { weight: 185, reps: 10 }, { weight: 185, reps: 9 }, { weight: 185, reps: 8 },
  ] });
  assert.deepEqual(p, { weight: 185, reps: 10 });
});

test('a heavy single after three back-off sets does not become the session', () => {
  const p = sessionPerformance({ startedAt: '2026-08-01', sets: [
    { weight: 135, reps: 10 }, { weight: 135, reps: 10 }, { weight: 135, reps: 10 }, { weight: 225, reps: 1 },
  ] });
  assert.equal(p.weight, 135, 'the mode is what they trained at; the single is a single');
});

test('a session with nothing loadable in it says nothing', () => {
  assert.equal(sessionPerformance({ startedAt: '2026-08-01', sets: [{ weight: null, reps: 10 }] }), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// BACKING OFF — "that felt heavy". Not an increment in reverse.
// ─────────────────────────────────────────────────────────────────────────────

test('a heavy squat comes down by something worth feeling, not by a plate pair', () => {
  const next = backOffTo({ current: 315, recent: [], equipment: 'barbell' });
  assert.equal(next, 285, '10% of 315 is 31.5 → 285 on a 5 lb step');
  assert.ok(315 - next >= 25, 'the PO report was 2.5 lb off a back squat — that must never happen again');
});

test('the same rule on a light lift takes a light amount off', () => {
  const next = backOffTo({ current: 65, recent: [], equipment: 'barbell' });
  assert.equal(next, 60, 'one step — 10% of 65 is 6.5, and you cannot load 58.5');
});

test('a weight they have actually worked at beats the percentage', () => {
  const next = backOffTo({ current: 315, recent: [275, 295], equipment: 'barbell' });
  assert.equal(next, 295, 'a real session they really had, and the closest one below');
});

test('history that is barely lighter is ignored rather than offered', () => {
  const next = backOffTo({ current: 315, recent: [313], equipment: 'barbell' });
  assert.equal(next, 285, '313 is the same session — falling back to the percentage is the honest answer');
});

test('nothing goes under the empty bar', () => {
  assert.equal(backOffTo({ current: 55, recent: [], equipment: 'barbell' }), 50, 'one loadable step, still above the bar');
  assert.equal(backOffTo({ current: 50, recent: [], equipment: 'barbell' }), 45, 'and the next one lands on the bar itself');
  assert.equal(backOffTo({ current: 45, recent: [], equipment: 'barbell' }), null, 'already an empty bar');
  assert.equal(backOffTo({ current: 315, recent: [20], equipment: 'barbell' }), 285, 'a sub-bar history entry is not loadable');
});

test('a cable stack moves in its own pin, not in plate pairs', () => {
  assert.equal(loadableStep('cable'), 2.5);
  assert.equal(loadableStep('barbell'), 5);
  assert.equal(backOffTo({ current: 100, recent: [], equipment: 'cable' }), 90);
});

test('backing off always actually goes down', () => {
  for (const equipment of ['barbell', 'dumbbell', 'cable']) {
    for (let w = 10; w <= 500; w += 2.5) {
      const next = backOffTo({ current: w, recent: [], equipment });
      if (next == null) continue;
      assert.ok(next < w, `${equipment} ${w} -> ${next} did not go down`);
    }
  }
});

test('bodyweight has nothing to take off', () => {
  assert.equal(backOffTo({ current: 0, recent: [], equipment: null }), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE INCREMENT — PO report: "160, 160, 140 on lat pulldown → go to 142.5"
// ─────────────────────────────────────────────────────────────────────────────

test('an advanced lifter is never offered 2.5 lb on a lat pulldown', () => {
  // The exact reported case: Vertical Pull, cable stack, advanced.
  const step = incrementFor('Vertical Pull', 'advanced', 'cable');
  assert.equal(step, 5, '140 + 2.5 = 142.5 was the bug; 145 is the answer');
  assert.ok(step >= 5);
});

test('no weighted lift ever suggests less than 2.5, and the big ones never less than 10', () => {
  const big = ['Squat / Knee Dominant', 'Hinge / Hip Dominant', 'Carry'];
  const equip = ['barbell', 'dumbbell', 'cable', 'selectorized_machine', 'smith_machine', 'kettlebell', undefined];
  for (const exp of ['beginner', 'intermediate', 'advanced']) {
    for (const e of equip) {
      for (const p of big) {
        assert.ok(incrementFor(p, exp, e) >= 10, `${p}/${exp}/${e} was under 10`);
      }
      for (const p of ['Horizontal Push', 'Vertical Push', 'Horizontal Pull', 'Vertical Pull', 'Elbow Flexion']) {
        assert.ok(incrementFor(p, exp, e) >= 5, `${p}/${exp}/${e} was under 5 — curls and presses move in 5s`);
      }
    }
  }
});

test('dumbbells only exist in fives', () => {
  for (const p of ['Shoulder Isolation', 'Elbow Flexion', 'Horizontal Push', 'Neck Isolation']) {
    for (const exp of ['beginner', 'intermediate', 'advanced']) {
      const n = incrementFor(p, exp, 'dumbbell');
      assert.equal(n % 5, 0, `${p}/${exp} gave ${n} — there is no such dumbbell`);
    }
  }
});

test('a cable shoulder raise may move in 2.5 where a dumbbell one cannot', () => {
  assert.equal(incrementFor('Shoulder Isolation', 'advanced', 'cable'), 2.5);
  assert.equal(incrementFor('Shoulder Isolation', 'advanced', 'dumbbell'), 5);
});

test('beginners still move faster than the floor, not slower', () => {
  assert.ok(
    incrementFor('Squat / Knee Dominant', 'beginner', 'barbell') >
      incrementFor('Squat / Knee Dominant', 'advanced', 'barbell'),
  );
  assert.equal(incrementFor('Squat / Knee Dominant', 'beginner', 'barbell'), 15);
});

test('a band or a bodyweight lift adds no pounds at all', () => {
  assert.equal(incrementFor('Vertical Pull', 'intermediate', 'resistance_band'), 0);
  assert.equal(incrementFor('Horizontal Push', 'intermediate', 'bodyweight'), 0);
  assert.equal(incrementFor('Mobility', 'intermediate', 'barbell'), 0);
});

test('every increment is a weight that exists in a gym', () => {
  for (const p of Object.keys({ 'Squat / Knee Dominant': 0, 'Vertical Pull': 0, 'Shoulder Isolation': 0, Core: 0 })) {
    for (const e of ['barbell', 'dumbbell', 'cable', 'selectorized_machine']) {
      for (const exp of ['beginner', 'intermediate', 'advanced']) {
        const n = incrementFor(p, exp, e);
        if (n === 0) continue;
        assert.equal(n % loadableStep(e), 0, `${p}/${exp}/${e} = ${n} is not loadable on that equipment`);
      }
    }
  }
});

test('the engine uses the equipment it is given', () => {
  const p = progressionFor(
    ask({ exerciseName: 'Cable Lat Pulldown', pattern: 'Vertical Pull', experience: 'advanced',
          equipment: 'cable', history: [session(140, [12, 12, 12])] }),
  );
  assert.equal(p.action, 'add_weight');
  assert.equal(p.suggestedWeight, 145, 'not 142.5');
});
