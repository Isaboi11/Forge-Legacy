/**
 * pin-destination.test.mjs — a pin opens the thing it points at, not the list it lives in.
 *
 * ══ TWO DEFECTS ══
 *
 * Reported: *"when I click on that specific pinned thing, it should open it up directly right away.
 * Right now it opens up all accomplishments."*
 *
 * **1. The pin opened its LIST.** Tapping "Deadlift Max 485" in the museum pushed the bare
 * accomplishments route, landing the athlete on every accomplishment they own and leaving them to find
 * again the one they had just tapped. The `refId` needed to open it directly has been on the row since
 * migration 0005.
 *
 * **2. The MEDIA outranked the ENTITY.** The video check ran first, so a pinned accomplishment that
 * happened to carry a clip opened a bare fullscreen player — no title, no date, no note, nothing linking
 * back to the accomplishment. That is a worse answer than the list was.
 *
 * Run:  node --test --experimental-strip-types src/domain/legacy/__tests__/pin-destination.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { pinDestination } from '../pins.ts';

test('an accomplishment pin opens THAT accomplishment', () => {
  assert.deepEqual(pinDestination({ kind: 'accomplishment', refId: 'a1' }), { screen: 'accomplishment', id: 'a1' });
});

/**
 * The regression that matters most. A keepsake is usually a photo or a clip — that is the point of
 * pinning it — so "has media" is the common case, not the edge one. If media ever outranks the entity
 * again, every pin worth tapping goes back to opening a context-free player.
 */
test('a VIDEO accomplishment still opens the accomplishment, not a bare player', () => {
  const dest = pinDestination({ kind: 'accomplishment', refId: 'a1', isVideo: true, mediaUrl: 'https://x/v.mp4' });
  assert.deepEqual(dest, { screen: 'accomplishment', id: 'a1' }, 'the clip is shown IN the accomplishment');
});

test('a chapter pin opens that chapter', () => {
  assert.deepEqual(pinDestination({ kind: 'chapter', refId: 'c1' }), { screen: 'chapter', id: 'c1' });
  // Including one that carries media, for the same reason as above.
  assert.deepEqual(pinDestination({ kind: 'chapter', refId: 'c1', isVideo: true, mediaUrl: 'https://x/v.mp4' }), {
    screen: 'chapter',
    id: 'c1',
  });
});

test('a pin that is ONLY media keeps the fullscreen player', () => {
  // record / photo / memory reference no entity, so the player is the right and only answer.
  for (const kind of ['record', 'photo', 'memory']) {
    assert.deepEqual(
      pinDestination({ kind, refId: null, isVideo: true, mediaUrl: 'https://x/v.mp4' }),
      { screen: 'video', url: 'https://x/v.mp4' },
      `${kind} lost its player`,
    );
  }
});

test('an accomplishment whose entity is gone falls back to the list, not a dead tap', () => {
  // The pin keeps its denormalized title after the accomplishment is deleted. The list is where the
  // thing used to be, which is the honest destination.
  assert.deepEqual(pinDestination({ kind: 'accomplishment', refId: null }), { screen: 'accomplishments' });
});

test('a pin with nothing to open says so, rather than guessing', () => {
  // A bare photo/record pin with no media and no ref has no destination. Returning null lets the caller
  // do nothing, instead of navigating somewhere arbitrary.
  assert.equal(pinDestination({ kind: 'photo', refId: null }), null);
  assert.equal(pinDestination({ kind: 'record', refId: null, isVideo: false, mediaUrl: null }), null);
});

test('an honor pin opens the honors hub', () => {
  // There is no single-honor route today; the hub is the real destination rather than a pretend one.
  assert.deepEqual(pinDestination({ kind: 'honor', refId: 'h1' }), { screen: 'honors' });
});
