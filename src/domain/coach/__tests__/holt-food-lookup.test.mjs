/**
 * holt-food-lookup.test.mjs — Holt looks a food up, logs it, or makes an order one meal.
 * Nutrition Architecture Amendment 006 (PO 2026-10-01, HF-D1…HF-D6) + AI Road to 10 Sprint 4a NU-3 (`log_food`).
 *
 * The ask that started it: "Costa Vida chicken salad … 4oz of red sauce and 4 oz of their ranch. Find the macros for me
 * and make it a meal … called 'costa Vida chicken salad'". Holt answered that he couldn't pull restaurant macros, and a
 * "Set my macros" door went under him. Ported from 095d8bf6 onto today's tree: the tools (`ask-food-tools.ts`, which
 * coach-ask registers for a caps `actions_v1` app), the card that makes every number (`holt-meal.ts`), and the door.
 *
 * Run:  node --test src/domain/coach/__tests__/holt-food-lookup.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  checkFoodAction,
  FOOD_ACTION_NAMES,
  FOOD_ACTIONS,
  FOOD_PROMPT,
  FOOD_TOOLS,
  foodActionAck,
  foodDefaultServing,
  foodServingMacros,
  foodServingOptions,
  formatFoodSearch,
  narrowFoods,
  resolveFoodLog,
  resolveMealProposal,
  runFoodTool,
} from '../ask-food-tools.ts';
import { NEW_ACTIONS } from '../holt-actions.ts';
import { defaultServing, portionMacros, servingOptions } from '../../nutrition/serving.ts';
import {
  foodLogSlot,
  holtFoodLogCard,
  holtMealCard,
  mealCard,
  mealCardComplete,
  mealCardEntries,
  mealCardEntry,
  mealCardLine,
  mealCardRows,
  GRAMS_PER_OZ,
  SAVE_MEAL_KEY,
} from '../../nutrition/holt-meal.ts';
import { kitchenDoorsFor } from '../kitchen.ts';

export const SALAD = {
  key: 'fs:111',
  source: 'fs',
  sourceId: '111',
  name: 'Chicken Salad',
  brand: 'Costa Vida',
  gtin: null,
  kcal100: 150,
  protein100: 10,
  carb100: 12,
  fat100: 7,
  servings: [{ label: '1 salad', grams: 400 }],
  micros: null,
  attribution: 'Powered by fatsecret',
};
export const RANCH = { ...SALAD, key: 'fs:222', sourceId: '222', name: 'Ranch Dressing', kcal100: 500, protein100: 1, carb100: 5, fat100: 52, servings: [{ label: '2 oz', grams: 56.7 }] };
export const RED = {
  ...SALAD,
  key: 'usda:333',
  source: 'usda',
  sourceId: '333',
  name: 'Enchilada sauce, red',
  brand: null,
  kcal100: 30,
  protein100: 1,
  carb100: 5,
  fat100: 1,
  servings: [{ label: '1 cup', grams: 250 }],
  attribution: null,
};
const GENERIC = { ...SALAD, key: 'usda:444', source: 'usda', name: 'Salad, chicken', brand: null, servings: [{ label: '1 cup', grams: 205 }], attribution: null };
const EGG = { ...RED, key: 'usda:555', name: 'Egg, whole, cooked', kcal100: 155, protein100: 12.6, carb100: 1.1, fat100: 10.6, servings: [{ label: '1 large', grams: 50 }] };
const TOAST = { ...RED, key: 'usda:666', name: 'Bread, whole wheat, toasted', kcal100: 293, protein100: 12.5, carb100: 48, fat100: 4.3, servings: [{ label: '1 slice', grams: 28 }] };

const PO_ASK =
  'I got a Costa Vida salad with chicken. It will have 4oz of red sauce and 4 oz of their ranch. Find the macros for me and make it a meal or recipe to log just as one whole thing called “costa Vida chicken salad”';

const seenOf = (...foods) => new Map(narrowFoods({ foods }).map((f) => [f.key, f]));

/* ── the tool and the actions ──────────────────────────────────────────────── */

test('Holt has a food search tool and two food actions — names from the contract, forwarded, never run, by the function', () => {
  assert.deepEqual(FOOD_TOOLS.map((t) => t.name), ['get_foods']);
  assert.deepEqual(FOOD_ACTION_NAMES, ['log_food', 'propose_meal']);
  for (const n of FOOD_ACTION_NAMES) assert.ok(NEW_ACTIONS.includes(n), `${n} is a contract action (holt-actions.ts)`);
  const meal = FOOD_ACTIONS.find((a) => a.name === 'propose_meal');
  const log = FOOD_ACTIONS.find((a) => a.name === 'log_food');
  assert.deepEqual(meal.input_schema.required, ['name', 'items']);
  assert.deepEqual(log.input_schema.required, ['items']);
  // The model gives a key and only the athlete's amount — there is no field for a number of its own.
  for (const a of [meal, log]) {
    assert.deepEqual(Object.keys(a.input_schema.properties.items.items.properties).sort(), ['amount', 'key', 'unit']);
    assert.equal(a.input_schema.additionalProperties, false);
    assert.equal(a.input_schema.properties.items.items.additionalProperties, false);
  }
  assert.deepEqual(log.input_schema.properties.meal.enum, ['breakfast', 'lunch', 'dinner', 'snacks']);
  assert.match(foodActionAck('propose_meal'), /do not state the totals/i);
  assert.match(foodActionAck('log_food'), /Do not say it is logged/);
  assert.match(FOOD_PROMPT, /Never add foods together, scale a serving/);
});

test('⚠ ask-food-tools.ts imports nothing — coach-ask bundles it', () => {
  const src = readFileSync(new URL('../ask-food-tools.ts', import.meta.url), 'utf8');
  assert.ok(!/^import /m.test(src));
});

test('search results are narrowed: a food with no energy, or no key, never reaches the model', () => {
  const foods = narrowFoods({ foods: [SALAD, { ...RANCH, kcal100: null }, { ...RED, key: '' }, 'junk', null] });
  assert.deepEqual(foods.map((f) => f.key), ['fs:111']);
  assert.deepEqual(narrowFoods(null), []);
  assert.deepEqual(narrowFoods({ foods: 'x' }), []);
});

test("the serving math is the app's own — the twins agree with serving.ts on every shape", () => {
  const shapes = [
    SALAD,
    RANCH,
    RED,
    { ...SALAD, servings: [] },
    { ...SALAD, servings: [{ label: '100 g', grams: 100 }, { label: '1 piece', grams: null }] },
    { ...SALAD, servings: [{ label: '1 piece', grams: null }, { label: '1 Piece', grams: 30 }, { label: '1 cup', grams: 240 }] },
  ];
  for (const f of shapes) {
    const [hit] = narrowFoods({ foods: [f] });
    assert.deepEqual(foodServingOptions(hit), servingOptions(f));
    assert.deepEqual(foodDefaultServing(hit), defaultServing(f));
    const s = defaultServing(f);
    const app = portionMacros(f, { serving: s, quantity: 1 });
    const twin = foodServingMacros(hit, s.grams);
    if (s.grams == null) assert.equal(twin, null);
    else assert.deepEqual(twin, { kcal: app.kcal, protein: app.protein, carb: app.carb, fat: app.fat });
  }
});

test("the result text puts the restaurant's own item first and quotes the app's numbers for its serving", () => {
  const text = formatFoodSearch('Costa Vida chicken salad', narrowFoods({ foods: [GENERIC, SALAD] }));
  const lines = text.split('\n');
  assert.match(lines[0], /never add them up or scale them/);
  assert.match(lines[1], /^key fs:111 — Chicken Salad \(Costa Vida\), FatSecret/);
  assert.match(lines[1], /per 1 salad \(400 g\): 600 kcal, 40 g protein, 48 g carbs, 28 g fat/);
  assert.match(lines[2], /^key usda:444/);
  assert.match(formatFoodSearch('dragonfruit tacos', []), /never give a number of your own/);
});

/** A fake `fetch` that answers like food-search, and records what it was sent. */
function fakeSearch(answer) {
  const sent = [];
  return {
    sent,
    ctx: {
      authorization: 'Bearer athlete-jwt',
      supabaseUrl: 'https://x.supabase.co',
      anonKey: 'anon',
      fetch: async (url, init) => {
        sent.push({ url, init, body: JSON.parse(init.body) });
        return answer();
      },
    },
  };
}

test('get_foods calls food-search AS THE ATHLETE, remembers what it returned, and says plainly when Nutrition is off', async () => {
  const seen = new Map();
  const s = fakeSearch(() => ({ ok: true, status: 200, json: async () => ({ foods: [SALAD] }) }));
  const r = await runFoodTool('get_foods', { query: '  Costa Vida   chicken salad ' }, s.ctx, seen);
  assert.equal(r.isError, false);
  assert.equal(s.sent[0].url, 'https://x.supabase.co/functions/v1/food-search');
  assert.equal(s.sent[0].init.headers.Authorization, 'Bearer athlete-jwt', 'HF-D1: the athlete’s own token — their gate, their quota');
  assert.equal(s.sent[0].init.headers.apikey, 'anon');
  assert.deepEqual(s.sent[0].body, { q: 'Costa Vida chicken salad', limit: 12 });
  assert.ok(seen.has('fs:111'));
  assert.match(r.text, /key fs:111/);

  const off = fakeSearch(() => ({ ok: false, status: 403, json: async () => ({ error: 'nutrition_preview_only' }) }));
  const o = await runFoodTool('get_foods', { query: 'ranch' }, off.ctx, new Map());
  assert.match(o.text, /Nutrition is not on/);
  const down = fakeSearch(() => ({ ok: false, status: 503, json: async () => ({}) }));
  assert.equal((await runFoodTool('get_foods', { query: 'ranch' }, down.ctx, new Map())).isError, true);
  const broken = fakeSearch(() => {
    throw new Error('network');
  });
  const b = await runFoodTool('get_foods', { query: 'ranch' }, broken.ctx, new Map());
  assert.equal(b.isError, true);
  assert.match(b.text, /couldn't pull it/);
  assert.equal((await runFoodTool('get_foods', { query: 'x' }, s.ctx, new Map())).isError, true, 'a one-letter query is refused before any search');
  assert.equal((await runFoodTool('get_steps', { query: 'ranch' }, s.ctx, new Map())).isError, true);
});

test('⛔ HF-D4: a meal may hold only foods get_foods returned in this message — a key from memory is refused', () => {
  const seen = seenOf(SALAD, RANCH);
  const bad = resolveMealProposal({ name: 'Costa Vida Chicken Salad', items: [{ key: 'fs:111' }, { key: 'usda:999' }] }, seen);
  assert.equal(bad.ok, false);
  assert.match(bad.text, /usda:999/);
  assert.match(bad.text, /Nothing was shown/);

  const ok = resolveMealProposal(
    { name: '  Costa Vida   Chicken Salad ', items: [{ key: 'fs:111' }, { key: 'fs:222', amount: 4, unit: 'oz' }, { key: 'fs:222', unit: 'oz' }] },
    seen,
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.meal.name, 'Costa Vida Chicken Salad');
  // The food travels whole; an amount is kept only when one was given (a bare unit means nothing).
  assert.deepEqual(ok.meal.items.map((i) => [i.food.key, i.amount, i.unit]), [['fs:111', null, null], ['fs:222', 4, 'oz'], ['fs:222', null, null]]);
  assert.equal(resolveMealProposal({ name: '', items: [{ key: 'fs:111' }] }, seen).ok, false);
  assert.equal(resolveMealProposal({ name: 'x', items: [] }, seen).ok, false);
});

test('⛔ HF-D4 for log_food too, and checkFoodAction sends the foods whole — or the model an error', () => {
  const seen = seenOf(EGG, TOAST);
  const log = checkFoodAction('log_food', { meal: 'breakfast', items: [{ key: 'usda:555', amount: 2, unit: 'servings' }, { key: 'usda:666' }] }, seen);
  assert.equal(log.ok, true);
  assert.equal(log.input.meal, 'breakfast');
  assert.deepEqual(log.input.items[0].food, seen.get('usda:555'), 'the food exactly as food-search returned it');
  assert.deepEqual(log.input.items.map((i) => [i.amount, i.unit]), [[2, 'servings'], [null, null]]);
  // A slot that isn't one of the four is left to the app (by the hour), never invented.
  assert.equal(resolveFoodLog({ meal: 'brunch', items: [{ key: 'usda:555' }] }, seen).log.meal, null);
  const miss = checkFoodAction('log_food', { items: [{ key: 'usda:999' }] }, seen);
  assert.equal(miss.ok, false);
  assert.match(miss.error, /Search for those foods first, then call log_food again/);
  assert.equal(checkFoodAction('log_food', { items: [] }, seen).ok, false);
  // Nothing searched this message: every key is a miss.
  assert.equal(checkFoodAction('propose_meal', { name: 'Eggs', items: [{ key: 'usda:555' }] }, new Map()).ok, false);
  assert.equal(checkFoodAction('swap_exercise_today', {}, seen).ok, false);
});

/* ── the card ─────────────────────────────────────────────────────────────── */

/** What the device receives is the JSON of what the function sent. */
const wire = (x) => JSON.parse(JSON.stringify(x));

const poInput = () => {
  const r = checkFoodAction(
    'propose_meal',
    { name: 'Costa Vida Chicken Salad', items: [{ key: 'fs:111' }, { key: 'usda:333', amount: 4, unit: 'oz' }, { key: 'fs:222', amount: 4, unit: 'oz' }] },
    seenOf(SALAD, RANCH, RED),
  );
  assert.equal(r.ok, true);
  return wire(r.input);
};

test("the PO's order: the salad at its own serving, 4 oz of each sauce, totals made by the app", () => {
  const card = holtMealCard(poInput());
  assert.equal(card.name, 'Costa Vida Chicken Salad');
  assert.ok(mealCardComplete(card));
  assert.deepEqual(card.lines.map((l) => [l.name, l.amount, l.kcal]), [
    ['Chicken Salad', '1 salad (400 g)', 600],
    ['Enchilada sauce, red', '4 oz (113.4 g)', 34],
    ['Ranch Dressing', '4 oz (113.4 g)', 567],
  ]);
  // 600 + 34 + 567; protein 40 + 1.1 + 1.1; carbs 48 + 5.7 + 5.7; fat 28 + 1.1 + 59
  assert.deepEqual(card.totals, { kcal: 1201, protein: 42, carb: 59, fat: 88 });
  assert.equal(mealCardLine(card), '1,201 cal · 42 g protein · 59 g carbs · 88 g fat');
  // The licence credit, once, however many FatSecret foods are on it.
  assert.deepEqual(card.attribution, ['Powered by fatsecret']);
  assert.equal(GRAMS_PER_OZ * 4 > 113.39 && GRAMS_PER_OZ * 4 < 113.4, true);
});

test('the card model (contract §1.2): every number the app’s, Log it + Save as a meal, the FatSecret credit', () => {
  const m = mealCard({ name: 'propose_meal', input: poInput() });
  assert.equal(m.action, 'propose_meal');
  assert.equal(m.title, 'Costa Vida Chicken Salad');
  assert.deepEqual(m.rows.map((r) => [r.label, r.value, r.note]), [
    ['Chicken Salad · Costa Vida', '1 salad (400 g)', '600 cal'],
    ['Enchilada sauce, red', '4 oz (113.4 g)', '34 cal'],
    ['Ranch Dressing · Costa Vida', '4 oz (113.4 g)', '567 cal'],
    ['Total', '1,201 cal · 42 g protein · 59 g carbs · 88 g fat', 'Logged as one entry'],
  ]);
  assert.equal(m.confirmLabel, 'Log it');
  assert.deepEqual(m.secondary, { label: 'Save as a meal', key: SAVE_MEAL_KEY });
  assert.equal(m.credit, 'Powered by fatsecret');
  assert.equal(m.blocked, undefined);
});

test('Save writes the meal editor’s own rows; Log writes the order as ONE diary row under its name', () => {
  const card = holtMealCard(poInput());
  const rows = mealCardRows(card);
  assert.deepEqual(rows.map((r) => [r.source, r.source_key, r.serving_label, r.kcal]), [
    ['fs', 'fs:111', '1 salad (400 g)', 600],
    ['usda', 'usda:333', '4 oz (113.4 g)', 34],
    ['fs', 'fs:222', '4 oz (113.4 g)', 567],
  ]);
  // FatSecret's permission covers calories and macros only — no micros kept from it.
  assert.ok(rows.every((r) => r.micros == null));
  const entry = mealCardEntry(card);
  assert.equal(entry.name, 'Costa Vida Chicken Salad');
  assert.equal(entry.servingLabel, '1 meal · 3 foods');
  assert.deepEqual(entry.macros, { kcal: 1201, protein: 42, carb: 59, fat: 88, grams: 626.8 });
});

test('servings counts the food’s own serving; grams are a serving of their own', () => {
  const seen = seenOf(RANCH);
  const two = holtMealCard(resolveMealProposal({ name: 'Ranch', items: [{ key: 'fs:222', amount: 2, unit: 'servings' }] }, seen).meal);
  assert.deepEqual(two.lines.map((l) => l.amount), ['2 × 2 oz (113.4 g)']);
  const grams = holtMealCard(resolveMealProposal({ name: 'Ranch', items: [{ key: 'fs:222', amount: 30, unit: 'g' }] }, seen).meal);
  assert.deepEqual(grams.lines.map((l) => [l.amount, l.kcal]), [['30 g', 150]]);
});

test('log_food: "2 eggs and toast for breakfast" — one diary row per food, numbers from portionMacros, the slot named', () => {
  const r = checkFoodAction('log_food', { meal: 'breakfast', items: [{ key: 'usda:555', amount: 2, unit: 'servings' }, { key: 'usda:666' }] }, seenOf(EGG, TOAST));
  const input = wire(r.input);
  const card = holtFoodLogCard(input);
  const entries = mealCardEntries(card, foodLogSlot(input, 13));
  assert.deepEqual(entries.map((e) => [e.meal, e.name, e.servingLabel, e.quantity, e.macros.kcal, e.macros.grams]), [
    ['breakfast', 'Egg, whole, cooked', '2 × 1 large (100 g)', 2, 155, 100],
    ['breakfast', 'Bread, whole wheat, toasted', '1 slice (28 g)', 1, 82, 28],
  ]);
  // The same multiplication Food Detail writes with.
  assert.deepEqual(entries[0].macros, portionMacros(EGG, { serving: { label: '1 large', grams: 50 }, quantity: 2 }));
  const m = mealCard({ name: 'log_food', input });
  assert.equal(m.title, 'Log to Breakfast');
  assert.equal(m.confirmLabel, 'Log 2 foods to Breakfast');
  assert.equal(m.secondary, undefined, 'log_food has no second write');
  assert.deepEqual(m.rows.map((x) => x.note), ['155 cal', '82 cal', undefined]);
  assert.equal(m.rows[2].label, 'Total');
  // No slot named: the hour's, as Log Food opens (13:00 → lunch).
  const noSlot = wire(checkFoodAction('log_food', { items: [{ key: 'usda:555' }] }, seenOf(EGG)).input);
  assert.equal(foodLogSlot(noSlot, 13), 'lunch');
  assert.equal(mealCard({ name: 'log_food', input: noSlot }, { hour: 13 }).confirmLabel, 'Log 1 food to Lunch');
});

test('HF-D5: a food nobody weighed is named, and the card has no Confirm — it would log light', () => {
  // A source that gives only "1 packet" with no weight: the app's default serving is that packet, unweighed.
  const packet = { ...RANCH, name: 'Ranch packet', servings: [{ label: '1 packet', grams: null }] };
  const input = { name: 'Bowl', items: [{ food: SALAD, amount: null, unit: null }, { food: packet, amount: null, unit: null }] };
  const card = holtMealCard(input);
  assert.deepEqual(card.missing, ['Ranch packet']);
  assert.equal(mealCardComplete(card), false);
  assert.deepEqual(card.lines.map((l) => l.name), ['Chicken Salad']);
  const m = mealCard({ name: 'propose_meal', input });
  assert.equal(m.confirmLabel, null);
  assert.equal(m.secondary, undefined);
  assert.match(m.blocked, /No weighed serving for Ranch packet/);
  assert.ok(!m.rows.some((r) => r.label === 'Total'), 'no total for a meal that cannot be counted');
  const log = mealCard({ name: 'log_food', input: { items: input.items } });
  assert.equal(log.confirmLabel, null);
  assert.match(log.blocked, /Ranch packet/);
  // The athlete's own weight makes it countable.
  const weighed = holtMealCard({ name: 'Bowl', items: [{ food: SALAD }, { food: packet, amount: 2, unit: 'oz' }] });
  assert.ok(mealCardComplete(weighed));
});

test('a malformed action is dropped whole, never half-drawn', () => {
  assert.equal(holtMealCard(null), null);
  assert.equal(holtMealCard({ name: 'x', items: [] }), null);
  assert.equal(holtMealCard({ name: '', items: [{ food: SALAD }] }), null);
  assert.equal(holtMealCard({ name: 'x', items: [{ food: { ...SALAD, source: 'evil' } }] }), null);
  assert.equal(holtMealCard({ name: 'x', items: [{ food: { ...SALAD, kcal100: 'lots' } }] }), null);
  assert.equal(mealCard({ name: 'propose_meal', input: { name: 'x', items: [{ food: { ...SALAD, kcal100: 'lots' } }] } }), null);
  assert.equal(mealCard({ name: 'log_food', input: { items: [] } }), null);
  assert.equal(mealCard({ name: 'set_targets', input: {} }), null);
});

/* ── the door ─────────────────────────────────────────────────────────────── */

test('HF-D6: "find the macros" of a meal is a lookup — no "Set my macros" door under it', () => {
  const labels = (t) => kitchenDoorsFor(t).map((d) => d.label);
  for (const t of [PO_ASK, 'how many calories are in a Big Mac', 'what are the macros in chipotle chicken', 'nutrition info for a Costa Vida burrito', 'look up the macros for this']) {
    assert.ok(!labels(t).includes('Set my macros'), t);
  }
  // Their own targets still get the door.
  for (const t of ['set my macros', 'what should my macros be', 'macros for a cut', 'macros for me to lose weight', 'how many calories should I eat']) {
    assert.ok(labels(t).includes('Set my macros'), t);
  }
});
