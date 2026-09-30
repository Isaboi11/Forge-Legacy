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
import { pluralWord } from '../text/plural.ts';

export interface UnitChoice {
  /** What the pill says: a gram serving reads "grams", everything else keeps the source's own word. */
  label: string;
  /** The serving behind it. `grams: 1` is the gram unit. */
  serving: Serving;
}

/** True for the "1 g" unit the `.dc` labels "grams" — the one unit whose amount IS a gram count. */
const isGramUnit = (s: Serving) => s.grams === 1 || /^(100\s*)?g(rams?)?$/i.test(s.label);

/** "250 g" · "12 oz" · "330 ml" — a serving that is nothing but its weight. */
const WEIGHT_ONLY = /^\d+(\.\d+)?\s*(g|ml|oz)$/i;

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
    /* ⚠ A serving with no weight cannot be multiplied, so it can only ever say 0 (PO 09-28: a scanned
       rice opened on "about 2/3 cup · 0 cal" — USDA's unit was "GRM", which food-search did not read).
       Without it the food opens on grams, which is always true. */
    if (s.grams == null) continue;
    /* A serving that is only a weight ("250 g" — every food typed into Create Food by weight) beside the
       gram pill read as two gram units, "250 G" and "GRAMS" (QA 09-26 N-41). Named, it is the food's serving. */
    const label = WEIGHT_ONLY.test(s.label.trim()) ? `1 serving (${s.label.trim()})` : s.label;
    out.push({ label, serving: s });
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

/* A size is an adjective, not a noun: "3 large" (eggs), never "3 larges" (QA 09-26 N-22). */
const SIZE_WORD = /\b(small|medium|large|jumbo|mini|whole)$/i;
/* Abbreviated units read the same at any amount: "2 tbsp", "3 fl oz". */
const ABBREVIATION = /\b(g|kg|mg|ml|l|oz|lb|lbs|tbsp|tsp|cl|dl)\.?$/i;

/**
 * "g" · "cup" · "cups" · "large" · "breasts, boneless" — the word beside the amount, pluralised only where
 * English wants it, by the shared `pluralWord` (half a breast is "0.5 breast", QA 09-26 N-22). Only the HEAD
 * of the label changes: "cup, chopped" becomes "cups, chopped", and a size ("large", "medium (7" long)") never.
 */
export function unitWord(choice: UnitChoice, amount: number): string {
  if (choice.serving.grams === 1) return 'g';
  // A weight-only serving (N-41) counts servings; its weight is on the pill.
  if (/^1 serving \(/.test(choice.label)) return pluralWord(amount, 'serving');
  // "1 McDonald's Big Mac" already counts one; beside an amount it reads "0.9 1 McDonald's Big Macs".
  const label = choice.label.replace(/^1\s+(?=\D)/, '');
  if (/\boz\b|ounce/i.test(label)) return label;
  const cut = label.search(/[,(]/);
  const head = (cut < 0 ? label : label.slice(0, cut)).trimEnd();
  const tail = label.slice(head.length);
  if (!head || /s$/i.test(head) || /\d$/.test(head) || SIZE_WORD.test(head) || ABBREVIATION.test(head)) return label;
  return `${pluralWord(amount, head)}${tail}`;
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
