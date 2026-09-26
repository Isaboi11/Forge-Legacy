/**
 * own-picks.test.mjs — "Choose my own" (PO 2026-09-26: "I need to be able to add in my own things where I want").
 * Any slot takes any of the athlete's recipes that keeps their rules; the pick is locked, so a rebuild keeps it.
 *
 * Run:  node --test --experimental-strip-types src/domain/nutrition/__tests__/own-picks.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { placeMeal, ownPicks, ownPicksHidden, rebuildWeek, planWeek, registerUserRecipes } from '../meal-planner.ts';
import { toBook, recipeFrom, blankForm, detectAllergens } from '../user-recipes.ts';

const mine = (id, name, mealTypes, ingredients) =>
  toBook(recipeFrom({ ...blankForm(), name, mealTypes, minutes: 25, yield: 1, ingredients, allergens: detectAllergens(ingredients), confirmed: true, usePlan: true }, `u:${id}`, '2026-09-26T00:00:00Z'));
const tacos = mine('t', 'Beef tacos', ['dinner'], [{ key: 'ground_beef', g: 150, unit: 'g', qty: 150 }, { key: 'flour_tortilla', g: 90, unit: 'g', qty: 90 }]);
const pbToast = mine('p', 'Peanut butter toast', ['breakfast'], [{ key: 'peanut_butter', g: 32, unit: 'g', qty: 32 }]);
registerUserRecipes([tacos, pbToast]);

const prefs = { diet: 'anything', allergens: ['peanuts'], dislikes: [], meals: ['breakfast', 'lunch', 'dinner'], cookMinutes: 15, household: 1, weeklyBudgetUsd: null };
const target = { kcal: 2400, protein: 180, carb: 250, fat: 70 };

test('the picker offers the athlete\'s recipes that keep their rules, made-for-this-meal first', () => {
  const picks = ownPicks('breakfast', prefs);
  assert.deepEqual(picks.map((p) => p.recipe.name), ['Beef tacos'], 'peanut toast is out: peanuts');
  assert.equal(picks[0].forSlot, false, 'tacos for breakfast is allowed, just not tagged');
  const hidden = ownPicksHidden(prefs);
  assert.equal(hidden.count, 1);
  assert.match(hidden.example, /peanut butter toast: has peanuts/i);
});

test('an empty slot takes the pick, it is locked, and a rebuild keeps it even past the cook-time cap', () => {
  const days = planWeek({ prefs, target, seed: 1, locked: {} });
  assert.ok(!days[0].items.some((it) => it.slot === 'dinner'), 'with a 15-min cap nothing fills dinner');
  const out = placeMeal(days, {}, 0, 'dinner', 'u:t', prefs, target);
  assert.equal(out.days[0].items.find((it) => it.slot === 'dinner').recipeId, 'u:t');
  assert.ok(out.locked['0-dinner']);
  const week = { weekStart: '2026-09-21', seed: 1, targetKcal: 2400, prefsUpdatedAt: null, days: out.days, locked: out.locked, logged: {} };
  const rebuilt = rebuildWeek(week, prefs, target);
  assert.equal(rebuilt.days[0].items.find((it) => it.slot === 'dinner')?.recipeId, 'u:t');
});

test('a filled slot is replaced, not doubled', () => {
  const days = placeMeal(planWeek({ prefs, target, seed: 1, locked: {} }), {}, 2, 'dinner', 'u:t', prefs, target).days;
  const again = placeMeal(days, {}, 2, 'dinner', 'u:t', prefs, target).days;
  assert.equal(again[2].items.filter((it) => it.slot === 'dinner').length, 1);
});
