/**
 * kitchen-allergen-redteam.test.mjs — Holt's Kitchen never shows a dish with an allergen the athlete avoids
 * (NUT-D6, Kitchen Scope §4: "enforced in code"). AI audit 2026-11-16, N-D1.
 *
 * The audit's probe put one hidden-allergen line through `dishCards` with that allergen avoided, and 11 of 14
 * were SHOWN (basil pesto, buttermilk, kefir, penne, naan, Worcestershire, sea bass, aioli, calamari, soybean
 * oil, creamer). Two layers now stand between a dish and the screen, and this file tests each on its own:
 *
 *   1. ANY unmatched line with an amount drops the dish once the athlete avoids anything (unknown = excluded).
 *   2. The word lists name the hidden foods — so a line the catalogue DID match (or a to-taste line, which has no
 *      amount and so isn't caught by layer 1) still drops the dish when its words give an allergen away.
 *
 * And the negatives: a dish the catalogue fully knows, with nothing avoided in it, is still shown.
 *
 * Run:  node --test --experimental-strip-types src/domain/nutrition/__tests__/kitchen-allergen-redteam.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { allergensByWord } from '../kitchen-dishes.ts';
import { dishCards } from '../kitchen-cards.ts';

/** Lines in the catalogue's own words — each matches, and none carries an allergen. */
const SAFE_LINES = [
  { text: '6 oz chicken thighs', quantity: 170, unit: 'g', food: 'chicken thighs' },
  { text: '3/4 cup long-grain white rice', quantity: 140, unit: 'g', food: 'long-grain white rice' },
  { text: '2 cups baby spinach', quantity: 60, unit: 'g', food: 'baby spinach' },
  { text: '1 tbsp olive oil', quantity: 14, unit: 'g', food: 'olive oil' },
  { text: 'salt to taste', quantity: null, unit: '', food: 'salt' },
];

const dish = (lines, over = {}) => ({
  name: 'Test Dish',
  why: '',
  cuisine: 'American',
  method: 'pan',
  minutes: 20,
  servings: 1,
  mealType: 'dinner',
  ingredients: lines,
  steps: ['Cook it.', 'Serve it.'],
  ...over,
});

const ALL = ['peanuts', 'tree_nuts', 'dairy', 'eggs', 'gluten', 'soy', 'fish', 'shellfish', 'sesame'];

/* ── the auditor's own probe, verbatim (scratchpad allergen-probe.mjs, 11-16) ─────────────────────────────── */

const PROBE = [
  ['basil pesto', 'tree_nuts'],
  ['buttermilk', 'dairy'],
  ['spaghetti', 'gluten'],
  ['penne', 'gluten'],
  ['ramen noodles', 'gluten'],
  ['naan', 'gluten'],
  ['worcestershire sauce', 'fish'],
  ['aioli', 'eggs'],
  ['calamari', 'shellfish'],
  ['kefir', 'dairy'],
  ['creamer', 'dairy'],
  ['soybean oil', 'soy'],
  ['sea bass', 'fish'],
  ['ghee', 'dairy'],
];
const probeDish = (food) => dish([{ text: `100 g ${food}`, quantity: 100, unit: 'g', food }], { name: 'T', why: '', cuisine: '', steps: ['a', 'b', 'c'], minutes: 10 });

test('⛔ the audit probe: 0 of 14 hidden-allergen foods reach an athlete avoiding them (was 11 of 14)', () => {
  const leaks = PROBE.filter(([food, allergen]) => dishCards([probeDish(food)], [allergen], null).length > 0);
  assert.deepEqual(leaks, []);
});

test('⛔ the audit probe, word layer alone: every one of the 14 is named by word', () => {
  for (const [food, allergen] of PROBE) assert.ok(allergensByWord(probeDish(food)).includes(allergen), `${food} → ${allergen}`);
});

/* ── the red team: allergen × the foods, sauces and dishes that hide it ───────────────────────────────────── */

const HIDDEN = [
  // peanuts
  ['satay sauce', 'peanuts'],
  ['groundnut oil', 'peanuts'],
  ['mixed nuts', 'peanuts'],
  ['trail mix', 'peanuts'],
  ['peanut butter', 'peanuts'],
  // tree nuts
  ['basil pesto', 'tree_nuts'],
  ['marzipan', 'tree_nuts'],
  ['praline paste', 'tree_nuts'],
  ['romesco sauce', 'tree_nuts'],
  ['dukkah', 'tree_nuts'],
  ['chestnuts', 'tree_nuts'],
  ['nut butter', 'tree_nuts'],
  ['granola', 'tree_nuts'],
  ['almond milk', 'tree_nuts'],
  // dairy
  ['buttermilk', 'dairy'],
  ['kefir', 'dairy'],
  ['coffee creamer', 'dairy'],
  ['crème fraîche', 'dairy'],
  ['half-and-half', 'dairy'],
  ['paneer', 'dairy'],
  ['casein protein powder', 'dairy'],
  ['mascarpone', 'dairy'],
  ['ranch dressing', 'dairy'],
  ['tzatziki', 'dairy'],
  ['alfredo sauce', 'dairy'],
  ['labneh', 'dairy'],
  ['basil pesto', 'dairy'],
  ['custard', 'dairy'],
  // eggs
  ['aioli', 'eggs'],
  ['mayonnaise', 'eggs'],
  ['meringue', 'eggs'],
  ['hollandaise sauce', 'eggs'],
  ['egg noodles', 'eggs'],
  ['tartar sauce', 'eggs'],
  ['caesar dressing', 'eggs'],
  ['carbonara sauce', 'eggs'],
  ['brioche bun', 'eggs'],
  // gluten
  ['penne', 'gluten'],
  ['naan', 'gluten'],
  ['couscous', 'gluten'],
  ['bulgur', 'gluten'],
  ['pearl barley', 'gluten'],
  ['rye bread', 'gluten'],
  ['farro', 'gluten'],
  ['spelt', 'gluten'],
  ['seitan', 'gluten'],
  ['panko', 'gluten'],
  ['breadcrumbs', 'gluten'],
  ['flatbread', 'gluten'],
  ['udon', 'gluten'],
  ['orzo', 'gluten'],
  ['gnocchi', 'gluten'],
  ['malt vinegar', 'gluten'],
  ['beer', 'gluten'],
  ['teriyaki sauce', 'gluten'],
  ['flour tortilla', 'gluten'],
  // soy
  ['soybean oil', 'soy'],
  ['soy milk', 'soy'],
  ['tofu', 'soy'],
  ['tempeh', 'soy'],
  ['edamame', 'soy'],
  ['white miso paste', 'soy'],
  ['soy sauce', 'soy'],
  ['tamari', 'soy'],
  ['soy lecithin', 'soy'],
  ['gochujang', 'soy'],
  ['ponzu', 'soy'],
  // fish
  ['worcestershire sauce', 'fish'],
  ['anchovy paste', 'fish'],
  ['fish sauce', 'fish'],
  ['sea bass', 'fish'],
  ['cod', 'fish'],
  ['salmon', 'fish'],
  ['canned tuna', 'fish'],
  ['tilapia', 'fish'],
  ['caesar dressing', 'fish'],
  ['dashi', 'fish'],
  ['bonito flakes', 'fish'],
  ['mahi-mahi', 'fish'],
  ['swordfish', 'fish'],
  // shellfish
  ['calamari', 'shellfish'],
  ['squid', 'shellfish'],
  ['shrimp paste', 'shellfish'],
  ['prawns', 'shellfish'],
  ['crabmeat', 'shellfish'],
  ['lobster', 'shellfish'],
  ['scallops', 'shellfish'],
  ['clams', 'shellfish'],
  ['mussels', 'shellfish'],
  ['oyster sauce', 'shellfish'],
  ['crawfish', 'shellfish'],
  ['frozen seafood mix', 'shellfish'],
  ['octopus', 'shellfish'],
  // sesame
  ['tahini', 'sesame'],
  ['hummus', 'sesame'],
  ["za'atar", 'sesame'],
  ['toasted sesame oil', 'sesame'],
  ['furikake', 'sesame'],
  ['halva', 'sesame'],
  ['everything bagel seasoning', 'sesame'],
  ['baba ganoush', 'sesame'],
];

test('the red team is big enough to mean something (≥ 40 cases, every allergen covered)', () => {
  assert.ok(HIDDEN.length >= 40, `${HIDDEN.length} cases`);
  for (const a of ALL) assert.ok(HIDDEN.filter(([, x]) => x === a).length >= 4, `${a} has fewer than 4 cases`);
});

test('⛔ layer 1 — a hidden-allergen line the catalogue can’t match drops the dish (every case)', () => {
  const shown = [];
  for (const [food, allergen] of HIDDEN) {
    const d = dish([...SAFE_LINES, { text: `2 tbsp ${food}`, quantity: 30, unit: 'g', food }]);
    if (dishCards([d], [allergen]).length) shown.push(`${food} (${allergen})`);
  }
  assert.deepEqual(shown, []);
});

test('⛔ layer 2 — the words alone name every hidden allergen', () => {
  const missed = [];
  for (const [food, allergen] of HIDDEN) {
    const d = dish([...SAFE_LINES, { text: `2 tbsp ${food}`, quantity: 30, unit: 'g', food }]);
    if (!allergensByWord(d).includes(allergen)) missed.push(`${food} (${allergen})`);
  }
  assert.deepEqual(missed, []);
});

test('⛔ layer 2 holds on a MATCHED line — the catalogue food is safe but the line’s words are not', () => {
  /* The model wrote the catalogue's "olive oil" as the food while the line itself says pesto (or buttermilk …):
     the line matches, carries no tag, and only the words can catch it. */
  const shown = [];
  for (const [food, allergen] of HIDDEN) {
    const d = dish([...SAFE_LINES, { text: `2 tbsp ${food}`, quantity: 28, unit: 'g', food: 'olive oil' }]);
    if (dishCards([d], [allergen]).length) shown.push(`${food} (${allergen})`);
  }
  assert.deepEqual(shown, []);
});

test('⛔ layer 2 holds on a to-taste line — no amount, so layer 1 lets it through, and the words still catch it', () => {
  const shown = [];
  for (const [food, allergen] of HIDDEN) {
    const d = dish([...SAFE_LINES, { text: `${food}, to taste`, quantity: null, unit: '', food }]);
    if (dishCards([d], [allergen]).length) shown.push(`${food} (${allergen})`);
  }
  assert.deepEqual(shown, []);
});

test('⛔ layer 1 alone — a food NO word list knows ("house sauce") drops the dish for anyone avoiding anything', () => {
  for (const food of ['house sauce', 'zzz paste', 'chef’s seasoning blend', 'store-bought dressing', 'mystery stock']) {
    const d = dish([...SAFE_LINES, { text: `2 tbsp ${food}`, quantity: 30, unit: 'g', food }]);
    assert.deepEqual(allergensByWord(d), [], `${food} carries no telltale word — only layer 1 can stop it`);
    for (const a of ALL) assert.equal(dishCards([d], [a]).length, 0, `${food} shown to someone avoiding ${a}`);
    assert.equal(dishCards([d], []).length, 1, `${food}: nothing avoided, so the "≈" card is still shown`);
  }
});

test('⛔ a catalogue food with no amount still drops the dish ("a splash of teriyaki")', () => {
  /* Teriyaki sauce is in the catalogue with soy and gluten. With no amount the line can't be weighed (so it is
     "unmatched" for the numbers), but the food is certain: its tags count, and so do its words. */
  const d = dish([...SAFE_LINES, { text: 'a splash of teriyaki sauce', quantity: null, unit: '', food: 'teriyaki sauce' }]);
  assert.equal(dishCards([d], ['soy']).length, 0);
  assert.equal(dishCards([d], ['gluten']).length, 0);
});

test('⛔ a diet is "avoiding something" too: an unmatched line drops the dish for a vegan, vegetarian or pescatarian', () => {
  const d = dish([...SAFE_LINES.filter((l) => l.food !== 'chicken thighs'), { text: '1 cup mystery stock', quantity: 240, unit: 'g', food: 'mystery stock' }]);
  for (const diet of ['vegan', 'vegetarian', 'pescatarian']) assert.equal(dishCards([d], [], diet).length, 0, diet);
  assert.equal(dishCards([d], [], 'anything').length, 1, 'no diet, no allergens: the "≈" card is still shown');
});

test('⛔ the widened diet words: Worcestershire and fish sauce are not vegetarian; gelatin and lard are not either', () => {
  for (const food of ['worcestershire sauce', 'fish sauce', 'gelatin', 'lard', 'bone broth', 'pancetta']) {
    const d = dish([...SAFE_LINES.filter((l) => l.food !== 'chicken thighs'), { text: `1 tbsp ${food}`, quantity: null, unit: '', food }]);
    assert.equal(dishCards([d], [], 'vegetarian').length, 0, food);
  }
  for (const food of ['kefir', 'buttermilk', 'aioli', 'honey', 'ghee']) {
    const d = dish([...SAFE_LINES.filter((l) => l.food !== 'chicken thighs'), { text: `1 tbsp ${food}`, quantity: null, unit: '', food }]);
    assert.equal(dishCards([d], [], 'vegan').length, 0, food);
  }
});

/* ── the negatives: what must still be shown ──────────────────────────────────────────────────────────────── */

test('a dish the catalogue fully knows, with nothing avoided in it, is shown — one allergen avoided or all nine', () => {
  const d = dish(SAFE_LINES);
  for (const a of ALL) assert.equal(dishCards([d], [a]).length, 1, a);
  assert.equal(dishCards([d], ALL).length, 1, 'all nine avoided');
  assert.equal(dishCards([d], ALL, 'pescatarian').length, 0, 'chicken is meat');
});

test('"salt to taste" and other no-amount lines don’t drop a dish (they never made a card "≈" either)', () => {
  const d = dish([...SAFE_LINES, { text: 'fresh basil, to garnish', quantity: null, unit: '', food: 'fresh basil' }]);
  assert.equal(dishCards([d], ['dairy', 'peanuts']).length, 1);
});

test('false friends are not allergens: butternut, nutmeg, eggplant, buckwheat, water chestnuts, coconut', () => {
  const words = (food) => allergensByWord(dish([{ text: `1 tbsp ${food}`, quantity: 10, unit: 'g', food }, SAFE_LINES[0]]));
  assert.deepEqual(words('butternut squash'), []);
  assert.deepEqual(words('nutmeg'), []);
  assert.deepEqual(words('nutritional yeast'), []);
  assert.deepEqual(words('eggplant'), []);
  assert.deepEqual(words('buckwheat groats'), []);
  assert.deepEqual(words('water chestnuts'), []);
  assert.deepEqual(words('chestnut mushrooms'), []);
  assert.deepEqual(words('shredded coconut'), []);
  assert.deepEqual(words('sunflower seeds'), []);
  assert.deepEqual(words('lettuce wraps'), []);
  assert.deepEqual(words('sweet potato'), []);
  assert.deepEqual(words('peanut butter'), ['peanuts'], 'a nut butter is its nut, not dairy');
});

test('matched catalogue foods that only LOOK like allergens are shown to the athletes they are safe for', () => {
  const squash = dish([...SAFE_LINES, { text: '1 cup butternut squash', quantity: 140, unit: 'g', food: 'butternut squash' }]);
  assert.equal(dishCards([squash], ['tree_nuts', 'dairy']).length, 1, 'butternut squash');
  const pb = dish([...SAFE_LINES, { text: '2 tbsp peanut butter', quantity: 32, unit: 'g', food: 'peanut butter' }]);
  assert.equal(dishCards([pb], ['dairy', 'tree_nuts']).length, 1, 'peanut butter for a dairy / tree-nut allergy');
  assert.equal(dishCards([pb], ['peanuts']).length, 0, '…and never for a peanut allergy');
  const salmon = dish([...SAFE_LINES, { text: '6 oz salmon fillet', quantity: 170, unit: 'g', food: 'salmon fillet' }]);
  assert.equal(dishCards([salmon], ['shellfish', 'peanuts', 'gluten']).length, 1, 'salmon is not shellfish');
  assert.equal(dishCards([salmon], ['fish']).length, 0);
});
