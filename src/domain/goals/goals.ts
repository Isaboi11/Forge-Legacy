/**
 * Goals (G-1) — the pure model behind the chapter-scoped goal system.
 *
 * A goal is QUANTIFIABLE (a numeric `target` + `unit`, progress via a manually-updated `current`) or
 * NARRATIVE (no target — a commitment marked achieved by hand). Rules from the LOCKED G-1 spec:
 *   GD-D1  one PRIMARY per chapter, unlimited secondary.
 *   GD-D4  achieve + remain visible; the primary, once achieved, stays pinned at the top.
 *   GD-D5  no delete/abandon (so there is no remove path — reflected by the absence of one here).
 *
 * Kept free of data/JSON imports so it runs under `node --test`.
 */

/** How a quantifiable goal's progress is tracked. 'manual' = the athlete types it (default); the rest are
 *  computed from workout data (Hybrid Progress Model). */
export type MetricKind = 'manual' | 'exercise_max' | 'distance_total' | 'workout_count' | 'volume_total' | 'time_total' | 'pr_count' | 'body_weight' | 'body_measure';
/** Which way is "better". 'up' = reach/accumulate (default); 'down' = reduce toward the target (cut). */
export type MetricDir = 'up' | 'down';

export interface Goal {
  id: string;
  chapterId: string;
  name: string;
  /** null = a narrative goal (no number to hit). */
  target: number | null;
  unit: string | null;
  current: number;
  isPrimary: boolean;
  targetDate: string | null;
  /** null = in progress. */
  achievedAt: string | null;
  createdAt: string;
  metricKind: MetricKind;
  /** exercise name (exercise_max) · activity modality (distance_total) · measurement column (body_measure); null otherwise. */
  metricKey: string | null;
  /** window anchor for cumulative metrics; null for exercise_max / body / manual. */
  metricStartedAt: string | null;
  /** 'up' (default) or 'down' (lower is better). */
  metricDir: MetricDir;
  /** baseline a level metric (body / later times) is measured from; null for accumulate / ratio metrics. */
  metricStartValue: number | null;
}

/** Auto-tracked = progress comes from workout data, not a hand-typed number. */
export const isAutoTracked = (g: Pick<Goal, 'metricKind'>): boolean => g.metricKind !== 'manual';

/** Cumulative metrics count over a window (anchored at metricStartedAt); exercise_max is an all-time peak. */
export const isCumulativeMetric = (kind: MetricKind): boolean =>
  kind === 'distance_total' || kind === 'workout_count' || kind === 'volume_total' || kind === 'time_total' || kind === 'pr_count';

/** Level metrics track a current reading against a baseline (not from zero) — body composition (later: times). */
export const usesBaseline = (kind: MetricKind): boolean => kind === 'body_weight' || kind === 'body_measure';

// ── body goals: direction is asked, not guessed ────────────────────────────────
//
// "Weight" is not a direction. Two athletes typing 15 into the same box mean opposite things — one is
// cutting to 175, the other is adding 15 to build. Direction used to be INFERRED by comparing the target
// to the latest weigh-in, which is a guess that is silently wrong in the two cases that matter most: an
// athlete with no weigh-in yet (nothing to compare, so it defaulted to "up" — a cut recorded as a gain),
// and one whose reading crosses the target early. It is a question now, and it is required.

/**
 * How a body goal's number was entered. The same goal is naturally said either way — "get to 180" or
 * "add 15" — and only ONE of them can be stored, because a target that keeps re-deriving from a moving
 * baseline would chase the athlete. A change is resolved against the baseline at save time and stored as
 * the absolute reading it means.
 */
export type TargetMode = 'target' | 'change';

/** What each direction is CALLED for this metric — 'Lose / Gain' for weight, 'Shrink / Grow' for a tape measure. */
export const directionLabels = (kind: MetricKind): { down: string; up: string } =>
  kind === 'body_measure' ? { down: 'Shrink', up: 'Grow' } : { down: 'Lose', up: 'Gain' };

export interface BodyTargetInput {
  mode: TargetMode;
  dir: MetricDir;
  /** The number typed: an absolute reading in 'target' mode, an amount to move by in 'change' mode. */
  value: number | null;
  /** The athlete's latest logged reading. null = none yet, so a change has nothing to start from. */
  baseline: number | null;
}

/** The absolute reading this input means, or null when it cannot be resolved into one. */
export function resolveBodyTarget(i: BodyTargetInput): number | null {
  if (i.value == null || !Number.isFinite(i.value) || i.value <= 0) return null;
  if (i.mode === 'target') return i.value;
  if (i.baseline == null || i.baseline <= 0) return null;
  const t = i.dir === 'down' ? i.baseline - i.value : i.baseline + i.value;
  return t > 0 ? Number(t.toFixed(2)) : null;
}

/**
 * What is wrong with a body goal, in the athlete's own terms — or null when it holds together.
 *
 * These are the contradictions the old inference swallowed by quietly rewriting the direction: "Lose,
 * goal 200" from a 185 lb athlete used to save as a GAIN. A goal that disagrees with itself is worth
 * stopping at the field, not resolving behind the athlete's back.
 */
export function bodyTargetProblem(i: BodyTargetInput, unit: string): string | null {
  if (i.value == null || i.value <= 0) return null; // the generic target validator already says this
  const u = unit ? ` ${unit}` : '';
  const noun = i.dir === 'down' ? 'below' : 'above';

  if (i.mode === 'change') {
    if (i.baseline == null || i.baseline <= 0) return 'Add your current reading first — a change needs somewhere to start.';
    if (i.dir === 'down' && i.value >= i.baseline) return `You can't lose ${trimNum(i.value)}${u} from ${trimNum(i.baseline)}${u}.`;
    return null;
  }

  if (i.baseline == null || i.baseline <= 0) return null; // no reading to contradict — the direction stands as chosen
  if (i.dir === 'down' && i.value >= i.baseline) return `${trimNum(i.value)}${u} is not ${noun} your current ${trimNum(i.baseline)}${u}.`;
  if (i.dir === 'up' && i.value <= i.baseline) return `${trimNum(i.value)}${u} is not ${noun} your current ${trimNum(i.baseline)}${u}.`;
  return null;
}

/** "185 lb → 200 lb · gain 15 lb" — the journey a body goal will actually track. Null until it resolves. */
export function bodyTargetSummary(i: BodyTargetInput, unit: string, kind: MetricKind): string | null {
  const target = resolveBodyTarget(i);
  if (target == null || i.baseline == null || i.baseline <= 0) return null;
  const u = unit ? ` ${unit}` : '';
  const delta = Math.abs(Number((target - i.baseline).toFixed(2)));
  const verb = directionLabels(kind)[i.dir].toLowerCase();
  return `${trimNum(i.baseline)}${u} → ${trimNum(target)}${u} · ${verb} ${trimNum(delta)}${u}`;
}

export const GOAL_NAME_MAX = 60;
export const UNIT_MAX = 12;
export const UNIT_CHIPS = ['lb', 'kg', 'reps', 'mi', 'min', '× / week'] as const;

export const isQuantifiable = (g: Pick<Goal, 'target'>): boolean => g.target != null;
export const isAchieved = (g: Pick<Goal, 'achievedAt'>): boolean => g.achievedAt != null;

/** The shape progress/achievement read. The direction + baseline fields are optional so pre-direction
 *  callers and tests (passing just target/current/achievedAt) keep the original higher-is-better behaviour. */
type ProgressShape = Pick<Goal, 'target' | 'current' | 'achievedAt'> & { metricDir?: MetricDir; metricStartValue?: number | null };
const clampPct = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

/**
 * ⚠ WHICH WAY THIS GOAL ACTUALLY TRAVELS — the numbers first, the stored flag only as a fallback.
 *
 * ══ THE BUG THIS EXISTS TO FIX ══
 *
 * Reported by the PO: *"I weigh 195 and I'm trying to get to 190… the bar is completely full but
 * shouldn't be."* Two different stored states produced that same full bar, and both are this function:
 *
 *   · `metricDir = 'up'` with a baseline (goals saved before the editor asked the question defaulted to
 *     'up'). `span = target - start = 190 − 195 = −5`, which is `<= 0`, so it fell to `meetsTarget` —
 *     and `meetsTarget` on an 'up' goal is `current >= target`, i.e. 195 ≥ 190. **A cut read as
 *     complete because the athlete had not started it yet.**
 *   · No baseline at all. It fell to the accumulate ratio `current / target` = 195 / 190 = 103% → 100.
 *
 * A baseline and a target TOGETHER are unambiguous: nobody sets a target of 190 from 195 and means
 * "go up". So when both exist, they decide, and a stored direction that disagrees cannot make the bar
 * lie. The stored `metricDir` still governs the LABELS and `bodyTargetProblem`'s contradiction warning,
 * which is the right place to surface a disagreement — a bar cannot explain itself, a sentence can.
 */
/* Deliberately narrower than `ProgressShape` — `meetsTarget` has never taken `achievedAt` (whether a
   goal is MARKED achieved is a different question from whether the number satisfies it), and widening
   this would force every caller to carry a field it has no business knowing. */
type DirShape = Pick<Goal, 'target'> & { metricDir?: MetricDir; metricStartValue?: number | null };

const travelDir = (g: DirShape): MetricDir => {
  const start = g.metricStartValue ?? null;
  if (start != null && g.target != null && start !== g.target) return g.target < start ? 'down' : 'up';
  return g.metricDir ?? 'up';
};

/**
 * Progress toward the target, 0–100. Three shapes:
 *  · narrative (no target) — 0 until achieved, then 100.
 *  · level (a baseline is set) — measured from the baseline toward the target, either direction.
 *  · accumulate / ratio (no baseline, ascending) — `current / target`.
 */
export function progressPct(g: ProgressShape): number {
  if (g.target == null) return g.achievedAt != null ? 100 : 0;
  const dir = travelDir(g);
  const start = g.metricStartValue ?? null;
  if (start != null) {
    const span = dir === 'down' ? start - g.target : g.target - start;
    if (span <= 0) return meetsTarget({ ...g, metricDir: dir }) ? 100 : 0; // baseline IS the target
    const done = dir === 'down' ? start - g.current : g.current - start;
    return clampPct((done / span) * 100);
  }
  /*
   * ⚠ A DESCENDING GOAL HAS NO RATIO, and `current / target` is not merely imprecise for one — it is
   * backwards. The further you are from losing the weight, the fuller it drew the bar, which is how 195
   * against a 190 target rendered as finished.
   *
   * With no baseline there is nothing to measure a JOURNEY against, so the only honest answers are
   * "arrived" and "not yet". It self-corrects on the next weigh-in: `syncAutoGoals` captures the first
   * real reading as the baseline, and from then on the bar moves a pound at a time.
   */
  if (dir === 'down') return meetsTarget({ ...g, metricDir: dir }) ? 100 : 0;
  if (g.target <= 0) return 0;
  return clampPct((g.current / g.target) * 100);
}

/** Has a quantifiable goal reached its target? (Used to auto-mark achieved on a progress update.) A
 *  'down' goal needs a real reading (`current > 0`) so a not-yet-logged body goal never auto-completes.
 *
 *  ⚠ Reads `travelDir`, not the raw flag. A cut stored as 'up' — every body goal saved before the editor
 *  asked — would otherwise AUTO-COMPLETE on the athlete's first weigh-in, because weighing more than
 *  your target satisfies `current >= target`. That marks a goal achieved on the day it was started. */
export const meetsTarget = (
  g: Pick<Goal, 'target' | 'current'> & { metricDir?: MetricDir; metricStartValue?: number | null },
): boolean => {
  if (g.target == null) return false;
  return travelDir(g) === 'down' ? g.current > 0 && g.current <= g.target : g.target > 0 && g.current >= g.target;
};

/** "225 / 405 lb" (accumulate) · "195 lb → 185 lb" (level journey) · "In progress" (narrative). */
export function progressLabel(g: Pick<Goal, 'target' | 'current' | 'unit' | 'achievedAt'> & { metricStartValue?: number | null }): string {
  if (g.target == null) return g.achievedAt != null ? 'Achieved' : 'In progress';
  const unit = g.unit ? ` ${g.unit}` : '';
  if (g.metricStartValue != null) return `${trimNum(g.current)}${unit} → ${trimNum(g.target)}${unit}`;
  return `${trimNum(g.current)} / ${trimNum(g.target)}${unit}`;
}

const trimNum = (n: number): string => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

export interface GoalSections {
  /** The chapter's primary goal, if one is set — pinned at the top whether in-progress or achieved. */
  primary: Goal | null;
  /** Secondary goals still in progress, newest first. */
  active: Goal[];
  /** Achieved secondary goals (the primary, even when achieved, stays in `primary`), newest first. */
  achieved: Goal[];
}

const byNewest = (a: Goal, b: Goal) => (b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0);

/** Split a chapter's goals into the G-1 layout: primary (pinned) · active secondary · achieved secondary. */
export function goalSections(goals: readonly Goal[]): GoalSections {
  const primary = goals.find((g) => g.isPrimary) ?? null;
  const secondary = goals.filter((g) => !g.isPrimary);
  return {
    primary,
    active: secondary.filter((g) => !isAchieved(g)).sort(byNewest),
    achieved: secondary.filter((g) => isAchieved(g)).sort(byNewest),
  };
}

// ── progress history (G-2 · the log of updates) ────────────────────────────────

export interface ProgressEntry {
  id: string;
  fromValue: number;
  toValue: number;
  createdAt: string;
}

/** "365 → 405 lb" — one history row, unit-aware, trailing zeros trimmed. */
export function progressEntryLine(e: Pick<ProgressEntry, 'fromValue' | 'toValue'>, unit: string | null): string {
  const u = unit ? ` ${unit}` : '';
  return `${trimNum(e.fromValue)} → ${trimNum(e.toValue)}${u}`;
}

/** "Jun 14" — a compact history date, parsed as a plain calendar day (no timezone shift). */
export function historyDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mon = months[Number(m[2]) - 1];
  return mon ? `${mon} ${Number(m[3])}` : '';
}

export interface GoalForm {
  name: string;
  /** Raw target text from the field; '' = narrative. */
  target: string;
  unit: string;
}

/** Parse the raw target field to a number, or null for a narrative goal. Rejects non-positive/garbage. */
export function parseTarget(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** A goal needs a name; a target is optional, but a non-empty target must be a positive number. */
export function validateGoal(form: { name: string; target: string }): { ok: boolean; reason?: string } {
  const name = form.name.trim();
  if (!name) return { ok: false, reason: 'Name your goal.' };
  if (name.length > GOAL_NAME_MAX) return { ok: false, reason: `Keep the name under ${GOAL_NAME_MAX} characters.` };
  const t = form.target.trim();
  if (t !== '' && parseTarget(t) == null) return { ok: false, reason: 'A target must be a positive number, or leave it blank.' };
  return { ok: true };
}

/**
 * Order unit chips by relevance to the goal name (a "squat 405" surfaces lb first; a "run" surfaces mi),
 * matching the design's smart-ordering, with the rest following.
 */
export function orderedUnits(name: string): string[] {
  const n = name.toLowerCase();
  const boosted: string[] = [];
  if (/run|jog|walk|ride|swim|mile|marathon|5k|10k/.test(n)) boosted.push('mi', 'min');
  if (/squat|bench|deadlift|press|lift|lb|pull|curl/.test(n)) boosted.push('lb', 'reps');
  if (/week|day|streak|consisten|session/.test(n)) boosted.push('× / week');
  const seen = new Set(boosted);
  return [...boosted, ...UNIT_CHIPS.filter((u) => !seen.has(u))];
}
