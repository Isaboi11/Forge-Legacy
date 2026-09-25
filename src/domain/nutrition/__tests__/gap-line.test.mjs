import test from 'node:test';
import assert from 'node:assert/strict';

import { gapLine, pantryFrom } from '../gap-line.ts';

const target = { kcal: 2400, protein: 180, carb: 240, fat: 80 };
const afternoon = { eaten: { kcal: 1700, protein: 165, carb: 170, fat: 55 }, logged: true, target, hour: 15 };

test("the PO's line: 15 g to go and the yogurt still on the list", () => {
  const line = gapLine({ ...afternoon, pantry: [{ key: 'greek_yogurt', status: 'to_buy' }] });
  assert.equal(line, '15 g protein to go. Did you pick up the Greek yogurt on your list? One container would cover it.');
});

test('already bought reads as something you have', () => {
  const line = gapLine({ ...afternoon, pantry: [{ key: 'greek_yogurt', status: 'bought' }] });
  assert.match(line, /^You've got Greek yogurt from this week's list\. .+ would cover the last 15 g of protein\.$/);
});

test('bought beats still-to-buy', () => {
  const line = gapLine({ ...afternoon, pantry: [{ key: 'greek_yogurt', status: 'to_buy' }, { key: 'tuna', status: 'bought' }] });
  assert.match(line, /^You've got canned tuna from this week's list\. 3 oz would cover the last 15 g of protein\.$/);
});

test('a portion that cannot cover the gap is never offered: two eggs are 12.6 g, short of 15', () => {
  assert.equal(gapLine({ ...afternoon, pantry: [{ key: 'egg', status: 'bought' }] }), null);
});

test('silent in the morning, with nothing logged, or with no target', () => {
  const pantry = [{ key: 'greek_yogurt', status: 'bought' }];
  assert.equal(gapLine({ ...afternoon, hour: 10, pantry }), null);
  assert.equal(gapLine({ ...afternoon, logged: false, pantry }), null);
  assert.equal(gapLine({ ...afternoon, target: null, pantry }), null);
});

test('⚠ silent when calories are under half the target: that is not a protein gap', () => {
  const line = gapLine({ ...afternoon, eaten: { kcal: 900, protein: 60, carb: 90, fat: 30 }, pantry: [{ key: 'greek_yogurt', status: 'bought' }] });
  assert.equal(line, null);
});

test('never past the calories left, and never a food that is not on the list', () => {
  const tight = { ...afternoon, eaten: { kcal: 2380, protein: 165, carb: 230, fat: 78 } }; // 20 kcal left
  assert.equal(gapLine({ ...tight, pantry: [{ key: 'greek_yogurt', status: 'bought' }] }), null);
  assert.equal(gapLine({ ...afternoon, pantry: [] }), null);
  assert.equal(gapLine({ ...afternoon, pantry: [{ key: 'white_rice', status: 'bought' }] }), null, 'rice cannot close a protein gap');
});

test('pantryFrom: bought, have-it and to-buy; removed items are gone; extras count', () => {
  const p = pantryFrom(['greek_yogurt', 'egg', 'white_rice'], {
    checked: { egg: true },
    have: { white_rice: true },
    removed: { greek_yogurt: true },
    extras: [{ key: 'tuna' }],
  });
  assert.deepEqual(p, [
    { key: 'egg', status: 'bought' },
    { key: 'white_rice', status: 'have' },
    { key: 'tuna', status: 'to_buy' },
  ]);
});
