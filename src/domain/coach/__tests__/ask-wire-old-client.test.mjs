/**
 * ask-wire-old-client.test.mjs — ⚠ THE PHONES ALREADY OUT THERE talk to the Sprint 1 server (AI Road to 10, C-G5).
 *
 * The new coach-ask sends three things no shipped app has seen: a keep-alive COMMENT line (`: ka`), `{status}`
 * lines during a lookup, and new fields on its `error` / `done` lines (`refunded`, `remaining`, `upstream`).
 * Before deciding whether to send them to everyone or only to apps that ask (a `wire: 2` flag), this proves what
 * the old parsers do with them:
 *
 *   · OTA #24 (Sprint 0) — `fixtures/ota24-ask-stream.ts` + `ota24-ask-wire.ts`, verbatim copies from b87a2511.
 *   · Every build before Sprint 0 — its read loop is copied below verbatim from coach-ask-live.ts at df40491c~1,
 *     and it parses with the same `readAskEvent` / `parseSse` (unchanged in every build since 09bc5231).
 *
 * The wire is not hand-written: each case runs the REAL Sprint 1 paste bundle (coach-ask-harness.mjs) and feeds its
 * bytes, in small chunks, to the old parser — once as sent and once with every new line stripped out. They must
 * come out identical, and the old app must never show a word that is not Holt's.
 *
 * RESULT: the old parsers drop all of it (`readAskEvent` → null for `{status}`; `parseSse` emits no event for a
 * `:` line; extra fields are ignored). So the server sends them to every app, with no flag.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { answerEvents, answerRound, errorReply, fakeAnthropic, loadFunction, newLog, request, sse, stalledSse, toolRound } from './coach-ask-harness.mjs';
import { askClock, readAskStream, settleAskRead } from './fixtures/ota24-ask-stream.ts';
import { parseSse, readAskEvent, utf8Decoder } from './fixtures/ota24-ask-wire.ts';

const enc = new TextEncoder();

/** A reader over `raw`, `size` bytes at a time — so a line, a CRLF and a multi-byte "…" all split somewhere. */
function chunked(raw, size) {
  const bytes = enc.encode(raw);
  let i = 0;
  return {
    read: async () => (i >= bytes.length ? { done: true, value: undefined } : { done: false, value: bytes.slice(i, (i += size)) }),
    cancel: async () => undefined,
  };
}

/** The wire with every Sprint 1 addition taken out: keep-alive comments and status lines. */
const withoutNewLines = (raw) =>
  raw
    .split('\n\n')
    .filter((b) => b !== ': ka' && !b.startsWith('data: {"status":'))
    .join('\n\n');

/** The pre-Sprint 0 read loop, verbatim from `askHolt` at df40491c~1 (only wrapped in a function). */
async function preSprint0Read(reader, onText) {
  let text = '';
  const decoder = utf8Decoder();
  let carry = '';
  let remaining = null;
  let finished = false;
  let failure = null;
  const actions = [];

  while (!finished) {
    const { done, value } = await reader.read();
    if (done) break;
    const parsed = parseSse(decoder.decode(value), carry);
    carry = parsed.carry;
    for (const ev of parsed.events) {
      const e = readAskEvent(ev.data);
      if (!e) continue;
      if ('t' in e) {
        text += e.t;
        onText(text);
      } else if ('action' in e) {
        actions.push(e.action);
      } else if ('error' in e) {
        failure = e.detail ? `${e.error}: ${e.detail}` : e.error;
        finished = true;
        break;
      } else {
        remaining = e.remaining;
        finished = true;
        break;
      }
    }
  }

  const said = text.trim();
  if (failure) {
    return said ? { kind: 'answer', text: said, remaining: null, complete: false, actions } : { kind: 'offline', detail: failure };
  }
  if (!said && actions.length === 0) return { kind: 'offline', detail: finished ? 'empty_reply' : 'stream_ended' };
  return { kind: 'answer', text: said, remaining, complete: finished, actions };
}

/** `fromRoute` as OTA #24 and every earlier build have it (coach-ask-live.ts) — the JSON replies. */
function oldFromRoute(d) {
  switch (d?.route) {
    case 'crisis':
    case 'urgent':
    case 'care':
      return { kind: d.route };
    case 'medical_stop':
      return { kind: 'medical' };
    case 'out_of_credits':
      return { kind: 'out_of_credits', remaining: d.remaining ?? 0, allowance: d.allowance ?? 0 };
    default:
      return { kind: 'offline', detail: d?.reason ?? d?.detail ?? 'unknown_route' };
  }
}

/** Run the real Sprint 1 bundle once and return the raw bytes it sent. */
async function wireFrom(t, { reply, overrides = {}, meter = {}, body = { question: "what's my bench progress" } }) {
  const log = newLog(meter);
  fakeAnthropic(t, log, reply);
  const res = await (await loadFunction(log, overrides))(request(body));
  return { raw: await res.text(), type: res.headers.get('content-type') ?? '', status: res.status };
}

/** Both old parsers over `raw`, as sent and stripped, at several chunk sizes. Returns OTA #24's and pre-S0's views. */
async function readOld(raw) {
  const out = [];
  for (const size of [1, 3, 7, 64, 1 << 16]) {
    const words24 = [];
    const wordsPre = [];
    const ota24 = settleAskRead(await readAskStream(chunked(raw, size), (x) => words24.push(x)));
    const ota24Plain = settleAskRead(await readAskStream(chunked(withoutNewLines(raw), size), () => {}));
    const pre = await preSprint0Read(chunked(raw, size), (x) => wordsPre.push(x));
    const prePlain = await preSprint0Read(chunked(withoutNewLines(raw), size), () => {});
    assert.deepEqual(ota24, ota24Plain, `OTA #24 read the new lines as something (chunk ${size})`);
    assert.deepEqual(pre, prePlain, `a pre-Sprint 0 build read the new lines as something (chunk ${size})`);
    out.push({ ota24, pre, words24, wordsPre });
  }
  return out[0];
}

const STATUS_WORDS = /Checking|Looking|Searching|Opening|…|: ka|status/;

test('old phones: a lookup with status lines and keep-alives reads exactly as it did — Holt’s words only', async (t) => {
  const replies = [toolRound(), answerRound('Your bench went from 205×5 in March to 225×5 on Monday.')];
  const { raw } = await wireFrom(t, { reply: () => replies.shift() });
  assert.ok(raw.includes('data: {"status":"Checking your lift log…"}') && raw.startsWith(': ka'), 'the new lines are really on the wire');
  const { ota24, pre, words24, wordsPre } = await readOld(raw);
  assert.deepEqual(ota24, { kind: 'answer', text: 'Your bench went from 205×5 in March to 225×5 on Monday.', remaining: 41, complete: true, cut: false, actions: [] });
  assert.equal(pre.kind, 'answer');
  assert.equal(pre.text, ota24.text);
  // ⛔ No junk on screen: every text update the old sheet renders is Holt's own words.
  for (const w of [...words24, ...wordsPre]) assert.doesNotMatch(w, STATUS_WORDS, w);
});

test('old phones: a refunded failure is still their outage card — refunded/remaining ignored, no upstream text', async (t) => {
  const { raw } = await wireFrom(t, { reply: () => errorReply(529, 'SECRET overloaded') });
  assert.match(raw, /"refunded":true/);
  const { ota24, pre } = await readOld(raw);
  assert.deepEqual(ota24, { kind: 'offline', detail: 'upstream_error', timedOut: false, aborted: false });
  assert.deepEqual(pre, { kind: 'offline', detail: 'upstream_error' });
});

test('old phones: the function’s own timeout (`upstream: timeout`) is their outage card, words kept as a cut-off', async (t) => {
  const { raw } = await wireFrom(t, {
    reply: (_b, init) => stalledSse(answerEvents('Hips back, chest up, and').slice(0, 3), init.signal),
    overrides: { ASK_SERVER_IDLE_MS: 60 },
  });
  assert.match(raw, /"upstream":"timeout"/);
  const { ota24, pre } = await readOld(raw);
  assert.equal(ota24.kind, 'answer');
  assert.equal(ota24.complete, false, 'OTA #24 shows its "lost the line partway" card');
  assert.equal(pre.complete, false);
});

test('old phones: a refunded refusal and a forwarded action read as they did before Sprint 1', async (t) => {
  const refusal = await wireFrom(t, { reply: () => answerRound('', 'refusal') });
  const r = await readOld(refusal.raw);
  assert.deepEqual(r.ota24, { kind: 'refused' }, 'OTA #24 already names a refusal');
  assert.deepEqual(r.pre, { kind: 'offline', detail: 'empty_reply' }, 'pre-Sprint 0 never did — unchanged by Sprint 1');

  const replies = [
    sse([
      { type: 'message_start', message: { model: 'claude-sonnet-5', usage: { input_tokens: 8, output_tokens: 1 } } },
      { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tu_e', name: 'propose_program_edit', input: {} } },
      { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"op":"skip","day":"Friday"}' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 5 } },
    ]),
    answerRound('Set it up — tap to confirm.'),
  ];
  const action = await wireFrom(t, { reply: () => replies.shift() });
  const a = await readOld(action.raw);
  assert.deepEqual(a.ota24.actions, [{ name: 'propose_program_edit', input: { op: 'skip', day: 'Friday' } }]);
  assert.deepEqual(a.pre.actions, a.ota24.actions);
});

test('old phones: the keep-alive HELPS OTA #24’s clock — a long lookup no longer reads as a dead line', async (t) => {
  const log = newLog({ readDelayMs: 250 });
  const replies = [toolRound(), answerRound('Up 20 lb.')];
  fakeAnthropic(t, log, () => replies.shift());
  const res = await (await loadFunction(log, { ASK_KEEPALIVE_MS: 30 }))(request({ question: "what's my bench progress" }));
  // OTA #24's own clock, scaled down: it gives up after 90 ms of silence — far less than the 250 ms lookup.
  const clock = askClock({ firstByteMs: 90, idleMs: 90 });
  const read = await readAskStream(res.body.getReader(), () => {}, clock);
  clock.done();
  assert.equal(clock.why(), null, 'the old clock never fired: the comment lines kept it fed');
  assert.deepEqual(settleAskRead(read), { kind: 'answer', text: 'Up 20 lb.', remaining: 41, complete: true, cut: false, actions: [] });
});

test('old phones: the JSON replies — a profile minor’s stop is their care card; no_consent is their outage card', async (t) => {
  const minor = await wireFrom(t, { reply: () => assert.fail('no model'), meter: { reserve: { minor: true, age_years: 15 } }, body: { question: 'how many calories should I eat' } });
  assert.deepEqual(oldFromRoute(JSON.parse(minor.raw)), { kind: 'care' }, 'the route every shipped app has copy for');
  const consent = await wireFrom(t, { reply: () => assert.fail('no model'), meter: { reserve: { allowed: false, reason: 'no_consent', reservation_id: null } } });
  assert.equal(consent.status, 403);
  // Unreachable in practice (they ask for consent before they ask Holt); if it ever happens, an honest outage card.
  assert.deepEqual(oldFromRoute(JSON.parse(consent.raw)), { kind: 'offline', detail: 'no_consent' });
  const credits = await wireFrom(t, { reply: () => assert.fail('no model'), meter: { reserve: { allowed: false, reason: 'not_entitled', reservation_id: null, remaining: 0, allowance: 0 } } });
  assert.deepEqual(oldFromRoute(JSON.parse(credits.raw)), { kind: 'out_of_credits', remaining: 0, allowance: 0 });
});
