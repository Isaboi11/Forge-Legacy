import test from 'node:test';
import assert from 'node:assert/strict';

import {
  amountLine,
  foodListKcal,
  foodMeta,
  itemFromFood,
  itemFromRow,
  itemRow,
  matchesQuery,
  mealMeta,
  mealTotals,
  missingLine,
  qtyText,
  stepQty,
  unitOf,
} from '../my-foods.ts';

const row = (over = {}) => ({
  source: 'usda',
  source_key: 'usda:1',
  name: 'Bread, whole wheat',
  brand: null,
  serving_label: '2 × 1 slice (64 g)',
  grams: 64,
  quantity: 2,
  kcal: 160,
  protein: 8,
  carb: 28,
  fat: 2,
  micros: { fiber: 7 },
  ...over,
});

test('unitOf strips the quantity and the gram total the diary label carries', () => {
  assert.equal(unitOf('2 × 1 slice (64 g)', 2), '1 slice');
  assert.equal(unitOf('1 slice (32 g)', 1), '1 slice');
  assert.equal(unitOf('150 g', 1), '150 g');
  assert.equal(unitOf('1.5 × 1 cup (360 g)', 1.5), '1 cup');
  assert.equal(unitOf(null, 1), null);
  assert.equal(unitOf('  ', 1), null);
});

test('a saved row reads back to one unit', () => {
  const it = itemFromRow(row());
  assert.equal(it.unit, '1 slice');
  assert.equal(it.unitGrams, 32);
  assert.equal(it.per.kcal, 80);
  assert.equal(it.quantity, 2);
});

test('stepping 2 → 1 → 2 writes back the row it started from', () => {
  const it = itemFromRow(row());
  const down = itemRow({ ...it, quantity: stepQty(stepQty(it.quantity, -1), -1) });
  assert.equal(down.quantity, 1);
  assert.equal(down.kcal, 80);
  assert.equal(down.grams, 32);
  assert.equal(down.serving_label, '1 slice (32 g)');
  const back = itemRow({ ...it, quantity: 2 });
  assert.equal(back.kcal, 160);
  assert.equal(back.grams, 64);
  assert.equal(back.serving_label, '2 × 1 slice (64 g)');
  assert.deepEqual(back.micros, { fiber: 7 }, 'micros are per 100 g and never scale');
});

test('a Quick Add item (no serving, no grams) survives the round trip', () => {
  const it = itemFromRow(row({ source: 'quick', source_key: null, serving_label: null, grams: null, quantity: 1, kcal: 300 }));
  assert.equal(it.unit, null);
  assert.equal(amountLine(it), 'serving');
  const out = itemRow({ ...it, quantity: 1.5 });
  assert.equal(out.kcal, 450);
  assert.equal(out.grams, null);
  assert.equal(out.serving_label, null);
});

test('a zero or missing quantity never divides by zero', () => {
  const it = itemFromRow(row({ quantity: 0, kcal: 90 }));
  assert.equal(it.quantity, 1);
  assert.equal(it.per.kcal, 90);
});

test('the stepper moves by half and holds at ½ and 20', () => {
  assert.equal(stepQty(1, 1), 1.5);
  assert.equal(stepQty(0.5, -1), 0.5);
  assert.equal(stepQty(20, 1), 20);
  assert.equal(stepQty(1.25, 1), 1.75);
});

test('qtyText draws halves as ½', () => {
  assert.equal(qtyText(0.5), '½');
  assert.equal(qtyText(1), '1');
  assert.equal(qtyText(2.5), '2½');
  assert.equal(qtyText(1.25), '1.25');
});

test('amountLine shows the multiplier only past one', () => {
  const it = itemFromRow(row({ serving_label: '1 slice (32 g)', grams: 32, quantity: 1, kcal: 80 }));
  assert.equal(amountLine(it), '1 slice');
  assert.equal(amountLine({ ...it, quantity: 1.5 }), '1½ × 1 slice');
});

test('meal totals add each item at its quantity', () => {
  const a = itemFromRow(row());
  const b = itemFromRow(row({ kcal: 105, protein: 1.3, quantity: 1, serving_label: '1 medium', grams: 118 }));
  assert.deepEqual(mealTotals([a, b]), { kcal: 265, protein: 9 });
  assert.deepEqual(mealTotals([]), { kcal: 0, protein: 0 });
});

test('missingLine names what Save is waiting for', () => {
  const a = itemFromRow(row());
  assert.equal(missingLine('', []), 'Add a name and a food');
  assert.equal(missingLine('  ', [a]), 'Add a name');
  assert.equal(missingLine('Lunch', []), 'Add a food');
  assert.equal(missingLine('Lunch', [a]), '');
});

test('search wants every word, in any order, any case', () => {
  assert.equal(matchesQuery('Whey isolate, vanilla', 'VANILLA whey'), true);
  assert.equal(matchesQuery('Whey isolate, vanilla', 'whey chocolate'), false);
  assert.equal(matchesQuery('Anything', '   '), true);
});

const food = {
  key: 'abc',
  source: 'custom',
  name: 'Chicken wrap, homemade',
  brand: null,
  kcal100: 200,
  protein100: 13,
  carb100: 20,
  fat100: 7,
  servings: [{ label: '1 wrap', grams: 240 }],
  micros: { sodium: 400 },
};

test('a custom food lists at the first serving its maker gave it', () => {
  assert.equal(foodListKcal(food), 480);
  assert.equal(foodMeta(food), '1 wrap');
  assert.equal(foodMeta({ ...food, brand: 'Home' }), '1 wrap · Home');
});

test('a searched food joins the meal at its default serving, micros only where the licence allows', () => {
  const it = itemFromFood(food);
  assert.equal(it.unit, '1 wrap');
  assert.equal(it.per.kcal, 480);
  assert.deepEqual(it.micros, { sodium: 400 });
  assert.equal(itemFromFood({ ...food, source: 'fs' }).micros, null);
});

test('mealMeta lists names up to the first comma', () => {
  assert.equal(mealMeta(['Rolled oats', 'Whey isolate, vanilla', 'Banana']), '3 foods · Rolled oats, Whey isolate, Banana');
  assert.equal(mealMeta(['Apple']), '1 food · Apple');
  assert.equal(mealMeta([]), '0 foods');
});
