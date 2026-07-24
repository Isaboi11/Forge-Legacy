/**
 * Converting a built-in catalog program into the athlete's own program record.
 *
 * A `ProgramDefinition` is static content shipped in the app — it has no id in the database, no
 * lifecycle, and nothing for a logged workout to attach to. That is why a catalog program's progress
 * bar was a hardcoded zero: there was no row to count against. Adoption fixes that by writing the
 * definition out as a real `programs` row the first time the athlete starts it, after which it behaves
 * exactly like a program they built — one code path, not two.
 *
 * Pure (type-only imports) so it runs under `node --test`.
 */

import type { ProgramDay, ProgramExercise, ProgramStructure as BuilderStructure } from '@/data/programs-live';
import type { ProgramBlock, ProgramDefinition, ProgramWorkout } from '@/domain/training/schema';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** The block covering a given 1-based week; falls back to the last block a long program runs past. */
export function blockForWeek(blocks: readonly ProgramBlock[], week: number): ProgramBlock | null {
  if (blocks.length === 0) return null;
  return blocks.find((b) => week >= b.weekStart && week <= b.weekEnd) ?? blocks[blocks.length - 1];
}

function daysFromBlock(
  block: ProgramBlock,
  equipFor?: (catalogKey: string) => string | undefined,
  resolveKey?: (name: string) => string | undefined,
): ProgramDay[] {
  return block.workouts.map((w, i) => workoutToDay(w, i, equipFor, resolveKey));
}

function workoutToDay(
  w: ProgramWorkout,
  i: number,
  equipFor?: (catalogKey: string) => string | undefined,
  resolveKey?: (name: string) => string | undefined,
): ProgramDay {
  const main: ProgramExercise[] = w.main.map((ex) => ({
    catalogKey: ex.catalogKey,
    name: ex.displayName,
    sets: ex.sets,
    reps: ex.reps,
    equip: equipFor?.(ex.catalogKey),
  }));

  /**
   * Warm-up items carry a `name` ("Bodyweight Squat") and a separate `detail` ("10 reps"), with `text`
   * being the two joined. Using `text` as the exercise name put the prescription INSIDE the name, so a
   * logged warm-up read "Bodyweight Squat — 10 reps" and never resolved back to the catalog — which is
   * why warm-ups showed no exercise detail. Take the name; parse a rep count out of the detail when it
   * is one, and otherwise leave sets/reps undefined rather than inventing them.
   */
  const warmup: ProgramExercise[] = w.warmup.map((item) => {
    const reps = /^(\d+)\s*reps?$/i.exec((item.detail ?? '').trim());
    return {
      name: item.name || item.text,
      catalogKey: resolveKey?.(item.name || item.text),
      ...(reps ? { sets: 1, reps: Number(reps[1]) } : {}),
    };
  });

  return { letter: LETTERS[i] ?? String(i + 1), name: w.name, warmup, main, cooldown: [] };
}

/**
 * Definition → the builder's structure.
 *
 * A single-block program becomes a repeating week. A multi-block program (its prescriptions change at
 * "Weeks 3–4") becomes per-week plans, because collapsing it to one repeating week would quietly throw
 * the progression away — the whole point of those blocks.
 */
export function structureFromDefinition(
  def: ProgramDefinition,
  equipFor?: (catalogKey: string) => string | undefined,
  /** Name → catalog id, so warm-ups authored as prose still resolve to a real exercise. */
  resolveKey?: (name: string) => string | undefined,
): BuilderStructure {
  const weeks = Math.max(1, def.durationWeeks || 1);
  const blocks = def.blocks ?? [];
  const first = blocks[0] ?? null;
  const daysPerWeek = Math.max(1, def.frequencyPerWeek || first?.workouts.length || 1);

  if (blocks.length <= 1) {
    return {
      name: def.name,
      weeks,
      daysPerWeek,
      vary: false,
      days: first ? daysFromBlock(first, equipFor, resolveKey) : [],
      weekPlans: null,
    };
  }

  return {
    name: def.name,
    weeks,
    daysPerWeek,
    vary: true,
    days: first ? daysFromBlock(first, equipFor, resolveKey) : [],
    weekPlans: Array.from({ length: weeks }, (_, i) => {
      const b = blockForWeek(blocks, i + 1);
      return { days: b ? daysFromBlock(b, equipFor, resolveKey) : [] };
    }),
  };
}
