/**
 * holt-action-wiring.test.mjs — the integrator's wiring of lane B's meal cards into lane C's `cardFor`
 * (AI Road to 10 Sprint 4a §1.2). A meal card is lane B's `mealCard` (the app's totals); without Nutrition, no Confirm.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/holt-action-wiring.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { cardFor } from '../holt-action-cards.ts';
import { checkFoodAction, narrowFoods } from '../ask-food-tools.ts';

const EGG = {
  key: 'usda:555', source: 'usda', sourceId: '555', name: 'Egg, whole, cooked', brand: null, gtin: null,
  kcal100: 155, protein100: 12.6, carb100: 1.1, fat100: 10.6, servings: [{ label: '1 large', grams: 50 }], micros: null, attribution: null,
};
const seen = new Map(narrowFoods({ foods: [EGG] }).map((f) => [f.key, f]));
const input = () => {
  const r = checkFoodAction('log_food', { items: [{ key: 'usda:555', amount: 2 }] }, seen);
  assert.equal(r.ok, true);
  return JSON.parse(JSON.stringify(r.input));
};

test('log_food draws lane B\'s meal card through cardFor, at the device\'s hour', async () => {
  const c = await cardFor({ name: 'log_food', input: input() }, { units: 'imperial', today: '2026-11-18', nutritionAccess: true, hour: 13 });
  assert.ok(c, 'a card');
  assert.equal(c.action, 'log_food');
  assert.match(c.confirmLabel, /Lunch/);
});

test('without Nutrition a meal card has no Confirm and says why', async () => {
  const c = await cardFor({ name: 'log_food', input: input() }, { units: 'imperial', today: '2026-11-18', nutritionAccess: false });
  assert.equal(c.confirmLabel, null);
  assert.match(c.blocked, /Nutrition/);
});
