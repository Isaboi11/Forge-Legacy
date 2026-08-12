/**
 * "LET'S GO UP 10 LBS" — the one thing the coach could not do.
 *
 * ══ WHAT THIS IS AND WHY IT IS NEW ══
 *
 * PO: *"Some people want to be pushed and in the middle of a set be told, let's go up 10 lbs."*
 *
 * `progressionFor` cannot answer that. It reads the athlete's LAST TWO SESSIONS and speaks once, before
 * the first rep — so it can tell you where to start today and nothing about the set you just did. What
 * the PO described is a different question with a different input: **you just put twelve reps into a
 * range that tops out at eight, so the next set should be heavier.**
 *
 * That is also the safest possible place for an intensity dial to reach, and the reason this exists as
 * its own module rather than as a branch inside `progressionFor`. It responds only to work the athlete
 * has already done, in front of you, ten seconds ago. It cannot guess at a ceiling, cannot extrapolate,
 * and has no opinion about anybody's history.
 *
 * ══ THE FIVE GATES, AND WHY EACH ONE IS THERE ══
 *
 *   1. **The profile allows it.** `intraSession` is false for every beginner cell and for `reminders`
 *      and `steady` everywhere — a mid-exercise load change is a judgement about a rep you just watched,
 *      and a novice has not yet earned the reps to judge it by.
 *   2. **A genuine overshoot**, not merely hitting the target. `OVERSHOOT_REPS` past the top of the
 *      range. Beating the range by one is what the range is for; beating it by two is information.
 *   3. **A later set exists.** Instructing somebody on a set they are not going to do is commentary,
 *      and commentary mid-workout is the thing the spec forbids.
 *   4. **The weight can actually move.** Bodyweight and bands progress in reps, not pounds — `incrementFor`
 *      already returns 0 for those and this refuses rather than suggesting a weight nobody can load.
 *   5. **Never downward.** Coming down is `back_off`'s job, it reads two sessions rather than one set,
 *      and it is invariant across every intensity. One bad set is a Tuesday.
 *
 * ⚠ IT NEVER GRADES THE SET. The copy rule lives in `in-workout-voice.ts` and the tables enforce it:
 * every line names the next action, and any assessment is handed to the athlete as a conditional
 * ("if that moved well…"), never asserted by Holt. This module decides WHETHER and HOW MUCH; it does
 * not decide the words.
 *
 * Pure and node-testable: no React, no RN, no storage, no runtime `@` imports.
 */

import { incrementFor, loadableStep } from './progression.ts';
import type { IntensityProfile } from './rulebook/intensity.ts';
import { say, type Register } from './rulebook/in-workout-voice.ts';
import type { Chooser } from './rulebook/voice.ts';

/**
 * How far past the top of the range counts as "there is room".
 *
 * Two, deliberately. A rep range is a target with tolerance — beating the top by one is the range doing
 * its job and says nothing about the load. Two says the weight is no longer the constraint.
 */
export const OVERSHOOT_REPS = 2;

export interface IntraSetInput {
  exerciseName: string;
  /** The catalogue's `movementPattern` — decides the size of the jump. */
  pattern: string;
  experience: 'beginner' | 'intermediate' | 'advanced';
  equipment?: string | null;
  /** In force right now — `profileFor(level, experience)`. */
  profile: IntensityProfile;
  /** The set they just logged. `weight` is 0 for a bodyweight lift, which is a real answer. */
  justLogged: { weight: number | null; actualReps: number | null };
  /** Top of the prescribed range — `repsMax ?? reps`. */
  topReps: number;
  /** Sets after this one that are not yet done. Zero means there is nothing left to instruct. */
  setsRemaining: number;
  /** For the display string — the athlete's own unit label. */
  unit?: string;
}

export interface IntraSetSuggestion {
  /** In pounds, always heavier than what they just did. */
  suggestedWeight: number;
  /** Ready to show. Null is impossible here — a suggestion with no sentence is not offered at all. */
  message: string;
}

/**
 * The bump, or null — and null is the overwhelmingly common answer.
 *
 * Called once per logged set, so it has to be cheap and it has to be quiet. Every gate below returns
 * null rather than a softer suggestion: there is no "weak" version of telling somebody to add weight.
 */
export function intraSetSuggestion(input: IntraSetInput, choose?: Chooser): IntraSetSuggestion | null {
  const { profile, justLogged, topReps, setsRemaining } = input;

  if (!profile.intraSession) return null;
  if (setsRemaining <= 0) return null;

  const reps = justLogged.actualReps;
  const weight = justLogged.weight;
  if (reps == null || weight == null) return null;
  // A bodyweight set progresses in reps and adding pounds to it is a different exercise the athlete
  // chooses, not one the app assigns — the same rule `progressionFor`'s weight branch already holds.
  if (weight <= 0) return null;
  if (loadableStep(input.equipment) === 0) return null;

  if (reps < topReps + OVERSHOOT_REPS) return null;

  const step = incrementFor(input.pattern, input.experience, input.equipment, profile.stepScale);
  if (step <= 0) return null;

  const suggestedWeight = weight + step;
  const message = say(
    'intra_up',
    profile.register as Register,
    { lift: input.exerciseName, weight: `${suggestedWeight}${input.unit ? ` ${input.unit}` : ''}` },
    choose,
  );
  // No sentence, no suggestion. A number with nothing said about it is not coaching.
  if (!message) return null;

  return { suggestedWeight, message };
}
