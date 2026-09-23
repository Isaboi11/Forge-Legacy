/**
 * Nutrition Details — a week of the diary, read back.
 *
 * Built from `Nutrition Details.dc.html`, whose logic block is the specification: a rolling seven days
 * ending today, a stepper that walks back seven weeks, a calorie bar per day against a target BAND, and
 * three macro rows that each open their own daily history.
 *
 * ⚠ **TODAY IS EXCLUDED FROM EVERY AVERAGE.** A day that is four hours old is not a low day, it is an
 * unfinished one, and letting it into the mean drags the whole week down and tells the athlete they are
 * under-eating when they are mid-morning. The `.dc` draws today's bar in outline and leaves it out of
 * the arithmetic; so does this. It is counted in neither the average nor "days in range".
 *
 * ⚠ **AN UNLOGGED DAY IS NOT A ZERO-CALORIE DAY.** It is a day with no data, and averaging it in would
 * be the same lie in a different direction. Unlogged days are drawn as an empty outline, counted
 * separately, and named at the foot of the screen.
 *
 * ⚠ **THE TARGET IS READ PER DAY.** `nutrition_targets` is a history (0205 §4, NUT-D5: "an old day stays
 * readable against what was true then"), so a week that straddles a change is judged against whatever
 * was true on each morning — not against today's number applied backwards.
 *
 * Pure, relative-imported, NUT-D4.
 */

import type { Macros, Targets } from './day.ts';
import { grouped, shiftDay } from './day.ts';

/** How far back the stepper goes. The `.dc`'s number. */
export const WEEKS_BACK = 7;

/** Within 4% of the calorie target counts as hitting it — the `.dc`'s default tolerance. */
export const CALORIE_TOLERANCE = 0.04;

/** Macros are coarser: a label rounds, a portion is eyeballed, and 10% is the honest band. */
export const MACRO_TOLERANCE = 0.1;

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parts = (iso: string): { y: number; m: number; d: number; dow: number } => {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
};

/* ── the window ───────────────────────────────────────────────────────────── */

/**
 * The seven days on screen: a ROLLING window ending today, not a calendar week.
 *
 * The `.dc` steps in sevens from today rather than snapping to a Monday, and that is the right unit for
 * a diary — "the last seven days" is the question someone actually asks, and it needs no decision about
 * which day a week starts on (which differs by country and is not ours to pick).
 */
export function weekDays(todayIso: string, offset: number): string[] {
  const end = shiftDay(todayIso, -offset * 7);
  return Array.from({ length: 7 }, (_, i) => shiftDay(end, i - 6));
}

/** "This week" · "Last week" · "3 weeks ago". */
export function weekKicker(offset: number): string {
  if (offset === 0) return 'This week';
  if (offset === 1) return 'Last week';
  return `${offset} weeks ago`;
}

/** "Sep 16 – 22", or "Aug 30 – Sep 5" when the window straddles a month. */
export function weekRangeLabel(days: readonly string[]): string {
  const a = parts(days[0]);
  const b = parts(days[days.length - 1]);
  return a.m === b.m ? `${MON[a.m - 1]} ${a.d} – ${b.d}` : `${MON[a.m - 1]} ${a.d} – ${MON[b.m - 1]} ${b.d}`;
}

/** "Mon" — and "Today" for the live one, which is what the `.dc` labels it. */
export function dayShortLabel(iso: string, todayIso: string): string {
  return iso === todayIso ? 'Today' : DOW[parts(iso).dow];
}

/** "Mon, Sep 21" — the tooltip's first line and the history sheet's title. */
export function dayLongLabel(iso: string, todayIso: string): string {
  const p = parts(iso);
  return iso === todayIso ? 'Today' : `${DOW[p.dow]}, ${MON[p.m - 1]} ${p.d}`;
}

/* ── the days ─────────────────────────────────────────────────────────────── */

export interface DayTotals extends Macros {
  iso: string;
  /** False when nothing at all was written that day — which is not the same as a zero. */
  logged: boolean;
}

export interface WeekDay {
  iso: string;
  totals: DayTotals;
  target: Targets | null;
  /** In the window, logged, and finished — the only days that count toward an average. */
  counts: boolean;
  isToday: boolean;
  inRange: boolean;
}

/**
 * The newest target at or before a date — `nutrition_targets` is a history, never an overwrite (0205 §4).
 *
 * Order-independent: the caller's rows may arrive in any order, so the winner is chosen by comparing
 * `from` directly rather than trusting a sort nobody guarantees.
 */
export function targetOn(history: readonly { from: string; targets: Targets }[], iso: string): Targets | null {
  let bestFrom = '';
  let best: Targets | null = null;
  for (const row of history) {
    if (row.from <= iso && (best == null || row.from > bestFrom)) {
      bestFrom = row.from;
      best = row.targets;
    }
  }
  return best;
}

/** Within tolerance of the target, in either direction. No target means nothing to be in range of. */
export function inCalorieRange(kcal: number, target: Targets | null, tolerance = CALORIE_TOLERANCE): boolean {
  if (!target || target.kcal <= 0) return false;
  return Math.abs(kcal - target.kcal) / target.kcal <= tolerance;
}

/** Assemble the week: each day with the target that was true on it, and whether it counts. */
export function buildWeek(
  days: readonly string[],
  totalsByIso: ReadonlyMap<string, DayTotals>,
  history: readonly { from: string; targets: Targets }[],
  todayIso: string,
  tolerance = CALORIE_TOLERANCE,
): WeekDay[] {
  return days.map((iso) => {
    const totals = totalsByIso.get(iso) ?? { iso, kcal: 0, protein: 0, carb: 0, fat: 0, logged: false };
    const target = targetOn(history, iso);
    const isToday = iso === todayIso;
    return {
      iso,
      totals,
      target,
      isToday,
      counts: totals.logged && !isToday,
      inRange: totals.logged && !isToday && inCalorieRange(totals.kcal, target, tolerance),
    };
  });
}

/* ── the summary ──────────────────────────────────────────────────────────── */

export interface WeekSummary {
  /** Days that counted — logged and finished. */
  counted: number;
  /** Days in the window with nothing logged, today excluded. */
  missed: number;
  average: Macros;
  inRange: number;
  /** The band the chart draws, from the most recent target in the window. */
  band: { lo: number; hi: number; target: Targets } | null;
  /** True when the target changed inside the window, so one band cannot describe all seven days. */
  targetMoved: boolean;
}

/** Round a band edge to the nearest 50 — a range reads as a range, not as 2,398 to 2,602. */
const round50 = (n: number): number => Math.round(n / 50) * 50;

export function summarise(week: readonly WeekDay[], tolerance = CALORIE_TOLERANCE): WeekSummary {
  const counted = week.filter((d) => d.counts);
  const n = counted.length;
  const sum = counted.reduce(
    (a, d) => ({
      kcal: a.kcal + d.totals.kcal,
      protein: a.protein + d.totals.protein,
      carb: a.carb + d.totals.carb,
      fat: a.fat + d.totals.fat,
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  );

  const withTarget = week.filter((d) => d.target != null);
  const latest = withTarget.length ? (withTarget[withTarget.length - 1].target as Targets) : null;
  const distinct = new Set(withTarget.map((d) => (d.target as Targets).kcal));

  return {
    counted: n,
    missed: week.filter((d) => !d.totals.logged && !d.isToday).length,
    average: n
      ? {
          kcal: Math.round(sum.kcal / n),
          protein: Math.round(sum.protein / n),
          carb: Math.round(sum.carb / n),
          fat: Math.round(sum.fat / n),
        }
      : { kcal: 0, protein: 0, carb: 0, fat: 0 },
    inRange: counted.filter((d) => d.inRange).length,
    band:
      latest && latest.kcal > 0
        ? { lo: round50(latest.kcal * (1 - tolerance)), hi: round50(latest.kcal * (1 + tolerance)), target: latest }
        : null,
    targetMoved: distinct.size > 1,
  };
}

/**
 * The top of the chart. 1.3× the target leaves headroom for a genuinely big day without flattening the
 * rest; with no target at all it falls back to the week's own biggest day, so the bars still have shape.
 */
export function chartScale(week: readonly WeekDay[], band: WeekSummary['band']): number {
  if (band) return band.target.kcal * 1.3;
  const max = Math.max(0, ...week.map((d) => d.totals.kcal));
  return max > 0 ? max * 1.15 : 1;
}

/** 0–100, for a bar's height. */
export function barPercent(kcal: number, scale: number): number {
  if (!(scale > 0)) return 0;
  return Math.max(0, Math.min(100, (kcal / scale) * 100));
}

/* ── the tooltip ──────────────────────────────────────────────────────────── */

export interface DayCallout {
  title: string;
  detail: string;
  /** True when the detail is an achievement rather than a plain statement — the `.dc` tints it bronze. */
  good: boolean;
}

/**
 * The line under the tooltip's heading.
 *
 * Today reads as what is LEFT, not as a shortfall — it is still being eaten. A finished day states how
 * far off it landed, in the plain words the rest of nutrition uses ("over" / "under", never a minus).
 */
export function dayCallout(day: WeekDay, todayIso: string): DayCallout {
  const title = `${dayLongLabel(day.iso, todayIso)}${day.totals.logged ? ` · ${grouped(day.totals.kcal)} cal` : ''}`;
  if (!day.totals.logged) return { title, detail: 'Not logged', good: false };
  if (!day.target || day.target.kcal <= 0) return { title, detail: `${grouped(day.totals.kcal)} eaten`, good: false };

  const diff = day.totals.kcal - day.target.kcal;
  if (day.isToday) return { title, detail: `${grouped(Math.max(0, -diff))} left · in progress`, good: false };
  if (day.inRange) {
    return { title, detail: diff === 0 ? 'In range' : `In range · ${grouped(Math.abs(diff))} ${diff > 0 ? 'over' : 'under'}`, good: true };
  }
  return { title, detail: `${grouped(Math.abs(diff))} ${diff > 0 ? 'over' : 'under'}`, good: false };
}

/* ── the macros ───────────────────────────────────────────────────────────── */

export type MacroKey = 'protein' | 'carb' | 'fat';

export const MACRO_ROWS: { key: MacroKey; label: string }[] = [
  { key: 'protein', label: 'Protein' },
  { key: 'carb', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
];

export interface MacroSummary {
  key: MacroKey;
  label: string;
  average: number;
  target: number | null;
  under: number;
  over: number;
  onTarget: number;
  note: string;
  /** True when every counted day landed in the band — the `.dc` tints that note bronze. */
  clean: boolean;
}

export function macroSummaries(
  week: readonly WeekDay[],
  average: Macros,
  tolerance = MACRO_TOLERANCE,
): MacroSummary[] {
  const counted = week.filter((d) => d.counts);
  return MACRO_ROWS.map(({ key, label }) => {
    const target = counted.length ? (counted[counted.length - 1].target?.[key] ?? null) : null;
    let under = 0;
    let over = 0;
    if (target && target > 0) {
      for (const d of counted) {
        const t = d.target?.[key];
        if (!t || t <= 0) continue;
        if (d.totals[key] < t * (1 - tolerance)) under += 1;
        else if (d.totals[key] > t * (1 + tolerance)) over += 1;
      }
    }
    const onTarget = counted.length - under - over;
    let note: string;
    if (!target) note = 'No target set';
    else if (!counted.length) note = 'Nothing logged yet';
    else if (under > over && under > 0) note = `Under on ${under} of ${counted.length} days`;
    else if (over > 0) note = `Over on ${over} of ${counted.length} days`;
    else note = `On target all ${counted.length} days`;

    return {
      key,
      label,
      average: average[key],
      target,
      under,
      over,
      onTarget,
      note,
      clean: !!target && counted.length > 0 && onTarget === counted.length,
    };
  });
}

/* ── the closing line ─────────────────────────────────────────────────────── */

/**
 * One sentence at the foot: the macro most often short, and how many days went unlogged.
 *
 * ⚠ It names a gap only when it is a PATTERN — at least half the counted days — rather than after one
 * light Tuesday. A weekly read that scolds on noise stops being read.
 */
export function weekGapLine(macros: readonly MacroSummary[], summary: WeekSummary): string {
  const worst = [...macros].sort((a, b) => b.under - a.under)[0];
  const lines: string[] = [];

  if (worst && worst.target && summary.counted > 0 && worst.under >= Math.ceil(summary.counted / 2)) {
    const short = Math.round(worst.target - worst.average);
    if (short > 0) lines.push(`${worst.label} is the gap this week: ${short} g a day under target on average.`);
  }
  if (summary.missed > 0) {
    lines.push(`${summary.missed} unlogged ${summary.missed === 1 ? 'day' : 'days'}.`);
  }
  return lines.join(' ');
}

/* ── the macro history sheet ──────────────────────────────────────────────── */

export interface HistoryRow {
  iso: string;
  day: string;
  value: string;
  percent: number;
  /** Logged, finished, and inside the band. */
  onTarget: boolean;
  logged: boolean;
  isToday: boolean;
}

export interface MacroHistory {
  title: string;
  subtitle: string;
  range: string;
  /** Where the target tick sits along the mini-bars, 0–100. */
  targetPercent: number;
  rows: HistoryRow[];
}

export function macroHistory(
  week: readonly WeekDay[],
  macro: MacroSummary,
  todayIso: string,
  tolerance = MACRO_TOLERANCE,
): MacroHistory {
  const target = macro.target ?? 0;
  const scale = target > 0 ? target * 1.4 : Math.max(1, ...week.map((d) => d.totals[macro.key])) * 1.15;
  return {
    title: macro.label,
    subtitle: target > 0 ? `Target ${target} g · avg ${macro.average} g` : `Avg ${macro.average} g · no target set`,
    range: weekRangeLabel(week.map((d) => d.iso)),
    targetPercent: target > 0 ? Math.min(100, (target / scale) * 100) : 0,
    rows: week.map((d) => {
      const value = d.totals[macro.key];
      const t = d.target?.[macro.key] ?? 0;
      return {
        iso: d.iso,
        day: dayShortLabel(d.iso, todayIso),
        value: d.totals.logged ? `${Math.round(value)} g` : '—',
        percent: d.totals.logged ? Math.max(0, Math.min(100, (value / scale) * 100)) : 0,
        onTarget: d.counts && t > 0 && Math.abs(value - t) / t <= tolerance,
        logged: d.totals.logged,
        isToday: d.isToday,
      };
    }),
  };
}
