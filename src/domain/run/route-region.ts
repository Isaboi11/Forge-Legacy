/**
 * Where to point the map so a route fits in it.
 *
 * Pure — no React, no map library — because the native map and the web fallback have to agree about
 * what "the whole route, comfortably framed" means. Two answers to that is how the same run ends up
 * looking like two different runs depending on which platform the athlete opened it on.
 *
 * A `Region` is what `react-native-maps` calls a viewport: a centre and a span. The library has
 * `fitToCoordinates`, and it is used for the interactive map — but it only works AFTER layout, so the
 * FIRST paint needs a region computed here or the map opens on the middle of the Pacific and pans.
 */

import { decodePolyline } from './route-privacy.ts';
import type { TrackPoint } from './run-core.ts';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Region extends LatLng {
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * The smallest span the map will open at, in degrees. ~250 m of latitude.
 *
 * Without a floor, a short route — or one whose points happen to sit almost on top of each other —
 * produces a delta near zero and the map opens zoomed to individual paving slabs. The athlete then has
 * to pinch out to work out where they are, which is the opposite of what a map is for.
 */
export const MIN_DELTA_DEG = 0.0025;

/** How much empty room to leave around the route. 1.0 would run the line into the edges of the frame. */
export const REGION_PADDING = 1.35;

/**
 * Fit a set of points into a region.
 *
 * ⚠ LONGITUDE IS NOT SCALED HERE, AND THAT IS NOT THE SAME DECISION `routePath` MADE. The SVG fitter
 * multiplies longitude by cos(latitude) because it is drawing on a flat box and has to correct for the
 * fact that a degree of longitude is shorter than a degree of latitude away from the equator. A map
 * projection already does that: `longitudeDelta` is expressed in degrees of longitude and the map
 * renders it correctly for the latitude it is showing. Correcting twice would frame every route too
 * tightly east-to-west, increasingly so the further from the equator the athlete lives.
 */
export function regionFor(points: readonly LatLng[]): Region | null {
  if (points.length === 0) return null;

  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const p of points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLon) minLon = p.longitude;
    if (p.longitude > maxLon) maxLon = p.longitude;
  }

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(MIN_DELTA_DEG, (maxLat - minLat) * REGION_PADDING),
    longitudeDelta: Math.max(MIN_DELTA_DEG, (maxLon - minLon) * REGION_PADDING),
  };
}

/** A live track — what the map draws while the run is happening. */
export const trackToLatLng = (track: readonly TrackPoint[]): LatLng[] =>
  track.map((p) => ({ latitude: p.lat, longitude: p.lon }));

/**
 * A stored route — what the map draws afterwards.
 *
 * ⚠ WHOLE FOR NEW SAVES, TRIMMED FOREVER FOR OLD ONES. Runs saved while D-RTE-1 governed (0162 →
 * 2026-08-26) had their first and last 200 m removed before writing, and that data never existed in
 * the database to recover. `Route-Sharing-Amendment-001` D-RS-1 rescinded the trim, so everything
 * saved since stores the full track. Nothing marks which era a row is from — a drawing surface must
 * treat "the line stops short of the distance" as normal data, which `ROUTE_STORED_NOTE` words for.
 */
export const storedRouteToLatLng = (encoded: string | null | undefined): LatLng[] =>
  encoded ? decodePolyline(encoded).map((p) => ({ latitude: p.lat, longitude: p.lon })) : [];

/**
 * What the athlete is told beside a STORED route.
 *
 * ⚠ IT CAN NO LONGER PROMISE COMPLETENESS IN EITHER DIRECTION. A run saved after the rescission is
 * whole; one saved before it is short 200 m at each end, permanently, with nothing on the row saying
 * which is which. "As it was saved" is the sentence that is true of both — it explains an old map
 * stopping short of the door without accusing a new one of hiding anything.
 */
export const ROUTE_STORED_NOTE = 'Your route as it was saved.';

/** What the athlete is told when the line is provably the whole run — drawn from the live track. */
export const WHOLE_RUN_NOTE = 'The whole run — start to finish.';
