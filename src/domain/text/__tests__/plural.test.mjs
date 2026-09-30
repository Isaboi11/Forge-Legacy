import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countOf, pluralOf, pluralWord } from '../plural.ts';

test('one is singular, zero and many are plural (N-22: "1 weeks", "1 items")', () => {
  assert.equal(countOf(1, 'week'), '1 week');
  assert.equal(countOf(0, 'week'), '0 weeks');
  assert.equal(countOf(3, 'item'), '3 items');
  assert.equal(countOf(1, 'full day'), '1 full day');
});

test('a fraction of one reads singular ("0.5 cup", not "0.5 cups")', () => {
  assert.equal(pluralWord(0.5, 'cup'), 'cup');
  assert.equal(pluralWord(1.5, 'cup'), 'cups');
});

test('regular endings and explicit irregulars', () => {
  assert.equal(pluralOf('box'), 'boxes');
  assert.equal(pluralOf('entry'), 'entries');
  assert.equal(pluralOf('day'), 'days');
  assert.equal(pluralOf('DAY'), 'DAYS');
  assert.equal(pluralOf('person', 'people'), 'people');
  assert.equal(pluralWord(2, 'person', 'people'), 'people');
});
