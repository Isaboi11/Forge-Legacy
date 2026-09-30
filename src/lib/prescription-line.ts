/**
 * A BUILDER ROW'S PRESCRIPTION, IN ONE LINE — and what happens to it when the athlete re-counts the row by hand.
 *
 * A card imported into Build a Program or Build a Template (PO 2026-09-30) carries more than a stepper can show:
 * "5-5-5-3-3-3-1-1-1 reps · 60-87% · rest 2:00". The builders' steppers still show sets × reps; this line under
 * the name says the rest, in the same words the squad preview uses (`postedLines`), so nothing the card said is
 * hidden and nothing is said two ways.
 *
 * ⚠ RELATIVE, EXTENSIONED IMPORTS so `node --test` can load this file.
 */
import { postedLines } from '../domain/workout/posted-workout-lines.ts';

/** The prescription fields a builder row (`ProgramExercise`) or an import row (`ImportRx`) can carry. */
export interface RxFields {
  catalogKey?: string | null;
  name?: string;
  sets?: number;
  reps?: number;
  repScheme?: (number | 'F')[];
  repsMax?: number | null;
  percentOfMax?: number;
  percentScheme?: (number | null)[];
  percentOf?: string;
  restSec?: number | null;
  restScheme?: (number | null)[];
}

/** Anything past plain sets × reps: a ramp, a percentage, a rest. */
export function hasRx(x: RxFields): boolean {
  return !!(x.repScheme?.length || x.percentScheme?.length || x.percentOfMax != null || x.restSec != null || x.restScheme?.length);
}

/** "9 sets · 5-5-5-3-3-3-1-1-1 reps · 60-87% · rest 2:00", or null for a plain row. */
export function prescriptionLine(x: RxFields): string | null {
  if (!hasRx(x)) return null;
  const reps = (x.repScheme ?? []).filter((r): r is number => typeof r === 'number');
  const [line] = postedLines([
    {
      catalogKey: x.catalogKey ?? null,
      name: x.name ?? '',
      sets: x.sets ?? 1,
      targetReps: x.reps ?? 0,
      ...(reps.length && reps.length === x.repScheme?.length ? { repScheme: reps } : null),
      ...(x.repsMax != null ? { repsMax: x.repsMax } : null),
      ...(x.percentOfMax != null ? { percentOfMax: x.percentOfMax } : null),
      ...(x.percentScheme?.length ? { percentScheme: x.percentScheme } : null),
      ...(x.percentOf ? { percentOf: x.percentOf } : null),
      ...(x.restSec != null ? { restSec: x.restSec } : null),
      ...(x.restScheme?.length ? { restScheme: x.restScheme } : null),
    },
  ]);
  if (!line) return null;
  const rest = line.rest ? line.rest.replace(/^Rest (\S+) between sets$/, 'rest $1') : null;
  return [line.summary, rest].filter(Boolean).join(' · ');
}

/**
 * The row once the athlete re-counts it with a stepper: plain sets × reps from here on. A per-set ramp cannot
 * survive a changed set count (which rung goes?), so the ramp and its per-set percentages go; ONE percentage
 * for every set stays, and so does one rest for every set. The card's numbers are then the athlete's own.
 */
export function withoutScheme<T extends RxFields>(x: T): T {
  if (!x.repScheme?.length && !x.percentScheme?.length && !x.restScheme?.length) return x;
  const pcts = (x.percentScheme ?? []).filter((p): p is number => p != null);
  const onePct = pcts.length && pcts.every((p) => p === pcts[0]) ? pcts[0] : undefined;
  const rests = (x.restScheme ?? []).filter((r): r is number => r != null);
  const oneRest = rests.length && rests.every((r) => r === rests[0]) ? rests[0] : undefined;
  const firstReps = (x.repScheme ?? []).find((r): r is number => typeof r === 'number');
  const { repScheme: _r, percentScheme: _p, restScheme: _s, ...rest } = x;
  return {
    ...(rest as T),
    ...(x.reps == null && firstReps != null ? { reps: firstReps } : null),
    ...(x.percentOfMax == null && onePct != null ? { percentOfMax: onePct } : null),
    ...(x.restSec == null && oneRest != null ? { restSec: oneRest } : null),
  };
}
