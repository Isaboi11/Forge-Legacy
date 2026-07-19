/**
 * Active-program accessors — the app-facing entry point that reads REAL converted program
 * definitions (programs/index.ts) through the pure runtime adapter (active-program-core.ts).
 *
 * Replaces the former fabricated `placeholder-data.ts`. Program content is real; only the
 * active-selection + progress cursor are demo defaults until an athlete-progress backend lands.
 */

import type { Program, Workout } from './schema';
import { getProgramDefinitions } from './programs';
import { activeProgramFrom, buildPrograms } from './active-program-core';

/** All programs as runtime records (exactly one active). */
export function getPrograms(): Program[] {
  return buildPrograms(getProgramDefinitions());
}

/** The single active program, or null. */
export function getActiveProgram(): Program | null {
  return activeProgramFrom(getProgramDefinitions());
}

/** A specific catalog program as the active runtime record (for a chosen/recommended program). */
export function getActiveProgramById(id: string): Program | null {
  return activeProgramFrom(getProgramDefinitions(), id);
}

/** Today's session on the active program — what Home resolves artwork for. */
export function getNextWorkout(): Workout | null {
  return getActiveProgram()?.nextWorkout ?? null;
}
