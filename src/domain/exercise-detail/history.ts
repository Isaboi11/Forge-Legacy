import type { HistorySession, HistorySet } from '@/domain/coach/progression';
import type { LiftMark } from '@/domain/workout/records-core';

/**
 * "Your history" on Exercise Detail (W22-Amendment-001, PO 2026-09-29, B8) — the pure half.
 *
 * The read is `fetchLiftHistory` (THE one lift-history read); this only decides what to say about it.
 * Kept out of the screen so the rules below are tested, not eyeballed.
 *
 * ⚠ TWO DIFFERENT "BESTS", LABELLED AS SUCH (QA F9). The record on file is the heaviest load at 1–5 reps
 * ("PR (1–5 reps)"); the heaviest set is the heaviest load at ANY reps across the sessions read. An 8-rep
 * set can be heavier than nothing in the record band — printing both under one word is what made the
 * numbers look broken.
 *
 * ⚠ WEIGHT 0 IS BODYWEIGHT, NOT "NO LOAD"; WEIGHT NULL IS "NOT ENTERED" and never ranks. A bodyweight top
 * set is "most reps", not "heaviest" — nothing was heavy about it.
 */

export interface SessionLine {
  startedAt: string;
  /** Heaviest set of the session (ties → more reps). Null when no set carries a load. */
  top: HistorySet | null;
  /** Sets logged in the session. */
  setCount: number;
}

export interface ExerciseHistorySummary {
  /** Never logged — the screen says so in one line and nothing else. */
  empty: boolean;
  /** Newest first, at most `shown`. */
  recent: SessionLine[];
  /** Heaviest set across every session read; null when none carried a load. */
  heaviest: { set: HistorySet; startedAt: string; bodyweight: boolean } | null;
  /**
   * True when the read hit its cap, so "heaviest" covers only the latest `limit` sessions and the label
   * must say so. False means every session of this lift was read.
   */
  capped: boolean;
  /** The 1–5 rep record on file, untouched. */
  pr: LiftMark | null;
}

/** Heavier load wins; equal load → more reps. Null weight never ranks. */
function better(a: HistorySet, b: HistorySet | null): boolean {
  if (a.weight == null) return false;
  if (!b || b.weight == null) return true;
  if (a.weight !== b.weight) return a.weight > b.weight;
  return (a.reps ?? 0) > (b.reps ?? 0);
}

export function topSet(sets: readonly HistorySet[]): HistorySet | null {
  let top: HistorySet | null = null;
  for (const s of sets) if (better(s, top)) top = s;
  return top;
}

export function summariseExerciseHistory(
  sessions: readonly HistorySession[],
  pr: LiftMark | null,
  opts: { shown: number; limit: number },
): ExerciseHistorySummary {
  let heaviest: ExerciseHistorySummary['heaviest'] = null;
  for (const s of sessions) {
    const t = topSet(s.sets);
    if (t && better(t, heaviest?.set ?? null)) heaviest = { set: t, startedAt: s.startedAt, bodyweight: t.weight === 0 };
  }
  return {
    empty: sessions.length === 0 && pr == null,
    recent: sessions.slice(0, opts.shown).map((s) => ({ startedAt: s.startedAt, top: topSet(s.sets), setCount: s.sets.length })),
    heaviest,
    capped: sessions.length >= opts.limit,
    pr,
  };
}
