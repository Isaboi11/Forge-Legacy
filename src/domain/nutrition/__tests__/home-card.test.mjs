import test from 'node:test';
import assert from 'node:assert/strict';

import { homeNutritionView } from '../home-card.ts';

const target = { kcal: 2610, protein: 175, carb: 300, fat: 80 };

test('option A, as mocked: "190 / 2,610 cal · 2,420 left", then each macro against its target', () => {
  const v = homeNutritionView({ kcal: 190, protein: 16, carb: 14, fat: 8 }, true, target);
  assert.equal(`${v.kcal} ${v.kcalOf}`, '190 / 2,610 cal');
  assert.equal(v.right, '2,420 left');
  assert.deepEqual(
    v.macros.map((m) => `${m.label} ${m.value} ${m.of}`),
    ['Protein 16 /175g', 'Carbs 14 /300g', 'Fat 8 /80g'],
  );
  assert.equal(v.bars, true);
  assert.equal(v.macros[0].fraction, 16 / 175);
});

test('nothing logged yet shows the targets, never a row of zeros', () => {
  const v = homeNutritionView({ kcal: 0, protein: 0, carb: 0, fat: 0 }, false, target);
  assert.equal(`${v.kcal} ${v.kcalOf}`, '2,610 cal today');
  assert.equal(v.right, 'Tap to log');
  assert.deepEqual(v.macros.map((m) => m.value), ['175', '300', '80']);
  assert.ok(![v.kcal, ...v.macros.map((m) => m.value)].includes('0'), 'no zero anywhere');
});

test('past a target is a fact, not a verdict, and the bar stops at full', () => {
  const v = homeNutritionView({ kcal: 2900, protein: 190, carb: 250, fat: 95 }, true, target);
  assert.equal(v.right, 'Target reached');
  assert.equal(v.macros[0].fraction, 1);
  assert.ok(!/over|too much|exceed/i.test(JSON.stringify(v)));
});

test('no target: what was eaten, an invitation, and no bars', () => {
  const v = homeNutritionView({ kcal: 640, protein: 40, carb: 60, fat: 20 }, true, null);
  assert.equal(`${v.kcal} ${v.kcalOf}`, '640 cal');
  assert.equal(v.right, 'Set a target');
  assert.equal(v.bars, false);
});

test('the whole card reads as one sentence to a screen reader', () => {
  const v = homeNutritionView({ kcal: 190, protein: 16, carb: 14, fat: 8 }, true, target);
  assert.equal(v.a11y, 'Nutrition. 190 of 2,610 calories, 2,420 left. Protein 16 of 175 grams, Carbs 14 of 300 grams, Fat 8 of 80 grams.');
});
