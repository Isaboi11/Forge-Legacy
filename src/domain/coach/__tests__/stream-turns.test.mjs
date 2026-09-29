/**
 * QA R2-F5 (2026-09-26) — a second message sent while Holt is still streaming cut BOTH answers off.
 *
 * Run with FAKE streams (no model, no network) against the same pure thread operations the chat sheet
 * uses: `streamInto` / `streamEnded` (each stream touches only its own turn, by `sid`) and
 * `answerArriving` (Holt is still answering while any turn streams — the hold the queue waits on).
 *
 * The harness below is the sheet's ask loop in miniature: `busy` clears on the first chunk (the dots give
 * way to the words), a message sent while holding is queued, and the queue drains when holding ends.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { answerArriving, streamEnded, streamInto } from '../chat-core.ts';

const tick = () => new Promise((r) => setImmediate(r));

/** A fake coach-ask stream: calls onChunk with the accumulated text, one word per tick. */
async function fakeStream(answer, onChunk) {
  let acc = '';
  for (const word of answer.split(' ')) {
    await tick();
    acc = acc ? `${acc} ${word}` : word;
    onChunk(acc);
  }
  await tick();
  return acc;
}

function chat(answers) {
  const s = { thread: [], busy: null, queued: [], seq: 0, done: [] };
  const holding = () => s.busy != null || answerArriving(s.thread);
  const drain = () => {
    if (holding() || s.queued.length === 0) return;
    ask(s.queued.shift());
  };
  const ask = async (text) => {
    s.busy = 'thinking';
    s.seq += 1;
    const sid = s.seq;
    let started = false;
    const full = await fakeStream(answers[text], (acc) => {
      if (!started) {
        started = true;
        s.busy = null;
        s.thread = [...s.thread, { kind: 'holt', text: acc, streaming: true, sid }];
        return;
      }
      s.thread = streamInto(s.thread, sid, acc);
    });
    s.busy = null;
    s.thread = streamEnded(s.thread, sid);
    s.done.push(full);
    drain();
  };
  const send = (text) => {
    s.thread = [...s.thread, { kind: 'me', text }];
    if (holding()) s.queued.push(text);
    else void ask(text);
  };
  return { s, send, holding };
}

const A = 'Most people build muscle well with working sets to about eight to twelve reps near failure.';
const B = 'Rest two to three minutes on the big lifts and about ninety seconds on the rest.';

test('⚠ QA R2-F5 — a message sent mid-stream waits, and BOTH answers arrive whole', async () => {
  const { s, send, holding } = chat({ reps: A, rest: B });
  send('reps');
  // Let the first answer start streaming — the typing dots are gone, but Holt is still answering.
  for (let i = 0; i < 4; i += 1) await tick();
  assert.equal(s.busy, null, 'busy clears on the first chunk');
  assert.ok(answerArriving(s.thread), 'the first answer is still arriving');
  assert.equal(holding(), true, 'the composer still holds while the answer streams');

  send('rest');
  assert.deepEqual(s.queued, ['rest'], 'the second message waits its turn');
  assert.equal(s.thread.filter((x) => x.kind === 'holt').length, 1, 'no second stream started under the first');

  for (let i = 0; i < 200 && (s.done.length < 2 || holding()); i += 1) await tick();

  const holt = s.thread.filter((x) => x.kind === 'holt');
  assert.deepEqual(holt.map((x) => x.text), [A, B], 'each answer is whole, in its own turn, in order');
  assert.ok(holt.every((x) => !x.streaming), 'nothing is left "still arriving"');
  assert.deepEqual(s.thread.map((x) => x.kind), ['me', 'holt', 'me', 'holt']);
  assert.equal(holding(), false);
});

test('⚠ two streams that DO overlap each write and close only their own turn', async () => {
  // Belt and braces for any path that streams without the queue: interleave two fake streams by hand.
  let t = [
    { kind: 'holt', text: 'A1', streaming: true, sid: 1 },
    { kind: 'me', text: 'second' },
    { kind: 'holt', text: 'B1', streaming: true, sid: 2 },
  ];
  t = streamInto(t, 1, 'A1 A2');
  t = streamInto(t, 2, 'B1 B2');
  t = streamEnded(t, 2);
  assert.equal(answerArriving(t), true, 'the first answer still streams after the second ends');
  t = streamInto(t, 1, 'A1 A2 A3');
  t = streamEnded(t, 1);
  assert.deepEqual(t.filter((x) => x.kind === 'holt').map((x) => [x.text, !!x.streaming]), [['A1 A2 A3', false], ['B1 B2', false]]);
  assert.equal(answerArriving(t), false);
});
