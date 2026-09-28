import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RANK_AGGREGATOR, RANK_DIRECT, isForgeEcho, sourceLabel, sourceRank } from '../source.ts';

test('labels for the sources Health actually reports', () => {
  assert.equal(sourceLabel('Isaiah’s Apple Watch', 'com.apple.health.8C1F2A7E-0B7D-4E7B-9C1C-3E3C2B1D0A9F', 'Watch7,1'), 'Apple Watch');
  assert.equal(sourceLabel('Isaiah’s iPhone', 'com.apple.health.2D6B', 'iPhone16,2'), 'iPhone');
  assert.equal(sourceLabel('Connect', 'com.garmin.connect.mobile', 'iPhone16,2'), 'Garmin Connect');
  assert.equal(sourceLabel('Strava', 'com.strava.stravaride', 'iPhone16,2'), 'Strava');
  assert.equal(sourceLabel('Run Club', 'com.nike.nikeplus-gps', null), 'Nike Run Club');
  assert.equal(sourceLabel('Polar Flow', 'fi.polar.polarflow', null), 'Polar Flow');
  assert.equal(sourceLabel('WorkOutDoors', 'com.example.workoutdoors', 'Watch6,2'), 'WorkOutDoors');
  assert.equal(sourceLabel('', 'com.example.x', null), 'Apple Health'); // never empty
  assert.equal(sourceLabel('x'.repeat(90), 'com.example.x', null).length, 60);
});

test('most direct source wins: devices and manufacturers over aggregators', () => {
  assert.equal(sourceRank({ sourceName: 'Watch', bundleId: 'com.apple.health.1', productType: 'Watch7,1' }), RANK_DIRECT);
  assert.equal(sourceRank({ sourceName: 'Connect', bundleId: 'com.garmin.connect.mobile', productType: 'iPhone16,2' }), RANK_DIRECT);
  assert.equal(sourceRank({ sourceName: 'COROS', bundleId: 'com.coros.coros', productType: null }), RANK_DIRECT);
  assert.equal(sourceRank({ sourceName: 'Strava', bundleId: 'com.strava.stravaride', productType: 'iPhone16,2' }), RANK_AGGREGATOR);
  // A known aggregator stays one even when its sample says it ran on a watch.
  assert.equal(sourceRank({ sourceName: 'Strava', bundleId: 'com.strava.stravaride', productType: 'Watch7,1' }), RANK_AGGREGATOR);
  assert.equal(sourceRank({ sourceName: 'Mystery', bundleId: 'com.example.mystery', productType: null }), RANK_AGGREGATOR);
  assert.equal(sourceRank({ sourceName: 'WorkOutDoors', bundleId: 'com.example.workoutdoors', productType: 'Watch6,2' }), RANK_DIRECT);
});

test('the echo check: Forge bundle, the Watch companion, or HKExternalUUID', () => {
  const ids = new Set(['wk-1']);
  assert.equal(isForgeEcho({ bundleId: 'com.qest4.forgelegacy', externalUuid: null }, ids), true);
  assert.equal(isForgeEcho({ bundleId: 'com.qest4.forgelegacy.watchkitapp', externalUuid: null }, ids), true);
  assert.equal(isForgeEcho({ bundleId: 'com.apple.health.1', externalUuid: 'wk-1' }, ids), true);
  assert.equal(isForgeEcho({ bundleId: 'com.apple.health.1', externalUuid: 'wk-2' }, ids), false);
  assert.equal(isForgeEcho({ bundleId: 'com.qest4.forgelegacyx', externalUuid: null }, ids), false); // prefix, not substring
  assert.equal(isForgeEcho({ bundleId: null, externalUuid: null }, ids), false);
});
