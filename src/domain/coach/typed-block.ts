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
import {
  deloadSets,
  deloadWeeks,
  GOAL_CATEGORY,
  SHORT_BLOCK_WEEKS,
  VOLUME_GROUPS,
  weeklyBandFor,
  weeklyMuscleSets,
  type PasCategory,
  type VolumeGroup,
} from './rulebook/volume.ts';

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

/*
 * ══ THE SAME VOLUME BANDS, CHECKED — NOT ENFORCED (PB-4, second half) ══
 *
 * The rulebook HOLDS its own builds to `WEEKLY_SET_BANDS` (PB-2). A typed program is what the athlete asked for
 * (Amendment 003), so it is not rebalanced: an arms day with no legs is what they wanted, and a floor would nag.
 * The CEILING is different — it is the recoverable limit, "held in every week" — so a group a typed week takes past
 * it is said once, plainly, with the offer to trim. Counted PAS-A4-D1 (1 per primary, 0.5 per secondary muscle).
 */
export interface OverCeiling {
  group: VolumeGroup;
  sets: number;
  max: number;
}

type MuscleLookup = (key: string) => { primaryMuscleIds: readonly string[]; muscleIds: readonly string[] } | null | undefined;

export function typedOverCeiling(
  days: readonly ProgramDay[],
  goal: string,
  experience: 'beginner' | 'intermediate' | 'advanced',
  muscles: MuscleLookup,
): OverCeiling[] {
  const category = GOAL_CATEGORY[goal as keyof typeof GOAL_CATEGORY] as PasCategory | undefined;
  if (!category) return [];
  const rows = days.flatMap((d) =>
    d.main.flatMap((e) => {
      const m = e.kind !== 'cardio' && e.catalogKey && typeof e.sets === 'number' ? muscles(e.catalogKey) : null;
      return m ? [{ sets: e.sets as number, primaryMuscleIds: m.primaryMuscleIds, muscleIds: m.muscleIds }] : [];
    }),
  );
  const trained = days.filter((d) => d.main.length > 0).length;
  const sets = weeklyMuscleSets(rows);
  return VOLUME_GROUPS.flatMap((group) => {
    const band = weeklyBandFor(category, experience, group, trained);
    return band && sets[group] > band.max ? [{ group, sets: sets[group], max: band.max }] : [];
  });
}

const GROUP_WORDS: Record<VolumeGroup, string> = {
  chest: 'chest',
  lats: 'lats',
  upper_back: 'upper back',
  front_deltoids: 'front delts',
  lateral_deltoids: 'side delts',
  rear_deltoids: 'rear delts',
  biceps: 'biceps',
  triceps: 'triceps',
  quadriceps: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
};

/** Holt's one line about it, or null. Names at most two groups, the worst first. */
export function overCeilingLine(over: readonly OverCeiling[]): string | null {
  if (!over.length) return null;
  const worst = [...over].sort((a, b) => b.sets - b.max - (a.sets - a.max)).slice(0, 2);
  const parts = worst.map((o) => `about ${Math.round(o.sets)} sets of ${GROUP_WORDS[o.group]}`);
  const max = Math.max(...worst.map((o) => o.max));
  return `Heads up: that's ${parts.join(' and ')} a week — past the ${max} most people recover from. Say the word and I'll trim it.`;
}
