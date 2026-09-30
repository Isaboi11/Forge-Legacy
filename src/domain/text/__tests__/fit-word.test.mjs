// QA holtai-17: "Intermediate" broke as "Intermediat / e" in Holt's program preview.
import test from 'node:test';
import assert from 'node:assert/strict';

import { fitWordSize, longestWord, measuredEm } from '../fit-word.ts';

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

// home-06: FitText hands the same rule a MEASURED em. The numbers are the report's: on a 320pt screen the
// Today's Workout title column is 119px, and "Confidence" at the card's 30px display face is 152 — the
// "Confide / nce" that QA saw.
test('the longest word is the one that has to fit (hyphens stay in it)', () => {
  assert.equal(longestWord('Confidence Builder'), 'Confidence');
  assert.equal(longestWord('  Intermediate  '), 'Intermediate');
  assert.equal(longestWord('Close-Grip Bench'), 'Close-Grip');
  assert.equal(longestWord(''), '');
});

test('⚠ a measured word wider than its column is sized until it fits, and no further (home-06)', () => {
  const em = measuredEm('Confidence', 152, 30);
  const size = fitWordSize('Confidence Builder', 119 - 1, 30, 30 * 0.7, em);
  assert.ok(size < 30);
  assert.ok((152 * size) / 30 <= 118, 'the word is inside the column, with the pixel of slack');
  assert.ok((152 * (size + 1)) / 30 > 118, 'one point larger would not have fitted');
});

test('no measurement, no em — and the floor still holds for a hopeless column', () => {
  assert.equal(measuredEm('Confidence', 0, 30), 0);
  assert.equal(measuredEm('', 152, 30), 0);
  assert.equal(fitWordSize('Confidence', 40, 30, 21, measuredEm('Confidence', 152, 30)), 21);
});
