/**
 * WHAT A SET NEEDS BEFORE IT CAN COUNT AS DONE (workout-07, QA 09-26).
 *
 * A green check used to mean "tapped", not "logged": a set typed as 0 reps, and a barbell set with the
 * weight left blank, both went green and counted toward the session's sets, its volume and its seal.
 * Neither says anything true about what the athlete lifted.
 *
 *   • REPS — an untimed set must carry a rep count above zero. Zero reps is a missed attempt, not a set;
 *     a to-failure set left blank has not said what it got yet.
 *   • WEIGHT — only on equipment that cannot be lifted empty (a bar, a dumbbell, a stack). Blank there is
 *     UNANSWERED, not bodyweight (`set-load.ts`: "a warm-up with an empty bar is NOT a bodyweight set").
 *     A typed 0 is the athlete saying BW, and is accepted. Bodyweight, bands and unknown equipment
 *     (custom exercises) never ask.
 *
 * A timed set (`targetSec`) records a duration, not reps, and is never gated here.
 */

/** Catalogue `equipmentId`s that always carry a load. Ids, never labels. */
const NEEDS_LOAD = new Set([
  'barbell',
  'ez_bar',
  'dumbbell',
  'kettlebell',
  'cable',
  'selectorized_machine',
  'smith_machine',
  'sled',
  'medicine_ball',
  'sandbag',
  'strongman_implement',
]);

export interface GateSet {
  weight: number | null;
  actualReps: number | null;
  targetSec?: number | null;
}

/** The field the athlete still has to fill, or null when the set can be completed. */
export function completionGap(set: GateSet, equipment: string | null | undefined): 'weight' | 'reps' | null {
  if (set.targetSec != null) return null;
  if (equipment != null && NEEDS_LOAD.has(equipment) && set.weight == null) return 'weight';
  if (set.actualReps == null || set.actualReps <= 0) return 'reps';
  return null;
}

/** The one line shown when a set cannot be completed yet. */
export function completionGapMessage(gap: 'weight' | 'reps'): string {
  return gap === 'weight' ? 'Enter the weight to log this set' : 'Enter the reps you did to log this set';
}
