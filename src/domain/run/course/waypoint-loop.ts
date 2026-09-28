/**
 * The fallback loop generator (§4.4) — provider-agnostic, so we are never locked to ORS.
 *
 * ORS is the only hosted router on the list that makes a loop of a given length by itself. Every router
 * can go A → B → C, though. So if ORS returns nothing, fails, or we move provider: put `P` waypoints on
 * a circle that passes through the start, and ask any foot router for start → w1 → … → wP → start.
 *
 * Roads wind, so a circle of circumference `goal` routes long. The radius is shrunk by
 * `ROAD_WINDING_FACTOR` (1.3): `r = length / (2π × 1.3)`. That factor is only a starting point — the
 * orchestrator in `pick.ts` scales the REQUESTED length after each miss (`L × goal / actual`), which is
 * exactly re-tuning the winding factor for this neighbourhood. So `buildCourses` drives this generator
 * unchanged: `fetchLoop(lengthM, seed)` → `circleWaypoints(start, lengthM, points, seed)` → router.
 */

import { ROAD_WINDING_FACTOR } from './constants.ts';
import { offsetM, type LatLon } from './geometry.ts';

/**
 * A seed's bearing. The golden angle spreads successive seeds evenly round the compass, so three seeds
 * in a row point three genuinely different ways instead of clustering the way random bearings can.
 */
export const seedBearing = (seed: number): number => (((seed * 137.50776405) % 360) + 360) % 360;

/** The circle radius that should route to about `lengthM` of road. */
export const circleRadiusM = (lengthM: number, winding: number = ROAD_WINDING_FACTOR): number =>
  lengthM / (2 * Math.PI * winding);

/**
 * `[start, w1 … wP, start]` — the full list to hand an A→B router.
 *
 * The circle's centre sits `r` from the start on the seed's bearing, so the start is ON the circle and
 * the loop leaves and returns there. The waypoints are evenly spaced round the rest of it, clockwise.
 */
export function circleWaypoints(
  start: LatLon,
  lengthM: number,
  points: number,
  seed: number,
  winding: number = ROAD_WINDING_FACTOR,
): LatLon[] {
  const r = circleRadiusM(lengthM, winding);
  const bearing = seedBearing(seed);
  const centre = offsetM(start, bearing, r);
  // From the centre, the start lies on the opposite bearing. Step round from there.
  const startAngle = bearing + 180;
  const out: LatLon[] = [{ lat: start.lat, lon: start.lon }];
  for (let k = 1; k <= points; k++) {
    out.push(offsetM(centre, startAngle + (360 * k) / (points + 1), r));
  }
  out.push({ lat: start.lat, lon: start.lon });
  return out;
}
