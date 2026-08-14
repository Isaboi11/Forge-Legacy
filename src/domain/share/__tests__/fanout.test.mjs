import test from 'node:test';
import assert from 'node:assert/strict';

import { shareSummary, shareTargets, shareVerb, squadList } from '../fanout.ts';

const S = ['s1', 's2', 's3'];

test('friends alone is one squadless row', () => {
  assert.deepEqual(shareTargets([], true), [{ audience: 'FRIENDS', squadId: null }]);
});

test('nothing selected posts nothing', () => {
  assert.deepEqual(shareTargets([], false), []);
});

test('every chosen squad gets exactly one row', () => {
  for (const n of [1, 2, 3]) {
    const rows = shareTargets(S.slice(0, n), false);
    assert.equal(rows.length, n);
    assert.deepEqual(rows.map((r) => r.squadId), S.slice(0, n));
    assert.ok(rows.every((r) => r.audience === 'SQUAD'));
  }
});

test('⚠ friends + N squads is ONE friends-visible row, never N', () => {
  const rows = shareTargets(S, true);
  const friendsVisible = rows.filter((r) => r.audience === 'FRIENDS' || r.audience === 'BOTH');
  assert.equal(friendsVisible.length, 1, 'friends_feed selects FRIENDS+BOTH — a second row is a duplicate post');
  assert.equal(rows.length, 3, 'and each squad still gets its own row');
  assert.deepEqual(rows.map((r) => r.squadId), S, 'no squad is dropped to keep the friends copy single');
});

test('the 0074 equivalence holds for every row we ever emit', () => {
  for (const friends of [false, true]) {
    for (const n of [0, 1, 2, 3]) {
      for (const row of shareTargets(S.slice(0, n), friends)) {
        // check ((audience = 'FRIENDS') = (squad_id is null))
        assert.equal(row.audience === 'FRIENDS', row.squadId === null, `${row.audience}/${row.squadId} violates the constraint`);
      }
    }
  }
});

test('a squad picked twice is posted to once', () => {
  assert.deepEqual(shareTargets(['s1', 's1', 's2'], false).map((r) => r.squadId), ['s1', 's2']);
  assert.equal(shareTargets(['s1', 's1'], true).length, 1);
});

test('the BOTH row leads, so a partial failure loses the tail not the friends copy', () => {
  assert.equal(shareTargets(S, true)[0].audience, 'BOTH');
});

test('the list reads as a sentence until it stops being one', () => {
  assert.equal(squadList([]), '');
  assert.equal(squadList(['Alpha']), 'Alpha');
  assert.equal(squadList(['Alpha', 'Bravo']), 'Alpha and Bravo');
  assert.equal(squadList(['Alpha', 'Bravo', 'Charlie']), 'Alpha, Bravo and Charlie');
  assert.equal(squadList(['A', 'B', 'C', 'D']), '4 squads');
});

test('the toast names where it actually went', () => {
  assert.equal(shareSummary([], true), 'Shared with your friends');
  assert.equal(shareSummary(['Alpha'], false), 'Shared to Alpha');
  assert.equal(shareSummary(['Alpha', 'Bravo'], false), 'Shared to Alpha and Bravo');
  assert.equal(shareSummary(['Alpha', 'Bravo'], true), 'Shared with your friends and Alpha and Bravo');
});

test('the button counts what the tap will do', () => {
  assert.equal(shareVerb(0, true), 'Share with Friends');
  assert.equal(shareVerb(0, false), 'Select a Squad');
  assert.equal(shareVerb(1, false), 'Share to Squad');
  assert.equal(shareVerb(3, false), 'Share to 3 Squads');
  assert.equal(shareVerb(1, true), 'Share with Friends and 1 Squad');
  assert.equal(shareVerb(2, true), 'Share with Friends and 2 Squads');
});
