/**
 * Nutrition — turning a catalogue food and a chosen serving into the numbers a diary row stores.
 *
 * ⚠ **THIS IS THE ONLY MULTIPLICATION IN NUTRITION.** Food Detail previews with it, Log writes with it,
 * and the row keeps the result (0205). If this drifts, every past day drifts with it — which is exactly
 * why the row stores the answer instead of re-deriving it from a catalogue that may change.
 *
 * Sources state nutrition per 100 g. A serving is either gram-weighted ("1 cup" = 240 g) or not
 * ("1 slice", when a source gives no weight). An unweighted serving cannot be multiplied, so the food
 * falls back to its label serving and the UI says so rather than inventing a gram count.
 */

export interface Serving {
  label: string;
  grams: number | null;
}

export interface CatalogFood {
  key: string;
  source: 'usda' | 'off' | 'fs' | 'custom';
  name: string;
  brand?: string | null;
  kcal100: number | null;
  protein100: number | null;
  carb100: number | null;
  fat100: number | null;
  servings: Serving[];
  /** Per 100 g, and only from a source whose licence permits storing them (`MAY_STORE_MICROS`). */
  micros?: Record<string, number> | null;
  attribution?: string | null;
}

export interface Portion {
  serving: Serving;
  quantity: number;
}

export interface PortionMacros {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  grams: number | null;
}

/** Sources that may keep micronutrients (§4). FatSecret's permission covers calories and macros only. */
export const MAY_STORE_MICROS: ReadonlySet<string> = new Set(['usda', 'custom', 'off']);

/** What a source badge says on Food Detail. */
export const SOURCE_LABEL: Record<string, string> = {
  usda: 'USDA',
  off: 'Community data',
  fs: 'Restaurant data',
  custom: 'Yours',
  quick: 'Quick add',
};

const round = (n: number, dp = 0): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/**
 * Macros for a portion. Gram-weighted servings scale from the per-100 g figures; an unweighted serving
 * has nothing to scale by, so it yields zeros and the caller must offer a weighed serving instead.
 */
export function portionMacros(food: CatalogFood, portion: Portion): PortionMacros {
  const grams = portion.serving.grams;
  const qty = Number.isFinite(portion.quantity) && portion.quantity > 0 ? portion.quantity : 0;
  if (grams == null || grams <= 0 || qty === 0) {
    return { kcal: 0, protein: 0, carb: 0, fat: 0, grams: null };
  }
  const factor = (grams * qty) / 100;
  return {
    kcal: round((food.kcal100 ?? 0) * factor),
    protein: round((food.protein100 ?? 0) * factor, 1),
    carb: round((food.carb100 ?? 0) * factor, 1),
    fat: round((food.fat100 ?? 0) * factor, 1),
    grams: round(grams * qty, 1),
  };
}

/**
 * The serving list a picker shows: the source's own servings, always with a weighed fallback, and never
 * two of the same label. "100 g" is appended rather than prepended — a person reaches for "1 cup" first.
 */
export function servingOptions(food: CatalogFood): Serving[] {
  const out: Serving[] = [];
  const seen = new Set<string>();
  for (const s of food.servings ?? []) {
    const label = s.label?.trim();
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push({ label, grams: s.grams != null && s.grams > 0 ? s.grams : null });
  }
  if (!out.some((s) => s.grams === 100 && /^100\s*(g|ml)/i.test(s.label))) {
    out.push({ label: '100 g', grams: 100 });
  }
  return out;
}

/** The serving a picker opens on: the first weighed, non-generic one, else the first of anything. */
export function defaultServing(food: CatalogFood): Serving {
  const options = servingOptions(food);
  return options.find((s) => s.grams != null && !/^100\s*(g|ml)/i.test(s.label)) ?? options[0];
}

/** "1 cup (240 g)" · "2 × 1 slice" · "150 g" — what the diary row and the meal card show. */
export function portionLabel(portion: Portion): string {
  const { serving, quantity } = portion;
  const head = quantity === 1 ? serving.label : `${round(quantity, 2)} × ${serving.label}`;
  if (serving.grams == null) return head;
  const total = round(serving.grams * quantity, 1);
  return /^\d+(\.\d+)?\s*(g|ml)\b/i.test(serving.label) && quantity === 1 ? head : `${head} (${total} g)`;
}

/**
 * ⚠ A source sanity check, not a nutrition opinion: energy should be about 4P + 4C + 9F. Beyond ±25% the
 * record is wrong (a mis-keyed label, a per-serving figure filed as per-100 g), and a wrong food poisons
 * every day it is logged into. Tolerant on purpose — fibre, alcohol and rounding all move it honestly.
 */
export function looksSane(food: CatalogFood): boolean {
  const kcal = food.kcal100;
  if (kcal == null || kcal < 0 || kcal > 900) return false; // >900 kcal/100 g beats pure fat
  const fromMacros = (food.protein100 ?? 0) * 4 + (food.carb100 ?? 0) * 4 + (food.fat100 ?? 0) * 9;
  if (fromMacros === 0) return kcal === 0 || kcal < 40; // drinks and spices legitimately report nothing
  if (kcal === 0) return false;
  return Math.abs(fromMacros - kcal) / kcal <= 0.25;
}

/** A Quick Add: calories the athlete typed, with optional macros and no food behind them. */
export function quickAddMacros(input: {
  kcal: number;
  protein?: number;
  carb?: number;
  fat?: number;
}): PortionMacros {
  return {
    kcal: Math.max(0, round(input.kcal)),
    protein: Math.max(0, round(input.protein ?? 0, 1)),
    carb: Math.max(0, round(input.carb ?? 0, 1)),
    fat: Math.max(0, round(input.fat ?? 0, 1)),
    grams: null,
  };
}
