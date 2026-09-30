/**
 * Nutrition — a logged day, and the numbers Nutrition Home draws.
 *
 * ⚠ **NUT-D4: EVERY NUMBER AN ATHLETE SEES COMES FROM HERE.** No model writes one. This module is pure
 * and relative-imported so `node --test` can prove it (`feedback_ts_only_alias_imports`).
 *
 * The ring's arithmetic looks trivial and is not: it has to stay calm on a bad day. `remaining` may be
 * negative (that is the truth), but `ringFraction` clamps to 1 so the arc never wraps around and re-draws
 * itself as if the athlete had started a second day. The `.dc` leads with what was eaten precisely so the
 * big number keeps counting up instead of showing "−120 left".
 */

import { countOf } from '../text/plural.ts';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

/** The four slots in the order Nutrition Home lists them. */
export const MEAL_SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;

export const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export interface LogEntry {
  id: string;
  meal: MealSlot;
  name: string;
  brand?: string | null;
  servingLabel?: string | null;
  quantity: number;
  /** Already multiplied out for this entry — the snapshot the row stores (0205). */
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  /** Where the numbers came from, and what they point at. `quick` has no food behind it, so no key. */
  source: 'usda' | 'off' | 'fs' | 'custom' | 'quick' | 'community';
  sourceKey?: string | null;
  /** What this portion weighs. Null for a Quick Add, and for a serving no source gave a weight for. */
  grams?: number | null;
  /**
   * ⚠ **PER 100 g, NOT PER PORTION** — the same shape `CatalogFood.micros` carries, scaled by `grams`
   * at the point of display (`extraRows`, `mealBreakdown`). Storing the portion's figures instead would
   * make an edited portion silently wrong, because `updateEntry` changes the grams and not these.
   * Present only for a source whose licence permits keeping them (`MAY_STORE_MICROS`).
   */
  micros?: Record<string, number> | null;
  /**
   * On the plan, NOT EATEN (0228). Counts toward nothing — the ring, the week, Holt — until it is checked off.
   * `fetchDay` hands these back apart from `entries`, so no summing caller can count one by accident.
   */
  planned?: boolean;
  /** Put on its day AHEAD of time (0228). Never changes, so a checked row stays in the day's checklist, ticked. */
  preLogged?: boolean;
}

export interface Macros {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export interface Targets {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export const ZERO: Macros = { kcal: 0, protein: 0, carb: 0, fat: 0 };

/** Sum a list of entries. Rounded once, at the end — never per entry, or a day of 12 foods drifts. */
export function totals(entries: readonly LogEntry[]): Macros {
  const sum = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carb: acc.carb + e.carb,
      fat: acc.fat + e.fat,
    }),
    ZERO,
  );
  return {
    kcal: Math.round(sum.kcal),
    protein: Math.round(sum.protein),
    carb: Math.round(sum.carb),
    fat: Math.round(sum.fat),
  };
}

export interface MealGroup {
  meal: MealSlot;
  label: string;
  entries: LogEntry[];
  kcal: number;
  /** "Oats, banana, protein powder" — the subtitle on a meal card in the `.dc`. */
  summary: string;
}

/**
 * Group a day into the four cards Nutrition Home draws — always all four, in order, empty ones included,
 * because an empty Dinner card is a target ("Nothing logged yet · Copy yesterday"), not a gap.
 */
export function groupByMeal(entries: readonly LogEntry[]): MealGroup[] {
  return MEAL_SLOTS.map((meal) => {
    const own = entries.filter((e) => e.meal === meal);
    return {
      meal,
      label: MEAL_LABELS[meal],
      entries: own,
      kcal: totals(own).kcal,
      summary: own.length === 1 ? singleSummary(own[0]) : own.map((e) => e.name).join(', '),
    };
  });
}

/**
 * The subtitle under a ONE-food card. Its title is already the food's name (`mealTitle`), so repeating
 * the name there said "Chicken breast / Chicken breast" (QA 09-26 N-23) — the portion is the news instead:
 * "Generic · 1 cup (158 g)". A Quick Add has neither, and says what it is.
 */
function singleSummary(entry: LogEntry): string {
  const parts = [entry.brand, entry.servingLabel].filter((s): s is string => !!s && s.trim().length > 0);
  if (parts.length) return parts.join(' · ');
  return entry.source === 'quick' ? 'Quick add' : '';
}

/**
 * What the meal card's title line says. One food is its own title; several become a count, because
 * "Protein Oatmeal" in the `.dc` is the single-food case and a five-food breakfast has no such name.
 */
export function mealTitle(group: MealGroup): string {
  if (group.entries.length === 0) return 'Nothing logged yet';
  if (group.entries.length === 1) return group.entries[0].name;
  return countOf(group.entries.length, 'item');
}

/** Remaining may be negative — that is the honest number, and the UI shows it without alarm (NUT-D5). */
export function remaining(eaten: Macros, target: Targets): Targets {
  return {
    kcal: target.kcal - eaten.kcal,
    protein: target.protein - eaten.protein,
    carb: target.carb - eaten.carb,
    fat: target.fat - eaten.fat,
  };
}

/**
 * 0…1 for an arc. Clamped at both ends: a negative target (impossible, but a bad row could) and going
 * over both resolve to a full ring rather than a wrapped or inverted one.
 */
export function ringFraction(eaten: number, target: number): number {
  if (!Number.isFinite(eaten) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.min(1, eaten / target));
}

/** The `.dc`'s stroke-dasharray: the drawn arc, then the rest of the circumference. */
export function ringDash(fraction: number, radius: number): string {
  const circumference = 2 * Math.PI * radius;
  const drawn = circumference * Math.max(0, Math.min(1, fraction));
  return `${drawn.toFixed(1)} ${circumference.toFixed(1)}`;
}

/** "1,850" — grouped digits, matching every other big number in Forge. */
export function grouped(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/**
 * The line under the calorie ring, in both of the `.dc`'s modes.
 * Over target, "left" would read "−120 left", so it becomes "over" — the same fact, stated plainly.
 */
export function calorieCaption(eaten: number, target: number, mode: 'eaten' | 'remaining'): string {
  const left = target - eaten;
  const overUnder = left >= 0 ? `${grouped(left)} left` : `${grouped(-left)} over`;
  return mode === 'eaten'
    ? `of ${grouped(target)} · ${overUnder}`
    : `${grouped(eaten)} of ${grouped(target)} eaten`;
}

/** The big number and its label, for whichever mode the ring is in. */
export function calorieHeadline(
  eaten: number,
  target: number,
  mode: 'eaten' | 'remaining',
): { value: string; label: string } {
  if (mode === 'eaten') return { value: grouped(eaten), label: 'Calories' };
  const left = target - eaten;
  return left >= 0
    ? { value: grouped(left), label: 'Calories left' }
    : { value: grouped(-left), label: 'Calories over' };
}

/**
 * A day label for the strip: "Today", "Yesterday", or "Wed, Sep 16". Pure — the caller passes today, so a
 * test never depends on the clock and a device that crosses midnight mid-session re-renders correctly.
 */
export function dayLabel(iso: string, todayIso: string): string {
  if (iso === todayIso) return 'Today';
  if (iso === shiftDay(todayIso, -1)) return 'Yesterday';
  if (iso === shiftDay(todayIso, 1)) return 'Tomorrow';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** "SEP 16, 2026" — the small line under the day name. */
export function dayDateLine(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();
}

/**
 * Today, as the ATHLETE'S CALENDAR sees it — not as UTC does.
 *
 * ⚠ **`new Date().toISOString().slice(0, 10)` IS A UTC DATE, AND IT FILES DINNER ON TOMORROW.** Every
 * nutrition surface used it, so west of Greenwich the diary rolled over in the EVENING: at 6pm in
 * California the app's "today" was already tomorrow, and a dinner logged then landed on a day that had
 * not started. The day strip still said "Today" over tomorrow's date, the week's last column was a day
 * that did not exist yet, and the average excluded the wrong day as "unfinished".
 *
 * The rest of the app already builds its day keys from LOCAL parts (`domain/admin/series.ts`,
 * `domain/squad/goal-state.ts`, `domain/settings/export-core.ts`); nutrition was the outlier.
 *
 * Pure — it takes the Date, so a test can pin one and the impurity stays at the call site.
 */
export function toLocalIso(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** The athlete's today. The one call that reads the clock, so every screen agrees on the date. */
export function localToday(): string {
  return toLocalIso(new Date());
}

/** Which meal an hour most likely means — a default for a log with no meal chosen, always changeable. */
export function mealForHour(hour: number): MealSlot {
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snacks';
}

/**
 * Move a calendar day. UTC arithmetic on the date parts only — a local-time `Date` shifts by an hour
 * across a DST boundary and can land on the wrong day, which would silently re-file a whole day's food.
 */
export function shiftDay(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * How far ahead the day strip goes (PO 09-27, plan ahead). Two weeks covers this week's Meal Plan and next
 * week's shop; past it a tap on › would only be scrolling through empty days.
 */
export const PLAN_AHEAD_DAYS = 14;

/** The › arrow: open into the future now — a future day is where food is planned (0228). */
export function canGoForward(iso: string, todayIso: string): boolean {
  return iso < shiftDay(todayIso, PLAN_AHEAD_DAYS);
}

/** A day that has not begun. Food put on it is PLANNED; it can be checked off once the day comes. */
export function isAhead(iso: string, todayIso: string): boolean {
  return iso > todayIso;
}

/** How far back a link may file food. A year covers any honest back-fill; "1999-01-01" is a typo (QA 09-26 N-19). */
export const LOG_BACK_DAYS = 365;

/**
 * The day a `?date=` link asks to log to — or today, when it is not a real calendar day ("2026-02-31"),
 * is not a date at all, or lies outside [a year back, the plan-ahead limit] (QA 09-26 N-19: a 1999 date
 * in the link was accepted and the food went there without a word).
 */
export function diaryDayParam(raw: unknown, todayIso: string): string {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return todayIso;
  if (shiftDay(raw, 0) !== raw) return todayIso;
  if (raw < shiftDay(todayIso, -LOG_BACK_DAYS) || raw > shiftDay(todayIso, PLAN_AHEAD_DAYS)) return todayIso;
  return raw;
}
