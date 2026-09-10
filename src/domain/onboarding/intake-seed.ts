/**
 * What the starting-point stepper already knows before it asks anything.
 *
 * ══ THE DEFECT THIS CLOSES ══
 *
 * Onboarding collects goal, experience and equipment and writes all three to `profiles`. The stepper on
 * Home then asked for the same three **in different words** — "Get stronger" there, "Get Stronger" here;
 * "Go further" there, "Improve Endurance" here — and wrote its answers only to AsyncStorage. To the
 * athlete that is not a second question, it is the app not having listened the first time.
 *
 * ⚠ IN A `.ts` MODULE BECAUSE `node --test` CANNOT LOAD A `.tsx`. Node type-strips `.ts` and refuses
 *   `.tsx` outright, which is why every component test in this repo scans source as text instead. The
 *   rule that decides where the stepper opens is worth more than a text scan, so it lives here and the
 *   component re-exports it.
 */
import type { HomeLevel } from '../../lib/home-level.ts';
import type { GoalId, EquipmentId } from './derive.ts';
import type { Experience } from '../coach/constraints.ts';

/** This card's own vocabulary for a level. Two names for one fact, kept in one place. */
export const EXPERIENCE_FOR: Record<HomeLevel, Experience> = {
  new: 'beginner',
  training: 'intermediate',
  experienced: 'advanced',
};

/**
 * The same mapping backwards, so onboarding's stored answer can pre-select this card's own tile.
 *
 * ⚠ ONLY EXPERIENCE AND GOALS ARE EVER SEEDED — never equipment, and that is a correctness decision
 *   rather than an omission. The profile stores the COACH's coarse `environment`, where `home` covers
 *   both "a home setup" and "dumbbells only"; mapping it back would have to guess which, and a wrong
 *   pre-selection is worse than the question, because nobody re-reads an answer the app appears to
 *   already know. Equipment stays asked.
 */
export const LEVEL_FOR_EXPERIENCE: Record<Experience, HomeLevel> = {
  beginner: 'new',
  intermediate: 'training',
  advanced: 'experienced',
};

export interface IntakeSeed {
  level: HomeLevel | null;
  goals: readonly GoalId[];
  primaryGoal: GoalId | null;
  equipment: readonly EquipmentId[];
}

/** The first step this athlete has not already answered. */
export function firstUnansweredStep(seed?: IntakeSeed | null): 0 | 1 | 2 {
  if (!seed || !seed.level) return 0;
  if (seed.goals.length === 0) return 1;
  /*
   * ⚠ FULLY SEEDED STILL OPENS ON EQUIPMENT, NOT ON A FINISHED FORM. Equipment is the answer most likely
   * to have gone stale — people move gyms, and a garage gains a rack — so landing on the last step keeps
   * one confirming tap in the flow rather than completing it on the athlete's behalf from stored answers
   * they never revisited. That is how a recommendation ends up built on last year's setup.
   */
  return 2;
}
