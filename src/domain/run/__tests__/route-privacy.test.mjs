/**
 * route-privacy.test.mjs — the encoding, and the storage rule as it stands after the rescission.
 *
 * ⚠ THIS SUITE USED TO PROVE THE TRIM. Until `Route-Sharing-Amendment-001` D-RS-1 (2026-08-26, PO:
 * *"we veto the 200m remove. Take this out completely"*) the assertions here were about what was
 * ABSENT from the output — the athlete's start and end never reaching the database. Those assertions
 * are now INVERTED, deliberately and on the record: the stored route must begin where the run began
 * and end where it ended. A regression that quietly reintroduces trimming fails this suite exactly as
 * loudly as removing the trim used to.
 *
 * Run:  node --test src/domain/run/__tests__/route-privacy.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { decodePolyline, encodePolyline, metresBetween, routeForStorage } from '../route-privacy.ts';
import { acceptFix } from '../run-core.ts';

const MI_PER_DEG_LAT = 69.0546;
const at0 = 1_700_000_000_000;
const HOME = { lat: 40.2969, lon: -111.6946 };

/** A straight run north from HOME of `miles`, through the real accept path so the track is a real one. */
function runOf(miles) {
  let track = [];
  const stepMi = 0.01; // ~16 m, comfortably past the movement gate
  for (let i = 0; i * stepMi <= miles; i++) {
    track = acceptFix(
      track,
      { lat: HOME.lat + (i * stepMi) / MI_PER_DEG_LAT, lon: HOME.lon, accuracy: 5, at: at0 + i * 6000 },
      'run',
    ).track;
  }
  return track;
}

// ── the polyline, round-tripped ─────────────────────────────────────────────

test('encode/decode round-trips to within the precision it claims', () => {
  const pts = [
    { lat: 38.5, lon: -120.2 },
    { lat: 40.7, lon: -120.95 },
    { lat: 43.252, lon: -126.453 },
  ];
  const back = decodePolyline(encodePolyline(pts));
  assert.equal(back.length, pts.length);
  for (let i = 0; i < pts.length; i++) {
    // Precision 5 is ~1 m. Anything worse would be losing measurement, not just bytes.
    assert.ok(metresBetween(pts[i], back[i]) < 1.5, `point ${i} moved ${metresBetween(pts[i], back[i])} m`);
  }
});

test('encode matches the reference vector for Google’s algorithm', () => {
  // The canonical example from the published spec. If this drifts, every stored route becomes unreadable
  // by anything that expects a standard polyline — including the map library that will consume it.
  const pts = [
    { lat: 38.5, lon: -120.2 },
    { lat: 40.7, lon: -120.95 },
    { lat: 43.252, lon: -126.453 },
  ];
  assert.equal(encodePolyline(pts), '_p~iF~ps|U_ulLnnqC_mqNvxq`@');
});

test('an empty track encodes to an empty string rather than throwing', () => {
  assert.equal(encodePolyline([]), '');
  assert.deepEqual(decodePolyline(''), []);
});

test('the encoding contains no digit, comma or quote — the shape 0162’s constraint checks', () => {
  // The column refuses raw coordinates. If the encoder ever emitted one of these the save would be
  // rejected by the database, which is a far worse way to find out than here.
  const encoded = encodePolyline(runOf(3).map((p) => ({ lat: p.lat, lon: p.lon })));
  assert.ok(encoded.length > 0);
  assert.doesNotMatch(encoded, /[0-9",]/);
});

// ── the storage rule after D-RS-1 ───────────────────────────────────────────

test('⚠ the stored route begins where the run began — the rescission, held', () => {
  const t = runOf(3);
  const { route } = routeForStorage(t, true);
  assert.ok(route, 'a 3-mile outdoor run stores a route');
  const pts = decodePolyline(route);
  assert.ok(metresBetween(HOME, pts[0]) < 20, `first stored point is ${metresBetween(HOME, pts[0])} m from the start`);
});

test('⚠ …and ends where it ended', () => {
  const t = runOf(3);
  const finish = { lat: t[t.length - 1].lat, lon: t[t.length - 1].lon };
  const { route } = routeForStorage(t, true);
  const pts = decodePolyline(route);
  const last = pts[pts.length - 1];
  assert.ok(metresBetween(finish, last) < 20, `last stored point is ${metresBetween(finish, last)} m from the finish`);
});

test('⚠ the whole track survives — point for point, not just the ends', () => {
  const t = runOf(2);
  const { route } = routeForStorage(t, true);
  const pts = decodePolyline(route);
  assert.equal(pts.length, t.length, 'no point was dropped between the tracker and the row');
});

test('a short outdoor bout stores its shape too — MIN_MAPPABLE went with the trim', () => {
  // Under D-RTE-1 a bout below ~400 m had no storable middle. The tester who walked to the end of the
  // street and asked where the map went now gets the walk.
  const t = runOf(0.22);
  const { route } = routeForStorage(t, true);
  assert.ok(route, 'a 0.22 mi tracked outdoor bout stores a route');
  assert.ok(decodePolyline(route).length >= 2);
});

test('one fix is a dot, not a shape — nothing is stored', () => {
  const t = runOf(0);
  assert.ok(t.length <= 1, `expected at most one accepted fix, got ${t.length}`);
  const { route } = routeForStorage(t, true);
  assert.equal(route, null);
});

test('an indoor bout stores neither a route nor a climb, whatever is lying in the tracker', () => {
  const { route, climbM } = routeForStorage(runOf(3), false);
  assert.equal(route, null);
  assert.equal(climbM, null);
});

test('a device that never reported altitude stores null climb, not zero', () => {
  // runOf() never sets altitude, so hasClimbData is false — "we could not tell" must not become "flat".
  const { climbM } = routeForStorage(runOf(3), true);
  assert.equal(climbM, null);
});
