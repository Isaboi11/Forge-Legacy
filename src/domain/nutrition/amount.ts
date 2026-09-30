/**
 * Nutrition — the ONE reader for a number an athlete typed (QA 09-26, R2-B1).
 *
 * Every amount field used to read its own text: `Number(v)` in Quick Add ("20g" became NaN, the server
 * refused the row and nothing said so), a digit filter in Food Detail ("-5" quietly became 5), and no
 * ceiling anywhere (99,999,999 cal logged, and the ring printed it). One parser, one set of limits, and
 * the words for each refusal live here so every field says the same thing.
 *
 * ⚠ Pure and relative-imported, so `node --test` can prove it (NUT-D4).
 */

import { grouped } from './day.ts';
import { quickAddMacros, type PortionMacros } from './serving.ts';

/* ── the limits ───────────────────────────────────────────────────────────── */

/** A single entry above this is asked about before it is written — a slip of the thumb, usually. */
export const ENTRY_KCAL_ASK = 5000;
/** A single entry can never hold more than this. No real plate does; a typo does. */
export const ENTRY_KCAL_MAX = 20000;
/** The most grams of one macro a single entry can hold. */
export const ENTRY_MACRO_MAX = 2000;
/** The heaviest single portion: ten kilograms. */
export const PORTION_GRAMS_MAX = 10000;
/** A manual daily target above this is asked about before it is saved. */
export const TARGET_KCAL_ASK = 6000;
/** The highest daily target that can be saved (the meal plan's own check stops at the same number, 0211). */
export const TARGET_KCAL_MAX = 10000;

/* ── reading one field ────────────────────────────────────────────────────── */

export type AmountIssue = 'not-a-number' | 'negative' | 'too-big';

export interface Amount {
  /** The number that was typed. Null when the field is blank or cannot be used. */
  value: number | null;
  /** Nothing typed. Not an error — a blank optional field is simply not given. */
  blank: boolean;
  issue: AmountIssue | null;
}

/**
 * Read a typed amount. A trailing unit is dropped ("20g", "450 kcal"), "1,200" is twelve hundred and
 * "1,5" is one and a half; a minus sign, a word, or a figure past `max` is REFUSED with the reason —
 * never silently turned into some other number.
 */
export function parseAmount(text: string | null | undefined, max = Infinity): Amount {
  const s = String(text ?? '').trim();
  if (!s) return { value: null, blank: true, issue: null };

  const m = /^([+-]?)\s*([\d.,]*\d[\d.,]*)\s*[a-zA-Zµ%]*\.?$/.exec(s);
  if (!m) return { value: null, blank: false, issue: 'not-a-number' };

  let digits = m[2];
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(digits)) digits = digits.replace(/,/g, '');
  else if (/^\d*,\d+$/.test(digits)) digits = digits.replace(',', '.');
  const n = Number(digits);
  if (!Number.isFinite(n)) return { value: null, blank: false, issue: 'not-a-number' };
  if (m[1] === '-' && n > 0) return { value: null, blank: false, issue: 'negative' };
  if (n > max) return { value: null, blank: false, issue: 'too-big' };
  return { value: n, blank: false, issue: null };
}

/** The line under a field that was refused: "Protein needs a number." Null when the field is fine. */
export function amountIssueLine(label: string, amount: Amount, max?: number, unit = ''): string | null {
  switch (amount.issue) {
    case 'not-a-number':
      return `${label} needs a number.`;
    case 'negative':
      return `${label} can’t be below zero.`;
    case 'too-big':
      return `${label} can’t be more than ${grouped(max ?? 0)}${unit}.`;
    default:
      return null;
  }
}

/** "5,200 cal is a lot for one entry. Tap again if it’s right." — said once, before a large entry is written. */
export function largeEntryLine(kcal: number): string {
  return `${grouped(kcal)} cal is a lot for one entry. Tap again if it’s right.`;
}

/* ── a Quick Add, typed ───────────────────────────────────────────────────── */

export interface QuickFields {
  kcal: string;
  protein: string;
  carb: string;
  fat: string;
}

export interface QuickCheck {
  /** What would be written. Null until calories are above zero and every field reads as a number in range. */
  macros: PortionMacros | null;
  /** The fields to mark. */
  bad: (keyof QuickFields)[];
  /** The first thing wrong, in words. Null when nothing is — including while calories are simply blank. */
  message: string | null;
  /** True when the entry is large enough to ask about first (`ENTRY_KCAL_ASK`). */
  ask: boolean;
}

const QUICK_FIELDS: { key: keyof QuickFields; label: string; max: number; unit: string }[] = [
  { key: 'kcal', label: 'Calories', max: ENTRY_KCAL_MAX, unit: '' },
  { key: 'protein', label: 'Protein', max: ENTRY_MACRO_MAX, unit: ' g' },
  { key: 'carb', label: 'Carbs', max: ENTRY_MACRO_MAX, unit: ' g' },
  { key: 'fat', label: 'Fat', max: ENTRY_MACRO_MAX, unit: ' g' },
];

/** Read the four Quick Add fields together — the add sheet and the edit sheet ask the same question. */
export function checkQuickEntry(fields: QuickFields): QuickCheck {
  const bad: (keyof QuickFields)[] = [];
  let message: string | null = null;
  const values: Partial<Record<keyof QuickFields, number>> = {};

  for (const f of QUICK_FIELDS) {
    const amount = parseAmount(fields[f.key], f.max);
    const line = amountIssueLine(f.label, amount, f.max, f.unit);
    if (line) {
      bad.push(f.key);
      message ??= line;
    } else if (amount.value != null) {
      values[f.key] = amount.value;
    }
  }

  if (bad.length) return { macros: null, bad, message, ask: false };
  if (values.kcal == null) return { macros: null, bad, message: null, ask: false };
  const macros = quickAddMacros({ kcal: values.kcal, protein: values.protein, carb: values.carb, fat: values.fat });
  if (macros.kcal <= 0) return { macros: null, bad: ['kcal'], message: 'Calories need to be above zero.', ask: false };
  return { macros, bad, message: null, ask: macros.kcal > ENTRY_KCAL_ASK };
}

/* ── a manual daily target ────────────────────────────────────────────────── */

/** Whether a typed daily target is past the ceiling (`too-high`), large enough to ask about (`ask`), or neither. */
export function targetCeiling(kcal: number | null): 'too-high' | 'ask' | null {
  if (kcal == null || !Number.isFinite(kcal)) return null;
  if (kcal > TARGET_KCAL_MAX) return 'too-high';
  return kcal > TARGET_KCAL_ASK ? 'ask' : null;
}
