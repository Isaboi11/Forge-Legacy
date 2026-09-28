/**
 * Course geometry — lengths, positions along a course, and projecting a fix onto it.
 *
 * Everything is done in a LOCAL EQUIRECTANGULAR plane centred on the course's first point: metres east
 * and metres north. Over a 20 mi course that is accurate to well under a metre per kilometre, it makes
 * point-to-segment a few multiplications, and — the reason it is not haversine per segment — the
 * along-course metres a projection returns agree EXACTLY with `cumM`, because both come from the same
 * plane. A follower comparing one against the other can never be off by the model's rounding.
 */

export interface LatLon {
  lat: number;
  lon: number;
}

/** A course point may carry the router's elevation, in metres. */
export interface CoursePoint extends LatLon {
  alt?: number | null;
}

/** Mean Earth radius, the same one `haversineMi` in `run-core.ts` uses (3958.7613 mi). */
const EARTH_M = 6_371_008.8;
const M_PER_DEG = (EARTH_M * Math.PI) / 180;

export interface Plane {
  lat0: number;
  lon0: number;
  /** Metres per degree of longitude at `lat0`. */
  kx: number;
}

export const planeAt = (origin: LatLon): Plane => ({
  lat0: origin.lat,
  lon0: origin.lon,
  kx: M_PER_DEG * Math.cos((origin.lat * Math.PI) / 180),
});

export const toXY = (pl: Plane, p: LatLon): [number, number] => [
  (p.lon - pl.lon0) * pl.kx,
  (p.lat - pl.lat0) * M_PER_DEG,
];

export const fromXY = (pl: Plane, x: number, y: number): LatLon => ({
  lat: pl.lat0 + y / M_PER_DEG,
  lon: pl.lon0 + x / pl.kx,
});

/** Straight-line metres between two nearby points. */
export function distM(a: LatLon, b: LatLon): number {
  const pl = planeAt(a);
  const [x, y] = toXY(pl, b);
  return Math.hypot(x, y);
}

/** The point `m` metres from `p` on compass bearing `bearingDeg` (0 = north, 90 = east). */
export function offsetM(p: LatLon, bearingDeg: number, m: number): LatLon {
  const b = (bearingDeg * Math.PI) / 180;
  return fromXY(planeAt(p), m * Math.sin(b), m * Math.cos(b));
}

// ── a prepared course ───────────────────────────────────────────────────────

export interface Course {
  points: CoursePoint[];
  /** Each point in the course's plane. */
  xy: [number, number][];
  /** Metres from the start to each point. `cumM[0]` is 0. */
  cumM: number[];
  lengthM: number;
  plane: Plane;
}

/** Precompute the plane and the cumulative lengths once, so each fix costs only its own projection. */
export function prepareCourse(points: readonly CoursePoint[]): Course {
  if (points.length === 0) throw new Error('A course needs at least one point.');
  const plane = planeAt(points[0]);
  const xy = points.map((p) => toXY(plane, p));
  const cumM = [0];
  for (let i = 1; i < xy.length; i++) {
    cumM.push(cumM[i - 1] + Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]));
  }
  return { points: points.slice(), xy, cumM, lengthM: cumM[cumM.length - 1], plane };
}

/** Cumulative metres for a bare list of points — the same numbers `prepareCourse` would give. */
export const cumulativeM = (points: readonly LatLon[]): number[] =>
  points.length === 0 ? [] : prepareCourse(points).cumM;

/** Index of the segment containing along-course metre `m` (clamped to the course). */
function segmentAt(course: Course, m: number): number {
  const { cumM } = course;
  if (cumM.length < 2 || m <= 0) return 0;
  if (m >= course.lengthM) return cumM.length - 2;
  let lo = 0;
  let hi = cumM.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cumM[mid] <= m) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The position `m` metres along the course, interpolated — altitude too, when both ends have one. */
export function pointAtM(course: Course, m: number): CoursePoint {
  const { points, cumM } = course;
  if (points.length === 1 || m <= 0) return { ...points[0] };
  if (m >= course.lengthM) return { ...points[points.length - 1] };
  const i = segmentAt(course, m);
  const segLen = cumM[i + 1] - cumM[i];
  const t = segLen === 0 ? 0 : (m - cumM[i]) / segLen;
  const [x0, y0] = course.xy[i];
  const [x1, y1] = course.xy[i + 1];
  const p: CoursePoint = fromXY(course.plane, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
  const a0 = points[i].alt;
  const a1 = points[i + 1].alt;
  if (a0 != null && a1 != null) p.alt = a0 + (a1 - a0) * t;
  return p;
}

// ── projection ──────────────────────────────────────────────────────────────

export interface Projection {
  /** Metres along the course of the nearest point. */
  alongM: number;
  /** Metres from the fix to that point. */
  distM: number;
}

/**
 * The nearest point on each segment that overlaps `[fromM, toM]`, clamped to that window, one
 * candidate per segment. The follower picks among them (`follow.ts`); a bare nearest-point caller uses
 * `projectOnto`.
 */
export function projectionCandidates(
  course: Course,
  p: LatLon,
  fromM = 0,
  toM = Number.POSITIVE_INFINITY,
): Projection[] {
  const lo = Math.max(0, fromM);
  const hi = Math.min(course.lengthM, toM);
  const [px, py] = toXY(course.plane, p);
  if (course.points.length === 1 || course.lengthM === 0) {
    const [x, y] = course.xy[0];
    return [{ alongM: 0, distM: Math.hypot(px - x, py - y) }];
  }
  if (hi < lo) return [];

  const out: Projection[] = [];
  const last = segmentAt(course, hi);
  for (let i = segmentAt(course, lo); i <= last; i++) {
    const [x0, y0] = course.xy[i];
    const [x1, y1] = course.xy[i + 1];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((px - x0) * dx + (py - y0) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    let along = course.cumM[i] + t * Math.sqrt(len2);
    // Clamp to the window: the part of this segment outside it is not a legal answer.
    if (along < lo || along > hi) {
      along = Math.max(lo, Math.min(hi, along));
      const segLen = Math.sqrt(len2);
      t = segLen === 0 ? 0 : (along - course.cumM[i]) / segLen;
    }
    const qx = x0 + dx * t;
    const qy = y0 + dy * t;
    out.push({ alongM: along, distM: Math.hypot(px - qx, py - qy) });
  }
  return out;
}

/** The single nearest point on the course within `[fromM, toM]` (the whole course by default). */
export function projectOnto(course: Course, p: LatLon, fromM = 0, toM = Number.POSITIVE_INFINITY): Projection | null {
  let best: Projection | null = null;
  for (const c of projectionCandidates(course, p, fromM, toM)) {
    if (best == null || c.distM < best.distM) best = c;
  }
  return best;
}
