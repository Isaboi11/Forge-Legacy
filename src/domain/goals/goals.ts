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
}

export const GOAL_NAME_MAX = 60;
export const UNIT_MAX = 12;
export const UNIT_CHIPS = ['lb', 'kg', 'reps', 'mi', 'min', '× / week'] as const;

export const isQuantifiable = (g: Pick<Goal, 'target'>): boolean => g.target != null;
export const isAchieved = (g: Pick<Goal, 'achievedAt'>): boolean => g.achievedAt != null;

/** Progress toward the target, 0–100. A narrative goal is 0 until achieved, then 100. */
export function progressPct(g: Pick<Goal, 'target' | 'current' | 'achievedAt'>): number {
  if (g.target == null) return g.achievedAt != null ? 100 : 0;
  if (g.target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((g.current / g.target) * 100)));
}

/** Has a quantifiable goal reached its target? (Used to auto-mark achieved on a progress update.) */
export const meetsTarget = (g: Pick<Goal, 'target' | 'current'>): boolean =>
  g.target != null && g.target > 0 && g.current >= g.target;

/** "225 / 405 lb" · "12 reps" · "In progress" — the goal's current-state line. */
export function progressLabel(g: Pick<Goal, 'target' | 'current' | 'unit' | 'achievedAt'>): string {
  if (g.target == null) return g.achievedAt != null ? 'Achieved' : 'In progress';
  const unit = g.unit ? ` ${g.unit}` : '';
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
