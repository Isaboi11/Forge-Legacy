/**
 * intro.test.mjs — the introduction must always finish, and a half-saved one must not outlive itself.
 *
 * ══ THE BUG ══
 *
 * The sheet persisted its thread on every change, so it persisted the introduction while it was still
 * arriving. Closing Holt within ~2s of opening him — a first look at a new screen — stored one line:
 * "I'm Holt." Every later open restored that line AND switched the intro off, because a restored
 * conversation must not replay an introduction over the top of itself.
 *
 * Result: one sentence, no opener chips, nothing to tap, and no way back. **Permanent**, because each
 * open re-saved the same single line. The PO's screenshot is exactly this.
 *
 * ⚠ SO THE TEST THAT MATTERS IS THE RESCUE, not the prevention. Preventing the bad write helps nobody
 * whose device already holds one; the reader has to disbelieve what it finds.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/intro.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { INTRO, OPENERS } from '../chat-core.ts';
import { isConversation } from '../../../lib/coach-thread.ts';

/**
 * The sheet's intro effect, as a pure reduction — same guard, same beat lookup, same terminal step.
 * It mirrors `CoachChatSheet` rather than importing it: the component cannot run under `node --test`.
 */
function runIntro(startStep = 1, startThread = [{ kind: 'holt', text: INTRO[0] }]) {
  let step = startStep;
  const thread = [...startThread];
  for (let tick = 0; tick < 50; tick++) {
    if (step >= INTRO.length + 1) return { thread, step, ticks: tick };
    const beat = INTRO[step];
    thread.push(beat != null ? { kind: 'holt', text: beat } : { kind: 'chips', chips: OPENERS.map((label) => ({ label, patch: {} })) });
    step += 1;
  }
  throw new Error('the introduction never terminated');
}

// ─────────────────────────────────────────────────────────────────────────────
// THE INTRODUCTION FINISHES
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the introduction always ends in the opener chips', () => {
  // The chips are the only way into the product from a cold start. An intro that stops early is a dead
  // screen, which is precisely what was reported.
  const { thread } = runIntro();
  const last = thread[thread.length - 1];
  assert.equal(last.kind, 'chips');
  assert.deepEqual(last.chips.map((c) => c.label), OPENERS);
});

test('every intro beat lands exactly once, in order', () => {
  const { thread } = runIntro();
  assert.deepEqual(thread.filter((t) => t.kind === 'holt').map((t) => t.text), INTRO);
});

test('the intro terminates from any step, including past the end', () => {
  for (let start = 0; start <= INTRO.length + 3; start++) {
    assert.doesNotThrow(() => runIntro(start, []), `stuck at step ${start}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ⭐ THE RESCUE
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ a stored half-introduction is NOT restored, so a stuck device recovers itself', () => {
  // Exactly what was on the PO's phone: the first beat and nothing else.
  const poisoned = [{ kind: 'holt', text: INTRO[0], live: false }];
  assert.equal(isConversation(poisoned), false, 'this must be ignored on load, or the sheet stays dead');

  // A COMPLETE introduction is still not a conversation — nobody has said anything yet.
  const full = [
    ...INTRO.map((text) => ({ kind: 'holt', text, live: false })),
    { kind: 'chips', chips: OPENERS.map((label) => ({ label, patch: {} })) },
  ];
  assert.equal(isConversation(full), false);
});

test('a real conversation IS restored — tapping a chip counts as speaking', () => {
  /*
   * The distinction the whole fix rests on. A tapped chip echoes a `me` turn exactly as typing does, so
   * "has the athlete said anything" covers both entry paths. If it did not, an athlete who only ever
   * taps would lose their thread every time they left for the Builder — §15.3, the thing persistence
   * exists for.
   */
  assert.equal(isConversation([{ kind: 'holt', text: INTRO[0] }, { kind: 'me', text: 'Build me a program' }]), true);
  assert.equal(isConversation([{ kind: 'me', text: 'marathon in October' }]), true);
});

test('a thread holding only a built program is not mistaken for a conversation', () => {
  // Cards cannot exist without a `me` turn preceding them in practice; asserting the predicate stays
  // strictly about the athlete keeps it from drifting into "anything interesting counts".
  assert.equal(isConversation([{ kind: 'program', card: {} }]), false);
  assert.equal(isConversation([]), false);
});
