import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { offProductToFood } from '../off-product.ts';
import { portionMacros } from '../serving.ts';

/* A REAL response, fetched 2026-09-25 for the Quest bar the PO failed to scan (nutriments trimmed to the
   per-100 g keys). `feedback_test_fixtures_must_be_real_input`. */
const QUEST = JSON.parse(readFileSync(new URL('./fixtures/off-quest-bar-888849000463.json', import.meta.url), 'utf8'));

test('the real Quest bar response becomes a loggable food with its bar serving first', () => {
  const food = offProductToFood(QUEST);
  assert.ok(food);
  assert.equal(food.key, 'off:888849000463');
  assert.equal(food.source, 'off');
  assert.equal(food.attribution, 'Data from Open Food Facts (ODbL)');
  assert.equal(food.servings[0].label, '1 bar (60 g)');
  assert.equal(food.servings[0].grams, 60);
  assert.ok(food.kcal100 > 0);
  const bar = portionMacros(food, { serving: food.servings[0], quantity: 1 });
  assert.ok(bar.kcal > 150 && bar.kcal < 260, `one bar is ${bar.kcal} kcal`);
  assert.ok(bar.protein >= 15, `one bar has ${bar.protein} g protein`);
});

test('not found, no name, or no calories is not a food', () => {
  assert.equal(offProductToFood({ status: 0 }), null);
  assert.equal(offProductToFood(null), null);
  assert.equal(offProductToFood({ status: 1, product: { code: '1', nutriments: { 'energy-kcal_100g': 100 } } }), null);
  assert.equal(offProductToFood({ status: 1, product: { code: '1', product_name: 'X', nutriments: {} } }), null);
});

test('sodium arrives in grams and is stored in mg', () => {
  const food = offProductToFood({
    status: 1,
    product: { code: '0012', product_name: 'Salty', nutriments: { 'energy-kcal_100g': 500, sodium_100g: 0.4 } },
  });
  assert.equal(food.micros.sodium, 400);
  assert.equal(food.key, 'off:12');
});
