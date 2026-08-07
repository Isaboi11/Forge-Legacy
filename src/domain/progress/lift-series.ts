/**
 * How a lift is going, from what was actually logged.
 *
 * ══ WHAT THIS REPLACED, AND WHY ══
 *
 * The Progress Hub's strength charts were built from `personal_records` — a table whose rows exist only
 * when a set BEATS the previous best (see `save_workout`, migration 0010). So the line an athlete read
 * as "how my bench is going" was a plot of the days they broke a record, with every ordinary session
 * missing. Three consequences, all of them reported by the PO as one complaint:
 *
 *   · A lift trained hard for months without a PR had ONE point, or none, and drew a flat line.
 *   · A lift never PR'd at all was not in the list of metrics to select, so it could not be charted.
 *   · Nothing could ever go DOWN. A deload, an injury, a bad month — invisible, by construction.
 *
 * The series is now one point per DAY TRAINED. That is the question the athlete is asking.
 *
 * ══ THE VALUE IS A WEIGHT ACTUALLY MOVED, NEVER AN ESTIMATE ══
 *
 * The old series plotted Epley e1RM. `metrics.ts` already settled this for records and the reasoning
 * transfers whole: *"an athlete told they set a 330 lb record never lifted 330 lb"*, and the estimate
 * inflates badly with reps — 60 × 25 computes to 110, which would outrank a genuine 80 lb triple. A
 * chart built on it says the lift is climbing on a day the athlete added reps at a lighter weight.
 *
 * So: the point is the HEAVIEST WEIGHT MOVED that day, and it carries the reps it was moved for. The
 * reps are not decoration — 225 × 3 and 225 × 10 are the same point on the line and very different
 * training, so the detail chart labels them and the athlete reads the line correctly.
 *
 * ══ A BODYWEIGHT LIFT IS CHARTED IN REPS ══
 *
 * Pull-ups, push-ups and dips have no weight to plot, and `weight: 0` means BODYWEIGHT in this app (an
 * answer), not "nothing entered" (`null`). Plotting them on a weight axis would draw a flat line at
 * zero for a lift that is genuinely improving. An exercise that has NEVER carried load is therefore a
 * REPS metric: its point is the most reps in a single set that day. An exercise that has EVER been
 * loaded stays a weight metric, and its bodyweight days are not points — mixing the two axes on one
 * line would put 12 (reps) below 135 (lb) and call it a collapse.
 */

export type MetricUnit = 'weight' | 'reps';

export interface MetricPoint {
  /** ISO day (YYYY-MM-DD). */
  date: string;
  /** Pounds for a weight metric; reps for a reps metric. */
  value: number;
  /** Reps at the top set — weight metrics only. Null on a reps metric, where the value IS the reps. */
  reps: number | null;
  /** This day set a personal record on this lift (`personal_records`), so the chart can mark it. */
  isPR: boolean;
}

export interface MetricSeries {
  /** The exercise name — also the key a saved metric selection persists. */
  id: string;
  name: string;
  category: string;
  unit: MetricUnit;
  /** Ascending by date. Never empty: a series with no points is not built. */
  points: MetricPoint[];
  /** The most recent point's value. */
  current: number;
  /** Up on the previous session. A single-point series is not improving — it has nothing to beat. */
  improving: boolean;
  /** Days this lift was trained — the honest denominator behind the line. */
  sessions: number;
}

/** One logged set, flattened out of the workout → exercise → set nesting. */
export interface LoggedSet {
  /** ISO day the session started. */
  date: string;
  exercise: string;
  /** Pounds. `0` is bodyweight (an answer); `null` is nothing entered (an absence). */
  weightLb: number | null;
  reps: number | null;
}

/** `exercise|YYYY-MM-DD` — the key naming a day a lift was trained. */
const dayKey = (exercise: string, date: string) => `${exercise}|${date}`;

/**
 * Build one series per exercise from every set the athlete has logged.
 *
 * `prDays` is the set of `exercise|date` keys that produced a personal record — read from
 * `personal_records`, which stays the authority on what a record IS. This function does not decide
 * records; it marks the days that had one.
 */
export function buildLiftSeries(sets: readonly LoggedSet[], prDays: ReadonlySet<string> = new Set()): MetricSeries[] {
  // exercise → day → the best weighted set and the best unweighted set that day
  const byExercise = new Map<string, Map<string, { topLb: number; topReps: number; bestReps: number }>>();
  const everLoaded = new Set<string>();

  for (const s of sets) {
    if (!s.exercise || !s.date) continue;
    const reps = s.reps != null && s.reps > 0 ? s.reps : null;
    if (reps == null) continue; // a set with no reps recorded is not a data point about anything

    const days = byExercise.get(s.exercise) ?? new Map();
    byExercise.set(s.exercise, days);
    const cur = days.get(s.date) ?? { topLb: 0, topReps: 0, bestReps: 0 };

    if (s.weightLb != null && s.weightLb > 0) {
      everLoaded.add(s.exercise);
      // Heaviest wins; at equal weight the longer set wins, so "225 × 10" is not reported as "225 × 3".
      if (s.weightLb > cur.topLb || (s.weightLb === cur.topLb && reps > cur.topReps)) {
        cur.topLb = s.weightLb;
        cur.topReps = reps;
      }
    }
    if (reps > cur.bestReps) cur.bestReps = reps;
    days.set(s.date, cur);
  }

  const out: MetricSeries[] = [];
  for (const [exercise, days] of byExercise) {
    const unit: MetricUnit = everLoaded.has(exercise) ? 'weight' : 'reps';
    const points: MetricPoint[] = [];

    for (const [date, d] of days) {
      // On a weight metric a bodyweight-only day contributes NO point rather than a zero — the athlete
      // trained, and the honest statement about their loaded progression is that this day says nothing
      // about it. A zero would draw a crash.
      if (unit === 'weight' && d.topLb <= 0) continue;
      points.push({
        date,
        value: unit === 'weight' ? Math.round(d.topLb) : d.bestReps,
        reps: unit === 'weight' ? d.topReps : null,
        isPR: prDays.has(dayKey(exercise, date)),
      });
    }
    if (!points.length) continue;

    points.sort((a, b) => a.date.localeCompare(b.date));
    const current = points[points.length - 1].value;
    const prev = points.length > 1 ? points[points.length - 2].value : null;

    out.push({
      id: exercise,
      name: exercise,
      category: unit === 'weight' ? 'Strength' : 'Bodyweight',
      unit,
      points,
      current,
      improving: prev != null && current > prev,
      sessions: points.length,
    });
  }

  // Most recently trained first — the default four cards are the lifts the athlete is actually on.
  return out.sort((a, b) => {
    const at = a.points[a.points.length - 1].date;
    const bt = b.points[b.points.length - 1].date;
    return bt.localeCompare(at) || a.name.localeCompare(b.name);
  });
}

export { dayKey as prDayKey };

/** "245 lb × 3" · "12 reps" — one point, said the way the athlete would say it. */
export function pointLabel(m: Pick<MetricSeries, 'unit'>, p: Pick<MetricPoint, 'value' | 'reps'>): string {
  if (m.unit === 'reps') return `${p.value} ${p.value === 1 ? 'rep' : 'reps'}`;
  return p.reps != null ? `${p.value} lb × ${p.reps}` : `${p.value} lb`;
}

/** The headline figure on a card or the detail hero. */
export function currentLabel(m: Pick<MetricSeries, 'unit' | 'current'>): string {
  return m.unit === 'reps' ? `${m.current} ${m.current === 1 ? 'rep' : 'reps'}` : `${m.current} lb`;
}

/**
 * The change from the first logged session to the latest, as a sentence.
 *
 * Says nothing at all from a single session, rather than "+0" — an athlete who has trained a lift once
 * has not failed to progress, they have not yet had the chance.
 */
export function changeLabel(m: MetricSeries): string | null {
  if (m.points.length < 2) return null;
  const start = m.points[0].value;
  const delta = m.current - start;
  const unit = m.unit === 'reps' ? (Math.abs(delta) === 1 ? 'rep' : 'reps') : 'lb';
  if (delta === 0) return `Holding at ${m.current} ${m.unit === 'reps' ? 'reps' : 'lb'}`;
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)} ${unit} since ${monthYear(m.points[0].date)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jul" within this year, "Jul '25" beyond it — a log spanning years must not show two identical ticks. */
export function monthYear(iso: string, today = new Date()): string {
  const m = Number(iso.slice(5, 7));
  const y = iso.slice(0, 4);
  const label = m >= 1 && m <= 12 ? MONTHS[m - 1] : '';
  return y === String(today.getFullYear()) ? label : `${label} ’${y.slice(2)}`;
}

/**
 * Up to four evenly-spaced x-axis ticks — the design's `idxs` rule, which the built chart never had.
 * Fewer than five points get one tick each; beyond that, first / third / two-thirds / last.
 */
export function tickIndices(n: number): number[] {
  if (n <= 0) return [];
  if (n <= 4) return Array.from({ length: n }, (_, i) => i);
  return [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1];
}
