import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * HOLT'S FOOD CARDS, WRITTEN — `log_food` / `propose_meal` executors against the REAL `nutrition-live.ts` and an
 * in-memory database (AI Road to 10 Sprint 4a §1.2, NU-3). The rules under test (contract §1.2 d/e + "a failed apply
 * leaves nothing behind"):
 *   1. Log writes one diary row per food (log_food) / ONE row under the meal's name (propose_meal), today, with the
 *      numbers holt-meal.ts made — and Undo removes exactly those rows, nothing else.
 *   2. Save as a meal writes a saved meal and its items; Undo deletes that meal.
 *   3. A refused write leaves nothing: no diary row, no saved meal, no orphan items.
 *   4. A card that cannot be counted (HF-D5) cannot be applied.
 */

const { db, ATHLETE } = await import('./harness/fake-supabase.mjs');
const { store } = await import('./harness/stubs.mjs');
const { HOLT_MEAL_EXECUTORS, logFoodExecutor, proposeMealExecutor } = await import('../holt-meal-live.ts');
const { checkFoodAction, narrowFoods } = await import('../../domain/coach/ask-food-tools.ts');
const { localToday } = await import('../../domain/nutrition/day.ts');

const food = (key, name, kcal100, serving, source = 'usda') => ({
  key,
  source,
  name,
  brand: source === 'fs' ? 'Costa Vida' : null,
  kcal100,
  protein100: 10,
  carb100: 10,
  fat100: 5,
  servings: [serving],
  attribution: source === 'fs' ? 'Powered by fatsecret' : null,
});
const EGG = food('usda:555', 'Egg, whole, cooked', 155, { label: '1 large', grams: 50 });
const TOAST = food('usda:666', 'Bread, toasted', 293, { label: '1 slice', grams: 28 });
const SALAD = food('fs:111', 'Chicken Salad', 150, { label: '1 salad', grams: 400 }, 'fs');
const RANCH = food('fs:222', 'Ranch Dressing', 500, { label: '2 oz', grams: 56.7 }, 'fs');
const PACKET = food('fs:333', 'Ranch packet', 500, { label: '1 packet', grams: null }, 'fs');

/** What arrives on the device: the function's enriched input, as JSON. */
const forwarded = (name, input, ...foods) => {
  const r = checkFoodAction(name, input, new Map(narrowFoods({ foods }).map((f) => [f.key, f])));
  assert.equal(r.ok, true, JSON.stringify(r));
  return JSON.parse(JSON.stringify(r.input));
};

const diary = () => db.rows('food_log_entries');

function fresh() {
  db.reset();
  store.clear();
}

test('log_food: Log writes one diary row per food today, at the slot named, with the app’s numbers — Undo removes exactly those', async () => {
  fresh();
  // Somebody's breakfast already on the day — Undo must never touch it.
  diary().push({ id: 'earlier', athlete_id: ATHLETE, logged_on: localToday(), meal: 'breakfast', name: 'Oats', kcal: 300 });
  const input = forwarded('log_food', { meal: 'breakfast', items: [{ key: 'usda:555', amount: 2, unit: 'servings' }, { key: 'usda:666' }] }, EGG, TOAST);
  const r = await logFoodExecutor.apply(input);
  assert.equal(r.ok, true);
  assert.equal(r.said, 'Logged 2 foods to Breakfast.');
  const rows = diary().filter((x) => x.id !== 'earlier');
  assert.deepEqual(rows.map((x) => [x.logged_on, x.meal, x.name, x.serving_label, x.kcal, x.grams]), [
    [localToday(), 'breakfast', 'Egg, whole, cooked', '2 × 1 large (100 g)', 155, 100],
    [localToday(), 'breakfast', 'Bread, toasted', '1 slice (28 g)', 82, 28],
  ]);
  assert.deepEqual(r.undo.entryIds.sort(), rows.map((x) => x.id).sort());

  assert.equal(await logFoodExecutor.undo(r.undo), true);
  assert.deepEqual(diary().map((x) => x.id), ['earlier'], 'only the rows this tap wrote are gone');
});

test('propose_meal: Log it writes the order as ONE diary row under its name; Undo removes it', async () => {
  fresh();
  const input = forwarded('propose_meal', { name: 'Costa Vida Chicken Salad', items: [{ key: 'fs:111' }, { key: 'fs:222', amount: 4, unit: 'oz' }] }, SALAD, RANCH);
  const r = await proposeMealExecutor.apply(input);
  assert.equal(r.ok, true);
  assert.equal(diary().length, 1);
  const [row] = diary();
  assert.equal(row.name, 'Costa Vida Chicken Salad');
  assert.equal(row.serving_label, '1 meal · 2 foods');
  assert.equal(row.source, 'quick');
  assert.equal(row.kcal, 600 + 567);
  assert.equal(await proposeMealExecutor.undo(r.undo), true);
  assert.equal(diary().length, 0);
  assert.equal(db.rows('saved_meals').length, 0, 'Log never saves a meal');
});

test('propose_meal: Save as a meal writes the meal and its items, and nothing to the diary; Undo deletes the meal', async () => {
  fresh();
  const input = forwarded('propose_meal', { name: 'Costa Vida Chicken Salad', items: [{ key: 'fs:111' }, { key: 'fs:222', amount: 4, unit: 'oz' }] }, SALAD, RANCH);
  const r = await proposeMealExecutor.apply(input, { key: 'save' });
  assert.equal(r.ok, true);
  assert.match(r.said, /Saved to My foods & meals as “Costa Vida Chicken Salad”/);
  const meals = db.rows('saved_meals');
  assert.equal(meals.length, 1);
  assert.equal(meals[0].athlete_id, ATHLETE);
  assert.equal(meals[0].id, r.undo.mealId);
  const items = db.rows('saved_meal_items');
  assert.deepEqual(items.map((i) => [i.meal_id, i.source_key, i.serving_label, i.kcal]), [
    [r.undo.mealId, 'fs:111', '1 salad (400 g)', 600],
    [r.undo.mealId, 'fs:222', '4 oz (113.4 g)', 567],
  ]);
  assert.ok(items.every((i) => i.micros == null), 'FatSecret: calories and macros only');
  assert.equal(diary().length, 0, 'Save never logs');
  assert.equal(await proposeMealExecutor.undo(r.undo), true);
  assert.equal(db.rows('saved_meals').length, 0);
});

test('⛔ a failed apply leaves nothing behind — a refused diary write, a refused meal, a refused item list', async () => {
  const logInput = forwarded('log_food', { items: [{ key: 'usda:555' }, { key: 'usda:666' }] }, EGG, TOAST);
  const mealInput = forwarded('propose_meal', { name: 'Bowl', items: [{ key: 'fs:111' }, { key: 'fs:222' }] }, SALAD, RANCH);
  const refusal = { code: '42501', message: 'new row violates row-level security policy' };

  fresh();
  db.fail = (table) => (table === 'food_log_entries' ? refusal : null);
  assert.deepEqual(await logFoodExecutor.apply(logInput), { ok: false, reason: 'failed' });
  assert.deepEqual(await proposeMealExecutor.apply(mealInput), { ok: false, reason: 'failed' });
  assert.equal(diary().length, 0);

  fresh();
  db.fail = (table, mode) => (table === 'saved_meals' && mode === 'insert' ? refusal : null);
  assert.deepEqual(await proposeMealExecutor.apply(mealInput, { key: 'save' }), { ok: false, reason: 'failed' });
  assert.equal(db.rows('saved_meals').length + db.rows('saved_meal_items').length, 0);

  // The meal went in and its items were refused: the meal is taken out again, so no empty meal is left in the list.
  fresh();
  db.fail = (table) => (table === 'saved_meal_items' ? refusal : null);
  assert.deepEqual(await proposeMealExecutor.apply(mealInput, { key: 'save' }), { ok: false, reason: 'failed' });
  assert.equal(db.rows('saved_meals').length, 0);
  assert.equal(db.rows('saved_meal_items').length, 0);
  db.fail = null;
});

test('no signal: a Save says offline and writes nothing; a Log is held and lands when the signal returns', async () => {
  const mealInput = forwarded('propose_meal', { name: 'Bowl', items: [{ key: 'fs:111' }] }, SALAD);
  fresh();
  db.offline = true;
  assert.deepEqual(await proposeMealExecutor.apply(mealInput, { key: 'save' }), { ok: false, reason: 'offline' });
  // The diary's own outbox holds a Log (every Log Food write does) — the card says it is logged, and it is.
  const held = await logFoodExecutor.apply(forwarded('log_food', { items: [{ key: 'usda:555' }] }, EGG));
  assert.equal(held.ok, true);
  db.offline = false;
  assert.equal(db.rows('saved_meals').length, 0);
});

test('HF-D5: a card that cannot be counted cannot be applied, and a malformed input writes nothing', async () => {
  fresh();
  const unweighed = forwarded('propose_meal', { name: 'Bowl', items: [{ key: 'fs:111' }, { key: 'fs:333' }] }, SALAD, PACKET);
  assert.deepEqual(await proposeMealExecutor.apply(unweighed), { ok: false, reason: 'not_allowed' });
  assert.deepEqual(await proposeMealExecutor.apply(unweighed, { key: 'save' }), { ok: false, reason: 'not_allowed' });
  assert.deepEqual(await logFoodExecutor.apply({ items: [{ food: { key: 'x', name: 'x', source: 'evil', kcal100: 1 } }] }), { ok: false, reason: 'not_allowed' });
  assert.equal(diary().length + db.rows('saved_meals').length, 0);
  assert.equal(await logFoodExecutor.undo({ action: 'log_food' }), false, 'an undo with nothing to undo says so');
});

test('the registry the integrator wires into executorFor', () => {
  assert.deepEqual(Object.keys(HOLT_MEAL_EXECUTORS).sort(), ['log_food', 'propose_meal']);
});
