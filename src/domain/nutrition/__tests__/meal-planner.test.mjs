import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_LEFTOVERS,
  RECIPE_BY_ID,
  RECIPES,
  addSnack,
  alternatives,
  cooksOf,
  dayTotals,
  feedsDay,
  fits,
  fitsSlot,
  itemTotals,
  keptLocks,
  logKey,
  mondayOf,
  planIsReadable,
  planWeek,
  portionLabel,
  rebuildWeek,
  resolveWeek,
  shortBy,
  slotKey,
  slotShares,
  snackOptions,
  swapMeal,
  toggleLock,
  todayIndex,
  weekDates,
  weekRange,
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
const TARGET = { kcal: 2500, protein: 180, carb: 270, fat: 80 };
const plan = (over = {}, target = TARGET, seed = 7, locked = {}) =>
  planWeek({ prefs: { ...PREFS, ...over }, target, seed, locked });
const cooked = (days) => days.flatMap((d) => d.items.filter((it) => !it.leftover).map((it) => RECIPE_BY_ID[it.recipeId]));
const everyRecipe = (days) => days.flatMap((d) => d.items.map((it) => RECIPE_BY_ID[it.recipeId]));
const ALL_ALLERGENS = ['peanuts', 'tree_nuts', 'dairy', 'eggs', 'gluten', 'soy', 'fish', 'shellfish', 'sesame'];
const dinnerOf = (day) => day.items.find((x) => x.slot === 'dinner');
const feedingDay = (days) => days.findIndex((day, i) => dinnerOf(day) && feedsDay(days, i, dinnerOf(day)) != null);

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

test('every recipe lists its own slot among its meal types, and has steps', () => {
  for (const src of RECIPE_SOURCES) {
    assert.ok(src.mealTypes.includes(src.slot), src.id);
    assert.ok(src.steps.length >= 1, src.id);
  }
});

test('a portion scales a meal’s numbers', () => {
  assert.equal(itemTotals({ recipeId: 'd02', portion: 1.5 }).kcal, Math.round(RECIPE_BY_ID.d02.kcal * 1.5));
});

/* ── tags derived from ingredients ────────────────────────────────────── */

test('allergens are derived from ingredients — soy sauce makes a dish soy AND gluten', () => {
  assert.deepEqual(RECIPE_BY_ID.l07.allergens, ['gluten', 'soy', 'shellfish', 'sesame']);
  assert.deepEqual(RECIPE_BY_ID.b04.allergens, ['dairy', 'gluten', 'fish', 'sesame']);
});

test('diet is derived: meat → any, fish → pescatarian, dairy/egg/honey → vegetarian, else vegan', () => {
  assert.equal(RECIPE_BY_ID.d02.diet, 'any');
  assert.equal(RECIPE_BY_ID.d01.diet, 'pescatarian');
  assert.equal(RECIPE_BY_ID.b01.diet, 'vegetarian');
  assert.equal(RECIPE_BY_ID.d05.diet, 'vegan');
});

/* ── hard filters: never broken ───────────────────────────────────────── */

test('an allergy is never planned — cooked, leftover, swapped in or offered as a snack', () => {
  for (const allergen of ALL_ALLERGENS) {
    const prefs = { ...PREFS, allergens: [allergen], meals: ['breakfast', 'lunch', 'dinner', 'snacks'] };
    for (let seed = 1; seed <= 4; seed++) {
      const days = planWeek({ prefs, target: TARGET, seed, locked: {} });
      for (const r of everyRecipe(days)) assert.ok(!r.allergens.includes(allergen), `${allergen} in ${r.name}`);
      for (let d = 0; d < 7; d++) {
        days[d].items.forEach((_, i) => {
          for (const o of alternatives(days, d, i, prefs, TARGET, 10)) assert.ok(!o.recipe.allergens.includes(allergen));
        });
        for (const o of snackOptions(days, d, prefs, TARGET, 10)) assert.ok(!o.recipe.allergens.includes(allergen));
      }
    }
  }
});

test('diet is respected everywhere in the week', () => {
  for (const r of everyRecipe(plan({ diet: 'vegan' }))) assert.equal(r.diet, 'vegan', r.name);
  for (const r of everyRecipe(plan({ diet: 'vegetarian' }))) assert.ok(['vegetarian', 'vegan'].includes(r.diet), r.name);
  for (const r of everyRecipe(plan({ diet: 'pescatarian' }))) assert.notEqual(r.diet, 'any', r.name);
});

test('a dislike matches INGREDIENTS, not the recipe name', () => {
  assert.equal(fits(RECIPE_BY_ID.d04, { ...PREFS, dislikes: ['mushrooms'] }), false); // bolognese contains mushrooms
  for (const r of everyRecipe(plan({ dislikes: ['mushrooms'] }))) {
    assert.ok(!r.ingredientNames.some((n) => n.includes('mushroom')), r.name);
  }
  /* "shawarma" names a dish, not an ingredient — disliking the word removes nothing. */
  assert.equal(fits(RECIPE_BY_ID.l01, { ...PREFS, dislikes: ['shawarma'] }), true);
});

test('the cook-time cap holds for every cooked meal', () => {
  for (const r of cooked(plan({ cookMinutes: 15 }))) assert.ok(r.minutes <= 15, r.name);
});

test('a recipe only fills a slot in its meal types', () => {
  for (const d of plan({ meals: ['breakfast', 'lunch', 'dinner', 'snacks'] })) {
    for (const it of d.items) if (!it.leftover) assert.ok(RECIPE_BY_ID[it.recipeId].mealTypes.includes(it.slot), it.recipeId);
  }
  assert.equal(fitsSlot(RECIPE_BY_ID.l08, 'dinner', PREFS), true); // burrito bowl: lunch or dinner
  assert.equal(fitsSlot(RECIPE_BY_ID.d06, 'lunch', PREFS), false);
});

/* ── targets ──────────────────────────────────────────────────────────── */

test('slot shares follow the table, and sum to the whole day', () => {
  assert.deepEqual(slotShares(['breakfast', 'lunch', 'dinner']), { breakfast: 0.28, lunch: 0.34, dinner: 0.38 });
  assert.deepEqual(slotShares(['lunch', 'dinner']), { lunch: 0.45, dinner: 0.55 });
  const odd = slotShares(['breakfast', 'snacks']);
  assert.ok(Math.abs(Object.values(odd).reduce((a, b) => a + b, 0) - 1) < 1e-9);
});

test('most days land inside the ±5% calorie band across a range of targets', () => {
  for (const kcal of [1800, 2200, 2600, 3000]) {
    const t = { kcal, protein: Math.round((kcal * 0.3) / 4), carb: Math.round((kcal * 0.45) / 4), fat: Math.round((kcal * 0.25) / 9) };
    const days = plan({ meals: ['breakfast', 'lunch', 'dinner', 'snacks'] }, t, 3);
    const inBand = days.filter((d) => Math.abs(dayTotals(d).kcal - kcal) / kcal <= 0.05).length;
    assert.ok(inBand >= 5, `${kcal}: ${days.map((d) => dayTotals(d).kcal).join(',')}`);
  }
});

test('portions scale down for a low target instead of overshooting it', () => {
  const t = { kcal: 1600, protein: 120, carb: 170, fat: 50 };
  const days = plan({}, t, 5);
  assert.ok(days.some((d) => d.items.some((it) => it.portion < 1)));
  const over = days.filter((d) => dayTotals(d).kcal > 1600 * 1.1).length;
  assert.ok(over <= 1, days.map((d) => dayTotals(d).kcal).join(','));
});

test('protein reaches 90% of target on most days when the library allows it', () => {
  const days = plan({ meals: ['breakfast', 'lunch', 'dinner', 'snacks'] }, { kcal: 2500, protein: 150, carb: 280, fat: 80 }, 9);
  const ok = days.filter((d) => dayTotals(d).protein >= 135).length;
  assert.ok(ok >= 5, days.map((d) => dayTotals(d).protein).join(','));
});

test('short is said only below the ±5% band, and over is never flagged', () => {
  const day = { items: [{ slot: 'breakfast', recipeId: 'b02', portion: 1, leftover: false }] };
  const kcal = RECIPE_BY_ID.b02.kcal;
  assert.equal(shortBy(day, Math.round(kcal / 0.97)), 0); // 3% short: inside the band
  assert.equal(shortBy(day, kcal + 330), 330);
  assert.equal(shortBy(day, kcal - 200), 0);
});

/* ── variety ──────────────────────────────────────────────────────────── */

test('with a full library: no lunch or dinner cooked twice unless it says so, no protein twice in a day', () => {
  for (let seed = 1; seed <= 5; seed++) {
    const days = plan({}, TARGET, seed);
    const counts = {};
    for (const d of days) {
      const proteins = d.items
        .filter((it) => !it.leftover)
        .map((it) => RECIPE_BY_ID[it.recipeId].proteinSource)
        .filter((p) => p !== 'mixed');
      assert.equal(new Set(proteins).size, proteins.length, `seed ${seed}: ${proteins}`);
      for (const it of d.items) if (!it.leftover && it.slot !== 'breakfast') counts[it.recipeId] = (counts[it.recipeId] ?? 0) + 1;
    }
    for (const [id, n] of Object.entries(counts)) {
      const flagged = days.some((d) => d.items.some((it) => it.recipeId === id && it.repeated));
      assert.ok(n === 1 || flagged, `seed ${seed}: ${id} cooked ${n}× without saying so`);
    }
  }
});

test('breakfast may repeat, but not past 3 times unless it says so', () => {
  const days = plan({ cookMinutes: 15 });
  const counts = {};
  for (const d of days) for (const it of d.items) if (it.slot === 'breakfast') counts[it.recipeId] = (counts[it.recipeId] ?? 0) + 1;
  for (const [id, n] of Object.entries(counts)) {
    if (n > 3) assert.ok(days.some((d) => d.items.some((it) => it.recipeId === id && it.repeated)), id);
  }
});

test('when the library runs dry, it REPEATS AND SAYS SO rather than leaving a hole', () => {
  // vegan + soy allergy: only a handful of lunches and dinners fit, so a week must repeat
  const days = plan({ diet: 'vegan', allergens: ['soy'] });
  const cookedMains = days.flatMap((d) => d.items.filter((it) => !it.leftover && (it.slot === 'lunch' || it.slot === 'dinner')));
  assert.equal(days.filter((d) => d.items.some((it) => it.slot === 'dinner')).length, 7, 'no empty dinners');
  const seen = new Set();
  let repeats = 0;
  for (const it of cookedMains) {
    if (seen.has(it.recipeId)) {
      repeats++;
      assert.ok(it.repeated, `${it.recipeId} repeated without saying so`);
    }
    seen.add(it.recipeId);
  }
  assert.ok(repeats > 0, 'this setup has too few recipes not to repeat');
});

test('a slot with no recipe at all stays empty rather than breaking a rule', () => {
  // vegan, no soy, no sesame, 20 minutes: nothing in the starter library fits lunch or dinner
  const days = plan({ diet: 'vegan', allergens: ['soy', 'sesame'], cookMinutes: 20 });
  for (const d of days) assert.ok(!d.items.some((it) => it.slot === 'lunch' || it.slot === 'dinner'));
});

test('a slot nothing fits at all is left empty, never filled with a refused recipe', () => {
  const days = plan({ diet: 'vegan', allergens: ALL_ALLERGENS, cookMinutes: 15 });
  for (const r of everyRecipe(days)) {
    assert.equal(r.diet, 'vegan');
    assert.deepEqual(r.allergens, []);
  }
});

/* ── leftovers and cooks ──────────────────────────────────────────────── */

test('leftovers: from dinners that keep, labelled with where they came from, at most 4 a week', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const days = plan({}, TARGET, seed);
    const lefts = days.flatMap((d, e) => d.items.filter((it) => it.leftover).map((it) => ({ ...it, e })));
    assert.ok(lefts.length <= MAX_LEFTOVERS, `seed ${seed}: ${lefts.length}`);
    for (const l of lefts) {
      assert.equal(l.slot, 'lunch');
      assert.ok(l.cookDay != null && l.cookDay < l.e, 'cooked before it is eaten');
      const r = RECIPE_BY_ID[l.recipeId];
      assert.ok(r.keeps && l.e - l.cookDay <= r.leftoverDays, `${r.name} kept ${l.e - l.cookDay} days`);
      const source = dinnerOf(days[l.cookDay]);
      assert.equal(source.recipeId, l.recipeId);
      assert.equal(feedsDay(days, l.cookDay, source), l.e);
    }
  }
});

test('a cook feeding a leftover prepares for both meals: household × portion × 2', () => {
  const days = plan({}, TARGET, 7);
  const cooks = cooksOf(days, 2);
  const withLeftover = cooks.find((c) => c.feeds != null);
  assert.ok(withLeftover);
  const it = days[withLeftover.d].items.find((x) => x.slot === withLeftover.slot && !x.leftover);
  assert.equal(withLeftover.servingsCooked, 2 * it.portion * 2);
  const leftoverMeals = days.flatMap((d) => d.items.filter((x) => x.leftover)).length;
  assert.equal(cooks.length + leftoverMeals, days.reduce((t, d) => t + d.items.length, 0));
});

/* ── locks, swaps, rebuild ────────────────────────────────────────────── */

test('a locked meal survives a rebuild with a new seed', () => {
  const days = plan();
  const i = days[3].items.findIndex((x) => x.slot === 'breakfast');
  const locked = toggleLock(days, {}, 3, i);
  const rebuilt = plan({}, TARGET, 99, locked);
  assert.equal(rebuilt[3].items.find((x) => x.slot === 'breakfast').recipeId, days[3].items[i].recipeId);
});

test('locking a dinner that feeds a leftover locks the leftover too — and unlocking frees both', () => {
  const days = plan();
  const d = feedingDay(days);
  assert.ok(d >= 0);
  const i = days[d].items.findIndex((x) => x.slot === 'dinner');
  const fed = feedsDay(days, d, days[d].items[i]);
  const locked = toggleLock(days, {}, d, i);
  assert.ok(locked[`${d}-dinner`] && locked[`${fed}-lunch`]);
  assert.deepEqual(toggleLock(days, locked, d, i), {});
});

test('logged meals are frozen: a rebuild keeps them where they were', () => {
  const week = resolveWeek(null, PREFS, 't', TARGET, '2026-09-21').week;
  const it = week.days[2].items[0];
  week.logged = { [logKey(2, it)]: 'entry-1' };
  const out = rebuildWeek(week, PREFS, TARGET);
  assert.equal(out.days[2].items.find((x) => x.slot === it.slot).recipeId, it.recipeId);
  assert.ok(keptLocks(week, PREFS)[slotKey(2, it)]);
});

test('swapping a dinner that feeds a leftover updates the leftover — or frees it if the new one doesn’t keep', () => {
  const days = plan();
  const d = feedingDay(days);
  const i = days[d].items.findIndex((x) => x.slot === 'dinner');
  const fed = feedsDay(days, d, days[d].items[i]);
  const keeper = RECIPES.find(
    (r) => r.mealTypes.includes('dinner') && r.keeps && r.leftoverDays >= fed - d && r.id !== days[d].items[i].recipeId,
  );
  const out1 = swapMeal(days, {}, d, i, { recipeId: keeper.id, portion: 1 }, PREFS, TARGET).days;
  assert.equal(out1[fed].items.find((x) => x.slot === 'lunch').recipeId, keeper.id);
  const nonKeeper = RECIPES.find((r) => r.mealTypes.includes('dinner') && !r.keeps);
  const out2 = swapMeal(days, {}, d, i, { recipeId: nonKeeper.id, portion: 1 }, PREFS, TARGET).days;
  assert.equal(out2[fed].items.find((x) => x.slot === 'lunch').leftover, false);
});

test('alternatives never repeat something already in the day, and carry a sensible portion', () => {
  const days = plan();
  const ids = new Set(days[0].items.map((i) => i.recipeId));
  for (const o of alternatives(days, 0, 0, PREFS, TARGET, 10)) {
    assert.ok(!ids.has(o.recipe.id));
    assert.ok([0.75, 1, 1.25, 1.5].includes(o.portion));
  }
});

test('adding a snack replaces an earlier added snack on that day', () => {
  const days = plan();
  const [a, b] = snackOptions(days, 1, PREFS, TARGET, 2);
  const twice = addSnack(addSnack(days, 1, a), 1, b);
  assert.equal(twice[1].items.filter((x) => x.extra).length, 1);
  assert.equal(twice[1].items.find((x) => x.extra).recipeId, b.recipe.id);
});

/* ── the stored week ──────────────────────────────────────────────────── */

test('the same seed builds the same week', () => {
  assert.deepEqual(plan(), plan());
  assert.notDeepEqual(plan({}, TARGET, 7), plan({}, TARGET, 8));
});

test('a stored week is shown as-is only while it still matches the setup and the target', () => {
  const first = resolveWeek(null, PREFS, 't1', TARGET, '2026-09-21');
  assert.equal(first.rebuilt, true);
  assert.equal(resolveWeek(first.week, PREFS, 't1', TARGET, '2026-09-21').rebuilt, false);
  assert.equal(resolveWeek(first.week, PREFS, 't1', { ...TARGET, kcal: 2200 }, '2026-09-21').rebuilt, true);
  assert.equal(resolveWeek(first.week, PREFS, 't2', TARGET, '2026-09-21').rebuilt, true);
  const next = resolveWeek(first.week, PREFS, 't1', TARGET, '2026-09-28');
  assert.equal(next.rebuilt, true);
  assert.deepEqual(next.week.locked, {});
  assert.deepEqual(next.week.logged, {});
});

test('after a new allergy, a lock on a meal containing it is dropped — a lock cannot bring an allergen back', () => {
  const week = resolveWeek(null, PREFS, 't1', TARGET, '2026-09-21').week;
  week.locked = { '0-breakfast': { recipeId: 'b04', leftover: false, portion: 1 } };
  const out = resolveWeek(week, { ...PREFS, allergens: ['fish'] }, 't2', TARGET, '2026-09-21').week;
  assert.deepEqual(out.locked, {});
  for (const d of out.days) for (const it of d.items) assert.ok(!RECIPE_BY_ID[it.recipeId].allergens.includes('fish'));
});

test('a stored plan from an older shape (no portions) or naming a missing recipe is rebuilt', () => {
  assert.equal(planIsReadable(plan()), true);
  const old = plan().map((d) => ({ items: d.items.map(({ portion: _p, ...rest }) => rest) }));
  assert.equal(planIsReadable(old), false);
  const bad = plan();
  bad[0].items[0] = { ...bad[0].items[0], recipeId: 'zz99' };
  assert.equal(planIsReadable(bad), false);
});

/* ── dates and labels ─────────────────────────────────────────────────── */

test('a plan week runs Monday to Sunday, whatever day it is opened', () => {
  assert.equal(mondayOf('2026-09-23'), '2026-09-21');
  assert.equal(mondayOf('2026-09-21'), '2026-09-21');
  assert.equal(mondayOf('2026-09-27'), '2026-09-21');
  assert.equal(mondayOf('2026-11-02'), '2026-11-02');
  const dates = weekDates('2026-09-28');
  assert.equal(weekRange(dates), 'Sep 28 – Oct 4');
  assert.deepEqual(dates.map((d) => d.num), [28, 29, 30, 1, 2, 3, 4]);
  assert.equal(todayIndex(dates, '2026-10-01'), 3);
  assert.equal(todayIndex(dates, '2026-12-01'), 0);
});

test('portions read like a cook says them', () => {
  assert.equal(portionLabel(1), '1 serving');
  assert.equal(portionLabel(1.25), '1¼ servings');
  assert.equal(portionLabel(0.75), '¾ serving');
  assert.equal(portionLabel(1.5), '1½ servings');
});

/* ── coverage report (Rules §4) ───────────────────────────────────────── */

test('coverage: every Diet × single allergy × time — slots with fewer than 3 options are reported', () => {
  const gaps = [];
  for (const diet of ['anything', 'vegetarian', 'vegan', 'pescatarian'])
    for (const allergen of [null, ...ALL_ALLERGENS])
      for (const cookMinutes of [15, 30, 45, null])
        for (const slot of ['breakfast', 'lunch', 'dinner', 'snacks']) {
          const p = { ...PREFS, diet, allergens: allergen ? [allergen] : [], cookMinutes };
          const n = RECIPES.filter((r) => fitsSlot(r, slot, p)).length;
          if (n < 3) gaps.push(`${diet}/${allergen ?? 'none'}/${cookMinutes ?? 'any'}/${slot}:${n}`);
        }
  const anything30 = ['breakfast', 'lunch', 'dinner', 'snacks'].map(
    (slot) => RECIPES.filter((r) => fitsSlot(r, slot, { ...PREFS, cookMinutes: 30 })).length,
  );
  assert.ok(anything30.every((n) => n >= 6), `Anything · 30 min: ${anything30}`);
  console.log(`coverage gaps (${gaps.length} of 640 combinations):`, gaps.join(' '));
});
