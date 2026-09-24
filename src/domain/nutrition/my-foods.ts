import type { CatalogFood } from './serving.ts';
import { MAY_STORE_MICROS, defaultServing, portionLabel, portionMacros, servingOptions } from './serving.ts';

/**
 * My Foods & Meals (`My Foods and Meals.dc.html`) — the pure half: list text, the meal editor's items,
 * and the rows a saved meal writes. `src/app/my-foods.tsx` paints; `data/nutrition-live.ts` stores.
 *
 * ⚠ **A SAVED MEAL ITEM STORES ITS NUMBERS ALREADY MULTIPLIED** (0205 `saved_meal_items`), exactly as a
 * diary row does, and `serving_label` already carries the quantity ("2 × 1 slice (60 g)"). The editor's
 * stepper changes the quantity, so an item is read back to ONE unit (`itemFromRow`) and multiplied out
 * again on save (`itemRow`). Stepping 1 → 2 → 1 must land on the numbers it started with.
 *
 * ⚠ **MICROS ARE PER 100 g** on every row (see `food-detail.tsx`), so they never scale with quantity.
 */

export type ItemSource = 'usda' | 'off' | 'fs' | 'custom' | 'quick';

export interface MealItem {
  source: ItemSource;
  sourceKey: string | null;
  name: string;
  brand: string | null;
  /** One unit's label, without the quantity: "1 slice", "150 g". Null for a Quick Add. */
  unit: string | null;
  /** One unit's weight. Null when the serving was never weighed. */
  unitGrams: number | null;
  quantity: number;
  /** One unit's numbers. */
  per: { kcal: number; protein: number; carb: number; fat: number };
  micros: Record<string, number> | null;
}

/** A `saved_meal_items` row as the table holds it (numbers multiplied out). */
export interface SavedItemRow {
  source: ItemSource;
  source_key: string | null;
  name: string;
  brand: string | null;
  serving_label: string | null;
  grams: number | null;
  quantity: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  micros?: Record<string, number> | null;
}

export const QTY_STEP = 0.5;
export const QTY_MIN = 0.5;
export const QTY_MAX = 20;
export const MEAL_NAME_MAX = 40;

const round = (n: number, dp = 0): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/**
 * One unit's label out of a stored serving label. `portionLabel` writes "2 × 1 slice (60 g)" for two and
 * "1 slice (30 g)" for one; both come back as "1 slice". A bare "150 g" stays "150 g".
 */
export function unitOf(label: string | null | undefined, quantity: number): string | null {
  let s = (label ?? '').trim();
  if (!s) return null;
  if (quantity !== 1) s = s.replace(/^\s*\d+(?:\.\d+)?\s*×\s*/, '');
  s = s.replace(/\s*\(\s*\d+(?:\.\d+)?\s*g\s*\)\s*$/i, '');
  return s.trim() || null;
}

export function itemFromRow(r: SavedItemRow): MealItem {
  const q = Number(r.quantity) > 0 ? Number(r.quantity) : 1;
  const grams = r.grams != null ? Number(r.grams) : null;
  return {
    source: r.source,
    sourceKey: r.source_key ?? null,
    name: r.name,
    brand: r.brand ?? null,
    unit: unitOf(r.serving_label, q),
    unitGrams: grams != null && grams > 0 ? grams / q : null,
    quantity: q,
    per: {
      kcal: Number(r.kcal) / q,
      protein: Number(r.protein) / q,
      carb: Number(r.carb) / q,
      fat: Number(r.fat) / q,
    },
    micros: r.micros ?? null,
  };
}

/** A food picked from search, at its default serving, one of it. */
export function itemFromFood(food: CatalogFood): MealItem {
  const serving = defaultServing(food);
  const m = portionMacros(food, { serving, quantity: 1 });
  return {
    source: food.source,
    sourceKey: food.key,
    name: food.name,
    brand: food.brand ?? null,
    unit: serving.label,
    unitGrams: serving.grams,
    quantity: 1,
    per: { kcal: m.kcal, protein: m.protein, carb: m.carb, fat: m.fat },
    micros: MAY_STORE_MICROS.has(food.source) ? (food.micros ?? null) : null,
  };
}

/** What `saved_meal_items` stores for an item — multiplied out, labelled the way the diary labels it. */
export function itemRow(item: MealItem): SavedItemRow {
  const q = item.quantity;
  return {
    source: item.source,
    source_key: item.sourceKey,
    name: item.name,
    brand: item.brand,
    serving_label: item.unit ? portionLabel({ serving: { label: item.unit, grams: item.unitGrams }, quantity: q }) : null,
    grams: item.unitGrams != null ? round(item.unitGrams * q, 1) : null,
    quantity: q,
    kcal: round(item.per.kcal * q),
    protein: round(item.per.protein * q, 1),
    carb: round(item.per.carb * q, 1),
    fat: round(item.per.fat * q, 1),
    micros: item.micros,
  };
}

/** The stepper: half a unit at a time, never below half, never above twenty. */
export function stepQty(q: number, dir: 1 | -1): number {
  return Math.min(QTY_MAX, Math.max(QTY_MIN, round(q + dir * QTY_STEP, 2)));
}

/** "½" · "1" · "1½" — and an honest decimal for a quantity saved off the half-step grid. */
export function qtyText(q: number): string {
  const whole = Math.floor(q);
  const rest = round(q - whole, 2);
  if (rest === 0) return String(whole);
  if (rest === 0.5) return whole === 0 ? '½' : `${whole}½`;
  return String(round(q, 2));
}

/** "1 slice" for one, "1½ × 1 slice" for more. */
export function amountLine(item: MealItem): string {
  const unit = item.unit ?? 'serving';
  return item.quantity === 1 ? unit : `${qtyText(item.quantity)} × ${unit}`;
}

export function itemKcal(item: MealItem): number {
  return round(item.per.kcal * item.quantity);
}

export function mealTotals(items: readonly MealItem[]): { kcal: number; protein: number } {
  return {
    kcal: round(items.reduce((t, i) => t + i.per.kcal * i.quantity, 0)),
    protein: round(items.reduce((t, i) => t + i.per.protein * i.quantity, 0)),
  };
}

/** The footer line above Save — '' when the meal can be saved. */
export function missingLine(name: string, items: readonly MealItem[]): string {
  const miss: string[] = [];
  if (!name.trim()) miss.push('a name');
  if (!items.length) miss.push('a food');
  return miss.length ? `Add ${miss.join(' and ')}` : '';
}

/** Every word of the query appears in the name — the `.dc`'s search, case-blind. */
export function matchesQuery(name: string, q: string): boolean {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const n = name.toLowerCase();
  return words.every((w) => n.includes(w));
}

/**
 * The serving a custom food is listed and logged at: the first one the athlete gave it (Create Food logs
 * `servings[0]`), falling back to 100 g.
 */
export function listServing(food: CatalogFood) {
  return servingOptions(food)[0];
}

export function foodListKcal(food: CatalogFood): number {
  return portionMacros(food, { serving: listServing(food), quantity: 1 }).kcal;
}

/** "1 wrap · Dymatize" */
export function foodMeta(food: CatalogFood): string {
  return [listServing(food).label, food.brand].filter(Boolean).join(' · ');
}

/** "3 foods · Rolled oats, Whey isolate, Banana" — each name up to its first comma. */
export function mealMeta(names: readonly string[]): string {
  const n = names.length;
  const head = `${n} ${n === 1 ? 'food' : 'foods'}`;
  return n ? `${head} · ${names.map((x) => x.split(',')[0].trim()).join(', ')}` : head;
}
