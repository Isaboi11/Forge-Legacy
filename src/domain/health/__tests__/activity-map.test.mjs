import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  HEALTHKIT_EPOCH_ISO,
  filterReason,
  forgeToHealthType,
  hkTypeName,
  mapHealthType,
  metersToMiles,
  toMeters,
} from '../activity-map.ts';

test('every §4 row maps to its Forge type and name', () => {
  const rows = [
    ['running', false, 'running', 'Run'],
    ['running', true, 'running', 'Treadmill Run'],
    ['wheelchairRunPace', false, 'running', 'Run'],
    ['walking', false, 'walking', 'Walk'],
    ['walking', true, 'walking', 'Walk'],
    ['wheelchairWalkPace', false, 'walking', 'Walk'],
    ['hiking', false, 'walking', 'Hike'],
    ['cycling', false, 'cycling', 'Bike Ride'],
    ['cycling', true, 'cycling', 'Indoor Ride'],
    ['handCycling', false, 'cycling', 'Bike Ride'],
    ['swimming', false, 'swimming', 'Swim'],
    ['swimming', true, 'swimming', 'Swim'], // pool swim keeps its name
    ['rowing', false, 'rowing', 'Row'],
    ['elliptical', true, 'elliptical', 'Elliptical'],
    ['stairClimbing', true, 'stair_climber', 'Stair Climber'],
    ['stairs', false, 'stair_climber', 'Stair Climber'],
  ];
  for (const [hk, indoor, type, name] of rows) {
    assert.deepEqual(mapHealthType(hk, indoor), { activityType: type, name }, `${hk} indoor=${indoor}`);
  }
});

test('strength, HIIT, yoga, cross training and unknowns are not imported', () => {
  for (const hk of ['traditionalStrengthTraining', 'functionalStrengthTraining', 'highIntensityIntervalTraining', 'yoga', 'crossTraining', 'other', 'swimBikeRun', 'pickleball', '']) {
    assert.equal(mapHealthType(hk, false), null, hk);
  }
});

test('raw HKWorkoutActivityType numbers resolve like names', () => {
  assert.equal(hkTypeName(37), 'running');
  assert.deepEqual(mapHealthType(37, true), { activityType: 'running', name: 'Treadmill Run' });
  assert.deepEqual(mapHealthType(24, false), { activityType: 'walking', name: 'Hike' });
  assert.deepEqual(mapHealthType(68, false), { activityType: 'stair_climber', name: 'Stair Climber' });
  assert.equal(mapHealthType(50, false), null); // traditional strength
  assert.equal(mapHealthType(9999, false), null); // a type Apple adds later
});

test('write-back reverse map covers every Forge modality', () => {
  assert.equal(forgeToHealthType('strength'), 'traditionalStrengthTraining');
  assert.equal(forgeToHealthType('running'), 'running');
  assert.equal(forgeToHealthType('stair_climber'), 'stairClimbing');
  assert.equal(forgeToHealthType('elliptical'), 'elliptical');
  assert.equal(forgeToHealthType('mobility'), 'flexibility');
  assert.equal(forgeToHealthType('something_new'), 'other');
  // Round trip for every importable type lands back on itself.
  for (const t of ['running', 'walking', 'cycling', 'swimming', 'rowing', 'elliptical', 'stair_climber']) {
    assert.equal(mapHealthType(forgeToHealthType(t), false).activityType, t);
  }
});

const NOW = Date.parse('2026-09-28T12:00:00Z');
const ok = { start: '2026-09-27T07:00:00Z', durationSec: 1800, distanceMeters: 5000 };

test('§4 filters: every boundary', () => {
  assert.equal(filterReason(ok, NOW), null);
  assert.equal(filterReason({ ...ok, durationSec: 59 }, NOW), 'too_short');
  assert.equal(filterReason({ ...ok, durationSec: 60 }, NOW), null);
  assert.equal(filterReason({ ...ok, durationSec: 86_400 }, NOW), null);
  assert.equal(filterReason({ ...ok, durationSec: 86_401 }, NOW), 'too_long');
  assert.equal(filterReason({ ...ok, durationSec: Number.NaN }, NOW), 'too_short');
  assert.equal(filterReason({ ...ok, distanceMeters: 500_000 }, NOW), null);
  assert.equal(filterReason({ ...ok, distanceMeters: 500_001 }, NOW), 'too_far');
  assert.equal(filterReason({ ...ok, distanceMeters: null }, NOW), null);
  assert.equal(filterReason({ ...ok, start: '2026-09-28T12:00:00Z' }, NOW), null); // exactly now
  assert.equal(filterReason({ ...ok, start: '2026-09-28T12:00:01Z' }, NOW), 'in_future');
  assert.equal(filterReason({ ...ok, start: HEALTHKIT_EPOCH_ISO }, NOW), null);
  assert.equal(filterReason({ ...ok, start: '2014-09-16T23:59:59Z' }, NOW), 'before_healthkit');
  assert.equal(filterReason({ ...ok, start: 'not a date' }, NOW), 'bad_date');
});

test('meters → miles, 3 decimals; nothing → null', () => {
  assert.equal(metersToMiles(1609.344), 1);
  assert.equal(metersToMiles(5000), 3.107);
  assert.equal(metersToMiles(42_195), 26.219);
  assert.equal(metersToMiles(0), null);
  assert.equal(metersToMiles(null), null);
  assert.equal(metersToMiles(Number.NaN), null);
  assert.equal(toMeters(1, 'mi'), 1609.344);
  assert.equal(toMeters(5, 'km'), 5000);
  assert.equal(toMeters(400, 'm'), 400);
  assert.equal(toMeters(3, null), 3 * 1609.344);
  assert.equal(toMeters(0, 'mi'), null);
});
