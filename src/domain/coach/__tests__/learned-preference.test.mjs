import test from 'node:test';
import assert from 'node:assert/strict';

import { PREFERENCE_THRESHOLD, appliedSentence, learnPreferences, learnedRank, preferenceSentence } from '../learned-preference.ts';
import { preferenceRank } from '../rulebook/preferences.ts';

const swap = (pattern, chosen, replaced) => ({ pattern, chosen, replaced });
const SQUAT = 'Squat / Knee Dominant';

// ─────────────────────────────────────────────────────────────────────────────
// WHAT HE LEARNS
// ─────────────────────────────────────────────────────────────────────────────

test('two swaps to the same lift become a preference', () => {
  const prefs = learnPreferences([swap(SQUAT, 'hack-squat', 'leg-press'), swap(SQUAT, 'hack-squat', 'leg-press')]);
  assert.deepEqual(prefs[SQUAT], ['hack-squat']);
});

test('⚠ one swap is not — a busy rack is not a preference', () => {
  assert.deepEqual(learnPreferences([swap(SQUAT, 'hack-squat', 'leg-press')]), {});
  assert.equal(PREFERENCE_THRESHOLD, 2);
});

test('the most-chosen lift leads', () => {
  const prefs = learnPreferences([
    swap(SQUAT, 'hack-squat', 'leg-press'),
    swap(SQUAT, 'hack-squat', 'leg-press'),
    swap(SQUAT, 'hack-squat', 'back-squat'),
    swap(SQUAT, 'goblet-squat', 'leg-press'),
    swap(SQUAT, 'goblet-squat', 'leg-press'),
  ]);
  assert.deepEqual(prefs[SQUAT], ['hack-squat', 'goblet-squat']);
});

test('preferences are per pattern — a squat choice says nothing about pressing', () => {
  const prefs = learnPreferences([
    swap(SQUAT, 'hack-squat', 'leg-press'),
    swap(SQUAT, 'hack-squat', 'leg-press'),
  ]);
  assert.equal(prefs['Horizontal Push'], undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS NOT A SIGNAL
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ an exercise that was simply prescribed and performed teaches nothing', () => {
  /* `replaced` is null on every ordinary row. Counting those would measure what the PROGRAM chose and
     call it what the athlete prefers — which is the opposite of the point. */
  const prefs = learnPreferences([swap(SQUAT, 'back-squat', null), swap(SQUAT, 'back-squat', null)]);
  assert.deepEqual(prefs, {});
});

test('a swap to the same lift is not a choice', () => {
  // Happens when a program renames a movement.
  assert.deepEqual(learnPreferences([swap(SQUAT, 'back-squat', 'back-squat'), swap(SQUAT, 'back-squat', 'back-squat')]), {});
});

test('an empty history is an empty map, not a crash', () => {
  assert.deepEqual(learnPreferences([]), {});
});

test('the result is stable across read order', () => {
  const a = learnPreferences([swap(SQUAT, 'a', 'x'), swap(SQUAT, 'a', 'x'), swap(SQUAT, 'b', 'x'), swap(SQUAT, 'b', 'x')]);
  const b = learnPreferences([swap(SQUAT, 'b', 'x'), swap(SQUAT, 'b', 'x'), swap(SQUAT, 'a', 'x'), swap(SQUAT, 'a', 'x')]);
  assert.deepEqual(a, b, 'ties must not depend on the order Postgres returned rows');
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ HOW IT RANKS — and what it can never do
// ─────────────────────────────────────────────────────────────────────────────

test('a learned choice outranks the rulebook’s canonical pick', () => {
  const prefs = { [SQUAT]: ['hack-squat'] };
  const learned = learnedRank(prefs, SQUAT, 'hack-squat');
  assert.ok(learned < 0, 'negative by construction');
  assert.ok(learned < preferenceRank(SQUAT, 'barbell-back-squat'), 'and therefore sorts first');
});

test('order within the learned list is preserved', () => {
  const prefs = { [SQUAT]: ['first', 'second'] };
  assert.ok(learnedRank(prefs, SQUAT, 'first') < learnedRank(prefs, SQUAT, 'second'));
});

test('⚠ an athlete with no history is ranked exactly as before', () => {
  // The whole safety argument: this changes nothing for anybody who has never swapped.
  assert.equal(learnedRank({}, SQUAT, 'hack-squat'), null);
  assert.equal(learnedRank({ 'Horizontal Push': ['x'] }, SQUAT, 'hack-squat'), null);
});

test('⚠ it can express a rank but never an exclusion', () => {
  /* The safety property that lets this ship without the visible-list precondition a blocklist needs:
     there is no return value meaning "remove this", and no pattern-level output at all. A knee-dominant
     slot is still filled by a knee-dominant exercise. */
  const prefs = learnPreferences([swap(SQUAT, 'hack-squat', 'back-squat'), swap(SQUAT, 'hack-squat', 'back-squat')]);
  assert.ok(Array.isArray(prefs[SQUAT]));
  assert.equal(learnedRank(prefs, SQUAT, 'back-squat'), null, 'the replaced lift is merely unranked, never barred');
});

// ─────────────────────────────────────────────────────────────────────────────
// AND HE CAN SAY WHY (CL-D2)
// ─────────────────────────────────────────────────────────────────────────────

test('the adaptation is explicable in one sentence', () => {
  const prefs = { [SQUAT]: ['hack-squat'] };
  const said = preferenceSentence(prefs, SQUAT, (k) => (k === 'hack-squat' ? 'Hack Squat' : k));
  assert.match(said, /Hack Squat/);
});

test('nothing learned, nothing said', () => {
  assert.equal(preferenceSentence({}, SQUAT, (k) => k), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ THE SENTENCE SHOWN ON A BUILT PLAN — it may only name what is actually in it
// ─────────────────────────────────────────────────────────────────────────────

test('he names a learned pick that landed in the program', () => {
  const said = appliedSentence({ [SQUAT]: ['hack-squat'] }, ['hack-squat', 'bench'], (k) => k);
  assert.match(said, /hack-squat/);
});

test('⚠ he stays silent about a preference the program does not contain', () => {
  /* The assembler may not have been able to honour it — no machine in their gym, the slot went to
     another pattern. Claiming it anyway makes every other thing he explains untrustworthy. */
  assert.equal(appliedSentence({ [SQUAT]: ['hack-squat'] }, ['barbell-back-squat'], (k) => k), null);
});

test('nothing learned means nothing said about a plan either', () => {
  assert.equal(appliedSentence({}, ['hack-squat'], (k) => k), null);
});

test('at most two are named — a longer list is a changelog, not an explanation', () => {
  const prefs = { a: ['x1'], b: ['x2'], c: ['x3'], d: ['x4'] };
  const said = appliedSentence(prefs, ['x1', 'x2', 'x3', 'x4'], (k) => k);
  assert.equal(said.match(/x\d/g).length, 2);
});
