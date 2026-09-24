import test from 'node:test';
import assert from 'node:assert/strict';

import {
  convertAmount,
  extraRows,
  impactLine,
  oneDecimal,
  stepAmount,
  stepFor,
  unitChoices,
  unitWord,
} from '../detail.ts';

const oats = {
  key: 'usda:1',
  source: 'usda',
  name: 'Rolled Oats',
  kcal100: 375,
  protein100: 13.2,
  carb100: 67.7,
  fat100: 6.5,
  servings: [
    { label: '1 cup', grams: 80 },
    { label: '100 g', grams: 100 },
  ],
};

test('the unit pills keep the source word and always offer grams', () => {
  assert.deepEqual(unitChoices(oats).map((u) => u.label), ['1 cup', 'grams']);
});

test('"100 g" becomes the grams pill rather than a second gram unit', () => {
  const onlyPer100 = { ...oats, servings: [{ label: '100 g', grams: 100 }] };
  assert.deepEqual(unitChoices(onlyPer100).map((u) => u.label), ['grams']);
});

test('the step depends on the unit', () => {
  const [cup, grams] = unitChoices(oats);
  assert.equal(stepFor(grams), 10);
  assert.equal(stepFor(cup), 0.5);
  assert.equal(stepFor({ label: '1 oz', serving: { label: '1 oz', grams: 28.35 } }), 1);
});

test('stepping never goes below zero and keeps one decimal', () => {
  assert.equal(stepAmount(1, 0.5), 1.5);
  assert.equal(stepAmount(0.5, -0.5), 0);
  assert.equal(stepAmount(0, -10), 0);
  assert.equal(stepAmount(1.25, 0.5), 1.8);
});

test('⚠ switching units keeps the FOOD, not the number', () => {
  const [cup, grams] = unitChoices(oats);
  // 1 cup of oats is 80 g — not 1 g, which would log an eightieth of a breakfast.
  assert.equal(convertAmount(1, cup, grams), 80);
  assert.equal(convertAmount(80, grams, cup), 1);
  assert.equal(convertAmount(2.5, cup, grams), 200);
  // A serving with no gram weight cannot convert, so the amount is left alone.
  assert.equal(convertAmount(3, { label: 'slice', serving: { label: 'slice', grams: null } }, grams), 3);
});

test('the unit word pluralises only where English does', () => {
  const [cup, grams] = unitChoices(oats);
  assert.equal(unitWord(grams, 150), 'g');
  // The label's own "1" is dropped beside an amount: "2 cups", never "2 1 cups" (PO, 2026-09-24).
  assert.equal(unitWord(cup, 1), 'cup');
  assert.equal(unitWord(cup, 2), 'cups');
  assert.equal(unitWord({ label: "1 McDonald's Big Mac", serving: { label: "1 McDonald's Big Mac", grams: 205 } }, 0.5), "McDonald's Big Macs");
  assert.equal(unitWord({ label: 'oz', serving: { label: 'oz', grams: 28 } }, 3), 'oz');
});

test('the impact line flips wording instead of showing a minus', () => {
  assert.equal(impactLine(1850, 300, 2500), '350 left after this');
  assert.equal(impactLine(1850, 800, 2500), '150 over after this');
  assert.equal(impactLine(1850, 650, 2500), '0 left after this');
  assert.equal(impactLine(1850, 300, null), null); // no target set — say nothing
});

test('extra nutrients scale, and an unknown one is omitted rather than shown as zero', () => {
  const rows = extraRows({ fiber: 10.1, sodium: 6, sugar: 1 }, 80);
  assert.deepEqual(rows, [
    { label: 'Fiber', value: '8.1 g' },
    { label: 'Sugar', value: '0.8 g' },
    { label: 'Sodium', value: '5 mg' },
  ]);
  // Saturated fat and cholesterol were never supplied, so they do not appear at all.
  assert.equal(rows.some((r) => r.label === 'Saturated fat'), false);
  assert.deepEqual(extraRows(null, 80), []);
  assert.deepEqual(extraRows({ fiber: 10 }, null), []);
});

test('grams read to one decimal, never "13.0"', () => {
  assert.equal(oneDecimal(13), '13');
  assert.equal(oneDecimal(13.25), '13.3');
  assert.equal(oneDecimal(0.04), '0');
});
