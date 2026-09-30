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
  source: 'usda' | 'off' | 'fs' | 'custom' | 'community';
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
export const MAY_STORE_MICROS: ReadonlySet<string> = new Set(['usda', 'custom', 'off', 'community']);

/** What a source badge says on Food Detail. */
export const SOURCE_LABEL: Record<string, string> = {
  usda: 'USDA',
  off: 'Community data',
  /* FatSecret carries eggs, bananas and Diet Coke as well as restaurant food, so "Restaurant data" was wrong
     on most of its rows (QA 09-26 N-20). The source's own name is true for all of them, and matches the
     "Powered by fatsecret" attribution its terms require under the same food. */
  fs: 'FatSecret',
  custom: 'Yours',
  quick: 'Quick add',
  // Amendment 004: foods Forge athletes shared after a barcode missed. Open Food Facts keeps "Community data".
  community: 'Forge athletes',
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

/* ── alcohol & missing energy (QA R2-F3 / R2-F4, 2026-09-26) ─────────────── */

/** Ethanol carries ~7 kcal/g and sits in none of protein, carbs or fat — the whole of a drink's "surplus". */
const KCAL_PER_G_ALCOHOL = 7;

/* Names that say "this is alcohol". Checked against name + brand ("Original" by "Truly Hard Seltzer").
   Each class carries the most alcohol, in g per 100 g, a real product of that class holds — so a drink's
   surplus is allowed, but a per-serving figure filed as per-100 g (a 12 oz beer's 153 kcal) still fails. */
const NOT_A_DRINK = /non[- ]?alcoholic|alcohol[- ]free|\broot beer\b|\bginger (beer|ale)\b|\bbirch beer\b|vinegar|\bsauce\b|\b0(\.0)?\s*% ?abv/i;
const ALCOHOL_CLASSES: { re: RegExp; maxAlcoholG: number }[] = [
  // Spirits, liqueurs, cocktails: up to 190-proof grain spirit.
  {
    re: /\b(vodka|whiske?y|bourbon|scotch|rum|gin|tequila|mezcal|brandy|cognac|liqueurs?|schnapps|absinthe|spirits?|cocktails?|margarita|martini|mojito|daiquiri|soju|baijiu|everclear|amaretto|kahlua|sambuca|ouzo|grappa|proof)\b/i,
    maxAlcoholG: 80,
  },
  // Wine, sake, fortified and dessert wines (port ~20% ABV ≈ 16 g/100 g).
  { re: /\b(wines?|sake|champagne|prosecco|cava|sherry|port|vermouth|mead|sangria|madeira|marsala)\b/i, maxAlcoholG: 16 },
  // Beer, cider, hard seltzer: a 12.5% barleywine is ~10 g/100 g.
  {
    re: /\b(beers?|lagers?|ales?|ipa|stouts?|porters?|pilsners?|pils|hefeweizen|witbier|ciders?|hard (seltzer|kombucha|lemonade|tea)|malt beverage|shandy)\b/i,
    maxAlcoholG: 10,
  },
];

/** Grams of alcohol per 100 g the food's NAME allows — 0 for anything that isn't an alcoholic drink. */
export function alcoholAllowance(food: Pick<CatalogFood, 'name' | 'brand'>): number {
  const text = `${food.name ?? ''} ${food.brand ?? ''}`;
  if (NOT_A_DRINK.test(text)) return 0;
  return ALCOHOL_CLASSES.reduce((max, c) => (c.re.test(text) ? Math.max(max, c.maxAlcoholG) : max), 0);
}

/* Foods that genuinely have no energy at all. Only these may report "0 kcal, no macros" and be believed;
   anything else with that shape is a row whose numbers were never filled in. */
const TRULY_ZERO =
  /\b(water|diet|zero|sugar[- ]free|unsweetened|black coffee|coffee|espresso|tea|club soda|seltzer|sparkling|mineral|sweetener|stevia|sucralose|salt)\b/i;
/* ...unless the name also says there is food in it: "Coffee cake", "Sweet tea", "Zero sugar protein bar" and
   "Salted caramel latte" at 0 kcal are blanks, not free food (QA 09-26 N-21, 0-cal rows passing the filter). */
const HAS_ENERGY =
  /\b(cakes?|cookies?|creamer|latte|mocha|cappuccino|frappuccino|lemonade|milk|smoothie|shake|muffins?|sweet|sweetened|honey|juice|bars?|chips?|caramel|chocolate)\b/i;

/** Alcohol per 100 g, when the source stated it (FDC nutrient 221 lands here as `micros.alcohol`). */
function statedAlcohol(food: CatalogFood): number | null {
  const a = food.micros?.alcohol;
  return typeof a === 'number' && Number.isFinite(a) && a >= 0 ? a : null;
}

const macroEnergy = (food: CatalogFood): number =>
  (food.protein100 ?? 0) * 4 + (food.carb100 ?? 0) * 4 + (food.fat100 ?? 0) * 9;

/**
 * Do we actually KNOW this food's calories? `null` is unknown, and so is "0 kcal with no macros" unless the
 * food is one that really has none (water, diet soda, black coffee). A community "Red Wine · 0 cal" row is
 * missing data, not a free glass of wine — and a one-tap log must never write it as zero (R2-F3).
 */
export function energyKnown(food: CatalogFood): boolean {
  const kcal = food.kcal100;
  if (kcal == null || !Number.isFinite(kcal) || kcal < 0) return false;
  if (kcal > 0 || macroEnergy(food) > 0) return true;
  const name = food.name ?? '';
  return TRULY_ZERO.test(name) && !HAS_ENERGY.test(name) && alcoholAllowance(food) === 0;
}

/* Search order by source (QA 09-26 N-21). Open Food Facts and Forge-athlete rows are typed by the public,
   and a "Big Mac · 540 cal / 100 g" (a real one is about 257) is internally consistent, so no ratio check
   can catch it — but it can stop leading the list. Your own foods, USDA and FatSecret come first. */
const SOURCE_TIER: Record<CatalogFood['source'], number> = { custom: 0, usda: 0, fs: 0, community: 1, off: 1 };

/** A stable partition: reviewed sources first, community-entered after, relevance order kept inside each. */
export function rankBySource<T extends Pick<CatalogFood, 'source'>>(foods: readonly T[]): T[] {
  return foods
    .map((food, i) => ({ food, i, tier: SOURCE_TIER[food.source] ?? 1 }))
    .sort((a, b) => a.tier - b.tier || a.i - b.i)
    .map((x) => x.food);
}

/**
 * ⚠ A source sanity check, not a nutrition opinion: energy should be about 4P + 4C + 9F (+ 7 × alcohol).
 * Beyond ±25% the record is wrong (a mis-keyed label, a per-serving figure filed as per-100 g), and a wrong
 * food poisons every day it is logged into. Tolerant on purpose — fibre and rounding move it honestly.
 * (Absolute slack added 2026-09-26: the photo eval found raw lime and fresh basil filtered out of search.)
 *
 * ⚠ **ALCOHOL IS ENERGY THE MACROS DON'T COUNT** (QA R2-F4). Before this, every wine, beer and spirit failed
 * the ratio and search hid them all, while a community "Red Wine · 0 cal" row with no numbers passed. Now a
 * stated alcohol figure joins the sum; failing that, a food NAMED as a drink may run a surplus up to its
 * class's alcohol ceiling — never a deficit, and never on a non-drink. "0 kcal, no macros" is missing data.
 */
export function looksSane(food: CatalogFood): boolean {
  const kcal = food.kcal100;
  if (kcal == null || kcal < 0 || kcal > 900) return false; // >900 kcal/100 g beats pure fat
  if (!energyKnown(food)) return false;
  const alcohol = statedAlcohol(food);
  const fromMacros = macroEnergy(food) + (alcohol ?? 0) * KCAL_PER_G_ALCOHOL;
  if (fromMacros === 0 && kcal < 40) return true; // coffee, spices, diet soda legitimately report nothing
  if (kcal === 0) return false;
  // Low-energy produce misses the ratio honestly: fibre carbs carry ~2 kcal/g, not 4 (a raw lime is 30 kcal
  // against 46 from its macros). A few kcal is never a mis-keyed record, so a small absolute gap passes.
  const gap = Math.abs(fromMacros - kcal);
  if (gap <= 20 || gap / kcal <= 0.25) return true;
  // No stated alcohol: a drink may carry the energy its alcohol class allows, on top of its macros.
  if (alcohol == null) {
    const surplus = kcal - fromMacros;
    const allowance = alcoholAllowance(food) * KCAL_PER_G_ALCOHOL;
    return allowance > 0 && surplus > 0 && surplus <= allowance + 20;
  }
  return false;
}

/**
 * The numbers a diary row stored, re-used for a one-tap repeat from Recent (R2-F3). Null when they cannot
 * be trusted — a non-number (an old cached list without them) or a zero-calorie row, which is either
 * missing data or a row an earlier bug already wrote as 0. The caller then re-reads the food instead.
 */
export function repeatMacros(stored: {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  grams: number | null;
}): PortionMacros | null {
  const { kcal, protein, carb, fat } = stored;
  if (![kcal, protein, carb, fat].every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)) return null;
  if (kcal <= 0) return null;
  const grams = typeof stored.grams === 'number' && Number.isFinite(stored.grams) && stored.grams > 0 ? stored.grams : null;
  return { kcal, protein, carb, fat, grams };
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
