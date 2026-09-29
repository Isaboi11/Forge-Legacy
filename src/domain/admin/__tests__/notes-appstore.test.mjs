import test from 'node:test';
import assert from 'node:assert/strict';

import { appStoreNote, ascState, parseSyncMessage } from '../notes/appstore.ts';

const base = { state: 'connected', period: '30 days', days: 30, downloads: 242, rating: 4.7, reviewStars: [5, 4, 5, 2], failedParts: [] };

test('normal: downloads a day and the recent reviews', () => {
  assert.equal(appStoreNote(base), 'About 8 downloads a day over the last 30 days. The last 3 reviews are all 4 or 5 stars.');
});

test('empty: never synced is not connected', () => {
  assert.equal(ascState(null), 'notConnected');
  assert.match(appStoreNote({ ...base, state: 'notConnected' }), /^I can’t reach Apple yet/);
});

test('parse: the three message shapes the function writes', () => {
  assert.deepEqual(parseSyncMessage('not configured: missing ASC_KEY_ID, ASC_PRIVATE_KEY · rating: HTTP 500'), {
    missing: ['ASC_KEY_ID', 'ASC_PRIVATE_KEY'],
    failed: [{ part: 'rating', text: 'HTTP 500' }],
  });
  assert.deepEqual(parseSyncMessage('failed: reviews: 403 forbidden'), { missing: [], failed: [{ part: 'reviews', text: '403 forbidden' }] });
  assert.deepEqual(parseSyncMessage('days 14 · downloads 38 · reviews 3'), { missing: [], failed: [] });
  assert.equal(ascState({ ok: false, message: 'not configured: missing ASC_VENDOR_NUMBER' }), 'notConnected');
  assert.equal(ascState({ ok: false, message: 'failed: reviews: 403' }), 'partial');
  assert.equal(ascState({ ok: true, message: 'days 14 · downloads 38 · reviews 3' }), 'connected');
});

test('edge: partial sync before launch, few downloads', () => {
  const n = appStoreNote({ ...base, state: 'partial', failedParts: ['reviews'], rating: null, downloads: 3, reviewStars: [] });
  assert.equal(n, 'The last sync couldn’t load reviews, so that part is from the last sync that worked. There’s no public rating yet.');
  assert.equal(appStoreNote({ ...base, downloads: 3, reviewStars: [3] }), '3 downloads over the last 30 days. The newest review is 3 stars.');
});
