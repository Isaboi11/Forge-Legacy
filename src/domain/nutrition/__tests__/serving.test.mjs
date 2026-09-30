import test from 'node:test';
import assert from 'node:assert/strict';

import {
  alcoholAllowance,
  defaultServing,
  energyKnown,
  looksSane,
  portionLabel,
  portionMacros,
  quickAddMacros,
  rankBySource,
  repeatMacros,
  SOURCE_LABEL,
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
  // Raw produce: fibre makes macros overshoot energy, a few kcal is not a broken record (2026-09-26).
  assert.equal(looksSane({ ...oats, kcal100: 30, protein100: 0.7, carb100: 10.5, fat100: 0.2 }), true); // lime
  assert.equal(looksSane({ ...oats, kcal100: 23, protein100: 3.2, carb100: 2.7, fat100: 0.6 }), true); // basil
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

/* ── QA R2-F4: drinks carry alcohol energy the macros don't count ───────────── */

const food = (over) => ({ key: 'x:1', source: 'usda', name: 'Food', servings: [], ...over });

test('real drinks pass the sanity check (FDC / FatSecret numbers)', () => {
  // FDC "Alcoholic beverage, wine, table, red": 85 kcal, 0.07 P, 2.61 C, 0 F per 100 g.
  assert.equal(looksSane(food({ name: 'Alcoholic beverage, wine, table, red', kcal100: 85, protein100: 0.07, carb100: 2.61, fat100: 0 })), true);
  assert.equal(looksSane(food({ name: 'Wine, red', kcal100: 85, protein100: 0.1, carb100: 2.6, fat100: 0 })), true);
  // FDC "Alcoholic beverage, distilled, vodka, 80 proof": 231 kcal, no macros at all.
  assert.equal(looksSane(food({ name: 'Alcoholic beverage, distilled, vodka, 80 proof', kcal100: 231, protein100: 0, carb100: 0, fat100: 0 })), true);
  assert.equal(looksSane(food({ source: 'fs', name: 'Vodka', brand: 'Titos', kcal100: 231, protein100: 0, carb100: 0, fat100: 0 })), true);
  // FDC "Alcoholic beverage, beer, regular, all": 43 kcal, 0.46 P, 3.55 C, 0 F.
  assert.equal(looksSane(food({ name: 'Alcoholic beverage, beer, regular, all', kcal100: 43, protein100: 0.46, carb100: 3.55, fat100: 0 })), true);
  assert.equal(looksSane(food({ name: 'Beer, light', kcal100: 29, protein100: 0.24, carb100: 1.64, fat100: 0 })), true);
  // Whiskey 86 proof 250 kcal; coffee liqueur 53 proof 326 kcal with 46.8 g carb; dessert wine 160 kcal.
  assert.equal(looksSane(food({ name: 'Whiskey, 86 proof', kcal100: 250, protein100: 0, carb100: 0.1, fat100: 0 })), true);
  assert.equal(looksSane(food({ name: 'Coffee liqueur, 53 proof', kcal100: 326, protein100: 0.1, carb100: 46.8, fat100: 0.3 })), true);
  assert.equal(looksSane(food({ name: 'Wine, dessert, sweet', kcal100: 160, protein100: 0.2, carb100: 13.7, fat100: 0 })), true);
  // Hard seltzer (the brand carries the class): ~28 kcal, 0.6 g carb.
  assert.equal(looksSane(food({ name: 'Black Cherry', brand: 'White Claw Hard Seltzer', kcal100: 28, protein100: 0, carb100: 0.6, fat100: 0 })), true);
});

test('a stated alcohol figure joins the sum exactly', () => {
  // 11 g alcohol x 7 + 2.6 g carb x 4 = 87.4 -> a wine with its alcohol stated passes on the ratio itself.
  assert.equal(looksSane(food({ name: 'Mystery bottle', kcal100: 85, protein100: 0, carb100: 2.6, fat100: 0, micros: { alcohol: 11 } })), true);
  // Stated as 0 g alcohol, 231 kcal from nothing is junk — the name allowance does not second-guess the source.
  assert.equal(looksSane(food({ name: 'Vodka', kcal100: 231, protein100: 0, carb100: 0, fat100: 0, micros: { alcohol: 0 } })), false);
});

test('junk rows still fail — the drink allowance is not a free pass', () => {
  // "0 kcal, no macros" is missing data, not a free glass of wine (the community "Red Wine · 0 cal" row).
  assert.equal(looksSane(food({ source: 'community', name: 'Red Wine', brand: 'Aphotic', kcal100: 0, protein100: 0, carb100: 0, fat100: 0 })), false);
  assert.equal(looksSane(food({ name: 'Vodka', kcal100: 0, protein100: null, carb100: null, fat100: null })), false);
  // A 12 oz beer's per-serving figures (153 kcal, 1.6 P, 12.8 C) filed as per-100 g: implies an 18% ABV beer.
  assert.equal(looksSane(food({ name: 'Beer, regular', kcal100: 153, protein100: 1.6, carb100: 12.8, fat100: 0 })), false);
  // A bottle's 638 kcal filed as per-100 g wine.
  assert.equal(looksSane(food({ name: 'Wine, red', kcal100: 638, protein100: 0.5, carb100: 19.5, fat100: 0 })), false);
  // A drink whose macros EXCEED its calories is still mis-keyed — alcohol only ever adds energy.
  assert.equal(looksSane(food({ name: 'Wine, red', kcal100: 85, protein100: 0, carb100: 60, fat100: 0 })), false);
  // A non-drink with calories and no macros is not a spirit.
  assert.equal(looksSane(food({ name: 'Chicken breast, roasted', kcal100: 165, protein100: 0, carb100: 0, fat100: 0 })), false);
  // A food that merely mentions a drink gets no allowance: vodka sauce, wine vinegar, root beer, NA beer.
  assert.equal(looksSane(food({ name: 'Vodka pasta sauce', kcal100: 231, protein100: 0, carb100: 0, fat100: 0 })), false);
  assert.equal(looksSane(food({ name: 'Red wine vinegar', kcal100: 90, protein100: 0, carb100: 0.3, fat100: 0 })), false);
  assert.equal(looksSane(food({ name: 'Root beer', kcal100: 120, protein100: 0, carb100: 10.6, fat100: 0 })), false);
  assert.equal(looksSane(food({ name: 'Non-alcoholic beer', kcal100: 90, protein100: 0.2, carb100: 4.8, fat100: 0 })), false);
  // The original junk still fails: per-serving oats, over 900.
  assert.equal(looksSane({ ...oats, kcal100: 88 }), false);
  assert.equal(looksSane({ ...oats, kcal100: 1200 }), false);
});

test('the alcohol allowance is by class, and zero for non-drinks', () => {
  assert.equal(alcoholAllowance({ name: 'Vodka', brand: 'Smirnoff' }), 80);
  assert.equal(alcoholAllowance({ name: 'Wine, red', brand: null }), 16);
  assert.equal(alcoholAllowance({ name: 'Boston Lager', brand: 'Samuel Adams' }), 10);
  assert.equal(alcoholAllowance({ name: 'Ginger ale', brand: null }), 0);
  assert.equal(alcoholAllowance({ name: 'Kale, raw', brand: null }), 0);
  assert.equal(alcoholAllowance({ name: 'Banana, raw', brand: null }), 0);
});

test('zero energy is believed only for foods that really have none', () => {
  assert.equal(energyKnown(food({ name: 'Water, tap', kcal100: 0, protein100: 0, carb100: 0, fat100: 0 })), true);
  assert.equal(energyKnown(food({ name: 'Diet cola', kcal100: 0, protein100: 0, carb100: 0, fat100: 0 })), true);
  assert.equal(looksSane(food({ name: 'Coke Zero', kcal100: 0, protein100: 0, carb100: 0, fat100: 0 })), true);
  assert.equal(energyKnown(food({ name: 'Red Wine', kcal100: 0, protein100: 0, carb100: 0, fat100: 0 })), false);
  assert.equal(energyKnown(food({ name: 'Hard seltzer', kcal100: 0, protein100: 0, carb100: 0, fat100: 0 })), false);
  assert.equal(energyKnown(food({ name: 'Banana, raw', kcal100: 0, protein100: 0, carb100: 0, fat100: 0 })), false);
  assert.equal(energyKnown(food({ name: 'Banana, raw', kcal100: null, protein100: null, carb100: null, fat100: null })), false);
  assert.equal(energyKnown(food({ name: 'Banana, raw', kcal100: 89, protein100: 1.1, carb100: 22.8, fat100: 0.3 })), true);
});

/* ── QA R2-F3: the + on Recent repeats the stored portion, never a 0-cal guess ── */

test('a Recent repeat keeps the stored portion and its numbers', () => {
  // "Banana, raw" logged as 2 bananas: 244 cal.
  assert.deepEqual(repeatMacros({ kcal: 244, protein: 3, carb: 62.2, fat: 0.9, grams: 236 }), {
    kcal: 244,
    protein: 3,
    carb: 62.2,
    fat: 0.9,
    grams: 236,
  });
  // An unweighted serving still repeats — the calories are what was logged.
  assert.equal(repeatMacros({ kcal: 515, protein: 26, carb: 46, fat: 26, grams: null }).kcal, 515);
});

test('a Recent repeat refuses zero and unknown numbers so the food is re-read instead', () => {
  // The row R2-F3 wrote: 100 g, 0 cal — repeating it would poison every later repeat too.
  assert.equal(repeatMacros({ kcal: 0, protein: 0, carb: 0, fat: 0, grams: 100 }), null);
  // A Recent list cached before the macros were read has NaN for them.
  assert.equal(repeatMacros({ kcal: 244, protein: NaN, carb: NaN, fat: NaN, grams: null }), null);
  assert.equal(repeatMacros({ kcal: -5, protein: 0, carb: 0, fat: 0, grams: 100 }), null);
});

test('community rows rank below USDA and FatSecret, relevance kept inside each (QA 09-26 N-21)', () => {
  const rows = [
    { key: 'usda:1', source: 'usda' },
    { key: 'off:1', source: 'off' },
    { key: 'fs:1', source: 'fs' },
    { key: 'community:1', source: 'community' },
    { key: 'usda:2', source: 'usda' },
  ];
  assert.deepEqual(rankBySource(rows).map((r) => r.key), ['usda:1', 'fs:1', 'usda:2', 'off:1', 'community:1']);
});

test('a 0-cal "coffee cake" or "sweet tea" is a blank row, not free food (QA 09-26 N-21)', () => {
  const zero = (name) => ({ key: 'off:9', source: 'off', name, kcal100: 0, protein100: null, carb100: null, fat100: null, servings: [] });
  assert.equal(energyKnown(zero('Coffee cake')), false);
  assert.equal(energyKnown(zero('Sweet tea')), false);
  assert.equal(energyKnown(zero('Zero sugar protein bar')), false);
  assert.equal(energyKnown(zero('Black coffee')), true);
  assert.equal(energyKnown(zero('Unsweetened iced tea')), true);
});

test('FatSecret rows are not all called restaurant food (QA 09-26 N-20)', () => {
  assert.notEqual(SOURCE_LABEL.fs, 'Restaurant data');
});
