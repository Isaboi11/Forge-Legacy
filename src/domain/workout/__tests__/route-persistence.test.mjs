/**
 * route-persistence.test.mjs — the route survives the trip to the save payload, and arrives trimmed.
 *
 * `route-privacy.test.mjs` proves the trim itself. This proves the OTHER half, which is the half that
 * historically breaks here: that the value reaches `save_workout`'s jsonb at all, under the key the
 * migration reads, and that nothing between the card and the column quietly derives a distance from it.
 *
 * ⚠ 0162 READS `route` AND `climb_m`. A rename on either side of that boundary is silent — the save
 * succeeds, the column stays null, and the map is empty for a reason no error mentions. That is exactly
 * how 0153 shipped and appeared to do nothing.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildSaveExercises } from '../save-core.ts';
import { acceptFix } from '../../run/run-core.ts';
import { routeForStorage, decodePolyline, metresBetween, TRIM_M, MIN_MAPPABLE_MI } from '../../run/route-privacy.ts';

const MI_PER_DEG_LAT = 69.0546;
const at0 = 1_700_000_000_000;
const HOME = { lat: 40.2969, lon: -111.6946 };

/** A real 3-mile track, built through the real accept path. */
function track3mi() {
  let t = [];
  for (let i = 0; i * 0.01 <= 3; i++) {
    t = acceptFix(t, { lat: HOME.lat + (i * 0.01) / MI_PER_DEG_LAT, lon: HOME.lon, accuracy: 5, at: at0 + i * 6000 }, 'run').track;
  }
  return t;
}

const runSession = (setOverrides = {}) => ({
  exercises: [
    {
      name: 'Outdoor Run',
      kind: 'cardio',
      activity: 'run',
      modality: 'outdoor',
      section: 'main',
      position: 0,
      sets: [
        {
          setIndex: 0,
          weight: null,
          targetReps: 0,
          actualReps: null,
          done: true,
          durationSec: 1867,
          distanceMi: 3.01,
          floors: null,
          inclinePct: null,
          modality: 'outdoor',
          ...setOverrides,
        },
      ],
    },
  ],
});

const firstSet = (session) => buildSaveExercises(session)[0].sets[0];

// ── the keys the migration reads ────────────────────────────────────────────

test('⚠ the payload carries `route` and `climb_m` — the exact keys 0162 reads', () => {
  const { route, climbM } = routeForStorage(track3mi(), true);
  const s = firstSet(runSession({ route, climbM }));
  assert.ok('route' in s, 'save_workout reads v_set->>\'route\'; a rename here stores nothing and says nothing');
  assert.ok('climb_m' in s, 'save_workout reads v_set->>\'climb_m\'');
  assert.equal(s.route, route);
});

test('an indoor bout sends null for both, so a treadmill never files a shape', () => {
  const s = firstSet(runSession({ route: null, climbM: null, modality: 'indoor' }));
  assert.equal(s.route, null);
  assert.equal(s.climb_m, null);
});

test('a set that predates the field sends null rather than undefined', () => {
  // `undefined` disappears through JSON.stringify, so the key would vanish from the jsonb entirely.
  // Postgres would cope, but "the key is absent" and "the athlete ran nothing" must not be the same bug.
  const s = firstSet(runSession());
  assert.equal(s.route, null);
  assert.equal(s.climb_m, null);
  assert.equal(JSON.parse(JSON.stringify(s)).route, null);
});

// ── ⚠ what must NOT happen ──────────────────────────────────────────────────

test('⚠ the stored route is still trimmed at the far end of the save path', () => {
  // The end-to-end version: build a real track, put it through the real save builder, decode what would
  // reach the column, and check the athlete's doorstep is not in it. Every layer in between is covered.
  const t = track3mi();
  const { route, climbM } = routeForStorage(t, true);
  const s = firstSet(runSession({ route, climbM }));
  const stored = decodePolyline(s.route);
  const home = { lat: t[0].lat, lon: t[0].lon };
  const finish = { lat: t[t.length - 1].lat, lon: t[t.length - 1].lon };
  for (const p of stored) {
    assert.ok(metresBetween(home, p) >= TRIM_M * 0.9, 'the start of the run reached the save payload');
    assert.ok(metresBetween(finish, p) >= TRIM_M * 0.9, 'the end of the run reached the save payload');
  }
});

test('⚠ distance is the measured mileage, NOT anything derived from the trimmed route', () => {
  // The route is short by two trims. If any layer ever recomputes distance from it — for tidiness, for
  // consistency, for any reason — every run in the app silently loses 400 m, and `workouts.distance` is
  // what mileage goals (0035), honors (0078), challenges (0061) and squad totals (0107) all read.
  const t = track3mi();
  const { route, climbM } = routeForStorage(t, true);
  const s = firstSet(runSession({ route, climbM, distanceMi: 3.01 }));
  assert.equal(s.distance, 3.01, 'the distance must be the one measured on the untrimmed track');
  assert.equal(s.distance_unit, 'mi');

  const storedLen = decodePolyline(s.route).length;
  assert.ok(storedLen > 1, 'sanity: there is a route to have been tempted by');
});

test('climb rides along as metres, and null stays null rather than becoming zero', () => {
  const s = firstSet(runSession({ climbM: 137 }));
  assert.equal(s.climb_m, 137);
  const none = firstSet(runSession({ climbM: null }));
  assert.equal(none.climb_m, null, '"we could not measure altitude" is not "the route was flat"');
});

// ── the migration and the client agree on the alphabet ──────────────────────

test('⚠ what the encoder emits satisfies 0162’s CHECK constraint', () => {
  // The column refuses digits, commas and quotes — the marks of raw coordinates arriving because
  // somebody skipped the encoder, and therefore almost certainly the trim. If the encoder ever emitted
  // one, every outdoor save would start failing at the database with no clue pointing back here.
  const { route } = routeForStorage(track3mi(), true);
  assert.doesNotMatch(route, /[0-9",]/);
  assert.ok(route.length >= 2 && route.length <= 65536);
  // And the characters it DOES use include brackets, which is why the constraint cannot exclude them.
  assert.match(route, /^[\x3f-\x7e]+$/, 'every byte must sit in the printable polyline range 63–126');
});

// ── the bout too short to have a route, and the sentence that admits it ──────

/*
 * ══ ⚠ A CORRECT REFUSAL THAT SAID NOTHING READ AS A BROKEN MAP ══
 *
 * A tester walked to the end of the street, saved 0.22 mi, got the dashed placeholder back and asked what
 * had happened to the Apple map. Nothing had: 200 m off each end of a 354 m walk is the whole walk, so
 * there was no route to store and none to draw. The threshold is the privacy control working. The silence
 * was the defect — and it is the kind nobody can debug from the screen, because a missing map and a
 * withheld map look identical.
 */

/** A straight-line bout of `mi` miles, built through the real accept path. */
const trackMi = (mi) => {
  let t = [];
  for (let i = 0; i * 0.01 <= mi; i++) {
    t = acceptFix(t, { lat: HOME.lat + (i * 0.01) / MI_PER_DEG_LAT, lon: HOME.lon, accuracy: 5, at: at0 + i * 6000 }, 'run').track;
  }
  return t;
};

test('⚠ a bout under MIN_MAPPABLE_MI stores no route at all — the two trims meet in the middle', () => {
  assert.ok(MIN_MAPPABLE_MI > 0.24 && MIN_MAPPABLE_MI < 0.25, `the threshold moved to ${MIN_MAPPABLE_MI} mi`);
  // Below it, every point is within TRIM_M of one end or the other, which is the thing being protected.
  assert.equal(routeForStorage(trackMi(0.22), true).route, null, 'a 354 m walk stored a shape made entirely of doorstep');
  // And a bout comfortably over it still keeps its middle, so this is a floor and not an off switch.
  assert.ok(routeForStorage(trackMi(1), true).route, 'a one-mile run lost its route to the floor');
});

test('⚠ and the card SAYS "too short to map" rather than showing a sketch and no reason', () => {
  const CARD = readFileSync(new URL('../../../components/workout/CardioBlockCard.tsx', import.meta.url), 'utf8');
  assert.match(CARD, /MIN_MAPPABLE_MI/, 'the card can no longer tell a withheld route from a missing one');
  assert.match(CARD, /too short to map/, 'a saved outdoor run with no map explains itself to nobody again');
});
