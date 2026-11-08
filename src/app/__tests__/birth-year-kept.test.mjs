/**
 * Launch QA 11-08, H33 — an under-18 with a manual target could use the meal planner ("Meal plans start at 18"
 * never showed): the birth year was saved only beside a RECOMMENDED target, and an under-age year blocks that.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the year is kept as soon as it is a whole year, and with a manual target too', () => {
  const src = readFileSync(new URL('../nutrition-targets.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(src, /if \(\/\^\d\{4\}\$\/\.test\(next\)\) void saveBirthYear\(Number\(next\)\)/);
  assert.match(src, /else if \(birthYear != null\) await saveBirthYear\(birthYear\);/);
  const live = readFileSync(new URL('../../data/nutrition-live.ts', import.meta.url), 'utf8');
  assert.match(live, /update\(\{ birth_year: birthYear \}\)/);
});
