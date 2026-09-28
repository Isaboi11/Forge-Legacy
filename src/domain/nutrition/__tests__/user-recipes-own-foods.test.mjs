import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detectAllergens,
  dietOf,
  eatenTotals,
  hasOwnFood,
  ingredientName,
  ingredientPortion,
  ownFoodFrom,
  ownFoodFromScan,
  pickGrams,
  qtyLabel,
  registerAll,
  searchOwnFoods,
  servingsEatenLabel,
  toBook,
  totalsOf,
  withIngredient,
  blankForm,
} from '../user-recipes.ts';
import { recipeView } from '../meal-planner.ts';
import { groceryList } from '../grocery.ts';
import { INGREDIENTS } from '../recipes-data.ts';

/**
 * Own foods in My Recipes (PO 2026-09-26: "scan each ingredient's label and how much I'm using, and it
 * calculates everything with how much I'm eating"). The real shape `fetchMyFoods` returns: per 100 g,
 * with the label's serving kept as the food's serving.
 */
const SALSA = {
  key: 'custom:3b1f',
  source: 'custom',
  name: 'Roasted tomato salsa',
  brand: 'Trader Joe’s',
  kcal100: 33.3,
  protein100: 1.7,
  carb100: 6.7,
  fat100: 0,
  servings: [{ label: '2 tbsp', grams: 30 }],
};

test('an own food becomes an ingredient: per 100 g kept, serving counted as "serving"', () => {
  const own = ownFoodFrom(SALSA);
  assert.equal(own.id, 'custom:3b1f');
  assert.equal(own.kcal100, 33.3);
  assert.deepEqual(own.serving, { label: 'serving', g: 30 });
  assert.equal(own.servingText, '2 tbsp');
});

test('an own food with no calories or no serving weight cannot be an ingredient', () => {
  assert.equal(ownFoodFrom({ ...SALSA, kcal100: null }), null);
  assert.equal(ownFoodFrom({ ...SALSA, servings: [{ label: '1 piece', grams: null }] }), null);
});

test('a scanned barcode food: its labelled serving when it has a weight, else 100 g; never with no calories (PO 09-28)', () => {
  assert.deepEqual(ownFoodFromScan(SALSA), ownFoodFrom(SALSA));
  const off = { ...SALSA, key: 'off:0049000028911', servings: [{ label: '1 bar', grams: null }] };
  const own = ownFoodFromScan(off);
  assert.deepEqual(own.serving, { label: 'serving', g: 100 });
  assert.equal(own.servingText, '100 g');
  assert.equal(own.kcal100, 33.3);
  assert.equal(ownFoodFromScan({ ...off, kcal100: null }), null, 'no calories: the label is the way in, never a guess');
});

test('own-food search matches every word across name and brand, and skips unusable foods', () => {
  const broken = { ...SALSA, key: 'custom:x', name: 'Salsa verde', servings: [] };
  assert.deepEqual(searchOwnFoods([SALSA, broken], 'salsa').map((o) => o.id), ['custom:3b1f']);
  assert.deepEqual(searchOwnFoods([SALSA], 'trader salsa').map((o) => o.id), ['custom:3b1f']);
  assert.equal(searchOwnFoods([SALSA], 'mango').length, 0);
  assert.equal(searchOwnFoods([SALSA], '  ').length, 0);
});

test('totals add a label food by its own numbers, alongside catalogue foods', () => {
  const own = ownFoodFrom(SALSA);
  const g = pickGrams('portion', 3, own.serving); // 3 servings = 90 g
  assert.equal(g, 90);
  const chicken = INGREDIENTS.chicken_breast;
  const t = totalsOf([
    { key: 'chicken_breast', g: 200, unit: 'g', qty: 200 },
    { food: own, g, unit: 'portion', qty: 3 },
  ]);
  assert.ok(Math.abs(t.kcal - (chicken.kcal * 2 + 33.3 * 0.9)) < 1e-9);
  assert.ok(Math.abs(t.carb - (chicken.carb * 2 + 6.7 * 0.9)) < 1e-9);
  assert.equal(qtyLabel('portion', 3, own.serving), '3 serving');
});

test('Forge never invents allergens or a diet for a label food', () => {
  const own = ownFoodFrom(SALSA);
  const x = { food: own, g: 30, unit: 'portion', qty: 1 };
  assert.deepEqual(detectAllergens([x]), []);
  assert.equal(hasOwnFood([x]), true);
  assert.equal(hasOwnFood([{ key: 'rice', g: 1, unit: 'g', qty: 1 }]), false);
  /* Unknown → the strictest reading: a vegan catalogue base plus a label food is not "vegan". */
  assert.equal(dietOf([{ key: 'black_beans' }]), 'vegan');
  assert.equal(dietOf([{ key: 'black_beans' }, x]), 'any');
  /* Adding one un-confirms the recipe, like any ingredient change. */
  const f = withIngredient({ ...blankForm(), confirmed: true }, x, null);
  assert.equal(f.confirmed, false);
  assert.deepEqual(f.allergens, []);
});

test('names and portions read the same for both kinds', () => {
  const own = ownFoodFrom(SALSA);
  assert.equal(ingredientName({ food: own }), 'Roasted tomato salsa');
  assert.equal(ingredientName({ key: 'broccoli' }), INGREDIENTS.broccoli.name);
  assert.deepEqual(ingredientPortion({ food: own }), { label: 'serving', g: 30 });
});

const BOWL = {
  id: 'u:bowl',
  name: 'Chicken salsa bowl',
  mealTypes: ['lunch'],
  minutes: 15,
  yield: 4,
  allergens: [],
  confirmed: true,
  steps: [],
  usePlan: true,
  createdAt: '2026-09-26T10:00:00Z',
};

test('a recipe with a label food shows it on Recipe and buys it by name on the Grocery List', () => {
  const own = ownFoodFrom(SALSA);
  const u = { ...BOWL, ingredients: [{ key: 'chicken_breast', g: 800, unit: 'g', qty: 800 }, { food: own, g: 240, unit: 'portion', qty: 8 }] };
  const { recipe, view } = toBook(u);
  assert.ok(recipe.ingredientNames.includes('roasted tomato salsa'));
  const salsa = view.ingredients.find((i) => i.key === 'own:custom:3b1f');
  assert.equal(salsa.name, 'Roasted tomato salsa');
  assert.equal(salsa.g, 60); // per serving
  assert.equal(salsa.us, null);

  registerAll([u]);
  assert.ok(recipeView('u:bowl'));
  const days = [{ items: [{ slot: 'lunch', recipeId: 'u:bowl', portion: 1, leftover: false }] }, ...Array.from({ length: 6 }, () => ({ items: [] }))];
  const item = groceryList(days, 1).items.find((x) => x.key === 'own:custom:3b1f');
  assert.equal(item.name, 'Roasted tomato salsa');
  assert.equal(item.grams, 60);
  registerAll([]);
});

test('how much I ate: a share of the whole recipe, from exact totals', () => {
  const own = ownFoodFrom(SALSA);
  const u = { ...BOWL, ingredients: [{ key: 'chicken_breast', g: 800, unit: 'g', qty: 800 }, { food: own, g: 240, unit: 'portion', qty: 8 }] };
  const whole = totalsOf(u.ingredients);
  assert.equal(eatenTotals(u, 4).kcal, Math.round(whole.kcal)); // all of it
  assert.equal(eatenTotals(u, 1).kcal, Math.round(whole.kcal / 4));
  assert.equal(eatenTotals(u, 2.5).kcal, Math.round((whole.kcal * 5) / 8));
  assert.equal(eatenTotals(u, 1.5).protein, Math.round(((whole.protein * 1.5) / 4) * 10) / 10);
  /* Never zero, never absurd, and always on the half-serving grid. */
  assert.equal(eatenTotals(u, 0).kcal, Math.round(whole.kcal / 8));
  assert.equal(eatenTotals(u, 0.7).kcal, Math.round(whole.kcal / 8));
});

test('the eaten label reads like a person says it', () => {
  assert.equal(servingsEatenLabel(0.5), '½ serving');
  assert.equal(servingsEatenLabel(1), '1 serving');
  assert.equal(servingsEatenLabel(1.5), '1½ servings');
  assert.equal(servingsEatenLabel(2), '2 servings');
});

test('a recipe row reads its per-serving calories and how many it makes', async () => {
  const { recipeRowMeta } = await import('../user-recipes.ts');
  const u = { ...BOWL, ingredients: [{ key: 'chicken_breast', g: 800, unit: 'g', qty: 800 }] };
  const per = Math.round(totalsOf(u.ingredients).kcal / 4).toLocaleString('en-US');
  assert.equal(recipeRowMeta(u), `${per} cal per serving · makes 4`);
});

test('a log with no meal chosen defaults by the hour', async () => {
  const { mealForHour } = await import('../day.ts');
  assert.equal(mealForHour(7), 'breakfast');
  assert.equal(mealForHour(12), 'lunch');
  assert.equal(mealForHour(18), 'dinner');
  assert.equal(mealForHour(22), 'snacks');
});
