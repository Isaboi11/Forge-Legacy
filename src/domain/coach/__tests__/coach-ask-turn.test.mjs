/**
 * coach-ask-turn.test.mjs — AI Road to 10 Sprint 1, run on the REAL paste bundle (coach-ask-harness.mjs).
 *
 *   · the meter: reserve → model → settle, refunded on every server-side failure, never on the athlete's cancel,
 *     settled BEFORE the last line, the reservation id never on the wire (contract §1 · P-D2)
 *   · the one retry, only before any text (C-I2)
 *   · status lines from the fixed table, and the keep-alive (C-G5)
 *   · the clock: the function's own upstream abort, refunded (contract §3)
 *   · Sonnet whenever web search is on (C-D8)
 *   · no upstream text in anything the app receives (P-D8)
 *   · the server's minor takes the self-disclosed minor's path; the medical stop still runs before the reserve (P-G8)
 *
 * ⚠ Offline: a fake model, a fake meter, a fake database. Nothing here reaches Anthropic or Supabase.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  answerEvents,
  answerRound,
  askRaw,
  dataEvents,
  errorReply,
  fakeAnthropic,
  hangingFetch,
  loadFunction,
  newLog,
  RESERVATION,
  request,
  settles,
  sse,
  stalledSse,
  toolRound,
} from './coach-ask-harness.mjs';

const ASK = { question: "what's my bench progress", history: [], context: {}, tz: 300 };
const said = (events) => events.filter((e) => typeof e.t === 'string').map((e) => e.t).join('');
const modelCalls = (log) => log.requests.length;

// ─────────────────────────────────────────────────────────────────────────────
// C-I2 — THE ONE RETRY, ONLY BEFORE THE FIRST WORD
// ─────────────────────────────────────────────────────────────────────────────

test('C-I2: an overload before any word is retried once — the athlete gets the answer, charged once', async (t) => {
  const log = newLog();
  const replies = [errorReply(529), answerRound('Your bench is up 20 lb since March.')];
  fakeAnthropic(t, log, () => replies.shift());
  const { events } = await askRaw(await loadFunction(log), ASK);
  assert.equal(modelCalls(log), 2);
  assert.equal(said(events), 'Your bench is up 20 lb since March.');
  assert.ok(events.find((e) => e.done));
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['ok', false]]);
  assert.equal(log.rpcs.filter(([n]) => n === 'coach_ai_reserve').length, 1, 'one credit for the ask, however many tries');
});

test('C-I2: at most once — two overloads are a refunded failure after two requests', async (t) => {
  const log = newLog();
  fakeAnthropic(t, log, () => errorReply(529));
  const { events } = await askRaw(await loadFunction(log), ASK);
  assert.equal(modelCalls(log), 2, 'never a third');
  assert.deepEqual(events, [{ error: 'upstream_error', refunded: true, remaining: 42 }]);
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['upstream_error', true]]);
});

test('C-I2: ⛔ never after a word has gone out — a failing next round is not retried', async (t) => {
  const log = newLog();
  // Round 1 writes words and then reaches for a tool; round 2 fails. A retry now would write a second answer.
  const replies = [toolRound('get_lift_history', '{"exercise": "bench"}', 'Let me pull that up.'), errorReply(500)];
  fakeAnthropic(t, log, () => replies.shift() ?? assert.fail('a third request went out — that is a retry after text'));
  const { events } = await askRaw(await loadFunction(log), ASK);
  assert.equal(modelCalls(log), 2);
  assert.equal(said(events), 'Let me pull that up.');
  assert.deepEqual(events.at(-1), { error: 'upstream_error', refunded: true, remaining: 42 });
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['upstream_error', true]]);
});

test('C-I2: a later round with no words yet is still retried once', async (t) => {
  const log = newLog();
  const replies = [toolRound(), errorReply(503), answerRound('225×5 last Monday, up from 205×5.')];
  fakeAnthropic(t, log, () => replies.shift());
  const { events } = await askRaw(await loadFunction(log), ASK);
  assert.equal(modelCalls(log), 3);
  assert.equal(said(events), '225×5 last Monday, up from 205×5.');
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['ok', false]]);
});

test('C-I2: a network error is retried once; a 400 is not retried at all', async (t) => {
  const log = newLog();
  let n = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (_u, init) => {
    log.requests.push(JSON.parse(init.body));
    n += 1;
    if (n === 1) throw new TypeError('fetch failed');
    return answerRound('Back on.');
  };
  t.after(() => (globalThis.fetch = realFetch));
  const first = await askRaw(await loadFunction(log), ASK);
  assert.equal(said(first.events), 'Back on.');
  assert.equal(modelCalls(log), 2);

  const log2 = newLog();
  fakeAnthropic(t, log2, () => errorReply(400, 'messages: bad'));
  const second = await askRaw(await loadFunction(log2), ASK);
  assert.equal(modelCalls(log2), 1, 'our own bad request would fail the same way twice');
  assert.deepEqual(second.events, [{ error: 'upstream_error', refunded: true, remaining: 42 }]);
});

// ─────────────────────────────────────────────────────────────────────────────
// C-G5 — STATUS LINES AND THE KEEP-ALIVE
// ─────────────────────────────────────────────────────────────────────────────

test('C-G5: a lookup says what it is doing, from the fixed table — before the first word, never the tool input', async (t) => {
  const log = newLog();
  const replies = [toolRound('get_lift_history', '{"exercise": "bench"}'), answerRound('Up 20 lb.')];
  fakeAnthropic(t, log, () => replies.shift());
  const { events, raw } = await askRaw(await loadFunction(log), ASK);
  const statuses = events.filter((e) => 'status' in e);
  assert.deepEqual(statuses, [{ status: 'Checking your lift log…' }]);
  assert.ok(events.indexOf(statuses[0]) < events.findIndex((e) => e.t), 'the status comes before the words');
  // ⛔ The model's input ("bench") never reaches a status line.
  for (const s of statuses) assert.ok(!/bench/i.test(s.status));
  for (const e of events) if ('status' in e) assert.deepEqual(Object.keys(e), ['status']);
  assert.ok(raw.startsWith(': ka\n\n'), 'the first byte goes out before the model says anything');
});

test('C-G5: a tapped web search says "Searching online…"; an unknown tool says nothing', async (t) => {
  const log = newLog();
  const replies = [
    sse([
      { type: 'message_start', message: { model: 'claude-sonnet-5', usage: { input_tokens: 10, output_tokens: 1 } } },
      { type: 'content_block_start', index: 0, content_block: { type: 'server_tool_use', id: 'srv_1', name: 'web_search', input: {} } },
      { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"query":"high protein chili SECRET-QUERY"}' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'tu_x', name: 'get_launch_codes', input: {} } },
      { type: 'content_block_stop', index: 1 },
      { type: 'content_block_start', index: 2, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 2, delta: { type: 'text_delta', text: 'Found a good one on a recipe site.' } },
      { type: 'content_block_stop', index: 2 },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 30 } },
    ]),
  ];
  fakeAnthropic(t, log, () => replies.shift());
  const { events, raw } = await askRaw(await loadFunction(log), { question: 'Find me a recipe online: chili', allowWeb: true });
  assert.deepEqual(events.filter((e) => 'status' in e), [{ status: 'Searching online…' }]);
  assert.ok(!raw.includes('SECRET-QUERY'), 'the search query is the model’s — it never rides a status line');
  assert.ok(!raw.includes('get_launch_codes'));
});

test('C-G5: the keep-alive comment keeps a long lookup from looking like a dead line', async (t) => {
  const log = newLog({ readDelayMs: 220 });
  const replies = [toolRound(), answerRound('Done.')];
  fakeAnthropic(t, log, () => replies.shift());
  const { raw, events } = await askRaw(await loadFunction(log, { ASK_KEEPALIVE_MS: 40 }), ASK);
  const kas = raw.split('\n\n').filter((b) => b === ': ka').length;
  assert.ok(kas >= 3, `expected several keep-alives during a 220 ms lookup, got ${kas}`);
  assert.equal(said(events), 'Done.');
  // Comments are not data: they never parse as an event.
  assert.ok(events.every((e) => e && typeof e === 'object'));
});

// ─────────────────────────────────────────────────────────────────────────────
// P-D2 — REFUNDED ON EVERY SERVER-SIDE FAILURE, AND SAID SO
// ─────────────────────────────────────────────────────────────────────────────

test('P-D2: a refusal, an empty reply and a cut-off with nothing shown are refunded, and the done line says so', async (t) => {
  for (const [stop, text, outcome] of [
    ['refusal', '', 'refusal'],
    ['max_tokens', '', 'truncated'],
    ['end_turn', '', 'bad_output'],
  ]) {
    const log = newLog();
    fakeAnthropic(t, log, () => answerRound(text, stop));
    const { events } = await askRaw(await loadFunction(log), ASK);
    const done = events.find((e) => e.done);
    assert.equal(done.stop, stop);
    assert.equal(done.refunded, true, stop);
    assert.equal(done.remaining, 42, 'the balance after the refund');
    assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [[outcome, true]], stop);
  }
});

test('P-D2: ⛔ a cut-off whose words were shown is CHARGED — refunding it would make a long ask free', async (t) => {
  const log = newLog();
  fakeAnthropic(t, log, () => answerRound('Week one builds the base and week two', 'max_tokens'));
  const { events } = await askRaw(await loadFunction(log), ASK);
  const done = events.find((e) => e.done);
  assert.equal(done.stop, 'max_tokens', 'the app still says it ran long');
  assert.equal(done.refunded, undefined);
  assert.equal(done.remaining, 41);
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['truncated', false]]);
});

test('P-D2: a failure MID-STREAM is refunded — the words already sent stay, the line says refunded', async (t) => {
  const log = newLog();
  fakeAnthropic(t, log, () =>
    sse([
      ...answerEvents('Start with the bar and').slice(0, 3),
      { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } },
    ]),
  );
  const { events } = await askRaw(await loadFunction(log), ASK);
  assert.equal(said(events), 'Start with the bar a', 'the first 20 characters, sent before the error');
  assert.deepEqual(events.at(-1), { error: 'upstream_error', refunded: true, remaining: 42 });
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['upstream_error', true]]);
  assert.equal(modelCalls(log), 1, 'words had gone out: no retry');
});

test('contract §3: Anthropic goes silent mid-reply — our own clock aborts it, refunds, and says timeout', async (t) => {
  const log = newLog();
  let signal = null;
  fakeAnthropic(t, log, (_b, init) => {
    signal = init.signal;
    return stalledSse(answerEvents('Hips back, chest up, and').slice(0, 3), init.signal);
  });
  const t0 = Date.now();
  const { events } = await askRaw(await loadFunction(log, { ASK_SERVER_IDLE_MS: 80 }), ASK);
  assert.ok(Date.now() - t0 < 3000, 'it did not wait on the stalled model');
  assert.equal(signal.aborted, true, 'the upstream request itself was aborted');
  assert.equal(said(events), 'Hips back, chest up,');
  assert.deepEqual(events.at(-1), { error: 'upstream_error', upstream: 'timeout', refunded: true, remaining: 42 });
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['timeout', true]]);
});

test('contract §3: no headers at all — the silence clock ends it before the app would, refunded', async (t) => {
  const log = newLog();
  fakeAnthropic(t, log, (_b, init) => hangingFetch(init));
  const { events } = await askRaw(await loadFunction(log, { ASK_SERVER_IDLE_MS: 60 }), ASK);
  assert.deepEqual(events, [{ error: 'upstream_error', upstream: 'timeout', refunded: true, remaining: 42 }]);
  assert.equal(modelCalls(log), 1, 'our own abort is not retried');
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['timeout', true]]);
});

test('contract §3: the turn budget ends a slow lookup round too — refunded, the model never asked again', async (t) => {
  const log = newLog({ readDelayMs: 400 });
  const replies = [toolRound()];
  fakeAnthropic(t, log, () => replies.shift() ?? assert.fail('the turn was over: no next round'));
  const { events } = await askRaw(await loadFunction(log, { ASK_SERVER_TURN_MS: 120 }), ASK);
  assert.deepEqual(events.filter((e) => !('status' in e)), [{ error: 'upstream_error', upstream: 'timeout', refunded: true, remaining: 42 }]);
  assert.equal(modelCalls(log), 1);
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['timeout', true]]);
});

test('P-D2: the model unreachable twice is refunded as upstream_unreachable', async (t) => {
  const log = newLog();
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (_u, init) => {
    log.requests.push(JSON.parse(init.body));
    throw new TypeError('fetch failed');
  };
  t.after(() => (globalThis.fetch = realFetch));
  const { events } = await askRaw(await loadFunction(log), ASK);
  assert.deepEqual(events, [{ error: 'upstream_unreachable', refunded: true, remaining: 42 }]);
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['upstream_unreachable', true]]);
});

test('⛔ the athlete’s own cancel is settled as cancelled and NOT refunded — once, and the model is stopped', async (t) => {
  const log = newLog();
  let upstreamSignal = null;
  fakeAnthropic(t, log, (_b, init) => {
    upstreamSignal = init.signal;
    return stalledSse(answerEvents('Your bench went from 205 to').slice(0, 3), init.signal);
  });
  const handler = await loadFunction(log);
  const res = await handler(request(ASK));
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (!buf.includes('"t":')) {
    const { done, value } = await reader.read();
    assert.ok(!done, 'the stream ended before any words');
    buf += dec.decode(value);
  }
  await reader.cancel(); // the sheet closed
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(upstreamSignal.aborted, true, 'the model stops writing (and costing)');
  const s = settles(log);
  assert.equal(s.length, 1, 'settled exactly once');
  assert.equal(s[0].p_outcome, 'cancelled');
  assert.equal(s[0].p_refund, false);
  assert.equal(s[0].p_reservation, RESERVATION);
  assert.ok(s[0].p_input_tokens > 0, 'what was generated up to the cancel is still counted');
});

test('contract §1.3: settle runs BEFORE the line that ends the turn — success and failure alike', async (t) => {
  for (const make of [() => answerRound('All good.'), () => errorReply(400)]) {
    const log = newLog({ settleDelayMs: 80 });
    fakeAnthropic(t, log, make);
    const handler = await loadFunction(log);
    const res = await handler(request(ASK));
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let lastLineAt = null;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value);
      if (lastLineAt == null && /"done":true|"error":/.test(buf)) lastLineAt = Date.now();
    }
    const settledAt = log.timeline.find(([k]) => k === 'settled')?.[1];
    assert.ok(settledAt != null && lastLineAt != null);
    assert.ok(lastLineAt >= settledAt, `the last line (${lastLineAt}) came before settle finished (${settledAt})`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// P-D8 — NO UPSTREAM TEXT, NO RESERVATION ID, IN ANYTHING THE APP RECEIVES
// ─────────────────────────────────────────────────────────────────────────────

test('⛔ P-D8: Anthropic’s words never reach the app — error body, mid-stream error, network message, summary', async (t) => {
  const SECRET = 'SECRET-UPSTREAM-credit balance is too low';
  const cases = [
    () => errorReply(500, SECRET),
    () => errorReply(400, SECRET),
    () => sse([...answerEvents('Partly').slice(0, 3), { type: 'error', error: { type: 'api_error', message: SECRET } }]),
    () => {
      throw new TypeError(`getaddrinfo ENOTFOUND ${SECRET}`);
    },
  ];
  for (const make of cases) {
    const log = newLog();
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (_u, init) => (log.requests.push(JSON.parse(init.body)), make());
    try {
      const { raw, events } = await askRaw(await loadFunction(log), ASK);
      for (const needle of ['SECRET', 'credit balance', 'api_error', 'overloaded_error', 'ENOTFOUND', '"detail"']) {
        assert.ok(!raw.includes(needle), `${needle} reached the app: ${raw}`);
      }
      const last = events.at(-1);
      assert.ok(['error', 'upstream', 'refunded', 'remaining'].includes(Object.keys(last)[0]));
    } finally {
      globalThis.fetch = realFetch;
    }
  }
  // The end-of-chat summary's JSON too.
  const log = newLog();
  fakeAnthropic(t, log, () => errorReply(500, SECRET));
  const res = await (await loadFunction(log))(
    request({ mode: 'summarize', question: '', history: [{ role: 'athlete', text: 'a' }, { role: 'holt', text: 'b' }, { role: 'athlete', text: 'c' }] }),
  );
  const body = await res.text();
  assert.ok(!body.includes('SECRET') && !body.includes('credit balance'), body);
  assert.deepEqual(JSON.parse(body), { ok: true, saved: false, reason: 'upstream_error', refunded: true });
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['upstream_error', true]]);
});

test('⛔ contract §1.3: the reservation id is never on the wire — stream, failure, refusal, minor stop', async (t) => {
  const bodies = [];
  for (const [meter, reply] of [
    [{}, () => answerRound('Fine.')],
    [{}, () => errorReply(500)],
    [{ reserve: { allowed: false, reason: 'out_of_credits', remaining: 0, allowance: 150 } }, () => assert.fail('no model')],
    [{ reserve: { minor: true, age_years: 15 } }, () => assert.fail('no model')],
  ]) {
    const log = newLog(meter);
    fakeAnthropic(t, log, reply);
    const q = meter.reserve?.minor ? { question: 'what macros should I eat to cut' } : ASK;
    bodies.push((await askRaw(await loadFunction(log), q)).raw);
  }
  for (const b of bodies) assert.ok(!b.includes(RESERVATION) && !b.includes('reservation'), b);
});

// ─────────────────────────────────────────────────────────────────────────────
// C-D8 — SONNET WHENEVER WEB SEARCH IS ON
// ─────────────────────────────────────────────────────────────────────────────

test('C-D8: a web search asked on Haiku runs on Sonnet; Haiku without one is still allowed (Haiku 5.5 since Sprint 3b)', async (t) => {
  const log = newLog();
  fakeAnthropic(t, log, () => answerRound('Found one.'));
  const handler = await loadFunction(log);
  await askRaw(handler, { question: 'Find me a recipe online: chili', allowWeb: true, model: 'claude-haiku-5-5' });
  const web = log.requests[0];
  assert.equal(web.model, 'claude-sonnet-5');
  assert.ok(web.tools.some((x) => x.type === 'web_search_20260209'));
  assert.deepEqual(web.thinking, { type: 'disabled' }, 'Sonnet’s own settings come with it');
  assert.deepEqual(log.rpcs.find(([n]) => n === 'coach_ai_reserve')[1], { p_action: 'web', p_fn: 'coach-ask' });

  await askRaw(handler, { question: 'how should I warm up?', model: 'claude-haiku-5-5' });
  const plain = log.requests[1];
  assert.equal(plain.model, 'claude-haiku-5-5');
  assert.ok(!plain.tools.some((x) => x.type?.startsWith('web_search')));
  assert.deepEqual(plain.thinking, { type: 'disabled' }, 'Haiku 5.5 takes disabled at low effort');
  assert.equal(plain.fallbacks, undefined, 'Haiku 5.5 has no server-side fallback');
});

// ─────────────────────────────────────────────────────────────────────────────
// P-G8 — THE SERVER'S MINOR TAKES THE SELF-DISCLOSED MINOR'S PATH
// ─────────────────────────────────────────────────────────────────────────────

const MINOR = { reserve: { minor: true, age_years: 16 } };

test('P-G8: a profile minor asking a diet question gets the care stop a self-disclosed minor gets — refunded, no model', async (t) => {
  for (const question of ['what macros should I eat to cut', 'how many calories should I eat', 'how many caloreis should i eat', 'how do I bulk fast']) {
    const log = newLog(MINOR);
    fakeAnthropic(t, log, () => assert.fail(`the model was called for a minor's "${question}"`));
    const r = await askRaw(await loadFunction(log), { question });
    assert.deepEqual(r.json, { route: 'care' }, question);
    assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['guarded', true]], question);
  }
  // …the very path "I'm 16" takes today, before any reserve:
  const said16 = newLog();
  fakeAnthropic(t, said16, () => assert.fail('no model'));
  assert.deepEqual((await askRaw(await loadFunction(said16), { question: "I'm 16, what macros should I eat to cut" })).json, { route: 'care' });
  assert.equal(said16.rpcs.length, 0);
});

test('P-G8: the same questions from an adult profile go to Holt as before', async (t) => {
  const log = newLog();
  fakeAnthropic(t, log, () => answerRound('Most people start around a moderate deficit.'));
  const r = await askRaw(await loadFunction(log), { question: 'how many calories should I eat' });
  assert.ok(r.events.find((e) => e.done));
  assert.equal(modelCalls(log), 1);
});

test('P-G8: a minor’s training question streams — the age rides in the user turn, the cached system block is untouched', async (t) => {
  const teen = newLog(MINOR);
  fakeAnthropic(t, teen, () => answerRound('Sit back, knees out, and keep the bar over mid-foot.'));
  await askRaw(await loadFunction(teen), { question: 'how do I squat deeper?' });
  const adult = newLog({ reserve: { age_years: 34 } });
  fakeAnthropic(t, adult, () => answerRound('Sit back, knees out.'));
  await askRaw(await loadFunction(adult), { question: 'how do I squat deeper?' });
  const [tq, aq] = [teen.requests[0], adult.requests[0]];
  assert.ok(tq.messages.at(-1).content.includes("The athlete's age, from their profile: 16."));
  assert.ok(tq.messages.at(-1).content.includes('The athlete is under 18'));
  assert.ok(aq.messages.at(-1).content.includes("The athlete's age, from their profile: 34."));
  assert.ok(!aq.messages.at(-1).content.includes('under 18'));
  assert.deepEqual(tq.system, aq.system, 'the system block is byte-identical — the cache holds');
  assert.deepEqual(tq.tools, aq.tools);
});

test('P-G8: a minor’s earlier diet line never rides along in the history; an adult’s does', async (t) => {
  const history = [
    { role: 'athlete', text: 'how many calories should I eat' },
    { role: 'holt', text: 'Around maintenance to start.' },
    { role: 'athlete', text: 'ok and what about squats' },
    { role: 'holt', text: 'Three times a week.' },
  ];
  const teen = newLog(MINOR);
  fakeAnthropic(t, teen, () => answerRound('Fine.'));
  await askRaw(await loadFunction(teen), { question: 'how deep should I go?', history });
  const adult = newLog();
  fakeAnthropic(t, adult, () => answerRound('Fine.'));
  await askRaw(await loadFunction(adult), { question: 'how deep should I go?', history });
  const text = (log) => JSON.stringify(log.requests[0].messages);
  assert.ok(!text(teen).includes('how many calories') && !text(teen).includes('Around maintenance'), 'dropped, with Holt’s reply to it');
  assert.ok(text(teen).includes('what about squats'));
  assert.ok(text(adult).includes('how many calories'));
});

test('⛔ P-G8: the medical stop still runs BEFORE the reserve — for a minor too', async (t) => {
  for (const question of ['I want to kill myself', 'I tore my ACL', 'my chest hurts and I can’t breathe']) {
    const log = newLog(MINOR);
    fakeAnthropic(t, log, () => assert.fail('no model'));
    const r = await askRaw(await loadFunction(log), { question });
    assert.ok(['crisis', 'medical_stop', 'urgent'].includes(r.json.route), question);
    assert.equal(log.rpcs.length, 0, `${question}: nothing reserved, nothing settled`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// THE METER'S REFUSALS — the routes every shipped app already reads
// ─────────────────────────────────────────────────────────────────────────────

test('reserve refusals: no Premium AI, no credits, no consent, meter down — no model, nothing to settle', async (t) => {
  for (const [meter, status, json] of [
    [{ reserve: { allowed: false, reason: 'not_entitled', reservation_id: null, remaining: 0, allowance: 0 } }, 200, { route: 'out_of_credits', remaining: 0, allowance: 0 }],
    [{ reserve: { allowed: false, reason: 'out_of_credits', reservation_id: null, remaining: 2, allowance: 150 } }, 200, { route: 'out_of_credits', remaining: 2, allowance: 150 }],
    [{ reserve: { allowed: false, reason: 'no_consent', reservation_id: null } }, 403, { route: 'error', reason: 'no_consent' }],
    [{ reserveError: true }, 503, { route: 'error', reason: 'meter_unavailable' }],
  ]) {
    const log = newLog(meter);
    fakeAnthropic(t, log, () => assert.fail('no model'));
    const r = await askRaw(await loadFunction(log), ASK);
    assert.equal(r.status, status);
    assert.deepEqual(r.json, json);
    assert.equal(settles(log).length, 0);
  }
});

test('the done line keeps its old shape for every shipped app: t, then done with usage, remaining, stop', async (t) => {
  const log = newLog();
  fakeAnthropic(t, log, () => answerRound('Three sets of eight.'));
  const { raw } = await askRaw(await loadFunction(log), ASK);
  const done = dataEvents(raw).find((e) => e.done);
  assert.deepEqual(Object.keys(done).sort(), ['done', 'remaining', 'stop', 'usage']);
  assert.deepEqual(Object.keys(done.usage).sort(), ['cacheRead', 'cacheWrite', 'input', 'model', 'output']);
});
