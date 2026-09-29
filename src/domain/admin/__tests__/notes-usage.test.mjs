import test from 'node:test';
import assert from 'node:assert/strict';

import { usageNote } from '../notes/usage.ts';

const base = { windowLabel: '30 days', priorLabel: 'prior 30 days', active: 61, activePrev: 50, signups: 22, firstWorkouts: 17, workouts: 1284, workoutsAllTime: 5000 };

test('normal: active, change vs prior, first workouts of signups', () => {
  assert.equal(
    usageNote(base),
    '61 athletes saved 1,284 workouts in the last 30 days, 22% more athletes than the prior 30 days. 17 of 22 new signups have logged a first workout.',
  );
});

test('empty: nothing ever saved reads as a fallback, not zeros', () => {
  assert.match(usageNote({ ...base, active: 0, activePrev: 0, signups: 0, firstWorkouts: 0, workouts: 0, workoutsAllTime: 0 }), /^Nothing to report yet/);
});

test('edge: no prior window, no signups, 1Y label, singulars', () => {
  assert.equal(
    usageNote({ ...base, windowLabel: 'year', priorLabel: 'prior year', active: 1, activePrev: 0, workouts: 1, signups: 0, firstWorkouts: 0 }),
    '1 athlete saved 1 workout in the last year. No new signups in the last year.',
  );
  assert.match(usageNote({ ...base, active: 40 }), /20% fewer athletes/);
  assert.match(usageNote({ ...base, active: 0, workouts: 0 }), /^Nobody saved a workout in the last 30 days\./);
});
