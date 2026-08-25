/**
 * Translucent washes — the two colour families that make up most of this app's raw literals.
 *
 * ══ WHY A FUNCTION AND NOT MORE TOKENS ══
 *
 * Sweeping the 1,133 raw colour literals turned up the same two shapes over and over, at dozens of
 * different alphas: `rgba(255,255,255,α)` for a faint lift on a dark surface, and a bronze at `α` for
 * a warm tint. `CoachChatSheet` alone carries 48 of them across six alphas. Naming each alpha would
 * mean thirty-odd tokens whose only difference is a number — a palette nobody could hold in their
 * head, where the next author invents a thirty-first rather than hunting for the right one.
 *
 * The alpha is the AUTHOR'S choice and belongs at the call site. What has to change with the theme is
 * only the three channels underneath it, and that is exactly what these two functions own.
 *
 * ⚠ CALLING A FUNCTION INSIDE `StyleSheet.create` IS SAFE HERE, and it is worth saying why, because
 *   the whole Paper mechanism rests on the opposite fact. Module-scope stylesheets are evaluated once,
 *   at import — and `theme-choice` has ALREADY resolved by then (see `foundation.ts`). So these read
 *   the correct palette on the first and only evaluation. What they must never do is change later,
 *   and they cannot: `IS_PAPER` is a module constant.
 */

import { IS_PAPER } from './foundation.ts';

/** Forge lifts a dark surface with white; Paper deepens a light one with its own ink. */
const NEUTRAL = IS_PAPER ? '35,31,26' : '255,255,255';

/**
 * The bronze under a warm tint.
 *
 * ⚠ Forge's washes were authored against THREE slightly different bronzes — `198,156,100`,
 *   `186,146,92` and `181,138,97` — depending on which screen and which week. They were always meant
 *   to be one colour; the drift is what happens when a value is retyped instead of imported. They
 *   collapse to the middle one here, which is `--fl-bronze-metal-border`'s hue and within two points
 *   of the other two. Nothing on screen moves perceptibly, and the family finally has one answer.
 */
const BRONZE = IS_PAPER ? '164,122,61' : '186,146,92';

/**
 * Paper's bronze washes are stronger than Forge's at the same nominal alpha.
 *
 * ⚠ NOT A GUESS — it is the design's own ratio. `--fl-bronze-tint` is `0.05` in Forge and `0.085` in
 *   Paper for what is the same wash, and 0.085/0.05 = 1.7. The reason is contrast room: there is far
 *   less distance between bronze and cream than between bronze and near-black, so an identical alpha
 *   that reads as a warm tint on iron reads as nothing at all on paper.
 */
const PAPER_BRONZE_GAIN = 1.7;

/** A faint neutral lift/deepen on a surface. `wash(0.032)` is the most common value in the app. */
export function wash(alpha: number): string {
  return `rgba(${NEUTRAL},${round(alpha)})`;
}

/** A warm bronze tint. The alpha is the author's intent; the gain keeps that intent true on paper. */
export function bronzeWash(alpha: number): string {
  const a = IS_PAPER ? Math.min(alpha * PAPER_BRONZE_GAIN, 1) : alpha;
  return `rgba(${BRONZE},${round(a)})`;
}

/** Keep float noise out of the emitted CSS — `0.05 * 1.7` is `0.08500000000000001`. */
function round(a: number): number {
  return Math.round(a * 10000) / 10000;
}

/**
 * The halo behind text that sits directly on background ARTWORK.
 *
 * ⚠ THIS IS THE ONE THE PO CALLED A *"weird smear"*, and the cause is the same role-token flip that
 *   made the Workouts toggle go dark: these titles are `cream100`/`gray400` — light ink on Forge, DARK
 *   ink on Paper — and their halo was hardcoded near-black. Light text with a dark halo reads as a
 *   glow; DARK text with a dark halo reads as a smudge.
 *
 * ⚠ NOT EVERY `textShadow` IN THE APP BELONGS HERE, and swapping them all would be the wrong fix. A
 *   dark halo is still correct under WHITE lettering on a bronze button, and under text laid over a
 *   PHOTO, because neither of those grounds changes with the theme. Only text whose own colour flips —
 *   text over the background plate — needs its halo to flip with it.
 */
export function textHalo(alpha: number): string {
  return IS_PAPER ? `rgba(255,252,246,${round(alpha)})` : `rgba(0,0,0,${round(alpha)})`;
}
