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

import type { CardioActivity } from '@/domain/workout/conditioning';
import type { ProgramDay, ProgramExercise, ProgramStructure as BuilderStructure } from '@/data/programs-live';
import type { ExercisePrescription, ProgramBlock, ProgramDefinition, ProgramWorkout } from '@/domain/training/schema';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * One prescription → one athlete-program exercise.
 *
 * ══ WHY THIS IS NOT A FOUR-FIELD LITERAL ANY MORE ══
 *
 * It used to copy `catalogKey`, `name`, `sets`, `reps` and stop. Every richer thing the definition
 * could say — a ladder, a timed effort, circuit membership, an AMRAP cap, a cardio bout — was dropped
 * silently on the way across, which is the worst shape a lossy conversion can take: the program in the
 * catalog and the program the athlete actually runs disagree, and nothing anywhere reports it.
 *
 * Optional keys are OMITTED rather than written as `undefined`, because the result is serialized into
 * `programs.structure` (jsonb) and `{"reps": null}` is not the same statement as no reps at all — the
 * prescription reader distinguishes "the author said nothing" from "the author said zero", and an
 * explicit null would collapse that distinction at the persistence boundary.
 */
function prescriptionToExercise(equipFor?: (catalogKey: string) => string | undefined) {
  return (ex: ExercisePrescription): ProgramExercise => {
    const out: ProgramExercise = {
      catalogKey: ex.catalogKey,
      name: ex.displayName,
      sets: ex.sets,
      reps: ex.reps,
    };

    // Equipment is looked up for real catalog ids only; `cardio:row` is not in `exercises.json`.
    const equip = ex.kind === 'cardio' ? undefined : equipFor?.(ex.catalogKey);
    if (equip) out.equip = equip;

    if (ex.repScheme?.length) out.repScheme = [...ex.repScheme];
    /*
     * The top of a rep range. Dropped here until 2026-08-06, which cost Full Frame all 105 of its
     * ranges — authored as "4 × 10–12" and adopted as "4 × 10". Ignored alongside a ladder, which
     * already states every set's target.
     */
    if (ex.repsMax != null && !ex.repScheme?.length) out.repsMax = ex.repsMax;
    /*
     * Per-leg / per-side. Dropped here until 2026-08-06, across 142 prescriptions in all thirteen
     * programs — the same write-only field as `repsMax` above, and worse in one respect: a missing range
     * shows less than was asked for, while a missing side shows HALF of it as if that were the whole
     * prescription. Unlike a range this rides alongside a ladder happily: "6-6-4-4 per leg" is coherent.
     */
    if (ex.per) out.per = ex.per;
    if (ex.durationSec != null) out.durationSec = ex.durationSec;
    if (ex.optional) out.optional = true;

    // Percentage loading (0111). Same crossing, same rule — a percentage dropped here would turn a
    // peaking block into the same session with the intensity removed, and nothing would report it.
    if (ex.percentOfMax != null) out.percentOfMax = ex.percentOfMax;
    if (ex.percentScheme?.length) out.percentScheme = [...ex.percentScheme];
    if (ex.percentOf) out.percentOf = ex.percentOf;

    if (ex.groupId) {
      out.groupId = ex.groupId;
      if (ex.groupName) out.groupName = ex.groupName;
      if (ex.groupKind) out.groupKind = ex.groupKind;
      if (ex.groupRounds != null) out.groupRounds = ex.groupRounds;
      // Deliberately kept when null — `groupCapSec: null` is how a ROUNDS block says it has no clock,
      // and `groupFieldsOf` on the session side writes the same explicit null.
      if (ex.groupCapSec !== undefined) out.groupCapSec = ex.groupCapSec;
    }

    if (ex.kind === 'cardio') {
      out.kind = 'cardio';
      if (ex.activity) out.activity = ex.activity as CardioActivity;
      if (ex.modality) out.modality = ex.modality;
      // Null survives uncoerced: it prescribes an open bout, and a 0 would read as a target already met.
      if (ex.targetSec !== undefined) out.targetSec = ex.targetSec;
      if (ex.targetMi !== undefined) out.targetMi = ex.targetMi;
    }

    return out;
  };
}

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
  const main: ProgramExercise[] = w.main.map(prescriptionToExercise(equipFor));

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
