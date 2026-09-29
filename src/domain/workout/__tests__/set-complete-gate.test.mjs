import test from 'node:test';
import assert from 'node:assert/strict';

import { completionGap } from '../set-complete-gate.ts';

/** workout-07 (QA 09-26): a 0-rep set and a blank-weight barbell set both went green and counted. */

test('0 reps cannot complete a set', () => {
  assert.equal(completionGap({ weight: 135, actualReps: 0 }, 'barbell'), 'reps');
  assert.equal(completionGap({ weight: 0, actualReps: 0 }, 'bodyweight'), 'reps');
});

test('a to-failure set with no reps yet cannot complete', () => {
  assert.equal(completionGap({ weight: 0, actualReps: null }, 'bodyweight'), 'reps');
});

test('a blank weight on a bar, dumbbell or stack asks for the weight', () => {
  for (const eq of ['barbell', 'dumbbell', 'cable', 'selectorized_machine', 'ez_bar']) {
    assert.equal(completionGap({ weight: null, actualReps: 5 }, eq), 'weight', eq);
  }
});

test('a typed 0 on a bar is the athlete saying BW, and is accepted', () => {
  assert.equal(completionGap({ weight: 0, actualReps: 5 }, 'barbell'), null);
});

test('bodyweight, bands and unknown equipment never ask for a weight', () => {
  assert.equal(completionGap({ weight: null, actualReps: 10 }, 'bodyweight'), null);
  assert.equal(completionGap({ weight: null, actualReps: 10 }, 'resistance_band'), null);
  assert.equal(completionGap({ weight: null, actualReps: 10 }, null), null);
});

test('a timed set is never gated', () => {
  assert.equal(completionGap({ weight: null, actualReps: null, targetSec: 60 }, 'barbell'), null);
});

test('a real set completes', () => {
  assert.equal(completionGap({ weight: 225, actualReps: 5 }, 'barbell'), null);
});
