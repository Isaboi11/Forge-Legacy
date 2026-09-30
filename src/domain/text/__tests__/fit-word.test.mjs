// QA holtai-17: "Intermediate" broke as "Intermediat / e" in Holt's program preview.
import test from 'node:test';
import assert from 'node:assert/strict';

import { fitWordSize } from '../fit-word.ts';

test('a long single word is sized down to fit its cell; a short one keeps the base size', () => {
  // iPhone 14's preview cell is about 109pt wide; "Intermediate" at 19pt needed about 113.
  const size = fitWordSize('Intermediate', 109, 19);
  assert.ok(size < 19, 'Intermediate kept a size that does not fit');
  assert.ok(12 * 0.55 * size <= 109);
  assert.equal(fitWordSize('Beginner', 109, 19), 19);
});

test('only the longest WORD counts — several words may wrap at a space', () => {
  assert.equal(fitWordSize('Get stronger', 109, 19), fitWordSize('stronger', 109, 19));
});

test('never below the floor, and the base size before the cell is measured', () => {
  assert.equal(fitWordSize('Conditioning', 30, 19), 12);
  assert.equal(fitWordSize('Intermediate', 0, 19), 19);
  assert.equal(fitWordSize('', 100, 19), 19);
});
