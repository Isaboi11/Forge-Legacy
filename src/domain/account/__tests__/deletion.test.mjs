import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canRestore,
  DELETION_WINDOW_DAYS,
  daysRemaining,
  isDuePurge,
  isPendingDeletion,
  isVisibleToOthers,
  purgeDueAt,
} from '../deletion-core.ts';

/**
 * Account deletion timing — a 30-day recovery window (PO decision, Open Question 1 → Branch B).
 *
 * Every boundary case here is guarded in the DESTRUCTIVE direction, because the two ways this can be
 * wrong are not equally bad. Purging an hour early destroys a record the athlete was still entitled to
 * recover, permanently, with no support path. Purging an hour late costs an hour of storage.
 */

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse('2026-08-06T12:00:00.000Z');
const at = (iso) => ({ deletionRequestedAt: iso });
const requested = at(new Date(T0).toISOString());

test('an account that never asked to be deleted is neither pending nor due', () => {
  for (const state of [null, undefined, at(null), at(''), at(undefined)]) {
    assert.equal(isPendingDeletion(state, T0), false);
    assert.equal(isDuePurge(state, T0), false, 'an active account must never be due for purge');
    assert.equal(isVisibleToOthers(state, T0), true);
  }
});

test('the moment deletion is requested the account is pending, hidden, and restorable', () => {
  assert.equal(isPendingDeletion(requested, T0), true);
  assert.equal(canRestore(requested, T0), true);
  assert.equal(isVisibleToOthers(requested, T0), false);
  assert.equal(isDuePurge(requested, T0), false);
});

test('one hour before the window closes it is still restorable and NOT due', () => {
  const justBefore = T0 + DELETION_WINDOW_DAYS * DAY - 60 * 60 * 1000;
  assert.equal(canRestore(requested, justBefore), true);
  assert.equal(isDuePurge(requested, justBefore), false, 'purging here destroys a recoverable record');
});

test('exactly at the boundary the window is over — due, not restorable', () => {
  const boundary = T0 + DELETION_WINDOW_DAYS * DAY;
  assert.equal(isPendingDeletion(requested, boundary), false);
  assert.equal(canRestore(requested, boundary), false);
  assert.equal(isDuePurge(requested, boundary), true);
});

test('pending and due are mutually exclusive, and one of them holds after a request', () => {
  for (const offset of [0, 1, DAY, 15 * DAY, 30 * DAY - 1, 30 * DAY, 31 * DAY, 400 * DAY]) {
    const now = T0 + offset;
    const pending = isPendingDeletion(requested, now);
    const due = isDuePurge(requested, now);
    assert.notEqual(pending, due, `at +${offset}ms exactly one of pending/due must hold`);
  }
});

test('a deleted account is invisible to others for the whole window and after it', () => {
  for (const offset of [0, DAY, 29 * DAY, 30 * DAY, 90 * DAY]) {
    assert.equal(isVisibleToOthers(requested, T0 + offset), false, `visible at +${offset / DAY}d`);
  }
});

test('days remaining rounds UP, so half a day left never reads as zero', () => {
  assert.equal(daysRemaining(requested, T0), 30);
  assert.equal(daysRemaining(requested, T0 + DAY), 29);
  assert.equal(daysRemaining(requested, T0 + 29 * DAY), 1);
  assert.equal(daysRemaining(requested, T0 + 29.5 * DAY), 1, 'twelve hours left is one day, not zero');
  assert.equal(daysRemaining(requested, T0 + 30 * DAY), 0);
});

test('days remaining is never negative, however long ago the request was', () => {
  assert.equal(daysRemaining(requested, T0 + 365 * DAY), 0);
  assert.equal(daysRemaining(null, T0), 0);
});

test('purgeDueAt is exactly the window past the request', () => {
  const due = purgeDueAt(new Date(T0).toISOString());
  assert.equal(due.getTime(), T0 + DELETION_WINDOW_DAYS * DAY);
  assert.equal(purgeDueAt('not a date'), null);
  assert.equal(purgeDueAt(''), null);
});

test('an unparseable timestamp is treated as no request, never as an immediate purge', () => {
  const junk = at('tomorrow-ish');
  assert.equal(isPendingDeletion(junk, T0), false);
  assert.equal(isDuePurge(junk, T0), false, 'garbage must not authorise erasure');
  assert.equal(isVisibleToOthers(junk, T0), true);
});

test('the window is the number the privacy policy quotes', () => {
  assert.equal(DELETION_WINDOW_DAYS, 30);
});
