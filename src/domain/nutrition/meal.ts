/**
 * Meal Detail — one meal of one day: its totals, its rows, and the arithmetic behind Move / Copy / Save.
 *
 * Built from `Meal Detail.dc.html`, whose logic block is the specification. Pure and relative-imported
 * so `node --test` can prove every number NUT-D4 says must be deterministic.
 *
 * ⚠ **A NUTRIENT NOBODY MEASURED IS NOT ZERO, AND A NUTRIENT HALF THE MEAL MEASURED IS WORSE.** The
 * `.dc` sums fibre, sugar, saturated fat, sodium and cholesterol across the meal, because its fixture is
 * seven hand-written foods that all carry them. Real rows do not: USDA gives fibre for oats and nothing
 * for many branded ones, FatSecret may not keep micronutrients at all (§4), and a Quick Add has no food
 * behind it. Summing what two of five foods reported would print a sodium figure that is confidently,
 * silently too low — the one failure mode a tracker must not have. So a micronutrient appears only when
 * EVERY food in the meal reports it, and `partial` tells the screen to say why the list is short.
 * `extraRows` in `detail.ts` makes the same call one food at a time; this is that rule for a plate.
 */

import type { LogEntry, MealSlot } from './day.ts';
import { dayLabel, MEAL_LABELS, MEAL_SLOTS, shiftDay, totals } from './day.ts';
import { EXTRA_NUTRIENTS, oneDecimal } from './detail.ts';
import { SOURCE_LABEL } from './serving.ts';

/* ── the header ───────────────────────────────────────────────────────────── */

/**
 * "Today · Tue, Sep 22" — the bronze eyebrow over the meal name.
 *
 * The `.dc` writes both halves because its fixture is always today. A day far enough back that
 * `dayLabel` already gives its date ("Wed, Sep 16") does not get it twice.
 */
export function mealDateLabel(iso: string, todayIso: string): string {
  const named = dayLabel(iso, todayIso);
  const [y, m, d] = iso.split('-').map(Number);
  const dated = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return named === dated ? dated : `${named} · ${dated}`;
}

/* ── the rows ─────────────────────────────────────────────────────────────── */

/** "Generic · 1 cup (158 g)" — the second line of a diary row. */
export function entrySubtitle(entry: LogEntry): string {
  const parts = [entry.brand, entry.servingLabel].filter((s): s is string => !!s && s.trim().length > 0);
  /* A Quick Add has neither a brand nor a serving — it is calories somebody typed. Saying so is more
     use than an empty line, and it is the same word Food Detail's source badge uses. */
  if (!parts.length) return SOURCE_LABEL[entry.source] ?? '';
  return parts.join(' · ');
}

/** "P 30 · C 54 · F 5" — the macro line, rounded once, at the end. */
export function entryMacroLine(entry: LogEntry): string {
  return `P ${Math.round(entry.protein)} · C ${Math.round(entry.carb)} · F ${Math.round(entry.fat)}`;
}

/** "1 food" · "4 foods" — the header over the list. */
export function countLabel(count: number): string {
  return count === 1 ? '1 food' : `${count} foods`;
}

/**
 * Whether a row can be reopened in Food Detail to have its portion changed.
 *
 * ⚠ A Quick Add cannot: there is no food behind it to re-multiply, so `source_key` is null (0205) and
 * Food Detail has nothing to load. The `.dc` never meets one — its fixture is seven catalogue foods —
 * but the diary is full of them, and an "Edit portion" that opens an empty screen is worse than a menu
 * one item shorter. Delete and Move still work, which is every other thing one might want to do to it.
 */
export function canEditPortion(entry: LogEntry): boolean {
  return entry.source !== 'quick' && !!entry.sourceKey;
}

/* ── the breakdown sheet ──────────────────────────────────────────────────── */

export interface BreakdownRow {
  key: string;
  label: string;
  value: string;
  /** Fibre and sugar sit under carbs; saturated fat sits under fat. */
  indent: boolean;
}

export interface Breakdown {
  rows: BreakdownRow[];
  /**
   * True when at least one food in the meal reported a micronutrient and at least one did not, so the
   * list the athlete is looking at is shorter than the foods could support. The screen says so.
   */
  partial: boolean;
}

/** Where each micronutrient goes in the `.dc`'s order, and whether it is a sub-line of the macro above. */
const MICRO_PLACEMENT: Record<string, { after: 'carb' | 'fat' | 'end'; indent: boolean }> = {
  fiber: { after: 'carb', indent: true },
  sugar: { after: 'carb', indent: true },
  satFat: { after: 'fat', indent: true },
  sodium: { after: 'end', indent: false },
  cholesterol: { after: 'end', indent: false },
};

const microGrams = (entry: LogEntry): number | null =>
  typeof entry.grams === 'number' && Number.isFinite(entry.grams) && entry.grams > 0 ? entry.grams : null;

const microPer100 = (entry: LogEntry, key: string): number | null => {
  const n = entry.micros?.[key];
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

/**
 * The full nutrition sheet for a meal: always the four figures every row stores, plus each
 * micronutrient the whole meal can account for.
 */
export function mealBreakdown(entries: readonly LogEntry[]): Breakdown {
  const sum = totals(entries);
  const gramsOf = entries.map(microGrams);

  const micro: Record<string, string | null> = {};
  let partial = false;

  for (const { key, unit } of EXTRA_NUTRIENTS) {
    let covered = 0;
    let total = 0;
    for (let i = 0; i < entries.length; i += 1) {
      const per100 = microPer100(entries[i], key);
      const grams = gramsOf[i];
      if (per100 == null || grams == null) continue;
      covered += 1;
      total += (per100 * grams) / 100;
    }
    if (covered === 0) continue;
    if (covered < entries.length) {
      /* Some of the plate reported it and some did not. A sum of the reporting half is a number that
         looks complete and is not, so it is dropped — and the sheet admits the drop. */
      partial = true;
      continue;
    }
    micro[key] =
      unit === 'mg' ? `${Math.round(total).toLocaleString('en-US')} mg` : `${oneDecimal(total)} g`;
  }

  const row = (key: string, label: string, value: string, indent = false): BreakdownRow => ({ key, label, value, indent });
  const microRows = (after: 'carb' | 'fat' | 'end'): BreakdownRow[] =>
    EXTRA_NUTRIENTS.filter((n) => MICRO_PLACEMENT[n.key]?.after === after && micro[n.key] != null).map((n) =>
      row(n.key, n.label, micro[n.key] as string, MICRO_PLACEMENT[n.key].indent),
    );

  return {
    partial,
    rows: [
      row('kcal', 'Calories', sum.kcal.toLocaleString('en-US')),
      row('protein', 'Protein', `${oneDecimal(sum.protein)} g`),
      row('carb', 'Carbs', `${oneDecimal(sum.carb)} g`),
      ...microRows('carb'),
      row('fat', 'Fat', `${oneDecimal(sum.fat)} g`),
      ...microRows('fat'),
      ...microRows('end'),
    ],
  };
}

/* ── move and copy ────────────────────────────────────────────────────────── */

export type MoveMode = 'move' | 'copy';

export interface DayChoice {
  iso: string;
  label: string;
}

/**
 * The three day pills. The `.dc` hard-codes Yesterday · Today · Tomorrow because its fixture is always
 * today; here they are RELATIVE TO THE DAY ON SCREEN, so a meal opened from last Tuesday offers the
 * days around last Tuesday instead of silently re-filing food into this week.
 */
export function dayChoices(iso: string, todayIso: string): DayChoice[] {
  return [-1, 0, 1].map((offset) => {
    const day = shiftDay(iso, offset);
    return { iso: day, label: dayLabel(day, todayIso) };
  });
}

/** Move opens on the day it is already in; copy opens on the next one, because copying is meal prep. */
export function defaultTargetDay(iso: string, mode: MoveMode): string {
  return mode === 'copy' ? shiftDay(iso, 1) : iso;
}

/** Moving a row to where it already is does nothing, so the button says what is missing instead. */
export function isSameSpot(fromIso: string, fromMeal: MealSlot, toIso: string, toMeal: MealSlot): boolean {
  return fromIso === toIso && fromMeal === toMeal;
}

/** "Move to Today · Lunch" · "Copy to Tomorrow · Breakfast" · "Choose a meal or day". */
export function moveButtonLabel(
  mode: MoveMode,
  targetDayLabel: string,
  targetMeal: MealSlot,
  sameSpot: boolean,
): string {
  const where = `${targetDayLabel} · ${MEAL_LABELS[targetMeal]}`;
  if (mode === 'copy') return `Copy to ${where}`;
  return sameSpot ? 'Choose a meal or day' : `Move to ${where}`;
}

/** The four slot rows in the move sheet, with "Current" beside the one the food is in right now. */
export function slotChoices(
  fromMeal: MealSlot,
  fromIso: string,
  targetIso: string,
): { meal: MealSlot; label: string; note: string }[] {
  return MEAL_SLOTS.map((meal) => ({
    meal,
    label: MEAL_LABELS[meal],
    note: meal === fromMeal && targetIso === fromIso ? 'Current' : '',
  }));
}

/* ── save as a meal ───────────────────────────────────────────────────────── */

/** "Usual Breakfast" — what the name field opens with. */
export function defaultSavedMealName(meal: MealSlot): string {
  return `Usual ${MEAL_LABELS[meal]}`;
}

/** "3 foods · 620 cal. Find it under My Meals in Log Food." — the line under the name field. */
export function saveMealHelper(entries: readonly LogEntry[]): string {
  return `${countLabel(entries.length)} · ${totals(entries).kcal.toLocaleString('en-US')} cal. Find it under My Meals in Log Food.`;
}
