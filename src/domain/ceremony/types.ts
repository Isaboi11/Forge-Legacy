/**
 * Ceremony model — the earned "recognition moments" the app presents as centered
 * Modals (Modal & Overlay Library §02: Modal = ceremony only). Presentation is a
 * separate system from whatever computes the event (Rank Computation, honor/goal
 * evaluation, …) — those enqueue a `CeremonyEvent`; the ceremony system consumes it.
 *
 * There is NO evaluator backend yet (no RCM→athlete, no honor/goal/program engine),
 * so nothing enqueues these in production — a flagged dev harness does, until real
 * triggers land. See `src/app/ceremony-harness.tsx`.
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
}
/** M-4 Program Graduated. */
export interface ProgramGraduatedCeremony extends CeremonyBase {
  kind: 'programGraduated';
  programName: string;
}
/** M-2 Honor Earned — artwork is a pending-asset placeholder (honor art not imported). */
export interface HonorEarnedCeremony extends CeremonyBase {
  kind: 'honorEarned';
  honorName: string;
  citation?: string;
}
/** M-7 Premium Upsell — limit-triggered, standalone. */
export interface PremiumUpsellCeremony extends CeremonyBase {
  kind: 'premiumUpsell';
  reason?: string;
}

export type CeremonyEvent =
  | RankUpCeremony
  | GoalAchievedCeremony
  | ProgramGraduatedCeremony
  | HonorEarnedCeremony
  | PremiumUpsellCeremony;
