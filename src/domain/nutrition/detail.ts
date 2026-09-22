/**
 * Food Detail — the amount stepper, the unit pills, and the line that says what this food does to today.
 *
 * Built from `Food Detail.dc.html`, whose logic block is the specification: a unit list where a gram unit
 * is labelled "grams", a step that depends on the unit, an amount that is CONVERTED when the unit changes
 * (never reset), and an impact line that flips wording rather than showing a minus sign.
 *
 * ⚠ Pure, relative-imported, tested — NUT-D4. The screen positions these numbers; it does not compute any.
 */

import type { CatalogFood, Serving } from './serving.ts';
import { servingOptions } from './serving.ts';

export interface UnitChoice {
  /** What the pill says: a gram serving reads "grams", everything else keeps the source's own word. */
  label: string;
  /** The serving behind it. `grams: 1` is the gram unit. */
  serving: Serving;
}

/** True for the "1 g" unit the `.dc` labels "grams" — the one unit whose amount IS a gram count. */
const isGramUnit = (s: Serving) => s.grams === 1 || /^(100\s*)?g(rams?)?$/i.test(s.label);

/**
 * The unit pills, in the order they are offered. The source's own servings come first (a person reaches
 * for "1 cup"), and a plain gram unit is always available so any amount can be expressed.
 */
export function unitChoices(food: CatalogFood): UnitChoice[] {
  const out: UnitChoice[] = [];
  for (const s of servingOptions(food)) {
    if (isGramUnit(s)) continue;
    // "100 g" is a per-100 statement, not a unit someone eats in; it becomes the gram pill below.
    if (/^100\s*(g|ml)\b/i.test(s.label)) continue;
    out.push({ label: s.label, serving: s });
  }
  out.push({ label: 'grams', serving: { label: 'g', grams: 1 } });
  return out;
}

/**
 * How much one tap of − or + moves the amount. Grams move in tens (a gram at a time is 300 taps for a
 * chicken breast), ounces in ones, and a named serving in halves — you can eat half a cup.
 */
export function stepFor(choice: UnitChoice): number {
  if (choice.serving.grams === 1) return 10;
  if (/\boz\b|ounce/i.test(choice.label)) return 1;
  return 0.5;
}

/** Clamp and round a stepped amount: never negative, never more precision than one decimal. */
export function stepAmount(amount: number, delta: number): number {
  const next = Math.max(0, Math.round((amount + delta) * 10) / 10);
  return Number.isFinite(next) ? next : 0;
}

/**
 * Switching units KEEPS THE FOOD, not the number: 1 cup becomes 80 g, not 1 g. Losing this is how a
 * tracker silently logs an eightieth of a breakfast.
 */
export function convertAmount(amount: number, from: UnitChoice, to: UnitChoice): number {
  const fromGrams = from.serving.grams ?? 0;
  const toGrams = to.serving.grams ?? 0;
  if (fromGrams <= 0 || toGrams <= 0) return amount;
  const grams = amount * fromGrams;
  return toGrams === 1 ? Math.round(grams) : Math.round((grams / toGrams) * 10) / 10;
}

/** "g" · "cup" · "cups" · "oz" — the word beside the amount, pluralised only where English wants it. */
export function unitWord(choice: UnitChoice, amount: number): string {
  if (choice.serving.grams === 1) return 'g';
  const label = choice.label;
  if (/\boz\b|ounce/i.test(label)) return label;
  if (amount === 1) return label;
  return /s$/i.test(label) ? label : `${label}s`;
}

/**
 * "650 left after this" / "120 over after this" — the `.dc`'s line beside the calorie figure.
 * Null when there is no target to measure against; the screen then shows nothing rather than a zero.
 */
export function impactLine(eaten: number, adding: number, target: number | null): string | null {
  if (!target || target <= 0) return null;
  const left = Math.round(target - eaten - adding);
  const n = Math.abs(left).toLocaleString('en-US');
  return left >= 0 ? `${n} left after this` : `${n} over after this`;
}

/** The extra nutrients the `.dc` lists, in its order, from whatever the source actually gave us. */
export const EXTRA_NUTRIENTS: { key: string; label: string; unit: 'g' | 'mg' }[] = [
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'satFat', label: 'Saturated fat', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
];

export interface ExtraRow {
  label: string;
  value: string;
}

/**
 * Scale the stored per-100 g micronutrients to this portion. A nutrient the source never gave is OMITTED,
 * never shown as 0 — "0 g fiber" and "we don't know" are different claims, and only one of them is ours
 * to make.
 */
export function extraRows(micros: Record<string, number> | null | undefined, grams: number | null): ExtraRow[] {
  if (!micros || !grams || grams <= 0) return [];
  const k = grams / 100;
  const rows: ExtraRow[] = [];
  for (const { key, label, unit } of EXTRA_NUTRIENTS) {
    const per100 = micros[key];
    if (typeof per100 !== 'number' || !Number.isFinite(per100)) continue;
    const scaled = per100 * k;
    rows.push({
      label,
      value: unit === 'mg' ? `${Math.round(scaled).toLocaleString('en-US')} mg` : `${oneDecimal(scaled)} g`,
    });
  }
  return rows;
}

/** 13 → "13", 13.25 → "13.3" — grams read to one decimal, and never as "13.0". */
export function oneDecimal(n: number): string {
  const r = Math.round(n * 10) / 10;
  return r % 1 === 0 ? r.toFixed(0) : r.toFixed(1);
}
