/**
 * holt-fill.test.mjs — Holt fills the week (`src/domain/nutrition/holt-fill.ts`): which meals are empty, what
 * Holt is asked, which dishes the planner may take, and that the saved recipe is one the planner can use.
 *
 * Run:  node --test --experimental-strip-types src/domain/nutrition/__tests__/holt-fill.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { emptySlots, dayHasEmptySlot, fillAsk, fillAvoid, formForPlan, plannable, allergenLine } from '../holt-fill.ts';
import { dishCards } from '../kitchen-cards.ts';
import { toBook, recipeFrom } from '../user-recipes.ts';

const day = (items) => ({ items });
const week = [day([{ slot: 'snacks', recipeId: 'u:1', portion: 1, leftover: false }]), day([{ slot: 'dinner', recipeId: 'u:2', portion: 1, leftover: false }])];

test('the empty meals are the setup meals missing on any day, in setup order', () => {
  assert.deepEqual(emptySlots(week, ['breakfast', 'lunch', 'dinner', 'snacks']), ['breakfast', 'lunch', 'dinner', 'snacks']);
  assert.deepEqual(emptySlots([day([{ slot: 'dinner', recipeId: 'x', portion: 1, leftover: false }])], ['dinner']), []);
  assert.equal(dayHasEmptySlot(week[1], ['dinner']), false);
  assert.equal(dayHasEmptySlot(week[0], ['dinner']), true);
});

test('Holt is asked inside the setup, and told what to avoid', () => {
  const ask = fillAsk('dinner', { cookMinutes: 30, household: 2, weeklyBudgetUsd: 80 });
  assert.match(ask, /Dinner ideas for my weekly meal plan, cooking for 2, each ready in 30 minutes or less, good as leftovers, on a budget\./);
  assert.deepEqual(fillAvoid({ allergens: ['tree_nuts'], diet: 'pescatarian', dislikes: ['olives'] }), ['tree nuts', 'meat', 'poultry', 'olives']);
});

const dish = (over = {}) => ({
  name: 'Garlic Chicken Rice Bowl', why: 'uses what you have', cuisine: 'American', method: 'pan', minutes: 25, servings: 1, mealType: 'dinner',
  ingredients: [
    { text: '170 g chicken thighs', quantity: 170, unit: 'g', food: 'chicken thighs' },
    { text: '75 g white rice', quantity: 75, unit: 'g', food: 'long-grain white rice' },
    { text: '60 g baby spinach', quantity: 60, unit: 'g', food: 'baby spinach' },
  ],
  steps: ['Cook the rice.', 'Sear the chicken to 165°F.'],
  ...over,
});

test('only fully matched dishes inside the cook-time limit are offered', () => {
  const cards = dishCards([dish(), dish({ name: 'Slow Stew', method: 'pot', minutes: 90 }), dish({ name: 'Odd Bowl', method: 'bowl', ingredients: [...dish().ingredients, { text: '1 tbsp zzz paste', quantity: 15, unit: 'g', food: 'zzz paste' }] })], []);
  assert.deepEqual(plannable(cards, 30).map((c) => c.name), ['Garlic Chicken Rice Bowl']);
});

test('an added dish is a confirmed, plannable recipe for that meal, with the app\'s allergens', () => {
  const [card] = dishCards([dish()], []);
  const form = formForPlan(card, 'lunch');
  assert.deepEqual(form.mealTypes, ['lunch']);
  assert.equal(form.confirmed, true);
  const book = toBook(recipeFrom(form, 'u:test', new Date().toISOString()));
  assert.equal(book.plannable, true);
  assert.ok(book.recipe.kcal > 0);
  assert.equal(allergenLine(card), 'No allergens');
});
