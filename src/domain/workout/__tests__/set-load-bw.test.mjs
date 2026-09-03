import test from 'node:test';
import assert from 'node:assert/strict';

import { setWeightLabel, setWeightLabelLb, setLoadLineLb, BODYWEIGHT, UNANSWERED } from '../set-load.ts';
import { targetLine } from '../watch-projection.ts';

/**
 * ⚠ ZERO IS NEVER SHOWN AS A NUMBER. IT SAYS "BW".
 *
 * PO: *"I don't want 0. I want it to be BW. That's the point of it. More mental than anything.
 * Seeing 0 can be discouraging."*
 *
 * This is a product rule, not a formatting nicety, which is why it is pinned by tests rather than left
 * to each screen's judgement. It HAD been left to each screen's judgement: the rule lived as a private
 * helper inside `workout.tsx`, and `live-workout/[id].tsx` — which never saw it — rendered a dip set as
 * "0 lb" to whoever was watching the session live.
 *
 * The other half of the rule matters just as much and is easier to lose: `null` is NOT bodyweight. A
 * warm-up done with an empty bar is an unanswered weight, and calling it "BW" would be the app deciding
 * something the athlete never said.
 */

const IMP = 'imperial';
const MET = 'metric';

test('zero renders as BW, never as a number', () => {
  assert.equal(setWeightLabel(0), BODYWEIGHT);
  assert.equal(setWeightLabelLb(0, IMP), BODYWEIGHT);
  assert.equal(setWeightLabelLb(0, MET), BODYWEIGHT);
  assert.equal(setLoadLineLb(0, 8, IMP), 'BW × 8');
  assert.equal(setLoadLineLb(0, 12, MET), 'BW × 12');
});

test('BW carries no unit — "BW lb" is not a thing anyone says', () => {
  for (const units of [IMP, MET]) {
    assert.ok(!setLoadLineLb(0, 8, units).includes('lb'));
    assert.ok(!setLoadLineLb(0, 8, units).includes('kg'));
  }
});

test('null is UNANSWERED, not bodyweight — an empty bar is not a bodyweight set', () => {
  assert.equal(setWeightLabel(null), UNANSWERED);
  assert.equal(setWeightLabel(undefined), UNANSWERED);
  assert.equal(setWeightLabelLb(null, IMP), UNANSWERED);
  assert.notEqual(setWeightLabel(null), BODYWEIGHT);
});

test('a real load still renders as its number', () => {
  assert.equal(setWeightLabel(225), '225');
  assert.equal(setWeightLabelLb(225, IMP), '225');
  assert.equal(setLoadLineLb(225, 5, IMP), '225 lb × 5');
});

test('canonical pounds convert for a metric athlete — and BW survives the conversion', () => {
  const metric = setWeightLabelLb(225, MET);
  assert.notEqual(metric, '225', 'a metric athlete must not be shown the pound figure');
  assert.ok(Number(metric) > 0 && Number(metric) < 225);
  // The conversion path must not turn zero into a converted zero-ish number.
  assert.equal(setWeightLabelLb(0, MET), BODYWEIGHT);
});

/**
 * ⚠ THE WATCH FOLDED ZERO IN WITH NULL. `lb <= 0` sent a bodyweight set down the "no weight" branch,
 * so the wrist showed "8 reps" and silently dropped the one thing the athlete had stated. These fail
 * if that guard is put back.
 */
test('the watch says BW for a bodyweight set, not just the reps', () => {
  const set = { weight: 0, targetReps: 8, targetWeight: null, targetSec: null, toFailure: false };
  assert.equal(targetLine(set, IMP), 'BW × 8');
});

test('the watch still shows reps alone when no weight was entered', () => {
  const set = { weight: null, targetReps: 8, targetWeight: null, targetSec: null, toFailure: false };
  assert.equal(targetLine(set, IMP), '8 reps');
});

test('the watch keeps "to failure" and gains BW in front of it', () => {
  const bw = { weight: 0, targetReps: null, targetWeight: null, targetSec: null, toFailure: true };
  assert.equal(targetLine(bw, IMP), 'BW to failure');
  const none = { weight: null, targetReps: null, targetWeight: null, targetSec: null, toFailure: true };
  assert.equal(targetLine(none, IMP), 'to failure');
});

test('the watch still renders a loaded set with its unit', () => {
  const set = { weight: 225, targetReps: 5, targetWeight: null, targetSec: null, toFailure: false };
  assert.equal(targetLine(set, IMP), '225 lb × 5');
});
