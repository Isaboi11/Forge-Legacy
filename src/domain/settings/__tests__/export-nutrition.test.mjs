import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  FOOD_LOG_HEADERS,
  addDays,
  hasNutrition,
  nutritionCsvFiles,
  toZipEntries,
} from '../export-nutrition.ts';
import { crc32, zipStore } from '../zip.ts';

/**
 * Export My Data, nutrition half. Two failures matter: a file that reads as "you logged nothing" when
 * there was data, and a ZIP that the phone calls damaged. The second is checked with a real unzip
 * (Python's zipfile, which verifies every CRC), not with this repo's own reader.
 */

const empty = () => ({ entries: [], targets: [], foods: [], meals: [], recipes: [], weeks: [] });

const full = () => ({
  entries: [
    {
      loggedOn: '2026-09-22',
      meal: 'breakfast',
      name: 'Greek yogurt, plain',
      brand: 'Fage, "Total"',
      servingLabel: '1 cup',
      quantity: 1.5,
      grams: 340,
      kcal: 220,
      protein: 30,
      carb: 12,
      fat: 5,
      source: 'usda',
    },
    { loggedOn: '2026-09-22', meal: 'snacks', name: 'Quick add', brand: null, servingLabel: null, quantity: 1, grams: null, kcal: 150, protein: 0, carb: 0, fat: 0, source: 'quick' },
  ],
  targets: [{ effectiveFrom: '2026-09-01', method: 'recommended', kcal: 2600, proteinG: 180, carbG: 280, fatG: 80, weightLb: 185 }],
  foods: [{ name: 'Mom’s chili', brand: null, gtin: null, kcal100: 120, protein100: 9, carb100: 10, fat100: 5, servings: [{ label: '1 bowl', grams: 300 }, { label: '1 serving', grams: null }] }],
  meals: [
    { name: 'Post-lift shake', items: [{ name: 'Whey', brand: null, servingLabel: '1 scoop', quantity: 2, kcal: 240, protein: 48, carb: 6, fat: 3 }] },
    { name: 'Empty meal', items: [] },
  ],
  recipes: [
    {
      id: 'u:abc',
      name: 'Egg bowl',
      mealTypes: ['breakfast', 'lunch'],
      minutes: 15,
      yield: 2,
      ingredients: [{ key: 'avocado', g: 136 }, { key: 'not_a_real_key', g: 50 }],
      allergens: ['eggs'],
      confirmed: true,
      steps: ['Crack the eggs.', 'Cook, stirring,\nthen serve.'],
      usePlan: true,
    },
  ],
  weeks: [
    {
      weekStart: '2026-09-21',
      days: [
        { items: [{ slot: 'breakfast', recipeId: 'u:abc', portion: 1.25, leftover: false }] },
        { items: [{ slot: 'lunch', recipeId: 'u:abc', portion: 1, leftover: true }, { slot: 'snacks', recipeId: 'builtin-1', extra: true }] },
      ],
      groceryExtras: [
        { name: 'Paper towels', inCart: true },
        { name: 'Coffee', inCart: false },
      ],
    },
  ],
});

const byName = (files) => Object.fromEntries(files.map((f) => [f.name, f.text]));
const lines = (text) => text.split('\r\n').filter(Boolean);

test('no food data at all → hasNutrition is false (the export stays the plain workout CSV)', () => {
  assert.equal(hasNutrition(empty()), false);
});

test('any single kind of food data → hasNutrition is true', () => {
  for (const k of ['entries', 'targets', 'foods', 'meals', 'recipes', 'weeks']) {
    const n = empty();
    n[k] = full()[k];
    assert.equal(hasNutrition(n), true, k);
  }
});

test('every nutrition file is present even when empty — headings, no rows', () => {
  const files = nutritionCsvFiles(empty(), () => null);
  assert.deepEqual(
    files.map((f) => f.name),
    ['food-log.csv', 'nutrition-targets.csv', 'my-foods.csv', 'my-meals.csv', 'my-recipes.csv', 'meal-plans.csv', 'grocery-items-i-added.csv'],
  );
  for (const f of files) assert.equal(lines(f.text).length, 1, f.name);
});

test('food log: one row per entry, commas and quotes escaped, source named for a person', () => {
  const t = byName(nutritionCsvFiles(full(), () => null))['food-log.csv'];
  const l = lines(t);
  assert.equal(l[0], FOOD_LOG_HEADERS.join(','));
  assert.equal(l[1], '2026-09-22,Breakfast,"Greek yogurt, plain","Fage, ""Total""",1 cup,1.5,340,220,30,12,5,USDA');
  assert.equal(l[2], '2026-09-22,Snacks,Quick add,,,1,,150,0,0,0,Quick add');
});

test('targets, my foods, my meals (an empty meal still gets its row)', () => {
  const f = byName(nutritionCsvFiles(full(), () => null));
  assert.equal(lines(f['nutrition-targets.csv'])[1], '2026-09-01,Recommended,2600,180,280,80,185');
  assert.equal(lines(f['my-foods.csv'])[1], 'Mom’s chili,,,120,9,10,5,1 bowl (300 g); 1 serving');
  const meals = lines(f['my-meals.csv']);
  assert.equal(meals[1], 'Post-lift shake,Whey,,1 scoop,2,240,48,6,3');
  assert.equal(meals[2], 'Empty meal,,,,,,,,');
});

test('recipes: ingredient rows by name (unknown key falls back to the key), then numbered steps', () => {
  const r = byName(nutritionCsvFiles(full(), () => null))['my-recipes.csv'];
  const head = 'Egg bowl,Breakfast; Lunch,15,2,eggs,Yes,Yes';
  assert.ok(r.includes(`${head},Ingredient,Avocado,136\r\n`));
  assert.ok(r.includes(`${head},Ingredient,not_a_real_key,50\r\n`));
  assert.ok(r.includes(`${head},Step 1,Crack the eggs.,\r\n`));
  assert.ok(r.includes(`${head},Step 2,"Cook, stirring,\nthen serve.",\r\n`));
});

test('meal plans: real dates from the week start, recipe names resolved, own recipe before built-in', () => {
  const p = lines(byName(nutritionCsvFiles(full(), (id) => (id === 'builtin-1' ? 'Apple + almonds' : null)))['meal-plans.csv']);
  assert.equal(p[1], '2026-09-21,2026-09-21,Breakfast,Egg bowl,1.25,No');
  assert.equal(p[2], '2026-09-21,2026-09-22,Lunch,Egg bowl,1,Yes');
  assert.equal(p[3], '2026-09-21,2026-09-22,Snack (added),Apple + almonds,1,No');
});

test('meal plans: a recipe no one can name still shows its id, never a blank', () => {
  const p = lines(byName(nutritionCsvFiles(full(), () => null))['meal-plans.csv']);
  assert.equal(p[3], '2026-09-21,2026-09-22,Snack (added),builtin-1,1,No');
});

test('grocery: the athlete’s own items with cart state', () => {
  const g = lines(byName(nutritionCsvFiles(full(), () => null))['grocery-items-i-added.csv']);
  assert.deepEqual(g.slice(1), ['2026-09-21,Paper towels,Yes', '2026-09-21,Coffee,No']);
});

test('addDays crosses month and year ends and a DST weekend by calendar', () => {
  assert.equal(addDays('2026-09-28', 6), '2026-10-04');
  assert.equal(addDays('2026-12-28', 6), '2027-01-03');
  assert.equal(addDays('2026-11-01', 1), '2026-11-02');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});

test('crc32 matches the published check value', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('the ZIP opens in a real unzip, every CRC verifies, and the files come back byte for byte', () => {
  const files = [{ name: 'workouts.csv', text: 'Date,Workout\r\n2026-09-22,"Push, heavy"\r\n' }, ...nutritionCsvFiles(full(), () => null)];
  const zip = zipStore(toZipEntries(files), new Date(2026, 8, 24, 14, 30, 10));
  const dir = mkdtempSync(join(tmpdir(), 'fl-zip-'));
  const path = join(dir, 'export.zip');
  writeFileSync(path, zip);

  const py = [
    'import sys, zipfile, json',
    'z = zipfile.ZipFile(sys.argv[1])',
    'bad = z.testzip()',
    'out = {"bad": bad, "files": {i.filename: z.read(i).decode("utf-8") for i in z.infolist()}, "dt": list(z.infolist()[0].date_time), "utf8": all(i.flag_bits & 0x800 for i in z.infolist())}',
    'sys.stdout.buffer.write(json.dumps(out).encode("utf-8"))',
  ].join('\n');
  let raw;
  for (const exe of ['python', 'python3']) {
    try {
      raw = execFileSync(exe, ['-c', py, path]);
      break;
    } catch {
      /* try the next name */
    }
  }
  assert.ok(raw, 'python is needed to read the ZIP back independently');
  const got = JSON.parse(raw.toString('utf-8'));
  assert.equal(got.bad, null, 'a CRC failed');
  assert.equal(got.utf8, true);
  assert.deepEqual(got.dt, [2026, 9, 24, 14, 30, 10]);
  assert.deepEqual(Object.keys(got.files), files.map((f) => f.name));
  for (const f of files) assert.equal(got.files[f.name], `﻿${f.text}`, f.name);
});
