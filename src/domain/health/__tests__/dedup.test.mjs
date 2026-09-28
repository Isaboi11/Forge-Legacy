import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classify, overlapShare } from '../dedup.ts';

/*
 * Shapes are what HealthKit really hands back: Apple Watch samples come from a `com.apple.health.<UUID>`
 * bundle with a `WatchN,M` product type, Garmin Connect writes from the phone, Strava re-writes the same
 * activity a few seconds off. The athlete is in Los Angeles (PDT, UTC−7) unless a test says otherwise.
 */

const NOW = Date.parse('2026-09-28T18:00:00Z');
const PDT = -420;
const opts = { nowMs: NOW, utcOffsetMinutes: PDT };

const MI = 1609.344;

function hw(over) {
  return {
    uuid: 'hk-default',
    activityType: 'running',
    start: '2026-09-27T13:30:00Z', // 06:30 local
    end: '2026-09-27T14:05:00Z',
    durationSec: 35 * 60,
    distanceMeters: 5 * MI,
    indoor: false,
    sourceName: 'Isaiah’s Apple Watch',
    bundleId: 'com.apple.health.8C1F2A7E-0B7D-4E7B-9C1C-3E3C2B1D0A9F',
    productType: 'Watch7,1',
    externalUuid: null,
    ...over,
  };
}
const garmin = (over) => hw({ sourceName: 'Connect', bundleId: 'com.garmin.connect.mobile', productType: 'iPhone16,2', ...over });
const strava = (over) => hw({ sourceName: 'Strava', bundleId: 'com.strava.stravaride', productType: 'iPhone16,2', ...over });

function fw(over) {
  return {
    id: 'fw-default',
    activityType: 'running',
    startedAt: '2026-09-27T13:30:00Z',
    durationSec: 35 * 60,
    distanceMi: 5,
    tracked: true,
    source: 'forge',
    externalId: null,
    ...over,
  };
}

const ids = (rows) => rows.map((r) => r.externalId);
const reasons = (c) => Object.fromEntries(c.skipped.map((s) => [s.externalId, s.reason]));

test('overlapShare is measured against the shorter span', () => {
  const a = { startMs: 0, endMs: 100 };
  assert.equal(overlapShare(a, { startMs: 50, endMs: 150 }), 0.5);
  assert.equal(overlapShare(a, { startMs: 10, endMs: 30 }), 1); // fully inside
  assert.equal(overlapShare(a, { startMs: 100, endMs: 200 }), 0); // touching
  assert.equal(overlapShare(a, { startMs: 40, endMs: 40 }), 0); // zero length
});

test('Forge phone run + the Apple Watch recording of the same outing → Forge wins, Watch skipped', () => {
  const forge = fw({ id: 'fw-run', startedAt: '2026-09-27T13:30:12Z', durationSec: 34 * 60 + 40, distanceMi: 4.98 });
  const watch = hw({ uuid: 'hk-watch', start: '2026-09-27T13:29:50Z', end: '2026-09-27T14:05:30Z' });
  const c = classify([watch], [forge], [], opts);
  assert.deepEqual(c.importRows, []);
  assert.deepEqual(c.possibleDuplicates, []);
  assert.deepEqual(c.skipped, [{ externalId: 'hk-watch', reason: 'overlaps_forge_tracked' }]);
});

test('a Watch "walk" of a Forge run is still the same outing (run/walk are compatible)', () => {
  const c = classify([hw({ uuid: 'hk-walk', activityType: 'walking' })], [fw({ id: 'fw-run' })], [], opts);
  assert.equal(reasons(c)['hk-walk'], 'overlaps_forge_tracked');
});

test('less than half overlapping a Forge run is a different workout → imported', () => {
  // Forge run 06:30–07:05; Watch walk home 06:50–07:30 → 15 of 35 min shared (43%).
  const c = classify([hw({ uuid: 'hk-cooldown', activityType: 'walking', start: '2026-09-27T13:50:00Z', end: '2026-09-27T14:30:00Z', durationSec: 40 * 60 })], [fw({})], [], opts);
  assert.deepEqual(ids(c.importRows), ['hk-cooldown']);
});

test('Forge write-back coming back from Health is skipped silently (bundle or HKExternalUUID)', () => {
  const forge = fw({ id: 'fw-123', tracked: true });
  const echoByBundle = hw({ uuid: 'hk-echo-1', sourceName: 'Forge Legacy', bundleId: 'com.qest4.forgelegacy', productType: 'iPhone16,2', externalUuid: 'fw-123' });
  // A strength session written back, arriving with an Apple bundle but our metadata — still ours.
  const echoByMeta = hw({ uuid: 'hk-echo-2', activityType: 'running', bundleId: 'com.apple.health.1', externalUuid: 'fw-123', start: '2026-09-26T13:30:00Z', end: '2026-09-26T14:05:00Z' });
  const c = classify([echoByBundle, echoByMeta], [forge], [], opts);
  assert.deepEqual(c.importRows, []);
  assert.deepEqual(reasons(c), { 'hk-echo-1': 'forge_echo', 'hk-echo-2': 'forge_echo' });
});

test('a run logged by hand 3 hours later → possible duplicate, never a silent add or skip', () => {
  // Garmin run 06:30–07:05 local. The athlete types it in at 10:15 local; saveActivity stamps started_at
  // = now − 35 min = 09:40 local, so the clocks don't overlap at all.
  const manual = fw({ id: 'fw-manual', tracked: false, startedAt: '2026-09-27T16:40:00Z', durationSec: 35 * 60, distanceMi: 5 });
  const run = garmin({ uuid: 'hk-garmin', distanceMeters: 5.02 * MI, durationSec: 35 * 60 + 20 });
  const c = classify([run], [manual], [], opts);
  assert.deepEqual(c.importRows, []);
  assert.equal(c.possibleDuplicates.length, 1);
  assert.equal(c.possibleDuplicates[0].reason, 'matches_manual_log');
  assert.equal(c.possibleDuplicates[0].forgeWorkoutId, 'fw-manual');
  assert.equal(c.possibleDuplicates[0].row.sourceLabel, 'Garmin Connect');
});

test('manual-log match uses the LOCAL day: an evening run logged at 9:30pm is still the same day', () => {
  // 16:30 PDT on the 27th = 23:30Z; logged 21:30 PDT = 04:30Z on the 28th. Different UTC days.
  const manual = fw({ id: 'fw-manual', tracked: false, startedAt: '2026-09-28T04:00:00Z', durationSec: 30 * 60, distanceMi: 3.1 });
  const run = garmin({ uuid: 'hk-evening', start: '2026-09-27T23:30:00Z', end: '2026-09-28T00:00:00Z', durationSec: 30 * 60, distanceMeters: 5000 });
  assert.equal(classify([run], [manual], [], opts).possibleDuplicates.length, 1);
  // In UTC the same pair falls on different days — the offset is doing the work.
  assert.equal(classify([run], [manual], [], { nowMs: NOW, utcOffsetMinutes: 0 }).possibleDuplicates.length, 0);
});

test('manual-log match needs same type and distance OR duration within 10%', () => {
  const run = garmin({ uuid: 'hk-run', distanceMeters: 5 * MI, durationSec: 35 * 60 });
  const far = fw({ id: 'fw-m', tracked: false, startedAt: '2026-09-27T20:00:00Z', distanceMi: 3, durationSec: 20 * 60 }); // both off > 10%
  assert.deepEqual(ids(classify([run], [far], [], opts).importRows), ['hk-run']);
  const ride = fw({ id: 'fw-m', tracked: false, activityType: 'cycling', startedAt: '2026-09-27T20:00:00Z' });
  assert.deepEqual(ids(classify([run], [ride], [], opts).importRows), ['hk-run']);
  const noDistanceClose = fw({ id: 'fw-m', tracked: false, startedAt: '2026-09-27T20:00:00Z', distanceMi: null, durationSec: 33 * 60 }); // 5.7% off
  assert.equal(classify([run], [noDistanceClose], [], opts).possibleDuplicates.length, 1);
  const nextDay = fw({ id: 'fw-m', tracked: false, startedAt: '2026-09-28T16:00:00Z' });
  assert.deepEqual(ids(classify([run], [nextDay], [], opts).importRows), ['hk-run']);
});

test('Garmin + Strava copies of one run → Garmin imported, Strava skipped (either arrival order)', () => {
  const g = garmin({ uuid: 'hk-garmin', start: '2026-09-27T13:30:00Z', end: '2026-09-27T14:05:10Z', distanceMeters: 5.01 * MI });
  const s = strava({ uuid: 'hk-strava', start: '2026-09-27T13:30:05Z', end: '2026-09-27T14:05:00Z', distanceMeters: 5.03 * MI });
  for (const batch of [[g, s], [s, g]]) {
    const c = classify(batch, [], [], opts);
    assert.deepEqual(ids(c.importRows), ['hk-garmin']);
    assert.deepEqual(c.possibleDuplicates, []);
    assert.equal(reasons(c)['hk-strava'], 'less_direct_copy');
  }
});

test('Apple Watch + Garmin (both direct) → longer distance imported, the other offered as a possible duplicate', () => {
  const w = hw({ uuid: 'hk-watch', distanceMeters: 4.97 * MI });
  const g = garmin({ uuid: 'hk-garmin', distanceMeters: 5.02 * MI });
  const c = classify([w, g], [], [], opts);
  assert.deepEqual(ids(c.importRows), ['hk-garmin']);
  assert.equal(c.possibleDuplicates.length, 1);
  assert.equal(c.possibleDuplicates[0].row.externalId, 'hk-watch');
  assert.equal(c.possibleDuplicates[0].reason, 'same_effort_other_source');
  assert.equal(c.possibleDuplicates[0].otherExternalId, 'hk-garmin');
});

test('Garmin + Strava of a run ALSO logged by hand → the athlete is asked about ONE copy, not two', () => {
  const manual = fw({ id: 'fw-manual', tracked: false, startedAt: '2026-09-27T16:40:00Z' });
  const c = classify([garmin({ uuid: 'hk-garmin' }), strava({ uuid: 'hk-strava' })], [manual], [], opts);
  assert.deepEqual(c.importRows, []);
  assert.deepEqual(c.possibleDuplicates.map((d) => d.row.externalId), ['hk-garmin']);
  assert.equal(reasons(c)['hk-strava'], 'less_direct_copy');
});

test('Strava copy arriving the day after Garmin was already imported → skipped; a more direct late copy → asked', () => {
  const storedGarmin = fw({ id: 'fw-imp', tracked: false, source: 'apple_health', externalId: 'hk-garmin', sourceLabel: 'Garmin Connect', sourceRank: 2 });
  const c1 = classify([strava({ uuid: 'hk-strava' })], [storedGarmin], [], opts);
  assert.equal(reasons(c1)['hk-strava'], 'less_direct_copy');

  const storedStrava = fw({ id: 'fw-imp', tracked: false, source: 'apple_health', externalId: 'hk-strava', sourceLabel: 'Strava', sourceRank: 1 });
  const c2 = classify([hw({ uuid: 'hk-watch' })], [storedStrava], [], opts);
  assert.deepEqual(c2.importRows, []);
  assert.equal(c2.possibleDuplicates[0].reason, 'overlaps_existing_import');
  assert.equal(c2.possibleDuplicates[0].forgeWorkoutId, 'fw-imp');
});

test('re-sync after the athlete deleted an import → it never comes back', () => {
  const again = garmin({ uuid: 'hk-deleted' });
  const c = classify([again], [], [{ externalId: 'hk-deleted', outcome: 'deleted' }], opts);
  assert.deepEqual(c.importRows, []);
  assert.deepEqual(c.skipped, [{ externalId: 'hk-deleted', reason: 'already_seen' }]);
  // A skipped decision is remembered the same way, and so is an existing workouts.external_id.
  assert.equal(reasons(classify([again], [], [{ externalId: 'hk-deleted', outcome: 'skipped' }], opts))['hk-deleted'], 'already_seen');
  const stored = fw({ id: 'fw-x', source: 'apple_health', tracked: false, externalId: 'hk-deleted', startedAt: '2026-01-01T00:00:00Z' });
  assert.equal(reasons(classify([again], [stored], [], opts))['hk-deleted'], 'already_seen');
});

test('an indoor treadmill run imports as "Treadmill Run" in miles', () => {
  const c = classify([hw({ uuid: 'hk-tread', indoor: true, distanceMeters: 4828.032 })], [], [], opts);
  assert.equal(c.importRows.length, 1);
  const r = c.importRows[0];
  assert.equal(r.activityType, 'running');
  assert.equal(r.name, 'Treadmill Run');
  assert.equal(r.indoor, true);
  assert.equal(r.distanceMi, 3);
  assert.equal(r.sourceLabel, 'Apple Watch');
  assert.equal(r.startedAt, '2026-09-27T13:30:00.000Z');
  assert.equal(r.endedAt, '2026-09-27T14:05:00.000Z');
});

test('unmapped types (a Watch strength session, HIIT, yoga) are skipped as unsupported — even over a Forge lift', () => {
  const lift = fw({ id: 'fw-lift', activityType: 'strength', distanceMi: null });
  const c = classify(
    [
      hw({ uuid: 'hk-strength', activityType: 'traditionalStrengthTraining', distanceMeters: null }),
      hw({ uuid: 'hk-hiit', activityType: 63, distanceMeters: null, start: '2026-09-26T13:30:00Z', end: '2026-09-26T14:05:00Z' }),
      hw({ uuid: 'hk-yoga', activityType: 'yoga', distanceMeters: null, start: '2026-09-25T13:30:00Z', end: '2026-09-25T14:05:00Z' }),
    ],
    [lift],
    [],
    opts,
  );
  assert.deepEqual(c.importRows, []);
  assert.deepEqual(reasons(c), { 'hk-strength': 'unsupported_type', 'hk-hiit': 'unsupported_type', 'hk-yoga': 'unsupported_type' });
});

test('a Watch run that overlaps a Forge strength session is asked about, not guessed', () => {
  const lift = fw({ id: 'fw-lift', activityType: 'strength', startedAt: '2026-09-27T13:00:00Z', durationSec: 75 * 60, distanceMi: null });
  const c = classify([hw({ uuid: 'hk-tread', indoor: true, start: '2026-09-27T14:00:00Z', end: '2026-09-27T14:15:00Z', durationSec: 900, distanceMeters: 2400 })], [lift], [], opts);
  assert.deepEqual(c.importRows, []);
  assert.equal(c.possibleDuplicates[0].reason, 'overlaps_forge_other_type');
  assert.equal(c.possibleDuplicates[0].forgeWorkoutId, 'fw-lift');
});

test('§4 filters apply before anything else; two separate runs on one day both import', () => {
  const c = classify(
    [
      hw({ uuid: 'hk-am' }),
      garmin({ uuid: 'hk-pm', start: '2026-09-28T00:30:00Z', end: '2026-09-28T01:00:00Z', durationSec: 1800 }),
      hw({ uuid: 'hk-future', start: '2026-09-29T13:30:00Z', end: '2026-09-29T14:05:00Z' }),
      hw({ uuid: 'hk-blip', start: '2026-09-20T13:30:00Z', end: '2026-09-20T13:30:40Z', durationSec: 40 }),
      hw({ uuid: 'hk-gps-glitch', start: '2026-09-21T13:30:00Z', end: '2026-09-21T14:30:00Z', durationSec: 3600, distanceMeters: 900_000 }),
    ],
    [],
    [],
    opts,
  );
  assert.deepEqual(ids(c.importRows), ['hk-am', 'hk-pm']);
  assert.deepEqual(reasons(c), { 'hk-future': 'in_future', 'hk-blip': 'too_short', 'hk-gps-glitch': 'too_far' });
});

test('the same sample twice in one batch (anchor fallback overlap) imports once', () => {
  const c = classify([hw({ uuid: 'hk-1' }), hw({ uuid: 'hk-1' })], [], [], opts);
  assert.deepEqual(ids(c.importRows), ['hk-1']);
  assert.deepEqual(c.skipped, [{ externalId: 'hk-1', reason: 'duplicate_in_batch' }]);
});
