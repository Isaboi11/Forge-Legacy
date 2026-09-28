import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AUTO_POST_DEFAULT,
  AUTO_POST_WINDOW_MS,
  autoPostFromPost,
  autoPostLabel,
  autoPostOn,
  autoPostTargets,
  postedFor,
  postedLine,
  postVerb,
  pruneAutoPost,
  sanitizeAutoPost,
  shouldOfferAutoPost,
  withinAutoPostWindow,
} from '../auto-post.ts';
import { shareState } from '../fanout.ts';

const ONE = [{ id: 'cut', name: 'The Real Cut' }];
const MANY = [
  { id: 'cut', name: 'The Real Cut' },
  { id: 'box', name: 'Boxing Crew' },
  { id: 'sat', name: 'Saturday Runs' },
];
const ids = (s) => s.map((x) => x.id);
const pref = (p) => ({ ...AUTO_POST_DEFAULT, ...p });

test('auto-post is OFF by default, and a missing or malformed blob lands on off — never on', () => {
  assert.equal(autoPostOn(AUTO_POST_DEFAULT), false);
  assert.deepEqual(sanitizeAutoPost(undefined), { friends: false, squadIds: [], asked: false });
  assert.deepEqual(sanitizeAutoPost('yes'), { friends: false, squadIds: [], asked: false });
  assert.deepEqual(sanitizeAutoPost({ friends: 'true', squadIds: 'cut' }), { friends: false, squadIds: [], asked: false });
  assert.deepEqual(sanitizeAutoPost({ friends: true, squadIds: ['cut', 'cut', 3, ''] }), { friends: true, squadIds: ['cut'], asked: false });
});

test('auto-post Off posts nothing', () => {
  assert.deepEqual(autoPostTargets(AUTO_POST_DEFAULT, ids(MANY), []), []);
});

test('auto-post to Friends is one friends row', () => {
  assert.deepEqual(autoPostTargets(pref({ friends: true }), ids(MANY), []), [{ audience: 'FRIENDS', squadId: null }]);
});

test('auto-post to one squad is one squad row', () => {
  assert.deepEqual(autoPostTargets(pref({ squadIds: ['cut'] }), ids(ONE), []), [{ audience: 'SQUAD', squadId: 'cut' }]);
});

test('auto-post to several squads is one row each', () => {
  assert.deepEqual(autoPostTargets(pref({ squadIds: ['cut', 'box'] }), ids(MANY), []), [
    { audience: 'SQUAD', squadId: 'cut' },
    { audience: 'SQUAD', squadId: 'box' },
  ]);
});

test('Friends + squads is ONE Both row and plain squad rows — the friends feed sees it once', () => {
  assert.deepEqual(autoPostTargets(pref({ friends: true, squadIds: ['cut', 'box'] }), ids(MANY), []), [
    { audience: 'BOTH', squadId: 'cut' },
    { audience: 'SQUAD', squadId: 'box' },
  ]);
});

test('a squad the athlete has left is not a destination, and emptying the last one is OFF', () => {
  const p = pref({ squadIds: ['cut', 'gone'] });
  assert.deepEqual(pruneAutoPost(p, ['cut']).squadIds, ['cut']);
  assert.deepEqual(autoPostTargets(p, ['cut'], []), [{ audience: 'SQUAD', squadId: 'cut' }]);
  const left = pruneAutoPost(pref({ squadIds: ['gone'] }), ids(MANY));
  assert.equal(autoPostOn(left), false);
  assert.deepEqual(autoPostTargets(pref({ squadIds: ['gone'] }), ids(MANY), []), []);
  assert.equal(autoPostLabel(pref({ squadIds: ['gone'] }), MANY), 'Off');
});

test('pruning an unchanged pref returns the SAME object — callers compare identity to decide to save', () => {
  const p = pref({ squadIds: ['cut'] });
  assert.equal(pruneAutoPost(p, ids(MANY)), p);
});

test('a user with no squads can still auto-post to Friends, and nothing else', () => {
  assert.deepEqual(autoPostTargets(pref({ friends: true, squadIds: ['cut'] }), [], []), [{ audience: 'FRIENDS', squadId: null }]);
});

test('RETRY: destinations that already have the workout are skipped — no duplicates', () => {
  const p = pref({ friends: true, squadIds: ['cut', 'box'] });
  // First attempt landed the Both row, then failed.
  assert.deepEqual(autoPostTargets(p, ids(MANY), [{ audience: 'BOTH', squadId: 'cut' }]), [{ audience: 'SQUAD', squadId: 'box' }]);
  // Everything landed: a retry posts nothing.
  assert.deepEqual(
    autoPostTargets(p, ids(MANY), [
      { audience: 'BOTH', squadId: 'cut' },
      { audience: 'SQUAD', squadId: 'box' },
    ]),
    [],
  );
});

test('a manual post already made is respected — auto-post does not post there again', () => {
  const p = pref({ friends: true, squadIds: ['cut'] });
  assert.deepEqual(autoPostTargets(p, ids(ONE), [{ audience: 'FRIENDS', squadId: null }]), [{ audience: 'SQUAD', squadId: 'cut' }]);
  assert.deepEqual(autoPostTargets(p, ids(ONE), [{ audience: 'SQUAD', squadId: 'cut' }]), [{ audience: 'FRIENDS', squadId: null }]);
});

test('the first-post lesson shows once: never after Not now, never once on', () => {
  assert.equal(shouldOfferAutoPost(AUTO_POST_DEFAULT), true);
  assert.equal(shouldOfferAutoPost(pref({ asked: true })), false, 'Not now ends it');
  assert.equal(shouldOfferAutoPost(pref({ friends: true })), false, 'already on — nothing to teach');
});

test('Turn on auto-post saves exactly where they just posted', () => {
  assert.deepEqual(autoPostFromPost(false, ['cut']), { friends: false, squadIds: ['cut'], asked: true });
  assert.deepEqual(autoPostFromPost(true, ['cut', 'box', 'cut']), { friends: true, squadIds: ['cut', 'box'], asked: true });
  assert.deepEqual(autoPostFromPost(true, []), { friends: true, squadIds: [], asked: true });
});

test('the row names the destination in the fewest words', () => {
  assert.equal(autoPostLabel(AUTO_POST_DEFAULT, MANY), 'Off');
  assert.equal(autoPostLabel(pref({ friends: true }), MANY), 'Friends');
  assert.equal(autoPostLabel(pref({ squadIds: ['cut'] }), ONE), 'My Squad');
  assert.equal(autoPostLabel(pref({ friends: true, squadIds: ['cut'] }), ONE), 'Friends + My Squad');
  assert.equal(autoPostLabel(pref({ squadIds: ['box'] }), MANY), 'Boxing Crew');
  assert.equal(autoPostLabel(pref({ squadIds: ['cut', 'box'] }), MANY), '2 Squads');
  assert.equal(autoPostLabel(pref({ friends: true, squadIds: ['cut', 'box'] }), MANY), 'Friends + 2 Squads');
  assert.equal(autoPostLabel(pref({ friends: true, squadIds: ['box'] }), MANY), 'Friends + Squad');
});

test('the post button says where it is going', () => {
  assert.equal(postVerb([], true, MANY), 'Post to Friends');
  assert.equal(postVerb(['cut'], false, ONE), 'Post to My Squad');
  assert.equal(postVerb(['cut'], true, ONE), 'Post to Friends + My Squad');
  assert.equal(postVerb(['box'], false, MANY), 'Post to Boxing Crew');
  assert.equal(postVerb(['cut', 'box'], false, MANY), 'Post to 2 Squads');
  assert.equal(postVerb([], false, MANY), 'Select a Squad');
});

test('confirmation lines say Posted, never Shared', () => {
  assert.equal(postedLine(['The Real Cut'], false), 'Posted to The Real Cut');
  assert.equal(postedLine([], true), 'Posted to your friends');
  assert.equal(postedLine(['The Real Cut'], true), 'Posted to your friends and The Real Cut');
  assert.equal(postedFor(shareState([]), MANY), null);
  assert.equal(postedFor(shareState([{ audience: 'SQUAD', squadId: 'cut' }]), MANY), 'Posted to The Real Cut');
  assert.equal(postedFor(shareState([{ audience: 'SQUAD', squadId: 'left' }]), MANY), 'Posted to 1 other squad');
});

test('only a just-finished workout auto-posts — not a reload hours later', () => {
  const now = Date.parse('2026-09-28T18:00:00Z');
  assert.equal(withinAutoPostWindow('2026-09-28T17:30:00Z', now), true);
  assert.equal(withinAutoPostWindow(new Date(now - AUTO_POST_WINDOW_MS - 1000).toISOString(), now), false);
  assert.equal(withinAutoPostWindow(null, now), false);
  assert.equal(withinAutoPostWindow('garbage', now), false);
});
