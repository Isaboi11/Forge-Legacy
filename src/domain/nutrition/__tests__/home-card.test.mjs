import test from 'node:test';
import assert from 'node:assert/strict';

import { homeNutritionView } from '../home-card.ts';

const target = { kcal: 2610, protein: 175, carb: 300, fat: 80 };

test("the PO's mockup: 190 eaten, 2,420 left, every macro with what is left", () => {
  const v = homeNutritionView({ kcal: 190, protein: 16, carb: 14, fat: 8 }, true, target);
  assert.deepEqual(v.calories, { value: '190', label: 'Calories', sub: '2,420 left', fraction: 190 / 2610 });
  assert.deepEqual(
    v.macros.map((m) => [m.label, m.value, m.sub]),
    [['Protein', '16', '159g left'], ['Carbs', '14', '286g left'], ['Fat', '8', '72g left']],
  );
});

test('nothing logged yet shows the targets, never a row of zeros', () => {
  const v = homeNutritionView({ kcal: 0, protein: 0, carb: 0, fat: 0 }, false, target);
  assert.equal(v.calories.value, '2,610');
  assert.equal(v.calories.label, 'Calories today');
  assert.deepEqual(v.macros.map((m) => m.value), ['175', '300', '80']);
  assert.ok(![v.calories, ...v.macros].some((c) => c.value === '0'), 'no zero anywhere');
});

test('past a target is a fact, not a verdict, and the bar stops at full', () => {
  const v = homeNutritionView({ kcal: 2900, protein: 190, carb: 250, fat: 95 }, true, target);
  assert.equal(v.calories.sub, 'Target reached');
  assert.equal(v.calories.fraction, 1);
  assert.equal(v.macros[0].sub, 'Target reached');
  assert.ok(!/over|too much|exceed/i.test(JSON.stringify(v)));
});

test('no target: what was eaten, an invitation, and empty bars', () => {
  const v = homeNutritionView({ kcal: 640, protein: 40, carb: 60, fat: 20 }, true, null);
  assert.equal(v.calories.value, '640');
  assert.equal(v.calories.sub, 'Set a daily target');
  assert.ok(v.macros.every((m) => m.fraction === 0 && m.sub === ''));
});

test('the whole card reads as one sentence to a screen reader', () => {
  const v = homeNutritionView({ kcal: 190, protein: 16, carb: 14, fat: 8 }, true, target);
  assert.match(v.a11y, /^Nutrition\. 190 of 2,610 calories\. Protein 16 grams, 159g left/);
});
