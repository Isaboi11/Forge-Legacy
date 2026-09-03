/**
 * How a logged set's load is written, everywhere it is written.
 *
 * ══ ⚠ ZERO IS NEVER SHOWN. IT SAYS "BW". ══
 *
 * PO: *"I don't want 0. I want it to be BW. That's the point of it. More mental than anything.
 * Seeing 0 can be discouraging."*
 *
 * This is not a formatting preference, it is the reason the field accepts zero at all. An athlete who
 * finishes a set of dips has not lifted nothing — they have lifted themselves, and the app writing
 * `0 × 8` beside that is the app telling them the set was worth nothing. `BW` states the same fact and
 * means the opposite.
 *
 * ══ THREE VALUES, NOT TWO ══
 *
 *     0      BODYWEIGHT   — the athlete said this set carried no added load. "BW".
 *     null   UNANSWERED   — nothing was entered. An em dash. A warm-up with an empty bar is NOT a
 *                           bodyweight set, and the app must not decide that it was.
 *     n      a load       — the number.
 *
 * ══ ⚠ TWO UNIT DOMAINS, AND MIXING THEM HALVES A METRIC ATHLETE'S LIFT ══
 *
 * A weight reaching a screen is in one of two states, and they are not interchangeable:
 *
 *   • ALREADY DISPLAYED — what the athlete typed into the live session. `workout.tsx` stores the
 *     number as entered, so a metric athlete's `100` is already 100 kg. Converting it again is the bug.
 *   • CANONICAL POUNDS — anything read back from `workout_sets` / `personal_records`, which hold lb
 *     since `canonicalizeWeights`. These MUST be converted or a metric athlete is shown 225 for a lift
 *     they logged as 102.
 *
 * So there are two functions, not one with a flag. A caller has to know which kind of number it holds,
 * and naming them apart is what forces that.
 *
 * ══ ⚠ WHY THIS IS NOT `formatLoad` ══
 *
 * `formatLoad` in `domain/settings/units.ts` formats ANY load — including the athlete's own body weight
 * on the Body screen. Teaching it that zero means "BW" would be right for a set and wrong for a
 * measurement. This rule belongs to a SET, so it lives with sets.
 *
 * ══ ⚠ AND WHY IT IS NOT A LOCAL HELPER ══
 *
 * It was one — `weightText`, private inside `workout.tsx`. Every other screen showing a set had to
 * remember the rule on its own, and the moment one forgot, `live-workout/[id].tsx` rendered a
 * bodyweight set as `0 lb` to the person watching. A rule that must be re-remembered per screen is a
 * rule that will be missed. This is the only copy.
 */

import { displayWeight, unitLabel, type UnitSystem } from '../settings/units.ts';

/** The athlete entered nothing. Kept as a constant so the two meanings cannot drift apart. */
export const UNANSWERED = '—';

/** The bodyweight token. One spelling, so searching for it finds every place it can appear. */
export const BODYWEIGHT = 'BW';

/**
 * The rule, applied to a number that is ALREADY in the athlete's units — the live session's own sets.
 * No unit label: the Weight column's header carries it.
 */
export function setWeightLabel(shown: number | null | undefined): string {
  if (shown === 0) return BODYWEIGHT;
  if (shown == null) return UNANSWERED;
  return String(shown);
}

/** The rule plus conversion, for a weight stored in canonical pounds. */
export function setWeightLabelLb(lb: number | null | undefined, units: UnitSystem): string {
  if (lb === 0) return BODYWEIGHT;
  if (lb == null) return UNANSWERED;
  return String(displayWeight(lb, units).value);
}

/**
 * A set on one line from canonical pounds: `BW × 8`, `225 lb × 8`, or just the load with no reps.
 *
 * ⚠ BW CARRIES NO UNIT. "BW lb" is not a thing anyone says — the unit exists to qualify a number, and
 * here there is no number to qualify.
 */
export function setLoadLineLb(lb: number | null | undefined, reps: number | null | undefined, units: UnitSystem): string {
  const load = lb === 0
    ? BODYWEIGHT
    : lb == null
      ? UNANSWERED
      : `${displayWeight(lb, units).value.toLocaleString('en-US')} ${unitLabel(units)}`;
  return reps != null ? `${load} × ${reps}` : load;
}
