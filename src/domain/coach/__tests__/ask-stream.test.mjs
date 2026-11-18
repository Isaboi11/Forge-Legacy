/**
 * ask-stream.test.mjs — Holt's answer off the wire, with a clock on it (AI audit 2026-11-16, C-D2 · C-D4).
 *
 * Fake streams only. Nothing here calls a deployed function or a model.
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/__tests__/ask-stream.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { askClock, readAskStream, settleAskRead, within } from '../ask-stream.ts';

const enc = new TextEncoder();
const line = (o) => enc.encode(`data: ${JSON.stringify(o)}\n\n`);

/** A reader that hands out `chunks` in order, then either ends or hangs forever (`hang`). Records a cancel. */
function fakeReader(chunks, { hang = false } = {}) {
  const queue = [...chunks];
  const r = {
    cancelled: null,
    read() {
      if (queue.length) return Promise.resolve({ done: false, value: queue.shift() });
      return hang ? new Promise(() => {}) : Promise.resolve({ done: true, value: undefined });
    },
    cancel(reason) {
      r.cancelled = reason ?? 'cancelled';
      return Promise.resolve();
    },
  };
  return r;
}

const done = (extra = {}) => line({ done: true, usage: {}, remaining: 140, stop: 'end_turn', ...extra });
const settle = async (chunks, opts) => settleAskRead(await readAskStream(fakeReader(chunks, opts), () => {}));

// ─────────────────────────────────────────────────────────────────────────────
// HOW IT ENDED (C-D4)
// ─────────────────────────────────────────────────────────────────────────────

test('a whole answer is complete, not cut, and carries the balance', async () => {
  const r = await settle([line({ t: 'Three sets ' }), line({ t: 'of eight.' }), done()]);
  assert.deepEqual(r, { kind: 'answer', text: 'Three sets of eight.', remaining: 140, complete: true, cut: false, actions: [], stop: 'end_turn' });
});

test('⚠ a refusal with no words is Holt declining — never the outage card', async () => {
  assert.deepEqual(await settle([done({ stop: 'refusal' })]), { kind: 'refused' });
});

test('⚠ a refusal mid-reply takes the words back with it, and any action he forwarded', async () => {
  const r = await settle([line({ t: 'Here is how you' }), line({ action: { name: 'propose_program_edit', input: {} } }), done({ stop: 'refusal' })]);
  assert.deepEqual(r, { kind: 'refused' });
});

test('a reply stopped at the length cap keeps its words and says it was cut', async () => {
  const r = await settle([line({ t: 'Week one is about building a base and ' }), done({ stop: 'max_tokens' })]);
  assert.equal(r.kind, 'answer');
  assert.equal(r.complete, true);
  assert.equal(r.cut, true);
  assert.equal((await settle([line({ t: 'x' }), done({ stop: 'model_context_window_exceeded' })])).cut, true);
  assert.equal((await settle([line({ t: 'x' }), done({ stop: 'end_turn' })])).cut, false);
  assert.equal((await settle([line({ t: 'x' }), done({ stop: null })])).cut, false, 'an older function sends no stop');
});

test('an action with no words is still an answer — the card is the reply', async () => {
  const r = await settle([line({ action: { name: 'propose_program_edit', input: { change: 'swap' } } }), done()]);
  assert.equal(r.kind, 'answer');
  assert.equal(r.actions.length, 1);
});

test('the function’s error line: words keep as a cut-off answer, none is an outage with the reason', async () => {
  // ⛔ P-D8: an older function's `detail` (Anthropic's own words) never reaches the result — the code alone does.
  assert.deepEqual(await settle([line({ error: 'upstream_error', detail: '529 overloaded' })]), {
    kind: 'offline',
    detail: 'upstream_error',
    timedOut: false,
    aborted: false,
  });
  const partial = await settle([line({ t: 'Squat first, ' }), line({ error: 'upstream_dropped' })]);
  assert.equal(partial.kind, 'answer');
  assert.equal(partial.complete, false);
});

test('a stream that just ends, or a done line with nothing in it, is an outage', async () => {
  assert.equal((await settle([])).detail, 'stream_ended');
  assert.equal((await settle([done()])).detail, 'empty_reply');
});

test('a reader that throws is a break: the words keep, the far end is cancelled', async () => {
  const reader = fakeReader([line({ t: 'Bench on Monday, ' })]);
  let n = 0;
  const read = reader.read;
  reader.read = () => (n++ === 0 ? read() : Promise.reject(new Error('Network connection was lost')));
  const out = await readAskStream(reader, () => {});
  assert.match(out.broke, /connection was lost/);
  assert.ok(reader.cancelled, 'the reader is cancelled so coach-ask stops writing');
  const r = settleAskRead(out);
  assert.equal(r.kind, 'answer');
  assert.equal(r.complete, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE CLOCK (C-D2)
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ nothing back at all: the first-byte clock ends it as an outage, quickly', async () => {
  const clock = askClock({ firstByteMs: 30, idleMs: 1000 });
  const reader = fakeReader([], { hang: true });
  const t0 = Date.now();
  const out = await readAskStream(reader, () => {}, clock);
  clock.done();
  assert.ok(Date.now() - t0 < 500, 'it must not wait on the stalled read');
  assert.equal(clock.why(), 'timeout');
  assert.equal(clock.signal.aborted, true, 'the fetch is aborted too');
  assert.ok(reader.cancelled);
  assert.deepEqual(settleAskRead(out, clock.why()), { kind: 'offline', detail: 'timeout', timedOut: true, aborted: false });
});

test('⚠ words, then silence: the idle clock ends it, and the words stand as a cut-off answer', async () => {
  const clock = askClock({ firstByteMs: 1000, idleMs: 30 });
  const seen = [];
  const out = await readAskStream(fakeReader([line({ t: 'Keep the bar over mid-foot and ' })], { hang: true }), (t) => seen.push(t), clock);
  clock.done();
  assert.equal(clock.why(), 'timeout');
  assert.deepEqual(seen, ['Keep the bar over mid-foot and ']);
  const r = settleAskRead(out, clock.why());
  assert.equal(r.kind, 'answer');
  assert.equal(r.complete, false);
});

test('the idle clock restarts on every event, so a slow but steady reply is never cut', async () => {
  /* Five 30 ms gaps add up to 150 ms — past a 100 ms limit if the clock did NOT restart, well inside it if it does. */
  const clock = askClock({ firstByteMs: 100, idleMs: 100 });
  const chunks = [line({ t: 'a' }), line({ t: 'b' }), line({ t: 'c' }), line({ t: 'd' }), done()];
  let i = 0;
  const reader = {
    read: () => new Promise((res) => setTimeout(() => res({ done: false, value: chunks[i++] }), 30)),
    cancel: () => Promise.resolve(),
  };
  const out = await readAskStream(reader, () => {}, clock);
  clock.done();
  assert.equal(clock.why(), null, 'a 30 ms gap never reaches a 100 ms idle limit');
  assert.equal(settleAskRead(out, clock.why()).text, 'abcd');
});

test('⚠ the sheet closing aborts it, and that is not an outage anybody is told about', async () => {
  const sheet = new AbortController();
  const clock = askClock({ firstByteMs: 1000, idleMs: 1000, signal: sheet.signal });
  const reading = readAskStream(fakeReader([line({ t: 'Your deadlift has gone ' })], { hang: true }), () => {}, clock);
  setTimeout(() => sheet.abort(), 20);
  const out = await reading;
  clock.done();
  assert.equal(clock.why(), 'aborted');
  assert.equal(clock.signal.aborted, true);
  assert.deepEqual(settleAskRead(out, clock.why()), { kind: 'offline', detail: 'aborted', timedOut: false, aborted: true });
});

test('a signal already aborted stops the clock before it starts', () => {
  const sheet = new AbortController();
  sheet.abort();
  const clock = askClock({ firstByteMs: 1000, idleMs: 1000, signal: sheet.signal });
  assert.equal(clock.why(), 'aborted');
  clock.done();
});

test('done() stops the clock: no late timeout, and the caller’s signal is let go', async () => {
  const sheet = new AbortController();
  const clock = askClock({ firstByteMs: 20, idleMs: 20, signal: sheet.signal });
  clock.done();
  await new Promise((r) => setTimeout(r, 50));
  sheet.abort();
  assert.equal(clock.why(), null);
  assert.equal(clock.signal.aborted, false);
});

test('within(): the value in time, the fallback when late or failed', async () => {
  assert.equal(await within(100, Promise.resolve('notes'), 'none'), 'notes');
  assert.equal(await within(20, new Promise(() => {}), 'none'), 'none');
  assert.equal(await within(100, Promise.reject(new Error('x')), 'none'), 'none');
});
