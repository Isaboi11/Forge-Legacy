import { INGREDIENTS, type IngredientKey, type UsMeasure } from './recipes-data.ts';
import type { RecipeRead } from './recipe-photo-read.ts';
import {
  blankForm,
  clampMinutes,
  clampYield,
  pickGrams,
  portionOf,
  searchFoods,
  withIngredient,
  type RecipeForm,
  type UserIngredient,
} from './user-recipes.ts';

/**
 * A PHOTOGRAPHED RECIPE → A DRAFT OF THE RECIPE FORM. Pure, so `node --test` can prove every rule.
 *
 * The read (`recipe-photo-read.ts`) carries only what the page says. This turns it into the SAME
 * `RecipeForm` the athlete fills by hand, through the same `withIngredient` — so allergens are
 * pre-filled from the catalogue and the recipe starts UNCONFIRMED (NUT-D6: an unconfirmed recipe is
 * never planned). Nothing is saved here; the athlete reviews and saves through the normal path.
 *
 * ══ ⛔ NEVER GUESSED ══
 *
 * Holt-Kitchen-Scope §3.4: *"An ingredient that can't be matched is shown as unmatched. It is never
 * guessed."* So a line joins the recipe only when BOTH halves are certain:
 *
 *   · **The food** — `searchFoods` (the form's own matcher) must return a hit whose name IS the food
 *     ("Eggs" for "egg", "Chicken breast, boneless skinless" for "chicken breasts"). One loose hit is
 *     not enough: "sugar" finds only "Brown sugar", and that is a different food.
 *   · **The amount** — the unit must convert to grams from the ingredient's own USDA measure. A cup of
 *     salmon (an ounce-measured food) does not.
 *
 * Anything else is an `UnmatchedLine`, shown as written, with the catalogue's candidates for the
 * athlete to pick — or drop. Its calories count for nothing until they do.
 */

/**
 * The picker threw (a HEIC on desktop Chrome, `pickImagesFromLibrary`) — said, never read as a cancel. Shared
 * by My Recipes' "Scan a recipe" and the Nutrition tab's "Recipe from a screenshot". Lives here, not in
 * `recipe-photo-read.ts`, because that file is inlined into the Edge Function's paste copy.
 */
export const RECIPE_PICK_FAILED = 'That picture couldn’t be opened. Take a screenshot of the recipe and upload that instead.';

export interface UnmatchedLine {
  /** As written on the page. */
  text: string;
  food: string;
  quantity: number | null;
  unit: string;
  /** `no_match` — nothing in the catalogue; `ambiguous` — several, none certain; `amount` — the food is certain, the amount is not. */
  reason: 'no_match' | 'ambiguous' | 'amount';
  /** What the athlete may pick from. Never auto-picked. */
  candidates: IngredientKey[];
}

export interface RecipeImport {
  form: RecipeForm;
  unmatched: UnmatchedLine[];
  /** How many lines went in without help. */
  matched: number;
}

/* ── the food ───────────────────────────────────────────────────────────── */

const singular = (w: string): string => (w.length > 3 && w.endsWith('ies') ? `${w.slice(0, -3)}y` : w.length > 3 && w.endsWith('oes') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

/** "Chicken breast, boneless skinless" → "chicken breast"; "Avocado oil (or spray)" → "avocado oil". */
function head(name: string): string {
  return norm(name.split(',')[0].replace(/\([^)]*\)/g, ''));
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singular)
    .join(' ');
}

/** The catalogue's hits for a food as written, trying its singular if the plural finds nothing. */
function hitsFor(food: string): IngredientKey[] {
  let hits = searchFoods(food, 8);
  if (!hits.length) hits = searchFoods(norm(food), 8);
  return hits.map((h) => h.key);
}

/** A certain match, or null. Certain = a hit whose name (before the comma, parentheses dropped) IS the food. */
export function matchFood(food: string): { key: IngredientKey | null; candidates: IngredientKey[] } {
  const want = norm(food);
  if (!want) return { key: null, candidates: [] };
  let candidates = hitsFor(food);
  const exact = candidates.find((k) => head(INGREDIENTS[k].name) === want);
  if (exact) return { key: exact, candidates };
  // No hit on the whole phrase: offer what each word finds, as CHOICES only ("cheddar cheese" → the cheddars).
  if (!candidates.length) {
    const seen = new Set<IngredientKey>();
    for (const w of want.split(' ').filter((x) => x.length > 2).sort((a, b) => b.length - a.length)) {
      for (const k of hitsFor(w)) seen.add(k);
      if (seen.size >= 4) break;
    }
    candidates = [...seen];
  }
  return { key: null, candidates: candidates.slice(0, 4) };
}

/* ── the amount ─────────────────────────────────────────────────────────── */

type Unit = 'g' | 'kg' | 'oz' | 'lb' | 'cup' | 'tbsp' | 'tsp' | 'ml' | 'l' | 'floz' | 'each';

const UNIT_WORDS: Record<string, Unit> = {
  g: 'g', gr: 'g', gram: 'g', grams: 'g', gramme: 'g', grammes: 'g',
  kg: 'kg', kgs: 'kg', kilogram: 'kg', kilograms: 'kg',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  cup: 'cup', cups: 'cup', c: 'cup',
  tbsp: 'tbsp', tbs: 'tbsp', tbl: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
  l: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l',
  'fl oz': 'floz', 'fluid ounce': 'floz', 'fluid ounces': 'floz',
  '': 'each', each: 'each', whole: 'each', piece: 'each', pieces: 'each', large: 'each', medium: 'each', small: 'each',
};

/** Cups per unit, for the volume units. */
const CUPS: Partial<Record<Unit, number>> = { cup: 1, tbsp: 1 / 16, tsp: 1 / 48, ml: 1 / 236.588, l: 1000 / 236.588, floz: 1 / 8 };
const GRAMS: Partial<Record<Unit, number>> = { g: 1, kg: 1000, oz: 28.35, lb: 453.59 };

function unitOf(raw: string, us: UsMeasure): Unit | null {
  const t = raw.trim().replace(/\.$/, '');
  if (t === 'T' || t === 'Tbsp' || t === 'Tb') return 'tbsp';
  if (t === 't') return 'tsp';
  const w = t.toLowerCase();
  if (w in UNIT_WORDS) return UNIT_WORDS[w];
  // The ingredient's own counting word — "cloves" of garlic, "slices" of cheddar.
  if (us.kind === 'each' && [us.one, us.many].some((x) => x.toLowerCase().split(/\s+/).includes(w))) return 'each';
  return null;
}

/** Grams per cup of this ingredient, when its USDA measure is a volume. */
function gramsPerCup(us: UsMeasure): number | null {
  if (us.kind === 'cup') return us.grams;
  if (us.kind === 'tsp') return us.grams * 48;
  return null;
}

/** A sane amount for a home recipe, in grams — anything outside it is a misread, not a recipe. */
const SANE = (g: number) => g >= 0.5 && g <= 5000;

/**
 * The page's amount → grams of THIS ingredient, from its own USDA measure. Null when it does not
 * convert (no amount, an unknown unit, a volume of a food measured by weight or by the piece).
 */
export function gramsFor(key: IngredientKey, quantity: number | null, unit: string): number | null {
  const ing = INGREDIENTS[key];
  if (!ing || quantity == null || !(quantity > 0)) return null;
  const u = unitOf(unit, ing.us);
  if (!u) return null;
  let g: number | null = null;
  if (GRAMS[u] != null) g = quantity * GRAMS[u]!;
  else if (CUPS[u] != null) {
    const perCup = gramsPerCup(ing.us);
    g = perCup == null ? null : quantity * CUPS[u]! * perCup;
  } else if (u === 'each') g = ing.us.kind === 'each' ? quantity * ing.us.grams : null;
  if (g == null || !SANE(g)) return null;
  return Math.round(g * 10) / 10;
}

/**
 * The form's ingredient: in the food's own portion when the page used it in halves ("2 cups", "1½
 * tbsp", "3 cloves"), so reopening it reads the way it was written — otherwise in grams.
 */
export function ingredientFrom(key: IngredientKey, quantity: number | null, unit: string): UserIngredient | null {
  const g = gramsFor(key, quantity, unit);
  if (g == null || quantity == null) return null;
  const us = INGREDIENTS[key].us;
  const u = unitOf(unit, us);
  const own =
    (us.kind === 'cup' && u === 'cup') || (us.kind === 'tsp' && u === 'tbsp') || (us.kind === 'each' && u === 'each') || (us.kind === 'oz' && u === 'oz');
  if (own && Number.isInteger(quantity * 2)) {
    return { key, g: pickGrams('portion', quantity, portionOf(us)), unit: 'portion', qty: quantity };
  }
  const grams = Math.max(1, Math.round(g));
  return { key, g: grams, unit: 'g', qty: grams };
}

/* ── the draft ──────────────────────────────────────────────────────────── */

/**
 * The read → a DRAFT of the recipe form (not saved), plus every line that still needs the athlete.
 * Allergens are pre-filled by `withIngredient` and the draft is unconfirmed, whatever the page claimed.
 */
export function draftFromRead(read: RecipeRead): RecipeImport {
  let form: RecipeForm = {
    ...blankForm(),
    name: read.name.slice(0, 40),
    mealTypes: read.mealType ? [read.mealType] : [],
    minutes: read.minutes != null ? clampMinutes(Math.round(read.minutes / 5) * 5 || 5) : blankForm().minutes,
    yield: read.servings != null ? clampYield(read.servings) : blankForm().yield,
    steps: read.steps.length ? read.steps.slice() : [''],
  };
  const unmatched: UnmatchedLine[] = [];
  let matched = 0;

  for (const line of read.ingredients) {
    const { key, candidates } = matchFood(line.food);
    const base = { text: line.text, food: line.food, quantity: line.quantity, unit: line.unit };
    if (!key) {
      unmatched.push({ ...base, reason: candidates.length ? 'ambiguous' : 'no_match', candidates });
      continue;
    }
    const ing = ingredientFrom(key, line.quantity, line.unit);
    if (!ing) {
      unmatched.push({ ...base, reason: 'amount', candidates: [key] });
      continue;
    }
    form = withIngredient(form, ing, null);
    matched += 1;
  }

  return { form: { ...form, confirmed: false }, unmatched, matched };
}

/** The line under the totals while anything is unmatched — the total is approximate and says so. */
export function unmatchedNote(n: number): string {
  if (!n) return '';
  return `Approximate: ${n} ${n === 1 ? 'ingredient isn’t' : 'ingredients aren’t'} matched yet`;
}

/** The toast after a read. */
export function importToast(r: Pick<RecipeImport, 'matched' | 'unmatched'>): string {
  const total = r.matched + r.unmatched.length;
  if (!r.unmatched.length) return `Read all ${total} ingredients. Check them and save.`;
  return `Matched ${r.matched} of ${total} ingredients. Pick or drop the rest.`;
}
