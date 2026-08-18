/**
 * first-set.test.mjs — "how did that feel?", asked once, on a movement they have never done.
 *
 * ══ WHAT THIS GUARDS ══
 *
 * The feature exists in the narrow gap left by a decision that stands: `intraSetSuggestion` is switched
 * OFF for every beginner cell, because inferring a load change from a rep is a judgement a novice has not
 * earned. This asks the athlete instead, and takes their word.
 *
 * So the failure worth catching is DRIFT INTO THAT DECISION — the question widening past first-timers, or
 * past a movement's first ever set, or firing where there is nothing to change.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/first-set.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldAskEffort, weightAfterEffort, effortReply } from '../first-set.ts';

const ASK = {
  experience: 'beginner',
  pattern: 'Squat / Knee Dominant',
  equipment: 'barbell',
  hasHistory: false,
  weight: 45,
  setsRemaining: 2,
  answered: false,
};

test('it asks a first-timer on a movement they have never done', () => {
  assert.equal(shouldAskEffort(ASK), true);
});

test('⚠ every gate closes it, and each one for its own reason', () => {
  assert.equal(shouldAskEffort({ ...ASK, answered: true }), false, 'asked twice for one movement');
  assert.equal(shouldAskEffort({ ...ASK, hasHistory: true }), false, 'they have done this before — the logger prefills');
  assert.equal(shouldAskEffort({ ...ASK, setsRemaining: 0 }), false, 'nothing left to change');
  assert.equal(shouldAskEffort({ ...ASK, weight: null }), false, 'a bodyweight set has no weight to move');
  assert.equal(shouldAskEffort({ ...ASK, weight: 0 }), false, 'nor does a zero');
  assert.equal(shouldAskEffort({ ...ASK, equipment: 'resistance_band' }), false, 'a band is a different band, not a heavier one');
  assert.equal(shouldAskEffort({ ...ASK, equipment: 'bodyweight' }), false, 'and bodyweight takes no load at all');
});

test('⚠ it never reaches past beginners — that is the decision it must not undo', () => {
  for (const experience of ['intermediate', 'advanced']) {
    assert.equal(shouldAskEffort({ ...ASK, experience }), false, `${experience} was asked`);
  }
});

test('"about right" changes nothing', () => {
  assert.equal(weightAfterEffort(ASK, 'right'), null);
});

test('"easy" goes up by the movement’s own step, not a flat number', () => {
  const squat = weightAfterEffort({ ...ASK, pattern: 'Squat / Knee Dominant' }, 'easy');
  const raise = weightAfterEffort({ ...ASK, pattern: 'Shoulder Isolation' }, 'easy');
  assert.ok(squat > ASK.weight, 'a squat should go up');
  // A squat absorbs 10 lb without anyone noticing; a lateral raise does not. If these ever match,
  // the per-movement increment has stopped being consulted.
  assert.notEqual(squat, raise, 'every movement got the same jump');
});

test('⚠ "too heavy" comes DOWN — the athlete said so, and this is not an inference', () => {
  /*
   * `intraSetSuggestion` may never reduce load, because it is reading a single set and one bad set is a
   * Tuesday. Here the athlete has said the weight was too heavy in as many words. Refusing to act would
   * be the app overruling a person about their own body on the first set they have ever done.
   */
  const next = weightAfterEffort({ ...ASK, weight: 95 }, 'heavy');
  assert.ok(next < 95, 'it stayed put after being told it was too heavy');
  assert.ok(next > 0, 'and it must not propose nothing');
});

test('⚠ it never proposes an unloadable weight at the bottom', () => {
  // Already at the lightest thing that can go on the bar — there is nowhere down to go, and zero is not
  // an answer. Changing nothing is the honest response.
  assert.equal(weightAfterEffort({ ...ASK, weight: 5 }, 'heavy'), null);
});

/**
 * ⚠ THE UNIT IS LOAD-BEARING. Every line the coach speaks is re-expressed by `convertMeasure`, which
 * finds weights by the " lb" written beside them. A bare number is invisible to it and reaches a metric
 * athlete as raw pounds with no name on it — the same class of defect as the KG/lb report, inverted.
 */
test('⚠ every weight the reply names carries its unit, so it can be converted', () => {
  // The exact shape `convertMeasure` looks for: digits, optional space, then "lb".
  assert.ok(/55\s*lb/.test(effortReply('easy', 55)), 'the go-up weight would reach a metric athlete unconverted');
  assert.ok(/35\s*lb/.test(effortReply('heavy', 35)), 'the come-down weight would too');

  // And the three that name no weight must not invent a unit either.
  for (const line of [effortReply('right', null), effortReply('easy', null), effortReply('heavy', null)]) {
    assert.ok(!/lb/.test(line), `"${line}" named a unit with no number`);
  }
});

test('the reply names the change and never grades the athlete', () => {
  const up = effortReply('easy', 55);
  const down = effortReply('heavy', 35);
  assert.match(up, /55/, 'it should say what to put on');
  assert.match(down, /35/, 'and what to take off');
  for (const line of [up, down, effortReply('right', null), effortReply('easy', null), effortReply('heavy', null)]) {
    assert.ok(line.length > 0, 'every answer gets a reply');
    assert.ok(!/\b(bad|wrong|weak|failed|poor)\b/i.test(line), `graded the athlete: "${line}"`);
  }
});
