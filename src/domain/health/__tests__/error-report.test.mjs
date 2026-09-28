import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HK_ERROR_CODES, hkErrorReport } from '../error-report.ts';

test('every allow-listed code reports as { code } and nothing more', () => {
  for (const code of HK_ERROR_CODES) assert.deepEqual(hkErrorReport(code), { code });
});

test('a HealthKit sample, an Error, or any object cannot pass', () => {
  const sample = {
    uuid: 'hk-1',
    activityType: 'running',
    start: '2026-09-27T13:30:00Z',
    distanceMeters: 8046.72,
    sourceName: 'Isaiah’s Apple Watch',
    code: 'hk_query_failed', // even dressed up with a valid code
  };
  assert.equal(hkErrorReport(sample), null);
  assert.equal(hkErrorReport(new Error('hk_query_failed')), null);
  assert.equal(hkErrorReport({ code: 'hk_save_failed' }), null);
  assert.equal(hkErrorReport(['hk_auth_failed']), null);
  assert.equal(hkErrorReport(null), null);
  assert.equal(hkErrorReport(undefined), null);
  assert.equal(hkErrorReport(42), null);
});

test('free text is refused, including a code with a sample tacked on', () => {
  assert.equal(hkErrorReport('hk_query_failed: 5.0 mi run from Garmin Connect'), null);
  assert.equal(hkErrorReport('HK_QUERY_FAILED'), null);
  assert.equal(hkErrorReport(''), null);
});
