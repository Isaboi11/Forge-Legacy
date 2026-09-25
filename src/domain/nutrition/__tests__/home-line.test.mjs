import test from 'node:test';
import assert from 'node:assert/strict';

import { homeFoodLine } from '../home-line.ts';

const target = { kcal: 2400, protein: 180, carb: 240, fat: 80 };

test('mid-day: calories eaten against the target, and the protein still to go', () => {
  assert.deepEqual(homeFoodLine({ kcal: 1420, protein: 120, carb: 150, fat: 40 }, true, target), {
    title: '1,420 of 2,400 cal',
    sub: '60 g protein to go',
  });
});

test('nothing logged yet names the target, never a zero', () => {
  const line = homeFoodLine({ kcal: 0, protein: 0, carb: 0, fat: 0 }, false, target);
  assert.equal(line.title, '2,400 cal today');
  assert.ok(!/\b0\b/.test(line.title), 'no zero on the title');
});

test('over the target is stated as a fact, not a verdict', () => {
  const line = homeFoodLine({ kcal: 2650, protein: 190, carb: 260, fat: 90 }, true, target);
  assert.equal(line.title, '2,650 of 2,400 cal');
  assert.equal(line.sub, 'Protein target reached');
  assert.ok(!/over|too much|exceed/i.test(`${line.title} ${line.sub}`));
});
