/**
 * Run Course Builder — every tuning number in one place (`Docs/Run-Course-Builder-Plan.md` §6).
 *
 * ⚠ These are FIRST GUESSES, made on synthetic geometry. Before anyone trusts them they have to be
 * confirmed on a device with a real run (§14): prove the gap between on-course and off-course
 * readings, don't assume it. Every one of them is exercised by `__tests__/`, so changing a number
 * tells you which behaviour moved.
 *
 * Pure — no imports at all — so the app, `node --test` and the `course-build` Edge Function read the
 * same file.
 */

export const M_PER_MI = 1609.344;

// ── the goal ────────────────────────────────────────────────────────────────

/** Smallest course the builder offers. Anything shorter is a lap of the block, not a route. */
export const COURSE_MIN_MI = 0.5;
/**
 * Longest course. Matches `LONG_RUN_DISTANCE_CAP_MI` in the endurance rulebook (a test pins the two
 * together); ORS's own round-trip ceiling is 100 km, far above it. Not imported, because this file
 * must stay loadable from the Edge Function without dragging the coach rulebook in behind it.
 */
export const COURSE_MAX_MI = 20;

// ── making a loop (§4) ──────────────────────────────────────────────────────

/** A loop passes within ±5% of the goal… */
export const TOLERANCE_FRACTION = 0.05;
/** …or ±0.1 mi, whichever is larger. Without the floor a 1 mi goal would demand ±80 m of a router. */
export const TOLERANCE_FLOOR_M = 0.1 * M_PER_MI;

/** A missed loop is re-requested at `L × goal / actual`, with that ratio clamped to this range. */
export const RETRY_SCALE_MIN = 0.7;
export const RETRY_SCALE_MAX = 1.4;
/** Retries per option slot, on top of its first call. */
export const MAX_RETRIES_PER_LOOP = 2;
/** Hard ceiling on provider calls for ONE tap of Build or Shuffle. 3 slots × 3 tries would be 9. */
export const MAX_CALLS_PER_BUILD = 8;
/** Options asked for per build. */
export const OPTIONS_WANTED = 3;
/** Below this many passing loops the builder tops up with the closest misses, labelled as such. */
export const MIN_OPTIONS = 2;

/** ORS `round_trip.points`: more points make a rounder loop, which long goals need. */
export const ROUND_TRIP_POINTS_SHORT = 3; // goal under 3 mi
export const ROUND_TRIP_POINTS_MID = 4; // up to 8 mi
export const ROUND_TRIP_POINTS_LONG = 5; // above 8 mi
export const ROUND_TRIP_SHORT_UNDER_MI = 3;
export const ROUND_TRIP_MID_UP_TO_MI = 8;

/**
 * Fallback generator (§4.4): roads wind, so a circle of circumference `goal` routes long. The radius is
 * `goal / (2π × 1.3)`. The retry scaling of the requested length is what tunes it per build.
 */
export const ROAD_WINDING_FACTOR = 1.3;

/** Two loops sharing more than 70% of their 50 m grid cells are the same loop. */
export const DEDUPE_CELL_M = 50;
export const DEDUPE_OVERLAP = 0.7;

// ── turn cues (§4.8) ────────────────────────────────────────────────────────

/** A "continue straight" shorter than this is a kink in the map data, not an instruction. */
export const CUE_DROP_STRAIGHT_UNDER_M = 30;
/** Two turns closer than this are spoken as one: "Left, then right onto Pine". */
export const CUE_MERGE_UNDER_M = 20;

// ── following (§5) ──────────────────────────────────────────────────────────

/** Cues fire this far before the turn. Walking is slower, so the same seconds of warning is less ground. */
export const CUE_LEAD_M = 50;
export const CUE_LEAD_WALK_M = 25;

/**
 * Progress is matched only within this window around the last progress point. Out-and-backs and
 * figure-8s cross themselves; a global nearest-point would put the athlete on the wrong leg.
 */
export const WINDOW_BACK_M = 30;
export const WINDOW_AHEAD_M = 400;
/**
 * The window's far edge is ALSO bounded by how far the athlete could have got since the last match:
 * `REACH_SLACK_M + MAX_MPH[activity] × seconds` (the tracker's own speed cap, from `run-core.ts`). At
 * 1 Hz that is ~50 m, so a figure-8's crossing 400 m further on is simply not a candidate, however the
 * GPS error falls; the full +400 m only opens after a gap in fixes (a locked phone batching them).
 * The slack is GPS error: a fix can land that far ahead of the truth.
 */
export const REACH_SLACK_M = 40;
/** With no match in the window for this long, search the whole course — the athlete rejoined elsewhere. */
export const REJOIN_AFTER_MS = 20_000;
/**
 * Window matches whose distances are within `LEG_TIE_M` of each other are a tie. A tie goes first to
 * whichever is forward of the furthest progress so far, then — between legs more than
 * `LEG_SEPARATION_M` apart along the course — to the smaller jump. On an out-and-back both legs are the
 * same street, so they tie exactly; direction and the jump are what tell them apart (`follow.ts`).
 */
export const LEG_SEPARATION_M = 60;
export const LEG_TIE_M = 10;

/** Off course: further than this on `OFF_COURSE_FIXES` fixes in a row (~10 s at 1 Hz with gaps). */
export const OFF_COURSE_M = 40;
export const OFF_COURSE_FIXES = 3;
/** Back on: nearer than this on `ON_COURSE_FIXES` fixes in a row. The 25–40 m gap is the hysteresis. */
export const ON_COURSE_M = 25;
export const ON_COURSE_FIXES = 2;
/**
 * A fix reporting worse accuracy than this cannot resolve a 40 m question, so it counts neither way.
 * Stricter than the tracker's own `ACCURACY_FLOOR_M` (65 m), which still rejects fixes outright here.
 */
export const COURSE_ACCURACY_GATE_M = 30;
/** At most one off-course alert per this long, across the whole run. */
export const ALERT_MIN_GAP_MS = 60_000;

/** "Course complete" needs this much of the course covered… */
export const FINISH_FRACTION = 0.97;
/** …and the athlete within this of the finish point. */
export const FINISH_RADIUS_M = 40;
