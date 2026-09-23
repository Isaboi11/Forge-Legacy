import test from 'node:test';
import assert from 'node:assert/strict';

import {
  caloriesFromMacros,
  checkCalories,
  extrasPerHundred,
  FOOD_UNITS,
  labelServing,
  perHundred,
  servingGrams,
  unitByKey,
  unitNeedsWeight,
  validateFood,
} from '../create-food.ts';
import { portionMacros } from '../serving.ts';

const g = unitByKey('g');
const cup = unitByKey('cup');
const oz = unitByKey('oz');
const piece = unitByKey('piece');

const base = {
  name: 'Overnight oats',
  brand: '',
  amount: '80',
  unitKey: 'g',
  unitWeight: '',
  cal: '300',
  protein: '10.6',
  carb: '54.2',
  fat: '5.2',
};

/* ── units ────────────────────────────────────────────────────────────────── */

test('the six units the design offers, in its order', () => {
  assert.deepEqual(
    FOOD_UNITS.map((u) => u.key),
    ['g', 'ml', 'oz', 'cup', 'tbsp', 'piece'],
  );
});

test('an ounce is the real 28.3495 g, not a round 28', () => {
  assert.equal(servingGrams('1', oz, ''), 28.35);
});

test('⚠ cup, tablespoon and piece have no weight anybody knows, so they ask', () => {
  assert.equal(unitNeedsWeight(g), false);
  assert.equal(unitNeedsWeight(unitByKey('ml')), false);
  assert.equal(unitNeedsWeight(oz), false);
  assert.equal(unitNeedsWeight(cup), true);
  assert.equal(unitNeedsWeight(unitByKey('tbsp')), true);
  assert.equal(unitNeedsWeight(piece), true);
});

test('a serving with no weight behind it cannot be weighed', () => {
  assert.equal(servingGrams('1', cup, ''), null);
  assert.equal(servingGrams('1', cup, '0'), null);
  assert.equal(servingGrams('2', cup, '120'), 240);
});

test('a zero or blank amount is never a serving', () => {
  assert.equal(servingGrams('', g, ''), null);
  assert.equal(servingGrams('0', g, ''), null);
});

test('an unknown unit key falls back to grams rather than throwing', () => {
  assert.equal(unitByKey('furlong').key, 'g');
});

/* ── the label, converted ─────────────────────────────────────────────────── */

test('a label states one serving; the catalogue stores per 100 g', () => {
  /* 300 cal in 80 g is 375 per 100 g — the figure USDA publishes for rolled oats. */
  assert.equal(perHundred('300', 80), 375);
  assert.equal(perHundred('10.6', 80), 13.25);
});

test('per-100 of nothing is 0, and a weightless serving cannot scale', () => {
  assert.equal(perHundred('', 80), 0);
  assert.equal(perHundred('300', 0), 0);
});

test('⚠ the round trip is what matters: label in, same label back out', () => {
  const grams = servingGrams('80', g, '');
  const food = {
    key: 'x',
    source: 'custom',
    name: 'Overnight oats',
    kcal100: perHundred('300', grams),
    protein100: perHundred('10.6', grams),
    carb100: perHundred('54.2', grams),
    fat100: perHundred('5.2', grams),
    servings: [labelServing('80', g, grams)],
  };
  const back = portionMacros(food, { serving: food.servings[0], quantity: 1 });
  assert.equal(back.kcal, 300);
  assert.equal(back.protein, 10.6);
  assert.equal(back.carb, 54.2);
  assert.equal(back.fat, 5.2);
});

test('⚠ and it round-trips for a unit that had to be weighed, which is the whole reason it asks', () => {
  const grams = servingGrams('1', cup, '240');
  const food = {
    key: 'x',
    source: 'custom',
    name: 'Milk',
    kcal100: perHundred('120', grams),
    protein100: perHundred('8', grams),
    carb100: perHundred('12', grams),
    fat100: perHundred('5', grams),
    servings: [labelServing('1', cup, grams)],
  };
  assert.equal(food.servings[0].label, '1 cup');
  const back = portionMacros(food, { serving: food.servings[0], quantity: 1 });
  assert.equal(back.kcal, 120);
  assert.equal(back.protein, 8);
});

test('a weight serving reads as itself; a named one keeps its word and pluralises', () => {
  assert.deepEqual(labelServing('80', g, 80), { label: '80 g', grams: 80 });
  assert.deepEqual(labelServing('1', piece, 30), { label: '1 piece', grams: 30 });
  assert.deepEqual(labelServing('2', piece, 60), { label: '2 pieces', grams: 60 });
});

/* ── calories vs macros ───────────────────────────────────────────────────── */

test('the Atwater figures: 4 a gram of protein and carbohydrate, 9 of fat', () => {
  assert.equal(caloriesFromMacros('10', '20', '5'), 165);
});

test('with no macros yet, it offers to do the arithmetic', () => {
  const r = checkCalories({ cal: '', protein: '', carb: '', fat: '' });
  assert.equal(r.helper, 'Leave calories blank to calculate from macros');
  assert.equal(r.warn, false);
  assert.equal(r.calories, 0);
});

test('blank calories are derived from the macros, and it says which number it will save', () => {
  const r = checkCalories({ cal: '', protein: '10', carb: '20', fat: '5' });
  assert.equal(r.calories, 165);
  assert.equal(r.helper, 'Will save as 165 cal from macros');
  assert.equal(r.warn, false);
  assert.equal(r.placeholder, '165');
});

test('calories that agree with the macros need no comment at all', () => {
  const r = checkCalories({ cal: '165', protein: '10', carb: '20', fat: '5' });
  assert.equal(r.helper, null);
  assert.equal(r.calories, 165);
});

test('rounding, fibre and sugar alcohols move it a few per cent — that is not a warning', () => {
  /* 180 vs 165 is 9%: under the 15% line, so it stays quiet. */
  const r = checkCalories({ cal: '180', protein: '10', carb: '20', fat: '5' });
  assert.equal(r.helper, null);
  assert.equal(r.warn, false);
});

test('⚠ a mis-keyed line is a disagreement, and it warns without blocking', () => {
  const r = checkCalories({ cal: '400', protein: '10', carb: '20', fat: '5' });
  assert.equal(r.helper, 'Macros add up to about 165 cal. Check the label.');
  assert.equal(r.warn, true);
  /* It still saves what was TYPED — the label is the athlete's to read, not ours to overrule. */
  assert.equal(r.calories, 400);
});

/* ── what may be saved ────────────────────────────────────────────────────── */

test('a name, a serving that can be weighed, and calories above zero', () => {
  assert.deepEqual(validateFood(base), { ok: true, reason: null });
});

test('no name, no food', () => {
  assert.equal(validateFood({ ...base, name: '   ' }).ok, false);
});

test('zero calories and no macros is not a food', () => {
  assert.equal(validateFood({ ...base, cal: '', protein: '', carb: '', fat: '' }).ok, false);
});

test('calories left blank are fine when the macros supply them', () => {
  assert.equal(validateFood({ ...base, cal: '' }).ok, true);
});

test('⚠ "1 piece" is refused UNTIL it is weighed, and the refusal says why', () => {
  const unweighed = validateFood({ ...base, unitKey: 'piece', amount: '1', unitWeight: '' });
  assert.equal(unweighed.ok, false);
  assert.match(unweighed.reason, /what one piece of this weighs/);
  assert.equal(validateFood({ ...base, unitKey: 'piece', amount: '1', unitWeight: '30' }).ok, true);
});

/* ── the extra nutrients ──────────────────────────────────────────────────── */

test('⚠ a blank box is OMITTED, never saved as a zero', () => {
  const out = extrasPerHundred({ fiber: '8', sugar: '', sodium: '0' }, 80);
  assert.deepEqual(Object.keys(out).sort(), ['fiber', 'sodium']);
  assert.equal(out.fiber, 10);
  /* A typed 0 IS a claim the label made, and it is kept. */
  assert.equal(out.sodium, 0);
});

test('a form with nothing filled in yields no micros at all, not an empty object', () => {
  assert.equal(extrasPerHundred({ fiber: '', sugar: '   ' }, 80), null);
  assert.equal(extrasPerHundred({}, 80), null);
});

test('only the nutrients the design actually asks for are read', () => {
  assert.equal(extrasPerHundred({ plutonium: '9' }, 80), null);
});
