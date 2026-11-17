/**
 * nutrition-targets-safety.test.mjs — the Targets screen's safety doors, read from its source (AI audit 2026-11-16).
 *
 * N-D2: a profile that didn't load is not a profile never filled in. The read is strict, and until it loads no
 * recommendation is calculated — the screen says so and offers Try again, with Manual still open.
 *
 * Run:  node --test --experimental-strip-types src/app/__tests__/nutrition-targets-safety.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../nutrition-targets.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('⛔ N-D2: the profile is read strictly, and a failed read is its own state', () => {
  assert.match(src, /useQuery\(\(\) => fetchNutritionProfile\(\{ strict: true \}\), \[reloads\]\)/);
  assert.match(src, /const profileFailed = profileQ\.error != null && profileQ\.data == null;/);
  assert.doesNotMatch(src, /useQuery\(fetchNutritionProfile,/, 'the lenient read (null on error) is gone');
});

test('⛔ N-D2: no recommendation is calculated while the profile has failed to load', () => {
  assert.match(src, /const rec = burn && !profileFailed[^;]*\? recommend\(facts, burn, goal, pace, todayIso\) : null;/);
  assert.match(src, /if \(profileFailed\) blocked = /);
});

test('⛔ N-D2: the failed-read card comes before every other gate, and the footer steps aside for it', () => {
  const card = src.indexOf('{profileFailed ? (');
  const gate = src.indexOf("blocker?.kind === 'under-age' ? (");
  assert.ok(card > 0 && gate > card, 'the failed-read card is checked before the under-18 gate');
  assert.match(src.slice(card, gate), /onPress=\{profileQ\.refetch\}/);
  assert.match(src, /mode === 'recommended' && \(profileFailed \|\|/);
});
