import test from 'node:test';
import assert from 'node:assert/strict';

import {
  activeItems,
  addExtra,
  buyAmount,
  estimateFor,
  estimateLine,
  groceryList,
  markHave,
  planSignature,
  shareText,
  stateFor,
} from '../grocery.ts';
import { GROCERY } from '../grocery-data.ts';
import { cooksOf, feedsDay, planWeek } from '../meal-planner.ts';
import { INGREDIENTS } from '../recipes-data.ts';
import { setForgeRecipes } from '../meal-planner.ts';
// The app ships no Forge recipes since 2026-09-24; the planner is tested against the 40 retired ones.
import { STARTER_RECIPES as RECIPE_SOURCES } from './fixtures/starter-recipes.ts';

setForgeRecipes(RECIPE_SOURCES);

const PREFS = { diet: 'anything', allergens: [], dislikes: [], meals: ['breakfast', 'lunch', 'dinner'], cookMinutes: null, household: 2, weeklyBudgetUsd: null };
const TARGET = { kcal: 2500, protein: 180, carb: 270, fat: 80 };
const week = planWeek({ prefs: PREFS, target: TARGET, seed: 7, locked: {} });

test('every ingredient has grocery data: an aisle, a buy unit, and a sourced price or an honest null', () => {
  for (const key of Object.keys(INGREDIENTS)) {
    const g = GROCERY[key];
    assert.ok(g, key);
    if (g.price) {
      assert.ok(g.price.per100g > 0 && g.price.per100g < 10, `${key}: ${g.price.per100g}`);
      assert.match(g.price.source, /^(USDA ERS|BLS) /);
    }
  }
});

test('buy amounts round UP to what a store sells', () => {
  assert.equal(buyAmount({ kind: 'lb' }, 600), '1½ lb');
  assert.equal(buyAmount({ kind: 'lb' }, 100), '½ lb');
  assert.equal(buyAmount({ kind: 'lb' }, 907.2), '2 lb');
  assert.equal(buyAmount({ kind: 'dozen' }, 400), '12-count'); // 8 eggs
  assert.equal(buyAmount({ kind: 'dozen' }, 700), '18-count'); // 14 eggs
  assert.equal(buyAmount({ kind: 'each', grams: 150, one: 'onion', many: 'onions' }, 160), '2 onions');
  assert.equal(buyAmount({ kind: 'pack', grams: 250, unit: 'can' }, 480), '2 cans');
  assert.equal(buyAmount({ kind: 'pack', grams: 360, unit: 'pack of 6' }, 700), '2 packs of 6');
  assert.equal(buyAmount({ kind: 'pack', grams: 926, unit: '32-oz carton' }, 500), '1 32-oz carton');
});

test('the list is built from COOKS: a leftover lunch buys nothing extra beyond its cook', () => {
  const list = groceryList(week, 2);
  const cooks = cooksOf(week, 2);
  const total = (key) => list.items.find((x) => x.key === key)?.grams ?? 0;
  const expected = {};
  for (const c of cooks) {
    const src = RECIPE_SOURCES.find((r) => r.id === c.recipeId);
    for (const [k, g] of src.ingredients) expected[k] = (expected[k] ?? 0) + g * c.servingsCooked;
  }
  for (const [k, g] of Object.entries(expected)) assert.equal(total(k), Math.round(g), k);
  assert.equal(list.cooks, cooks.length);
});

test('a dinner that feeds a leftover is bought for both meals', () => {
  const d = week.findIndex((day, i) => {
    const din = day.items.find((x) => x.slot === 'dinner');
    return din && feedsDay(week, i, din) != null;
  });
  assert.ok(d >= 0);
  const dinner = week[d].items.find((x) => x.slot === 'dinner');
  const uses = groceryList(week, 2).items.flatMap((x) => x.uses).filter((u) => u.recipe === RECIPE_SOURCES.find((r) => r.id === dinner.recipeId).name);
  assert.ok(uses.every((u) => u.servings === 2 * dinner.portion * 2));
});

test('items sort by aisle, then name', () => {
  const order = ['Produce', 'Meat & Fish', 'Dairy & Eggs', 'Pantry', 'Spices'];
  const items = groceryList(week, 2).items;
  for (let i = 1; i < items.length; i++) {
    const a = order.indexOf(items[i - 1].aisle), b = order.indexOf(items[i].aisle);
    assert.ok(a < b || (a === b && items[i - 1].name.localeCompare(items[i].name) <= 0));
  }
});

test('first visit: staples start in "have it"; a changed plan clears the cart but keeps home and extras', () => {
  const list = groceryList(week, 2);
  const sig = planSignature(week, 2);
  const first = stateFor(null, list, sig);
  assert.ok(list.items.filter((x) => x.staple).every((x) => first.have[x.key]));
  const used = { ...first, checked: { [list.items[0].key]: true, 'x:paper towels': true }, extras: [{ key: 'x:paper towels', name: 'Paper towels' }], have: { ...first.have, egg: true } };
  assert.deepEqual(stateFor(used, list, sig).checked, used.checked);
  const next = stateFor(used, list, 'different');
  assert.deepEqual(next.checked, { 'x:paper towels': true });
  assert.ok(next.have.egg);
  assert.equal(next.extras.length, 1);
});

test('adding an item: capitalised, no duplicates, and typing a "have it" item puts it back', () => {
  const list = groceryList(week, 2);
  let s = stateFor(null, list, 'sig');
  s = addExtra(list, s, '  paper   towels ').state;
  assert.deepEqual(s.extras, [{ key: 'x:paper towels', name: 'Paper towels' }]);
  assert.equal(addExtra(list, s, 'Paper towels').note, 'Paper towels is already on the list');
  const staple = list.items.find((x) => x.staple);
  assert.ok(s.have[staple.key]);
  s = addExtra(list, s, staple.name).state;
  assert.ok(!s.have[staple.key]);
});

test('"have it" takes an item off the list and out of the cart', () => {
  const list = groceryList(week, 2);
  const key = list.items.find((x) => !x.staple).key;
  let s = { ...stateFor(null, list, 'sig'), checked: { [key]: true } };
  s = markHave(s, key);
  assert.ok(s.have[key] && !s.checked[key]);
  assert.ok(!activeItems(list, s).some((x) => x.key === key));
});

test('the estimate sums only priced items still to buy, and counts the ones it cannot price', () => {
  const list = groceryList(week, 2);
  const s = stateFor(null, list, 'sig');
  const e = estimateFor(list, s);
  const want = list.items.filter((x) => !s.have[x.key]);
  assert.equal(e.unpriced, want.filter((x) => x.cost == null).length);
  const sum = want.reduce((t, x) => t + (x.cost ?? 0), 0);
  assert.ok(Math.abs(e.dollars - sum) < 1e-9);
  assert.ok(e.dollars > 20 && e.dollars < 400, String(e.dollars));
  assert.equal(estimateLine({ dollars: 84.4, unpriced: 3 }, null), '≈ $84 at average US prices · 3 items not priced');
  assert.equal(estimateLine({ dollars: 84.4, unpriced: 0 }, 120), '≈ $84 at average US prices · budget $120');
});

test('share text lists what is left by aisle, skipping what is in the cart', () => {
  const list = groceryList(week, 2);
  const s0 = stateFor(null, list, 'sig');
  const act = activeItems(list, s0);
  const s = { ...s0, checked: { [act[0].key]: true } };
  const text = shareText('Sep 28 – Oct 4', act, s);
  assert.match(text, /^Grocery list · Sep 28 – Oct 4/);
  assert.ok(!text.includes(`- ${act[0].name} ·`));
  assert.ok(text.includes('PRODUCE'));
});
