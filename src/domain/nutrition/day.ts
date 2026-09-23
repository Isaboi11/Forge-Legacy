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
  source: 'usda' | 'off' | 'fs' | 'custom' | 'quick';
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
      summary: own.map((e) => e.name).join(', '),
    };
  });
}

/**
 * What the meal card's title line says. One food is its own title; several become a count, because
 * "Protein Oatmeal" in the `.dc` is the single-food case and a five-food breakfast has no such name.
 */
export function mealTitle(group: MealGroup): string {
  if (group.entries.length === 0) return 'Nothing logged yet';
  if (group.entries.length === 1) return group.entries[0].name;
  return `${group.entries.length} items`;
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

/**
 * Move a calendar day. UTC arithmetic on the date parts only — a local-time `Date` shifts by an hour
 * across a DST boundary and can land on the wrong day, which would silently re-file a whole day's food.
 */
export function shiftDay(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Tomorrow is not loggable: a diary of the future is a plan, and plans live in the meal planner. */
export function canGoForward(iso: string, todayIso: string): boolean {
  return iso < todayIso;
}
