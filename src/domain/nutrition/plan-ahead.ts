import type { LogEntry, MealSlot } from './day.ts';
import { MEAL_SLOTS, shiftDay } from './day.ts';
import { RECIPE_BY_ID, itemTotals, logKey, mondayOf, portionLabel, type MealPlanWeek } from './meal-planner.ts';

/**
 * Plan ahead (PO 2026-09-27, 0228) — the checklist under each meal on Nutrition Home.
 *
 * "Plan and pre log, and then when tomorrow comes it will all be down there with a check box next to it for
 * when you actually eat it." Two things land in a meal's checklist:
 *
 *  · **Pre-logged food** — a diary row put on its day ahead of time (`preLogged`). Unchecked it is `planned`
 *    and counts toward nothing; the check flips `planned` off, and it is eaten like any other row.
 *  · **The Meal Plan's meal for that slot** — read from the saved week, NEVER copied into the diary. A copy
 *    would go stale the moment the plan changed; reading the week means a swap, a rebuild or Holt's fill is
 *    on the day the next time it is drawn. The check writes the real row (`week.logged` remembers it).
 *
 * ⚠ **UNCHECKED COUNTS TOWARD NOTHING, AND STAYS UNCHECKED** (PO): nothing here ever ticks itself, and a day
 * that passes with a row unticked keeps it unticked. Only `mayCheck` days can be ticked — the future cannot
 * have been eaten.
 *
 * Pure and relative-imported, so `node --test` proves it (NUT-D4).
 */

export interface ChecklistRow {
  /** `e:<entry id>` or `p:<plan log key>` — stable across reads, so a list keyed on it never re-mounts. */
  key: string;
  kind: 'entry' | 'plan';
  meal: MealSlot;
  name: string;
  /** "1 cup" · "1¼ servings" · "1 serving · leftovers". */
  detail: string;
  kcal: number;
  /** The rest of the macros, so a tick can move the ring before the server answers (`applyChecks`). */
  protein: number;
  carb: number;
  fat: number;
  checked: boolean;
  /** kind 'entry': the diary row. */
  entryId?: string;
  /** kind 'plan': where it sits in the week, found again by `logKey` at the moment it is ticked. */
  weekStart?: string;
  planKey?: string;
}

/** A day that has begun can be ticked. Tomorrow's breakfast has not been eaten yet. */
export const mayCheck = (iso: string, todayIso: string): boolean => iso <= todayIso;

/** Split a day's rows into what counts (eaten) and what waits (planned). */
export function splitPlanned(rows: readonly LogEntry[]): { eaten: LogEntry[]; planned: LogEntry[] } {
  const eaten: LogEntry[] = [];
  const planned: LogEntry[] = [];
  for (const r of rows) (r.planned ? planned : eaten).push(r);
  return { eaten, planned };
}

/** Which day of a plan week (0 = Monday) a date is — null when the date is in another week. */
export function weekDayIndex(week: Pick<MealPlanWeek, 'weekStart'>, iso: string): number | null {
  if (mondayOf(iso) !== week.weekStart) return null;
  for (let d = 0; d < 7; d++) if (shiftDay(week.weekStart, d) === iso) return d;
  return null;
}

/**
 * The Meal Plan's meals on one date, as checklist rows. A meal whose recipe is not in the book (a deleted
 * recipe, recipes not read yet) is left out rather than drawn as a nameless row.
 */
export function planRowsFor(week: MealPlanWeek | null, iso: string): ChecklistRow[] {
  if (!week) return [];
  const d = weekDayIndex(week, iso);
  if (d == null) return [];
  const items = week.days[d]?.items ?? [];
  const out: ChecklistRow[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const r = RECIPE_BY_ID[it.recipeId];
    if (!r || !(MEAL_SLOTS as readonly string[]).includes(it.slot)) continue;
    const planKey = logKey(d, it);
    /* Two items can share a key only if a week was stored with the same recipe twice in one spot; the
       plan's own "Log meal" treats them as one, so the checklist does too. */
    if (seen.has(planKey)) continue;
    seen.add(planKey);
    out.push({
      key: `p:${planKey}`,
      kind: 'plan',
      meal: it.slot,
      name: r.name,
      detail: `${portionLabel(it.portion ?? 1)}${it.leftover ? ' · leftovers' : ''}`,
      ...itemTotals(it),
      checked: !!week.logged[planKey],
      weekStart: week.weekStart,
      planKey,
    });
  }
  return out;
}

/** A pre-logged diary row as a checklist row. */
export function entryRow(e: LogEntry): ChecklistRow {
  const qty = e.quantity !== 1 && e.quantity > 0 ? `${+e.quantity.toFixed(2)} × ` : '';
  return {
    key: `e:${e.id}`,
    kind: 'entry',
    meal: e.meal,
    name: e.name,
    detail: e.servingLabel ? `${qty}${e.servingLabel}` : qty ? `${+e.quantity.toFixed(2)} servings` : '',
    kcal: Math.round(e.kcal),
    protein: e.protein,
    carb: e.carb,
    fat: e.fat,
    checked: !e.planned,
    entryId: e.id,
  };
}

/**
 * Every meal's checklist for a day: the plan's meal first (it is what the day was built around), then food
 * pre-logged into the slot in the order it was added. A meal with nothing planned has an empty list — and
 * its card looks exactly as it did before plan-ahead existed.
 *
 * `rows` is EVERY row of the day, eaten and planned: a checked pre-logged row is eaten and still listed.
 */
export function checklistByMeal(
  rows: readonly LogEntry[],
  week: MealPlanWeek | null,
  iso: string,
): Record<MealSlot, ChecklistRow[]> {
  const out = Object.fromEntries(MEAL_SLOTS.map((m) => [m, [] as ChecklistRow[]])) as Record<MealSlot, ChecklistRow[]>;
  for (const p of planRowsFor(week, iso)) out[p.meal].push(p);
  for (const e of rows) if (e.preLogged && out[e.meal]) out[e.meal].push(entryRow(e));
  return out;
}

/** "2 of 3 checked" — the meal card's line over its list. */
export function checklistCount(rows: readonly ChecklistRow[]): string {
  const done = rows.filter((r) => r.checked).length;
  return `${done} of ${rows.length} checked`;
}

/** The calories still waiting on a check — shown faintly beside the day's total, never added to it. */
export function plannedKcal(lists: Record<MealSlot, ChecklistRow[]>): number {
  let sum = 0;
  for (const m of MEAL_SLOTS) for (const r of lists[m]) if (!r.checked) sum += r.kcal;
  return Math.round(sum);
}

/** The Meal Plan week a date belongs to — Nutrition Home reads this one for the day on screen. */
export const planWeekOf = (iso: string): string => mondayOf(iso);

/**
 * Tick or untick one of the plan's meals — which `logged` mark changes, and what the diary must do.
 * The plan is found again by its KEY, not by the index the screen drew: the week may have been re-read.
 */
export function locatePlanItem(week: MealPlanWeek, planKey: string): { d: number; i: number } | null {
  for (let d = 0; d < week.days.length; d++) {
    const items = week.days[d]?.items ?? [];
    for (let i = 0; i < items.length; i++) if (logKey(d, items[i]) === planKey) return { d, i };
  }
  return null;
}

/**
 * Draw ticks the athlete made BEFORE the server has answered — the check is instant, and the ring moves with it.
 * `checks` maps a row key to the state tapped. Returns the day's rows and the week as they will be once the write
 * lands; the screen then re-reads and drops `checks` (they were made against the old read).
 *
 *  · A pre-logged row just flips `planned`.
 *  · A plan meal ticked on: a stand-in eaten row (`opt:` id) carries its numbers until the real row arrives.
 *  · A plan meal ticked off: the rows its mark remembers leave the day, and the mark goes.
 */
export function applyChecks(
  rows: readonly LogEntry[],
  week: MealPlanWeek | null,
  iso: string,
  checks: Readonly<Record<string, boolean>>,
): { rows: LogEntry[]; week: MealPlanWeek | null } {
  const keys = Object.keys(checks);
  if (!keys.length) return { rows: [...rows], week };
  let out = rows.map((e) => (`e:${e.id}` in checks ? { ...e, planned: !checks[`e:${e.id}`] } : e));
  if (!week) return { rows: out, week };
  const logged = { ...week.logged };
  for (const p of planRowsFor(week, iso)) {
    if (!(p.key in checks) || checks[p.key] === p.checked || !p.planKey) continue;
    if (checks[p.key]) {
      logged[p.planKey] = `opt:${p.planKey}`;
      out.push({ id: `opt:${p.planKey}`, meal: p.meal, name: p.name, servingLabel: p.detail, quantity: 1, kcal: p.kcal, protein: p.protein, carb: p.carb, fat: p.fat, source: 'quick' });
    } else {
      const gone = new Set((week.logged[p.planKey] ?? '').split(','));
      out = out.filter((e) => !gone.has(e.id));
      delete logged[p.planKey];
    }
  }
  return { rows: out, week: { ...week, logged } };
}
