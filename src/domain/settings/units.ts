/**
 * Units — the Imperial/Metric preference and the ONE place a stored weight becomes a display string.
 *
 * Weights are stored canonically in POUNDS everywhere (logging, records, save_workout). This never
 * changes: storage stays lb, and the athlete's preference only affects DISPLAY. So there is exactly one
 * conversion, at the edge, and no historical record shifts under a settings toggle.
 *
 * Only weight (load) converts. Distance stays as authored — the design's Units control is about weight
 * ("Best squat 315 lb / 143 kg"), and silently reinterpreting a logged 5-mile run as 5 km would be a
 * data lie, not a display choice.
 */

export type UnitSystem = 'imperial' | 'metric';

export const DEFAULT_UNITS: UnitSystem = 'imperial';

export const isUnitSystem = (x: unknown): x is UnitSystem => x === 'imperial' || x === 'metric';

const LB_PER_KG = 0.45359237;

/** Pounds → the athlete's unit, rounded to a whole number (gyms don't count grams). */
export function displayWeight(lb: number, system: UnitSystem): { value: number; unit: 'lb' | 'kg' } {
  if (system === 'metric') return { value: Math.round(lb * LB_PER_KG), unit: 'kg' };
  return { value: Math.round(lb), unit: 'lb' };
}

/** The unit's short name, for callers that build their own string. */
export const unitLabel = (system: UnitSystem): 'lb' | 'kg' => (system === 'metric' ? 'kg' : 'lb');

/**
 * Pounds → the athlete's unit, UNROUNDED.
 *
 * `displayWeight` rounds to a whole number, which is right for showing a figure and wrong as an
 * INTERMEDIATE step. A percentage-of-max prescription converts the max and then rounds the result to a
 * loadable plate; doing both roundings compounds two errors, and across a ten-rung ramp that drifts the
 * top sets by more than a plate. Convert with this, round exactly once, at the end.
 */
export function weightInExact(lb: number, system: UnitSystem): number {
  return system === 'metric' ? lb * LB_PER_KG : lb;
}

/** "315 lb" / "143 kg", and with reps "315 lb × 3". The canonical load string, unit-aware. */
export function formatLoad(lb: number, system: UnitSystem, reps?: number | null): string {
  const { value, unit } = displayWeight(lb, system);
  const withCommas = value.toLocaleString('en-US');
  return reps != null ? `${withCommas} ${unit} × ${reps}` : `${withCommas} ${unit}`;
}

/**
 * Reinterpret an ALREADY-formatted "<n> <unit>" measure into the athlete's system.
 *
 * The records and activity layers hand back strings whose stored unit is lb/lbs. Rather than re-plumb
 * every one to carry a raw number, this converts the string when — and only when — it is a pounds
 * measure and the athlete prefers metric. Anything else (kg already, a distance, a bare number) is
 * returned untouched, so it can never corrupt a value it doesn't understand.
 */
export function convertMeasure(text: string, system: UnitSystem): string {
  if (system !== 'metric') return text;
  return text.replace(/(\d[\d,]*)\s*lbs?\b/gi, (_m, n: string) => {
    const lb = Number(n.replace(/,/g, ''));
    if (!Number.isFinite(lb)) return _m;
    return `${Math.round(lb * LB_PER_KG).toLocaleString('en-US')} kg`;
  });
}

/** The Preferences live preview — "Best squat" at a fixed 315 lb, shown in the chosen system. */
export const previewSquat = (system: UnitSystem): string => formatLoad(315, system);
