/**
 * kitchen-dishes.test.mjs — Holt's Kitchen (`Docs/Holt-Kitchen-Scope-v1.0.md`): the guard on the model's answer,
 * the app's numbers, the allergen drop, and the function/paste-copy wiring.
 *
 * Run:  node --test --experimental-strip-types src/domain/nutrition/__tests__/kitchen-dishes.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  KITCHEN_SCHEMA,
  isMakeRequest,
  kitchenFromModelText,
  kitchenResultFrom,
  kitchenUserTurn,
  narrowKitchenRequest,
  sanitizeKitchenAnswer,
  allergensByWord,
  withSafeTemps,
} from '../kitchen-dishes.ts';
import { dishCards, dishLine, dietAvoid } from '../kitchen-cards.ts';
import { buildCoachKitchenDeploy, DEPLOY_COPY } from '../../../../scripts/build-coach-kitchen-deploy.mjs';

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

const dish = (over = {}) => ({
  name: 'Greek Chicken Rice Bowl',
  why: 'uses the most of what you have',
  cuisine: 'Greek',
  method: 'bowl',
  minutes: 25,
  servings: 1,
  mealType: 'dinner',
  ingredients: [
    { text: '6 oz chicken thighs', quantity: 6, unit: 'oz', food: 'chicken thighs' },
    { text: '1 cup cooked white rice', quantity: 1, unit: 'cup', food: 'white rice' },
    { text: '1 cup spinach', quantity: 1, unit: 'cup', food: 'spinach' },
  ],
  steps: ['Sear the chicken.', 'Serve over rice and spinach.'],
  ...over,
});

test('⛔ NUT-D4: the schema has no field that can carry a nutrition number', () => {
  const s = JSON.stringify(KITCHEN_SCHEMA).toLowerCase();
  for (const w of ['calorie', 'kcal', 'protein', 'carb', '"fat"', 'macro', 'nutrition']) assert.ok(!s.includes(w), w);
});

test('the guard copies only whitelisted fields, and strips numbers out of "why"', () => {
  const [d] = sanitizeKitchenAnswer({ options: [{ ...dish(), calories: 640, protein: 52, why: 'closest to your 52g protein and 640 kcal' }] });
  assert.equal(d.calories, undefined);
  assert.equal(d.protein, undefined);
  assert.doesNotMatch(d.why, /\d/);
});

test('forced spread: a repeated method is dropped; an already-suggested name is dropped', () => {
  const out = sanitizeKitchenAnswer(
    { options: [dish(), dish({ name: 'Chicken Burrito Bowl' }), dish({ name: 'Sheet Pan Chicken', method: 'oven' })] },
    ['Old Dish'],
  );
  // Spread first (the oven dish is second); the repeated method fills the third slot rather than leaving two.
  assert.deepEqual(out.map((d) => d.name), ['Greek Chicken Rice Bowl', 'Sheet Pan Chicken', 'Chicken Burrito Bowl']);
  assert.equal(sanitizeKitchenAnswer({ options: [dish()] }, ['greek chicken rice bowl']).length, 0);
});

test('amounts no one cooks are dropped (Kitchen Scope §3.5)', () => {
  const [d] = sanitizeKitchenAnswer({ options: [dish({ ingredients: [...dish().ingredients, { text: '2 kg olive oil', quantity: 2, unit: 'kg', food: 'olive oil' }] })] });
  assert.ok(!d.ingredients.some((i) => i.food === 'olive oil'));
});

test('food safety: a USDA temperature is added when meat, poultry, fish or eggs are cooked and no step has one', () => {
  const d = withSafeTemps(dish());
  assert.ok(d.steps.some((s) => /165°F/.test(s)));
  const already = withSafeTemps(dish({ steps: ['Cook to 165°F.'] }));
  assert.equal(already.steps.length, 1);
  const canned = withSafeTemps(dish({ ingredients: [{ text: '1 can tuna', quantity: 1, unit: 'can', food: 'canned tuna' }, { text: 'bread', quantity: 2, unit: 'slices', food: 'bread' }] }));
  assert.ok(!canned.steps.some((s) => /°F/.test(s)));
});

test('bad model text yields nothing, never a throw', () => {
  assert.deepEqual(kitchenFromModelText('not json'), []);
  assert.deepEqual(kitchenFromModelText('{"options": "x"}'), []);
});

test('the request is narrowed; the user turn carries the rules and never a lecture', () => {
  const r = narrowKitchenRequest({ have: Array(50).fill('rice'), ask: 'x'.repeat(900), avoid: ['peanuts'], nudge: 'bogus', minor: true, left: '980 kcal left' });
  assert.equal(r.have.length, 30);
  assert.equal(r.ask.length, 300);
  assert.equal(r.nudge, null);
  const turn = kitchenUserTurn({ ...r, ask: 'something spicy' });
  assert.match(turn, /never use, in any form: peanuts \(peanuts, peanut butter/);
  // An avoided food is never sent as "on hand" (live check 09-26: shrimp on hand + shellfish allergy → a shrimp dish).
  const safe = kitchenUserTurn(narrowKitchenRequest({ have: ['shrimp', 'salmon', 'chicken breast', 'tofu'], avoid: ['shellfish', 'soy', 'poultry'] }));
  assert.match(safe, /On hand: salmon\./);
  assert.doesNotMatch(turn, /980/, 'under 18: no numbers steering (NUT-D5)');
});

test('what counts as "what can I make?"', () => {
  for (const t of ['What can I make with chicken and rice?', 'I have eggs, feta and onions', 'chicken rice spinach', 'dinner ideas', 'something quick', "I've got leftovers", 'black beans and rice i guess']) {
    assert.equal(isMakeRequest(t), true, t);
  }
  for (const t of ['how much protein is in chicken?', 'set my macros', 'save this recipe', 'plan my week', 'is rice bad', 'thanks']) {
    assert.equal(isMakeRequest(t), false, t);
  }
});

test('⛔ NUT-D6: a dish naming an avoided allergen is dropped, by catalogue tag or by word', () => {
  const peanut = dish({ name: 'Peanut Noodles', method: 'pan', ingredients: [{ text: '2 tbsp peanut butter', quantity: 2, unit: 'tbsp', food: 'peanut butter' }, { text: '4 oz noodles', quantity: 4, unit: 'oz', food: 'noodles' }] });
  assert.deepEqual(allergensByWord(peanut).sort(), ['gluten', 'peanuts']);
  const cards = dishCards([dish(), peanut], ['peanuts']);
  assert.deepEqual(cards.map((c) => c.name), ['Greek Chicken Rice Bowl']);
});

test('the numbers are the catalogue\'s, per serving, and "≈" when a line did not match', () => {
  const [c] = dishCards([dish()], []);
  assert.ok(c.kcal > 0 && c.protein > 0);
  const [two] = dishCards([dish({ servings: 2 })], []);
  assert.ok(Math.abs(two.kcal * 2 - c.kcal) <= 1);
  const [odd] = dishCards([dish({ ingredients: [...dish().ingredients, { text: '1 tbsp harissa', quantity: 1, unit: 'tbsp', food: 'harissa paste xyz' }] })], []);
  assert.ok(odd.unmatched >= 1);
  assert.match(dishLine(odd, true), /≈/);
  assert.doesNotMatch(dishLine(c, false), /cal/, 'under 18 the card carries no calories');
});

test('diets become foods to avoid', () => {
  assert.deepEqual(dietAvoid('pescatarian'), ['meat', 'poultry']);
  assert.deepEqual(dietAvoid('anything'), []);
});

test('the wire: stops, credits and entitlement read right', () => {
  assert.deepEqual(kitchenResultFrom({ ok: false, reason: 'stop', route: 'care' }), { kind: 'stop', route: 'care' });
  assert.deepEqual(kitchenResultFrom({ ok: false, reason: 'out_of_credits', allowance: 0 }), { kind: 'not_entitled' });
  assert.equal(kitchenResultFrom({ ok: true, options: [] }).kind, 'none');
  assert.equal(kitchenResultFrom(null).kind, 'unavailable');
});

test('the function guards the athlete\'s words BEFORE the credit, and the paste copy is current', () => {
  const SRC = read('supabase/functions/coach-kitchen/index.ts');
  const guard = SRC.indexOf('medicalRoute(`');
  const spend = SRC.indexOf("rpc('coach_ai_spend_credits'");
  assert.ok(guard > 0 && spend > guard, 'medicalRoute runs before the credit is reserved');
  assert.ok(SRC.indexOf("rpc('has_nutrition_access')") < spend);
  assert.match(SRC, /'Access-Control-Allow-Origin': '\*'/);
  assert.match(SRC, /if \(req\.method === 'OPTIONS'\)/);
  const copy = read(DEPLOY_COPY);
  assert.equal(copy, buildCoachKitchenDeploy(), 'run `node scripts/build-coach-kitchen-deploy.mjs`');
  assert.ok(!copy.includes("from '../../../src/"));
  assert.ok(copy.includes('export function medicalRoute') && copy.includes('export function sanitizeKitchenAnswer'));
  assert.ok(copy.length < 100_000);
  assert.match(copy.split('\n')[0], /^[\x20-\x7e]*$/, 'line 1 is plain ASCII (386507dd)');
});

test('0222 prices `kitchen` and the bundle carries it', () => {
  const m = read('supabase/migrations/0222_holt_kitchen.sql');
  const b = read('supabase/apply/pending-0222.sql');
  for (const sql of [m, b]) {
    assert.match(sql, /jsonb_build_object\('kitchen', 2\) \|\| action_credits/);
    assert.match(sql, /create table if not exists public\.kitchen_suggestions/);
  }
  assert.match(b, /raise exception '0222/);
});

test('the food names in the prompt are the catalogue\'s, current', async () => {
  const { kitchenFoodsSource, OUT } = await import('../../../../scripts/build-kitchen-foods.mjs');
  assert.equal(read(OUT), (await kitchenFoodsSource()).replace(/\r\n/g, '\n'), 'run `node --experimental-strip-types scripts/build-kitchen-foods.mjs`');
  assert.match(read('supabase/functions/coach-kitchen/index.ts'), /\$\{KITCHEN_FOODS\}/);
});

test('diets are enforced by the app: a vegan never sees cheese, a vegetarian never sees chicken', () => {
  const veg = dish({ name: 'Tofu Rice Bowl', ingredients: [{ text: '200 g tofu', quantity: 200, unit: 'g', food: 'tofu' }, { text: '2 tbsp peanut butter', quantity: 30, unit: 'g', food: 'peanut butter' }] });
  const cheesy = dish({ name: 'Bean and Cheese Bake', method: 'oven', ingredients: [{ text: '100 g black beans', quantity: 100, unit: 'g', food: 'black beans' }, { text: '50 g cheddar', quantity: 50, unit: 'g', food: 'cheddar' }] });
  assert.deepEqual(dishCards([veg, cheesy], [], 'vegan').map((c) => c.name), ['Tofu Rice Bowl'], 'peanut butter is vegan; cheddar is not');
  assert.deepEqual(dishCards([dish(), veg], [], 'vegetarian').map((c) => c.name), ['Tofu Rice Bowl']);
});

test('three are shown even when two share a method; names are cut at a word', () => {
  const out = sanitizeKitchenAnswer({ options: [dish(), dish({ name: 'Chicken Burrito Bowl' }), dish({ name: 'Sheet Pan Chicken', method: 'oven' })] });
  assert.equal(out.length, 3);
  const [long] = sanitizeKitchenAnswer({ options: [dish({ name: 'Overnight Oats with Banana and Blueberries and Honey Drizzle' })] });
  assert.ok(!/Blueberri$|\s$/.test(long.name) && long.name.length <= 48, long.name);
});
