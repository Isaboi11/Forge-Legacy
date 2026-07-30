import type { ActiveSession, SessionSet } from './types';

/**
 * Pure active-workout metrics (W-9). Volume + PR detection are computed domain-side (unit-tested), not
 * in SQL or over a display string — then the finish commit persists them. PR = Epley e1RM (W-17 owns the
 * celebration; this just decides what's a record). Only DONE sets with a weight count.
 */

/** Epley estimated 1RM. */
export function e1rm(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

/** Effective reps for volume/e1RM — the entered actual, else the prescribed target. */
export function effectiveReps(s: SessionSet): number {
  return s.actualReps ?? s.targetReps;
}

/** Session volume = Σ weight × effectiveReps over done, weighted sets (rounded). */
export function sessionVolume(session: ActiveSession): number {
  let v = 0;
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      if (s.done && s.weight != null) v += s.weight * effectiveReps(s);
    }
  }
  return Math.round(v);
}

/** Count of completed sets. */
export function doneSetCount(session: ActiveSession): number {
  let n = 0;
  for (const ex of session.exercises) for (const s of ex.sets) if (s.done) n += 1;
  return n;
}

/** True once at least one set is logged — the strength minimum-to-save gate. */
export function hasLoggedSet(session: ActiveSession): boolean {
  return doneSetCount(session) > 0;
}

export interface DetectedPR {
  exercise: string;
  weight: number;
  reps: number;
  /** Exercise catalog id, so honors match the exercise rather than its display name (0078). */
  catalogKey?: string | null;
}

/**
 * PRs for the session: per exercise, the best done set by e1RM; a PR if its e1RM beats the athlete's
 * current best for that exercise. `currentBestE1rm` maps exercise name → current best e1RM (0 if none).
 */
export function detectPRs(session: ActiveSession, currentBestE1rm: Record<string, number>): DetectedPR[] {
  const prs: DetectedPR[] = [];
  for (const ex of session.exercises) {
    let best: { weight: number; reps: number; est: number } | null = null;
    for (const s of ex.sets) {
      if (!s.done || s.weight == null) continue;
      const reps = effectiveReps(s);
      const est = e1rm(s.weight, reps);
      if (!best || est > best.est) best = { weight: s.weight, reps, est };
    }
    if (best && best.est > (currentBestE1rm[ex.name] ?? 0)) {
      // catalogKey rides along so honors can match the exercise itself rather than its display name
      // (0078). Optional end to end: an exercise without one still records, just unkeyed.
      prs.push({ exercise: ex.name, weight: best.weight, reps: best.reps, catalogKey: ex.catalogKey ?? null });
    }
  }
  return prs;
}
