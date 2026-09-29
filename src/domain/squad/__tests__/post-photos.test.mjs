import test from 'node:test';
import assert from 'node:assert/strict';

import { MAX_POST_PHOTOS, addPicked, displayOf, gridRows, withDisplay } from '../post-photos.ts';

const img = (n) => ({ url: `https://x/${n}.jpg`, kind: 'image' });
const vid = { url: 'https://x/v.mp4', kind: 'video' };
const photos = (n) => Array.from({ length: n }, (_, i) => img(i));

test('⭐ up to twelve photos, in the order picked (PO 09-28)', () => {
  assert.equal(MAX_POST_PHOTOS, 12);
  const r = addPicked(photos(10), photos(5));
  assert.equal(r.keep.length, 2);
  assert.equal(r.overCap, true);
  assert.deepEqual(addPicked([], photos(3)).keep, photos(3));
});

test('one video OR photos — a clip is never mixed into a set', () => {
  assert.deepEqual(addPicked([], [vid]).keep, [vid]);
  const mixed = addPicked([], [img(1), vid, img(2)]);
  assert.deepEqual(mixed.keep, [img(1), img(2)]);
  assert.equal(mixed.droppedVideo, true);
  assert.equal(addPicked([img(0)], [vid]).keep.length, 0);
  assert.equal(addPicked([vid], [img(0)]).keep.length, 0);
});

test('the choice rides on the first item, and a post without one swipes as it always did', () => {
  const set = withDisplay(photos(3), 'grid');
  assert.equal(set[0].display, 'grid');
  assert.equal(set[1].display, undefined);
  assert.equal(displayOf(set), 'grid');
  assert.equal(displayOf(photos(3)), 'swipe');
  assert.equal(displayOf(withDisplay(photos(3), 'swipe')), 'swipe');
  // One photo, or a video, has nothing to choose.
  assert.equal(withDisplay(photos(1), 'grid')[0].display, undefined);
  assert.equal(displayOf([{ ...vid, display: 'grid' }, img(1)]), 'swipe');
});

test('the Facebook collage: 1, 2, 3, 4, then five tiles with +N', () => {
  assert.deepEqual(gridRows(1).rows, [[0]]);
  assert.deepEqual(gridRows(2).rows, [[0, 1]]);
  assert.deepEqual(gridRows(3).rows, [[0], [1, 2]]);
  assert.deepEqual(gridRows(4).rows, [[0, 1], [2, 3]]);
  assert.deepEqual(gridRows(5), { rows: [[0, 1], [2, 3, 4]], more: 0 });
  assert.deepEqual(gridRows(12), { rows: [[0, 1], [2, 3, 4]], more: 7 });
});
