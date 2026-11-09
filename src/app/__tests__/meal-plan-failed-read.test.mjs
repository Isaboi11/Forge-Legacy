/**
 * Launch QA B13 / UX-002 — Meal Plan: a failed read (recipes or the stored week) drew a NEW week and SAVED it over
 * the athlete's real one. The screen now builds only from ONE read that came back whole and strict, says when it
 * failed (with Try again), and never sends a failed read to setup. The data half is held by
 * `src/data/__tests__/meal-plan-strict-reads.test.mjs`; this holds the screen's wiring.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../meal-plan.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('every read the week is built from is strict, and they land together', () => {
  assert.match(src, /const STRICT = \{ strict: true \} as const;/);
  const read = src.slice(src.indexOf('const planQ = useQuery('), src.indexOf('const plan = planQ.data;'));
  assert.ok(read.includes('Promise.all(['), 'one read, all or nothing');
  for (const call of [
    'fetchUserRecipes(STRICT)',
    'fetchMealPlanPrefs(STRICT)',
    'fetchNutritionProfile(STRICT)',
    'fetchTargetsOn(todayIso, STRICT)',
    'fetchMealPlanWeek(monday, STRICT)',
  ]) {
    assert.ok(read.includes(call), `${call} is part of the one read`);
  }
  assert.doesNotMatch(src, /useQuery\(fetch(UserRecipes|MealPlanPrefs|NutritionProfile)\b/, 'no lenient read of its own beside it');
  assert.doesNotMatch(src, /fetchMealPlanWeek\(monday\)/, 'the week is never read leniently');
});

test('a week is resolved — and so built and saved — only from a whole read', () => {
  assert.match(src, /const failed = !plan && planQ\.error != null;/);
  assert.match(src, /const ready = !!plan && !!prefs && gate == null && !!target;/);
  assert.match(src, /ready && plan && prefs && target \? resolveWeek\(plan\.stored, prefs, prefs\.updatedAt, target, monday\) : null/);
  assert.equal(src.match(/resolveWeek\(/g)?.length, 1, 'resolved in one place');
  assert.match(src, /if \(resolved\?\.rebuilt\) saveMealPlanWeek\(resolved\.week\)/, 'the only automatic save is of a resolved week');
});

test('a failed read is not "no setup": the redirect needs a read that answered', () => {
  assert.match(src, /if \(plan && \(!prefs \|\| gate != null \|\| !target\)\) return <Redirect href="\/meal-plan-setup" \/>;/);
  assert.doesNotMatch(src, /if \(loaded &&/);
});

test('a failed read says so, with Try again, and nothing else to tap', () => {
  const block = src.slice(src.indexOf('{failed ? ('), src.indexOf('{week && !weekEmpty ? ('));
  assert.ok(block.includes('Couldn’t load your meal plan. Nothing was changed.'));
  assert.ok(block.includes('onPress={planQ.refetch}'));
  assert.ok(block.includes('Try again'));
  /* The footer (Rebuild week, Grocery list) and every day card hang off `week`, which a failed read never has. */
  assert.match(src, /\{week \? \(\n\s+<View style=\{\[styles\.footer/);
});

test('Holt’s fill re-reads the book strictly before it rebuilds and saves the week', () => {
  const fill = src.slice(src.indexOf('const acceptFill = async'), src.indexOf('const anyEmpty ='));
  assert.ok(fill.includes('await fetchUserRecipes(STRICT);'));
  assert.ok(fill.indexOf('fetchUserRecipes(STRICT)') < fill.indexOf('rebuildWeek('), 'read first, then rebuild');
});
