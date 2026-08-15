/**
 * route-privacy.test.mjs — the trim, and the encoding it feeds.
 *
 * ⚠ THE TRIM IS A PRIVACY CONTROL, NOT A FORMATTING CHOICE. `Endurance-Statistics-Architecture-
 * Amendment-001.md` §9 forbade storing routes at all until a dedicated review; the review lifted that on
 * the single condition that the athlete's start and end never reach the database. So the assertions
 * below are about what is ABSENT from the output, which is the awkward kind to write and the only kind
 * that means anything here.
 *
 * Run:  node --test src/domain/run/__tests__/route-privacy.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TRIM_M,
  decodePolyline,
  encodePolyline,
  metresBetween,
  routeForStorage,
  trimEnds,
  trimmedAwayMi,
} from '../route-privacy.ts';
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
  assert.doesNotMatch(encoded, /[0-9",]/, `encoded route contained a forbidden character: ${encoded.slice(0, 40)}`);
});

// ── ⚠ the trim ──────────────────────────────────────────────────────────────

test('⚠ the stored route does not begin where the run began', () => {
  const track = runOf(3);
  const { route } = routeForStorage(track, true);
  const stored = decodePolyline(route);
  const startedAt = { lat: track[0].lat, lon: track[0].lon };
  const away = metresBetween(startedAt, stored[0]);
  assert.ok(away >= TRIM_M * 0.9, `the stored route starts ${Math.round(away)} m from home — it must be at least ${TRIM_M}`);
});

test('⚠ nor does it end where the run ended', () => {
  const track = runOf(3);
  const stored = decodePolyline(routeForStorage(track, true).route);
  const finishedAt = { lat: track[track.length - 1].lat, lon: track[track.length - 1].lon };
  const away = metresBetween(finishedAt, stored[stored.length - 1]);
  assert.ok(away >= TRIM_M * 0.9, `the stored route ends ${Math.round(away)} m from the finish — it must be at least ${TRIM_M}`);
});

test('⚠ no point of the stored route is within the trim of either doorstep', () => {
  // The strong version: not just the endpoints, but EVERY stored point. A route that dipped back inside
  // the trimmed zone would put the front door back in the database by another door.
  const track = runOf(3);
  const stored = decodePolyline(routeForStorage(track, true).route);
  const home = { lat: track[0].lat, lon: track[0].lon };
  const finish = { lat: track[track.length - 1].lat, lon: track[track.length - 1].lon };
  for (const p of stored) {
    assert.ok(metresBetween(home, p) >= TRIM_M * 0.9, 'a stored point sits inside the start zone');
    assert.ok(metresBetween(finish, p) >= TRIM_M * 0.9, 'a stored point sits inside the finish zone');
  }
});

test('a run too short to survive the trim stores no route at all', () => {
  // Under ~400 m there is nothing left once both ends go, and a stub is worse than nothing.
  for (const miles of [0.05, 0.1, 0.2]) {
    const { route } = routeForStorage(runOf(miles), true);
    assert.equal(route, null, `${miles} mi should store no route`);
  }
});

test('a long run keeps the middle, and keeps most of it', () => {
  const track = runOf(5);
  const kept = trimEnds(track);
  const keptMi = kept[kept.length - 1].mi - kept[0].mi;
  // 5 miles less 400 m of trim is ~4.75. A trim that ate much more would mean the filter is wrong.
  assert.ok(Math.abs(keptMi - (5 - (TRIM_M * 2) / 1609.344)) < 0.1, `kept ${keptMi} mi of 5`);
});

test('an indoor bout stores neither a route nor a climb, whatever is lying in the tracker', () => {
  // The card instantiates the tracker for every activity; a treadmill run has no route to keep, and
  // "there happen to be points in state" is not the same question as "was this outdoors".
  const { route, climbM } = routeForStorage(runOf(3), false);
  assert.equal(route, null);
  assert.equal(climbM, null);
});

// ── the climb ───────────────────────────────────────────────────────────────

test('climb is measured on the FULL track, not the trimmed one', () => {
  // Trimming is a privacy control on geometry. Applying it to the climb would quietly under-report the
  // hill the athlete actually ran up.
  let track = [];
  for (let i = 0; i <= 60; i++) {
    track = acceptFix(
      track,
      {
        lat: HOME.lat + (i * 0.01) / MI_PER_DEG_LAT,
        lon: HOME.lon,
        accuracy: 5,
        at: at0 + i * 6000,
        alt: 1400 + i * 5, // a steady 5 m a fix — 300 m of climb over the whole run
        altAccuracy: 4,
      },
      'run',
    ).track;
  }
  const { climbM } = routeForStorage(track, true);
  assert.ok(climbM > 250, `the full climb should survive the trim, got ${climbM}`);
});

test('a device that never reported altitude stores null, not zero', () => {
  // "We could not tell" is not "it was flat" — the same distinction hasClimbData draws on the card.
  const { climbM } = routeForStorage(runOf(3), true);
  assert.equal(climbM, null);
});

// ── what the athlete is told ────────────────────────────────────────────────

test('trimmedAwayMi reports roughly the two trims, so the surface can say so', () => {
  const away = trimmedAwayMi(runOf(3));
  const expected = (TRIM_M * 2) / 1609.344;
  assert.ok(Math.abs(away - expected) < 0.05, `expected ~${expected.toFixed(2)} mi withheld, got ${away.toFixed(2)}`);
});

test('trimmedAwayMi on a run too short to store reports the whole thing', () => {
  const track = runOf(0.1);
  assert.equal(trimmedAwayMi(track), track[track.length - 1].mi);
});
