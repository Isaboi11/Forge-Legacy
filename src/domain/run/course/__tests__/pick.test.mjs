/**
 * pick.test.mjs — tolerance, retry scaling, the 8-call budget, de-duplication and the climb tags.
 *
 * `buildCourses` is driven by FAKE routers here — no network, no key. Each fake draws a real-looking
 * rectangle through the start on a bearing set by its seed, sized to whatever length the fake decides
 * to "route", so de-duplication sees genuinely different loops.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCourses,
  cellOverlap,
  isNearDuplicate,
  rankTags,
  roundTripPoints,
  scaledLength,
  toleranceM,
  withinTolerance,
} from '../pick.ts';
import { COURSE_MAX_MI, MAX_CALLS_PER_BUILD, TOLERANCE_FLOOR_M } from '../constants.ts';
import { offsetM } from '../geometry.ts';
import { circleWaypoints, seedBearing } from '../waypoint-loop.ts';
import { LONG_RUN_DISTANCE_CAP_MI } from '../../../coach/rulebook/endurance.ts';
import { HOME, legs } from './fixtures.mjs';

const MI = 1609.344;

/** A rectangle through HOME, long side on the seed's bearing, perimeter `lengthM`. */
function rectLoop(lengthM, seed) {
  const b = seedBearing(seed);
  const a = lengthM / 3; // sides a, a/2, a, a/2
  const p1 = offsetM(HOME, b, a);
  const p2 = offsetM(p1, b + 90, a / 2);
  const p3 = offsetM(p2, b + 180, a);
  return [HOME, p1, p2, p3, { ...HOME }];
}

const counter = () => {
  let n = 0;
  return () => ++n;
};

test('tolerance is ±5%, with a 0.1 mi floor for short goals', () => {
  assert.ok(Math.abs(toleranceM(5 * MI) - 0.25 * MI) < 1e-9);
  assert.equal(toleranceM(1 * MI), TOLERANCE_FLOOR_M);
  assert.ok(withinTolerance(5.24 * MI, 5 * MI));
  assert.ok(!withinTolerance(5.26 * MI, 5 * MI));
  assert.ok(withinTolerance(0.59 * MI, 0.5 * MI), 'the floor carries a half-mile goal');
  assert.ok(!withinTolerance(0.62 * MI, 0.5 * MI));
});

test('retry scaling is L × goal/actual, clamped to 0.7–1.4, and never divides by zero', () => {
  const g = 5 * MI;
  assert.ok(Math.abs(scaledLength(g, g, 6 * MI) - (g * 5) / 6) < 1e-6);
  assert.equal(scaledLength(g, g, 2 * MI), g * 1.4);
  assert.equal(scaledLength(g, g, 20 * MI), g * 0.7);
  assert.equal(scaledLength(g, g, 0), g * 1.4);
  // The ratio applies to the LAST request, not the goal — a second miss corrects the corrected length.
  assert.ok(Math.abs(scaledLength(4 * MI, g, 4.5 * MI) - (4 * MI * 5) / 4.5) < 1e-6);
});

test('round-trip points: 3 under 3 mi, 4 up to 8, 5 above; the distance cap matches the long-run cap', () => {
  assert.equal(roundTripPoints(2.9 * MI), 3);
  assert.equal(roundTripPoints(3 * MI), 4);
  assert.equal(roundTripPoints(8 * MI), 4);
  assert.equal(roundTripPoints(8.1 * MI), 5);
  assert.equal(COURSE_MAX_MI, LONG_RUN_DISTANCE_CAP_MI);
});

test('near-duplicates: a loop drawn 8 m off is the same loop; a different block is not', () => {
  const a = legs(HOME, [['N', 400], ['E', 400], ['S', 400], ['W', 400]]);
  const b = a.map((p) => offsetM(p, 45, 8));
  const c = legs(HOME, [['S', 400], ['W', 400], ['N', 400], ['E', 400]]);
  assert.ok(isNearDuplicate(a, b), `overlap ${cellOverlap(a, b)}`);
  assert.ok(!isNearDuplicate(a, c), `overlap ${cellOverlap(a, c)}`);
  // Same loop, run the other way round, is the same streets.
  assert.ok(isNearDuplicate(a, a.slice().reverse()));
});

test('climb tags: flattest / hilliest / most varied — and none at all when the loops are equally flat', () => {
  assert.deepEqual(rankTags([12, 48, 30]), ['flattest', 'hilliest', 'most-varied']);
  assert.deepEqual(rankTags([4, 5, 6]), [null, null, null]);
  assert.deepEqual(rankTags([20]), [null]);
});

// ── the build ──

test('a router that overshoots by 20% converges on the retry: 3 passing loops in 6 calls', async () => {
  const goalM = 5 * MI;
  const asked = [];
  const r = await buildCourses({
    goalM,
    nextSeed: counter(),
    fetchLoop: async (L, seed) => {
      asked.push(L);
      const d = L * 1.2;
      return { points: rectLoop(d, seed), distanceM: d, gainM: seed * 7 };
    },
  });
  assert.equal(r.calls, 6);
  assert.equal(r.options.length, 3);
  assert.ok(r.options.every((o) => o.withinTolerance && withinTolerance(o.loop.distanceM, goalM)));
  assert.ok(asked.slice(3).every((L) => Math.abs(L - goalM / 1.2) < 1e-6), 'retried at L × goal / actual');
  // Sorted flattest first, tagged by climb.
  assert.deepEqual(r.options.map((o) => o.tag), ['flattest', 'most-varied', 'hilliest']);
  assert.ok(r.options[0].gainM <= r.options[1].gainM && r.options[1].gainM <= r.options[2].gainM);
});

test('a router that returns nothing spends EXACTLY the 8-call budget, and says so with no options', async () => {
  let calls = 0;
  const r = await buildCourses({
    goalM: 3 * MI,
    nextSeed: counter(),
    fetchLoop: async () => {
      calls++;
      return null;
    },
  });
  assert.equal(calls, MAX_CALLS_PER_BUILD);
  assert.equal(r.calls, MAX_CALLS_PER_BUILD);
  assert.deepEqual(r.options, []);
});

test('a throwing router is a miss that still spent its call', async () => {
  const r = await buildCourses({
    goalM: 3 * MI,
    nextSeed: counter(),
    fetchLoop: async () => {
      throw new Error('503');
    },
  });
  assert.equal(r.calls, 8);
  assert.equal(r.options.length, 0);
});

test('a router that never lands in tolerance: the 2 closest misses come back, flagged, never padded', async () => {
  const goalM = 5 * MI;
  // Always 30% long, whatever it is asked — the clamp stops it chasing its tail.
  const r = await buildCourses({
    goalM,
    nextSeed: counter(),
    fetchLoop: async (L, seed) => ({ points: rectLoop(Math.max(L, goalM) * 1.3, seed), distanceM: Math.max(L, goalM) * 1.3 }),
  });
  assert.equal(r.calls, 8);
  assert.equal(r.options.length, 2);
  assert.ok(r.options.every((o) => !o.withinTolerance));
  assert.ok(r.options.every((o) => Math.abs(o.loop.distanceM - goalM * 1.3) < 1));
});

test('the budget caps the THIRD slot: 3 slots × 3 tries would be 9 calls, and it stops at 8', async () => {
  const goalM = 4 * MI;
  const r = await buildCourses({
    goalM,
    nextSeed: counter(),
    // Slots pass only on their third try: 1.6× → clamp 0.7 → 1.12× → corrected → exactly the goal.
    fetchLoop: async (L, seed) => {
      const d = L < goalM * 0.66 ? goalM : L * 1.6;
      return { points: rectLoop(d, seed), distanceM: d };
    },
  });
  assert.equal(r.calls, 8);
  assert.equal(r.options.filter((o) => o.withinTolerance).length, 2);
});

test('a passing duplicate is re-asked with a new seed at the same length', async () => {
  const goalM = 3 * MI;
  const seen = [];
  const r = await buildCourses({
    goalM,
    nextSeed: counter(),
    // Seeds 1–3 all return the SAME loop; later seeds return their own.
    fetchLoop: async (L, seed) => {
      seen.push([seed, L]);
      const shape = seed <= 3 ? 1 : seed;
      return { points: rectLoop(goalM, shape), distanceM: goalM };
    },
  });
  assert.equal(r.options.length, 3);
  assert.equal(r.calls, 5, 'one kept, two duplicates re-asked once each');
  assert.ok(seen.slice(3).every(([, L]) => L === goalM));
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    assert.ok(!isNearDuplicate(r.options[i].loop.points, r.options[j].loop.points));
  }
});

test('the fallback generator drives the same build: circle waypoints → an A→B router → tolerance', async () => {
  const goalM = 5 * MI;
  const WINDING = 1.55; // this neighbourhood winds more than the 1.3 guess
  const straight = (pts) => pts.slice(1).reduce((s, p, i) => {
    const a = pts[i];
    const dy = (p.lat - a.lat) * 111_195;
    const dx = (p.lon - a.lon) * 111_195 * Math.cos((a.lat * Math.PI) / 180);
    return s + Math.hypot(dx, dy);
  }, 0);
  const r = await buildCourses({
    goalM,
    nextSeed: counter(),
    fetchLoop: async (L, seed) => {
      const wps = circleWaypoints(HOME, L, roundTripPoints(goalM), seed);
      return { points: wps, distanceM: straight(wps) * WINDING };
    },
  });
  assert.ok(r.options.length >= 2, `${r.options.length} options`);
  assert.ok(r.options.every((o) => o.withinTolerance));
  assert.ok(r.calls <= 8);
});
