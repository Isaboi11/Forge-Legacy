/**
 * cues.test.mjs — what Holt says about HOW to lift, not just how much.
 *
 * ══ THE TWO WAYS A CUE GOES WRONG ══
 *
 * SAYING NOTHING is the gap the PO reported: "4 second negatives" is crucial in a program, and a plan
 * that prescribes 4 × 8 without it has withheld the point of the set.
 *
 * SAYING THE WRONG THING is worse and easier to do. Prescribing a slow eccentric under a STRENGTH goal
 * actively degrades the set — heavy work wants intent and speed, and four seconds lowering a top single
 * is the opposite of the training. So the tests below care as much about where tempo must NOT appear as
 * where it must.
 *
 * SAYING TOO MUCH is the third: a coach who comments on every exercise trains the athlete to stop
 * reading him, which costs the cues that mattered.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/cues.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { cueFor, CUE_PATTERNS } from '../rulebook/cues.ts';

const cue = (over = {}) =>
  cueFor({ pattern: 'Squat / Knee Dominant', goal: 'muscle', experience: 'intermediate', isPrimary: true, ...over });

// ─────────────────────────────────────────────────────────────────────────────
// TEMPO GOES WHERE TEMPO IS TRAINING
// ─────────────────────────────────────────────────────────────────────────────

test('a muscle block prescribes the eccentric, because that is the variable', () => {
  const c = cue({ goal: 'muscle' });
  assert.match(c, /three seconds down/i);
  assert.match(c, /lowering/i, 'and it says why, or it is a number without a reason');
});

test('⚠ a strength block never prescribes a slow eccentric', () => {
  /*
   * The assertion that matters most in this file. Under a strength goal, "take four seconds lowering it"
   * makes the set worse — and it would read as authoritative, because everything else on the card is.
   */
  const c = cue({ goal: 'strength' });
  assert.doesNotMatch(c, /seconds down|slow|controlled lowering/i);
  assert.match(c, /speed|violent|mean it/i, 'heavy work wants intent');
});

test('conditioning and weight loss talk about density, not tempo', () => {
  for (const goal of ['conditioning', 'weight_loss']) {
    const c = cue({ goal });
    assert.ok(c, `${goal} should still say something`);
    assert.doesNotMatch(c, /seconds down/i, `${goal} must not borrow the hypertrophy tempo`);
  }
});

test('mobility adds no intent on top of the technique', () => {
  // Its technique line already says the only thing worth saying: breathe, do not force it.
  const c = cue({ goal: 'mobility', pattern: 'Mobility' });
  assert.match(c, /breathe/i);
  assert.doesNotMatch(c, /seconds down|violent/i);
});

// ─────────────────────────────────────────────────────────────────────────────
// WHO IS TOLD WHAT
// ─────────────────────────────────────────────────────────────────────────────

test('a beginner is told what good looks like; an intermediate is not lectured', () => {
  const beginner = cue({ experience: 'beginner' });
  const intermediate = cue({ experience: 'intermediate' });
  assert.ok(beginner.length > intermediate.length, 'a beginner gets the technique as well as the intent');
  assert.match(beginner, /knees track/i);
});

test('⚠ an advanced lifter gets nothing on an accessory', () => {
  // `null` is a real answer. Telling somebody who has squatted for ten years where their knees go is how
  // an app stops being taken seriously, and it costs attention on the cues that do matter.
  assert.equal(cueFor({ pattern: 'Squat / Knee Dominant', goal: 'muscle', experience: 'advanced', isPrimary: false }), null);
});

test('the opening lift carries the intent; the accessories carry technique', () => {
  const primary = cue({ isPrimary: true, goal: 'strength' });
  const accessory = cue({ isPrimary: false, goal: 'strength', pattern: 'Elbow Flexion' });
  assert.match(primary, /speed|violent/i, 'the session-carrying set says what it is for');
  assert.match(accessory, /elbows pinned/i, 'an accessory just says how to do it');
  assert.doesNotMatch(accessory, /violent/i);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE TABLE ITSELF
// ─────────────────────────────────────────────────────────────────────────────

test('every pattern Holt prescribes has something to say about it', () => {
  for (const pattern of CUE_PATTERNS) {
    const c = cueFor({ pattern, goal: 'muscle', experience: 'beginner', isPrimary: false });
    assert.ok(c && c.length > 20, `${pattern} has no technique cue`);
  }
});

test('an unrecognised pattern says nothing rather than guessing', () => {
  // A pattern nobody wrote a cue for gets silence. Falling back to a generic line would put the same
  // sentence on unrelated movements, which is exactly how the field becomes noise.
  assert.equal(cueFor({ pattern: 'Other', goal: 'muscle', experience: 'beginner', isPrimary: false }), null);
  assert.equal(cueFor({ pattern: 'Neck Isolation', goal: 'muscle', experience: 'beginner', isPrimary: false }), null);
});

test('a cue is one thought, not a paragraph', () => {
  // It renders in a small card mid-workout, between sets, on a phone. Length is a feature.
  for (const pattern of CUE_PATTERNS) {
    for (const goal of ['muscle', 'strength', 'conditioning', 'weight_loss']) {
      for (const experience of ['beginner', 'intermediate', 'advanced']) {
        const c = cueFor({ pattern, goal, experience, isPrimary: true });
        if (c) assert.ok(c.length <= 200, `${pattern}/${goal}/${experience} runs to ${c.length} characters`);
      }
    }
  }
});
