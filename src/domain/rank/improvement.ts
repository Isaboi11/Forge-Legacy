/**
 * Personal Improvement — the one type-adaptive category (RCM §9). The RCM authored its PB definitions for
 * Strength/Running/Boxing/Hybrid; the shipped athlete types are Strength/Bodybuilding/Endurance/Hybrid
 * (ONB-D8), so the signal is REMAPPED per PD-7 (user sign-off):
 *
 *   strength     → best logged performance per exercise (highest weight×reps), per RCM §9.6 Strength.
 *   bodybuilding → session training-volume progression (Σ sets×weight×reps) — the RCM's Strength
 *                  secondary-volume signal, promoted to primary for a hypertrophy athlete.
 *   endurance    → best pace OR longest distance, generalized across RUN/BIKE/SWIM/ROW — RCM §9.6 Running.
 *   hybrid       → a new PB in ANY actively-trained modality (OR logic) — RCM §9.6 Hybrid.
 *
 * This module holds the PURE summariser: a set of PB-event dates → the distribution facts the promotion
 * checks need (CAL Q13). Slice 2 does the per-type EXTRACTION (reading workouts) and feeds it here.
 */

import type { AthleteType } from './thresholds.ts';
import type { ImprovementSummary } from './rank.ts';

/** Human-readable per-type PB signal (documentation + Slice-2 extraction contract). */
export const IMPROVEMENT_SIGNAL: Record<AthleteType, string> = {
  strength: 'best weight×reps, per exercise',
  bodybuilding: 'session training-volume progression (Σ sets×weight×reps)',
  endurance: 'best pace or longest distance (run/bike/swim/row)',
  hybrid: 'a new PB in any actively-trained modality',
};

const DAY_MS = 86_400_000;

/** Turn a set of personal-best event dates (ISO) into the distribution facts CAL Q13 gates on. */
export function summarizeImprovement(pbDatesISO: readonly string[]): ImprovementSummary {
  const times = pbDatesISO
    .map((iso) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  const totalPBs = times.length;
  if (totalPBs === 0) return { totalPBs: 0, hasTwoSeparatedBy30d: false, spanMonths: 0, distinctYears: 0 };

  const first = times[0];
  const last = times[totalPBs - 1];
  const spanDays = (last - first) / DAY_MS;

  const years = new Set<number>();
  for (const t of times) years.add(new Date(t).getUTCFullYear());

  const firstD = new Date(first);
  const lastD = new Date(last);
  const spanMonths = (lastD.getUTCFullYear() - firstD.getUTCFullYear()) * 12 + (lastD.getUTCMonth() - firstD.getUTCMonth());

  return {
    totalPBs,
    // "≥2 of the events separated by ≥30 days" — with ≥2 PBs spanning ≥30 days, two such events exist.
    hasTwoSeparatedBy30d: totalPBs >= 2 && spanDays >= 30,
    spanMonths,
    distinctYears: years.size,
  };
}
