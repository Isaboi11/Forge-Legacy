import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeHealthWorkout, quantityMeters } from '../normalize.ts';
import { classify } from '../dedup.ts';
import { hkTypeNumber, mapHealthType } from '../activity-map.ts';

/** The shape v16's WorkoutProxy exposes (read from ios/WorkoutProxy.swift): distance in "meters", duration "s". */
const garminRun = {
  uuid: 'A1B2',
  workoutActivityType: 37,
  startDate: new Date('2026-09-27T13:00:00Z'),
  endDate: new Date('2026-09-27T13:40:00Z'),
  duration: { unit: 's', quantity: 2400 },
  totalDistance: { unit: 'meters', quantity: 8046.72 },
  totalEnergyBurned: { unit: 'kcal', quantity: 512 },
  metadata: { HKIndoorWorkout: false, HKAverageMETs: 9 },
  sourceRevision: { source: { name: 'Connect', bundleIdentifier: 'com.garmin.connect.mobile' }, productType: 'iPhone16,2' },
  device: { model: 'Forerunner 965', name: 'Forerunner' },
};

test('a v16 Garmin run normalises to exactly the §2 fields — no energy, no METs', () => {
  const w = normalizeHealthWorkout(garminRun);
  assert.deepEqual(w, {
    uuid: 'A1B2',
    activityType: 37,
    start: '2026-09-27T13:00:00.000Z',
    end: '2026-09-27T13:40:00.000Z',
    durationSec: 2400,
    distanceMeters: 8046.72,
    indoor: false,
    sourceName: 'Connect',
    bundleId: 'com.garmin.connect.mobile',
    productType: 'iPhone16,2',
    externalUuid: null,
  });
  assert.ok(!JSON.stringify(w).includes('512'), 'energy never travels past the wrapper');
});

test('it feeds classify end to end: 5.0 mi Run from Garmin Connect', () => {
  const out = classify([normalizeHealthWorkout(garminRun)], [], [], { nowMs: Date.parse('2026-09-28T00:00:00Z') });
  assert.equal(out.importRows.length, 1);
  assert.equal(out.importRows[0].distanceMi, 5);
  assert.equal(out.importRows[0].sourceLabel, 'Garmin Connect');
});

test('indoor flag: boolean or HealthKit NSNumber 1; HKExternalUUID is read for the echo check', () => {
  assert.equal(normalizeHealthWorkout({ ...garminRun, metadata: { HKIndoorWorkout: 1 } }).indoor, true);
  assert.equal(normalizeHealthWorkout({ ...garminRun, metadata: { HKIndoorWorkout: true } }).indoor, true);
  assert.equal(normalizeHealthWorkout({ ...garminRun, metadata: null }).indoor, false);
  assert.equal(normalizeHealthWorkout({ ...garminRun, metadata: { HKExternalUUID: 'fw-9' } }).externalUuid, 'fw-9');
});

test('device fallback for product type when sourceRevision has none (Watch recognised)', () => {
  const w = normalizeHealthWorkout({
    ...garminRun,
    sourceRevision: { source: { name: 'Workout', bundleIdentifier: 'com.apple.health.X' } },
    device: { hardwareVersion: 'Watch7,1', model: 'Watch' },
  });
  assert.equal(w.productType, 'Watch7,1');
});

test('unusable samples are dropped, not guessed', () => {
  assert.equal(normalizeHealthWorkout(null), null);
  assert.equal(normalizeHealthWorkout({ ...garminRun, uuid: '' }), null);
  assert.equal(normalizeHealthWorkout({ ...garminRun, workoutActivityType: null }), null);
  assert.equal(normalizeHealthWorkout({ ...garminRun, startDate: 'nope' }), null);
});

test('duration falls back to the span; unknown distance unit → no distance', () => {
  assert.equal(normalizeHealthWorkout({ ...garminRun, duration: null }).durationSec, 2400);
  assert.equal(normalizeHealthWorkout({ ...garminRun, duration: { unit: 'min', quantity: 40 } }).durationSec, 2400);
  assert.equal(normalizeHealthWorkout({ ...garminRun, totalDistance: { unit: 'furlong', quantity: 40 } }).distanceMeters, null);
  assert.equal(quantityMeters({ unit: 'km', quantity: 5 }), 5000);
  assert.equal(quantityMeters({ unit: 'mi', quantity: 1 }), 1609.344);
  assert.equal(quantityMeters(undefined), null);
});

test('write-back type numbers match the library enum (v16 WorkoutActivityType)', () => {
  assert.equal(hkTypeNumber('running'), 37);
  assert.equal(hkTypeNumber('traditionalStrengthTraining'), 50);
  assert.equal(hkTypeNumber('stairClimbing'), 44);
  assert.equal(hkTypeNumber('flexibility'), 62);
  assert.equal(hkTypeNumber('other'), 3000);
  assert.equal(hkTypeNumber('noSuchType'), 3000);
  // flexibility is known now, but still not IMPORTED (it is not a v1 distance type)
  assert.equal(mapHealthType(62, false), null);
});
