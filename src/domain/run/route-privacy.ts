/**
 * Turning a measured track into what the database keeps.
 *
 * Pure — no React, no Supabase — so `node --test` can load it and so there is exactly ONE place that
 * decides what a stored route contains.
 *
 * ══ ⚠ THE TRIM THIS FILE EXISTED FOR IS RESCINDED ══
 *
 * Until 2026-08-26 this module removed the first and last 200 m of travel before encoding — D-RTE-1,
 * the condition under which `Route-And-Elevation-Persistence-Amendment-001.md` lifted the ban on
 * storing route data at all, because a run begins and ends at the athlete's front door.
 *
 * `Route-Sharing-Amendment-001.md` D-RS-1 rescinds it, by PO veto: *"we veto the 200m remove. Take
 * this out completely."* The full track, endpoints included, is stored — and since the same amendment
 * approves sharing routes onto posts (D-RS-2), the risk that the trim carried is now carried by
 * CONSENT instead: including the map on a post is opt-in, per post, default off (D-RS-3). The
 * engineering recommendation to keep the trim is recorded in that amendment's Section 2, alongside the
 * PO's decision. Neither is repeated here; this header just tells you which one governs.
 *
 * The filename stays. Renaming it would touch six importers and the database's own column comments to
 * commemorate a rule that no longer exists — the name is where the history is, and this header is what
 * it means now.
 *
 * ⚠ ROUTES STORED BEFORE THIS CHANGE ARE TRIMMED FOREVER. The 400 m never reached the database, so an
 * old run's map is 400 m short of its numbers and nothing can recover it. `route-region.ts` and every
 * drawing surface must keep treating "the route is shorter than the distance" as normal data.
 */

/* ⚠ The `.ts` is required, not stylistic. A runtime import of a sibling domain module must carry the
   extension or `node --test` cannot resolve it — the same rule that keeps `@/` type-only down here. */
import { haversineMi, totalGainM, hasClimbData, type TrackPoint } from './run-core.ts';

const M_PER_MI = 1609.344;

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
  /** The encoded shape of the whole bout — or null when there is nothing meaningful to keep. */
  route: string | null;
  /** Total climb in whole metres, or null when the device never reported a usable altitude. */
  climbM: number | null;
}

/**
 * The ONE function the save path calls.
 *
 * Still exported as a single step, and still the only path to a stored route, for the same reason as
 * before the rescission: whatever the storage rule is — a trim yesterday, none today, anything a future
 * amendment decides — it holds because every caller has to come through this line. A second writer is
 * how a rule silently forks.
 *
 * ⚠ `outdoor` is the caller's assertion that this bout was GPS-tracked outdoors. A treadmill bout has
 * no route to store however many points happen to be lying around in the tracker's state.
 */
export function routeForStorage(track: readonly TrackPoint[], outdoor: boolean): StoredRoute {
  // `readonly` in, mutable out: these two only read, but they predate this file and are typed on the
  // array `useRunTracker` actually holds. Widening their signatures would touch the live path for a
  // caller's convenience, which is the wrong direction to pay the cost in.
  const full = track as TrackPoint[];
  const climbM = outdoor && hasClimbData(full) ? Math.round(totalGainM(full)) : null;
  if (!outdoor) return { route: null, climbM: null };

  // Two fixes is the floor for a shape at all — one point is a dot, zero is nothing. There is no
  // distance floor any more: MIN_MAPPABLE_MI was the two 200 m trims meeting in the middle, and it
  // went with them (D-RS-1). A walk to the end of the street now stores the walk.
  if (track.length < 2) return { route: null, climbM };
  return { route: encodePolyline(track), climbM };
}

/** Straight-line distance in metres between two points — for tests and for the map's own bounds. */
export const metresBetween = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number =>
  haversineMi(a, b) * M_PER_MI;
