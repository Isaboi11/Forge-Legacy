/**
 * share-state.test.mjs — what "already shared" means, and what the sheet may say about it.
 *
 * PO (2026-08-27): *"I clicked share to squad and friends after my workout from the share card and it's
 * still not showing me that I shared it in any way. I just need something that says that I actually
 * shared it or else people will double post."*
 *
 * The record was always there — every share is a `squad_posts` row with `author_id` + `workout_id`.
 * These are the pure rules that turn those rows into a line the sheet shows and a tile it refuses.
 *
 * Run:  node --test src/domain/share/__tests__/share-state.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { shareState, sharedLine } from '../fanout.ts';

const SQUADS = [
  { id: 'a', name: 'Da Bois' },
  { id: 'b', name: 'Iron Vigil' },
];

test('nothing shared: no friends, no squads, no line', () => {
  const s = shareState([]);
  assert.deepEqual(s, { friends: false, squadIds: [] });
  assert.equal(sharedLine(s, SQUADS), null);
});

test('a SQUAD post marks that squad and not friends', () => {
  const s = shareState([{ audience: 'SQUAD', squadId: 'a' }]);
  assert.deepEqual(s, { friends: false, squadIds: ['a'] });
  assert.equal(sharedLine(s, SQUADS), 'Shared to Da Bois');
});

test('a FRIENDS post marks friends and no squad', () => {
  const s = shareState([{ audience: 'FRIENDS', squadId: null }]);
  assert.deepEqual(s, { friends: true, squadIds: [] });
  assert.equal(sharedLine(s, SQUADS), 'Shared with your friends');
});

test('⚠ a BOTH post is ONE row that counts for friends AND its squad', () => {
  // `(audience = 'FRIENDS') = (squad_id is null)` — BOTH carries a squad and reaches friends too. Reading
  // it as squad-only would offer Friends again and double-post to them.
  const s = shareState([{ audience: 'BOTH', squadId: 'a' }]);
  assert.deepEqual(s, { friends: true, squadIds: ['a'] });
  assert.equal(sharedLine(s, SQUADS), 'Shared with your friends and Da Bois');
});

test('the same squad twice is one squad', () => {
  const s = shareState([
    { audience: 'SQUAD', squadId: 'a' },
    { audience: 'SQUAD', squadId: 'a' },
  ]);
  assert.deepEqual(s.squadIds, ['a']);
});

test('a squad the athlete has since left still counts — named by number, not dropped', () => {
  const s = shareState([{ audience: 'SQUAD', squadId: 'gone' }, { audience: 'SQUAD', squadId: 'a' }]);
  assert.equal(sharedLine(s, SQUADS), 'Shared to Da Bois and 1 other squad');
});

test('two squads and friends read as one sentence', () => {
  const s = shareState([
    { audience: 'BOTH', squadId: 'a' },
    { audience: 'SQUAD', squadId: 'b' },
  ]);
  assert.equal(sharedLine(s, SQUADS), 'Shared with your friends and Da Bois and Iron Vigil');
});
