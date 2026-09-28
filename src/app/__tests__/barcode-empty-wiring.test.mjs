// PO 2026-09-28: a protein bar scanned, Forge "had" it with every number zero, and the only way on was to
// make a new food by hand — which had no barcode, so it could never be shared. See `barcode-result.ts`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const LOG = read('app/log-food.tsx');
// Log Food's scanner moved into a shared sheet on 2026-09-28 so the recipe builder scans the same way.
const SHEET = read('components/forge/BarcodeSheet.tsx');
const RECIPES = read('app/my-recipes.tsx');
const CREATE = read('app/create-food.tsx');
const DATA = read('data/nutrition-live.ts');

test('⭐ a scan is decided by resolveBarcode, not "anything came back = a match"', () => {
  assert.match(SHEET, /await resolveBarcode\(digits\)/);
  assert.doesNotMatch(SHEET, /if \(found\.length\) onFound\(found\[0\]\)/, 'the old any-result-is-a-match rule is back');
  for (const [name, src] of [['log-food', LOG], ['my-recipes', RECIPES]]) {
    assert.match(src, /import \{ BarcodeSheet \} from '@\/components\/forge\/BarcodeSheet';/, `${name} uses the one scanner`);
  }
});

test('⭐ the shared Forge food is read by the phone, beside food-search (the server answers from its cache first)', () => {
  assert.match(DATA, /readCommunityFood\(`cf:\$\{gtin14\(barcode\)\}`\)/);
});

test('⭐ an empty record opens Create Food WITH the barcode and its name', () => {
  assert.match(LOG, /from: empty \? 'barcode-empty' : 'barcode'/);
  assert.match(LOG, /gtin: digits/);
  assert.match(CREATE, /params\.from === 'barcode-empty'/);
  // …and from the recipe builder too, for the recipe, with the label camera open where there is one.
  assert.match(RECIPES, /from: empty \? 'barcode-empty' : 'barcode'/);
  assert.match(RECIPES, /for: 'recipe',\s+from: empty/);
  assert.match(RECIPES, /gtin: digits,/);
});

test('⭐ recipe builder: a barcode that finds its food goes straight to the amount, after the sheet is gone', () => {
  assert.match(RECIPES, /const own = ownFoodFromScan\(food\);/);
  assert.match(RECIPES, /void callerModalGone\(\)\.then\(\(\) => setPick\(\{ food: own, unit: 'portion', qty: 1, index: null \}\)\)/);
  assert.match(RECIPES, /accessibilityLabel="Scan a barcode"/);
});

test('the barcode travels on EVERY platform — a miss on web can be shared too', () => {
  assert.doesNotMatch(LOG, /Not in the database — add it yourself/, 'the web-only no-barcode fallback is back');
});

test('⭐ a food you already made can take a barcode and be shared', () => {
  assert.match(CREATE, /const gtin = editing \? \(addedDigits\.length >= 8 \? addedDigits : ''\)/);
  assert.match(CREATE, /if \(gtin && shareIt\) \{/, 'sharing is still limited to new foods');
});
