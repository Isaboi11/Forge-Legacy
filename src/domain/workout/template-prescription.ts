/**
 * A template row's PRESCRIPTION — the percentage and per-set fields a coach's day needs (PO 2026-09-27,
 * Squatober) — read back out of stored jsonb, and turned into the sets and rests the logger runs.
 *
 * Pure and relative-imported, so `node --test` proves it.
 */

import { maxKeyFor, percentTargets, resolveLoad } from '../program/percent-max.ts';
import { sessionSetsFor } from './session-core.ts';
import type { LoadContext } from '../program/percent-max.ts';
import type { SessionSet } from './types.ts';

/** The fields a template row may carry beyond sets × reps. Mirrors `ProgramExercise`, field for field. */
export interface TemplatePrescription {
  repScheme?: number[] | null;
  repsMax?: number | null;
  percentOfMax?: number | null;
  percentScheme?: (number | null)[] | null;
  percentOf?: string | null;
  restSec?: number | null;
  restScheme?: (number | null)[] | null;
}

const posNum = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};
const numList = (v: unknown): (number | null)[] | null =>
  Array.isArray(v) && v.length ? v.map((x) => (x == null ? null : posNum(x))) : null;

/**
 * ⚠ A WHITELIST, like `toExercise` in `templates-live.ts`: every field is named, and each comes back only when
 * it holds something usable — so a template saved before this reads back byte-identical, and a bad value (a
 * "0%", a text in a number field) is dropped rather than resolved into a bar.
 */
export function prescriptionOf(e: Record<string, unknown>): TemplatePrescription {
  const out: TemplatePrescription = {};
  const scheme = numList(e.repScheme);
  if (scheme && scheme.every((x) => x != null)) out.repScheme = scheme as number[];
  const rMax = posNum(e.repsMax);
  if (rMax != null) out.repsMax = rMax;
  const pct = posNum(e.percentOfMax);
  if (pct != null) out.percentOfMax = pct;
  const pScheme = numList(e.percentScheme);
  if (pScheme && pScheme.some((x) => x != null)) out.percentScheme = pScheme;
  if (typeof e.percentOf === 'string' && e.percentOf.trim()) out.percentOf = e.percentOf.trim();
  const rest = posNum(e.restSec);
  if (rest != null) out.restSec = rest;
  const rScheme = numList(e.restScheme);
  if (rScheme && rScheme.some((x) => x != null)) out.restScheme = rScheme;
  return out;
}

/** Does this row prescribe anything past sets × reps? Rows that do not keep their old, exact set-building. */
export function hasPrescription(p: TemplatePrescription): boolean {
  return !!(p.repScheme?.length || p.percentOfMax || p.percentScheme?.length || p.restSec || p.restScheme?.length || p.repsMax);
}

/** The row, as the program model's exercise — so `sessionSetsFor` (the one tested rule) builds its sets. */
interface RowLike extends TemplatePrescription {
  catalogKey: string | null;
  sets: number;
  targetReps: number;
  targetDurationSec?: number | null;
}

function asProgramExercise(row: RowLike) {
  return {
    name: '',
    catalogKey: row.catalogKey ?? undefined,
    sets: Math.max(1, row.repScheme?.length || row.sets || 1),
    /* No count on the card (a carry for yards, "100 reps total") stays ZERO — `sessionSetsFor` would otherwise
       fill in its default of 10, and the history would carry reps nobody was asked for. */
    reps: row.targetReps > 0 ? row.targetReps : undefined,
    ...(row.repScheme?.length ? { repScheme: row.repScheme } : null),
    ...(row.repsMax != null ? { repsMax: row.repsMax } : null),
    ...(row.percentOfMax != null ? { percentOfMax: row.percentOfMax } : null),
    ...(row.percentScheme?.length ? { percentScheme: row.percentScheme } : null),
    ...(row.percentOf ? { percentOf: row.percentOf } : null),
    ...(row.targetDurationSec != null ? { durationSec: row.targetDurationSec } : null),
  };
}

/**
 * The sets a prescribed row starts as: each set's reps, its bar from the athlete's max (a GRAY target —
 * `targetWeight`, never `weight`), the percentage it came from (so a changed max can re-draw it), and the rest
 * that follows it.
 */
export function prescribedSets(row: RowLike, load?: LoadContext): SessionSet[] {
  const ex = asProgramExercise(row);
  const sets = sessionSetsFor(ex as never, load);
  const pcts = percentTargets(ex as never);
  return sets.map((s, i) => {
    const pct = pcts.length === 1 && sets.length > 1 ? pcts[0] : pcts[i];
    const rest = row.restScheme?.[i] ?? row.restSec ?? null;
    return {
      ...s,
      /* A card with no count stays at zero — see `asProgramExercise`. */
      targetReps: row.targetReps > 0 || row.repScheme?.length ? s.targetReps : 0,
      ...(pct != null ? { targetPct: pct } : null),
      ...(rest != null ? { restSec: rest } : null),
    };
  });
}

/** The catalogue key a row's percentages resolve against — null when it prescribes none. */
export function maxKeyOf(row: RowLike): string | null {
  return maxKeyFor(asProgramExercise(row) as never);
}

/* ── the max, asked for at the start and changeable at any time ──────────── */

/**
 * The lifts this session's percentages need a max for, in first-appearance order — what "Your maxes" asks.
 * A set already logged still counts: its lift is on the page, and the athlete may want to correct it.
 */
export function maxKeysNeeded(exercises: readonly { maxKey?: string | null }[]): string[] {
  const out: string[] = [];
  for (const e of exercises) if (e.maxKey && !out.includes(e.maxKey)) out.push(e.maxKey);
  return out;
}

/**
 * Re-draw every gray weight from these maxes (PO 2026-09-27: "they should be able to change their max anything at
 * any time"). Only `targetWeight` moves — never `weight`, which is what the athlete typed or lifted — and never
 * on a set already logged, whose number is history now. A lift whose max was cleared goes back to no target
 * (the bare percentage), never a stale number.
 */
export function withMaxes<E extends { maxKey?: string | null; sets: SessionSet[] }>(exercises: readonly E[], load: LoadContext): E[] {
  return exercises.map((e) => {
    if (!e.maxKey) return e;
    const max = load.maxes[e.maxKey];
    let changed = false;
    const sets = e.sets.map((s) => {
      if (s.targetPct == null || s.done) return s;
      const w = resolveLoad(Number.isFinite(max) ? max : null, s.targetPct, load.rules)?.weight ?? null;
      if ((s.targetWeight ?? null) === w) return s;
      changed = true;
      return { ...s, targetWeight: w };
    });
    return changed ? { ...e, sets } : e;
  });
}
