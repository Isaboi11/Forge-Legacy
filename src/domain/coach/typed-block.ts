/**
 * ══ A PROGRAM TYPED TO HOLT IS A REAL BLOCK (AI Road to 10 Sprint 3, PB-4 · AI audit B-G4) ══
 *
 * Coach-AI-Amendment-003 left this open: *"A typed program is one week written by Holt, repeated for the chosen
 * length (`vary: false`). It has no deload week and no week-to-week rep progression. The rulebook's programs do."*
 * The Sprint 3 plan (PO 11-17) settles it: the week Holt wrote runs through the rulebook's weekly wave and deload.
 *
 *   · Reps climb a rep a week through the RANGE Holt wrote, then wrap — `prescribeReps`'s double progression
 *     (3×8–12 → 3×9–12 → … → 3×12 → 3×8–12). A fixed number is held: "3×10" or "5×5" the athlete asked for
 *     stays exactly that, and so does a hold, a per-set scheme or a cardio bout.
 *   · PAS-D7 picks the deload weeks (`deloadWeeks`, none at 6 weeks or under) and PAS-D8 says what they are:
 *     `[DELOAD]` on the day, the same exercises, sets cut by `deloadSets`, reps at the bottom of the range —
 *     exactly what `author-race.ts` does to the lift days Holt writes into a race block.
 *   · A block of `SHORT_BLOCK_WEEKS` or fewer does not ramp (PAS-A7-D2): the week stands as written.
 *
 * Pure: the written days in, a structure out.
 */
import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';

import { nameForWeek } from './prescribe.ts';
import { deloadSets, deloadWeeks, SHORT_BLOCK_WEEKS } from './rulebook/volume.ts';

/** One written row in week `weekIndex` of a `totalWeeks` block. */
export function rowForWeek(e: ProgramExercise, weekIndex: number, totalWeeks: number, isDeload: boolean): ProgramExercise {
  if (e.kind === 'cardio' || typeof e.sets !== 'number') return e;
  const ranged = typeof e.reps === 'number' && typeof e.repsMax === 'number' && e.repsMax > e.reps && !e.repScheme?.length;
  if (isDeload) {
    const sets = deloadSets(e.sets);
    return {
      ...e,
      sets,
      ...(ranged ? { repsMax: null } : {}),
      ...(e.repScheme?.length ? { repScheme: e.repScheme.slice(0, sets) } : {}),
    };
  }
  if (!ranged || totalWeeks <= SHORT_BLOCK_WEEKS) return e;
  const lo = e.reps as number;
  const hi = e.repsMax as number;
  const reps = lo + (weekIndex % (hi - lo + 1));
  return { ...e, reps, repsMax: reps < hi ? hi : null };
}

/**
 * The block: every week materialised (`vary: true`, like the rulebook's), the deload weeks marked and cut.
 * One week (or a malformed length) is the week as written.
 */
export function typedBlock(name: string, days: readonly ProgramDay[], weeks: number): { structure: ProgramStructure; deloads: number[] } {
  const week = [...days];
  if (!Number.isInteger(weeks) || weeks <= 1) {
    return { structure: { name, weeks: 1, daysPerWeek: week.length, vary: false, days: week, weekPlans: null }, deloads: [] };
  }
  const deloads = deloadWeeks(weeks);
  const weekPlans = Array.from({ length: weeks }, (_, w) => {
    const isDeload = deloads.includes(w);
    return {
      days: week.map((d) =>
        d.main.length === 0
          ? d
          : { ...d, name: nameForWeek(d.name, isDeload), main: d.main.map((e) => rowForWeek(e, w, weeks, isDeload)) },
      ),
    };
  });
  return { structure: { name, weeks, daysPerWeek: week.length, vary: true, days: weekPlans[0].days, weekPlans }, deloads };
}

/** What Holt says about the block's shape, once, under what he wrote. Null when there is nothing to say. */
export function typedBlockLine(structure: ProgramStructure, deloads: readonly number[]): string | null {
  const waves = structure.weeks > SHORT_BLOCK_WEEKS && structure.days.some((d) => d.main.some((e) => rowForWeek(e, 1, structure.weeks, false) !== e));
  const deload = deloads.length ? `Week${deloads.length > 1 ? 's' : ''} ${deloads.map((w) => w + 1).join(' and ')} ${deloads.length > 1 ? 'are' : 'is a'} lighter${deloads.length > 1 ? ' weeks' : ' week'} — fewer sets, so you come back fresh.` : null;
  const wave = waves ? 'Where I gave you a rep range, add a rep each week until you hit the top, then add weight and start over.' : null;
  return [wave, deload].filter(Boolean).join(' ') || null;
}
