/**
 * "HOW DID THAT FEEL?" — asked once, the first time an athlete ever meets a movement.
 *
 * ══ THE PROBLEM ══
 *
 * No prescription in Forge carries a weight, and that is correct: the logger prefills from what the
 * athlete lifted last time, which beats any number a program could guess. But a first-timer has no last
 * time. `startingLoadLine` now tells them how to pick one — empty bar, lightest pair you could do fifteen
 * with — and a guess made that way is deliberately conservative, so their first working set is very often
 * too light. Nothing then corrects it until the next session, two or three days later.
 *
 * ══ ⚠ THIS IS NOT `intraSetSuggestion`, AND THE DIFFERENCE IS THE WHOLE REASON IT EXISTS ══
 *
 * That module reads the reps you just put in against the range you were given, and it is switched OFF for
 * every beginner cell of the intensity matrix — a deliberate, documented call: *"a mid-exercise load
 * change is a judgement about a rep you just watched, and a novice has not yet earned the reps to judge
 * it by."* That decision stands and nothing here changes it.
 *
 * What this asks is a different question with a different author. It does not ask the athlete to judge a
 * rep, or infer anything from one; it asks how the set FELT and takes them at their word. Perceived
 * effort is the one thing a beginner can report accurately from their very first set, and asking is what
 * a coach does when somebody picks up a weight for the first time.
 *
 * Kept narrow on purpose, so it cannot become the thing that decision rejected:
 *
 *   1. **Beginners only.** Everyone else has `intraSetSuggestion`, history, and their own judgement.
 *   2. **Only a movement they have NEVER done.** Once there is history the logger prefills from it and
 *      this has nothing to add.
 *   3. **Only after the first set of it**, and only while later sets remain to be changed.
 *   4. **Once.** Answering retires it for that movement for good.
 *   5. **Only where weight can move at all** — a band or a bodyweight lift progresses in reps, and
 *      offering to change a number nobody can load is noise.
 *
 * Pure and node-testable: no React, no RN, no storage, no runtime `@` imports.
 */

import { incrementFor, loadableStep } from './progression.ts';

/** What the athlete says about the set they just did. Their words, not an inference. */
export type EffortAnswer = 'easy' | 'right' | 'heavy';

export interface FirstSetAsk {
  experience: 'beginner' | 'intermediate' | 'advanced';
  /** The catalogue's `movementPattern` — decides the size of the change. */
  pattern: string;
  equipment?: string | null;
  /** Has this athlete ever logged this lift before? */
  hasHistory: boolean;
  /** The weight on the set they just finished. Null/0 = bodyweight, which cannot be adjusted. */
  weight: number | null;
  /** Sets of this exercise still to do. Nothing to adjust when there are none. */
  setsRemaining: number;
  /** Already answered for this movement in this session. */
  answered: boolean;
}

/** Whether the question is worth putting on screen at all. All five gates, in one place. */
export function shouldAskEffort(a: FirstSetAsk): boolean {
  if (a.answered) return false;
  if (a.experience !== 'beginner') return false;
  if (a.hasHistory) return false;
  if (a.setsRemaining <= 0) return false;
  if (a.weight == null || a.weight <= 0) return false;
  return loadableStep(a.equipment) > 0;
}

/**
 * The weight for the remaining sets, or null to leave them exactly as they are.
 *
 * ⚠ THIS ONE MAY GO DOWN, WHERE `intraSetSuggestion` MAY NOT, AND THE ASYMMETRY IS DELIBERATE.
 *
 * That module refuses to reduce load because it is INFERRING from a single set, and one bad set is a
 * Tuesday — coming down off an inference needs two sessions, which is `back_off`'s job. Here the athlete
 * has said in as many words that the weight was too heavy. Declining to act on that would be the app
 * overruling a person about their own body, on the first set they have ever done, which is both wrong and
 * the fastest way to hurt somebody.
 *
 * Never below zero, and never below one step: taking the bar to nothing would be a worse answer than
 * leaving it alone.
 */
export function weightAfterEffort(a: FirstSetAsk, answer: EffortAnswer): number | null {
  if (answer === 'right') return null;
  const current = a.weight ?? 0;
  const step = incrementFor(a.pattern, a.experience, a.equipment);
  if (step <= 0) return null;
  if (answer === 'easy') return current + step;
  const down = current - step;
  // A first working set that is already at the lightest loadable weight has nowhere to go — say so by
  // changing nothing, rather than by proposing zero.
  return down >= loadableStep(a.equipment) ? down : null;
}

/**
 * What Holt says once they have answered. Names the change, never grades the athlete.
 *
 * ⚠ WEIGHTS ARE WRITTEN IN POUNDS AND CARRY " lb", WHICH IS NOT COSMETIC.
 *
 * Everything downstream re-expresses the finished string through `convertMeasure`, which finds numbers by
 * the unit written beside them — its pattern is literally `(\d…)\s*lbs?\b`. A bare figure is therefore
 * invisible to it and reaches a metric athlete as raw pounds wearing no name at all. That is the exact
 * defect the PO reported once already ("Holt is talking in KG and I have it set to lbs"), from the other
 * direction, and the fix was to make every weight the coach speaks go through the same converter.
 */
export function effortReply(answer: EffortAnswer, next: number | null): string {
  if (answer === 'right') return 'Good — stay there for the rest of them.';
  if (answer === 'easy') {
    return next == null
      ? "Good. Add a little next time — there's nothing left to put on this one."
      : `Right, put it up to ${next} lb for the next one.`;
  }
  return next == null
    ? "Then that's your set — stay there and let it get easier. Nothing to come off."
    : `Take it down to ${next} lb and finish the rest there. Nobody's watching.`;
}
