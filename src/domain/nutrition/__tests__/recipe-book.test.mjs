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

test('every shipped recipe’s calories agree with its macros (4/4/9, within 8%)', () => {
  for (const r of RECIPES.filter((x) => RECIPE_SOURCES.some((s) => s.id === x.id))) {
    const fromMacros = r.protein * 4 + r.carb * 4 + r.fat * 9;
    assert.ok(Math.abs(fromMacros - r.kcal) / r.kcal < 0.08, `${r.id}: ${r.kcal} kcal vs ${Math.round(fromMacros)} from macros`);
  }
});
