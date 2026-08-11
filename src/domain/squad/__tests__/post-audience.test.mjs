import test from 'node:test';
import assert from 'node:assert/strict';

import { FRIENDS_TYPE, friendsTypeFor, offeredToFriends } from '../post-audience.ts';

/**
 * One composer writes for two feeds, and the failure mode of this map is SILENCE.
 *
 * Nothing throws when a type is mistranslated. The post is written, the row is valid, the feed renders
 * it — as the wrong card. So these assertions are about what the READER does with each value, not about
 * the shape of the object.
 */

test('a comparison stays a comparison on the friends side', () => {
  /*
   * ⚠ THE ONE THAT ACTUALLY BREAKS. `shapeOf` returns 'progress' for `type === 'progress'` and never
   * looks at `layout`; the squad card describes its comparison IN `layout`. So a transformation written
   * under its own name lands on the gallery arm — a before/after with no "before", which is precisely
   * what `shapeOf`'s header warns any future friends-audience writer about.
   */
  assert.equal(friendsTypeFor('transformation'), 'progress');
});

test('a recap keeps its stats strip, and a PR keeps its milestone card', () => {
  // Both names are shared, so these are identity — asserted anyway, because "unchanged" is a decision
  // here and a silent regression if some later pass decides to be clever about it.
  assert.equal(friendsTypeFor('recap'), 'recap');
  assert.equal(friendsTypeFor('pr'), 'pr');
  assert.equal(friendsTypeFor('discussion'), 'discussion');
});

test('a form check becomes a discussion, because the clip is what makes the card', () => {
  // There is no form-check shape in the friends feed and none is needed: `shapeOf` resolves any post
  // carrying a video to the `video` shape, whatever its type.
  assert.equal(friendsTypeFor('formcheck'), 'discussion');
});

test('an unmapped type degrades to a discussion rather than to nothing', () => {
  // `createFriendPost` defaults to 'discussion' too. Matching it here means a type added to the squad
  // side and forgotten here posts something plain and honest instead of a row with a type no reader
  // knows — the same "degrade, never guess" rule the rest of this codebase holds to.
  assert.equal(friendsTypeFor('announcement'), 'discussion');
});

test('the grid and the writer read ONE map, so nothing offerable is untranslatable', () => {
  /*
   * The composer filters its type grid with `offeredToFriends` and writes with `friendsTypeFor`. If
   * those two ever came from different lists, the screen could offer a type the writer would silently
   * turn into something else — which is the whole class of bug this module exists to prevent.
   */
  for (const type of Object.keys(FRIENDS_TYPE)) {
    assert.ok(offeredToFriends(type), `${type} is mapped but not offerable`);
  }
  assert.ok(!offeredToFriends('announcement'), 'an announcement has no friends audience to announce to');
  assert.ok(!offeredToFriends('progress'), 'Progress Photos posts through addSquadPost and needs a squad');
});

test('every mapped value is one the friends feed actually renders', () => {
  // `shapeOf`'s arms, transcribed. A value outside this set falls through to the media checks and
  // renders as whatever it happens to carry — a note, if it carries nothing.
  const RENDERED = new Set(['discussion', 'progress', 'milestone', 'pr', 'checkin', 'recap', 'weekly', 'announcement']);
  for (const [squadType, friendType] of Object.entries(FRIENDS_TYPE)) {
    assert.ok(RENDERED.has(friendType), `${squadType} maps to '${friendType}', which is not a friends post type`);
  }
});
