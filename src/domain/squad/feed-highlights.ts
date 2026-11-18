/**
 * What makes ONE post stand out from the next (PO design review, 2026-11-18).
 *
 * PO: the squad page "feels flat". Five posts in a row had the same shape — name, WORKOUT, title, three
 * numbers — and nothing said which session mattered. These are the rules for the two things that now do:
 *
 *   · `prHighlight` — the line under a workout's numbers when it set a record: "New best · Bench Press,
 *     225 lb × 5". Read from the snapshot the post was shared with (`RecapExercise.isPR`), so it says what
 *     was true when it was posted and never invents one.
 *   · `isShortWords` — a post that is only a few words ("@Moses Ruiz In da house!!!") is drawn larger,
 *     because at caption size it was the smallest thing on the screen and read as a footnote.
 */

import { displayWeight, type UnitSystem } from '../settings/units.ts';

export interface HighlightExercise {
  name: string;
  /** "225 lb × 5", "BW × 12" — canonical pounds, as `workout-complete-live` writes it. Null on cardio. */
  topSet: string | null;
  isPR: boolean;
}

/** "225 lb × 5" in the VIEWER's unit. The snapshot is pounds, like every stored weight in this app. */
export function topSetIn(topSet: string, units: UnitSystem): string {
  const m = /^\s*(\d+(?:\.\d+)?)\s*lb\s*×\s*(\d+)\s*$/.exec(topSet);
  if (!m) return topSet.trim();
  const w = displayWeight(Number(m[1]), units);
  return `${w.value} ${w.unit} × ${m[2]}`;
}

/**
 * The record line, or null when the session set none.
 *
 * One record names it; several name the first and count the rest — a list of four lifts would be a second
 * stat strip, and the post already has one.
 */
export function prHighlight(exercises: readonly HighlightExercise[], units: UnitSystem): string | null {
  const prs = exercises.filter((e) => e.isPR && e.name.trim());
  if (!prs.length) return null;
  const first = prs[0];
  const what = first.topSet ? `${first.name.trim()}, ${topSetIn(first.topSet, units)}` : first.name.trim();
  if (prs.length === 1) return `New best · ${what}`;
  return `${prs.length} new bests · ${what} and ${prs.length - 1 === 1 ? '1 more' : `${prs.length - 1} more`}`;
}

/** At most this many characters, on at most three lines, reads as a shout rather than a caption. */
export const SHORT_WORDS_MAX = 120;

export function isShortWords(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  return t.length > 0 && t.length <= SHORT_WORDS_MAX && t.split('\n').length <= 3;
}
