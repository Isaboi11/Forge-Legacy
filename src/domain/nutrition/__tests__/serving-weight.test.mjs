// node --experimental-strip-types --test src/domain/nutrition/__tests__/serving-weight.test.mjs
//
// NU-2 / AI audit 11-16 N-D6. food-search dropped every FatSecret food with no weighed serving — about half of
// restaurant items (Costa Vida's "Tomatillo Ranch Dressing - 2 oz"). The weight is read from the serving text, or
// from the end of the name for a bare "1 serving"; never invented. The parser lives twice (the Deno function has no
// bundle builder), so this file also proves the two copies are the same bytes, and runs the copy lifted out of the
// function itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

import * as domain from '../serving-weight.ts';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const BEGIN = '// ── SERVING WEIGHT: begin';
const END = '// ── SERVING WEIGHT: end';
const block = (src) => {
  const b = src.indexOf(BEGIN);
  const e = src.indexOf(END);
  assert.ok(b >= 0 && e > b, 'both SERVING WEIGHT markers present');
  assert.equal(src.indexOf(BEGIN, b + 1), -1, 'one begin marker');
  return src.slice(b, e);
};
const FN_SRC = read('../../../../supabase/functions/food-search/index.ts');
const DOMAIN_SRC = read('../serving-weight.ts');
const lifted = await import(
  `data:text/javascript;base64,${Buffer.from(
    `${stripTypeScriptTypes(block(FN_SRC))}\nexport { foodNameGrams, fsServingGrams, servingTextGrams };`,
  ).toString('base64')}`
);

test('⛔ the parser in food-search/index.ts is byte-for-byte the one in src/domain/nutrition/serving-weight.ts', () => {
  assert.equal(block(FN_SRC), block(DOMAIN_SRC));
});

test('fsFood weighs every serving through the shared parser (no second, private weight rule)', () => {
  const fsFood = FN_SRC.slice(FN_SRC.indexOf('function fsFood('), FN_SRC.indexOf('\n}\n', FN_SRC.indexOf('function fsFood(')));
  assert.match(fsFood, /fsServingGrams\(s, food\.food_name\)/);
  assert.doesNotMatch(fsFood, /metric_serving_amount/);
});

const OZ = 28.3495;
const close = (actual, expected) => assert.ok(actual != null && Math.abs(actual - expected) < 0.05, `${actual} ≈ ${expected}`);

for (const [name, lib] of [['domain copy', domain], ['copy lifted out of the function', lifted]]) {
  test(`${name}: the weighed amount still comes first`, () => {
    assert.equal(lib.fsServingGrams({ metric_serving_amount: '85.000', metric_serving_unit: 'g', serving_description: '2 oz' }, 'X - 4 oz'), 85);
    close(lib.fsServingGrams({ metric_serving_amount: '2', metric_serving_unit: 'oz' }, ''), 2 * OZ);
    assert.equal(lib.fsServingGrams({ metric_serving_amount: '240', metric_serving_unit: 'ml' }, ''), 240);
  });

  test(`${name}: Costa Vida's dressing — a bare "1 serving" weighed from the end of the name`, () => {
    const serving = { serving_description: '1 serving', calories: '170', fat: '17', carbohydrate: '3', protein: '1' };
    close(lib.fsServingGrams(serving, 'Tomatillo Ranch Dressing - 2 oz'), 2 * OZ);
    close(lib.fsServingGrams({ serving_description: 'serving' }, 'Kids Burrito (8 oz)'), 8 * OZ);
    close(lib.fsServingGrams({}, 'Chips & Salsa, 85 g'), 85);
  });

  test(`${name}: the serving's own text — "2 oz", "2 fl oz", "85 g", "1 cup (240 ml)"`, () => {
    close(lib.fsServingGrams({ serving_description: '2 oz' }, 'Dressing'), 2 * OZ);
    close(lib.fsServingGrams({ serving_description: '2 fl oz' }, 'Dressing'), 2 * 29.5735);
    close(lib.fsServingGrams({ serving_description: '2 fl. oz.' }, 'Dressing'), 2 * 29.5735);
    assert.equal(lib.fsServingGrams({ serving_description: '85 g' }, 'Chicken'), 85);
    assert.equal(lib.fsServingGrams({ serving_description: '1 cup (240 ml)' }, 'Horchata'), 240);
    assert.equal(lib.fsServingGrams({ serving_description: '1 serving (85g)' }, 'Chicken'), 85);
    close(lib.fsServingGrams({ serving_description: '1 1/2 oz' }, 'Salsa'), 1.5 * OZ);
    close(lib.fsServingGrams({ serving_description: '1/2 lb' }, 'Pork'), 226.796);
    close(lib.fsServingGrams({ serving_description: '1 bottle (12-oz)' }, 'Soda'), 12 * OZ);
    // Metric wins over ounces written next to it.
    assert.equal(lib.fsServingGrams({ serving_description: '1 cup (8 fl oz / 240 ml)' }, 'Milk'), 240);
    // The serving's text beats the name.
    close(lib.fsServingGrams({ serving_description: '1 serving (3 oz)' }, 'Salmon - 6 oz'), 3 * OZ);
  });

  test(`${name}: ⛔ never invents a weight`, () => {
    // Nothing anywhere — still dropped.
    assert.equal(lib.fsServingGrams({ serving_description: '1 serving' }, 'Tomatillo Ranch Dressing'), null);
    assert.equal(lib.fsServingGrams({}, ''), null);
    // A named serving ("1 taco") never borrows the name's weight — the name may weigh three of them.
    assert.equal(lib.fsServingGrams({ serving_description: '1 taco' }, 'Street Tacos - 6 oz'), null);
    // A weight in the MIDDLE of the name weighs part of the dish.
    assert.equal(lib.fsServingGrams({ serving_description: '1 serving' }, 'Salad with 2 oz Dressing'), null);
    // Two different weights in one name — which one?
    assert.equal(lib.fsServingGrams({ serving_description: '1 serving' }, 'Burrito 12 oz - 4 oz Side'), null);
    // "each" / "per" / "2 x 4 oz" weigh something other than this serving.
    assert.equal(lib.fsServingGrams({ serving_description: '2 tacos (85 g each)' }, 'Tacos'), null);
    assert.equal(lib.fsServingGrams({ serving_description: '1 serving' }, 'Wings - 2 oz per wing'), null);
    assert.equal(lib.fsServingGrams({ serving_description: '2 x 4 oz' }, 'Patties'), null);
    // Two different metric weights in one serving text.
    assert.equal(lib.fsServingGrams({ serving_description: '1 bowl (300 g) with tortilla (40 g)' }, 'Bowl'), null);
    // Not units: "2 large", "6 inch", "3 grilled".
    assert.equal(lib.fsServingGrams({ serving_description: '2 large' }, 'Eggs'), null);
    assert.equal(lib.fsServingGrams({ serving_description: '1 serving' }, 'Sub - 6 inch'), null);
    assert.equal(lib.fsServingGrams({ serving_description: '3 grilled' }, 'Shrimp'), null);
    // A zero or junk weighed amount is not a weight; with nothing else said, still null.
    assert.equal(lib.fsServingGrams({ metric_serving_amount: '0', serving_description: '1 serving' }, 'Thing'), null);
    assert.equal(lib.fsServingGrams({ metric_serving_amount: '', serving_description: '1 serving' }, 'Thing'), null);
  });

  test(`${name}: the two readers on their own`, () => {
    close(lib.servingTextGrams('2 oz'), 2 * OZ);
    assert.equal(lib.servingTextGrams(''), null);
    close(lib.foodNameGrams('Tomatillo Ranch Dressing - 2 oz'), 2 * OZ);
    assert.equal(lib.foodNameGrams('2 oz Pour'), null);
  });
}
