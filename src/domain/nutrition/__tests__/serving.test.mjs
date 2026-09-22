import test from 'node:test';
import assert from 'node:assert/strict';

import {
  defaultServing,
  looksSane,
  portionLabel,
  portionMacros,
  quickAddMacros,
  servingOptions,
} from '../serving.ts';

const oats = {
  key: 'usda:1',
  source: 'usda',
  name: 'Oats, rolled',
  kcal100: 379,
  protein100: 13.2,
  carb100: 67.7,
  fat100: 6.5,
  servings: [
    { label: '1 cup', grams: 81 },
    { label: '100 g', grams: 100 },
  ],
};

test('a weighed serving scales from per-100 g', () => {
  const m = portionMacros(oats, { serving: { label: '1 cup', grams: 81 }, quantity: 1 });
  assert.equal(m.kcal, 307); // 379 × 0.81
  assert.equal(m.protein, 10.7);
  assert.equal(m.grams, 81);
});

test('quantity multiplies, including halves', () => {
  const half = portionMacros(oats, { serving: { label: '1 cup', grams: 81 }, quantity: 0.5 });
  assert.equal(half.kcal, 153);
  const two = portionMacros(oats, { serving: { label: '1 cup', grams: 81 }, quantity: 2 });
  assert.equal(two.kcal, 614);
});

test('an unweighted serving yields zeros rather than a guess', () => {
  const m = portionMacros(oats, { serving: { label: '1 slice', grams: null }, quantity: 1 });
  assert.deepEqual(m, { kcal: 0, protein: 0, carb: 0, fat: 0, grams: null });
});

test('a zero or negative quantity cannot log calories', () => {
  const zero = portionMacros(oats, { serving: { label: '1 cup', grams: 81 }, quantity: 0 });
  assert.equal(zero.kcal, 0);
  const negative = portionMacros(oats, { serving: { label: '1 cup', grams: 81 }, quantity: -3 });
  assert.equal(negative.kcal, 0);
});

test('serving options always offer a weighed fallback and never duplicate', () => {
  const options = servingOptions({ ...oats, servings: [{ label: '1 cup', grams: 81 }, { label: '1 CUP', grams: 81 }] });
  assert.deepEqual(options.map((s) => s.label), ['1 cup', '100 g']);
});

test('the picker opens on a real serving, not 100 g', () => {
  assert.equal(defaultServing(oats).label, '1 cup');
  assert.equal(defaultServing({ ...oats, servings: [] }).label, '100 g');
});

test('portion labels read the way a person would say it', () => {
  assert.equal(portionLabel({ serving: { label: '1 cup', grams: 81 }, quantity: 1 }), '1 cup (81 g)');
  assert.equal(portionLabel({ serving: { label: '1 cup', grams: 81 }, quantity: 2 }), '2 × 1 cup (162 g)');
  assert.equal(portionLabel({ serving: { label: '100 g', grams: 100 }, quantity: 1 }), '100 g');
  assert.equal(portionLabel({ serving: { label: '1 slice', grams: null }, quantity: 3 }), '3 × 1 slice');
});

test('the sanity check separates real foods from broken records', () => {
  assert.equal(looksSane(oats), true);
  assert.equal(looksSane({ ...oats, kcal100: 88 }), false); // per-serving figure filed as per-100 g
  assert.equal(looksSane({ ...oats, kcal100: 1200 }), false); // beats pure fat
  assert.equal(looksSane({ ...oats, kcal100: null }), false);
  // Olive oil: 884 kcal, 100 g fat — extreme but true, and it must survive.
  assert.equal(looksSane({ ...oats, kcal100: 884, protein100: 0, carb100: 0, fat100: 100 }), true);
  // Black coffee: no macros, no calories.
  assert.equal(looksSane({ ...oats, kcal100: 2, protein100: 0, carb100: 0, fat100: 0 }), true);
});

test('quick add never stores a negative', () => {
  assert.deepEqual(quickAddMacros({ kcal: 450, protein: 30 }), {
    kcal: 450,
    protein: 30,
    carb: 0,
    fat: 0,
    grams: null,
  });
  assert.equal(quickAddMacros({ kcal: -200 }).kcal, 0);
});
