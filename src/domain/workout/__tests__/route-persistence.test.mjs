/**
 * route-persistence.test.mjs — the route survives the trip to the save payload, whole.
 *
 * `route-privacy.test.mjs` proves the storage rule (untrimmed since `Route-Sharing-Amendment-001`
 * D-RS-1). This proves the OTHER half, which is the half that historically breaks here: that the value
 * reaches `save_workout`'s jsonb at all, under the key the migration reads, and that nothing between
 * the card and the column quietly derives a distance from it.
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
import { routeForStorage, decodePolyline, metresBetween } from '../../run/route-privacy.ts';

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

test('⚠ the WHOLE route reaches the far end of the save path — D-RS-1, held end to end', () => {
  // The end-to-end inverse of the assertion that held D-RTE-1: build a real track, put it through the
  // real save builder, decode what would reach the column, and check both doorsteps ARE in it. A layer
  // that quietly reintroduces trimming — a stale import, a revived branch — fails here, not in prod.
  const t = track3mi();
  const { route, climbM } = routeForStorage(t, true);
  const s = firstSet(runSession({ route, climbM }));
  const stored = decodePolyline(s.route);
  const home = { lat: t[0].lat, lon: t[0].lon };
  const finish = { lat: t[t.length - 1].lat, lon: t[t.length - 1].lon };
  assert.ok(metresBetween(home, stored[0]) < 20, 'the start of the run must reach the save payload');
  assert.ok(metresBetween(finish, stored[stored.length - 1]) < 20, 'the end of the run must reach the save payload');
  assert.equal(stored.length, t.length, 'every point of the track survives to the column');
});

test('⚠ distance is the measured mileage, NOT anything derived from the route', () => {
  // Every run saved before the rescission has a route 400 m short of its mileage, forever. If any layer
  // ever recomputes distance from the polyline — for tidiness, for consistency — those runs all shrink,
  // and `workouts.distance` is what mileage goals (0035), honors (0078), challenges (0061) and squad
  // totals (0107) all read. Measured distance and drawn shape stay independent in both directions.
  const t = track3mi();
  const { route, climbM } = routeForStorage(t, true);
  const s = firstSet(runSession({ route, climbM, distanceMi: 3.01 }));
  assert.equal(s.distance, 3.01, 'the distance must be the measured one, never the polyline’s');
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
  // somebody skipped the encoder. If the encoder ever emitted one, every outdoor save would start
  // failing at the database with no clue pointing back here.
  const { route } = routeForStorage(track3mi(), true);
  assert.doesNotMatch(route, /[0-9",]/);
  assert.ok(route.length >= 2 && route.length <= 65536);
  // And the characters it DOES use include brackets, which is why the constraint cannot exclude them.
  assert.match(route, /^[\x3f-\x7e]+$/, 'every byte must sit in the printable polyline range 63–126');
});

// ── the short bout, after the floor went with the trim ──────────────────────

/*
 * The tester who walked to the end of the street (0.22 mi) and asked where the map went was the
 * MIN_MAPPABLE_MI story: 200 m off each end of a 354 m walk was the whole walk, and the card grew a
 * "too short to map" caption to say so. Both the floor and the caption retired with the trim
 * (D-RS-1) — the walk now stores the walk, so there is nothing to explain.
 */

/** A straight-line bout of `mi` miles, built through the real accept path. */
const trackMi = (mi) => {
  let t = [];
  for (let i = 0; i * 0.01 <= mi; i++) {
    t = acceptFix(t, { lat: HOME.lat + (i * 0.01) / MI_PER_DEG_LAT, lon: HOME.lon, accuracy: 5, at: at0 + i * 6000 }, 'run').track;
  }
  return t;
};

test('⚠ the street-length walk stores its route now — the floor went with the trim', () => {
  assert.ok(routeForStorage(trackMi(0.22), true).route, 'a 354 m tracked outdoor bout stores its shape');
  assert.ok(routeForStorage(trackMi(1), true).route, 'and a mile obviously still does');
});

test('⚠ the card no longer carries the retired captions', () => {
  const CARD = readFileSync(new URL('../../../components/workout/CardioBlockCard.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(CARD, /MIN_MAPPABLE_MI/, 'the floor is gone; a reference to it is a revival waiting to happen');
  assert.doesNotMatch(CARD, /too short to map/, 'a caption explaining a refusal that no longer exists');
  assert.doesNotMatch(CARD, /ends trimmed for privacy/, 'the trim caption must not outlive the trim');
});
