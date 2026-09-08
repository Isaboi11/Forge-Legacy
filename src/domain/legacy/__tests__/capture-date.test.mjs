/**
 * capture-date.test.mjs — the gallery must not lie about when a photo was taken.
 *
 * Two things are locked here:
 *
 *  1. **`Today` is not a date.** `addTransformationEntry` substitutes the literal string `Today` when
 *     the capture field is left blank, and rows in the wild already hold it. It must never be read as a
 *     day — `elapsedBetween` already resolves it to *now*, so treating it as a parse success would make
 *     an entry from March claim to have been captured this morning, forever.
 *
 *  2. **A date never crosses midnight on the way out.** `new Date('2026-08-31')` is UTC midnight, which
 *     is August 30th at 6pm in Utah. Every path builds from local parts instead.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { captureDateIso, captureInstant, sortByCapture } from '../capture-date.ts';

test('reads the spellings athletes actually have', () => {
  assert.equal(captureDateIso('August 31, 2026'), '2026-08-31');
  assert.equal(captureDateIso('Aug 31, 2026'), '2026-08-31');
  assert.equal(captureDateIso('Aug 31 2026'), '2026-08-31');
  assert.equal(captureDateIso('31 August 2026'), '2026-08-31');
  assert.equal(captureDateIso('Mar 6, 2026'), '2026-03-06');
  assert.equal(captureDateIso('Sep. 1, 2026'), '2026-09-01');
  assert.equal(captureDateIso('2026-08-31'), '2026-08-31');
  assert.equal(captureDateIso('  September 8, 2026  '), '2026-09-08');
});

test('a label that is not a date reads as no date', () => {
  for (const junk of ['Today', 'Now', 'Comp day', '', '   ', null, undefined, 'August 2026', 'week 12']) {
    assert.equal(captureDateIso(junk), null, `"${junk}" must not parse as a day`);
  }
});

test('an impossible day is not a day', () => {
  assert.equal(captureDateIso('February 30, 2026'), null);
  assert.equal(captureDateIso('June 31, 2026'), null);
  assert.equal(captureDateIso('2026-13-01'), null);
  assert.equal(captureDateIso('2026-02-30'), null);
});

test('a parsed date lands on its own day in local time — not the evening before', () => {
  const d = new Date(captureInstant({ label: 'August 31, 2026', createdAt: '2020-01-01T00:00:00Z' }));
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 7);
  assert.equal(d.getDate(), 31, 'the UTC-midnight trap would make this the 30th west of Greenwich');
});

test('an unparseable label falls back to when the row was written', () => {
  const created = '2026-09-08T15:04:00.000Z';
  assert.equal(captureInstant({ label: 'Today', createdAt: created }), new Date(created).getTime());
});

test('a backdated entry sorts by the day it says, not by when it was added', () => {
  // All three added today, in this order; the middle one is a set from last week.
  const entries = [
    { id: 'c', label: 'September 8, 2026', createdAt: '2026-09-08T20:00:00.000Z' },
    { id: 'b', label: 'September 1, 2026', createdAt: '2026-09-08T19:00:00.000Z' },
    { id: 'a', label: 'September 5, 2026', createdAt: '2026-09-08T18:00:00.000Z' },
  ];
  assert.deepEqual(
    sortByCapture(entries).map((e) => e.id),
    ['c', 'a', 'b'],
  );
});

test('entries sharing a capture day keep the order the server sent', () => {
  const entries = [
    { id: 'newer', label: 'September 8, 2026', createdAt: '2026-09-08T20:00:00.000Z' },
    { id: 'older', label: 'September 8, 2026', createdAt: '2026-09-08T08:00:00.000Z' },
  ];
  assert.deepEqual(
    sortByCapture(entries).map((e) => e.id),
    ['newer', 'older'],
  );
});

test('sorting does not mutate the array it was handed', () => {
  const entries = [
    { id: 'a', label: 'September 1, 2026', createdAt: '2026-09-01T00:00:00.000Z' },
    { id: 'b', label: 'September 8, 2026', createdAt: '2026-09-08T00:00:00.000Z' },
  ];
  sortByCapture(entries);
  assert.deepEqual(entries.map((e) => e.id), ['a', 'b']);
});
