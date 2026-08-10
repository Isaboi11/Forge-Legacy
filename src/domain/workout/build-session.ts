import { getProgramDefinitions } from '@/domain/training/programs';
import { DEMO_ACTIVE_ID } from '@/domain/training/active-program-core';
import { exerciseNameFor } from '@/domain/training/exercise-names';
import { perSideFor } from './per-side-core.ts';
import { dayLabel, plannedDays, trainingDays } from '@/domain/program/progress-core';
import { groupFieldsOf, sessionSetsFor } from './session-core';
import type { ProgramStructure } from '@/data/programs-live';
import type { LoadContext } from '@/domain/program/percent-max';
import type { ActiveSession, SessionExercise, WorkoutSectionKind } from './types';
import { EMPTY_RESULT, activityFromKey, cardioKey, deriveName, type Modality } from './conditioning';

/**
 * Seed an ActiveSession from the active program's current workout (real prescriptions — sets × reps as
 * the Target column). Until an athlete-progress cursor has a backend, "current" = the active program's
 * first workout (matches the Home resolver's DEMO_ACTIVE_ID / zero-progress cursor). Weights start empty;
 * the athlete logs actuals in W-9.
 */
/**
 * ⚠ RETIRED — do not reach for this.
 *
 * It builds a session out of the shipped catalog's DEMO program, which is a claim about the athlete's
 * training that they never made. It was the Active Workout screen's fallback, so any upstream failure —
 * including a launch payload silently dropped by a stale guard — dropped them into a convincing workout
 * they had never chosen. The logger now starts EMPTY instead, which is the honest answer to "you opened
 * the logger with nothing selected".
 *
 * Kept only because the program definitions it reads are the same ones `buildSessionFromProgram` uses,
 * and deleting it outright is a separate retirement pass.
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
  /**
   * The run's frozen maxes, in the athlete's display unit — what a percentage prescription resolves
   * against. Absent for every program that does not prescribe percentages, which is all of them today.
   */
  load?: LoadContext,
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
      // A prescribed run, walk or ride carries through as a cardio block with ONE bout — sets of reps
      // are meaningless for it, and building three of them would ask the athlete to run the distance
      // three times. The prescription rides along, `null` included: null means the program set no
      // target, and coercing it to 0 would turn "run what you've got" into a permanently-met goal.
      // Circuit membership rides along on every exercise, loose or grouped, so the logger can rebuild
      // the same blocks the program describes without a second source of truth about where they end.
      const group = groupFieldsOf(ex);

      if (ex.kind === 'cardio') {
        const activity = activityFromKey(ex.catalogKey) ?? 'run';
        const modality: Modality = ex.modality === 'indoor' ? 'indoor' : 'outdoor';
        exercises.push({
          catalogKey: cardioKey(activity),
          name: deriveName(activity, modality),
          kind: 'cardio',
          activity,
          modality,
          targetMi: ex.targetMi ?? null,
          targetPaceSec: ex.targetPaceSec ?? null,
          targetSpdMph: ex.targetSpdMph ?? null,
          targetSec: ex.targetSec ?? null,
          cardio: { ...EMPTY_RESULT },
          ...(ex.coachNote ? { coachNote: ex.coachNote } : {}),
          ...group,
          section: sec.key,
          position: exercises.length,
          sets: [{ setIndex: 0, weight: null, targetReps: 0, actualReps: null, done: false, durationSec: null, distanceMi: null }],
        });
        continue;
      }

      // The ladder survives the crossing — see `sessionSetsFor`, which owns that rule and is tested.
      // So does the SIDE: without it a per-leg prescription reaches the logger as half of itself,
      // looking complete. `ex.per` is null for every item that never had one.
      exercises.push({
        catalogKey: ex.catalogKey,
        name: ex.name,
        /* The author's cue — "4 seconds down, then push up". Omitted rather than nulled when absent, so
           a session written before this reads identically. */
        ...(ex.coachNote ? { coachNote: ex.coachNote } : {}),
        ...group,
        /* The program's answer wins; otherwise derive it from the name. Only a program could set this
           before, so every freestyle session — and every add-as-you-go exercise — had no side label at
           all, however obviously single-sided the movement was. */
        ...((ex.per ?? perSideFor(ex.name)) ? { per: ex.per ?? perSideFor(ex.name)! } : {}),
        section: sec.key,
        position: exercises.length,
        sets: sessionSetsFor(ex, load),
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
