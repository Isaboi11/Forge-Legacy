import type { CatalogFood, Portion, PortionMacros, Serving } from './serving.ts';
import { defaultServing, portionLabel, portionMacros, MAY_STORE_MICROS } from './serving.ts';
import { amountLine, itemKcal, itemRow, MEAL_NAME_MAX, type MealItem, type SavedItemRow } from './my-foods.ts';
import { MEAL_LABELS, MEAL_SLOTS, mealForHour, type MealSlot } from './day.ts';
import type { ActionCardModel } from '../coach/holt-actions.ts';

/**
 * HOLT'S MEAL CARD — an order or a plate Holt looked up, as one meal to log or save (PO 2026-10-01: *"Find the macros
 * for me and make it a meal … to log just as one whole thing called 'Costa Vida chicken salad'"*), and the foods he
 * logs for the athlete (`log_food`, AI Road to 10 Sprint 4a NU-3). Nutrition Architecture Amendment 006, HF-D3/HF-D5.
 *
 * `coach-ask` forwards the foods WHOLE, exactly as `food-search` returned them to his `get_foods` call, plus only the
 * amounts the athlete said (`ask-food-tools.ts` `checkFoodAction` refused any food his search did not return). Every
 * number on the card is made HERE, by the same `portionMacros` Log Food writes with (NUT-D4: the model never writes a
 * number). The card model (`mealCard`) and the writes (`src/data/holt-meal-live.ts`) both start from the forwarded
 * input, so what the athlete confirmed is what is written.
 *
 * ⚠ **A SERVING NOBODY WEIGHED CANNOT BE COUNTED** (HF-D5), and a meal missing its ranch is a meal that logs 300
 * calories light without saying so. Such a food is listed under `missing`, and the card has no Confirm.
 */

export const GRAMS_PER_OZ = 28.349523125;

export interface HoltMealLine {
  name: string;
  brand: string | null;
  /** "4 oz (113.4 g)" · "1 salad (412 g)" · "2 × 1 tbsp". */
  amount: string;
  kcal: number;
}

export interface HoltMealCard {
  name: string;
  lines: HoltMealLine[];
  totals: { kcal: number; protein: number; carb: number; fat: number };
  /** The items as the meal editor holds them — what Save writes (`itemRow`). */
  items: MealItem[];
  /** The same foods with the portion each is logged at — what Log writes, one diary row each (`mealCardEntries`). */
  portions: { food: CatalogFood; portion: Portion }[];
  /** Each source's credit line, once ("Powered by fatsecret" — a licence condition, never dropped). */
  attribution: string[];
  /** Foods that came without a weighed serving. Non-empty → nothing can be logged or saved. */
  missing: string[];
}

const SOURCES: ReadonlySet<string> = new Set(['usda', 'off', 'fs', 'custom', 'community']);
const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null);
const str = (x: unknown, n: number): string => (typeof x === 'string' ? x.trim().slice(0, n) : '');
const round = (n: number, dp = 0): number => Math.round(n * 10 ** dp) / 10 ** dp;

/** One forwarded food → the catalogue shape every nutrition screen multiplies. Null when it isn't one. */
function foodOf(v: unknown): CatalogFood | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const key = str(o.key, 120);
  const name = str(o.name, 120);
  const source = str(o.source, 20);
  if (!key || !name || !SOURCES.has(source) || num(o.kcal100) == null) return null;
  return {
    key,
    source: source as CatalogFood['source'],
    name,
    brand: str(o.brand, 80) || null,
    kcal100: num(o.kcal100),
    protein100: num(o.protein100),
    carb100: num(o.carb100),
    fat100: num(o.fat100),
    servings: (Array.isArray(o.servings) ? o.servings : [])
      .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
      .map((s) => ({ label: str(s.label, 60), grams: (num(s.grams) ?? 0) > 0 ? (s.grams as number) : null }))
      .filter((s) => s.label),
    // The function forwards no micros (FatSecret's permission covers calories and macros only, and USDA's
    // micros never came through get_foods) — so none are kept.
    micros: null,
    attribution: str(o.attribution, 80) || null,
  };
}

/** The serving the athlete named — "4 oz" is a weighed serving of its own — else the food's own. */
function portionFor(food: CatalogFood, amount: number | null, unit: unknown): { serving: Serving; quantity: number } {
  if (amount != null && unit === 'oz') return { serving: { label: `${round(amount, 2)} oz`, grams: round(amount * GRAMS_PER_OZ, 1) }, quantity: 1 };
  if (amount != null && unit === 'g') return { serving: { label: `${round(amount, 1)} g`, grams: amount }, quantity: 1 };
  return { serving: defaultServing(food), quantity: amount ?? 1 };
}

/** The forwarded items → the card's foods, or null when any of them is not a food (dropped whole, never half-drawn). */
function buildCard(name: string, raw: unknown): HoltMealCard | null {
  const list = Array.isArray(raw) ? raw.slice(0, 12) : [];
  if (list.length === 0) return null;
  const items: MealItem[] = [];
  const portions: { food: CatalogFood; portion: Portion }[] = [];
  const missing: string[] = [];
  const attribution: string[] = [];
  for (const r of list) {
    const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    const food = foodOf(o.food);
    if (!food) return null;
    const amount = num(o.amount) && (o.amount as number) > 0 && (o.amount as number) <= 2000 ? (o.amount as number) : null;
    const { serving, quantity } = portionFor(food, amount, o.unit);
    if (serving.grams == null) {
      missing.push(food.name);
      continue;
    }
    const m = portionMacros(food, { serving, quantity: 1 });
    items.push({
      source: food.source,
      sourceKey: food.key,
      name: food.name,
      brand: food.brand ?? null,
      unit: serving.label,
      unitGrams: serving.grams,
      quantity,
      per: { kcal: m.kcal, protein: m.protein, carb: m.carb, fat: m.fat },
      micros: MAY_STORE_MICROS.has(food.source) ? (food.micros ?? null) : null,
    });
    portions.push({ food, portion: { serving, quantity } });
    if (food.attribution && !attribution.includes(food.attribution)) attribution.push(food.attribution);
  }
  const sum = (f: (m: MealItem['per']) => number) => items.reduce((t, it) => t + f(it.per) * it.quantity, 0);
  return {
    name,
    lines: items.map((it) => ({ name: it.name, brand: it.brand, amount: itemRow(it).serving_label ?? amountLine(it), kcal: itemKcal(it) })),
    totals: { kcal: round(sum((m) => m.kcal)), protein: round(sum((m) => m.protein)), carb: round(sum((m) => m.carb)), fat: round(sum((m) => m.fat)) },
    items,
    portions,
    attribution,
    missing,
  };
}

/** `propose_meal`'s forwarded input → the card, or null when nothing in it is a food. */
export function holtMealCard(input: unknown): HoltMealCard | null {
  const i = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const name = str(i.name, MEAL_NAME_MAX);
  if (!name) return null;
  return buildCard(name, i.items);
}

/** `log_food`'s forwarded input → the card (named for the log), or null. */
export function holtFoodLogCard(input: unknown): HoltMealCard | null {
  const i = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return buildCard('Foods to log', i.items);
}

/** The slot `log_food` writes to: the one the athlete named, else the one for the hour (as Log Food opens). */
export function foodLogSlot(input: unknown, hour: number): MealSlot {
  const m = (input as { meal?: unknown } | null)?.meal;
  return (MEAL_SLOTS as readonly string[]).includes(m as string) ? (m as MealSlot) : mealForHour(hour);
}

/** Log and Save are offered only when every food on the card was counted. */
export const mealCardComplete = (c: HoltMealCard): boolean => c.missing.length === 0 && c.items.length > 0;

/** What Save writes to `saved_meal_items` — the meal editor's own rows. */
export const mealCardRows = (c: HoltMealCard): SavedItemRow[] => c.items.map(itemRow);

/** "1,050 cal · 62 g protein · 48 g carbs · 70 g fat" */
export function mealCardLine(c: Pick<HoltMealCard, 'totals'>): string {
  const t = c.totals;
  return `${t.kcal.toLocaleString('en-US')} cal · ${t.protein} g protein · ${t.carb} g carbs · ${t.fat} g fat`;
}

/** A diary row as `addEntries` takes it (`nutrition-live.ts` `NewEntry`). */
export interface HoltMealEntry {
  meal: MealSlot;
  source: CatalogFood['source'] | 'quick';
  sourceKey: string | null;
  name: string;
  brand: string | null;
  servingLabel: string;
  quantity: number;
  macros: PortionMacros;
  micros: Record<string, number> | null;
}

/**
 * propose_meal's Log — the ONE diary row: the order "as one whole thing", which is what was asked for (HF-D3). Its
 * numbers are the card's totals; its weight the items' together.
 */
export function mealCardEntry(c: HoltMealCard): { name: string; servingLabel: string; macros: PortionMacros } {
  const grams = c.items.every((it) => it.unitGrams != null) ? round(c.items.reduce((t, it) => t + (it.unitGrams as number) * it.quantity, 0), 1) : null;
  const n = c.items.length;
  return { name: c.name, servingLabel: `1 meal · ${n} ${n === 1 ? 'food' : 'foods'}`, macros: { ...c.totals, grams } };
}

/** log_food's Log — one diary row per food, each the same `portionMacros` Food Detail writes. */
export function mealCardEntries(c: HoltMealCard, meal: MealSlot): HoltMealEntry[] {
  return c.portions.map(({ food, portion }) => ({
    meal,
    source: food.source,
    sourceKey: food.key,
    name: food.name,
    brand: food.brand ?? null,
    servingLabel: portionLabel(portion),
    quantity: portion.quantity,
    macros: portionMacros(food, portion),
    micros: MAY_STORE_MICROS.has(food.source) ? (food.micros ?? null) : null,
  }));
}

/** log_food's totals — the sum of the rows it writes, so the card says what the diary will. */
function entriesTotals(entries: readonly HoltMealEntry[]): HoltMealCard['totals'] {
  const t = entries.reduce((a, e) => ({ kcal: a.kcal + e.macros.kcal, protein: a.protein + e.macros.protein, carb: a.carb + e.macros.carb, fat: a.fat + e.macros.fat }), { kcal: 0, protein: 0, carb: 0, fat: 0 });
  return { kcal: round(t.kcal), protein: round(t.protein), carb: round(t.carb), fat: round(t.fat) };
}

/** The key the card's second button sends to the executor (`propose_meal`: Save as a meal). */
export const SAVE_MEAL_KEY = 'save';

const blockedLine = (missing: readonly string[]) =>
  `No weighed serving for ${missing.join(', ')}, so this can't be counted here. Log it from Log Food instead.`;

/**
 * The card for `log_food` / `propose_meal` (contract §1.2: what will change, computed by the app, before Confirm; a
 * card that cannot be computed says why and has no Confirm). Null = not a meal action or not drawable — the caller
 * drops it and the athlete is told nothing changed. `hour` picks log_food's slot when the athlete named none.
 */
export function mealCard(action: { name: string; input: unknown }, opts: { hour?: number } = {}): ActionCardModel | null {
  const hour = opts.hour ?? new Date().getHours();
  if (action.name === 'propose_meal') {
    const card = holtMealCard(action.input);
    if (!card) return null;
    const complete = mealCardComplete(card);
    return {
      action: 'propose_meal',
      title: card.name,
      rows: [
        ...card.lines.map((l) => ({ label: l.brand ? `${l.name} · ${l.brand}` : l.name, value: l.amount, note: `${l.kcal} cal` })),
        ...(complete ? [{ label: 'Total', value: mealCardLine(card), note: 'Logged as one entry' }] : []),
      ],
      confirmLabel: complete ? 'Log it' : null,
      ...(complete ? { secondary: { label: 'Save as a meal', key: SAVE_MEAL_KEY } } : { blocked: blockedLine(card.missing) }),
      ...(card.attribution.length ? { credit: card.attribution.join(' · ') } : {}),
    };
  }
  if (action.name === 'log_food') {
    const card = holtFoodLogCard(action.input);
    if (!card) return null;
    const complete = mealCardComplete(card);
    const slot = foodLogSlot(action.input, hour);
    const entries = mealCardEntries(card, slot);
    const n = entries.length;
    return {
      action: 'log_food',
      title: `Log to ${MEAL_LABELS[slot]}`,
      rows: [
        ...entries.map((e) => ({ label: e.brand ? `${e.name} · ${e.brand}` : e.name, value: e.servingLabel, note: `${e.macros.kcal} cal` })),
        ...(complete && n > 1 ? [{ label: 'Total', value: mealCardLine({ totals: entriesTotals(entries) }) }] : []),
      ],
      confirmLabel: complete ? `Log ${n} ${n === 1 ? 'food' : 'foods'} to ${MEAL_LABELS[slot]}` : null,
      ...(complete ? {} : { blocked: blockedLine(card.missing) }),
      ...(card.attribution.length ? { credit: card.attribution.join(' · ') } : {}),
    };
  }
  return null;
}
