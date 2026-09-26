import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MEAL_READ_SCHEMA,
  mealPhotoError,
  mealPhotoResultFrom,
  readFromModelText,
  sanitizeMealRead,
} from '../meal-photo-read.ts';
import {
  entriesFrom,
  gramsServing,
  initialPortion,
  loggable,
  matchScore,
  mealTotals,
  pickMatch,
  readToast,
  rowFromHits,
  rowMacros,
  unmatchedNote,
  withFood,
  withPortion,
} from '../meal-photo-match.ts';
import { portionMacros } from '../serving.ts';

/*
 * PHOTO FOOD LOGGING — the domain half. The Edge Function looks at the plate; these hold what the app does
 * with the answer: NUT-D4 (no nutrition number the model wrote survives — every calorie is database food ×
 * portion), never a loose match (an unmatched item has no calories and is not logged), and the portion.
 *
 * ⚠ The fixture is HAND-BUILT in the schema's shape, not a live read — live reads cost money
 * (`feedback_live_ai_tests_spend_real_money`). When the first real read comes back, add it here.
 */

const MODEL_ANSWER = {
  isFood: true,
  items: [
    { name: 'Grilled chicken breast', search: 'chicken breast grilled', amount: 1, unit: 'piece', grams: 170, confidence: 'high', calories: 280 },
    { name: 'White rice', search: 'rice white cooked', amount: 1, unit: 'cup', grams: 180, confidence: 'high', protein: 4 },
    { name: 'Steamed broccoli', search: 'broccoli steamed', amount: null, unit: '', grams: 90, confidence: 'medium' },
    { name: 'Mystery sauce', search: 'sauce', amount: 2, unit: 'tbsp', grams: 30, confidence: 'low' },
  ],
  nutrition: { kcal: 650 },
  totalCalories: 650,
};

const food = (over) => ({
  key: 'usda:1',
  source: 'usda',
  name: 'Food',
  brand: null,
  kcal100: 100,
  protein100: 10,
  carb100: 10,
  fat100: 2,
  servings: [],
  micros: { fiber: 2 },
  attribution: null,
  ...over,
});

const CHICKEN = food({ key: 'usda:chicken', name: 'Chicken, broilers or fryers, breast, meat only, cooked, grilled', kcal100: 165, protein100: 31, carb100: 0, fat100: 3.6, servings: [{ label: '1 breast', grams: 172 }] });
const RICE = food({ key: 'usda:rice', name: 'Rice, white, long-grain, regular, cooked', kcal100: 130, protein100: 2.7, carb100: 28, fat100: 0.3, servings: [{ label: '1 cup', grams: 158 }] });
const RICE_TREAT = food({ key: 'off:krispies', source: 'off', name: 'Rice Krispies Treats', brand: 'Kellogg', kcal100: 410, protein100: 3, carb100: 80, fat100: 10, servings: [] });
const BROCCOLI = food({ key: 'fs:broc', source: 'fs', name: 'Broccoli (steamed)', kcal100: 35, protein100: 2.4, carb100: 7, fat100: 0.4, servings: [{ label: '1 cup', grams: 156 }], micros: { vitc: 60 } });
const BROKEN = food({ key: 'usda:bad', name: 'Rice white cooked', kcal100: 1300, protein100: 2.7, carb100: 28, fat100: 0.3 });

/* ── ⛔ NUT-D4: the model's numbers never survive ───────────────────────── */

test('⛔ the schema has no field that can carry a nutrition number', () => {
  const text = JSON.stringify(MEAL_READ_SCHEMA).toLowerCase();
  for (const word of ['calor', 'kcal', 'protein', 'carb', 'fat', 'sugar', 'sodium', 'macro', 'nutri', 'energy']) {
    assert.ok(!text.includes(word), `schema mentions ${word}`);
  }
  assert.equal(MEAL_READ_SCHEMA.additionalProperties, false);
  assert.equal(MEAL_READ_SCHEMA.properties.items.items.additionalProperties, false);
});

test('⛔ the guard copies only whitelisted fields — calories, protein and totals are dropped', () => {
  const read = sanitizeMealRead(MODEL_ANSWER);
  assert.ok(read);
  assert.deepEqual(Object.keys(read), ['items']);
  for (const item of read.items) {
    assert.deepEqual(Object.keys(item).sort(), ['amount', 'confidence', 'grams', 'name', 'search', 'unit']);
  }
  assert.ok(!JSON.stringify(read).includes('650'));
  assert.ok(!JSON.stringify(read).includes('280'));
});

test('the guard clamps and cleans: silly grams, bad confidence, blank items, too many items', () => {
  const read = sanitizeMealRead({
    isFood: true,
    items: [
      { name: '  Pizza   slice ', search: '', amount: 2, unit: 'slice', grams: 99999, confidence: 'certain' },
      { name: '', search: '', amount: 1, unit: '', grams: 10, confidence: 'high' },
      { name: 'Apple', search: 'apple', amount: -1, unit: 'medium', grams: 182.4, confidence: 'high' },
      ...Array.from({ length: 20 }, (_, i) => ({ name: `Item ${i}`, search: `item ${i}`, amount: 1, unit: '', grams: 10, confidence: 'high' })),
    ],
  });
  assert.equal(read.items.length, 12);
  assert.deepEqual(read.items[0], { name: 'Pizza slice', search: 'Pizza slice', amount: 2, unit: 'slice', grams: null, confidence: 'low' });
  assert.equal(read.items[1].name, 'Apple');
  assert.equal(read.items[1].amount, null);
  assert.equal(read.items[1].grams, 182);
});

test('the model’s abstain is not_food; junk is unreadable; an empty plate is unreadable', () => {
  assert.deepEqual(readFromModelText('{"isFood": false, "items": []}'), { ok: false, reason: 'not_food' });
  assert.deepEqual(readFromModelText('not json'), { ok: false, reason: 'unreadable' });
  assert.deepEqual(readFromModelText('{"isFood": true, "items": []}'), { ok: false, reason: 'unreadable' });
  const ok = readFromModelText(JSON.stringify(MODEL_ANSWER));
  assert.equal(ok.ok, true);
  assert.equal(ok.read.items.length, 4);
});

test('the device re-guards the wire and names every failure without blaming the photo for an outage', () => {
  const ok = mealPhotoResultFrom({ ok: true, read: MODEL_ANSWER, remaining: 40 });
  assert.equal(ok.kind, 'ok');
  assert.equal(ok.remaining, 40);
  assert.ok(!JSON.stringify(ok).includes('650'));
  assert.equal(mealPhotoResultFrom({ ok: true, read: { isFood: true, items: [] } }).kind, 'unreadable');
  assert.equal(mealPhotoResultFrom({ ok: false, reason: 'not_food' }).kind, 'not_food');
  assert.equal(mealPhotoResultFrom({ ok: false, reason: 'no_nutrition' }).kind, 'no_nutrition');
  assert.equal(mealPhotoResultFrom({ ok: false, reason: 'out_of_credits', remaining: 0, allowance: 0 }).kind, 'not_entitled');
  assert.deepEqual(mealPhotoResultFrom({ ok: false, reason: 'out_of_credits', remaining: 1, allowance: 75 }), { kind: 'out_of_credits', remaining: 1, allowance: 75 });
  assert.equal(mealPhotoResultFrom({ ok: false, reason: 'bad_request' }).kind, 'unsupported_format');
  assert.equal(mealPhotoResultFrom({ ok: false, reason: 'meter_unavailable' }).kind, 'unavailable');
  assert.equal(mealPhotoResultFrom(null).kind, 'unavailable');
  assert.match(mealPhotoError({ kind: 'unavailable' }), /isn’t working right now/);
  assert.doesNotMatch(mealPhotoError({ kind: 'unavailable' }), /photo from above|couldn’t make out/i);
  assert.match(mealPhotoError({ kind: 'offline' }), /connection/);
  assert.match(mealPhotoError({ kind: 'out_of_credits', remaining: 0, allowance: 75 }), /search for the food/);
});

/* ── ⛔ never a loose match ─────────────────────────────────────────────── */

test('a hit must name the same food — "rice" never becomes Rice Krispies Treats over a real rice', () => {
  const item = { name: 'White rice', search: 'rice white cooked' };
  assert.ok(matchScore(item, RICE) > matchScore(item, RICE_TREAT));
  assert.equal(pickMatch(item, [RICE_TREAT, RICE]).food.key, 'usda:rice');
});

test('a hit that is another dish made from the item is never auto-picked (PO eval 2026-09-26)', () => {
  const dressing = food({ key: 'fs:cd', source: 'fs', name: 'Coleslaw Salad Dressing', kcal100: 387, protein100: 1, carb100: 22, fat100: 33 });
  assert.equal(matchScore({ name: 'coleslaw salad', search: 'coleslaw slaw salad' }, dressing), -1);
  const combo = food({ key: 'fs:pm', source: 'fs', name: 'Penne Pasta & Meatballs with Tomato Sauce', brand: 'On-Cor', kcal100: 133, protein100: 6, carb100: 17, fat100: 4.5 });
  assert.equal(matchScore({ name: 'penne pasta with tomato sauce', search: 'penne pasta tomato sauce' }, combo), -1);
  const salsa = food({ key: 'fs:cs', source: 'fs', name: 'Fresh Cilantro Salsa', kcal100: 30, protein100: 1, carb100: 6, fat100: 0.2 });
  const r = pickMatch({ name: 'cilantro garnish', search: 'cilantro fresh' }, [salsa]);
  assert.equal(r.food, null);
  assert.deepEqual(r.candidates.map((f) => f.key), ['fs:cs']);
  // …but a sauce the item asked for is still a sauce.
  const bbq = food({ key: 'fs:bbq', source: 'fs', name: 'BBQ Sauce', kcal100: 170, protein100: 1, carb100: 40, fat100: 0.6 });
  assert.ok(matchScore({ name: 'dipping sauce', search: 'bbq sauce' }, bbq) > 0);
});

test('no hit that names the food → no match, and the hits are offered as choices only', () => {
  const item = { name: 'Harissa', search: 'harissa' };
  const r = pickMatch(item, [RICE, CHICKEN]);
  assert.equal(r.food, null);
  assert.deepEqual(r.candidates.map((f) => f.key), ['usda:rice', 'usda:chicken']);
});

test('a two-word item needs both words; a longer one two thirds (PO photo eval 2026-09-26)', () => {
  const veggie = food({ key: 'usda:veg', name: 'Veggie burger, on bun', kcal100: 224, protein100: 12.8, carb100: 30.8, fat100: 5.2 });
  assert.equal(matchScore({ name: 'burger', search: 'beef burger' }, veggie), -1);
  const beans = food({ key: 'usda:beans', name: 'Beans, baked, canned, with pork and tomato sauce', kcal100: 94, protein100: 5.2, carb100: 18.8, fat100: 0.9 });
  assert.equal(matchScore({ name: 'baked gnocchi', search: 'gnocchi baked tomato sauce mozzarella' }, beans), -1);
  const limeRaw = food({ key: 'usda:lime', name: 'Lime, raw', kcal100: 30, protein100: 0.7, carb100: 7, fat100: 0.2 });
  const souffle = food({ key: 'usda:souffle', name: 'Lime souffle', kcal100: 326, protein100: 4, carb100: 40, fat100: 16 });
  assert.equal(pickMatch({ name: 'lime wedge', search: 'lime' }, [souffle, limeRaw]).food?.key, 'usda:lime');

  assert.equal(matchScore({ name: 'Chicken caesar wrap', search: 'chicken caesar wrap' }, CHICKEN), -1);
  assert.ok(matchScore({ name: 'Grilled chicken breast', search: 'chicken breast grilled' }, CHICKEN) > 0);
});

test('an insane record (energy ≠ macros) is never matched or offered', () => {
  const r = pickMatch({ name: 'White rice', search: 'rice white cooked' }, [BROKEN]);
  assert.equal(r.food, null);
  assert.equal(r.candidates.length, 0);
});

/* ── the portion ────────────────────────────────────────────────────────── */

test('the model’s unit becomes the food’s own serving when the weights agree', () => {
  const p = initialPortion(RICE, { amount: 1, unit: 'cup', grams: 180 });
  assert.equal(p.serving.label, '1 cup');
  assert.equal(p.quantity, 1);
  const two = initialPortion(RICE, { amount: 1.5, unit: 'cups', grams: 250 });
  assert.equal(two.serving.label, '1 cup');
  assert.equal(two.quantity, 1.5);
});

test('a unit the food lacks, or weights that disagree, fall back to the grams estimate', () => {
  assert.deepEqual(initialPortion(RICE, { amount: 2, unit: 'tbsp', grams: 30 }), { serving: { label: '30 g', grams: 30 }, quantity: 1 });
  // "1 cup" of rice is 158 g; 600 g is not a cup — trust the weight.
  assert.deepEqual(initialPortion(RICE, { amount: 1, unit: 'cup', grams: 600 }), { serving: { label: '600 g', grams: 600 }, quantity: 1 });
  assert.deepEqual(initialPortion(RICE, { amount: 120, unit: 'g', grams: null }), { serving: { label: '120 g', grams: 120 }, quantity: 1 });
});

test('no estimate at all → the food’s default weighed serving; no weight anywhere → null, never a zero', () => {
  assert.equal(initialPortion(RICE, { amount: null, unit: '', grams: null }).serving.label, '1 cup');
  assert.equal(initialPortion(RICE, null).serving.label, '1 cup');
  const unweighed = food({ servings: [{ label: '1 bar', grams: null }] });
  // servingOptions always adds "100 g", so even this has a weighed fallback — never a zero-calorie row.
  assert.equal(initialPortion(unweighed, null).serving.grams, 100);
});

test('gramsServing rounds and never goes below a gram', () => {
  assert.deepEqual(gramsServing(172.6), { label: '173 g', grams: 173 });
  assert.deepEqual(gramsServing(0.2), { label: '1 g', grams: 1 });
});

/* ── the rows, the totals, the log ──────────────────────────────────────── */

const READ = sanitizeMealRead(MODEL_ANSWER);
const ROWS = [
  rowFromHits('p0', READ.items[0], [CHICKEN]),
  rowFromHits('p1', READ.items[1], [RICE_TREAT, RICE]),
  rowFromHits('p2', READ.items[2], [BROCCOLI]),
  rowFromHits('p3', READ.items[3], [RICE, CHICKEN]),
];

test('⛔ every calorie on a row is database food × portion — the model’s 280 appears nowhere', () => {
  const chicken = ROWS[0];
  assert.equal(chicken.food.key, 'usda:chicken');
  assert.equal(chicken.estimated, true);
  assert.deepEqual(rowMacros(chicken), portionMacros(CHICKEN, chicken.portion));
  assert.notEqual(rowMacros(chicken).kcal, 280);
});

test('an unmatched row has no calories, is not loggable, and is named in the note', () => {
  const sauce = ROWS[3];
  assert.equal(sauce.food, null);
  assert.equal(loggable(sauce), false);
  assert.equal(rowMacros(sauce).kcal, 0);
  assert.equal(unmatchedNote(ROWS), '1 item isn’t matched yet and won’t be logged. Tap to pick a food, or remove.');
  assert.equal(readToast(ROWS), 'Matched 3 of 4. Pick a food for the rest, or remove them.');
});

test('the totals add only loggable rows', () => {
  const t = mealTotals(ROWS);
  const expected = [ROWS[0], ROWS[1], ROWS[2]].reduce((a, r) => a + rowMacros(r).kcal, 0);
  assert.equal(t.kcal, Math.round(expected));
});

test('a swap takes the new food with the photo’s estimate; a set portion is no longer "estimated"', () => {
  const swapped = withFood(ROWS[3], CHICKEN);
  assert.equal(swapped.food.key, 'usda:chicken');
  assert.deepEqual(swapped.portion, { serving: { label: '30 g', grams: 30 }, quantity: 1 });
  assert.equal(swapped.estimated, true);
  const set = withPortion(swapped, { serving: { label: '1 breast', grams: 172 }, quantity: 1 });
  assert.equal(set.estimated, false);
  assert.equal(rowMacros(set).kcal, portionMacros(CHICKEN, set.portion).kcal);
});

test('entries are the diary’s shape; unmatched rows are left out; FatSecret keeps no micros', () => {
  const entries = entriesFrom(ROWS, 'dinner');
  assert.equal(entries.length, 3);
  for (const e of entries) {
    assert.equal(e.meal, 'dinner');
    assert.ok(e.sourceKey);
    assert.ok(e.servingLabel);
    assert.ok(e.macros.grams > 0);
  }
  assert.deepEqual(entries[0].micros, { fiber: 2 });
  assert.equal(entries.find((e) => e.source === 'fs').micros, null, '§4: FatSecret permits calories and macros only');
  assert.equal(entries[1].name, RICE.name, 'the diary gets the database food’s name, not the model’s words');
});
