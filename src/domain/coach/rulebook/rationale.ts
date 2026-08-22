/**
 * Why Holt built it that way.
 *
 * ══ THE REVEAL IS WHERE THE WHOLE THING PAYS OFF ══
 *
 * An athlete answers six questions and gets a list of exercises. Without a sentence explaining the shape,
 * that list is indistinguishable from a generator's output — the work Holt did is invisible, and so is the
 * reason to trust it. One short paragraph turns "here are some exercises" into "here is what I decided and
 * why", which is the entire difference between a tool and a coach.
 *
 * ══ IT IS DERIVED, NOT WRITTEN ══
 *
 * Every sentence is assembled from the decisions actually taken — the split, the frequency, the deload,
 * the session length. Nothing is generic filler, and nothing claims a reason that was not real. If the
 * rulebook changes what it does, this changes what it says, because it reads the same inputs.
 *
 * Kept short on purpose. A wall of justification reads as defensiveness.
 */

import type { Goal } from '../constraints.ts';
import type { SplitStyle } from './skeletons.ts';

const FREQUENCY: Record<number, string> = {
  2: 'Two days means every session has to earn its place, so both are full-body and nothing gets skipped.',
  3: 'Three days is the sweet spot for hitting everything twice over a fortnight without living in the gym.',
  4: 'Four days gives us enough frequency to train every major muscle group twice a week without cramming a session.',
  5: 'Five days lets each session stay focused — you get volume without any one of them dragging.',
  6: 'Six days keeps each session short and sharp. The trade is that recovery is on you.',
};

const GOAL_EMPHASIS: Partial<Record<Goal, string>> = {
  strength: 'Compounds lead every day while you are freshest, and the rep ranges stay low enough that the weight is the point.',
  muscle: 'Moderate reps and a bit more volume per muscle — the range where most growth actually happens.',
  /* ⚠ REWRITTEN WITH THE SPLIT IT DESCRIBES (2026-08-21). This said "full-body sessions", which was
     true of the old table and is now false at three days and up — and a rationale that describes a
     different week than the one on the card is worse than none. See `WEIGHT_LOSS_SPLITS`. */
  weight_loss: 'Lifting leads and conditioning finishes. Training against a real load is what holds on to the muscle while the weight comes off — the cardio at the end is on top of that, not instead of it.',
  conditioning: 'Movements first, then a cardio block you have earned rather than started with.',
  mobility: 'Held positions rather than reps. Short and frequent beats long and occasional here.',
};

const SPLIT_NOTE: Partial<Record<SplitStyle, string>> = {
  full_body: 'Everything each session, so missing a day costs you less.',
  upper_lower: 'Upper and lower alternating, which is the cleanest way to hit everything twice a week.',
  ppl: 'Push, pull and legs kept apart so nothing is fatigued before you get to it.',
  body_part: 'One area a session, trained hard — the way you said you like to train.',
};

export interface RationaleInput {
  goal: Goal;
  daysPerWeek: number;
  sessionMinutes: number;
  weeks: number;
  splitStyle?: SplitStyle | null;
  deloadWeeks: readonly number[];
  /** Set when Holt overrode the requested split; his reason replaces the split note. */
  restructuredBecause?: string;
}

/** Two or three sentences, in Holt's voice. */
export function rationaleFor(input: RationaleInput): string {
  const parts: string[] = [];

  if (input.restructuredBecause) parts.push(input.restructuredBecause);
  else if (input.splitStyle && SPLIT_NOTE[input.splitStyle]) parts.push(SPLIT_NOTE[input.splitStyle]!);

  parts.push(FREQUENCY[input.daysPerWeek] ?? '');

  const emphasis = GOAL_EMPHASIS[input.goal];
  if (emphasis) parts.push(emphasis);

  if (input.deloadWeeks.length > 0) {
    const weeks = input.deloadWeeks.map((w) => w + 1);
    parts.push(
      weeks.length === 1
        ? `Week ${weeks[0]} backs off deliberately — that is where the previous weeks turn into progress.`
        : `Weeks ${weeks.join(' and ')} back off deliberately, so the hard weeks actually stick.`,
    );
  }

  return parts.filter(Boolean).join(' ');
}
