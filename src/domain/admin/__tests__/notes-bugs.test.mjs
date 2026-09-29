import test from 'node:test';
import assert from 'node:assert/strict';

import { bugsNote } from '../notes/bugs.ts';

const base = { total: 311, criticalActive: 3, highActive: 25, active: 142, oldestCriticalDays: 6, fixed7d: 11, reportsNew: 4, crashesNew: 1 };

test('a normal board reads its counts back as facts', () => {
  assert.equal(
    bugsNote(base),
    '3 critical bugs are open, the oldest for 6 days, with 25 high behind them. 11 fixed in the last 7 days, and 4 new user reports and 1 new crash group are waiting to be sorted.',
  );
});

test('an empty board says so and says how things arrive', () => {
  assert.equal(
    bugsNote({ total: 0, criticalActive: 0, highActive: 0, active: 0, oldestCriticalDays: null, fixed7d: 0, reportsNew: 0, crashesNew: 0 }),
    'The board is empty. File a bug, or track a user report or crash, and it shows up here.',
  );
  assert.equal(bugsNote(null), null);
});

test('one critical bug, nothing else waiting: singular wording, one sentence', () => {
  assert.equal(
    bugsNote({ ...base, criticalActive: 1, highActive: 0, oldestCriticalDays: 0, fixed7d: 0, reportsNew: 0, crashesNew: 0 }),
    '1 critical bug is open, for less than a day.',
  );
});

test('no critical, only high, with one thing waiting', () => {
  assert.equal(
    bugsNote({ ...base, criticalActive: 0, oldestCriticalDays: null, highActive: 1, fixed7d: 0, reportsNew: 0, crashesNew: 1 }),
    'No critical bugs are open; 1 high-severity bug is still open. 1 new crash group is waiting to be sorted.',
  );
});
