/**
 * Units — the Imperial/Metric preference and the ONE place a stored weight becomes a display string.
 *
 * Weights are stored canonically in POUNDS everywhere (logging, records, save_workout). This never
 * changes: storage stays lb, and the athlete's preference only affects DISPLAY. So there is exactly one
 * conversion, at the edge, and no historical record shifts under a settings toggle.
 *
 * ══ DISTANCE CONVERTS TOO. THIS COMMENT USED TO SAY OTHERWISE, AND IT WAS THE OUTLIER ══
 *
 * It read: "Only weight (load) converts. Distance stays as authored … silently reinterpreting a logged
 * 5-mile run as 5 km would be a data lie, not a display choice."
 *
 * The objection is right and the conclusion did not follow from it. **Reinterpreting** is taking the
 * number 5 and writing "km" after it — that is a lie, and nothing here does it. **Converting** turns
 * 5 miles into 8.05 km, which is the same run said in the athlete's own units. Forbidding the second
 * because the first would be wrong left the app showing miles to athletes who asked for kilometres.
 *
 * Everything else in the codebase already treats distance the way it treats load:
 *
 *   · `0096_conditioning_legs.sql:37` — miles are "the canonical stored unit, converted only for display"
 *   · `0139_units_to_imperial.sql:10-14` — "`units` is the single switch … `distanceUnitFor()` reads it
 *     for km-vs-mi (and metres-vs-yards in a pool) … pace and speed follow the same value"
 *   · `distanceUnitFor()` (`domain/workout/conditioning.ts`) exists and has seven-plus call sites
 *   · `CardioBlockCard` and the program builder already convert, in both directions
 *
 * So the rule, for load AND distance: **storage is canonical (lb, mi), conversion happens once at the
 * edge, and the value and its unit always move together.** A displayed figure may change with the
 * setting; a stored one never does. Relabeling a number without converting it remains forbidden — that
 * is the real content of the warning this replaced.
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

/**
 * The athlete's typed figure → canonical POUNDS. The inverse of `weightInExact`, and the one place a
 * logged weight becomes storable.
 *
 * ══ WHY THIS HAS TO EXIST ══
 *
 * An athlete types into their OWN system: on metric, "100" means 100 kg. Until now the logger stored
 * that number verbatim and stamped `weight_unit: 'lb'` on it, so a metric athlete's 100 kg went into the
 * database as the number 100 labelled pounds — kilos wearing a pounds label. Every doc in the project
 * says pounds are canonical (`0096:37`, `0139`, this file's own header); storage was the one place that
 * wasn't.
 *
 * That made two things wrong at once, and they pull in opposite directions:
 *   · a screen that CONVERTS a stored figure shows 45% of the truth (the Weekly Review bug);
 *   · a screen that shows it RAW is accidentally right for metric and wrong for nobody — which is why
 *     most of the app looked fine and the ones that had been "fixed" to convert were the broken ones.
 *
 * ⚠ UNROUNDED, like `weightInExact` and for the same reason: 100 kg is 220.462 lb, and rounding here
 *   then rounding again on display walks the athlete's own number away from them across a round trip.
 *   Round once, at the edge, on the way out.
 *
 * ⚠ IDENTITY ON IMPERIAL. `toCanonicalLb(x, 'imperial') === x` exactly, which is what makes this change
 *   safe to land incrementally: every athlete is on imperial today (0139), so nothing moves until the
 *   first one chooses Kgs.
 */
export function toCanonicalLb(value: number, system: UnitSystem): number {
  return system === 'metric' ? value / LB_PER_KG : value;
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
  /*
   * ⚠ THE FRACTION IS PART OF THE NUMBER. The pattern was `(\d[\d,]*)\s*lbs?\b` — no decimal branch — so
   * on "227.5 lb" it could not match at "227" (the next character is "."), backtracked to the fractional
   * digit, and converted THAT:
   *
   *     "Heaviest was Bench Press at 227.5 lb."  ->  "…227.2 kg."     (5 lb → 2.2 kg, spliced back in)
   *     "2.5 lb"  ->  "2.2 kg"          "45.5 lbs"  ->  "45.2 kg"
   *
   * Not a rounding error — a plausible-looking number roughly 2.2× wrong, which is worse than an obvious
   * one because nothing about it reads as broken. Half-plates make it routine, not exotic: `0085` uses
   * "227.5" as its own worked example of a PR.
   *
   * `(?:\.\d+)?` takes the whole number before converting. Rounding stays at the end, on the kg result.
   */
  return text.replace(/(\d[\d,]*(?:\.\d+)?)\s*lbs?\b/gi, (_m, n: string) => {
    const lb = Number(n.replace(/,/g, ''));
    if (!Number.isFinite(lb)) return _m;
    return `${Math.round(lb * LB_PER_KG).toLocaleString('en-US')} kg`;
  });
}

/** The Preferences live preview — "Best squat" at a fixed 315 lb, shown in the chosen system. */
export const previewSquat = (system: UnitSystem): string => formatLoad(315, system);
