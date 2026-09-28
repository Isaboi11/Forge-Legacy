/**
 * Picking loops — which router answers count, how to ask again, and when to stop (§4.2–4.5, §4.7).
 *
 * ORS treats `round_trip.length` as a preference, not a promise: ask for 5 mi and you can get 4.1 or
 * 6.3. So a build is a small loop of its own — ask for 3, keep the ones inside tolerance, re-ask for the
 * misses at a corrected length — and it has to STOP, because every call spends shared quota. The whole
 * of that loop is `buildCourses`, with the router injected, so the Edge Function runs it against ORS
 * (or the waypoint fallback) and `node --test` runs it against a fake with no network at all.
 */

import { CLIMB_THRESHOLD_M } from '../run-core.ts';
import {
  DEDUPE_CELL_M,
  DEDUPE_OVERLAP,
  MAX_CALLS_PER_BUILD,
  MAX_RETRIES_PER_LOOP,
  MIN_OPTIONS,
  M_PER_MI,
  OPTIONS_WANTED,
  RETRY_SCALE_MAX,
  RETRY_SCALE_MIN,
  ROUND_TRIP_MID_UP_TO_MI,
  ROUND_TRIP_POINTS_LONG,
  ROUND_TRIP_POINTS_MID,
  ROUND_TRIP_POINTS_SHORT,
  ROUND_TRIP_SHORT_UNDER_MI,
  TOLERANCE_FLOOR_M,
  TOLERANCE_FRACTION,
} from './constants.ts';
import { courseGainLoss } from './elevation.ts';
import { planeAt, prepareCourse, pointAtM, toXY, type CoursePoint, type LatLon, type Plane } from './geometry.ts';

// ── tolerance and retry ─────────────────────────────────────────────────────

/** How far from the goal a loop may be and still pass: ±5%, or ±0.1 mi when that is larger. */
export const toleranceM = (goalM: number): number => Math.max(goalM * TOLERANCE_FRACTION, TOLERANCE_FLOOR_M);

export const withinTolerance = (actualM: number, goalM: number): boolean =>
  Math.abs(actualM - goalM) <= toleranceM(goalM);

/**
 * The length to ask for next time: `L × goal / actual`, the ratio clamped to 0.7–1.4.
 *
 * The clamp is what stops one freak answer (a 0.3 mi loop from a router that hit water) from asking for
 * a 30 mi loop next. A zero or missing actual gets the maximum stretch, not a division by zero.
 */
export function scaledLength(requestedM: number, goalM: number, actualM: number): number {
  const ratio = actualM > 0 ? goalM / actualM : RETRY_SCALE_MAX;
  return requestedM * Math.max(RETRY_SCALE_MIN, Math.min(RETRY_SCALE_MAX, ratio));
}

/** ORS `round_trip.points`: 3 under 3 mi, 4 up to 8 mi, 5 above. */
export function roundTripPoints(goalM: number): number {
  const mi = goalM / M_PER_MI;
  if (mi < ROUND_TRIP_SHORT_UNDER_MI) return ROUND_TRIP_POINTS_SHORT;
  if (mi <= ROUND_TRIP_MID_UP_TO_MI) return ROUND_TRIP_POINTS_MID;
  return ROUND_TRIP_POINTS_LONG;
}

// ── near-duplicates ─────────────────────────────────────────────────────────

/**
 * The 50 m grid cells a path passes through. The path is sampled every half-cell so a long straight
 * segment claims every cell it crosses, not just the two at its ends. `plane` must be shared by the
 * loops being compared — cells from two different origins would never line up.
 */
export function gridCells(points: readonly LatLon[], plane: Plane, cellM: number = DEDUPE_CELL_M): Set<string> {
  const cells = new Set<string>();
  if (points.length === 0) return cells;
  const course = prepareCourse(points);
  const step = cellM / 2;
  for (let m = 0; m <= course.lengthM + step; m += step) {
    const [x, y] = toXY(plane, pointAtM(course, Math.min(m, course.lengthM)));
    // Offset by half a cell: the plane's origin is the loop's START, and a street running out of the
    // start would otherwise sit exactly on a cell boundary, flipping cells on rounding error.
    cells.add(`${Math.floor(x / cellM + 0.5)},${Math.floor(y / cellM + 0.5)}`);
  }
  return cells;
}

/** Shared cells as a fraction of the SMALLER loop's cells — a short loop inside a long one is a duplicate. */
export function cellOverlap(a: readonly LatLon[], b: readonly LatLon[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const plane = planeAt(a[0]);
  const ca = gridCells(a, plane);
  const cb = gridCells(b, plane);
  let shared = 0;
  for (const c of ca) if (cb.has(c)) shared++;
  return shared / Math.min(ca.size, cb.size);
}

export const isNearDuplicate = (a: readonly LatLon[], b: readonly LatLon[]): boolean =>
  cellOverlap(a, b) > DEDUPE_OVERLAP;

// ── ranking ─────────────────────────────────────────────────────────────────

export type CourseTag = 'flattest' | 'hilliest' | 'most-varied';

/**
 * Tags by climb: lowest gain is Flattest, highest is Hilliest, anything between is Most varied.
 * If every option climbs within `CLIMB_THRESHOLD_M` of every other, NONE is tagged — calling one of three
 * flat loops "Hilliest" would be a claim the numbers can't make.
 */
export function rankTags(gainsM: readonly number[]): (CourseTag | null)[] {
  if (gainsM.length < 2) return gainsM.map(() => null);
  const lo = Math.min(...gainsM);
  const hi = Math.max(...gainsM);
  if (hi - lo < CLIMB_THRESHOLD_M) return gainsM.map(() => null);
  const loIdx = gainsM.indexOf(lo);
  const hiIdx = gainsM.indexOf(hi);
  return gainsM.map((_, i) => (i === loIdx ? 'flattest' : i === hiIdx ? 'hilliest' : 'most-varied'));
}

// ── the build ───────────────────────────────────────────────────────────────

/** What the injected router returns for one loop. */
export interface LoopResult {
  points: CoursePoint[];
  /** The router's own length for the loop, metres. */
  distanceM: number;
  /** When the router already summed it; otherwise computed from `points[].alt`. */
  gainM?: number;
}

export interface BuiltOption<T extends LoopResult> {
  loop: T;
  seed: number;
  /** The `length` that produced it — differs from the goal after a retry. */
  requestedM: number;
  /** False only for a "closest we found" top-up. The UI must say so; never pad the number. */
  withinTolerance: boolean;
  gainM: number;
  tag: CourseTag | null;
}

export interface BuildResult<T extends LoopResult> {
  /** Sorted flattest first. Empty means the provider gave nothing usable — try the fallback generator. */
  options: BuiltOption<T>[];
  /** Provider calls spent, never more than `maxCalls`. */
  calls: number;
}

export interface BuildInput<T extends LoopResult> {
  goalM: number;
  /** One router call. Null or a throw is a miss; either way it has spent a call. */
  fetchLoop: (lengthM: number, seed: number) => Promise<T | null>;
  /** A fresh seed per call, so Shuffle and retries never repeat a loop. Injected so tests are deterministic. */
  nextSeed: () => number;
  wanted?: number;
  maxCalls?: number;
}

interface Slot {
  requestedM: number;
  tries: number;
  done: boolean;
}

/**
 * Ask for `wanted` loops in parallel; re-ask each miss at a scaled length with a new seed, at most
 * `MAX_RETRIES_PER_LOOP` times; never exceed `maxCalls` in total. A passing loop that is a near-duplicate
 * of one already kept counts as a miss and is re-asked at the SAME length (its length was fine).
 * If fewer than `MIN_OPTIONS` pass, the closest misses are returned too, flagged `withinTolerance: false`.
 */
export async function buildCourses<T extends LoopResult>(input: BuildInput<T>): Promise<BuildResult<T>> {
  const { goalM, fetchLoop, nextSeed } = input;
  const wanted = input.wanted ?? OPTIONS_WANTED;
  const maxCalls = input.maxCalls ?? MAX_CALLS_PER_BUILD;
  const slots: Slot[] = Array.from({ length: wanted }, () => ({ requestedM: goalM, tries: 0, done: false }));
  const kept: { loop: T; seed: number; requestedM: number }[] = [];
  const misses: { loop: T; seed: number; requestedM: number }[] = [];
  let calls = 0;

  while (calls < maxCalls) {
    const round = slots.filter((s) => !s.done).slice(0, maxCalls - calls);
    if (round.length === 0) break;
    // Seeds and the call count are taken synchronously, so the budget can't be overspent by the await.
    const asks = round.map((slot) => {
      const seed = nextSeed();
      calls++;
      slot.tries++;
      return { slot, seed, requestedM: slot.requestedM };
    });
    const answers = await Promise.all(
      asks.map(async (a) => {
        try {
          return await fetchLoop(a.requestedM, a.seed);
        } catch {
          return null;
        }
      }),
    );

    asks.forEach((a, i) => {
      const loop = answers[i];
      if (loop != null && loop.points.length > 1) {
        const entry = { loop, seed: a.seed, requestedM: a.requestedM };
        if (withinTolerance(loop.distanceM, goalM)) {
          if (!kept.some((k) => isNearDuplicate(k.loop.points, loop.points))) {
            kept.push(entry);
            a.slot.done = true;
            return;
          }
        } else {
          misses.push(entry);
          a.slot.requestedM = scaledLength(a.requestedM, goalM, loop.distanceM);
        }
      }
      if (a.slot.tries > MAX_RETRIES_PER_LOOP) a.slot.done = true;
    });
  }

  const chosen = kept.map((k) => ({ ...k, withinTolerance: true }));
  if (chosen.length < MIN_OPTIONS) {
    const byCloseness = misses
      .slice()
      .sort((a, b) => Math.abs(a.loop.distanceM - goalM) - Math.abs(b.loop.distanceM - goalM));
    for (const m of byCloseness) {
      if (chosen.length >= MIN_OPTIONS) break;
      if (chosen.some((c) => isNearDuplicate(c.loop.points, m.loop.points))) continue;
      chosen.push({ ...m, withinTolerance: false });
    }
  }

  const gains = chosen.map((c) => c.loop.gainM ?? courseGainLoss(c.loop.points).gainM);
  const tags = rankTags(gains);
  const options: BuiltOption<T>[] = chosen
    .map((c, i) => ({ ...c, gainM: gains[i], tag: tags[i] }))
    .sort((a, b) => a.gainM - b.gainM);
  return { options, calls };
}
