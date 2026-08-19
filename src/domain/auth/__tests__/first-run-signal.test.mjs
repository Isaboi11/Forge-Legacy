/**
 * first-run-signal.test.mjs — does everyone actually hear the wipe?
 *
 * ══ WHAT THIS GUARDS ══
 *
 * A new account on a device that had signed somebody in before was never shown the four-tab walkthrough.
 * `resetFirstRunFlags()` had cleared storage correctly; `TourProvider` was still holding the previous
 * athlete's `completed` in React state, because it detected handovers itself with a guard that could not
 * fire on a null→id transition — which is exactly what signing up after a sign-out looks like.
 *
 * The fix is that the wipe TELLS people. So the failures worth catching are the ways a telling goes
 * quiet: a subscriber that never hears it, one that keeps hearing it after it should have stopped, and —
 * the nasty one — an unrelated subscriber throwing and taking the rest of the broadcast down with it.
 * That last case would silently restore the original bug in every OTHER listener.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { onFirstRunReset, emitFirstRunReset, __resetListenersForTest } from '../first-run-signal.ts';

test.beforeEach(() => __resetListenersForTest());

test('a subscriber hears the wipe — the whole point', () => {
  let heard = 0;
  onFirstRunReset(() => (heard += 1));
  emitFirstRunReset();
  assert.equal(heard, 1);
});

test('every subscriber hears it, not just the first', () => {
  const heard = [];
  onFirstRunReset(() => heard.push('tour'));
  onFirstRunReset(() => heard.push('coach'));
  onFirstRunReset(() => heard.push('home'));
  emitFirstRunReset();
  assert.deepEqual(heard, ['tour', 'coach', 'home']);
});

test('⚠ ONE THROWING SUBSCRIBER DOES NOT SILENCE THE OTHERS — this is the leak the signal exists to stop', () => {
  const heard = [];
  onFirstRunReset(() => heard.push('before'));
  onFirstRunReset(() => {
    throw new Error('a provider blew up mid-reset');
  });
  onFirstRunReset(() => heard.push('after'));

  assert.doesNotThrow(() => emitFirstRunReset());
  // Without the guard, 'after' never runs and that provider keeps the previous athlete's state.
  assert.deepEqual(heard, ['before', 'after']);
});

test('unsubscribing stops delivery', () => {
  let heard = 0;
  const off = onFirstRunReset(() => (heard += 1));
  emitFirstRunReset();
  off();
  emitFirstRunReset();
  assert.equal(heard, 1, 'the second wipe must not reach an unsubscribed listener');
});

test('⚠ subscribing the same function twice then unsubscribing once leaves NOBODY listening (StrictMode)', () => {
  // React 19 StrictMode double-invokes effects: subscribe, subscribe, unsubscribe. A registry keyed on
  // insertion order rather than identity would leave a duplicate live and fire the reset twice.
  let heard = 0;
  const fn = () => (heard += 1);
  onFirstRunReset(fn);
  const off = onFirstRunReset(fn);
  emitFirstRunReset();
  assert.equal(heard, 1, 'registered twice must still be ONE listener');
  off();
  emitFirstRunReset();
  assert.equal(heard, 1, 'and one unsubscribe must fully remove it');
});

test('a listener may unsubscribe itself while being notified', () => {
  const heard = [];
  const off = onFirstRunReset(() => {
    heard.push('self');
    off();
  });
  onFirstRunReset(() => heard.push('other'));

  assert.doesNotThrow(() => emitFirstRunReset());
  assert.deepEqual(heard, ['self', 'other'], 'mutating the set mid-broadcast must not skip anyone');
  emitFirstRunReset();
  assert.deepEqual(heard, ['self', 'other', 'other']);
});

test('emitting with nobody listening is a no-op, not a crash', () => {
  assert.doesNotThrow(() => emitFirstRunReset());
});
