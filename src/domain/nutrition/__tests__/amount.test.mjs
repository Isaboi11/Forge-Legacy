import test from 'node:test';
import assert from 'node:assert/strict';

import {
  amountIssueLine,
  checkQuickEntry,
  ENTRY_KCAL_ASK,
  ENTRY_KCAL_MAX,
  largeEntryLine,
  parseAmount,
  TARGET_KCAL_ASK,
  TARGET_KCAL_MAX,
  targetCeiling,
} from '../amount.ts';

/* ── one field ────────────────────────────────────────────────────────────── */

test('a plain number is read as it is', () => {
  assert.deepEqual(parseAmount('450'), { value: 450, blank: false, issue: null });
  assert.equal(parseAmount(' 12.5 ').value, 12.5);
  assert.equal(parseAmount('.5').value, 0.5);
  assert.equal(parseAmount('0').value, 0);
});

test('a unit typed after the number is dropped — "20g" is 20, not a failed save (N-04)', () => {
  assert.equal(parseAmount('20g').value, 20);
  assert.equal(parseAmount('20 g').value, 20);
  assert.equal(parseAmount('450 kcal').value, 450);
  assert.equal(parseAmount('30G.').value, 30);
});

test('"1,200" is twelve hundred and "1,5" is one and a half', () => {
  assert.equal(parseAmount('1,200').value, 1200);
  assert.equal(parseAmount('12,345,678').value, 12345678);
  assert.equal(parseAmount('1,5').value, 1.5);
  assert.equal(parseAmount('1,200.5').value, 1200.5);
});

test('blank is not an error — an optional field simply was not given', () => {
  assert.deepEqual(parseAmount(''), { value: null, blank: true, issue: null });
  assert.deepEqual(parseAmount('   '), { value: null, blank: true, issue: null });
  assert.deepEqual(parseAmount(null), { value: null, blank: true, issue: null });
});

test('a negative is REFUSED, never turned into a zero or into its positive (N-05)', () => {
  assert.deepEqual(parseAmount('-500'), { value: null, blank: false, issue: 'negative' });
  assert.deepEqual(parseAmount('-5'), { value: null, blank: false, issue: 'negative' });
  assert.equal(parseAmount('-0').value, 0);
});

test('a word is refused, never counted as zero (N-29)', () => {
  for (const text of ['abc', 'g', '12abc3', '1.2.3', '--5', '5-', 'twenty', '.', ',']) {
    assert.equal(parseAmount(text).issue, 'not-a-number', text);
    assert.equal(parseAmount(text).value, null, text);
  }
});

test('a figure past the ceiling is refused; the ceiling itself is allowed', () => {
  assert.equal(parseAmount('20000', ENTRY_KCAL_MAX).value, 20000);
  assert.deepEqual(parseAmount('20001', ENTRY_KCAL_MAX), { value: null, blank: false, issue: 'too-big' });
  assert.equal(parseAmount('99999999', ENTRY_KCAL_MAX).issue, 'too-big');
});

test('each refusal has words, and a fine field has none', () => {
  assert.equal(amountIssueLine('Protein', parseAmount('abc')), 'Protein needs a number.');
  assert.equal(amountIssueLine('Calories', parseAmount('-500')), 'Calories can’t be below zero.');
  assert.equal(amountIssueLine('Calories', parseAmount('99999999', 20000), 20000), 'Calories can’t be more than 20,000.');
  assert.equal(amountIssueLine('Fat', parseAmount('5000', 2000), 2000, ' g'), 'Fat can’t be more than 2,000 g.');
  assert.equal(amountIssueLine('Calories', parseAmount('450')), null);
  assert.equal(amountIssueLine('Calories', parseAmount('')), null);
});

/* ── a Quick Add ──────────────────────────────────────────────────────────── */

const fields = (over = {}) => ({ kcal: '', protein: '', carb: '', fat: '', ...over });

test('calories alone are enough; the rest default to zero', () => {
  const c = checkQuickEntry(fields({ kcal: '450' }));
  assert.deepEqual(c.macros, { kcal: 450, protein: 0, carb: 0, fat: 0, grams: null });
  assert.deepEqual(c.bad, []);
  assert.equal(c.message, null);
  assert.equal(c.ask, false);
});

test('the QA case: "20g" in a macro field logs 20 g instead of failing without a word (N-04)', () => {
  const c = checkQuickEntry(fields({ kcal: '300', protein: '20g' }));
  assert.equal(c.macros.protein, 20);
  assert.equal(c.message, null);
});

test('nothing typed yet is not a problem, only not ready', () => {
  const c = checkQuickEntry(fields());
  assert.equal(c.macros, null);
  assert.equal(c.message, null);
  assert.deepEqual(c.bad, []);
});

test('"-500" is refused in words — it used to log a 0 cal row (N-05)', () => {
  const c = checkQuickEntry(fields({ kcal: '-500' }));
  assert.equal(c.macros, null);
  assert.deepEqual(c.bad, ['kcal']);
  assert.equal(c.message, 'Calories can’t be below zero.');
});

test('99,999,999 cal is refused — it used to reach the ring (N-05)', () => {
  const c = checkQuickEntry(fields({ kcal: '99999999' }));
  assert.equal(c.macros, null);
  assert.equal(c.message, 'Calories can’t be more than 20,000.');
});

test('a word in a macro field blocks the entry and marks that field', () => {
  const c = checkQuickEntry(fields({ kcal: '300', protein: 'abc', fat: '-2' }));
  assert.equal(c.macros, null);
  assert.deepEqual(c.bad, ['protein', 'fat']);
  assert.equal(c.message, 'Protein needs a number.');
});

test('zero calories is not a Quick Add', () => {
  const c = checkQuickEntry(fields({ kcal: '0' }));
  assert.equal(c.macros, null);
  assert.equal(c.message, 'Calories need to be above zero.');
});

test('a large entry is allowed but asked about first', () => {
  assert.equal(checkQuickEntry(fields({ kcal: String(ENTRY_KCAL_ASK) })).ask, false);
  const c = checkQuickEntry(fields({ kcal: '5,200' }));
  assert.equal(c.macros.kcal, 5200);
  assert.equal(c.ask, true);
  assert.equal(largeEntryLine(c.macros.kcal), '5,200 cal is a lot for one entry. Tap again if it’s right.');
});

/* ── a manual target ──────────────────────────────────────────────────────── */

test('a manual target has a ceiling: asked about above 6,000, refused above 10,000 (N-29)', () => {
  assert.equal(targetCeiling(2500), null);
  assert.equal(targetCeiling(TARGET_KCAL_ASK), null);
  assert.equal(targetCeiling(6001), 'ask');
  assert.equal(targetCeiling(TARGET_KCAL_MAX), 'ask');
  assert.equal(targetCeiling(10001), 'too-high');
  assert.equal(targetCeiling(50000), 'too-high');
  assert.equal(targetCeiling(null), null);
});
