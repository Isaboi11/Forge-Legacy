import test from 'node:test';
import assert from 'node:assert/strict';

import { fitFontScale, longestWord, widthChanged } from '../fit-text-core.ts';

/**
 * FitText — a title never breaks through the middle of a word (home-06, QA 09-26).
 *
 * The numbers below are the real ones from the report: the Today's Workout title on a 320pt screen has a
 * 119px column, and "Confidence" at the card's 30px display face is 152px wide. That is "Confide / nce".
 */

test('the longest word is the one that has to fit', () => {
  assert.equal(longestWord('Confidence Builder'), 'Confidence');
  assert.equal(longestWord('Alternating Dumbbell Bench Press'), 'Alternating');
  assert.equal(longestWord('  Intermediate  '), 'Intermediate');
  assert.equal(longestWord('Close-Grip Bench'), 'Close-Grip');
  assert.equal(longestWord(''), '');
});

test('⚠ a word wider than its column is scaled until it fits — with a pixel to spare', () => {
  const scale = fitFontScale(119, 152, 0.6);
  assert.ok(scale < 1);
  assert.ok(152 * scale <= 119 - 1 + 1e-9, 'the scaled word is inside the column, not on its edge');
  assert.ok(152 * scale > 119 - 3, 'and not shrunk further than it had to be');
});

test('a word that already fits is left at its designed size', () => {
  assert.equal(fitFontScale(174, 152, 0.6), 1);
  assert.equal(fitFontScale(152, 152, 0.6), 1, 'exactly fitting is fitting');
});

test('nothing is guessed before both widths are measured', () => {
  assert.equal(fitFontScale(0, 152, 0.6), 1);
  assert.equal(fitFontScale(119, 0, 0.6), 1);
  assert.equal(fitFontScale(Number.NaN, 152, 0.6), 1);
});

test('the floor holds — a hopeless column does not produce unreadable type', () => {
  assert.equal(fitFontScale(40, 152, 0.7), 0.7);
});

test('sub-pixel jitter is not a new width, so the text settles in one pass', () => {
  assert.equal(widthChanged(119, 119.4), false);
  assert.equal(widthChanged(119, 118.2), false);
  assert.equal(widthChanged(119, 174), true);
  assert.equal(widthChanged(0, 119), true, 'the first measurement always lands');
});
