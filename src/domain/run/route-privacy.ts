/**
 * Turning a measured track into something safe to keep.
 *
 * Pure — no React, no Supabase — so `node --test` can load it and so there is exactly ONE place that
 * decides what a stored route contains.
 *
 * ══ ⚠ THE TRIM IS THE REASON THIS FILE EXISTS ══
 *
 * `Endurance-Statistics-Architecture-Amendment-001.md` §9 forbade storing route data at all, on the
 * strength of `External-Activity-Import-Architecture-Evaluation.md` §3: route geometry is a materially
 * higher privacy surface than anything else this app keeps, because **a run begins and ends at the
 * athlete's front door**. `Route-And-Elevation-Persistence-Amendment-001.md` lifts that prohibition on
 * one condition, D-RTE-1, and this is where that condition is met.
 *
 * The first and last `TRIM_M` metres of TRAVEL are removed BEFORE the route is encoded. Not hidden at
 * read time — removed. A route stored whole and masked in the UI still has the front door in the
 * database, recoverable by any bug, any export, any breach, any future feature that forgets. A
 * display-time rule protects the athlete from the screen; a write-time rule protects them from the
 * system, and only one of those is worth having.
 *
 * Everything the athlete SEES is computed from the untrimmed track — distance, pace, duration, climb.
 * The trim costs the map its ends and costs the numbers nothing.
 */

/* ⚠ The `.ts` is required, not stylistic. A runtime import of a sibling domain module must carry the
   extension or `node --test` cannot resolve it — the same rule that keeps `@/` type-only down here. */
import { haversineMi, totalGainM, hasClimbData, type TrackPoint } from './run-core.ts';

/**
 * Metres removed from each end.
 *
 * 200 m is the established default for this mitigation (Strava's privacy-zone radius is ⅛ mile ≈ 201 m).
 * It is far larger than any fix this app accepts — `ACCURACY_FLOOR_M` is 65 m — so it cannot be defeated
 * by a lucky reading, and it is enough that a trimmed endpoint names a neighbourhood rather than a
 * building.
 *
 * ⚠ NOT CONFIGURABLE, DELIBERATELY (D-RTE-2). An off switch would make the safe path opt-in, and the
 * default would end up doing the protecting for exactly the people least likely to find the setting.
 */
export const TRIM_M = 200;

const M_PER_MI = 1609.344;
const TRIM_MI = TRIM_M / M_PER_MI;

/**
 * Drop the first and last `TRIM_M` metres of travel.
 *
 * Measured along the cumulative `mi` the track already carries, not as a radius from the start: an
 * out-and-back that passes its own doorstep in the middle is not the case this guards, and a radius
 * would carve a hole out of the middle of a route while leaving the ends of a long loop intact.
 *
 * Returns fewer than two points when there is not enough run left to be a shape, and the caller stores
 * nothing at all. A bout under ~400 m has no storable route, which is correct rather than unfortunate:
 * at that length the trim and the route are the same thing.
 */
export function trimEnds(track: readonly TrackPoint[]): TrackPoint[] {
  if (track.length < 2) return [];
  const total = track[track.length - 1].mi;
  if (total <= TRIM_MI * 2) return [];
  return track.filter((p) => p.mi >= TRIM_MI && p.mi <= total - TRIM_MI);
}

// ── the polyline ────────────────────────────────────────────────────────────

/**
 * Google's encoded-polyline algorithm, precision 5.
 *
 * Chosen over an array of coordinates for size: a 3-mile run is ~2 KB encoded against ~16 KB as JSON.
 * Precision 5 is ~1 m, an order of magnitude finer than the best fix this app will accept, so the
 * encoding loses nothing that was ever measured.
 *
 * Values are stored as deltas from the previous point, zig-zagged so a negative becomes a small
 * positive, then chunked into 5 bits at a time with the high bit flagging "more to come" and 63 added
 * to land every byte in printable ASCII.
 */
function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let out = '';
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  return out + String.fromCharCode(v + 63);
}

export function encodePolyline(points: readonly { lat: number; lon: number }[]): string {
  let lastLat = 0;
  let lastLon = 0;
  let out = '';
  for (const p of points) {
    // Rounded to the grid FIRST, and the deltas taken between rounded values — taking deltas of the raw
    // numbers and rounding those accumulates a drift that walks the tail of a long route off course.
    const lat = Math.round(p.lat * 1e5);
    const lon = Math.round(p.lon * 1e5);
    out += encodeValue(lat - lastLat) + encodeValue(lon - lastLon);
    lastLat = lat;
    lastLon = lon;
  }
  return out;
}

/** The inverse, for drawing a stored route back onto a map. */
export function decodePolyline(encoded: string): { lat: number; lon: number }[] {
  const out: { lat: number; lon: number }[] = [];
  let i = 0;
  let lat = 0;
  let lon = 0;
  while (i < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && i < encoded.length);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && i < encoded.length);
    lon += result & 1 ? ~(result >> 1) : result >> 1;

    out.push({ lat: lat / 1e5, lon: lon / 1e5 });
  }
  return out;
}

// ── what the save path calls ────────────────────────────────────────────────

export interface StoredRoute {
  /** The trimmed, encoded shape — or null when there is nothing safe or meaningful to keep. */
  route: string | null;
  /** Total climb in whole metres, or null when the device never reported a usable altitude. */
  climbM: number | null;
}

/**
 * The ONE function the save path calls. Trim, then encode, in that order and never separately.
 *
 * Exported as a single step on purpose: a caller that could reach `encodePolyline` with an untrimmed
 * track is a caller that will eventually do it. The privacy rule holds because there is no path to a
 * stored route that does not pass through this line.
 *
 * ⚠ `outdoor` is the caller's assertion that this bout was GPS-tracked outdoors. A treadmill bout has
 * no route to store however many points happen to be lying around in the tracker's state.
 */
export function routeForStorage(track: readonly TrackPoint[], outdoor: boolean): StoredRoute {
  // Climb comes from the FULL track. It is a scalar, it carries no location, and trimming it would
  // quietly under-report the hill the athlete actually climbed.
  // `readonly` in, mutable out: these two only read, but they predate this file and are typed on the
  // array `useRunTracker` actually holds. Widening their signatures would touch the live path for a
  // caller's convenience, which is the wrong direction to pay the cost in.
  const full = track as TrackPoint[];
  const climbM = outdoor && hasClimbData(full) ? Math.round(totalGainM(full)) : null;
  if (!outdoor) return { route: null, climbM: null };

  const kept = trimEnds(track);
  if (kept.length < 2) return { route: null, climbM };
  return { route: encodePolyline(kept), climbM };
}

/**
 * How much of the run the stored map is NOT showing, in miles — so a route surface can say so.
 *
 * The athlete is told that the map omits the start and end of their run. An app that silently drew a
 * shorter route than the one that was run would be lying by omission about the one thing the number
 * beside it claims to describe.
 */
export function trimmedAwayMi(track: readonly TrackPoint[]): number {
  if (track.length < 2) return 0;
  const kept = trimEnds(track);
  if (kept.length < 2) return track[track.length - 1].mi;
  return track[track.length - 1].mi - (kept[kept.length - 1].mi - kept[0].mi);
}

/** Straight-line distance in metres between two points — for tests and for the map's own bounds. */
export const metresBetween = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number =>
  haversineMi(a, b) * M_PER_MI;
