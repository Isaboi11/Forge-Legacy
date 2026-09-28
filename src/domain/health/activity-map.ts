/**
 * Apple Health workout types → Forge workouts, and back (Build 10 · `Docs/Apple-Health-Build-Plan.md` §4).
 *
 * Pure: no HealthKit, no React, no clock of its own. The native wrapper (`src/lib/apple-health.ts`, not
 * built yet) normalises a library sample into plain fields and this module decides what Forge makes of it.
 *
 * ══ WHAT IS IMPORTED ══
 *
 * Distance activities only — run, walk, hike, ride, swim, row, elliptical, stairs. Everything else (strength,
 * HIIT, yoga, cross training …) is NOT imported in v1: a Watch strength session would duplicate the lifts the
 * athlete already logged in Forge and carries no sets. Those are counted, never stored ("N other workouts not
 * imported").
 *
 * ══ TYPE IDENTIFIERS ══
 *
 * The plan names types by their HealthKit case name (`running`, `stairClimbing`). The library may hand the
 * data layer either that name or the raw `HKWorkoutActivityType` number, so both are accepted.
 * ⚠ The raw numbers below are Apple's documented enum values; confirm them against
 *   `@kingstinct/react-native-healthkit@16.0.0`'s `WorkoutActivityType` when the wrapper is written — a
 *   wrong number silently drops a type as "not imported", it can never import the wrong one.
 */

/** Forge's `modality` enum values an import can land on (a subset of the DB enum). */
export type ImportActivity =
  | 'running'
  | 'walking'
  | 'cycling'
  | 'swimming'
  | 'rowing'
  | 'elliptical'
  | 'stair_climber';

export interface MappedType {
  activityType: ImportActivity;
  /** The workout name the row is saved under — the same names `saveActivity` writes. */
  name: string;
}

/** HKWorkoutActivityType raw values for every type §4 names (see the ⚠ in the header). */
const HK_RAW_TO_NAME: Readonly<Record<number, string>> = {
  11: 'crossTraining',
  13: 'cycling',
  16: 'elliptical',
  20: 'functionalStrengthTraining',
  24: 'hiking',
  35: 'rowing',
  37: 'running',
  44: 'stairClimbing',
  46: 'swimming',
  50: 'traditionalStrengthTraining',
  52: 'walking',
  57: 'yoga',
  63: 'highIntensityIntervalTraining',
  68: 'stairs',
  70: 'wheelchairWalkPace',
  71: 'wheelchairRunPace',
  74: 'handCycling',
  3000: 'other',
};

/** The §4 table. Anything absent is "not imported in v1". */
const HK_TO_FORGE: Readonly<Record<string, ImportActivity>> = {
  running: 'running',
  wheelchairRunPace: 'running',
  walking: 'walking',
  wheelchairWalkPace: 'walking',
  hiking: 'walking', // no HIKE enum yet — ActivityType-Expansion is still only a recommendation
  cycling: 'cycling',
  handCycling: 'cycling',
  swimming: 'swimming',
  rowing: 'rowing',
  elliptical: 'elliptical',
  stairClimbing: 'stair_climber',
  stairs: 'stair_climber',
};

const BASE_NAME: Readonly<Record<ImportActivity, string>> = {
  running: 'Run',
  walking: 'Walk',
  cycling: 'Bike Ride',
  swimming: 'Swim',
  rowing: 'Row',
  elliptical: 'Elliptical',
  stair_climber: 'Stair Climber',
};

/** The HealthKit case name for a type identifier, whichever form it arrived in. Unknown numbers → null. */
export function hkTypeName(type: string | number): string | null {
  if (typeof type === 'number') return HK_RAW_TO_NAME[type] ?? null;
  return type.length ? type : null;
}

/** HealthKit type → Forge type + name, or null when the type is not imported in v1. */
export function mapHealthType(type: string | number, indoor: boolean): MappedType | null {
  const name = hkTypeName(type);
  if (name == null) return null;
  const activityType = HK_TO_FORGE[name];
  if (!activityType) return null;
  let label = BASE_NAME[activityType];
  if (name === 'hiking') label = 'Hike';
  else if (indoor && activityType === 'running') label = 'Treadmill Run';
  else if (indoor && activityType === 'cycling') label = 'Indoor Ride';
  return { activityType, name: label };
}

/**
 * Forge `activity_type` → the HealthKit case name for write-back (§3.5). Every Forge modality has one, so a
 * finished strength session still closes rings.
 *
 * `mobility → flexibility` and `other → other` are this module's reading of "§4 in reverse" — the plan only
 * names strength. Both are Apple's own closest types.
 */
const FORGE_TO_HK: Readonly<Record<string, string>> = {
  strength: 'traditionalStrengthTraining',
  running: 'running',
  walking: 'walking',
  cycling: 'cycling',
  swimming: 'swimming',
  rowing: 'rowing',
  elliptical: 'elliptical',
  stair_climber: 'stairClimbing',
  mobility: 'flexibility',
  other: 'other',
};

export function forgeToHealthType(activityType: string): string {
  return FORGE_TO_HK[activityType.toLowerCase()] ?? 'other';
}

// ── §4 filters ───────────────────────────────────────────────────────────────

export const MIN_DURATION_SEC = 60;
export const MAX_DURATION_SEC = 24 * 3600;
export const MAX_DISTANCE_M = 500_000;
/** HealthKit launched with iOS 8 on this day; anything earlier is a bad clock, not history. */
export const HEALTHKIT_EPOCH_ISO = '2014-09-17T00:00:00Z';

export type FilterReason = 'too_short' | 'too_long' | 'too_far' | 'in_future' | 'before_healthkit' | 'bad_date';

/**
 * The §4 sanity filters. Returns why a workout is dropped, or null to keep it. The bounds are inclusive —
 * exactly 60 s, 24 h or 500 km is kept; "shorter than", "longer than" and "over" are strict.
 */
export function filterReason(
  w: { start: string; durationSec: number; distanceMeters: number | null },
  nowMs: number,
): FilterReason | null {
  const startMs = Date.parse(w.start);
  if (!Number.isFinite(startMs)) return 'bad_date';
  if (startMs < Date.parse(HEALTHKIT_EPOCH_ISO)) return 'before_healthkit';
  if (startMs > nowMs) return 'in_future';
  if (!(w.durationSec >= MIN_DURATION_SEC)) return 'too_short'; // NaN lands here too
  if (w.durationSec > MAX_DURATION_SEC) return 'too_long';
  if (w.distanceMeters != null && w.distanceMeters > MAX_DISTANCE_M) return 'too_far';
  return null;
}

// ── units ────────────────────────────────────────────────────────────────────

export const M_PER_MI = 1609.344;

/**
 * Meters → the miles Forge stores (`distance_unit 'mi'`, 3 decimals — the shape `saveActivity` writes and
 * goals/honors/challenges read). No distance, zero or garbage → null: a zero-mile run would otherwise read
 * as a distance PB baseline of nothing.
 */
export function metersToMiles(m: number | null | undefined): number | null {
  if (m == null || !Number.isFinite(m) || m <= 0) return null;
  return Math.round((m / M_PER_MI) * 1000) / 1000;
}

/** Miles (or km / m, as a Forge row may carry) → meters for write-back. */
export function toMeters(distance: number | null | undefined, unit: string | null | undefined): number | null {
  if (distance == null || !Number.isFinite(distance) || distance <= 0) return null;
  switch ((unit ?? 'mi').toLowerCase()) {
    case 'km':
      return distance * 1000;
    case 'm':
      return distance;
    default:
      return distance * M_PER_MI;
  }
}
