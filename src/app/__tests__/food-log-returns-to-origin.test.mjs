/**
 * Launch QA 11-08, H32 — Workout Complete → Meal → log a food closed Workout Complete (`dismissAll` +
 * `replace('/nutrition')` popped the whole root stack), so unsent share choices were lost and "Post what I ate?"
 * could never be ticked.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('every screen that finishes a food log returns to its origin first, and to the diary otherwise', () => {
  for (const f of ['../food-detail.tsx', '../create-food.tsx', '../meal-photo.tsx']) {
    const src = read(f);
    assert.match(src, /if \(!finishFoodLog\(router\)\) \{\n\s+router\.dismissAll\?\.\(\);\n\s+router\.replace\('\/nutrition'\);/, f);
    assert.equal(/\n\s+router\.dismissAll\?\.\(\);\n\s+router\.replace\('\/nutrition'\);\n\s+(return|\} catch|\} finally)/.test(src), false, `${f}: no unguarded diary exit left`);
  }
});

test('Workout Complete names itself before opening Log Food, clears it when back in focus, and re-reads today', () => {
  const wc = read('../workout-complete.tsx');
  assert.match(wc, /returnFoodLogTo\(\{ pathname: '\/workout-complete', params: \{ id: String\(id\)/);
  assert.match(wc, /returnFoodLogTo\(null\);/);
  assert.match(wc, /if \(cameBack\.current && showFoodRow\) refetchToday\(\);/);
});

test('the slot is one-shot', async () => {
  const { finishFoodLog, returnFoodLogTo } = await import('../../lib/food-return.ts');
  const calls = [];
  const router = { dismissTo: (h) => calls.push(h) };
  assert.equal(finishFoodLog(router), false);
  returnFoodLogTo({ pathname: '/workout-complete', params: { id: 'w1' } });
  assert.equal(finishFoodLog(router), true);
  assert.equal(finishFoodLog(router), false, 'a second log goes to the diary');
  assert.deepEqual(calls, [{ pathname: '/workout-complete', params: { id: 'w1' } }]);
});
