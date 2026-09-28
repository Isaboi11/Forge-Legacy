import type { Allergen } from './meal-plan-setup.ts';
import { ALLERGENS } from './meal-plan-setup.ts';
import { registerUserRecipes, type Recipe, type RecipeDiet, type RecipeView, type RecipeViewIngredient } from './meal-planner.ts';
import { INGREDIENTS, type IngredientKey, type PlanSlot, type UsMeasure } from './recipes-data.ts';
import type { CatalogFood } from './serving.ts';

/**
 * My Recipes — meals the athlete already eats, built from Forge's ingredient catalogue so every number
 * is USDA and every allergen is known. Built to `My Recipes.dc.html`; pure so `node --test` can prove it.
 *
 * ⚠ **TWO KINDS OF INGREDIENT.** Most come from Forge's catalogue (the 106 USDA-sourced ingredients in
 * `recipes-data.ts`) — that is what lets Forge DETECT allergens and a diet. Since 2026-09-26 (PO: "scan
 * each ingredient's label and how much I'm using") an ingredient can also be one of the athlete's OWN
 * foods — typed or scanned from a label in Create Food — carried as a snapshot (`OwnFood`) so the recipe
 * keeps its numbers even if the food is later edited or deleted.
 *
 * ⚠ **AN OWN FOOD CARRIES NO ALLERGEN TAGS, AND FORGE NEVER PRETENDS IT DOES.** It detects nothing from
 * one, so the form says so (`hasOwnFood`) instead of "None detected", and treats its diet as unknown
 * (the strictest reading, `any`). The athlete reads the label's allergen line and confirms — the same
 * confirmation gate as always, so an unconfirmed recipe is still never planned (NUT-D6).
 *
 * ⚠ **THE PLANNER USES A RECIPE ONLY WHEN ITS ALLERGENS ARE CONFIRMED** (NUT-D6: allergens are a hard
 * constraint, and only a tag a person confirmed can be one) **and "Use in my plans" is on.** Detection
 * pre-fills; the athlete adds what Forge missed ("a sauce or a brand") and confirms. Any change to the
 * ingredients or the tags un-confirms it.
 */

/**
 * One of the athlete's own foods, copied into the recipe when it was added. Numbers are per 100 g, as
 * `user_foods` stores them; `serving` is the label's serving (`label` is always "serving" so the amount
 * reads "1½ serving"; `servingText` is what the label printed, e.g. "2 tbsp").
 */
export interface OwnFood {
  id: string;
  name: string;
  brand: string | null;
  kcal100: number;
  protein100: number;
  carb100: number;
  fat100: number;
  serving: Portion;
  servingText: string;
}

/**
 * An ingredient is EITHER a catalogue food (`key`) OR an own food (`food`) — never both. Rows saved
 * before own foods existed have only `key`.
 */
export interface UserIngredient {
  key?: IngredientKey;
  food?: OwnFood;
  /** Grams for the WHOLE recipe. */
  g: number;
  /** How it was entered, so reopening shows what the athlete typed. */
  unit: 'g' | 'portion';
  qty: number;
}

export interface UserRecipe {
  /** `u:<uuid>` in the recipe book; the uuid is the row id (0213). */
  id: string;
  name: string;
  mealTypes: PlanSlot[];
  minutes: number;
  /** Servings the whole recipe makes. */
  yield: number;
  ingredients: UserIngredient[];
  allergens: Allergen[];
  confirmed: boolean;
  steps: string[];
  usePlan: boolean;
  createdAt: string;
  /**
   * One of Holt's dishes, in the week's plan but NOT in My Recipes until the athlete opens it and saves it
   * (0227; PO 09-27: "I don't want to save them all cause I haven't even tried them"). Missing = saved.
   */
  trial?: boolean;
}

/** What My Recipes, My Foods, Log Food and Holt's recipe search list: the recipes the athlete KEPT. */
export const savedRecipes = (list: readonly UserRecipe[]): UserRecipe[] => list.filter((u) => !u.trial);

export const MEAL_TYPES: readonly { key: PlanSlot; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snack' },
];

/* ── the food search (the catalogue) ────────────────────────────────────── */

export interface Portion {
  /** "cup", "large egg", "tbsp", "oz". */
  label: string;
  g: number;
}

/** A natural single portion for picking, from the ingredient's USDA-sourced US measure. */
export function portionOf(us: UsMeasure): Portion {
  if (us.kind === 'oz') return { label: 'oz', g: 28.35 };
  if (us.kind === 'cup') return { label: 'cup', g: us.grams };
  if (us.kind === 'tsp') return { label: 'tbsp', g: +(us.grams * 3).toFixed(2) };
  return { label: us.one, g: us.grams };
}

export interface FoodHit {
  key: IngredientKey;
  name: string;
  kcal100: number;
  portion: Portion;
}

const CATALOGUE: FoodHit[] = (Object.keys(INGREDIENTS) as IngredientKey[])
  .filter((k, i, all) => all.findIndex((x) => INGREDIENTS[x].fdcId === INGREDIENTS[k].fdcId && INGREDIENTS[x].name === INGREDIENTS[k].name) === i)
  .map((key) => ({ key, name: INGREDIENTS[key].name, kcal100: INGREDIENTS[key].kcal, portion: portionOf(INGREDIENTS[key].us) }));

/** Every word must match; names starting with the first word rank first. */
export function searchFoods(q: string, n = 6): FoodHit[] {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return CATALOGUE.filter((f) => words.every((w) => f.name.toLowerCase().includes(w)))
    .sort((a, b) => a.name.toLowerCase().indexOf(words[0]) - b.name.toLowerCase().indexOf(words[0]) || a.name.localeCompare(b.name))
    .slice(0, n);
}

/* ── own foods ──────────────────────────────────────────────────────────── */

/**
 * An own food as a recipe ingredient — or null when it cannot be one: no calories, or no serving weight to
 * turn "1 serving" into grams (a label that gave only "1 piece" and no weight).
 */
export function ownFoodFrom(food: CatalogFood): OwnFood | null {
  const serving = food.servings.find((sv) => sv.grams != null && sv.grams > 0);
  if (food.kcal100 == null || !serving || serving.grams == null) return null;
  return {
    id: food.key,
    name: food.name,
    brand: food.brand ?? null,
    kcal100: food.kcal100,
    protein100: food.protein100 ?? 0,
    carb100: food.carb100 ?? 0,
    fat100: food.fat100 ?? 0,
    serving: { label: 'serving', g: serving.grams },
    servingText: serving.label,
  };
}

/**
 * A scanned barcode's food as a recipe ingredient (PO 2026-09-28). Its labelled serving when that has a weight;
 * otherwise 100 g, because a product with per-100 g numbers (most of Open Food Facts) is still usable by
 * weight. Null only when the calories are unknown — then the label is the way in, never a guess.
 */
export function ownFoodFromScan(food: CatalogFood): OwnFood | null {
  const own = ownFoodFrom(food);
  if (own) return own;
  if (food.kcal100 == null) return null;
  return {
    id: food.key,
    name: food.name,
    brand: food.brand ?? null,
    kcal100: food.kcal100,
    protein100: food.protein100 ?? 0,
    carb100: food.carb100 ?? 0,
    fat100: food.fat100 ?? 0,
    serving: { label: 'serving', g: 100 },
    servingText: '100 g',
  };
}

/** The athlete's own foods that match — every word, like `searchFoods`. */
export function searchOwnFoods(foods: readonly CatalogFood[], q: string, n = 3): OwnFood[] {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const out: OwnFood[] = [];
  for (const food of foods) {
    const hay = `${food.name} ${food.brand ?? ''}`.toLowerCase();
    if (!words.every((w) => hay.includes(w))) continue;
    const own = ownFoodFrom(food);
    if (own) out.push(own);
    if (out.length >= n) break;
  }
  return out;
}

/** Per 100 g, whichever kind the ingredient is. Null for a catalogue key that no longer exists. */
export function per100(x: Pick<UserIngredient, 'key' | 'food'>): Totals | null {
  if (x.food) return { kcal: x.food.kcal100, protein: x.food.protein100, carb: x.food.carb100, fat: x.food.fat100 };
  const ing = x.key ? INGREDIENTS[x.key] : undefined;
  return ing ? { kcal: ing.kcal, protein: ing.protein, carb: ing.carb, fat: ing.fat } : null;
}

export function ingredientName(x: Pick<UserIngredient, 'key' | 'food'>): string {
  if (x.food) return x.food.name;
  return (x.key && INGREDIENTS[x.key]?.name) || 'Unknown ingredient';
}

/** The unit the amount is counted in — the catalogue's natural portion, or the label's serving. */
export function ingredientPortion(x: Pick<UserIngredient, 'key' | 'food'>): Portion | null {
  if (x.food) return x.food.serving;
  const ing = x.key ? INGREDIENTS[x.key] : undefined;
  return ing ? portionOf(ing.us) : null;
}

/** Whether any ingredient is an own food — Forge cannot see allergens in those. */
export const hasOwnFood = (ingredients: readonly Pick<UserIngredient, 'food'>[]): boolean => ingredients.some((x) => !!x.food);

/* ── numbers, allergens, diet ───────────────────────────────────────────── */

export interface Totals {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

/** The WHOLE recipe, from USDA per-100 g × grams (NUT-D4). */
export function totalsOf(ingredients: readonly Pick<UserIngredient, 'key' | 'food' | 'g'>[]): Totals {
  const t = { kcal: 0, protein: 0, carb: 0, fat: 0 };
  for (const x of ingredients) {
    const p = per100(x);
    if (!p) continue;
    t.kcal += (p.kcal * x.g) / 100;
    t.protein += (p.protein * x.g) / 100;
    t.carb += (p.carb * x.g) / 100;
    t.fat += (p.fat * x.g) / 100;
  }
  return t;
}

const ALLERGEN_ORDER = ALLERGENS.map((a) => a.key);

/** What Forge can see in the ingredients — a pre-fill the athlete confirms, never the final word. */
export function detectAllergens(ingredients: readonly Pick<UserIngredient, 'key'>[]): Allergen[] {
  const found = new Set<Allergen>();
  for (const x of ingredients) if (x.key) INGREDIENTS[x.key]?.allergens.forEach((a) => found.add(a));
  return ALLERGEN_ORDER.filter((a) => found.has(a));
}

/** The strictest diet the ingredients allow: meat → any, fish → pescatarian, dairy/egg/honey → vegetarian. */
export function dietOf(ingredients: readonly Pick<UserIngredient, 'key'>[]): RecipeDiet {
  /* An own food (no `key`) is unknown, so it reads as meat — the strictest assumption, never a guess. */
  const classes = new Set(ingredients.map((x) => (x.key && INGREDIENTS[x.key]?.diet) || 'meat'));
  if (classes.has('meat')) return 'any';
  if (classes.has('fish') || classes.has('shellfish')) return 'pescatarian';
  if (classes.has('animal')) return 'vegetarian';
  return 'vegan';
}

/* ── into the recipe book ───────────────────────────────────────────────── */

/**
 * The planner's view of an athlete's recipe. Per-SERVING numbers. It keeps (feeds a later lunch) when it
 * makes 2+ servings and is a dinner — the `.dc`'s `batch` rule, softened to Rules §3's keep days.
 * Protein source and format are unknown for a recipe Forge did not write, so they are `mixed`/`mine`
 * and never trip the variety caps.
 */
export function toBook(u: UserRecipe): { recipe: Recipe; view: RecipeView; plannable: boolean } {
  const y = Math.max(1, u.yield);
  const t = totalsOf(u.ingredients);
  const leftoverDays = y >= 2 && u.mealTypes.includes('dinner') ? 2 : 0;
  const recipe: Recipe = {
    id: u.id,
    slot: u.mealTypes[0] ?? 'dinner',
    mealTypes: u.mealTypes,
    name: u.name,
    minutes: u.minutes,
    kcal: Math.round(t.kcal / y),
    protein: Math.round(t.protein / y),
    carb: Math.round(t.carb / y),
    fat: Math.round(t.fat / y),
    allergens: ALLERGEN_ORDER.filter((a) => u.allergens.includes(a)),
    diet: dietOf(u.ingredients),
    ingredientNames: u.ingredients.flatMap((x) =>
      x.food ? [x.food.name.toLowerCase()] : [ingredientName(x).toLowerCase(), (x.key ?? '').replace(/_/g, ' ')],
    ),
    leftoverDays,
    reheat: 'ok',
    proteinSource: 'mixed',
    format: 'mine',
    keeps: leftoverDays >= 1,
    ...(u.trial ? { trial: true } : {}),
  };
  const view: RecipeView = {
    id: u.id,
    name: u.name,
    minutes: u.minutes,
    equipment: [],
    steps: u.steps.map((s) => ({ title: s, text: '' })),
    ingredients: u.ingredients.flatMap((x): RecipeViewIngredient[] => {
      if (x.food) return [{ key: `own:${x.food.id}`, name: x.food.name, g: x.g / y, us: null }];
      const ing = x.key ? INGREDIENTS[x.key] : undefined;
      return x.key && ing ? [{ key: x.key, name: ing.name, g: x.g / y, us: ing.us }] : [];
    }),
    mine: true,
  };
  return { recipe, view, plannable: u.usePlan && u.confirmed && u.ingredients.length > 0 };
}

/** Put the athlete's recipes in the book — call before resolving any week that may name them. */
export function registerAll(list: UserRecipe[]): void {
  registerUserRecipes(list.map(toBook));
}

/* ── the form ───────────────────────────────────────────────────────────── */

export interface RecipeForm {
  editId: string | null;
  name: string;
  mealTypes: PlanSlot[];
  minutes: number;
  yield: number;
  ingredients: UserIngredient[];
  allergens: Allergen[];
  confirmed: boolean;
  steps: string[];
  usePlan: boolean;
}

export const blankForm = (): RecipeForm => ({
  editId: null,
  name: '',
  mealTypes: [],
  minutes: 20,
  yield: 2,
  ingredients: [],
  allergens: [],
  confirmed: false,
  steps: [''],
  usePlan: true,
});

export const formFrom = (u: UserRecipe): RecipeForm => ({
  editId: u.id,
  name: u.name,
  mealTypes: u.mealTypes.slice(),
  minutes: u.minutes,
  yield: u.yield,
  ingredients: u.ingredients.map((x) => ({ ...x })),
  allergens: u.allergens.slice(),
  confirmed: u.confirmed,
  steps: u.steps.length ? u.steps.slice() : [''],
  usePlan: u.usePlan,
});

/** "Add a name, a meal type and an ingredient" — empty when the recipe can be saved. */
export function missingLine(f: RecipeForm): string {
  const missing: string[] = [];
  if (!f.name.trim()) missing.push('a name');
  if (!f.mealTypes.length) missing.push('a meal type');
  if (!f.ingredients.length) missing.push('an ingredient');
  if (!missing.length) return '';
  return `Add ${missing.join(', ').replace(/, ([^,]*)$/, ' and $1')}`;
}

/**
 * Add (or replace) an ingredient. Its detected allergens join the selection — nothing is ever silently
 * removed from what the athlete chose — and the recipe needs confirming again.
 */
export function withIngredient(f: RecipeForm, ing: UserIngredient, index: number | null): RecipeForm {
  const ingredients = f.ingredients.slice();
  if (index != null && index >= 0 && index < ingredients.length) ingredients[index] = ing;
  else ingredients.push(ing);
  const found = ((ing.key && INGREDIENTS[ing.key]?.allergens) || []) as readonly Allergen[];
  const allergens = ALLERGEN_ORDER.filter((a) => f.allergens.includes(a) || found.includes(a));
  return { ...f, ingredients, allergens, confirmed: false };
}

export const withoutIngredient = (f: RecipeForm, index: number): RecipeForm => ({
  ...f,
  ingredients: f.ingredients.filter((_, i) => i !== index),
  confirmed: false,
});

export function toggleAllergen(f: RecipeForm, a: Allergen): RecipeForm {
  const allergens = f.allergens.includes(a) ? f.allergens.filter((x) => x !== a) : ALLERGEN_ORDER.filter((x) => x === a || f.allergens.includes(x));
  return { ...f, allergens, confirmed: false };
}

export function toggleMealType(f: RecipeForm, m: PlanSlot): RecipeForm {
  const order = MEAL_TYPES.map((x) => x.key);
  const mealTypes = f.mealTypes.includes(m) ? f.mealTypes.filter((x) => x !== m) : order.filter((x) => x === m || f.mealTypes.includes(x));
  return { ...f, mealTypes };
}

export const clampMinutes = (n: number): number => Math.min(240, Math.max(5, n));
export const clampYield = (n: number): number => Math.min(12, Math.max(1, n));

/** The recipe to save. Steps trimmed and blank lines dropped. */
export function recipeFrom(f: RecipeForm, id: string, createdAt: string): UserRecipe {
  return {
    id,
    name: f.name.trim().slice(0, 40),
    mealTypes: f.mealTypes,
    minutes: clampMinutes(f.minutes),
    yield: clampYield(f.yield),
    ingredients: f.ingredients,
    allergens: f.allergens,
    confirmed: f.confirmed,
    steps: f.steps.map((s) => s.trim()).filter(Boolean),
    usePlan: f.usePlan,
    createdAt,
  };
}

/** The toast after saving — what the planner will now do with it. */
export const savedToast = (u: Pick<UserRecipe, 'usePlan' | 'confirmed'>): string =>
  !u.usePlan ? 'Saved to My recipes' : u.confirmed ? 'Saved. The planner can use it now.' : 'Saved. Confirm allergens to use it in plans.';

/** The switch's hint line. */
export const planHint = (f: Pick<RecipeForm, 'usePlan' | 'confirmed'>): string =>
  !f.usePlan ? 'Saved to My recipes only' : f.confirmed ? 'The planner can pick it when it fits your setup' : 'Confirm the allergens and the planner can pick it';

/* ── the pick sheet's quantity ──────────────────────────────────────────── */

export const STEP_G = 25;
export const STEP_PORTION = 0.5;

export function pickGrams(unit: 'g' | 'portion', qty: number, portion: Portion): number {
  return Math.round(unit === 'g' ? qty : qty * portion.g);
}

/** Switching unit keeps the amount, rounded to the new unit's step. */
export function switchUnit(unit: 'g' | 'portion', grams: number, portion: Portion): number {
  return unit === 'g'
    ? Math.max(STEP_G, Math.round(grams / STEP_G) * STEP_G)
    : Math.max(STEP_PORTION, Math.round(grams / portion.g / STEP_PORTION) * STEP_PORTION);
}

export function qtyLabel(unit: 'g' | 'portion', qty: number, portion: Portion): string {
  if (unit === 'g') return `${Math.round(qty).toLocaleString('en-US')} g`;
  const whole = Math.floor(qty);
  const half = qty - whole >= 0.5 ? '½' : '';
  return `${whole || (half ? '' : '0')}${half} ${portion.label}`;
}

/* ── the list ───────────────────────────────────────────────────────────── */

export function listMeta(u: UserRecipe): string {
  const types = MEAL_TYPES.filter((t) => u.mealTypes.includes(t.key)).map((t) => t.label).join(' / ');
  const tags = [types, `${u.minutes} min`];
  if (!u.usePlan) tags.push('Not in plans');
  else if (!u.confirmed) tags.push('Confirm allergens');
  return tags.join(' · ');
}

export function filterList(list: UserRecipe[], q: string, filter: PlanSlot | 'all'): UserRecipe[] {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return list
    .filter((u) => (filter === 'all' || u.mealTypes.includes(filter)) && words.every((w) => u.name.toLowerCase().includes(w)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ── logging it: how much the athlete ate ───────────────────────────────── */

/** "How much did you eat?" moves in half servings. */
export const EAT_STEP = 0.5;

/** The most anyone logs at once — the whole pot of the biggest recipe the form allows. */
export const clampEaten = (n: number): number => Math.min(24, Math.max(EAT_STEP, Math.round(n / EAT_STEP) * EAT_STEP));

/**
 * What `servings` of the recipe adds up to — from the whole recipe's exact totals, not the rounded
 * per-serving card, so 2½ servings of a 4-serving pot is exactly 5/8 of it.
 */
export function eatenTotals(u: Pick<UserRecipe, 'ingredients' | 'yield'>, servings: number): Totals {
  const t = totalsOf(u.ingredients);
  const share = clampEaten(servings) / Math.max(1, u.yield);
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return { kcal: Math.round(t.kcal * share), protein: r1(t.protein * share), carb: r1(t.carb * share), fat: r1(t.fat * share) };
}

/** "½ serving", "1 serving", "2½ servings". */
export function servingsEatenLabel(servings: number): string {
  const n = clampEaten(servings);
  const whole = Math.floor(n);
  const text = `${whole || ''}${n - whole >= 0.5 ? '½' : ''}`;
  return `${text} ${n === 1 || n === 0.5 ? 'serving' : 'servings'}`;
}

/** A recipe as a row wherever it is logged from: "420 cal per serving · makes 4". */
export function recipeRowMeta(u: Pick<UserRecipe, 'ingredients' | 'yield'>): string {
  const y = Math.max(1, u.yield);
  return `${Math.round(totalsOf(u.ingredients).kcal / y).toLocaleString('en-US')} cal per serving · makes ${y}`;
}
