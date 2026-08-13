/**
 * Rank thresholds — every constant is quoted verbatim from the LOCKED specs:
 *   RSA = Rank-System-Architecture.md, RCM = Rank-Computation-Model.md, CAL = Rank-Calibration-Decisions.md.
 *
 * These are the numbers the user signed off on. Nothing here is invented; where the docs left a value
 * open it is NOT encoded (see the domain's improvement handling + the sign-off notes).
 *
 * Athlete types are the SHIPPED four (Strength/Bodybuilding/Endurance/Hybrid, ONB-D8), with Personal
 * Improvement remapped from the RCM's stale Running/Boxing naming per PD-7 (see improvement.ts).
 */

/** The 7 families, in canonical progression order (RSA §2.1). */
export const FAMILIES = ['foundation', 'builder', 'craftsman', 'architect', 'established', 'legend', 'legacy'] as const;
export type RankFamily = (typeof FAMILIES)[number];

/** A family the athlete can be PROMOTED into (everything above Foundation). */
export type PromotableFamily = Exclude<RankFamily, 'foundation'>;

export type AthleteType = 'strength' | 'bodybuilding' | 'endurance' | 'hybrid';

/** The nine canonical activity types that can count as meaningful work (RCM §1.1). */
export const ACTIVITY_TYPES = ['STRENGTH', 'RUN', 'WALK', 'BIKE', 'SWIM', 'HIIT', 'MOBILITY', 'YOGA', 'OTHER'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Meaningful-work duration floor, in minutes (CAL Q1 = 10; 5/15/20 rejected). */
export const MEANINGFUL_WORK_MIN_MINUTES = 10;

/** Recent-engagement gate for prestige promotions (Architect+): N active weeks within a W-week window,
 *  native sessions only (CAL Q9/Q7/Q10 — uniform, native-only). */
export const RECENT_ENGAGEMENT = { windowWeeks: 12, minActiveWeeks: 8 } as const;

/** Imported active-weeks / sessions count at 50% for prestige promotions (CAL Q11). */
export const IMPORT_PRESTIGE_CREDIT = 0.5;

/**
 * A SELF-DIRECTED TRAINING BLOCK — what structured development looks like without a program row
 * (RCM Amendment 002, D-RCM-29). Six qualifying weeks inside a span of eight consecutive calendar weeks,
 * where a qualifying week has meaningful work on at least `minDaysPerWeek` DISTINCT days.
 *
 * `weeks` and `minDaysPerWeek` are calibrated to the shipped catalogue rather than invented: both Strength
 * Foundation programs are `durationWeeks: 6` at `frequencyPerWeek: 3–4`. So "one block counts as much as
 * one graduation" is measured against what a graduation actually IS in this app.
 *
 * ══ `windowWeeks` IS THE WHOLE DESIGN, AND IT IS NOT A ROUNDING ALLOWANCE ══
 *
 * Six CONSECUTIVE weeks would have been the obvious rule, and it is the wrong one twice over. It zeroes
 * five weeks of work for one week of flu, and it punishes the deload week that real programs CONTAIN —
 * an athlete training 5×/week with a planned light week would earn nothing while a flat 3×/week athlete
 * earns a block. Worse, it is a streak: a forward counter the athlete must protect, one miss resets. That
 * is the pattern Product DNA §10 prohibits, narrowed by CAL-D19 only for a backward-looking view that
 * "feeds no progression" — and this feeds progression directly.
 *
 * Two tolerated weeks in eight removes the thing that could be broken. A gap costs nothing recoverable
 * and destroys nothing already earned; the scan simply re-anchors at the next qualifying week. There is
 * no state to defend, which is what makes this not a streak.
 *
 * 8 is the one number here that is judgment rather than derivation (6 + 2: a deload plus one life week,
 * and not enough to stretch "six weeks of training" into a quarter). The amendment says so out loud.
 */
export const SELF_DIRECTED_BLOCK = { weeks: 6, minDaysPerWeek: 3, windowWeeks: 8 } as const;

/**
 * THE OTHER KIND OF EVIDENCE HAS A FLOOR TOO — a graduation credits only from four DESIGNED weeks
 * (D-RCM-30, `Rank-Computation-Model-Amendment-003`).
 *
 * It lives here, beside `SELF_DIRECTED_BLOCK`, because it is the same question asked of the other form of
 * structured development, and this file has no runtime imports so anything may read it.
 *
 * ══ IT USED TO BE A STEPPER'S LOWER BOUND ══
 *
 * Nothing ever checked program length: graduation is `logged >= prescribed`, rank counts graduated rows,
 * `honor_metrics` counts the same rows. Four weeks held only because the Builder would not go below it.
 * Opening program length to one week (PA2-D1) turned that accident into a hole, and this closes it.
 *
 * DESIGNED, NOT ELAPSED. It reads the week count the athlete chose before logging anything — never the
 * calendar time the program occupied. Amendment-001 §4 forbids withholding a graduation because someone
 * was slow, and D-RCM-30 R1 does not touch that.
 *
 * ⚠ 4 HERE vs 6 IN `SELF_DIRECTED_BLOCK` IS A KNOWN, ACCEPTED ASYMMETRY, not a bug to "fix" by aligning
 * them. D-RCM-29 calls the two forms "additive at parity"; D-RCM-30 §3 accepts the gap in writing, on the
 * grounds that a program is authored and adhered to where a block is inferred from behaviour. Raising
 * this to 6 would strip credit from the shipped 4-week Mobility Foundation; lowering the block to 4 would
 * move rank arithmetic for every existing athlete.
 *
 * ⚠ SQL TWIN: `public.program_earns_credit(jsonb)`. The server decides credit without trusting the
 * client, because what a graduation buys is a rank family and five never-revocable honors. The two carry
 * the same golden vectors and the migration asserts them at apply time.
 */
export const STRUCTURED_DEVELOPMENT_MIN_WEEKS = 4;

/** The improvement "shape" a family transition demands (CAL Q13). Checked in improvement.ts. */
export type ImprovementRequirement = 'none' | 'first' | 'multi-period' | 'repeated' | 'multi-year' | 'multi-phase';

export interface FamilyPromotionReq {
  /** Minimum elapsed days since journey start (RCM §14.5/§14.11). */
  timeGateDays: number;
  /** Cumulative active weeks, all-time (RCM §14.4/§14.11). */
  cumulativeActiveWeeks: number;
  /** Forge-native active-week floor (50% of cumulative), or null below prestige (D-RCM-12). */
  nativeActiveWeekFloor: number | null;
  /** Program graduations, total incl. re-runs (RCM §14.7). */
  programGraduations: number;
  /** Distinct program IDs — the Legend/Legacy milestone rule (CAL Q14); null when not gated. */
  distinctProgramGraduations: number | null;
  /** Meaningful-work sessions (RCM §14.8). */
  volumeSessions: number;
  /** Sealed chapters (RCM §14.9). */
  sealedChapters: number;
  /** Goal participation events resolved via chapter sealing (RCM §14.9). */
  goalEvents: number;
  /** Primary goals achieved — a HARD minimum, not a weight (D-RCM-17). */
  primaryGoalsAchieved: number;
  /** Prestige ranks require recent engagement at fire time (Architect+). */
  requiresRecentEngagement: boolean;
  /** Personal-improvement shape required (CAL Q13). */
  improvement: ImprovementRequirement;
}

/**
 * Family-promotion requirements, keyed by the family being entered (RCM §14.11). Every row is a HARD
 * requirement — the convergence model (RSA §5.1, D-RCM-23) demands ALL are met simultaneously; exceeding
 * one never offsets a deficit in another. (The "signature milestone" column of §14.11 is subsumed here:
 * its program/chapter counts equal these category rows; the Legend/Legacy distinct-program rule is the
 * `distinctProgramGraduations` field.)
 */
export const FAMILY_PROMOTIONS: Record<PromotableFamily, FamilyPromotionReq> = {
  builder: {
    timeGateDays: 0, cumulativeActiveWeeks: 6, nativeActiveWeekFloor: null,
    programGraduations: 0, distinctProgramGraduations: null, volumeSessions: 12,
    sealedChapters: 0, goalEvents: 0, primaryGoalsAchieved: 0,
    requiresRecentEngagement: false, improvement: 'none',
  },
  craftsman: {
    timeGateDays: 60, cumulativeActiveWeeks: 18, nativeActiveWeekFloor: null,
    programGraduations: 0, distinctProgramGraduations: null, volumeSessions: 36,
    sealedChapters: 0, goalEvents: 0, primaryGoalsAchieved: 0,
    requiresRecentEngagement: false, improvement: 'first',
  },
  architect: {
    timeGateDays: 270, cumulativeActiveWeeks: 36, nativeActiveWeekFloor: 18,
    programGraduations: 1, distinctProgramGraduations: null, volumeSessions: 90,
    sealedChapters: 1, goalEvents: 1, primaryGoalsAchieved: 0,
    requiresRecentEngagement: true, improvement: 'multi-period',
  },
  established: {
    timeGateDays: 540, cumulativeActiveWeeks: 72, nativeActiveWeekFloor: 36,
    programGraduations: 3, distinctProgramGraduations: null, volumeSessions: 200,
    sealedChapters: 2, goalEvents: 2, primaryGoalsAchieved: 1,
    requiresRecentEngagement: true, improvement: 'repeated',
  },
  legend: {
    timeGateDays: 1460, cumulativeActiveWeeks: 210, nativeActiveWeekFloor: 105,
    programGraduations: 6, distinctProgramGraduations: 6, volumeSessions: 400,
    sealedChapters: 3, goalEvents: 4, primaryGoalsAchieved: 2,
    requiresRecentEngagement: true, improvement: 'multi-year',
  },
  legacy: {
    timeGateDays: 2555, cumulativeActiveWeeks: 288, nativeActiveWeekFloor: 144,
    programGraduations: 10, distinctProgramGraduations: 10, volumeSessions: 700,
    sealedChapters: 5, goalEvents: 6, primaryGoalsAchieved: 4,
    requiresRecentEngagement: true, improvement: 'multi-phase',
  },
};

/** Within-family active weeks needed for sub-tiers [I→II, II→III, III→IV] (RCM §13.7). Resets on family
 *  entry (D-RCM-11). Legacy has no sub-tiers. */
export const SUBTIER_ACTIVE_WEEKS: Record<RankFamily, readonly [number, number, number]> = {
  foundation: [2, 4, 6],
  builder: [3, 6, 10],
  craftsman: [4, 8, 14],
  architect: [6, 12, 20],
  established: [8, 16, 26],
  legend: [10, 22, 36],
  legacy: [0, 0, 0],
};

/**
 * Cumulative active weeks at which each family is ENTERED (its promotion threshold) — used to derive
 * within-family AW during a full recompute (within = cumulative − entry). Foundation entry = 0.
 */
export const FAMILY_ENTRY_ACTIVE_WEEKS: Record<RankFamily, number> = {
  foundation: 0,
  builder: FAMILY_PROMOTIONS.builder.cumulativeActiveWeeks,
  craftsman: FAMILY_PROMOTIONS.craftsman.cumulativeActiveWeeks,
  architect: FAMILY_PROMOTIONS.architect.cumulativeActiveWeeks,
  established: FAMILY_PROMOTIONS.established.cumulativeActiveWeeks,
  legend: FAMILY_PROMOTIONS.legend.cumulativeActiveWeeks,
  legacy: FAMILY_PROMOTIONS.legacy.cumulativeActiveWeeks,
};
