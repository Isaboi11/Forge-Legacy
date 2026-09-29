/**
 * planner-split.test.mjs — logging is free, planning is Premium (0244, PO decision "B" 2026-09-29).
 *
 * Monetization Amendment 006 §4 as corrected by MA8-D8: food logging, foods, barcode and targets on every
 * plan; the meal planner, the grocery list and building recipes in Premium. Two gates carry it —
 * `has_nutrition_access()` (any signed-in athlete) and `has_nutrition_planner()` (0237's Premium rule) —
 * and a gate that quietly swaps back is a paywall moved without anybody deciding it. Source guards, the
 * same way `preview-gate.test.mjs` pinned 0206.
 *
 * Run:  node --test --experimental-strip-types src/domain/nutrition/__tests__/planner-split.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (f) => readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
const SQL = read('supabase/migrations/0244_nutrition_free_logging.sql');
const BUNDLE = read('supabase/apply/pending-0244.sql');

/** The body of `create or replace function public.<name>()`, up to its closing `$$;`. */
const fnBody = (src, name) => {
  const a = src.indexOf(`create or replace function public.${name}()`);
  assert.ok(a >= 0, `${name}() is not defined`);
  return src.slice(a, src.indexOf('$$;', src.indexOf('as $$', a)) + 3);
};
/** The text of one `create policy <name> …;`. */
const policy = (name) => {
  const a = SQL.indexOf(`create policy ${name} `);
  assert.ok(a >= 0, `policy ${name} is not created`);
  return SQL.slice(a, SQL.indexOf(';', a));
};

test('the base gate is open to any signed-in athlete, and nothing else', () => {
  const body = fnBody(SQL, 'has_nutrition_access');
  assert.match(body, /select auth\.uid\(\) is not null;/);
  assert.ok(!/athlete_tier|nutrition_preview/.test(body), 'the base gate must not carry the Premium rule');
});

test('the planner gate is the Premium rule: the allowlist OR a PREMIUM tier', () => {
  const body = fnBody(SQL, 'has_nutrition_planner');
  assert.match(body, /auth\.uid\(\) is not null/);
  assert.match(body, /nutrition_preview/);
  assert.match(body, /athlete_tier\(auth\.uid\(\)\) = 'PREMIUM'/);
  assert.match(SQL, /revoke all on function public\.has_nutrition_planner\(\) from public;/);
});

test('the meal planner and grocery list sit on the planner gate', () => {
  for (const p of ['meal_plan_prefs_owner_all', 'meal_plan_weeks_owner_all']) {
    const text = policy(p);
    assert.equal((text.match(/has_nutrition_planner\(\)/g) ?? []).length, 2, `${p}: using AND with check`);
    assert.ok(!/has_nutrition_access/.test(text), `${p} must not fall back to the free gate`);
  }
});

test('recipes: reading is free (saved recipes still log), writing is Premium', () => {
  assert.match(SQL, /drop policy if exists user_recipes_owner_all on public\.user_recipes;/);
  assert.ok(!/create policy user_recipes_owner_all /.test(SQL), 'the old for-all policy must not come back');
  const sel = policy('user_recipes_owner_select');
  assert.match(sel, /for select/);
  assert.match(sel, /has_nutrition_access\(\)/);
  for (const p of ['user_recipes_owner_insert', 'user_recipes_owner_update', 'user_recipes_owner_delete']) {
    const text = policy(p);
    assert.match(text, /has_nutrition_planner\(\)/, p);
    assert.ok(!/has_nutrition_access/.test(text), `${p} must not be on the free gate`);
  }
});

test('my_entitlement() is 0206\'s body plus nutritionPlanner, and the bundle carries §1 verbatim', () => {
  const b0206 = fnBody(read('supabase/migrations/0206_nutrition_preview_gate.sql'), 'my_entitlement').split('\n');
  const b0244 = fnBody(SQL, 'my_entitlement').split('\n');
  const added = b0244.filter((l) => !b0206.includes(l));
  assert.deepEqual(
    added.map((l) => l.trim()),
    ['-- 0244 — the Premium part of Nutrition (meal planner, grocery, creating recipes).', "'nutritionPlanner', public.has_nutrition_planner(),"],
  );
  assert.equal(b0244.length, b0206.length + 2, 'nothing else in the body may change');
  const s1 = SQL.slice(SQL.indexOf('begin;'), SQL.indexOf('commit;') + 7);
  assert.ok(BUNDLE.includes(s1), 'pending-0244.sql §1 is not the migration verbatim');
});

test('the app reads the flag fail-closed, falling back to 0237 only when the key is absent', () => {
  const live = read('src/data/entitlement-live.ts');
  assert.match(live, /nutritionPlanner: d\.nutritionPlanner === undefined \? d\.nutrition === true : d\.nutritionPlanner === true,/);
  assert.match(read('src/lib/entitlement.tsx'), /status === 'ready' && snapshot\?\.nutritionPlanner === true/);
});

test('every planner screen is behind the gate, and the tab\'s doors ask the planner flag', () => {
  for (const f of ['meal-plan', 'meal-plan-setup', 'grocery-list', 'my-recipes', 'recipe']) {
    const src = read(`src/app/${f}.tsx`);
    const exp = src.slice(src.indexOf('export default function'));
    assert.match(exp, /<NutritionPlannerGate what="[^"]+">/, `${f}: the default export must be wrapped`);
    assert.equal((src.match(/export default function/g) ?? []).length, 1, `${f}: one default export`);
  }
  const tab = read('src/app/(tabs)/nutrition.tsx');
  assert.match(tab, /if \(!planner\) \{ router\.push\('\/subscription'\); return; \}/);
  assert.match(tab, /planner \? addGo\(\{ pathname: '\/my-recipes'/);
});

test('importing a recipe from a link is Premium on the server too', () => {
  const fn = read('supabase/functions/recipe-link-read/index.ts');
  const at = (s) => fn.indexOf(s);
  assert.ok(at(".rpc('has_nutrition_planner')") >= 0);
  assert.ok(at(".rpc('has_nutrition_planner')") < at('await fetchPage(target.url)'));
  assert.ok(read('supabase/apply/deploy-recipe-link-read.ts').includes(".rpc('has_nutrition_planner')"), 'regenerate the paste copy');
});
