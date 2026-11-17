// node --experimental-strip-types --test src/domain/nutrition/__tests__/food-search-local.test.mjs
//
// NU-2 (AI Road to 10 Sprint 3a): while food-search is out (1.7–4.9 s), Log Food lists what the phone already holds —
// your own foods (My Foods, Recent, Favourites) and a shorter query's answer narrowed — and the services are asked
// only after a pause in typing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { FOOD_SEARCH_PAUSE_MS, localWhileSearching, matchesTyped, narrowEarlierSearch, OWN_MATCHES_MAX } from '../food-search-local.ts';

const food = (key, name, brand = null) => ({ key, source: 'usda', name, brand, kcal100: 100, protein100: 1, carb100: 1, fat100: 1, servings: [], attribution: null });

test('every typed word must appear in the name or brand — partial last word included', () => {
  assert.equal(matchesTyped('chick bre', 'Chicken Breast'), true);
  assert.equal(matchesTyped('costa ranch', 'Tomatillo Ranch Dressing', 'Costa Vida'), true);
  assert.equal(matchesTyped('chicken thigh', 'Chicken Breast'), false);
  assert.equal(matchesTyped('   ', 'Anything'), false);
});

test('a shorter query already held is narrowed to what is typed now; the longest held prefix wins', () => {
  const held = new Map([
    ['chicken', [food('usda:1', 'Chicken Breast'), food('usda:2', 'Chicken Thigh'), food('fs:3', 'Chicken Burrito', 'Costa Vida')]],
    ['ch', [food('usda:9', 'Cheddar')]],
  ]);
  const peek = (q) => held.get(q.trim().toLowerCase()) ?? null;
  assert.deepEqual(narrowEarlierSearch('chicken b', peek).map((f) => f.key), ['usda:1', 'fs:3']);
  // Nothing in the held answer fits → null, so "Searching…" stands alone instead of a list that says nothing.
  assert.equal(narrowEarlierSearch('chicken wing', peek), null);
  // Nothing held at all.
  assert.equal(narrowEarlierSearch('salmon', peek), null);
  // The query itself is never "earlier" — that is the screen's own cache hit, handled before this.
  assert.equal(narrowEarlierSearch('ch', peek), null);
});

test('own foods first (My Foods → Recent → Favourites), one row per food, capped; then the earlier answer', () => {
  const mine = [food('custom:a', 'Egg Bites')];
  const recents = [{ key: 'usda:e', name: 'Eggs, scrambled', brand: null }, { key: 'custom:a', name: 'Egg Bites', brand: null }];
  const favorites = [{ key: 'off:z', name: 'Egg Whites', brand: 'Kirkland' }, { key: 'off:y', name: 'Oats', brand: null }];
  const earlier = [food('usda:e', 'Eggs, scrambled'), food('usda:f', 'Egg, boiled')];
  const hits = localWhileSearching('egg', { mine, recents, favorites, earlier });
  assert.deepEqual(hits.map((h) => `${h.from}:${h.item.key}`), ['mine:custom:a', 'recent:usda:e', 'favorite:off:z', 'earlier:usda:f']);

  const many = Array.from({ length: 9 }, (_, i) => food(`custom:${i}`, `Egg ${i}`));
  assert.equal(localWhileSearching('egg', { mine: many }).length, OWN_MATCHES_MAX);
});

test('Log Food: own foods + the narrowed earlier answer while searching, and the services only after the pause', () => {
  const src = readFileSync(new URL('../../../app/log-food.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(src, /narrowEarlierSearch\(localFor, peekFoodSearch\)/);
  assert.match(src, /localWhileSearching\(localFor, \{ mine: myFoods, recents, favorites, earlier \}\)/);
  assert.match(src, /\}, FOOD_SEARCH_PAUSE_MS\);/);
  assert.ok(FOOD_SEARCH_PAUSE_MS >= 350 && FOOD_SEARCH_PAUSE_MS <= 800);
});
