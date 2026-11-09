import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Launch QA B13 / UX-002 — Meal Plan: ONE FAILED READ REPLACED THE ATHLETE'S WEEK.
 *
 * Every read Meal Plan builds from turned a failure into "nothing": no stored week, no recipes. Told "no week", the
 * screen built a new one and SAVED it over the real one — locks, logged-meal links and a deliberately cleared week
 * gone, and re-logging then double-counted in the diary. The reads it builds from are now `strict`: a failure THROWS,
 * and null means the server answered and there is none. A failed recipes read also keeps the last good book instead of
 * emptying it, so a stored week naming the athlete's recipe never reads as unreadable for want of a blip.
 *
 * The REAL `nutrition-live.ts`, against the in-memory database.
 */

const { db, ATHLETE } = await import('./harness/fake-supabase.mjs');
const { store } = await import('./harness/stubs.mjs');
const live = await import('../nutrition-live.ts');
const { RECIPE_BY_ID, mondayOf, resolveWeek } = await import('../../domain/nutrition/meal-planner.ts');
const { localToday } = await import('../../domain/nutrition/day.ts');

const WEEK = mondayOf(localToday());
const STRICT = { strict: true };
/* A real server failure — not a missing column, which the readers deliberately treat as "not pasted yet". */
const TIMEOUT = { code: '57014', message: 'canceling statement due to statement timeout', details: null, hint: null };
const failing = (...tables) => (table, mode) => (mode === 'select' && tables.includes(table) ? TIMEOUT : null);

function putRecipe() {
  db.rows('user_recipes').push({
    id: 'r1',
    athlete_id: ATHLETE,
    name: 'Turkey chili',
    meal_types: ['dinner'],
    minutes: 30,
    yield: 1,
    ingredients: [],
    allergens: [],
    confirmed: true,
    steps: [],
    use_plan: true,
    created_at: '2026-11-01T00:00:00Z',
    trial: false,
  });
}

/** The athlete's real week: their recipe every dinner, Monday's locked and logged. */
function putWeek() {
  const days = Array.from({ length: 7 }, () => ({ items: [{ slot: 'dinner', recipeId: 'u:r1', portion: 1, leftover: false }] }));
  db.rows('meal_plan_weeks').push({
    athlete_id: ATHLETE,
    week_start: WEEK,
    seed: 7,
    target_kcal: 2000,
    prefs_updated_at: 'P1',
    days,
    locked: { '0:dinner': true },
    logged: { '0:dinner:u:r1': 'entry-1' },
    cleared_at: null,
    grocery: {},
  });
}

test.beforeEach(() => {
  db.reset();
  store.clear();
});

test('a failed week read throws when strict — it is never "no week" — and an empty answer is still null', async () => {
  putRecipe();
  putWeek();
  db.fail = failing('meal_plan_weeks');
  await assert.rejects(() => live.fetchMealPlanWeek(WEEK, STRICT), 'a strict read that failed throws');
  assert.equal(await live.fetchMealPlanWeek(WEEK), null, 'the lenient read other screens use is unchanged');

  db.fail = null;
  const stored = await live.fetchMealPlanWeek(WEEK, STRICT);
  assert.equal(stored?.seed, 7, 'a read that lands is the real week');
  assert.deepEqual(stored?.locked, { '0:dinner': true });

  db.tables.set('meal_plan_weeks', []);
  assert.equal(await live.fetchMealPlanWeek(WEEK, STRICT), null, 'null only when the server answered and there is none');
});

test('no signal is a failure, not an empty week', async () => {
  putWeek();
  db.offline = true;
  await assert.rejects(() => live.fetchMealPlanWeek(WEEK, STRICT));
  await assert.rejects(() => live.fetchUserRecipes(STRICT));
});

test('a failed recipes read keeps the last good book, so the stored week still resolves as it is — no rebuild', async () => {
  putRecipe();
  putWeek();
  await live.fetchUserRecipes();
  assert.ok(RECIPE_BY_ID['u:r1'], 'a good read puts the recipe in the book');

  db.fail = failing('user_recipes');
  assert.deepEqual(await live.fetchUserRecipes(), [], 'the lenient read still answers an empty list');
  assert.ok(RECIPE_BY_ID['u:r1'], 'but the book keeps the last good recipes — it used to be emptied');
  await assert.rejects(() => live.fetchUserRecipes(STRICT), 'Meal Plan’s strict read throws');

  db.fail = null;
  const stored = await live.fetchMealPlanWeek(WEEK, STRICT);
  const prefs = { diet: 'any', allergens: [], dislikes: [], meals: ['dinner'], cookMinutes: null, household: 1, weeklyBudgetUsd: null };
  const out = resolveWeek(stored, prefs, 'P1', { kcal: 2000, protein: 150, carb: 200, fat: 70 }, WEEK);
  assert.equal(out.rebuilt, false, 'the real week is shown, not rebuilt over');
  assert.equal(out.week, stored);
});

test('a failed saved-meals read throws when strict, too — a week naming a saved meal must not be rebuilt for it', async () => {
  putRecipe();
  db.fail = failing('saved_meals');
  await assert.rejects(() => live.fetchUserRecipes(STRICT));
  assert.equal((await live.fetchUserRecipes()).length, 1, 'the lenient read is unchanged');
});

test('setup, target and profile: a failed strict read throws; "none" is still null', async () => {
  db.fail = failing('meal_plan_prefs', 'nutrition_targets', 'profiles');
  await assert.rejects(() => live.fetchMealPlanPrefs(STRICT), 'a failed setup read is not "never set up"');
  await assert.rejects(() => live.fetchTargetsOn(WEEK, STRICT), 'a failed target read is not "no target"');
  await assert.rejects(() => live.fetchNutritionProfile(STRICT), 'a failed profile read is not "no birth year"');
  assert.equal(await live.fetchMealPlanPrefs(), null, 'lenient reads are unchanged');
  assert.equal(await live.fetchTargetsOn(WEEK), null);
  assert.equal((await live.fetchNutritionProfile()).birthYear, null);

  db.fail = null;
  assert.equal(await live.fetchMealPlanPrefs(STRICT), null, 'never set up');
  assert.equal(await live.fetchTargetsOn(WEEK, STRICT), null, 'no target');
  assert.equal((await live.fetchNutritionProfile(STRICT)).birthYear, null, 'no profile row');
});
