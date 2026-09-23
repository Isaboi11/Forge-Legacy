import test from 'node:test';
import assert from 'node:assert/strict';

import {
  blankForm,
  detectAllergens,
  dietOf,
  filterList,
  formFrom,
  listMeta,
  missingLine,
  pickGrams,
  portionOf,
  qtyLabel,
  recipeFrom,
  registerAll,
  searchFoods,
  switchUnit,
  toBook,
  toggleAllergen,
  totalsOf,
  withIngredient,
  withoutIngredient,
} from '../user-recipes.ts';
import { RECIPE_BY_ID, fits, planWeek, recipeView } from '../meal-planner.ts';
import { groceryList } from '../grocery.ts';
import { INGREDIENTS } from '../recipes-data.ts';

const TRAY = {
  id: 'u:tray',
  name: 'Sheet-pan chicken and sweet potato',
  mealTypes: ['dinner', 'lunch'],
  minutes: 35,
  yield: 4,
  ingredients: [
    { key: 'chicken_breast', g: 800, unit: 'g', qty: 800 },
    { key: 'sweet_potato', g: 780, unit: 'g', qty: 780 },
    { key: 'broccoli', g: 364, unit: 'g', qty: 364 },
    { key: 'olive_oil', g: 27, unit: 'g', qty: 27 },
  ],
  allergens: [],
  confirmed: true,
  steps: ['Heat the oven to 425°F (220°C).', 'Roast everything for 35 minutes.'],
  usePlan: true,
  createdAt: '2026-09-23T10:00:00Z',
};

test('search finds catalogue ingredients by every word, first-word matches first', () => {
  const hits = searchFoods('chicken');
  assert.ok(hits.length >= 2);
  assert.ok(hits.every((h) => h.name.toLowerCase().includes('chicken')));
  assert.equal(searchFoods('   ').length, 0);
  assert.equal(searchFoods('zzqq').length, 0);
});

test('a portion comes from the USDA US measure', () => {
  assert.deepEqual(portionOf({ kind: 'oz' }), { label: 'oz', g: 28.35 });
  assert.deepEqual(portionOf({ kind: 'cup', grams: 185 }), { label: 'cup', g: 185 });
  assert.deepEqual(portionOf({ kind: 'tsp', grams: 4.5 }), { label: 'tbsp', g: 13.5 });
  assert.deepEqual(portionOf({ kind: 'each', grams: 50, one: 'large egg', many: 'large eggs' }), { label: 'large egg', g: 50 });
});

test('totals are USDA per-100 g × grams — the whole recipe', () => {
  const t = totalsOf([{ key: 'egg', g: 100 }]);
  assert.equal(Math.round(t.kcal), Math.round(INGREDIENTS.egg.kcal));
});

test('allergens and diet are detected from ingredients', () => {
  assert.deepEqual(detectAllergens([{ key: 'soy_sauce' }, { key: 'egg' }]), ['eggs', 'gluten', 'soy']);
  assert.equal(dietOf([{ key: 'tofu' }, { key: 'white_rice' }]), 'vegan');
  assert.equal(dietOf([{ key: 'egg' }]), 'vegetarian');
  assert.equal(dietOf([{ key: 'tuna' }]), 'pescatarian');
  assert.equal(dietOf([{ key: 'chicken_breast' }]), 'any');
});

test('adding an ingredient pre-selects its allergens, never removes a chosen one, and un-confirms', () => {
  let f = { ...blankForm(), allergens: ['sesame'], confirmed: true };
  f = withIngredient(f, { key: 'egg', g: 100, unit: 'portion', qty: 2 }, null);
  assert.deepEqual(f.allergens, ['eggs', 'sesame']);
  assert.equal(f.confirmed, false);
  f = { ...f, confirmed: true };
  f = withoutIngredient(f, 0);
  assert.deepEqual(f.allergens, ['eggs', 'sesame']); // removing an ingredient never quietly drops a tag
  assert.equal(f.confirmed, false);
  f = toggleAllergen({ ...f, confirmed: true }, 'eggs');
  assert.deepEqual(f.allergens, ['sesame']);
  assert.equal(f.confirmed, false);
});

test('save is blocked until name, meal type and an ingredient are in — and says which', () => {
  assert.equal(missingLine(blankForm()), 'Add a name, a meal type and an ingredient');
  assert.equal(missingLine({ ...blankForm(), name: 'Oats' }), 'Add a meal type and an ingredient');
  assert.equal(missingLine({ ...blankForm(), name: 'Oats', mealTypes: ['breakfast'], ingredients: [{ key: 'oats', g: 80, unit: 'g', qty: 80 }] }), '');
});

test('a saved recipe trims its steps and round-trips through the form', () => {
  const f = { ...formFrom(TRAY), steps: ['  Heat the oven.  ', '', 'Roast.'] };
  const u = recipeFrom(f, TRAY.id, TRAY.createdAt);
  assert.deepEqual(u.steps, ['Heat the oven.', 'Roast.']);
  assert.deepEqual(formFrom(u).ingredients, TRAY.ingredients);
});

test('pick amounts: grams or portions, and switching keeps the amount', () => {
  const p = { label: 'cup', g: 185 };
  assert.equal(pickGrams('portion', 1.5, p), 278);
  assert.equal(switchUnit('g', 278, p), 275);
  assert.equal(switchUnit('portion', 278, p), 1.5);
  assert.equal(qtyLabel('portion', 1.5, p), '1½ cup');
  assert.equal(qtyLabel('portion', 0.5, p), '½ cup');
  assert.equal(qtyLabel('g', 275, p), '275 g');
});

test('per-serving numbers divide the whole recipe by what it makes', () => {
  const { recipe } = toBook(TRAY);
  assert.equal(recipe.kcal, Math.round(totalsOf(TRAY.ingredients).kcal / 4));
  assert.equal(recipe.keeps, true); // a 4-serving dinner feeds a later lunch
  assert.equal(recipeView('u:tray'), undefined); // not registered yet
});

test('only a confirmed recipe with "Use in my plans" on is ever planned', () => {
  const prefs = { diet: 'anything', allergens: [], dislikes: [], meals: ['lunch', 'dinner'], cookMinutes: null, household: 1, weeklyBudgetUsd: null };
  const target = { kcal: 2000, protein: 150, carb: 200, fat: 70 };
  const cooked = (seedFrom) => {
    const ids = new Set();
    for (let seed = seedFrom; seed < seedFrom + 25; seed++) for (const d of planWeek({ prefs, target, seed, locked: {} })) for (const it of d.items) ids.add(it.recipeId);
    return ids;
  };
  registerAll([{ ...TRAY, confirmed: false }]);
  assert.ok(!cooked(1).has('u:tray'), 'unconfirmed must not be planned');
  assert.ok(RECIPE_BY_ID['u:tray'], 'but it is in the book, so a Recipe screen can open it');
  registerAll([{ ...TRAY, usePlan: false }]);
  assert.ok(!cooked(1).has('u:tray'), 'use-in-plans off must not be planned');
  registerAll([TRAY]);
  assert.ok(cooked(1).has('u:tray'), 'confirmed + on is planned somewhere across 25 seeds');
  registerAll([]);
  assert.equal(RECIPE_BY_ID['u:tray'], undefined);
});

test('a user recipe obeys the same hard filters: its confirmed allergens exclude it', () => {
  registerAll([{ ...TRAY, allergens: ['dairy'] }]);
  const r = RECIPE_BY_ID['u:tray'];
  assert.equal(fits(r, { diet: 'anything', allergens: ['dairy'], dislikes: [], meals: ['dinner'], cookMinutes: null, household: 1, weeklyBudgetUsd: null }), false);
  assert.equal(fits(r, { diet: 'vegetarian', allergens: [], dislikes: [], meals: ['dinner'], cookMinutes: null, household: 1, weeklyBudgetUsd: null }), false);
  registerAll([]);
});

test('a user recipe shows on the Recipe screen and buys onto the Grocery List', () => {
  registerAll([TRAY]);
  const view = recipeView('u:tray');
  assert.equal(view.mine, true);
  assert.equal(view.ingredients.find((i) => i.key === 'chicken_breast').g, 200); // per serving
  const days = [{ items: [{ slot: 'dinner', recipeId: 'u:tray', portion: 1, leftover: false }] }, ...Array.from({ length: 6 }, () => ({ items: [] }))];
  const chicken = groceryList(days, 2).items.find((x) => x.key === 'chicken_breast');
  assert.equal(chicken.grams, 400); // 2 people × 1 portion × 200 g
  registerAll([]);
});

test('list: search, filter, newest first, and the meta line', () => {
  const older = { ...TRAY, id: 'u:a', name: 'Chicken bowl', createdAt: '2026-09-01T00:00:00Z' };
  const newer = { ...TRAY, id: 'u:b', name: 'Oats', mealTypes: ['breakfast'], createdAt: '2026-09-20T00:00:00Z', confirmed: false };
  assert.deepEqual(filterList([older, newer], '', 'all').map((u) => u.id), ['u:b', 'u:a']);
  assert.deepEqual(filterList([older, newer], 'chick', 'all').map((u) => u.id), ['u:a']);
  assert.deepEqual(filterList([older, newer], '', 'breakfast').map((u) => u.id), ['u:b']);
  assert.equal(listMeta(newer), 'Breakfast · 35 min · Confirm allergens');
  assert.equal(listMeta({ ...older, usePlan: false }), 'Lunch / Dinner · 35 min · Not in plans');
});
