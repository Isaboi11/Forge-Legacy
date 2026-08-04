/**
 * Squad Goal Detail — the derived numbers, pure so they can be tested.
 *
 * Pace, projection and milestones are all read off the same weekly series the chart draws, rather than
 * computed in SQL or in the render. The rule that matters is that none of them may assert something the
 * data does not support: a squad with no recent weeks has no pace, and a squad with no pace has no
 * projected close — those read as absent rather than as zero or as "today".
 */

export interface GoalWeek {
  /** ISO timestamp of the week's start. */
  weekStart: string;
  value: number;
}

/** Weeks the pace looks back over. Four is long enough to survive one quiet week, short enough to be recent. */
export const PACE_WEEKS = 4;

/**
 * The squad's recent rate, per week.
 *
 * Excludes the CURRENT week, which is always partial — including it drags the average down every Monday
 * and would have the projection slip a week further out each time somebody opened the screen.
 * Null when there is no completed week to measure.
 */
export function recentPace(weeks: readonly GoalWeek[]): number | null {
  const completed = weeks.slice(0, -1);
  if (completed.length === 0) return null;
  const window = completed.slice(-PACE_WEEKS);
  const total = window.reduce((n, w) => n + w.value, 0);
  return total / window.length;
}

/**
 * When this closes at the current rate — or null when nothing honest can be said.
 *
 * Null on three counts: already met, no measurable pace, and a pace of zero. The third is the one worth
 * naming: a squad that logged nothing for a month has a mathematically infinite projection, and drawing
 * "Projected close: never" at somebody is the opposite of what this product does.
 */
export function projectedClose(done: number, target: number, pace: number | null, from: Date): Date | null {
  if (done >= target) return null;
  if (pace == null || pace <= 0) return null;
  const weeksLeft = (target - done) / pace;
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + Math.ceil(weeksLeft * 7));
  return d;
}

export interface Milestone {
  value: number;
  reached: boolean;
  /** ISO date the squad crossed it, when the weekly series can say. Null for one still ahead. */
  crossedAt: string | null;
  /** True for the last one — the target itself, the one that closes the goal. */
  isTarget: boolean;
}

/**
 * Five waypoints at fifths of the target, the last being the target itself.
 *
 * Fifths rather than round hundreds because a target of 500 and a target of 30 both deserve a rail with
 * something on it — hard-coding 100/200/300/400/500 works for exactly one goal.
 */
export function milestones(target: number, done: number, weeks: readonly GoalWeek[]): Milestone[] {
  if (target <= 0) return [];
  const steps = 5;
  const out: Milestone[] = [];
  for (let i = 1; i <= steps; i += 1) {
    const value = Math.round((target / steps) * i);
    out.push({ value, reached: done >= value, crossedAt: crossedWeek(weeks, value), isTarget: i === steps });
  }
  return out;
}

/**
 * Which week the running total first passed `value`.
 *
 * The series only covers the last eight weeks, so a milestone crossed before that window returns null —
 * "we passed 100 at some point" is true but useless, and a DATE invented to fill the slot would be a
 * specific false claim. Absent renders as absent.
 */
function crossedWeek(weeks: readonly GoalWeek[], value: number): string | null {
  let running = 0;
  for (const w of weeks) {
    running += w.value;
    if (running >= value) return w.weekStart;
  }
  return null;
}

/** `62%`, floored — a goal at 99.6% has not been met, and rounding it to 100 would say it had. */
export function pctOf(done: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.floor((done / target) * 100)));
}

/**
 * A member's share of the work done so far.
 *
 * Of the TOTAL SO FAR, not of the target: "18% of the goal" while the squad is halfway there reads as a
 * fraction of a thing that has not happened yet. Zero total is 0%, not a division by zero.
 */
export function sharePct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

/** Bars are drawn against the TOP contributor, so the shape of the list is legible at any scale. */
export function barPct(value: number, top: number): number {
  if (top <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / top) * 100)));
}
