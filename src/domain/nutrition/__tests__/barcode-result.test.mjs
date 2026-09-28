import test from 'node:test';
import assert from 'node:assert/strict';

import { gtin14, hasNutrition, pickBarcodeResult } from '../barcode-result.ts';

// PO 2026-09-28: a protein bar scanned, Forge "had" it, and every number was zero.

const food = (name, kcal, p, c, f, extra = {}) => ({ name, brand: 'Brand', kcal100: kcal, protein100: p, carb100: c, fat100: f, ...extra });
const ZERO_BAR = food('Protein Bar', 0, 0, 0, 0);
const REAL_BAR = food('Protein Bar', 380, 33, 38, 12);

test('⭐ a record whose numbers are all zero is EMPTY, not a match — and it carries its name to Create Food', () => {
  assert.deepEqual(pickBarcodeResult([ZERO_BAR], null), { kind: 'empty', name: 'Protein Bar', brand: 'Brand' });
});

test('blank (null) numbers are empty too', () => {
  assert.deepEqual(pickBarcodeResult([food('Bar', null, null, null, null, { brand: null })], null), { kind: 'empty', name: 'Bar', brand: null });
});

test('⭐ a shared Forge food with nutrition beats the empty cached record', () => {
  const shared = { ...REAL_BAR, key: 'cf:00012345678905' };
  assert.deepEqual(pickBarcodeResult([ZERO_BAR], shared), { kind: 'food', food: shared });
});

test('a shared food beats even a good outside record (a person checked it against the label)', () => {
  const shared = { ...REAL_BAR, key: 'cf:1' };
  assert.equal(pickBarcodeResult([food('Other', 200, 10, 20, 5)], shared).food, shared);
});

test('otherwise the first result that HAS nutrition wins, even behind an empty one', () => {
  const good = food('Good', 200, 10, 20, 5);
  assert.deepEqual(pickBarcodeResult([ZERO_BAR, good], null), { kind: 'food', food: good });
});

test('an empty shared food does not win', () => {
  assert.deepEqual(pickBarcodeResult([], food('Bar', 0, 0, 0, 0)), { kind: 'empty', name: 'Bar', brand: 'Brand' });
});

test('nothing at all is an ordinary miss', () => {
  assert.deepEqual(pickBarcodeResult([], null), { kind: 'none' });
});

test('calories alone, or a macro alone, counts as nutrition (diet soda, plain oil)', () => {
  assert.equal(hasNutrition(food('Soda', 0, 0, 0.1, 0)), true);
  assert.equal(hasNutrition(food('Oil', 884, null, null, null)), true);
  assert.equal(hasNutrition(food('Water', 0, 0, 0, 0)), false);
});

test('barcodes are compared in their 14-digit form', () => {
  assert.equal(gtin14('0 12345 67890 5'), '00012345678905');
  assert.equal(gtin14('12345678901234567'), '45678901234567');
});
