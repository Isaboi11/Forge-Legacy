import test from 'node:test';
import assert from 'node:assert/strict';

import { checkPortion, draftEntry, entryAsFood, portionRefusalLine, pricedFood, repeatDraft } from '../logging.ts';
import { defaultServing, portionMacros } from '../serving.ts';

const oats = {
  key: 'usda:1',
  source: 'usda',
  name: 'Oats, rolled',
  brand: 'Generic',
  kcal100: 379,
  protein100: 13.2,
  carb100: 67.7,
  fat100: 6.5,
  servings: [
    { label: '1 cup', grams: 81 },
    { label: '100 g', grams: 100 },
  ],
  micros: { fiber: 10.1, sodium: 6 },
};

const cup = { serving: { label: '1 cup', grams: 81 }, quantity: 1 };

const dietCoke = {
  key: 'usda:2',
  source: 'usda',
  name: 'Diet Coke',
  brand: 'Coca-Cola',
  kcal100: 0,
  protein100: 0,
  carb100: 0,
  fat100: 0,
  servings: [{ label: '1 can', grams: 355 }],
};

/* ── one row, whichever door ──────────────────────────────────────────────── */

test('the + and Food Detail write the SAME row for the same portion (R2-B2)', () => {
  /* The + logs the default serving, quantity 1; Food Detail logs whatever portion is on screen. Both call
     `draftEntry`, so for the same portion there is one answer. */
  const fromPlus = draftEntry(oats, { serving: defaultServing(oats), quantity: 1 }, 'breakfast');
  const fromDetail = draftEntry(oats, cup, 'breakfast');
  assert.deepEqual(fromPlus, fromDetail);
  assert.deepEqual(fromPlus, {
    meal: 'breakfast',
    source: 'usda',
    sourceKey: 'usda:1',
    name: 'Oats, rolled',
    brand: 'Generic',
    servingLabel: '1 cup (81 g)',
    quantity: 1,
    macros: { kcal: 307, protein: 10.7, carb: 54.8, fat: 5.3, grams: 81 },
    micros: { fiber: 10.1, sodium: 6 },
  });
});

test('the row keeps the micronutrients — the + used to be the path that could lose them (N-27)', () => {
  assert.deepEqual(draftEntry(oats, cup, 'lunch').micros, { fiber: 10.1, sodium: 6 });
});

test('a FatSecret row keeps calories and macros only — the licence says so (§4)', () => {
  const fs = { ...oats, key: 'fs:9', source: 'fs' };
  assert.equal(draftEntry(fs, cup, 'lunch').micros, null);
});

test('a zero-calorie food logs from either door (N-06)', () => {
  const can = { serving: { label: '1 can', grams: 355 }, quantity: 1 };
  const check = checkPortion(dietCoke, can);
  assert.equal(check.refusal, null);
  const entry = draftEntry(dietCoke, can, 'snacks');
  assert.equal(entry.macros.kcal, 0);
  assert.equal(entry.macros.grams, 355);
  assert.equal(entry.servingLabel, '1 can (355 g)');
});

test('UNKNOWN calories are still never logged as zero (R2-F3)', () => {
  const wine = { ...dietCoke, key: 'community:1', source: 'community', name: 'Red Wine', brand: null };
  assert.equal(checkPortion(wine, { serving: { label: '1 glass', grams: 150 }, quantity: 1 }).refusal, 'unknown-energy');
  assert.equal(draftEntry(wine, { serving: { label: '1 glass', grams: 150 }, quantity: 1 }, 'dinner'), null);
  const blank = { ...oats, kcal100: null };
  assert.equal(draftEntry(blank, cup, 'breakfast'), null);
});

test('nothing to multiply is refused: no amount, or a serving nobody weighed', () => {
  assert.equal(checkPortion(oats, { ...cup, quantity: 0 }).refusal, 'no-weight');
  assert.equal(checkPortion(oats, { serving: { label: '1 slice', grams: null }, quantity: 1 }).refusal, 'no-weight');
  assert.equal(draftEntry(oats, { ...cup, quantity: 0 }, 'breakfast'), null);
});

test('999,999 eggs is refused, and a large real portion is asked about (N-05)', () => {
  const egg = { ...oats, name: 'Egg', kcal100: 143, servings: [{ label: '1 large', grams: 50 }] };
  const many = checkPortion(egg, { serving: { label: '1 large', grams: 50 }, quantity: 999999 });
  assert.equal(many.refusal, 'too-much');
  assert.equal(many.ask, false);
  assert.equal(draftEntry(egg, { serving: { label: '1 large', grams: 50 }, quantity: 999999 }, 'snacks'), null);
  assert.equal(portionRefusalLine('too-much'), 'That’s more than one entry can hold. Check the amount.');

  /* 1.5 kg of oats is 5,685 cal: possible, so allowed — and asked about first. */
  const big = checkPortion(oats, { serving: { label: 'g', grams: 1 }, quantity: 1500 });
  assert.equal(big.refusal, null);
  assert.equal(big.ask, true);
  assert.equal(checkPortion(oats, cup).ask, false);
});

test('over ten kilograms is too much even when it carries no calories', () => {
  assert.equal(checkPortion(dietCoke, { serving: { label: 'g', grams: 1 }, quantity: 10001 }).refusal, 'too-much');
  assert.equal(checkPortion(dietCoke, { serving: { label: 'g', grams: 1 }, quantity: 10000 }).refusal, null);
});

/* ── the + on a Recent row ────────────────────────────────────────────────── */

const recent = {
  key: 'usda:1',
  source: 'usda',
  name: 'Oats, rolled',
  brand: 'Generic',
  servingLabel: '2 × 1 cup (162 g)',
  quantity: 2,
  kcal: 614,
  protein: 21.4,
  carb: 109.7,
  fat: 10.5,
  grams: 162,
  micros: { fiber: 10.1 },
};

test('a Recent repeats exactly what was logged, micronutrients included', () => {
  assert.deepEqual(repeatDraft(recent, 'breakfast'), {
    meal: 'breakfast',
    source: 'usda',
    sourceKey: 'usda:1',
    name: 'Oats, rolled',
    brand: 'Generic',
    servingLabel: '2 × 1 cup (162 g)',
    quantity: 2,
    macros: { kcal: 614, protein: 21.4, carb: 109.7, fat: 10.5, grams: 162 },
    micros: { fiber: 10.1 },
  });
});

test('a Recent whose numbers cannot be trusted is not repeated — the food is read instead', () => {
  assert.equal(repeatDraft({ ...recent, kcal: 0 }, 'breakfast'), null);
  assert.equal(repeatDraft({ ...recent, protein: NaN }, 'breakfast'), null);
  assert.equal(repeatDraft({ ...recent, kcal: 99999999 }, 'breakfast'), null);
});

/* ── reopening a logged portion ───────────────────────────────────────────── */

/** "QA Oatmeal Bowl": logged at 350 cal, then the food itself was edited to 400. */
const bowlNow = {
  key: 'custom-1',
  source: 'custom',
  name: 'QA Oatmeal Bowl',
  kcal100: 133.33,
  protein100: 5,
  carb100: 20,
  fat100: 3.33,
  servings: [{ label: '1 bowl', grams: 300 }],
};
const bowlRow = {
  id: 'r1',
  meal: 'breakfast',
  name: 'QA Oatmeal Bowl',
  servingLabel: '1 bowl (300 g)',
  quantity: 1,
  kcal: 350,
  protein: 12.3,
  carb: 52.5,
  fat: 8.7,
  source: 'custom',
  sourceKey: 'custom-1',
  grams: 300,
  micros: null,
};
const bowl = { serving: { label: '1 bowl', grams: 300 }, quantity: 1 };

test('the QA case: a logged portion reopens at what was EATEN, not at what the food says now (N-07)', () => {
  assert.equal(portionMacros(bowlNow, bowl).kcal, 400); // what the old code showed, and then saved
  const { food, stored } = pricedFood(bowlNow, bowlRow);
  assert.equal(stored, true);
  assert.deepEqual(portionMacros(food, bowl), { kcal: 350, protein: 12.3, carb: 52.5, fat: 8.7, grams: 300 });
});

test('a save with no change writes back exactly the row that was there', () => {
  const { food, stored } = pricedFood(bowlNow, bowlRow);
  const { macros, refusal } = checkPortion(food, bowl, stored);
  assert.equal(refusal, null);
  assert.deepEqual(macros, { kcal: bowlRow.kcal, protein: bowlRow.protein, carb: bowlRow.carb, fat: bowlRow.fat, grams: bowlRow.grams });
});

test('a changed portion scales what was eaten, and the pills are still the food’s', () => {
  const { food } = pricedFood(bowlNow, bowlRow);
  assert.deepEqual(food.servings, bowlNow.servings);
  assert.equal(portionMacros(food, { ...bowl, quantity: 2 }).kcal, 700);
  assert.equal(portionMacros(food, { serving: { label: 'g', grams: 1 }, quantity: 150 }).kcal, 175);
});

test('a row with no weight, or a 0 cal row an old bug wrote, is priced from the food instead', () => {
  assert.equal(pricedFood(bowlNow, { ...bowlRow, grams: null }).stored, false);
  assert.equal(pricedFood(bowlNow, { ...bowlRow, kcal: 0 }).stored, false);
  assert.equal(pricedFood(bowlNow, null).food, bowlNow);
});

test('a stored edit is not second-guessed: the numbers are already the athlete’s', () => {
  /* A row from a food whose source has since lost its calories can still have its portion changed. */
  const gone = { ...bowlNow, kcal100: null, protein100: null, carb100: null, fat100: null };
  const { food, stored } = pricedFood(gone, bowlRow);
  assert.equal(checkPortion(food, bowl, stored).refusal, null);
  assert.equal(checkPortion(gone, bowl, false).refusal, 'unknown-energy');
});

test('a row whose food was deleted can still be re-portioned, in grams', () => {
  const food = entryAsFood(bowlRow);
  assert.equal(food.key, 'custom-1');
  assert.deepEqual(food.servings, []);
  assert.equal(portionMacros(food, { serving: { label: 'g', grams: 1 }, quantity: 300 }).kcal, 350);
  assert.equal(portionMacros(food, { serving: { label: 'g', grams: 1 }, quantity: 600 }).kcal, 700);
  /* No weight stored, or no food ever behind it: nothing to rebuild. */
  assert.equal(entryAsFood({ ...bowlRow, grams: null }), null);
  assert.equal(entryAsFood({ ...bowlRow, source: 'quick', sourceKey: null }), null);
});
