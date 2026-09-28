import { test } from 'node:test';
import assert from 'node:assert/strict';

import { toWriteBackSample } from '../write-back.ts';
import { isForgeEcho } from '../source.ts';

test('a Forge run becomes an HKWorkout with distance and our id in HKExternalUUID', () => {
  const s = toWriteBackSample({ id: 'fw-1', activityType: 'running', startedAt: '2026-09-27T13:30:00Z', durationSec: 2100, distance: 5, distanceUnit: 'mi' });
  assert.deepEqual(s, {
    activityType: 'running',
    start: '2026-09-27T13:30:00.000Z',
    end: '2026-09-27T14:05:00.000Z',
    totalDistanceMeters: 5 * 1609.344,
    metadata: { HKExternalUUID: 'fw-1', HKIndoorWorkout: false },
  });
});

test('a strength session is written with no distance; indoor flag carries through', () => {
  const s = toWriteBackSample({ id: 'fw-2', activityType: 'strength', startedAt: '2026-09-27T13:00:00Z', durationSec: 3600, distance: 2, distanceUnit: 'mi', indoor: true });
  assert.equal(s.activityType, 'traditionalStrengthTraining');
  assert.equal(s.totalDistanceMeters, null);
  assert.equal(s.metadata.HKIndoorWorkout, true);
});

test('nothing sensible to write → null', () => {
  assert.equal(toWriteBackSample({ id: '', activityType: 'running', startedAt: '2026-09-27T13:00:00Z', durationSec: 60, distance: 1, distanceUnit: 'mi' }), null);
  assert.equal(toWriteBackSample({ id: 'x', activityType: 'running', startedAt: 'nope', durationSec: 60, distance: 1, distanceUnit: 'mi' }), null);
  assert.equal(toWriteBackSample({ id: 'x', activityType: 'running', startedAt: '2026-09-27T13:00:00Z', durationSec: 0, distance: 1, distanceUnit: 'mi' }), null);
});

test('what we write is what the echo check recognises', () => {
  const s = toWriteBackSample({ id: 'fw-3', activityType: 'cycling', startedAt: '2026-09-27T13:00:00Z', durationSec: 3600, distance: 20, distanceUnit: 'km' });
  assert.equal(s.totalDistanceMeters, 20_000);
  assert.equal(isForgeEcho({ bundleId: 'com.apple.health.1', externalUuid: s.metadata.HKExternalUUID }, new Set(['fw-3'])), true);
});
