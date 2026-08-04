/**
 * Rank computation — the pure RCM engine (Slice 1). Given an athlete's aggregated signals it resolves the
 * exact family + sub-tier they have EARNED, by the locked convergence model (RSA §5, RCM §14). No I/O; no
 * Supabase; fully unit-tested. Slice 2 derives `RankSignals` from real data; Slice 3 persists + triggers.
 *
 * Faithful to the sign-off: multi-requirement convergence (every row met simultaneously — no category
 * carries a promotion), the resolved thresholds in `thresholds.ts`, prestige recent-engagement + 50%
 * import credit, and the four SHIPPED athlete types with Personal Improvement remapped (see improvement.ts).
 */

import {
  ACTIVITY_TYPES,
  FAMILIES,
  FAMILY_ENTRY_ACTIVE_WEEKS,
  FAMILY_PROMOTIONS,
  IMPORT_PRESTIGE_CREDIT,
  MEANINGFUL_WORK_MIN_MINUTES,
  RECENT_ENGAGEMENT,
  SELF_DIRECTED_BLOCK,
  SUBTIER_ACTIVE_WEEKS,
  type ActivityType,
  type ImprovementRequirement,
  type RankFamily,
} from './thresholds.ts';

// ── Personal Improvement summary (remapped types resolved in improvement.ts) ──
export interface ImprovementSummary {
  /** Count of personal-best events on the athlete's type-appropriate signal. */
  totalPBs: number;
  /** ≥2 PBs separated by ≥30 days — the "multi-period" distribution (CAL Q13). */
  hasTwoSeparatedBy30d: boolean;
  /** Months between the first and most-recent PB — the "repeated" distribution (≥6). */
  spanMonths: number;
  /** Distinct calendar years containing ≥1 PB — "multi-year" (≥2) / "multi-phase" (≥3). */
  distinctYears: number;
}

export const NO_IMPROVEMENT: ImprovementSummary = { totalPBs: 0, hasTwoSeparatedBy30d: false, spanMonths: 0, distinctYears: 0 };

/** The aggregated inputs the engine needs. Slice 2 builds this from workouts/programs/chapters/goals. */
export interface RankSignals {
  athleteType: import('./thresholds.ts').AthleteType;
  journeyElapsedDays: number;
  /** Active weeks (Mon–Sun with ≥1 meaningful session) — split so prestige import credit can apply. */
  nativeActiveWeeks: number;
  importedActiveWeeks: number;
  /** Native active weeks within the last 12 weeks (prestige recent-engagement gate). */
  recentActiveWeeks: number;
  /** Meaningful-work sessions, split for prestige import credit. */
  nativeSessions: number;
  importedSessions: number;
  /**
   * Program graduations, total incl. re-runs (RCM §14.7). A REAL count of graduated program rows, and it
   * stays that way — see `selfDirectedBlocks` for why nothing is ever folded into it.
   */
  programGraduations: number;
  /** Distinct program PLANS — the Legend/Legacy milestone (CAL Q14). */
  distinctProgramGraduations: number;
  /**
   * Self-directed training blocks derived from the athlete's own history (D-RCM-29, RCM Amendment 002).
   *
   * ══ WHY THIS IS A SEPARATE FIELD AND NOT ADDED TO `programGraduations` ══
   *
   * It is combined with graduations at the GATE ONLY (`structuredDevelopment`). It must never be folded
   * into the graduation count, because that count is also what the honors path means by a graduation:
   * `honor_metrics()` computes `programs_graduated` as a live `count(*)` over `programs where state =
   * 'graduated'`, and `first_program_graduated` / `programs_graduated_5|10|25|50` fire off it.
   *
   * An honor is a permanent claim about a specific act. "5 Programs Graduated" awarded to an athlete who
   * graduated none would be a false statement in a record this product promises cannot be rewritten. The
   * firewall is that there is nothing to fold — the two numbers never meet outside a `>=` comparison.
   */
  selfDirectedBlocks: number;
  sealedChapters: number;
  /** Goal participation events resolved via chapter sealing (RCM §14.9). */
  goalEvents: number;
  primaryGoalsAchieved: number;
  improvement: ImprovementSummary;
}

export interface ResolvedRank {
  family: RankFamily;
  subTier: number; // 1–4 (Legacy always 1)
  rankLevel: number; // 1–25
  display: string; // "Craftsman · III"
}

const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;

/** rankLevel 1–25 from family order + sub-tier (RCM §23.3); Legacy resolves to 25. */
export function rankLevel(family: RankFamily, subTier: number): number {
  const lvl = FAMILIES.indexOf(family) * 4 + subTier;
  return Math.min(25, Math.max(1, lvl));
}

/** "Craftsman · III" / "Legacy" (RSA §2.3). */
export function rankDisplay(family: RankFamily, subTier: number): string {
  const name = family.charAt(0).toUpperCase() + family.slice(1);
  return family === 'legacy' ? name : `${name} · ${ROMAN[subTier] ?? 'I'}`;
}

/** The floor every athlete starts at (RSA §2.2 "I've started."). */
export const FOUNDATION_I: ResolvedRank = { family: 'foundation', subTier: 1, rankLevel: 1, display: rankDisplay('foundation', 1) };

// ── meaningful work + active weeks (helpers for Slice 2; tested now) ──

/** A saved, completed session ≥10 min carrying one of the nine canonical types is "meaningful work"
 *  (RCM §3.5). No minimum-sets rule — duration is the sole quality dimension. */
export function isMeaningfulWork(session: { durationMinutes: number; completed: boolean; activityType: string }): boolean {
  if (!session.completed) return false;
  if (!(session.durationMinutes >= MEANINGFUL_WORK_MIN_MINUTES)) return false;
  return (ACTIVITY_TYPES as readonly string[]).includes(session.activityType.toUpperCase() as ActivityType);
}

/** The Monday (YYYY-MM-DD) that starts the ISO calendar week of `dateISO` (D-RCM-5: Mon–Sun weeks). */
export function mondayWeekKey(dateISO: string): string {
  const d = new Date(`${dateISO.slice(0, 10)}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7; // 0=Mon … 6=Sun
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

/** Distinct Mon–Sun weeks that contain at least one of the given (meaningful-session) dates. */
export function countActiveWeeks(dateISOs: readonly string[]): number {
  const weeks = new Set<string>();
  for (const iso of dateISOs) weeks.add(mondayWeekKey(iso));
  return weeks.size;
}

/** Whole weeks between a Monday key and a fixed UTC Monday. Exact integers — UTC has no DST, so every
 *  Monday is a whole multiple of 7 days from the epoch Monday. */
function weekIndex(mondayKey: string): number {
  return Math.round((Date.parse(`${mondayKey}T00:00:00Z`) - Date.parse('1970-01-05T00:00:00Z')) / (7 * 86_400_000));
}

/**
 * SELF-DIRECTED TRAINING BLOCKS — structured development the athlete performed without a program row
 * (D-RCM-29). Six qualifying weeks inside any eight consecutive calendar weeks; see `SELF_DIRECTED_BLOCK`
 * for why the window exists and why consecutive weeks would have been a streak.
 *
 * DISTINCT DAYS, NOT SESSIONS. Three ten-minute walks on one Saturday is one day of training, not a
 * trained week — and counting sessions would let it read as one. This is the whole reason the bucket is
 * a `Set` of dates rather than a tally.
 *
 * Blocks NEVER OVERLAP: each qualifying week is consumed by at most one block. That is what makes
 * "distinct blocks" well-defined for the Legend/Legacy milestone without any taxonomy — the partition of
 * calendar time IS the distinctness rule, and no block can be "run twice" the way a program can.
 *
 * The scan is greedy by earliest completion, which is the optimal strategy for maximum non-overlapping
 * intervals — so no athlete is ever under-credited by unlucky alignment of their qualifying weeks.
 *
 * KNOWN LIMITATION, inherited not introduced: `mondayWeekKey` buckets by UTC, so a Sunday-evening session
 * in UTC−8 lands in the following week. `countActiveWeeks` has always had this. The two-week tolerance is
 * incidentally the mitigation — one mis-bucketed session almost never costs a block — but the real fix
 * (a local date on the workout) is a separate change, because it would move `nativeActiveWeeks` for every
 * athlete in the #1 rank category.
 */
export function countSelfDirectedBlocks(dateISOs: readonly string[]): number {
  const daysByWeek = new Map<string, Set<string>>();
  for (const iso of dateISOs) {
    const day = iso.slice(0, 10);
    const wk = mondayWeekKey(day);
    let days = daysByWeek.get(wk);
    if (!days) daysByWeek.set(wk, (days = new Set()));
    days.add(day);
  }

  const qualifying: number[] = [];
  for (const [wk, days] of daysByWeek) {
    if (days.size >= SELF_DIRECTED_BLOCK.minDaysPerWeek) qualifying.push(weekIndex(wk));
  }
  qualifying.sort((a, b) => a - b);

  const { weeks, windowWeeks } = SELF_DIRECTED_BLOCK;
  let blocks = 0;
  for (let i = 0; i + weeks - 1 < qualifying.length; ) {
    if (qualifying[i + weeks - 1] - qualifying[i] <= windowWeeks - 1) {
      blocks++;
      i += weeks; // consume them — a week belongs to one block only
    } else {
      i++; // too spread out; slide the anchor, losing nothing
    }
  }
  return blocks;
}

/**
 * STRUCTURED DEVELOPMENT — the evidence the Program Progression row actually admits (D-RCM-29).
 *
 * One definition, exported, because this sum is asked for in six places: the promotion gate, both
 * sub-tier evidence branches, and two rows on the What's Next screen. Six copies of one rule is exactly
 * the drift `standards.ts` exists to prevent — and the specific failure would be showing an athlete a
 * different total than the one that promotes them. Callers must call this, never re-add the two fields.
 */
export const structuredDevelopment = (s: RankSignals): number => s.programGraduations + s.selfDirectedBlocks;

/** The distinct variant (CAL Q14). Blocks need no de-duplication — they occupy disjoint spans of calendar
 *  time by construction, so no two blocks are ever the same block counted twice. */
export const distinctStructuredDevelopment = (s: RankSignals): number =>
  s.distinctProgramGraduations + s.selfDirectedBlocks;

/** Active weeks whose Monday falls within the last `windowWeeks` of `asOfISO` — the recent-engagement
 *  signal (native sessions only should be passed in). */
export function countRecentActiveWeeks(dateISOs: readonly string[], asOfISO: string, windowWeeks = RECENT_ENGAGEMENT.windowWeeks): number {
  const asOfMonday = new Date(`${mondayWeekKey(asOfISO)}T00:00:00Z`);
  const cutoff = new Date(asOfMonday);
  cutoff.setUTCDate(cutoff.getUTCDate() - (windowWeeks - 1) * 7);
  const weeks = new Set<string>();
  for (const iso of dateISOs) {
    const wk = mondayWeekKey(iso);
    if (new Date(`${wk}T00:00:00Z`) >= cutoff) weeks.add(wk);
  }
  return weeks.size;
}

// ── improvement requirement check (CAL Q13) ──
export function meetsImprovement(req: ImprovementRequirement, imp: ImprovementSummary): boolean {
  switch (req) {
    case 'none':
      return true;
    case 'first':
      return imp.totalPBs >= 1;
    case 'multi-period':
      return imp.totalPBs >= 3 && imp.hasTwoSeparatedBy30d;
    case 'repeated':
      return imp.totalPBs >= 6 && imp.spanMonths >= 6;
    case 'multi-year':
      return imp.totalPBs >= 10 && imp.distinctYears >= 2;
    case 'multi-phase':
      return imp.totalPBs >= 15 && imp.distinctYears >= 3;
  }
}

/**
 * Convergence: does the athlete meet EVERY requirement to enter `target`? (RCM §14.11)
 *
 * EXPORTED so `standards.ts` can be tested against it. The Rank Progression screen states these same
 * requirements to the athlete, and two implementations of one rule drift the moment either is edited —
 * so the standards module is asserted to agree with this function rather than trusted to.
 */
export function meetsFamilyPromotion(target: import('./thresholds.ts').PromotableFamily, s: RankSignals): boolean {
  const r = FAMILY_PROMOTIONS[target];
  const prestige = r.nativeActiveWeekFloor != null;
  const credit = prestige ? IMPORT_PRESTIGE_CREDIT : 1;
  const effectiveAW = s.nativeActiveWeeks + credit * s.importedActiveWeeks;
  const effectiveSessions = s.nativeSessions + credit * s.importedSessions;
  /*
   * The Program Progression row admits two forms of evidence (D-RCM-29), exactly as the active-weeks and
   * volume rows above already admit two (native and imported, CAL Q11). That precedent is what makes this
   * compatible with §14.11's "no substitute paths": the prohibition is on a surplus in ONE ROW covering a
   * deficit in ANOTHER, and nothing here does that — every row below still binds independently.
   *
   * Blocks take no import multiplier: they are derived from native session dates only. When an import
   * pipeline lands, whether an imported block credits at all is an open question in the amendment.
   */
  const structure = structuredDevelopment(s);

  return (
    s.journeyElapsedDays >= r.timeGateDays &&
    effectiveAW >= r.cumulativeActiveWeeks &&
    (r.nativeActiveWeekFloor == null || s.nativeActiveWeeks >= r.nativeActiveWeekFloor) &&
    effectiveSessions >= r.volumeSessions &&
    structure >= r.programGraduations &&
    (r.distinctProgramGraduations == null || distinctStructuredDevelopment(s) >= r.distinctProgramGraduations) &&
    s.sealedChapters >= r.sealedChapters &&
    s.goalEvents >= r.goalEvents &&
    s.primaryGoalsAchieved >= r.primaryGoalsAchieved &&
    (!r.requiresRecentEngagement || s.recentActiveWeeks >= RECENT_ENGAGEMENT.minActiveWeeks) &&
    meetsImprovement(r.improvement, s.improvement)
  );
}

/** Extra confirming evidence a specific sub-tier step demands beyond within-family AW (RCM §13.7). */
function subTierEvidenceOk(family: RankFamily, targetSubTier: number, s: RankSignals): boolean {
  if (family === 'craftsman' && targetSubTier === 3) return s.improvement.totalPBs >= 1; // first improvement
  // Structured development, not graduations specifically (D-RCM-29) — same evidence rule as the gate, so
  // an athlete cannot be promoted INTO Architect on a block and then held at II for want of one.
  if (family === 'architect' && targetSubTier === 3) return structuredDevelopment(s) >= 1;
  if (family === 'established' && targetSubTier === 4) return s.sealedChapters >= 3; // entry 2 + 1 more
  if (family === 'legend' && targetSubTier === 4) return structuredDevelopment(s) >= 7; // entry 6 + 1 more
  return true;
}

/** Sub-tier within the reached family, from within-family active weeks + confirming evidence (RCM §13.7).
 *  Within-family AW is derived as cumulative − family-entry threshold for a full recompute. */
export function resolveSubTier(family: RankFamily, s: RankSignals): number {
  if (family === 'legacy') return 1; // no sub-tiers
  const totalAW = s.nativeActiveWeeks + s.importedActiveWeeks;
  const withinFamilyAW = Math.max(0, totalAW - FAMILY_ENTRY_ACTIVE_WEEKS[family]);
  const [t2, t3, t4] = SUBTIER_ACTIVE_WEEKS[family];
  let sub = 1;
  if (withinFamilyAW >= t2 && subTierEvidenceOk(family, 2, s)) sub = 2;
  else return sub;
  if (withinFamilyAW >= t3 && subTierEvidenceOk(family, 3, s)) sub = 3;
  else return sub;
  if (withinFamilyAW >= t4 && subTierEvidenceOk(family, 4, s)) sub = 4;
  return sub;
}

/**
 * Resolve the exact rank an athlete has EARNED from their signals. Walks the family ladder Foundation →
 * Legacy, stopping at the first transition whose convergence requirements aren't all met, then resolves
 * the sub-tier within the family reached. Rank never decreases (RSA §3.3) — callers persist the MAX of
 * this and the stored rank.
 */
export function resolveRank(s: RankSignals): ResolvedRank {
  let family: RankFamily = 'foundation';
  for (const target of FAMILIES.slice(1) as import('./thresholds.ts').PromotableFamily[]) {
    if (meetsFamilyPromotion(target, s)) family = target;
    else break;
  }
  const subTier = resolveSubTier(family, s);
  return { family, subTier, rankLevel: rankLevel(family, subTier), display: rankDisplay(family, subTier) };
}
