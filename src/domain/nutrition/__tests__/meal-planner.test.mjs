import test from 'node:test';
import assert from 'node:assert/strict';

import {
  alternatives,
  dayTotals,
  feedsTomorrow,
  fits,
  planIsReadable,
  planWeek,
  RECIPE_BY_ID,
  RECIPES,
  shortBy,
  slotKey,
  snackOptions,
  swapMeal,
} from '../meal-planner.ts';
import { INGREDIENTS, RECIPE_SOURCES } from '../recipes-data.ts';

const PREFS = {
  diet: 'anything',
  allergens: [],
  dislikes: [],
  meals: ['breakfast', 'lunch', 'dinner'],
  cookMinutes: null,
  household: 1,
  weeklyBudgetUsd: null,
};
const plan = (over = {}, target = 2500, seed = 7, locked = {}) =>
  planWeek({ prefs: { ...PREFS, ...over }, targetKcal: target, seed, locked });
const everyRecipe = (days) => days.flatMap((d) => d.items.map((it) => RECIPE_BY_ID[it.recipeId]));

/* ── the numbers ──────────────────────────────────────────────────────── */

test('the starter set is 40 recipes: 10 breakfasts, 10 lunches, 12 dinners, 8 snacks', () => {
  const by = (s) => RECIPES.filter((r) => r.slot === s).length;
  assert.equal(RECIPES.length, 40);
  assert.deepEqual([by('breakfast'), by('lunch'), by('dinner'), by('snacks')], [10, 10, 12, 8]);
});

test('every recipe passes the §10 energy check: kcal within 15% of 4P + 4C + 9F', () => {
  for (const r of RECIPES) {
    const atwater = 4 * r.protein + 4 * r.carb + 9 * r.fat;
    assert.ok(Math.abs(atwater - r.kcal) / r.kcal <= 0.15, `${r.id} ${r.name}: ${r.kcal} vs ${atwater}`);
  }
});

test('a recipe’s calories are the sum of its ingredients, not a typed total', () => {
  const src = RECIPE_SOURCES.find((r) => r.id === 'b02');
  const sum = src.ingredients.reduce((t, [k, g]) => t + (INGREDIENTS[k].kcal * g) / 100, 0);
  assert.equal(RECIPE_BY_ID.b02.kcal, Math.round(sum));
});

test('every ingredient cites a USDA FDC id and carries plausible per-100 g values', () => {
  for (const [key, ing] of Object.entries(INGREDIENTS)) {
    assert.ok(Number.isInteger(ing.fdcId) && ing.fdcId > 100000, key);
    assert.ok(ing.kcal >= 0 && ing.kcal <= 900, key);
  }
});

/* ── tags derived from ingredients ────────────────────────────────────── */

test('allergens are derived from ingredients — soy sauce makes a dish soy AND gluten', () => {
  assert.deepEqual(RECIPE_BY_ID.l07.allergens, ['gluten', 'soy', 'shellfish', 'sesame']);
  assert.deepEqual(RECIPE_BY_ID.b04.allergens, ['dairy', 'gluten', 'fish', 'sesame']);
});

test('diet is derived: meat → any, fish → pescatarian, dairy/egg/honey → vegetarian, else vegan', () => {
  assert.equal(RECIPE_BY_ID.d02.diet, 'any');
  assert.equal(RECIPE_BY_ID.d01.diet, 'pescatarian');
  assert.equal(RECIPE_BY_ID.b01.diet, 'vegetarian'); // honey + yogurt
  assert.equal(RECIPE_BY_ID.d05.diet, 'vegan');
});

/* ── the hard filter ──────────────────────────────────────────────────── */

test('an allergy is never planned, swapped in, or offered as a snack', () => {
  for (const allergen of ['peanuts', 'tree_nuts', 'dairy', 'eggs', 'gluten', 'soy', 'fish', 'shellfish', 'sesame']) {
    const prefs = { ...PREFS, allergens: [allergen], meals: ['breakfast', 'lunch', 'dinner', 'snacks'] };
    for (let seed = 1; seed <= 5; seed++) {
      const days = planWeek({ prefs, targetKcal: 2500, seed, locked: {} });
      for (const r of everyRecipe(days)) assert.ok(!r.allergens.includes(allergen), `${allergen} in ${r.name}`);
      for (const [d, day] of days.entries()) {
        day.items.forEach((_, i) => {
          for (const alt of alternatives(day, i, prefs, 2500, 10)) assert.ok(!alt.allergens.includes(allergen));
        });
        for (const s of snackOptions(days[d], prefs, 2500, 10)) assert.ok(!s.allergens.includes(allergen));
      }
    }
  }
});

test('diet is respected: a vegan week is all vegan, a vegetarian week has no meat or fish', () => {
  for (const r of everyRecipe(plan({ diet: 'vegan' }))) assert.equal(r.diet, 'vegan', r.name);
  for (const r of everyRecipe(plan({ diet: 'vegetarian' }))) assert.ok(['vegetarian', 'vegan'].includes(r.diet), r.name);
  for (const r of everyRecipe(plan({ diet: 'pescatarian' }))) assert.notEqual(r.diet, 'any', r.name);
});

test('a dislike removes every recipe that names it or contains it', () => {
  const days = plan({ dislikes: ['mushrooms'] });
  for (const r of everyRecipe(days)) {
    assert.ok(!`${r.name} ${r.ingredientNames.join(' ')}`.includes('mushroom'), r.name);
  }
  assert.equal(fits(RECIPE_BY_ID.d04, { ...PREFS, dislikes: ['mushroom'] }), false); // bolognese has mushrooms
});

test('the cooking-time cap holds', () => {
  for (const r of everyRecipe(plan({ cookMinutes: 15 }))) assert.ok(r.minutes <= 15, r.name);
});

/* ── the week ─────────────────────────────────────────────────────────── */

test('the same seed builds the same week', () => {
  assert.deepEqual(plan(), plan());
  assert.notDeepEqual(plan({}, 2500, 7), plan({}, 2500, 8));
});

test('one item per chosen meal, every day', () => {
  const days = plan({ meals: ['breakfast', 'dinner'] });
  assert.equal(days.length, 7);
  for (const d of days) assert.deepEqual(d.items.map((i) => i.slot), ['breakfast', 'dinner']);
});

test('a batch dinner becomes the next day’s lunch, marked leftover', () => {
  const days = plan();
  let seen = 0;
  for (let d = 0; d < 6; d++) {
    const dinner = days[d].items.find((i) => i.slot === 'dinner');
    if (dinner && RECIPE_BY_ID[dinner.recipeId].batch) {
      const lunch = days[d + 1].items.find((i) => i.slot === 'lunch');
      assert.equal(lunch.recipeId, dinner.recipeId);
      assert.equal(lunch.leftover, true);
      assert.equal(feedsTomorrow(days, d, dinner), true);
      seen++;
    }
  }
  assert.ok(seen > 0, 'seed 7 should include at least one batch dinner');
});

test('days land near a reachable target', () => {
  const days = plan({}, 2200);
  const off = days.map((d) => Math.abs(dayTotals(d).kcal - 2200));
  assert.ok(off.filter((x) => x <= 250).length >= 5, off.join(','));
});

test('a locked meal survives a rebuild with a new seed', () => {
  const days = plan();
  const dinner = days[3].items.find((i) => i.slot === 'dinner');
  const locked = { [slotKey(3, dinner)]: { recipeId: dinner.recipeId, leftover: false } };
  const rebuilt = plan({}, 2500, 99, locked);
  assert.equal(rebuilt[3].items.find((i) => i.slot === 'dinner').recipeId, dinner.recipeId);
});

test('a locked added snack survives a rebuild', () => {
  const locked = { '2-extra': { recipeId: 's02', leftover: false } };
  const rebuilt = plan({}, 2500, 5, locked);
  assert.ok(rebuilt[2].items.some((i) => i.extra && i.recipeId === 's02'));
});

/* ── short days ───────────────────────────────────────────────────────── */

test('short is said only past the larger of 100 kcal or 5%, and over is never flagged', () => {
  const day = { items: [{ slot: 'breakfast', recipeId: 'b02', leftover: false }] };
  const kcal = RECIPE_BY_ID.b02.kcal;
  assert.equal(shortBy(day, kcal + 30), 0); // 30 short: inside the band
  assert.equal(shortBy(day, kcal + 330), Math.round(330 / 10) * 10);
  assert.equal(shortBy(day, kcal - 200), 0); // over is never flagged
});

/* ── swaps ────────────────────────────────────────────────────────────── */

test('alternatives never repeat something already in the day', () => {
  const days = plan();
  const ids = new Set(days[0].items.map((i) => i.recipeId));
  for (const alt of alternatives(days[0], 0, PREFS, 2500, 10)) assert.ok(!ids.has(alt.id));
});

test('swapping a batch dinner for a non-batch one frees tomorrow’s lunch from being a leftover', () => {
  const days = plan();
  const d = days.findIndex((day, i) => i < 6 && feedsTomorrow(days, i, day.items.find((x) => x.slot === 'dinner')));
  assert.ok(d >= 0);
  const i = days[d].items.findIndex((x) => x.slot === 'dinner');
  const oldId = days[d].items[i].recipeId;
  const nonBatch = RECIPES.find((r) => r.slot === 'dinner' && !r.batch && r.id !== oldId).id;
  const out = swapMeal(days, {}, d, i, nonBatch, PREFS, 2500).days;
  assert.equal(out[d].items[i].recipeId, nonBatch);
  const lunch = out[d + 1].items.find((x) => x.slot === 'lunch');
  assert.equal(lunch.leftover, false);
  assert.notEqual(lunch.recipeId, oldId);
});

test('a lock follows the meal it was on through a swap', () => {
  const days = plan();
  const k = slotKey(0, days[0].items[0]);
  const out = swapMeal(days, { [k]: { recipeId: days[0].items[0].recipeId, leftover: false } }, 0, 0, 'b10', PREFS, 2500);
  assert.equal(out.locked[k].recipeId, 'b10');
});

test('a stored plan naming a recipe that no longer exists is not readable — it gets rebuilt', () => {
  assert.equal(planIsReadable(plan()), true);
  const bad = plan();
  bad[0].items[0] = { ...bad[0].items[0], recipeId: 'zz99' };
  assert.equal(planIsReadable(bad), false);
  assert.equal(planIsReadable(null), false);
});

test('a plan week runs Monday to Sunday, whatever day it is opened', async () => {
  const { mondayOf, weekDates, weekRange, todayIndex } = await import('../meal-planner.ts');
  assert.equal(mondayOf('2026-09-23'), '2026-09-21'); // Wednesday
  assert.equal(mondayOf('2026-09-21'), '2026-09-21'); // Monday itself
  assert.equal(mondayOf('2026-09-27'), '2026-09-21'); // Sunday belongs to the week before
  assert.equal(mondayOf('2026-11-02'), '2026-11-02'); // across the US DST change
  const dates = weekDates('2026-09-28');
  assert.equal(weekRange(dates), 'Sep 28 – Oct 4');
  assert.deepEqual(dates.map((d) => d.num), [28, 29, 30, 1, 2, 3, 4]);
  assert.equal(todayIndex(dates, '2026-10-01'), 3);
  assert.equal(todayIndex(dates, '2026-12-01'), 0);
});

test('a stored week is shown as-is only while it still matches the setup and the target', async () => {
  const { resolveWeek } = await import('../meal-planner.ts');
  const first = resolveWeek(null, PREFS, 't1', 2500, '2026-09-21');
  assert.equal(first.rebuilt, true);
  assert.equal(resolveWeek(first.week, PREFS, 't1', 2500, '2026-09-21').rebuilt, false);
  assert.equal(resolveWeek(first.week, PREFS, 't1', 2200, '2026-09-21').rebuilt, true); // target moved
  assert.equal(resolveWeek(first.week, PREFS, 't2', 2500, '2026-09-21').rebuilt, true); // setup changed
  const next = resolveWeek(first.week, PREFS, 't1', 2500, '2026-09-28'); // a new week
  assert.equal(next.rebuilt, true);
  assert.deepEqual(next.week.locked, {});
  assert.deepEqual(next.week.logged, {});
});

test('after a new allergy, a lock on a meal containing it is dropped — a lock cannot bring an allergen back', async () => {
  const { resolveWeek } = await import('../meal-planner.ts');
  const week = resolveWeek(null, PREFS, 't1', 2500, '2026-09-21').week;
  week.locked = { '0-breakfast': { recipeId: 'b04', leftover: false } }; // smoked salmon bagel: fish
  const out = resolveWeek(week, { ...PREFS, allergens: ['fish'] }, 't2', 2500, '2026-09-21').week;
  assert.deepEqual(out.locked, {});
  for (const d of out.days) for (const it of d.items) assert.ok(!RECIPE_BY_ID[it.recipeId].allergens.includes('fish'));
});
