import { defaultServing, looksSane, MAY_STORE_MICROS, portionLabel, portionMacros, servingOptions } from './serving.ts';
import type { CatalogFood, Portion, PortionMacros, Serving } from './serving.ts';
import type { MealItem } from './meal-photo-read.ts';
import type { MealSlot } from './day.ts';

/**
 * A PHOTOGRAPHED MEAL → A REVIEW LIST OF DATABASE FOODS. Pure, so `node --test` can prove every rule.
 *
 * The read (`meal-photo-read.ts`) says what is on the plate and roughly how much. This turns each item into
 * a row the athlete checks: the item as seen, the database food it matched, and a portion. The calories on
 * the row are `portionMacros(matched food, portion)` — the same multiplication Food Detail and Log Food use
 * — so a row with no match has no calories at all, never a guessed number.
 *
 * ══ ⛔ NEVER A LOOSE MATCH ══
 *
 * A food-search hit joins the plate only when it names the SAME food: at least half of the item's words
 * (and every word of a one-word item) appear in the hit's name or brand. "Rice" never becomes "Rice
 * Krispies Treats" because the plural matched; a hit that fails is offered as a CHOICE ("Swap") and the row
 * says "No match yet" until the athlete picks. The same rule `recipe-import.ts` holds for recipes
 * (Holt-Kitchen-Scope §3.4: unmatched is shown as unmatched, never guessed).
 *
 * ══ THE PORTION ══
 *
 * The model's estimate becomes the food's OWN serving when its unit is one the food has ("2 slices" of a
 * food with a "1 slice" serving) and the weights roughly agree; otherwise it becomes grams. Either way the
 * row says "estimated" until the athlete touches it.
 */

export interface ReviewRow {
  /** Stable key for the list. */
  id: string;
  /** What the photo showed, in the model's words — or the food's name for a row the athlete added. */
  seen: string;
  /** The read item, when the row came from the photo. */
  item: MealItem | null;
  /** The matched database food, or null — "No match yet". */
  food: CatalogFood | null;
  /** The portion, or null when the food has no weighed serving to start from. */
  portion: Portion | null;
  /** True while the portion is still the photo's guess. Cleared the moment the athlete sets it. */
  estimated: boolean;
  /** Database foods the athlete may swap to — the search's sane hits, best first. Never auto-picked beyond `food`. */
  candidates: CatalogFood[];
}

/* ── the words ──────────────────────────────────────────────────────────── */

const STOP = new Set([
  'a', 'an', 'and', 'the', 'of', 'with', 'in', 'on', 'or', 'for', 'to', 'style', 'plain', 'fresh', 'homemade',
  'cooked', 'raw', 'serving', 'piece', 'pieces', 'side', 'small', 'medium', 'large', 'some',
]);

const singular = (w: string): string =>
  w.length > 3 && w.endsWith('ies')
    ? `${w.slice(0, -3)}y`
    : w.length > 3 && w.endsWith('oes')
      ? w.slice(0, -2)
      : w.length > 3 && w.endsWith('s') && !w.endsWith('ss')
        ? w.slice(0, -1)
        : w;

/** Lower-case content words, singular, without filler — the unit of every comparison here. */
export function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map(singular);
}

/**
 * How well a hit names the item: the share of the item's words found in the hit's name + brand (0–1), or
 * -1 when it fails the rule above. Ties go to the shorter name (fewer words the item did not ask for).
 */
export function matchScore(item: Pick<MealItem, 'name' | 'search'>, food: CatalogFood): number {
  const want = new Set([...words(item.search), ...words(item.name)]);
  const primary = new Set(words(item.search).length ? words(item.search) : words(item.name));
  if (!primary.size) return -1;
  const have = new Set(words(`${food.name} ${food.brand ?? ''}`));
  let hitPrimary = 0;
  for (const w of primary) if (have.has(w)) hitPrimary += 1;
  const need = primary.size === 1 ? 1 : Math.ceil(primary.size / 2);
  if (hitPrimary < need) return -1;
  let hitAll = 0;
  for (const w of want) if (have.has(w)) hitAll += 1;
  const coverage = hitAll / want.size;
  const extra = Math.max(0, have.size - hitAll);
  return coverage - extra * 0.02;
}

/**
 * The best certain match among a search's hits, and the sane hits as swap candidates. Search order breaks
 * ties — `food-search` already ranks generic foods and real servings first.
 */
export function pickMatch(item: Pick<MealItem, 'name' | 'search'>, hits: CatalogFood[]): { food: CatalogFood | null; candidates: CatalogFood[] } {
  const sane = hits.filter(looksSane);
  let best: CatalogFood | null = null;
  let bestScore = -1;
  for (const food of sane) {
    const s = matchScore(item, food);
    if (s > bestScore + 1e-9) {
      best = food;
      bestScore = s;
    }
  }
  return { food: bestScore >= 0 ? best : null, candidates: sane.slice(0, 8) };
}

/* ── the portion ────────────────────────────────────────────────────────── */

/** A weighed serving of exactly `g` grams. "150 g" on the row. */
export function gramsServing(g: number): Serving {
  const grams = Math.max(1, Math.round(g));
  return { label: `${grams} g`, grams };
}

const UNIT_ALIAS: Record<string, string> = {
  tablespoon: 'tbsp', tbs: 'tbsp', tbl: 'tbsp', teaspoon: 'tsp', ounce: 'oz', cups: 'cup',
  item: 'piece', each: 'piece', whole: 'piece', serving: 'piece', pc: 'piece',
};

function unitWord(u: string): string {
  const w = singular(u.toLowerCase().replace(/[^a-z ]+/g, ' ').trim().split(/\s+/)[0] ?? '');
  return UNIT_ALIAS[w] ?? w;
}

/** "1 cup (240 g)" → { n: 1, unit: "cup" } · "2 slices" → { n: 2, unit: "slice" } · "1 medium" → medium. */
function servingUnit(label: string): { n: number; unit: string } {
  const m = /^\s*(\d+(?:\.\d+)?|\d+\/\d+)?\s*(.*)$/.exec(label.replace(/\([^)]*\)/g, ''));
  const raw = m?.[1];
  let n = 1;
  if (raw?.includes('/')) {
    const [a, b] = raw.split('/').map(Number);
    n = b ? a / b : 1;
  } else if (raw) n = Number(raw);
  return { n: n > 0 ? n : 1, unit: unitWord(m?.[2] ?? '') };
}

/** Weights "roughly agree" when one is within 2.5× of the other — a slice is a slice, give or take. */
const agrees = (a: number, b: number) => a / b <= 2.5 && b / a <= 2.5;

/**
 * The starting portion for a matched food: its own serving in the model's unit when it has one that fits,
 * else the model's grams, else the food's default weighed serving once. Null only when the food has no
 * weight to multiply by at all — the row then asks for a portion rather than log a zero.
 */
export function initialPortion(food: CatalogFood, item: Pick<MealItem, 'amount' | 'unit' | 'grams'> | null): Portion | null {
  if (item) {
    const unit = unitWord(item.unit);
    if (item.amount != null && unit && unit !== 'g' && unit !== 'gram') {
      for (const serving of servingOptions(food)) {
        if (serving.grams == null) continue;
        const s = servingUnit(serving.label);
        if (s.unit !== unit) continue;
        const quantity = Math.round((item.amount / s.n) * 100) / 100;
        if (!(quantity > 0)) continue;
        if (item.grams != null && !agrees(serving.grams * quantity, item.grams)) break;
        return { serving, quantity };
      }
    }
    if (item.grams != null) return { serving: gramsServing(item.grams), quantity: 1 };
    if (item.amount != null && unitWord(item.unit) === 'g') return { serving: gramsServing(item.amount), quantity: 1 };
  }
  // The food's default serving — or, when that has no weight ("1 bar"), its first weighed one ("100 g").
  const first = defaultServing(food);
  const fallback = first.grams != null ? first : servingOptions(food).find((s) => s.grams != null);
  return fallback ? { serving: fallback, quantity: 1 } : null;
}

/* ── the rows ───────────────────────────────────────────────────────────── */

/** One row per read item, matched against that item's search hits. */
export function rowFromHits(id: string, item: MealItem, hits: CatalogFood[]): ReviewRow {
  const { food, candidates } = pickMatch(item, hits);
  return {
    id,
    seen: item.name,
    item,
    food,
    portion: food ? initialPortion(food, item) : null,
    estimated: food != null,
    candidates,
  };
}

/** A row the athlete added by hand, or a swap: the chosen food, starting from the photo's estimate if any. */
export function withFood(row: ReviewRow, food: CatalogFood): ReviewRow {
  return { ...row, food, portion: initialPortion(food, row.item), estimated: row.item != null };
}

/** The athlete set the portion — it is theirs now, not the photo's. */
export function withPortion(row: ReviewRow, portion: Portion): ReviewRow {
  return { ...row, portion, estimated: false };
}

const ZERO: PortionMacros = { kcal: 0, protein: 0, carb: 0, fat: 0, grams: null };

/** The row's numbers — database food × portion, or nothing. */
export function rowMacros(row: ReviewRow): PortionMacros {
  return row.food && row.portion ? portionMacros(row.food, row.portion) : ZERO;
}

/** A row can be logged when it has a food and a portion that weighs something. */
export const loggable = (row: ReviewRow): boolean => row.food != null && row.portion != null && row.portion.serving.grams != null && row.portion.quantity > 0;

export function mealTotals(rows: ReviewRow[]): { kcal: number; protein: number; carb: number; fat: number } {
  const t = { kcal: 0, protein: 0, carb: 0, fat: 0 };
  for (const row of rows) {
    if (!loggable(row)) continue;
    const m = rowMacros(row);
    t.kcal += m.kcal;
    t.protein += m.protein;
    t.carb += m.carb;
    t.fat += m.fat;
  }
  return { kcal: Math.round(t.kcal), protein: Math.round(t.protein), carb: Math.round(t.carb), fat: Math.round(t.fat) };
}

/** The diary row for one reviewed item — the same shape Food Detail writes (`NewEntry`). */
export interface PhotoEntry {
  meal: MealSlot;
  source: CatalogFood['source'];
  sourceKey: string;
  name: string;
  brand: string | null;
  servingLabel: string;
  quantity: number;
  macros: PortionMacros;
  micros: Record<string, number> | null;
}

/** Every loggable row as a diary entry. Unmatched rows are left out — the screen says so before the tap. */
export function entriesFrom(rows: ReviewRow[], meal: MealSlot): PhotoEntry[] {
  const out: PhotoEntry[] = [];
  for (const row of rows) {
    if (!loggable(row)) continue;
    const food = row.food!;
    const portion = row.portion!;
    out.push({
      meal,
      source: food.source,
      sourceKey: food.key,
      name: food.name,
      brand: food.brand ?? null,
      servingLabel: portionLabel(portion),
      quantity: portion.quantity,
      macros: portionMacros(food, portion),
      // Only from a source whose licence allows keeping them (§4) — FatSecret's does not.
      micros: MAY_STORE_MICROS.has(food.source) ? (food.micros ?? null) : null,
    });
  }
  return out;
}

/** The line under the list while anything is left out of the log. */
export function unmatchedNote(rows: ReviewRow[]): string {
  const n = rows.filter((r) => !loggable(r)).length;
  if (!n) return '';
  return `${n} ${n === 1 ? 'item isn’t' : 'items aren’t'} matched yet and won’t be logged. Tap to pick a food, or remove.`;
}

/** The toast after a read. */
export function readToast(rows: ReviewRow[]): string {
  const matched = rows.filter(loggable).length;
  if (matched === rows.length) return `Found ${rows.length} ${rows.length === 1 ? 'food' : 'foods'}. Check the portions, then log.`;
  return `Matched ${matched} of ${rows.length}. Pick a food for the rest, or remove them.`;
}
