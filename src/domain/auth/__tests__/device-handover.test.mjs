/**
 * device-handover.test.mjs — whose device is this?
 *
 * ══ WHAT THIS GUARDS ══
 *
 * `resetFirstRunFlags()` was triggered off an in-memory ref, guarded so an ordinary boot did not wipe
 * your own flags. The ref starts undefined on every mount, so the FIRST auth event a mount saw could
 * never trigger a reset — and on web, signing up after a reload is exactly that event. The new athlete
 * inherited the previous one's device state, including the training level Holt builds programs from.
 *
 * The failures worth catching are the two directions: a handover missed (state leaks between people),
 * and a handover invented (an ordinary athlete's flags wiped for nothing).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { isDeviceHandover, shouldRecordAthlete } from '../device-handover.ts';

test('⚠ a different athlete signing in IS a handover — the case that was being missed', () => {
  assert.equal(isDeviceHandover('athlete-a', 'athlete-b'), true);
});

test('the same athlete returning is not', () => {
  // The common case by far: a boot restoring your own session, or signing back in after a sign-out.
  assert.equal(isDeviceHandover('athlete-a', 'athlete-a'), false);
});

test('⚠ a device that has never recorded an athlete is not a handover', () => {
  /*
   * A fresh install, and every existing athlete on the day this shipped. Treating it as a handover would
   * wipe the flags of the entire installed base on their next launch — and there is nothing to protect,
   * because state belonging to nobody cannot leak to somebody.
   */
  for (const stored of [null, undefined, '']) {
    assert.equal(isDeviceHandover(stored, 'athlete-a'), false, `stored=${String(stored)}`);
  }
});

test('⚠ signing OUT is not handing the device to somebody', () => {
  // It ends a session. The athlete signing back in a minute later is the same person who left, and the
  // wipe belongs at the moment a DIFFERENT id appears — not before there is one.
  assert.equal(isDeviceHandover('athlete-a', null), false);
});

test('the stored owner is only ever a real athlete', () => {
  assert.equal(shouldRecordAthlete('athlete-a', 'athlete-b'), true, 'a new owner is recorded');
  assert.equal(shouldRecordAthlete(null, 'athlete-a'), true, 'a first owner is recorded');
  assert.equal(shouldRecordAthlete('athlete-a', 'athlete-a'), false, 'no write when nothing changed');
  /* ⚠ Writing null on sign-out would erase the fact the handover check depends on, and the next person
     to sign in would look like a first install — which is the bug, restored. */
  assert.equal(shouldRecordAthlete('athlete-a', null), false, 'signing out must not clear the owner');
});
