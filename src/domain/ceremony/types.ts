/**
 * Ceremony model — the earned "recognition moments" the app presents as centered
 * Modals (Modal & Overlay Library §02: Modal = ceremony only). Presentation is a
 * separate system from whatever computes the event (Rank Computation, honor/goal
 * evaluation, …) — those enqueue a `CeremonyEvent`; the ceremony system consumes it.
 *
 * All four earned kinds now have real triggers: `rankUp` from the Legacy tab's rank refresh,
 * `goalAchieved` from the goals screen, `honorEarned` from the honor evaluator, and `programGraduated`
 * from W-17 once `save_workout` seals the program (migration 0104). `src/app/ceremony-harness.tsx`
 * remains as a dev-only way to look at each one on demand.
 */

import type { RankTier } from '../rank-artwork/resolver';

/**
 * The M-series ceremony kinds. The four EARNED kinds flow through the auto-ceremony
 * queue (M-1/M-3/M-4/M-2, in that priority — see `queue.ts`). `premiumUpsell` (M-7) is
 * a limit-triggered modal, not an earned recognition; it is presented standalone.
 * M-5 (Chapter Sealing) and M-6 (Destructive confirm) are BottomSheets, not modals,
 * and are handled by their callers — not part of this queue.
 */
export type CeremonyKind = 'rankUp' | 'goalAchieved' | 'programGraduated' | 'honorEarned' | 'premiumUpsell';

interface CeremonyBase {
  /** Stable id so the queue can key/dedupe entries. */
  id: string;
  kind: CeremonyKind;
}

/** M-1 Rank Up — the only ceremony whose artwork is REAL (the imported rank badge). */
export interface RankUpCeremony extends CeremonyBase {
  kind: 'rankUp';
  rank: RankTier;
}
/** M-3 Goal Achieved. */
export interface GoalAchievedCeremony extends CeremonyBase {
  kind: 'goalAchieved';
  goalName: string;
  /** The chapter the goal belonged to — shown under the goal name. */
  chapterName?: string;
}
/** M-4 Program Graduated. */
export interface ProgramGraduatedCeremony extends CeremonyBase {
  kind: 'programGraduated';
  programName: string;
  /**
   * M-4 §4's context rows. Sourced from the same data W-3's sealed record reads, because §3 requires the
   * ceremony and the permanent record to agree — a modal saying eight weeks in front of a record saying
   * two months is the failure this shares a formatter to prevent (`domain/program/graduation.ts`).
   *
   * DURATION IS NOT A FIELD. §4 defines it as calculated from Started to Graduated, so it is derived by
   * `spanLabel` rather than carried — one less thing that can arrive wrong.
   *
   * All optional: a row whose datum is missing is omitted rather than faked, and the dev harness's bare
   * `{ programName }` still compiles.
   */
  startedAt?: string | null;
  graduatedAt?: string | null;
  workouts?: number;
}
/** M-2 Honor Earned — artwork is a pending-asset placeholder (honor art not imported). */
export interface HonorEarnedCeremony extends CeremonyBase {
  kind: 'honorEarned';
  honorName: string;
  citation?: string;
}
/**
 * M-7 Premium Upsell — limit-triggered, standalone.
 *
 * ⚠ `reason` and `benefits` are BUILT FROM SERVER-SIDE CAP CONFIG, never written as literals (M7-D14).
 * `domain/entitlement/caps-core` renders both from the cap in force, so changing a cap is a SQL update
 * rather than a release. A hardcoded "75-photo limit" here is the cap written down a second time, and the
 * two drift the first time the config moves — which the plan says will happen after the metered run.
 */
export interface PremiumUpsellCeremony extends CeremonyBase {
  kind: 'premiumUpsell';
  reason?: string;
  /** The four rows, triggered feature first (M-7 §6.2). Four exactly — §4 forbids scrolling content. */
  benefits?: string[];
}

export type CeremonyEvent =
  | RankUpCeremony
  | GoalAchievedCeremony
  | ProgramGraduatedCeremony
  | HonorEarnedCeremony
  | PremiumUpsellCeremony;
