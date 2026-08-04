import {
  FAMILY_PROMOTIONS,
  IMPORT_PRESTIGE_CREDIT,
  RECENT_ENGAGEMENT,
  SUBTIER_ACTIVE_WEEKS,
  FAMILY_ENTRY_ACTIVE_WEEKS,
  type ImprovementRequirement,
  type PromotableFamily,
  type RankFamily,
} from './thresholds.ts';
import { distinctStructuredDevelopment, structuredDevelopment, type RankSignals } from './rank.ts';

/**
 * THE STANDARDS, IN WORDS AND NUMBERS — what each rank actually asks for, and how far along you are.
 *
 * The Rank Progression screen showed seven families and twenty-eight badges and did not state a single
 * requirement. An athlete could see the whole ladder and learn nothing about how to climb it, which makes
 * a rank feel handed out rather than earned — the opposite of what the system is for.
 *
 * ══ THIS MUST NOT BE A SECOND OPINION ══
 *
 * The obvious way to build this is to re-read `FAMILY_PROMOTIONS` and write fresh comparisons for the
 * screen. That produces two implementations of one rule, and the day someone edits `meetsFamilyPromotion`
 * the screen keeps confidently displaying the old bar. So every row below computes its `have` with the
 * SAME expression the engine uses — the prestige import credit included — and a test asserts the
 * equivalence directly: every row met ⟺ the engine promotes. If they ever diverge, that test fails.
 *
 * ══ WHAT IS OMITTED, AND WHY ══
 *
 * A requirement of zero is not a requirement. Builder asks for no programs, no chapters and no goals, and
 * printing "0 of 0" three times would bury the two numbers that matter (6 active weeks, 12 sessions)
 * under rows that can never be anything but satisfied.
 */

export interface StandardRow {
  key: string;
  /** What the athlete is being asked for, in their words rather than the model's. */
  label: string;
  /** Where they stand, in the same units as `need`. Null when it isn't a countable thing. */
  have: number | null;
  need: number;
  met: boolean;
  /** Units suffix for display ('weeks', 'days', …). Empty for a bare count. */
  unit: string;
  /** Set on the rows that aren't a simple ≥ comparison, so the screen can say what they mean. */
  detail?: string;
}

/** The improvement shapes, said plainly. Thresholds mirror `meetsImprovement` exactly. */
const IMPROVEMENT: Record<ImprovementRequirement, { label: string; need: number; detail: string } | null> = {
  none: null,
  first: { label: 'A personal best', need: 1, detail: 'Any one PR — the first proof you moved.' },
  'multi-period': { label: 'Personal bests', need: 3, detail: 'Three PRs, two of them at least 30 days apart.' },
  repeated: { label: 'Personal bests', need: 6, detail: 'Six PRs spanning at least six months.' },
  'multi-year': { label: 'Personal bests', need: 10, detail: 'Ten PRs across two different years.' },
  'multi-phase': { label: 'Personal bests', need: 15, detail: 'Fifteen PRs across three different years.' },
};

/**
 * Every requirement for entering `target`, with the athlete's standing against each.
 *
 * `signals` may be null — the standards are a public reference and should render for someone with no
 * history at all, showing what is being asked rather than a wall of zeros they have to earn first.
 */
export function familyStandards(target: PromotableFamily, signals: RankSignals | null): StandardRow[] {
  const r = FAMILY_PROMOTIONS[target];
  const prestige = r.nativeActiveWeekFloor != null;
  const credit = prestige ? IMPORT_PRESTIGE_CREDIT : 1;

  // The engine's own arithmetic, not a re-derivation of it.
  const effectiveAW = signals ? signals.nativeActiveWeeks + credit * signals.importedActiveWeeks : null;
  const effectiveSessions = signals ? signals.nativeSessions + credit * signals.importedSessions : null;
  // Literally the engine's functions, not a copy of the sum — the athlete must never be shown a total
  // different from the one that promotes them (D-RCM-29).
  const structure = signals ? structuredDevelopment(signals) : null;
  const distinctStructure = signals ? distinctStructuredDevelopment(signals) : null;

  const rows: StandardRow[] = [];
  const add = (key: string, label: string, have: number | null, need: number, unit: string, detail?: string) => {
    if (need <= 0) return; // a requirement of zero is not a requirement
    rows.push({ key, label, have, need, unit, met: have != null && have >= need, detail });
  };

  add('days', 'Time on the path', signals?.journeyElapsedDays ?? null, r.timeGateDays, 'days',
    'Measured from your first logged session. It cannot be hurried.');
  add('activeWeeks', 'Active weeks', effectiveAW, r.cumulativeActiveWeeks, 'weeks',
    'A week counts when it holds at least one real session.');
  if (r.nativeActiveWeekFloor != null) {
    add('nativeWeeks', 'Weeks logged in Forge', signals?.nativeActiveWeeks ?? null, r.nativeActiveWeekFloor, 'weeks',
      'Imported history counts at half rate toward the line above; this line it does not count for at all.');
  }
  add('sessions', 'Sessions', effectiveSessions, r.volumeSessions, '',
    'Ten minutes or more, any activity — nothing is excluded for not being lifting.');
  /*
   * The detail line deliberately understates the rule: it says "six weeks, three or more days a week" and
   * omits the eight-week window and the two tolerated weeks. Where this screen must be imprecise it is
   * imprecise only in the direction that can pleasantly surprise — RS-D16 forbids hidden BLOCKERS, not
   * hidden leniency — and, more importantly, the athlete is given nothing to protect. Print the window
   * and there is a streak on the screen.
   */
  add('programs', 'Programs or blocks', structure, r.programGraduations, '',
    'A program you graduated, or a training block you ran yourself — six weeks of training three or more days a week. They count the same.');
  if (r.distinctProgramGraduations != null) {
    add('distinctPrograms', 'Different programs or blocks', distinctStructure,
      r.distinctProgramGraduations, '',
      'Running the same program twice counts once. Blocks never overlap, so every block is its own.');
  }
  add('chapters', 'Chapters sealed', signals?.sealedChapters ?? null, r.sealedChapters, '');
  add('goals', 'Goals resolved', signals?.goalEvents ?? null, r.goalEvents, '',
    'Resolved when the chapter holding them is sealed.');
  add('primaryGoals', 'Primary goals achieved', signals?.primaryGoalsAchieved ?? null, r.primaryGoalsAchieved, '',
    'The one goal a chapter is built around. A hard floor, not a weight.');
  if (r.requiresRecentEngagement) {
    add('recent', 'Recently active', signals?.recentActiveWeeks ?? null, RECENT_ENGAGEMENT.minActiveWeeks, 'weeks',
      `Of the last ${RECENT_ENGAGEMENT.windowWeeks} weeks. The higher ranks ask that you still be training.`);
  }

  const imp = IMPROVEMENT[r.improvement];
  if (imp) {
    rows.push({
      key: 'improvement',
      label: imp.label,
      have: signals?.improvement.totalPBs ?? null,
      need: imp.need,
      unit: '',
      // Deliberately NOT `have >= need`: the shapes carry a second condition (separation, span, distinct
      // years) that a count alone cannot express, so claiming "met" from the count would be a lie the
      // athlete finds out about at the promotion that does not come.
      met: signals ? meetsImprovementShape(r.improvement, signals) : false,
      detail: imp.detail,
    });
  }

  return rows;
}

/** Mirrors `meetsImprovement`; kept here so this module has no import cycle back into the engine. */
function meetsImprovementShape(req: ImprovementRequirement, s: RankSignals): boolean {
  const imp = s.improvement;
  switch (req) {
    case 'none': return true;
    case 'first': return imp.totalPBs >= 1;
    case 'multi-period': return imp.totalPBs >= 3 && imp.hasTwoSeparatedBy30d;
    case 'repeated': return imp.totalPBs >= 6 && imp.spanMonths >= 6;
    case 'multi-year': return imp.totalPBs >= 10 && imp.distinctYears >= 2;
    case 'multi-phase': return imp.totalPBs >= 15 && imp.distinctYears >= 3;
  }
}

/** True when every stated requirement is satisfied — the convergence rule, read off the rows. */
export const allMet = (rows: readonly StandardRow[]): boolean => rows.every((r) => r.met);

/**
 * The active weeks each sub-tier inside a family asks for, and where the athlete stands.
 *
 * Within-family weeks reset on entry (D-RCM-11), so this is cumulative minus the family's entry
 * threshold — the same derivation `resolveSubTier` performs.
 */
export interface SubTierRow {
  tier: 2 | 3 | 4;
  weeks: number;
  have: number | null;
  met: boolean;
  /** The extra proof this specific step asks for beyond weeks, where there is one (RCM §13.7). */
  evidence?: string;
}

/* Mirrors `subTierEvidenceOk` in the engine — keys and copy both. The two program lines said "a program
 * finished", which is a flat lie to an athlete who reached this family on self-directed blocks and can
 * satisfy the same step the same way (D-RCM-29). */
const SUBTIER_EVIDENCE: Partial<Record<RankFamily, Partial<Record<2 | 3 | 4, string>>>> = {
  craftsman: { 3: 'and a personal best' },
  architect: { 3: 'and a program or block finished' },
  established: { 4: 'and a third chapter sealed' },
  legend: { 4: 'and a seventh program or block' },
};

export function subTierStandards(family: RankFamily, signals: RankSignals | null): SubTierRow[] {
  if (family === 'legacy') return []; // Legacy has no sub-tiers — it is the end of the ladder
  const [t2, t3, t4] = SUBTIER_ACTIVE_WEEKS[family];
  const total = signals ? signals.nativeActiveWeeks + signals.importedActiveWeeks : null;
  const within = total == null ? null : Math.max(0, total - FAMILY_ENTRY_ACTIVE_WEEKS[family]);
  return ([[2, t2], [3, t3], [4, t4]] as const).map(([tier, weeks]) => ({
    tier,
    weeks,
    have: within,
    met: within != null && within >= weeks,
    evidence: SUBTIER_EVIDENCE[family]?.[tier],
  }));
}
