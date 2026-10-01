import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
 * SOURCE TESTS for the QA 09-26 nutrition lows whose fix lives in a screen (not reachable from node --test).
 * They pin the wiring, not the copy.
 */
const root = path.resolve(import.meta.dirname, '../../../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('N-30: Create Food restores its draft, writes it as you type, clears it on save', () => {
  const src = read('src/app/create-food.tsx');
  assert.match(src, /loadCreateFoodDraft\(/);
  assert.match(src, /saveCreateFoodDraft\(/);
  assert.match(src, /if \(!editing\) await clearCreateFoodDraft\(\)/);
});

test('N-26: Food Detail offers Delete when it is editing a logged row', () => {
  const src = read('src/app/food-detail.tsx');
  assert.match(src, /removeEntry\(entryId\)/);
  assert.match(src, /\{editing \? \(\s*<Pressable[\s\S]{0,200}onPress=\{remove\}/);
});

test('N-33: the recipe pick sheet takes a typed amount', () => {
  const src = read('src/app/my-recipes.tsx');
  assert.match(src, /setTypedQty\(\{ for: next, text \}\)/);
  assert.match(src, /keyboardType="decimal-pad"/);
});

test('kitchen-22: grocery checkboxes carry aria-checked for the web', () => {
  assert.match(read('src/app/grocery-list.tsx'), /aria-checked=\{checked\}/);
});

test('N-36: grocery Share falls back to the clipboard where there is no share sheet', () => {
  assert.match(read('src/app/grocery-list.tsx'), /Clipboard\.setStringAsync\(message\)/);
});
