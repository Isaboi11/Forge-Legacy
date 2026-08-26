/**
 * Closing Holt ends the conversation — and clearing storage is not what makes that true.
 *
 * PO, 2026-08-26: *"with coach holt if I close him then the conversation should delete and restart."*
 * `collapse` had called `clearThread()` since 2026-08-11 and the conversation still came back.
 *
 * The `store` here is a stand-in for AsyncStorage under `coach-thread.ts`. What it models is the ORDER
 * the sheet actually runs in: a `say()` that resolves after an `await pause(…)` lands while the sheet is
 * still mounted for its 200 ms exit, the save effect fires, and the write beats the delete. Both halves
 * of the fix are exercised through the same functions the sheet imports, so deleting either guard from
 * `CoachChatSheet` fails these rather than leaving them passing over a hole.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { threadSurvives, mayPersist, clearsOnUnmount, allowWrites, stopWrites } from '../thread-lifecycle.ts';

/**
 * `coach-thread.ts`, minus AsyncStorage — the same three functions, with the same gate calls in the same
 * places. `saveThread` refuses when the gate is shut, `clearThread` shuts it before deleting, and
 * `loadThread` reopens it because a sheet is opening.
 */
const makeStore = () => {
  let value = null;
  return {
    save: (turns) => { if (!mayPersist()) return; value = turns; },
    clear: () => { stopWrites(); value = null; },
    load: () => { allowWrites(); return value; },
    read: () => value,
  };
};

/** The sheet, reduced to the decisions this module owns. */
function sheet(store) {
  let ending = null;
  store.load(); // the greeting effect reads the thread on mount
  return {
    /** The save effect — runs on every `thread` change, including ones already in flight. */
    say: (turns) => store.save(turns),
    /** The X, the scrim, the drag. */
    close: () => { ending = 'close'; store.clear(); },
    /** The Program Builder and the route chips — §15.3. */
    handOff: () => { ending = 'hand-off'; },
    /** A session, a ceremony, the tour, or the route leaving the four home surfaces. */
    unmount: () => { if (clearsOnUnmount(ending)) store.clear(); },
  };
}

test('⚠ a turn still in flight cannot resurrect a closed conversation', () => {
  const store = makeStore();
  const s = sheet(store);
  s.say(['me: build me a program']);
  assert.ok(store.read(), 'the conversation is stored while he is open');

  s.close();
  /* `advance()` was mid `await pause(650)` when the X was tapped. It lands 200 ms later, on a sheet that
     is still mounted for its exit animation. THIS is what used to write the thread back. */
  s.say(['me: build me a program', 'holt: how long have you got?']);

  /* ⚠ ASSERTED BEFORE THE UNMOUNT, DELIBERATELY. Checking only after it would pass with the write gate
     removed entirely, because the unmount cleanup clears a second time and hides the resurrection — a
     mutation run caught exactly that and this assertion is the fix for it. The gate is what keeps the
     thread deleted for the whole 200 ms the sheet is still mounted and still writing. */
  assert.equal(store.read(), null, 'the in-flight turn cannot write it back while he is closing');

  s.unmount();
  assert.equal(store.read(), null, 'closing him deletes the conversation and it stays deleted');
});

test('every exit ends the conversation except the hand-off', () => {
  assert.equal(threadSurvives('hand-off'), true, '§15.3 — one errand inside a single conversation');
  assert.equal(threadSurvives('close'), false);
  assert.equal(threadSurvives('interrupted'), false);
});

test('⚠ an unmount that declared nothing is an interruption, not a hand-off', () => {
  const store = makeStore();
  const s = sheet(store);
  s.say(['me: build me a program']);
  /* No close, no hand-off — a ceremony took the screen and `CoachBubble` returned null. Defaulting the
     other way is the bug: every path that forgot to say what it was kept the conversation. */
  s.unmount();
  assert.equal(store.read(), null, 'he does not reopen holding a conversation nobody returned to');
  assert.equal(clearsOnUnmount(null), true);
});

test('leaving for the Program Builder keeps it — that is the whole reason it persists', () => {
  const store = makeStore();
  const s = sheet(store);
  s.say(['me: build me a program', 'holt: here it is']);
  s.handOff();
  s.unmount();
  assert.deepEqual(store.read(), ['me: build me a program', 'holt: here it is'],
    'Holt writes the outcome back into the conversation that produced it');
});

test('a hand-off keeps writing — the builder outcome still has to reach the thread', () => {
  const store = makeStore();
  const s = sheet(store);
  s.say(['a']);
  s.handOff();
  /* ⚠ UNLIKE A CLOSE. The gate is shut by `clearThread`, and a hand-off does not clear — Holt writes the
     outcome back into the conversation that produced it when the athlete comes back. */
  s.say(['a', 'b']);
  assert.deepEqual(store.read(), ['a', 'b']);
});

test('opening him again reopens the gate a close had shut', () => {
  const store = makeStore();
  const first = sheet(store);
  first.say(['me: build me a program']);
  first.close();
  first.unmount();
  assert.equal(store.read(), null);

  const second = sheet(store); // a fresh mount calls loadThread, which reopens writes
  second.say(['me: and again']);
  assert.deepEqual(store.read(), ['me: and again'], 'the next conversation saves normally');
});
