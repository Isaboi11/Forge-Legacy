/**
 * Rank signal aggregation (Slice 2) — turns an athlete's raw activity into the `RankSignals` the engine
 * reads. Pure + testable; the Supabase fetch lives in `src/data/rank-live.ts`.
 *
 * Personal Improvement (the one type-adaptive category) uses what's actually tracked:
 *   • strength / bodybuilding → the auto-detected LOAD (e1RM) PRs in `personal_records` (progressive
 *     overload). NOTE: bodybuilding's signed-off ideal is session-volume progression; only load PRs are
 *     auto-tracked today, so load PRs stand in — true Σ(sets×weight×reps) PBs are a later refinement.
 *   • endurance → best-distance PBs computed from `workouts.distance`.
 *   • hybrid → the union (OR logic) of both.
 * Everything else (consistency, volume, longevity, recent, programs, chapters, goals) is exact.
 */

import {
  countActiveWeeks,
  countRecentActiveWeeks,
  countSelfDirectedBlocks,
  isMeaningfulWork,
  type RankSignals,
} from './rank.ts';
import { summarizeImprovement } from './improvement.ts';
import type { AthleteType } from './thresholds.ts';

const DAY_MS = 86_400_000;

/** DB modality enum → the RCM's canonical activity type, so meaningful-work checks pass (D-RCM-4: no type
 *  is excluded from meaningful work). */
const MODALITY_TO_ACTIVITY: Record<string, string> = {
  strength: 'STRENGTH',
  running: 'RUN',
  walking: 'WALK',
  cycling: 'BIKE',
  swimming: 'SWIM',
  rowing: 'OTHER',
  mobility: 'MOBILITY',
  other: 'OTHER',
};

const ENDURANCE_MODALITIES = new Set(['running', 'walking', 'cycling', 'swimming', 'rowing']);

export interface RawSession {
  date: string; // ISO — saved_at/started_at
  durationSec: number;
  state: string; // 'saved' | 'in_progress'
  activityType: string; // DB modality
  distance: number | null;
}

export interface RawRankInputs {
  athleteType: AthleteType;
  today: string; // ISO — for elapsed + recent window
  sessions: RawSession[];
  loadPRDates: string[]; // personal_records (load) event dates
  programGraduations: number;
  distinctProgramGraduations: number;
  sealedChapters: number;
  goalEvents: number;
  primaryGoalsAchieved: number;
}

/** Dates at which a running maximum is set — each is a PB event (the first establishes the baseline). */
export function pbDatesByRunningMax(points: readonly { date: string; value: number }[]): string[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  let max = -Infinity;
  const out: string[] = [];
  for (const p of sorted) {
    if (p.value > max) {
      max = p.value;
      out.push(p.date);
    }
  }
  return out;
}

/** The improvement PB dates for an athlete type from the tracked signals (see file header for the remap). */
export function improvementDatesForType(type: AthleteType, loadPRDates: readonly string[], sessions: readonly RawSession[]): string[] {
  const distancePBs = () =>
    pbDatesByRunningMax(
      sessions
        .filter((s) => s.distance != null && ENDURANCE_MODALITIES.has(s.activityType.toLowerCase()))
        .map((s) => ({ date: s.date.slice(0, 10), value: s.distance as number })),
    );
  switch (type) {
    case 'strength':
    case 'bodybuilding':
      return [...loadPRDates];
    case 'endurance':
      return distancePBs();
    case 'hybrid':
      return [...loadPRDates, ...distancePBs()];
  }
}

/**
 * DISTINCT PLANS among graduated programs (CAL Q14) — pure, so it can be tested; `rank-live.ts` has no
 * test file of its own.
 *
 * `source_definition_id` is the identity of a PLAN; the row id is the identity of a COPY. A null source
 * means an athlete-authored program, which is its own plan by definition, so it keys on the row id. The
 * `id:` prefix keeps the two keyspaces disjoint by construction rather than by luck.
 *
 * WHAT THIS FIXES. `rank-live.ts` set the distinct count equal to the total, on a comment claiming no
 * source-template column existed — it has existed since migration 0019, and the honors evaluator already
 * groups by it. The partial unique index `programs_one_per_source` means the two counts genuinely agree
 * for CATALOG programs, so the old line was right by accident; it is wrong for athlete-authored ones,
 * where six rebuilds of one plan cleared the Legend "6 different programs" gate. And the screen printed
 * "Different programs finished: 6 of 6" identically to "Programs finished" every time — a requirement
 * displayed as though it bound, which never did.
 */
export const distinctProgramCount = (
  rows: readonly { id: string; source_definition_id: string | null }[],
): number => new Set(rows.map((p) => p.source_definition_id ?? `id:${p.id}`)).size;

/** Assemble the engine's `RankSignals` from raw activity. All sessions are native today (no import path). */
export function assembleSignals(raw: RawRankInputs): RankSignals {
  const meaningful = raw.sessions.filter((s) =>
    isMeaningfulWork({
      durationMinutes: s.durationSec / 60,
      completed: s.state === 'saved',
      activityType: MODALITY_TO_ACTIVITY[s.activityType.toLowerCase()] ?? 'OTHER',
    }),
  );
  /* Named `native` deliberately. Every session is native today (there is no import path), but blocks are
   * derived from these dates and take NO import credit — so when the import pipeline lands, feeding
   * imported dates in here would silently grant them 100%, violating R-D46 and RCM §14.13. The name is
   * what makes that a visible decision rather than a silent regression. */
  const nativeDates = meaningful.map((s) => s.date.slice(0, 10));
  const earliest = nativeDates.length ? nativeDates.reduce((a, b) => (a < b ? a : b)) : raw.today.slice(0, 10);
  const journeyElapsedDays = Math.max(0, Math.round((Date.parse(`${raw.today.slice(0, 10)}T00:00:00Z`) - Date.parse(`${earliest}T00:00:00Z`)) / DAY_MS));

  return {
    athleteType: raw.athleteType,
    journeyElapsedDays,
    nativeActiveWeeks: countActiveWeeks(nativeDates),
    importedActiveWeeks: 0,
    recentActiveWeeks: countRecentActiveWeeks(nativeDates, raw.today),
    nativeSessions: meaningful.length,
    importedSessions: 0,
    programGraduations: raw.programGraduations,
    distinctProgramGraduations: raw.distinctProgramGraduations,
    /* DERIVED, not fetched — `RawRankInputs` gains nothing for this, which is the proof that a block is a
     * property of training the athlete already did rather than a thing they declare. */
    selfDirectedBlocks: countSelfDirectedBlocks(nativeDates),
    sealedChapters: raw.sealedChapters,
    goalEvents: raw.goalEvents,
    primaryGoalsAchieved: raw.primaryGoalsAchieved,
    improvement: summarizeImprovement(improvementDatesForType(raw.athleteType, raw.loadPRDates, raw.sessions)),
  };
}
