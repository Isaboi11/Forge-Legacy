import test from 'node:test';
import assert from 'node:assert/strict';

import { forgedTime } from '../forged-time.ts';

test('a 16-minute workout is 16 minutes forged, not 0 hours (QA 09-26 home-15)', () => {
  assert.deepEqual(forgedTime(16), { value: '16', unit: 'Minutes' });
});

test('one minute and one hour read singular', () => {
  assert.equal(forgedTime(1).unit, 'Minute');
  assert.deepEqual(forgedTime(60), { value: '1', unit: 'Hour' });
  assert.deepEqual(forgedTime(59.6), { value: '1', unit: 'Hour' }, 'never "60 minutes"');
});

test('an hour and more is whole hours; nothing logged is 0 minutes', () => {
  assert.deepEqual(forgedTime(12 * 60 + 20), { value: '12', unit: 'Hours' });
  assert.deepEqual(forgedTime(0), { value: '0', unit: 'Minutes' });
  assert.deepEqual(forgedTime(Number.NaN), { value: '0', unit: 'Minutes' });
});
