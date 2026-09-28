/**
 * A CONFIRMED IMPORT → A TEMPLATE BUILDER DRAFT (PO 2026-09-27: *"on templates I should be able to paste a
 * picture or do text just like for a program"*).
 *
 * The template's twin of `program-import-draft.ts`: the Build a Template paste/photo screen and Holt's chat
 * both confirm an import before the Workout Builder is open, and must produce the same draft. A workout is ONE
 * day, so the read has already been cut to its first day (`fitToScope('day')`), and the preview said which.
 *
 * Unlike the builder's in-screen import (which APPENDS rows to Main), this writes a whole draft — warm-up and
 * cool-down included, filed where the text filed them — because it opens a new template, not an edit.
 *
 * ⚠ RELATIVE, EXTENSIONED IMPORTS so `node --test` can load this file (`workout-import-draft.test.mjs`).
 */
import { toProgramStructure, unmatchedNames, type ParsedWeek } from '../domain/program/import-parse.ts';
import { clampReps, clampSets, newExerciseId } from './program-draft-model.ts';
import type { ProgramExercise } from '@/data/programs-live';
import type { WorkoutDraft } from './workout-builder-draft.ts';

export interface ImportedWorkout {
  draft: WorkoutDraft;
  toast: string;
}

export function workoutDraftFromImport(
  weeks: readonly ParsedWeek[],
  resolveKey: (name: string) => string | undefined,
): ImportedWorkout | null {
  const day = toProgramStructure(weeks, '', resolveKey).days[0];
  if (!day) return null;
  // A cardio bout carries 1 × 0 on purpose (see `toProgramStructure`); clamping it would invent a rep.
  const rows = (list: typeof day.main): ProgramExercise[] =>
    list.map(
      (x) =>
        ({
          ...x,
          id: newExerciseId(),
          ...(x.kind === 'cardio' ? {} : { sets: clampSets(x.sets), reps: clampReps(x.reps) }),
        }) as unknown as ProgramExercise,
    );
  const draft: WorkoutDraft = {
    // The parser names an unheaded day "Day 1"; that is not a name anybody chose.
    name: /^day \d+$/i.test(day.name.trim()) ? '' : day.name.trim(),
    warmup: rows(day.warmup),
    main: rows(day.main),
    cooldown: rows(day.cooldown),
    editId: null,
  };
  const n = draft.warmup.length + draft.main.length + draft.cooldown.length;
  if (n === 0) return null;
  const unmatched = unmatchedNames(weeks, resolveKey);
  return {
    draft,
    toast: unmatched.length
      ? `Imported ${n} · ${unmatched.length} name${unmatched.length === 1 ? '' : 's'} weren’t in the library and kept yours`
      : `Imported ${n} exercise${n === 1 ? '' : 's'} — review and save`,
  };
}
