/**
 * A REGION of a body part the athlete asked to lead with — "upper chest".
 *
 * ══ THE BUG THIS EXISTS FOR ══
 *
 * PO, 2026-09-30: *"I told him specifically I wanted to workout upper chest… He did not give me any upper
 * chest… so he didn't really listen to me."* The session was Barbell Bench, Dumbbell Bench, Machine Chest
 * Press — three flat presses — because a body part is selected on `primaryMuscleIds`, and the catalogue
 * has one `chest`. The 74 chest movements all carry it; nothing in the data says which of them is an
 * incline. "Upper chest" had nowhere to land, so it was dropped without a word.
 *
 * ══ WHY IT IS A LIST OF KEYS ══
 *
 * The same reason `preferences.ts` is one. Which movements train the upper chest is knowledge the
 * catalogue's fields cannot express, and filtering on the word "Incline" would let the ranker's tail
 * decide the order — difficulty, breadth, then ALPHABETICAL — which is how a session comes to open with
 * whatever sorts first. Each list runs best-first across equipment tiers, exactly as a preference list
 * does, and the day builder takes the first entries the athlete can actually do.
 *
 * ⚠ AN EMPHASIS LEADS THE PART; IT DOES NOT REPLACE IT. See `EMPHASIS_SHARE`.
 *
 * ⚠ `incline-push-up` IS NOT HERE ON PURPOSE. Hands raised is the EASIER push-up and loads the lower
 * chest; feet raised — the catalogue's `decline-push-up` — is the one that reaches the upper. The names
 * point the opposite way to the barbell lifts, and a filter on the word would have got both wrong.
 *
 * Every key is asserted to exist and to train the part it is filed under (`day-asked.test.mjs`).
 */

import type { BodyPart } from '../day.ts';

export type EmphasisId = 'upper_chest' | 'lower_chest';

export interface Emphasis {
  /** The body part this is a region of. An emphasis on a part the day does not train does nothing. */
  part: BodyPart;
  /** How Holt says it. */
  label: string;
  /** Catalogue keys, best first across equipment tiers. */
  keys: readonly string[];
}

export const EMPHASIS: Record<EmphasisId, Emphasis> = {
  upper_chest: {
    part: 'chest',
    label: 'upper chest',
    keys: [
      'barbell-incline-bench-press',
      'dumbbell-incline-bench-press',
      'low-to-high-cable-fly',
      'machine-incline-chest-press',
      'plate-loaded-incline-chest-press',
      'smith-machine-incline-bench-press',
      'cable-incline-chest-press',
      'dumbbell-incline-chest-fly',
      'single-arm-dumbbell-incline-press',
      'decline-push-up',
    ],
  },
  lower_chest: {
    part: 'chest',
    label: 'lower chest',
    keys: [
      'barbell-decline-bench-press',
      'dumbbell-decline-bench-press',
      'high-to-low-cable-fly',
      'parallel-bar-dip',
      'machine-decline-chest-press',
      'smith-machine-decline-bench-press',
      'cable-decline-chest-press',
      'dumbbell-decline-chest-fly',
      'incline-push-up',
    ],
  },
};

export const EMPHASIS_IDS: readonly EmphasisId[] = ['upper_chest', 'lower_chest'];

/**
 * How much of the part's work the emphasis takes: three movements of four, two of three.
 *
 * ⚠ NOT ALL OF IT. "I want to develop my upper chest" is a priority, not a request to stop pressing flat —
 * a chest day of four inclines is the same angle four times, which is the failure `roundRobin` exists to
 * prevent, arrived at from the other side. The emphasised movements lead and take the majority; one
 * standard movement stays in.
 */
export const EMPHASIS_SHARE = 0.6;
