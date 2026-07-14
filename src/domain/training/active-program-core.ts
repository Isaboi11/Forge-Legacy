/**
 * Runtime adapter (pure) — maps authored `ProgramDefinition`s (real content from the
 * `.docx` conversion) into the runtime `Program`/`Workout` shape the resolver + Home read.
 *
 * IMPORTANT: the program CONTENT here is real. What is still a demo default (until an
 * athlete-progress backend exists) is only the SELECTION of which program is "active" and
 * the progress cursor — NOT fabricated program data. `DEMO_ACTIVE_ID` and a zero-progress
 * "start at Workout A" cursor are the placeholder-free stand-ins for that runtime state.
 *
 * Pure (no JSON import) so both Metro and `node --test` consume it. The Metro wrapper
 * (active-program.ts) supplies the definitions from programs/index.ts.
 */

import type { Program, ProgramDefinition, ProgramWorkout, Split, Workout } from './schema';

const SPLIT_LABEL: Record<Split, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  lower: 'Lower',
  full_body: 'Full Body',
  core: 'Core',
  conditioning: 'Conditioning',
};

/** Demo-selected active program (a real, LOCKED program) until athlete state has a backend. */
export const DEMO_ACTIVE_ID = 'strength-foundation-i-3day';

/** Map an authored workout → the runtime `Workout` the resolver reads (split-driven). */
export function programWorkoutToWorkout(pw: ProgramWorkout): Workout {
  return {
    name: pw.name,
    focus: SPLIT_LABEL[pw.split],
    modality: pw.modality,
    split: pw.split,
    exerciseCount: pw.main.length,
    // Only catalog-linked main work becomes session exercises; freeform warm-ups are excluded.
    exercises: pw.main.map((ex) => ({ catalogKey: ex.catalogKey, workingSets: ex.sets, section: 'main' as const })),
  };
}

/** Map an authored program → runtime `Program`. When active, cursor = first workout (fresh start). */
export function definitionToProgram(def: ProgramDefinition, active: boolean): Program {
  const firstBlock = def.blocks[0];
  const firstWorkout = firstBlock?.workouts[0];
  return {
    id: def.id,
    name: def.name,
    family: def.family,
    difficulty: def.difficulty ?? 'Beginner',
    theme: def.theme,
    structure: def.structure,
    schedule: (firstBlock?.workouts ?? []).map((w) => ({ name: w.name, focus: SPLIT_LABEL[w.split] })),
    progress: active ? { completed: 0, total: def.durationWeeks * def.frequencyPerWeek } : undefined,
    nextWorkout: active && firstWorkout ? programWorkoutToWorkout(firstWorkout) : undefined,
    state: active ? 'active' : 'preview',
  };
}

/** All programs as runtime records, exactly one marked active (the one-active invariant). */
export function buildPrograms(defs: readonly ProgramDefinition[], activeId: string = DEMO_ACTIVE_ID): Program[] {
  const hasActive = defs.some((d) => d.id === activeId);
  const effectiveActive = hasActive ? activeId : defs[0]?.id;
  return defs.map((d) => definitionToProgram(d, d.id === effectiveActive));
}

/** The single active program, or null. */
export function activeProgramFrom(defs: readonly ProgramDefinition[], activeId: string = DEMO_ACTIVE_ID): Program | null {
  const def = defs.find((d) => d.id === activeId) ?? defs[0];
  return def ? definitionToProgram(def, true) : null;
}
