import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RECIPE_BY_ID,
  RECIPES,
  alternatives,
  clearWeek,
  placeMeal,
  planWeek,
  rebuildWeek,
  resolveWeek,
  setForgeRecipes,
} from '../meal-planner.ts';
import { cleanRoutine, draftFrom, freshDraft, prefsFrom, routineOf } from '../meal-plan-setup.ts';
import { STARTER_RECIPES } from './fixtures/starter-recipes.ts';

/* PO 09-27: "I eat the same breakfast everyday. I have the same lunch every day, but dinner is different." */

setForgeRecipes(STARTER_RECIPES);

const PREFS = {
  diet: 'anything',
  allergens: [],
  dislikes: [],
  meals: ['breakfast', 'lunch', 'dinner'],
  cookMinutes: null,
  household: 1,
  weeklyBudgetUsd: null,
};
const TARGET = { kcal: 2500, protein: 180, carb: 270, fat: 80 };
const plan = (over = {}, seed = 7, locked = {}) => planWeek({ prefs: { ...PREFS, ...over }, target: TARGET, seed, locked });
const idsIn = (days, slot) => days.map((d) => d.items.find((x) => x.slot === slot && !x.extra)?.recipeId);
const distinct = (xs) => new Set(xs.filter(Boolean)).size;

test('the PO’s week: same breakfast, same lunch, a different dinner every night', () => {
  for (const seed of [1, 7, 42, 99]) {
    const days = plan({ routine: { breakfast: 'same', lunch: 'same', dinner: 'vary' } }, seed);
    assert.equal(distinct(idsIn(days, 'breakfast')), 1, `seed ${seed}: breakfast`);
    assert.equal(distinct(idsIn(days, 'lunch')), 1, `seed ${seed}: lunch`);
    assert.equal(idsIn(days, 'breakfast').filter(Boolean).length, 7);
    assert.equal(idsIn(days, 'lunch').filter(Boolean).length, 7);
    assert.ok(distinct(idsIn(days, 'dinner')) >= 6, `seed ${seed}: dinners vary`);
  }
});

test('the other way round: different breakfast, same lunch and same dinner', () => {
  const days = plan({ routine: { breakfast: 'vary', lunch: 'same', dinner: 'same' } });
  assert.equal(distinct(idsIn(days, 'lunch')), 1);
  assert.equal(distinct(idsIn(days, 'dinner')), 1);
  assert.ok(distinct(idsIn(days, 'breakfast')) >= 3);
});

test('a routine meal is what was asked for — never flagged as a repeat', () => {
  const days = plan({ routine: { breakfast: 'same', lunch: 'same' } });
  for (const day of days) for (const it of day.items) if (it.slot !== 'dinner') assert.ok(!it.repeated);
});

test('“a few”: between two and three recipes taking turns, none more than three times', () => {
  for (const seed of [1, 7, 42]) {
    const ids = idsIn(plan({ routine: { lunch: 'rotate' } }, seed), 'lunch');
    const n = distinct(ids);
    assert.ok(n >= 2 && n <= 3, `seed ${seed}: ${n} lunches`);
    const counts = {};
    for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
    assert.ok(Math.max(...Object.values(counts)) <= 3, `seed ${seed}: ${JSON.stringify(counts)}`);
  }
});

test('a pick locked on Thursday is the `same` breakfast every other day gets', () => {
  const pick = RECIPES.find((r) => r.mealTypes.includes('breakfast')).id;
  const days = plan({ routine: { breakfast: 'same' } }, 7, { '3-breakfast': { recipeId: pick, leftover: false, portion: 1 } });
  assert.deepEqual(idsIn(days, 'breakfast'), Array(7).fill(pick));
});

test('leftovers never land in a routine lunch', () => {
  for (const seed of [1, 7, 42, 99]) {
    const days = plan({ routine: { lunch: 'same' } }, seed);
    assert.ok(days.every((d) => d.items.every((it) => !it.leftover)), `seed ${seed}`);
  }
});

test('with no answer the week plans exactly as it did before the question', () => {
  for (const seed of [1, 7, 42]) {
    assert.deepEqual(plan({}, seed), plan({ routine: {}, shareIngredients: false, ownRecipesOnly: false }, seed));
    assert.deepEqual(plan({}, seed), plan({ routine: { breakfast: 'vary', lunch: 'vary', dinner: 'vary' } }, seed));
  }
});

test('the hard rules still hold on a routine meal: an allergen never comes back through it', () => {
  const days = plan({ routine: { breakfast: 'same', lunch: 'same' }, allergens: ['eggs', 'dairy'] });
  for (const day of days) for (const it of day.items) assert.ok(!RECIPE_BY_ID[it.recipeId].allergens.some((a) => a === 'eggs' || a === 'dairy'));
});

test('sharing ingredients: the week buys fewer different things', () => {
  const buys = (days) =>
    new Set(days.flatMap((d) => d.items.filter((x) => !x.leftover).flatMap((x) => RECIPE_BY_ID[x.recipeId].ingredientNames))).size;
  let fewer = 0;
  const seeds = [1, 2, 3, 7, 11, 42, 99, 123];
  for (const seed of seeds) if (buys(plan({ shareIngredients: true }, seed)) < buys(plan({}, seed))) fewer++;
  assert.ok(fewer >= seeds.length - 1, `${fewer} of ${seeds.length} weeks shorter`);
});

test('my recipes only: Forge’s library is left out of the plan and the swaps', () => {
  const days = plan({ ownRecipesOnly: true });
  assert.ok(days.every((d) => d.items.length === 0), 'no user recipes registered here, so nothing to plan from');
  const full = plan({});
  assert.deepEqual(alternatives(full, 0, 0, { ...PREFS, ownRecipesOnly: true }, TARGET), []);
});

test('setup: fresh answers are `vary`, a saved routine comes back, and only planned meals are kept', () => {
  assert.equal(routineOf(freshDraft(), 'breakfast'), 'vary');
  const d = { ...freshDraft(), allergyMode: 'none', routine: { breakfast: 'same', snacks: 'same' }, ownRecipesOnly: true };
  const saved = prefsFrom(d);
  assert.deepEqual(saved.routine, { breakfast: 'same', lunch: 'vary', dinner: 'vary' });
  assert.equal(saved.ownRecipesOnly, true);
  assert.equal(saved.shareIngredients, false);
  assert.equal(routineOf(draftFrom(saved), 'breakfast'), 'same');
});

test('a stored routine is cleaned: unknown meals and values never reach the planner', () => {
  assert.deepEqual(cleanRoutine({ breakfast: 'same', brunch: 'same', lunch: 'always', dinner: 'rotate' }), { breakfast: 'same', dinner: 'rotate' });
  assert.deepEqual(cleanRoutine(null), {});
  assert.deepEqual(cleanRoutine('same'), {});
});

/* ── Clear week (PO 09-27) ──────────────────────────────────────────────── */

const stored = (over = {}) => ({
  weekStart: '2026-09-28',
  seed: 3,
  targetKcal: TARGET.kcal,
  prefsUpdatedAt: 't1',
  days: plan({}, 3),
  locked: { '0-dinner': { recipeId: plan({}, 3)[0].items[2].recipeId, leftover: false, portion: 1 } },
  logged: { x: 'diary-row' },
  ...over,
});

test('clearing empties every day, drops every lock and forgets the logged marks', () => {
  const c = clearWeek(stored());
  assert.equal(c.days.length, 7);
  assert.ok(c.days.every((d) => d.items.length === 0));
  assert.deepEqual(c.locked, {});
  assert.deepEqual(c.logged, {});
  assert.equal(c.cleared, true);
});

test('⚠ a cleared week is NOT refilled on reopen — an empty uncleared week still is', () => {
  const c = clearWeek(stored());
  const again = resolveWeek(c, PREFS, 't1', TARGET, '2026-09-28');
  assert.equal(again.rebuilt, false);
  assert.ok(again.week.days.every((d) => d.items.length === 0));
  const empty = resolveWeek({ ...c, cleared: false }, PREFS, 't1', TARGET, '2026-09-28');
  assert.equal(empty.rebuilt, true);
  assert.ok(empty.week.days.some((d) => d.items.length > 0));
});

test('a cleared week keeps what the athlete places in it, survives a new target, and a new setup builds', () => {
  const c = clearWeek(stored());
  const pick = RECIPES.find((r) => r.mealTypes.includes('breakfast')).id;
  const placed = { ...c, ...placeMeal(c.days, c.locked, 2, 'breakfast', pick, PREFS, TARGET) };
  const r1 = resolveWeek(placed, PREFS, 't1', { ...TARGET, kcal: 2200 }, '2026-09-28');
  assert.equal(r1.rebuilt, false);
  assert.equal(r1.week.targetKcal, 2200);
  assert.equal(r1.week.days.flatMap((d) => d.items).length, 1);
  assert.equal(resolveWeek(placed, PREFS, 't2', TARGET, '2026-09-28').rebuilt, true);
});

test('Rebuild week ends the cleared state', () => {
  const r = rebuildWeek(clearWeek(stored()), PREFS, TARGET);
  assert.equal(r.cleared, false);
  assert.ok(r.days.some((d) => d.items.length > 0));
});

/* ── Holt's trial dishes + deleting a recipe (PO 09-27) ─────────────────── */

import { ownPicks, registerUserRecipes, withoutRecipe } from '../meal-planner.ts';
import { savedRecipes } from '../user-recipes.ts';

test('a deleted recipe leaves the week — every meal and leftover of it, its locks and log marks — and nothing else', () => {
  const s = stored();
  const gone = s.days[0].items[2].recipeId;
  const keptLock = { recipeId: s.days[1].items[0].recipeId, leftover: false, portion: 1 };
  const week = { ...s, locked: { ...s.locked, '1-breakfast': keptLock }, logged: { [`0-dinner-${gone}`]: 'row1', [`1-breakfast-${keptLock.recipeId}`]: 'row2' } };
  const out = withoutRecipe(week, gone);
  assert.ok(out.days.every((d) => d.items.every((it) => it.recipeId !== gone)));
  const before = week.days.flatMap((d) => d.items).filter((it) => it.recipeId !== gone).length;
  assert.equal(out.days.flatMap((d) => d.items).length, before, 'every other meal is still there');
  assert.deepEqual(out.locked, { '1-breakfast': keptLock });
  assert.deepEqual(out.logged, { [`1-breakfast-${keptLock.recipeId}`]: 'row2' });
  assert.equal(resolveWeek(out, PREFS, 't1', TARGET, '2026-09-28').rebuilt, false, 'the rest of the week is NOT rebuilt');
});

test('Holt’s unsaved dishes: hidden from every list, plannable — except under “only my recipes”', () => {
  const base = RECIPES.find((r) => r.mealTypes.includes('dinner'));
  const dish = (id, trial) => ({ ...base, id, name: id, ...(trial ? { trial: true } : {}) });
  setForgeRecipes([]);
  registerUserRecipes([
    { recipe: dish('u:holt', true), view: { id: 'u:holt', name: 'holt', minutes: 10, equipment: [], steps: [], ingredients: [], mine: true }, plannable: true },
    { recipe: dish('u:mine', false), view: { id: 'u:mine', name: 'mine', minutes: 10, equipment: [], steps: [], ingredients: [], mine: true }, plannable: true },
  ]);
  const dinners = (p) => new Set(planWeek({ prefs: { ...PREFS, meals: ['dinner'], ...p }, target: TARGET, seed: 5, locked: {} }).flatMap((d) => d.items.map((x) => x.recipeId)));
  assert.ok(dinners({}).has('u:holt'), 'the week may use it');
  assert.deepEqual([...dinners({ ownRecipesOnly: true })], ['u:mine']);
  assert.deepEqual(ownPicks('dinner', PREFS).map((x) => x.recipe.id), ['u:mine'], '“choose my own” lists only kept recipes');
  assert.deepEqual(savedRecipes([{ id: 'u:a', trial: true }, { id: 'u:b' }, { id: 'u:c', trial: false }]).map((u) => u.id), ['u:b', 'u:c']);
  registerUserRecipes([]);
  setForgeRecipes(STARTER_RECIPES);
});
