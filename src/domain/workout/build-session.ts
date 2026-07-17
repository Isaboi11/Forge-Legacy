import { getProgramDefinitions } from '@/domain/training/programs';
import { DEMO_ACTIVE_ID } from '@/domain/training/active-program-core';
import { exerciseNameFor } from '@/domain/training/exercise-names';
import type { ActiveSession } from './types';

/**
 * Seed an ActiveSession from the active program's current workout (real prescriptions — sets × reps as
 * the Target column). Until an athlete-progress cursor has a backend, "current" = the active program's
 * first workout (matches the Home resolver's DEMO_ACTIVE_ID / zero-progress cursor). Weights start empty;
 * the athlete logs actuals in W-9.
 */
export function buildActiveSession(): ActiveSession | null {
  const defs = getProgramDefinitions();
  const def = defs.find((d) => d.id === DEMO_ACTIVE_ID) ?? defs[0];
  const pw = def?.blocks[0]?.workouts[0];
  if (!pw) return null;

  const exercises = pw.main.map((ex, i) => ({
    catalogKey: ex.catalogKey,
    name: ex.displayName || exerciseNameFor(ex.catalogKey),
    section: 'main' as const,
    position: i,
    sets: Array.from({ length: ex.sets }, (_, s) => ({
      setIndex: s,
      weight: null,
      targetReps: ex.reps,
      actualReps: null,
      done: false,
    })),
  }));

  return { workoutName: pw.name, activityType: 'strength', startedAt: new Date().toISOString(), exercises };
}
