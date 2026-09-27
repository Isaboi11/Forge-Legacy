import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RECIPE_BY_ID,
  fits,
  keptLocks,
  logKey,
  mealPicks,
  placeOnDays,
  planIsReadable,
  planWeek,
  registerSavedMeals,
  rebuildWeek,
  setForgeRecipes,
  slotKey,
  spanDays,
} from '../meal-planner.ts';
import { groceryList } from '../grocery.ts';
import { STARTER_RECIPES } from './fixtures/starter-recipes.ts';

/*
 * Saved meals in the meal plan (PO 09-26: "When I click on the meal plan add it should be able to add a
 * recipe or a meal from there. cause sometimes people repeat the meal for lunches or dinners").
 */

setForgeRecipes(STARTER_RECIPES);

const PREFS = {
  diet: 'vegetarian',
  allergens: ['dairy'],
  dislikes: ['chicken'],
  meals: ['breakfast', 'lunch', 'dinner'],
  cookMinutes: 15,
  household: 2,
  weeklyBudgetUsd: null,
};
const TARGET = { kcal: 2500, protein: 180, carb: 270, fat: 80 };

const USUAL_LUNCH = {
  id: 'abc',
  name: 'Usual lunch',
  items: [
    { name: 'Chicken wrap', grams: 250, servingLabel: '1 wrap', quantity: 1, kcal: 520, protein: 38, carb: 45, fat: 18 },
    { name: 'Greek yogurt cup', grams: null, servingLabel: '1 container', quantity: 1, kcal: 120, protein: 15, carb: 8, fat: 0 },
  ],
};

const emptyWeek = () => {
  const days = planWeek({ prefs: PREFS, target: TARGET, seed: 3, locked: {} });
  return { weekStart: '2026-09-21', seed: 3, targetKcal: TARGET.kcal, prefsUpdatedAt: null, days, locked: {}, logged: {} };
};

test('a saved meal registers as m:<id> with its foods summed, and an empty one is skipped', () => {
  registerSavedMeals([USUAL_LUNCH, { id: 'empty', name: 'Nothing', items: [] }]);
  const r = RECIPE_BY_ID['m:abc'];
  assert.equal(r.name, 'Usual lunch');
  assert.deepEqual([r.kcal, r.protein, r.carb, r.fat], [640, 53, 53, 18]);
  assert.equal(r.keeps, false, 'a plate never feeds a leftover');
  assert.equal(RECIPE_BY_ID['m:empty'], undefined);
  assert.deepEqual(mealPicks().map((m) => m.id), ['m:abc']);
});

test('⛔ the planner never picks a saved meal on its own', () => {
  registerSavedMeals([USUAL_LUNCH]);
  for (let seed = 1; seed < 30; seed++) {
    const days = planWeek({ prefs: { ...PREFS, diet: 'anything', allergens: [], dislikes: [], cookMinutes: null }, target: TARGET, seed, locked: {} });
    assert.ok(days.every((d) => d.items.every((it) => !it.recipeId.startsWith('m:'))), `seed ${seed}`);
  }
});

test('a placed saved meal fits any setup, so a rebuild keeps it (the athlete chose it; Forge cannot see inside)', () => {
  registerSavedMeals([USUAL_LUNCH]);
  assert.equal(fits(RECIPE_BY_ID['m:abc'], PREFS), true);
  const week = emptyWeek();
  const out = placeOnDays(week, [2], 'lunch', 'm:abc', PREFS, TARGET);
  const next = { ...week, days: out.days, locked: out.locked };
  assert.ok(keptLocks(next, PREFS)['2-lunch']);
  const rebuilt = rebuildWeek(next, PREFS, TARGET);
  assert.equal(rebuilt.days[2].items.find((it) => it.slot === 'lunch').recipeId, 'm:abc');
  assert.ok(planIsReadable(rebuilt.days));
});

test('Mon–Fri puts the same meal on five lunches, each locked; a logged day is left alone', () => {
  registerSavedMeals([USUAL_LUNCH]);
  assert.deepEqual(spanDays('weekdays', 5), [0, 1, 2, 3, 4]);
  assert.deepEqual(spanDays('week', 2), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(spanDays('day', 3), [3]);

  const week = emptyWeek();
  const tuesdayLunch = week.days[1].items.find((it) => it.slot === 'lunch');
  const logged = tuesdayLunch ? { [logKey(1, tuesdayLunch)]: 'entry-1' } : {};
  const out = placeOnDays({ ...week, logged }, spanDays('weekdays', 0), 'lunch', 'm:abc', PREFS, TARGET);
  for (const d of [0, 2, 3, 4]) {
    const it = out.days[d].items.find((x) => x.slot === 'lunch' && !x.extra);
    assert.equal(it.recipeId, 'm:abc', `day ${d}`);
    assert.ok(out.locked[slotKey(d, it)], `day ${d} locked`);
  }
  if (tuesdayLunch) {
    assert.equal(out.placed, 4);
    assert.equal(out.days[1].items.find((x) => x.slot === 'lunch').recipeId, tuesdayLunch.recipeId, 'what was eaten is not rewritten');
  }
  assert.equal(out.days[5].items.find((x) => x.slot === 'lunch')?.recipeId === 'm:abc', false, 'Saturday untouched');
});

test('the grocery list buys a saved meal’s foods: by weight when known, by the serving when not', () => {
  registerSavedMeals([USUAL_LUNCH]);
  const week = emptyWeek();
  const out = placeOnDays(week, [0, 1, 2], 'lunch', 'm:abc', { ...PREFS, meals: ['lunch'] }, TARGET);
  const days = out.days.map((d) => ({ items: d.items.filter((it) => it.recipeId === 'm:abc') }));
  const list = groceryList(days, 2);
  const wrap = list.items.find((x) => x.name === 'Chicken wrap');
  const yogurt = list.items.find((x) => x.name === 'Greek yogurt cup');
  assert.equal(wrap.amount, '1500 g', '250 g × 3 days × 2 people');
  assert.equal(yogurt.amount, '6 × 1 container', '1 × 3 days × 2 people');
});

test('a stored week naming a saved meal that is not registered is unreadable (why fetchUserRecipes registers both)', () => {
  registerSavedMeals([USUAL_LUNCH]);
  const week = emptyWeek();
  const out = placeOnDays(week, [0], 'lunch', 'm:abc', PREFS, TARGET);
  registerSavedMeals([]);
  assert.equal(planIsReadable(out.days), false);
  registerSavedMeals([USUAL_LUNCH]);
  assert.equal(planIsReadable(out.days), true);
});
