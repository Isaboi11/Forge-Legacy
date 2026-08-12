/**
 * WHAT THE COACH HAS TO SAY RIGHT NOW — one line, chosen from everything he could say.
 *
 * ══ WHY THIS IS A DECISION AND NOT A LAYOUT ══
 *
 * The Active Workout had three things the coach could tell you and drew two of them as separate cards
 * stacked inside the exercise hero: `THE PLAN SAYS` (the author's written cue) and `HOLT SAYS`
 * (`progressionFor`'s sentence about your last two sessions). **The hero auto-collapses the first time
 * a set resolves**, so both went away after set one and stayed away — while a medallion sat in the
 * corner saying nothing at all.
 *
 * Moving them onto the coin means they can no longer be stacked: a bubble is one line. So something has
 * to choose, and choosing is a rule rather than a style, which is why it lives here and is tested.
 *
 * ══ THE ORDER, AND THE REASON FOR IT ══
 *
 * Most recent wins, because the athlete is standing in front of a bar and the newest fact is the one
 * that changes what they do next:
 *
 *   1. `live` — about the set they just finished. Ten seconds old.
 *   2. `progression` — about their last session on this lift. Days old.
 *   3. `planCue` — what the author wrote about this movement. Timeless.
 *
 * A timeless technique cue is not less valuable, but it is still true in thirty seconds and the other
 * two are not. Nothing is lost by ranking it third; it surfaces whenever the two above are silent,
 * which on a first-time lift or a quiet setting is most of the session.
 *
 * ⚠ NULL IS A REAL ANSWER and the caller must render the mark alone for it. A bubble containing nothing
 * is worse than no bubble: it makes the coach look like he is thinking.
 *
 * Pure and node-testable: no React, no RN, no storage, no runtime `@` imports.
 */

/** Which of the three the line came from. The caller may attribute; it does not have to. */
export type CoachLineSource = 'live' | 'progression' | 'plan';

export interface CoachLineInput {
  /**
   * A line about the set just logged — the mid-set nudge. Null whenever there is nothing to say, which
   * is most sets and every set at the quietest intensity.
   */
  live?: string | null;
  /** `progressionFor().message` for the exercise on screen. */
  progression?: string | null;
  /** The author's `coachNote` on this exercise — "brace before you unrack", "feel it in your legs". */
  planCue?: string | null;
}

export interface CoachLine {
  text: string;
  source: CoachLineSource;
}

const clean = (s: string | null | undefined): string | null => s?.trim() || null;

/**
 * The one thing the coin says, or null for the mark alone.
 *
 * Whitespace-only is nothing, not something — an author who opened the cue field and thought better of
 * it must not put an empty bubble on the athlete's screen for the whole exercise.
 */
export function coachLine(input: CoachLineInput): CoachLine | null {
  const live = clean(input.live);
  if (live) return { text: live, source: 'live' };

  const progression = clean(input.progression);
  if (progression) return { text: progression, source: 'progression' };

  const planCue = clean(input.planCue);
  if (planCue) return { text: planCue, source: 'plan' };

  return null;
}
