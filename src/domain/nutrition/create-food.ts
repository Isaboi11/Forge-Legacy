/**
 * Create Food — turning a nutrition label into a food the catalogue can multiply.
 *
 * Built from `Create Food.dc.html`, whose logic block is the specification: two entry modes, a serving
 * expressed as "1 serving = <amount> <unit>", calories that may be left blank and derived from the
 * macros, and a warning when the two disagree by more than 15%.
 *
 * ⚠ **A LABEL STATES ONE SERVING; THE CATALOGUE STORES PER 100 g.** Every number on the box is per
 * serving, and `food_catalog` / `user_foods` are per-100 g so any portion is a multiplication
 * (`portionMacros`). Entering label figures straight into a per-100 g row is the classic way a custom
 * food ends up three times wrong, so the conversion happens HERE, once, and is tested.
 *
 * ⚠ **AND A SERVING THE APP CANNOT WEIGH CANNOT BE MULTIPLIED.** `portionMacros` returns zeros for a
 * serving with no gram weight — deliberately, because inventing one is worse. "1 piece" and "1 cup" have
 * no weight anybody knows, so this module reports that the athlete must supply one rather than guessing
 * a density and silently creating a food that logs as 0 calories. Pure, relative-imported, NUT-D4.
 */

import type { Serving } from './serving.ts';

/* ── units ────────────────────────────────────────────────────────────────── */

export type FoodUnitKey = 'g' | 'ml' | 'oz' | 'cup' | 'tbsp' | 'piece';

export interface FoodUnit {
  key: FoodUnitKey;
  /** What the picker row says. */
  label: string;
  /** The short word the "per 80 g" line uses. */
  short: string;
  /**
   * Grams in one of this unit, or null when nobody can know.
   *
   * ⚠ `ml` is 1:1 ON PURPOSE and it is not a density claim. It is only ever an internal basis: the
   * athlete picks the millilitre serving back, and 240 ml → 240 g → back to 240 ml round-trips to the
   * exact figures they typed. `portionLabel` prints a plain "240 ml" for it rather than a gram count.
   * `oz` is the real 28.3495 g. A cup of oil and a cup of flour are not the same weight and a "piece"
   * has no weight at all, so those three ask.
   */
  gramsPer: number | null;
  /** A typical weight, shown as a placeholder hint. A hint is a suggestion; it is never stored. */
  weightHint?: string;
}

export const FOOD_UNITS: readonly FoodUnit[] = [
  { key: 'g', label: 'grams', short: 'g', gramsPer: 1 },
  { key: 'ml', label: 'milliliters', short: 'ml', gramsPer: 1 },
  { key: 'oz', label: 'ounces', short: 'oz', gramsPer: 28.3495 },
  { key: 'cup', label: 'cup', short: 'cup', gramsPer: null, weightHint: '240' },
  { key: 'tbsp', label: 'tablespoon', short: 'tbsp', gramsPer: null, weightHint: '15' },
  { key: 'piece', label: 'piece', short: 'piece', gramsPer: null },
] as const;

export const unitByKey = (key: string): FoodUnit => FOOD_UNITS.find((u) => u.key === key) ?? FOOD_UNITS[0];

/** True when the athlete has to tell us what one of these weighs before the food can be scaled. */
export const unitNeedsWeight = (unit: FoodUnit): boolean => unit.gramsPer == null;

const toNumber = (v: string): number => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * What one serving weighs, in grams — the number every other figure is divided by.
 *
 * `unitWeight` is the athlete's answer for a unit that has no standard weight; it is ignored for the
 * three that do. Returns null when the serving cannot be weighed, which is what blocks the save.
 */
export function servingGrams(amount: string, unit: FoodUnit, unitWeight: string): number | null {
  const count = toNumber(amount);
  if (count <= 0) return null;
  const per = unit.gramsPer ?? toNumber(unitWeight);
  if (!(per > 0)) return null;
  return Math.round(count * per * 1000) / 1000;
}

/* ── the label, converted ─────────────────────────────────────────────────── */

/**
 * One field of a label, scaled from "per serving" to "per 100 g". Blank reads as 0, not as unknown.
 *
 * ⚠ **THREE DECIMALS, AND THAT IS NOT FUSSINESS — IT IS THE ROUND TRIP.** A serving weight that is not
 * a neat divisor loses real grams otherwise: 8 g of protein in a 240 g cup is 3.333 per 100 g, and
 * storing that as `3.3` hands back **7.9 g** the moment the athlete logs the cup they just described.
 * `portionMacros` already rounds what it RETURNS (1 dp for macros, whole calories), so the stored basis
 * costs nothing by being finer, and USDA's own rows are held the same way.
 */
export function perHundred(value: string, grams: number, dp = 3): number {
  if (!(grams > 0)) return 0;
  const scaled = (toNumber(value) * 100) / grams;
  const f = 10 ** dp;
  return Math.round(scaled * f) / f;
}

/** The serving the food is created with — what Food Detail opens on. */
export function labelServing(amount: string, unit: FoodUnit, grams: number): Serving {
  const count = toNumber(amount);
  const pretty = Math.round(count * 100) / 100;
  /* A weight unit reads as itself ("80 g"); a named one keeps its word ("1 cup", "2 pieces"). */
  if (unit.key === 'g' || unit.key === 'ml' || unit.key === 'oz') {
    return { label: `${pretty} ${unit.short}`, grams };
  }
  const word = pretty === 1 || /s$/i.test(unit.short) ? unit.short : `${unit.short}s`;
  return { label: `${pretty} ${word}`, grams };
}

/* ── calories vs macros ───────────────────────────────────────────────────── */

/** 4 kcal a gram of protein and of carbohydrate, 9 a gram of fat — the Atwater figures, not an opinion. */
export function caloriesFromMacros(protein: string, carb: string, fat: string): number {
  return Math.round(4 * toNumber(protein) + 4 * toNumber(carb) + 9 * toNumber(fat));
}

export interface CalorieCheck {
  /** What will actually be saved: what was typed, or the macro sum when the field is blank. */
  calories: number;
  /** The line under the fields. Null when there is nothing useful to say. */
  helper: string | null;
  /** True when `helper` is a disagreement rather than an explanation — the `.dc` colours it red. */
  warn: boolean;
  /** What the blank calorie field suggests it would use. */
  placeholder: string;
}

/**
 * The `.dc`'s calorie logic, verbatim.
 *
 * Blank calories are not an error — a label's macros already determine them, and deriving is more
 * accurate than an athlete's arithmetic. A **15%** disagreement between the two is where it stops being
 * rounding (fibre, sugar alcohols and label rounding all move it honestly a few per cent) and starts
 * being a mis-keyed line, so it warns and does not block: the label is the athlete's to read, not ours.
 */
export function checkCalories(fields: { cal: string; protein: string; carb: string; fat: string }): CalorieCheck {
  const macroCal = caloriesFromMacros(fields.protein, fields.carb, fields.fat);
  const hasMacros = fields.protein !== '' || fields.carb !== '' || fields.fat !== '';
  const typed = fields.cal !== '';
  const calories = typed ? toNumber(fields.cal) : macroCal;

  let helper: string | null = hasMacros ? null : 'Leave calories blank to calculate from macros';
  let warn = false;

  if (!typed && hasMacros) {
    helper = `Will save as ${macroCal} cal from macros`;
  } else if (typed && hasMacros && macroCal > 0 && Math.abs(calories - macroCal) / macroCal > 0.15) {
    helper = `Macros add up to about ${macroCal} cal. Check the label.`;
    warn = true;
  } else if (typed) {
    helper = null;
  }

  return { calories, helper, warn, placeholder: hasMacros ? String(macroCal) : '0' };
}

/* ── can it be saved ──────────────────────────────────────────────────────── */

export interface CreateFoodFields {
  name: string;
  brand: string;
  amount: string;
  unitKey: string;
  unitWeight: string;
  cal: string;
  protein: string;
  carb: string;
  fat: string;
}

export interface Validity {
  ok: boolean;
  /** Why not, for the one case the athlete cannot guess: a serving with no weight behind it. */
  reason: string | null;
}

/** Name, a calorie figure above zero, and a serving that can be weighed. Nothing else is required. */
export function validateFood(fields: CreateFoodFields): Validity {
  const unit = unitByKey(fields.unitKey);
  const grams = servingGrams(fields.amount, unit, fields.unitWeight);
  const { calories } = checkCalories(fields);

  if (!fields.name.trim()) return { ok: false, reason: null };
  if (!(toNumber(fields.amount) > 0)) return { ok: false, reason: null };
  if (grams == null) {
    return {
      ok: false,
      reason: `Forge needs to know what one ${unit.short} of this weighs, so it can scale a portion.`,
    };
  }
  if (!(calories > 0)) return { ok: false, reason: null };
  return { ok: true, reason: null };
}

/* ── the extra nutrients ──────────────────────────────────────────────────── */

/**
 * The "More nutrients" grid, in the `.dc`'s order and groups.
 *
 * ⚠ The first five keys are the ones `EXTRA_NUTRIENTS` in `detail.ts` already displays on Food Detail
 * and in a meal's breakdown. The rest are stored and not yet shown anywhere — recorded honestly here
 * rather than silently dropped, because a label that was transcribed once should not have to be
 * transcribed again when those rows are added.
 */
export const MORE_NUTRIENTS: { key: string; label: string; group: 'macro' | 'vitamin' }[] = [
  { key: 'fiber', label: 'Fiber g', group: 'macro' },
  { key: 'sugar', label: 'Sugar g', group: 'macro' },
  { key: 'satFat', label: 'Sat. fat g', group: 'macro' },
  { key: 'sodium', label: 'Sodium mg', group: 'macro' },
  { key: 'cholesterol', label: 'Cholesterol mg', group: 'macro' },
  { key: 'addedSugar', label: 'Added sugar g', group: 'macro' },
  { key: 'potassium', label: 'Potassium mg', group: 'vitamin' },
  { key: 'calcium', label: 'Calcium mg', group: 'vitamin' },
  { key: 'iron', label: 'Iron mg', group: 'vitamin' },
  { key: 'vitaminD', label: 'Vitamin D mcg', group: 'vitamin' },
];

/**
 * Scale the typed per-serving extras to per 100 g, keeping only the ones actually filled in.
 *
 * ⚠ **A BLANK FIELD IS OMITTED, NOT ZERO** — the rule `extraRows` and `mealBreakdown` already enforce
 * when displaying. "We don't know" and "there is none of it" are different claims, and a form full of
 * empty boxes must not turn into a food that confidently reports 0 mg of sodium.
 */
export function extrasPerHundred(values: Record<string, string>, grams: number): Record<string, number> | null {
  const out: Record<string, number> = {};
  for (const { key } of MORE_NUTRIENTS) {
    const raw = values[key];
    if (raw == null || raw.trim() === '') continue;
    out[key] = perHundred(raw, grams);
  }
  return Object.keys(out).length ? out : null;
}
