import test from 'node:test';
import assert from 'node:assert/strict';

import { RECIPES } from '../meal-planner.ts';
import { GROCERY } from '../grocery-data.ts';
import { INGREDIENTS, RECIPE_SOURCES } from '../recipes-data.ts';

/*
 * The book the APP ships — the PO's own recipes since 2026-09-24. The planner tests run on the retired
 * starter 40 (fixtures); this file guards what a real athlete is actually offered.
 */

test('every shipped recipe is well-formed', () => {
  const ids = new Set();
  for (const r of RECIPE_SOURCES) {
    assert.ok(!ids.has(r.id), `duplicate id ${r.id}`);
    ids.add(r.id);
    assert.ok(r.mealTypes.includes(r.slot), `${r.id}: mealTypes must include its slot`);
    assert.ok(r.name.trim() && r.steps.length, `${r.id}: needs a name and steps`);
    for (const [key, g] of r.ingredients) {
      assert.ok(INGREDIENTS[key], `${r.id}: unknown ingredient ${key}`);
      assert.ok(g > 0 && g < 1000, `${r.id}: ${key} at ${g} g per serving is not believable`);
      assert.ok(GROCERY[key], `${r.id}: ${key} has no Grocery List entry`);
    }
  }
});

test('every shipped recipe’s calories agree with its macros (4/4/9, fibre at 0–2, within 8%)', () => {
  for (const r of RECIPES.filter((x) => RECIPE_SOURCES.some((s) => s.id === x.id))) {
    /* Label data (USDA Branded) counts fibre anywhere from 0 cal/g (insoluble — a low-carb tortilla's
       110 cal only adds up at 0) to ~2 (soluble). So the macros give a RANGE, and the calories must sit in it. */
    const src = RECIPE_SOURCES.find((s) => s.id === r.id);
    const fiber = src.ingredients.reduce((t, [key, g]) => t + ((INGREDIENTS[key].fiber ?? 0) * g) / 100, 0);
    const low = r.protein * 4 + (r.carb - fiber) * 4 + r.fat * 9;
    const high = low + fiber * 2;
    assert.ok(r.kcal >= low * 0.92 && r.kcal <= high * 1.08, `${r.id}: ${r.kcal} kcal vs ${Math.round(low)}–${Math.round(high)} from macros`);
  }
});

test('a week saved while the book was empty is rebuilt once recipes exist', async () => {
  const { resolveWeek } = await import('../meal-planner.ts');
  const prefs = { diet: 'anything', allergens: [], dislikes: [], meals: ['breakfast', 'lunch', 'dinner', 'snacks'], cookMinutes: null, household: 1, weeklyBudgetUsd: null };
  const target = { kcal: 2400, protein: 180, carb: 240, fat: 80 };
  const empty = { weekStart: '2026-09-21', seed: 1, targetKcal: 2400, prefsUpdatedAt: 'x', days: Array.from({ length: 7 }, () => ({ items: [] })), locked: {}, logged: {} };
  const { week, rebuilt } = resolveWeek(empty, prefs, 'x', target, '2026-09-21');
  assert.equal(rebuilt, true);
  assert.ok(week.days.some((d) => d.items.length > 0), 'the rebuilt week plans from the shipped recipes');
});
