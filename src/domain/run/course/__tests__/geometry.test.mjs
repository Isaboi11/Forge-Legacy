/**
 * geometry.test.mjs — lengths, positions and projections on a course, plus the two small pure helpers
 * that sit on them (elevation gain/loss and the fallback circle of waypoints).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { distM, pointAtM, prepareCourse, projectOnto, projectionCandidates } from '../geometry.ts';
import { courseGainLoss, gainLoss } from '../elevation.ts';
import { circleRadiusM, circleWaypoints, seedBearing } from '../waypoint-loop.ts';
import { ROAD_WINDING_FACTOR } from '../constants.ts';
import { haversineMi } from '../../run-core.ts';
import { HOME, legs } from './fixtures.mjs';

const M_PER_MI = 1609.344;

test('a city block measures what haversine measures, and cumM is monotone from 0', () => {
  const block = legs(HOME, [['N', 200], ['E', 150], ['S', 200], ['W', 150]]);
  const c = prepareCourse(block);
  assert.equal(c.cumM[0], 0);
  for (let i = 1; i < c.cumM.length; i++) assert.ok(c.cumM[i] > c.cumM[i - 1]);
  let hav = 0;
  for (let i = 1; i < block.length; i++) hav += haversineMi(block[i - 1], block[i]) * M_PER_MI;
  assert.ok(Math.abs(c.lengthM - 700) < 0.5, `plane length ${c.lengthM}`);
  assert.ok(Math.abs(c.lengthM - hav) / hav < 0.001, `plane ${c.lengthM} vs haversine ${hav}`);
});

test('pointAtM interpolates position and altitude, and clamps at both ends', () => {
  const pts = legs(HOME, [['N', 200]]).map((p, i) => ({ ...p, alt: i === 0 ? 1400 : 1410 }));
  const c = prepareCourse(pts);
  const mid = pointAtM(c, 50);
  assert.ok(Math.abs(distM(HOME, mid) - 50) < 0.1);
  assert.ok(Math.abs(mid.alt - 1402.5) < 1e-9);
  assert.deepEqual(pointAtM(c, -10), pts[0]);
  assert.deepEqual(pointAtM(c, 9999), pts[1]);
});

test('projection: distance off the line, and the along-course metre, agree with the geometry', () => {
  const c = prepareCourse(legs(HOME, [['N', 200], ['E', 200]]));
  const p = legs(HOME, [['N', 120], ['W', 30]]).at(-1); // 30 m west of the northbound street
  const hit = projectOnto(c, p);
  assert.ok(Math.abs(hit.distM - 30) < 0.2, `dist ${hit.distM}`);
  assert.ok(Math.abs(hit.alongM - 120) < 0.2, `along ${hit.alongM}`);
});

test('a windowed projection is clamped to the window, even when the true nearest point is outside it', () => {
  const c = prepareCourse(legs(HOME, [['N', 400]]));
  const p = legs(HOME, [['N', 300]]).at(-1);
  const inWindow = projectOnto(c, p, 0, 100);
  assert.ok(Math.abs(inWindow.alongM - 100) < 0.01);
  assert.ok(Math.abs(inWindow.distM - 200) < 0.2);
  assert.ok(projectionCandidates(c, p, 0, 100).every((x) => x.alongM <= 100 + 1e-9));
});

// ── elevation ──

test('climb ignores sub-3 m wiggles, the same rule as the tracker', () => {
  assert.deepEqual(gainLoss([100, 101, 99.5, 101.5, 100, 102]), { gainM: 0, lossM: 0 });
  assert.deepEqual(gainLoss([100, 105, 110, 104, 100]), { gainM: 10, lossM: 10 });
  assert.deepEqual(gainLoss([null, 100, undefined, 104, null]), { gainM: 4, lossM: 0 });
  assert.deepEqual(courseGainLoss([{ alt: 10 }, {}, { alt: 20 }]), { gainM: 10, lossM: 0 });
});

// ── the fallback circle ──

test('circle waypoints start and end at the start, sit on one circle, and seeds point different ways', () => {
  const goalM = 5 * M_PER_MI;
  const wps = circleWaypoints(HOME, goalM, 4, 7);
  assert.equal(wps.length, 6);
  assert.deepEqual(wps[0], HOME);
  assert.deepEqual(wps.at(-1), HOME);

  const r = circleRadiusM(goalM);
  assert.ok(Math.abs(r - goalM / (2 * Math.PI * ROAD_WINDING_FACTOR)) < 1e-9);
  // Every waypoint is within 2r of the start (the circle's diameter) and none sits on the start.
  for (const w of wps.slice(1, -1)) {
    const d = distM(HOME, w);
    assert.ok(d > 0.3 * r && d <= 2 * r + 1, `waypoint ${d} m from start, r=${r}`);
  }
  // Straight-line perimeter is under the goal — that is the winding allowance the router fills.
  const perim = wps.slice(1).reduce((s, w, i) => s + distM(wps[i], w), 0);
  assert.ok(perim < goalM && perim > goalM / 2, `perimeter ${perim}`);

  const bearings = [1, 2, 3].map(seedBearing);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const gap = Math.abs(((bearings[i] - bearings[j] + 540) % 360) - 180);
    assert.ok(gap > 60, `seeds ${i + 1},${j + 1} only ${gap}° apart`);
  }
});
