import { getProgramDefinitions } from '@/domain/training/programs';
import { DEMO_ACTIVE_ID } from '@/domain/training/active-program-core';
import { exerciseNameFor } from '@/domain/training/exercise-names';
import { dayLabel, plannedDays, trainingDays } from '@/domain/program/progress-core';
import type { ProgramStructure } from '@/data/programs-live';
import type { ActiveSession, SessionExercise, WorkoutSectionKind } from './types';

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

/**
 * Seed an ActiveSession from one day of an athlete-authored program, carrying the prescribed sets × reps
 * as the Target column and stamping `programId` so the Finish commit attributes the workout back (0018).
 * Warm-up / main / cool-down keep their sections and their authored order.
 */
export function buildSessionFromProgram(
  programId: string,
  structure: ProgramStructure,
  weekIndex: number,
  dayIndex: number,
): ActiveSession | null {
  const days = trainingDays(plannedDays(structure, weekIndex));
  const day = days[dayIndex];
  if (!day) return null;

  const sections: { key: WorkoutSectionKind; items: typeof day.main }[] = [
    { key: 'warmup', items: day.warmup },
    { key: 'main', items: day.main },
    { key: 'cooldown', items: day.cooldown },
  ];

  const exercises: SessionExercise[] = [];
  for (const sec of sections) {
    for (const ex of sec.items) {
      exercises.push({
        catalogKey: ex.catalogKey,
        name: ex.name,
        section: sec.key,
        position: exercises.length,
        sets: Array.from({ length: Math.max(1, ex.sets ?? 3) }, (_, s) => ({
          setIndex: s,
          weight: null,
          targetReps: ex.reps ?? 10,
          actualReps: null,
          done: false,
        })),
      });
    }
  }
  if (!exercises.length) return null;

  return {
    workoutName: dayLabel(day, dayIndex),
    activityType: 'strength',
    startedAt: new Date().toISOString(),
    exercises,
    programId,
  };
}
