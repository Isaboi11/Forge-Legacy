/**
 * pin-media.test.mjs — a pinned accomplishment shows the keepsake, not an empty card.
 *
 * ══ WHAT WAS WRONG ══
 *
 * Reported from the tester build: *"On the legacy page it just shows a blank square for the
 * accomplishments I favorited and the pinned accomplishment at the top."*
 *
 * Nothing was broken. The museum has ALWAYS been able to display media — `pins.media_url`,
 * `poster_url` and `is_video` are 0005 columns and `PinnedCard` renders them behind a play button — and
 * **nothing ever wrote them.** `pinCandidate` inserted title, subtitle, kind, ref and position, so every
 * pin fell back to its bronze emblem. An athlete who pinned their finish-line photo got a dark card with
 * a small trophy on it.
 *
 * This is the same shape as the `per` field and the flattened planned day: authored, stored, fetched —
 * and dropped one layer short of the screen.
 *
 * Run:  node --test --experimental-strip-types src/domain/legacy/__tests__/pin-media.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { candidatesFromContent } from '../pins.ts';

const acc = (over = {}) => ({
  id: 'a1',
  name: 'Marathon Finisher',
  date: '2026-05-04',
  chapterId: null,
  featured: false,
  createdAt: '2026-05-04T00:00:00Z',
  mediaUrl: null,
  mediaKind: null,
  ...over,
});

const content = (accomplishments) => ({ accomplishments, honors: [], chapters: [] });

test('an accomplishment with a photo offers it to the pin', () => {
  const [c] = candidatesFromContent(content([acc({ mediaUrl: 'https://x/p.jpg', mediaKind: 'image' })]));
  assert.equal(c.mediaUrl, 'https://x/p.jpg');
  assert.equal(c.isVideo, false, 'an image pin must not render the video play badge');
});

test('a video accomplishment is marked as one', () => {
  // `is_video` is what puts the play button on the card and what routes a tap to the fullscreen player.
  const [c] = candidatesFromContent(content([acc({ mediaUrl: 'https://x/v.mp4', mediaKind: 'video' })]));
  assert.equal(c.mediaUrl, 'https://x/v.mp4');
  assert.equal(c.isVideo, true);
});

test('an accomplishment with no keepsake still pins, and keeps its emblem', () => {
  // The emblem is the correct answer to "there is nothing to look at", not a fallback for a failure.
  const [c] = candidatesFromContent(content([acc()]));
  assert.equal(c.mediaUrl, null);
  assert.equal(c.isVideo, false);
  assert.equal(c.icon, 'trophy', 'an accomplishment with no media must still have something to draw');
});

test('honors and chapters carry no media, and that is not a gap', () => {
  // Neither has media of its own. If one ever gains some, this test is the reminder to wire it rather
  // than the thing standing in the way.
  const cands = candidatesFromContent({
    accomplishments: [],
    honors: [{ id: 'h1', name: 'First Honor', dateEarned: 'May 2026' }],
    chapters: [{ id: 'c1', name: 'Chapter I', active: true, sealed: false }],
  });
  assert.equal(cands.length, 2);
  for (const c of cands) {
    assert.equal(c.mediaUrl ?? null, null, `${c.kind} claims media it does not have`);
    assert.ok(c.icon, `${c.kind} has neither media nor an emblem — it would draw nothing`);
  }
});

test('the title and subtitle a pin denormalizes are unchanged', () => {
  // Media rides ALONGSIDE the existing denormalized fields; it does not replace them. A pin still has to
  // read correctly with its media stripped, because that is what an emblem pin is.
  const [c] = candidatesFromContent(content([acc({ mediaUrl: 'https://x/p.jpg', mediaKind: 'image' })]));
  assert.equal(c.kind, 'accomplishment');
  assert.equal(c.refId, 'a1');
  assert.equal(c.title, 'Marathon Finisher');
  assert.ok(c.subtitle.length > 0, 'a pin with no subtitle reads as an untitled card');
});
