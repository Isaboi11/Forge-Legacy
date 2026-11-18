import test from 'node:test';
import assert from 'node:assert/strict';

import { answerEvents, ask, askRaw, fakeSupabase, loadFunction, newLog, request, settles, sse } from './coach-ask-harness.mjs';

/*
 * PL-7 (AI Road to 10 Sprint 3b) — coach-ask on whatever model coach_ai_model_config (0274) says, run for real
 * offline: the deploy copy, a fake database, a fake Anthropic and a fake config read. Nothing leaves the machine.
 */

const ENV = { SUPABASE_SERVICE_ROLE_KEY: 'svc-test' };

/** fetch: the config RPC answers `config`; Anthropic answers `reply(body, init, n)`. */
function fakeNet(t, log, { config, reply }) {
  const real = globalThis.fetch;
  let n = 0;
  log.configReads = [];
  log.inits = [];
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u === 'http://fake/rest/v1/rpc/coach_ai_model_pick') {
      log.configReads.push({ body: JSON.parse(init.body), headers: init.headers });
      return typeof config === 'function' ? config() : new Response(JSON.stringify(config), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    assert.equal(u, 'https://api.anthropic.com/v1/messages', `unexpected network call: ${u}`);
    const body = JSON.parse(init.body);
    log.requests.push(body);
    log.inits.push(init);
    n += 1;
    return reply(body, init, n);
  };
  t.after(() => (globalThis.fetch = real));
}

/** A Sonnet 5.5 tool round: a between-tools note (a thinking block, streamed with its signature), then the call. */
const thinkingToolRound = (model = 'claude-sonnet-5-5') =>
  sse([
    { type: 'message_start', message: { model, usage: { input_tokens: 900, cache_read_input_tokens: 3000, cache_creation_input_tokens: 0, output_tokens: 1 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'Looking up ' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'the bench.' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'sig-abc123' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'tu_1', name: 'get_lift_history', input: {} } },
    { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"exercise": "bench"}' } },
    { type: 'content_block_stop', index: 1 },
    { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 40 } },
    { type: 'message_stop' },
  ]);
const answer = (text, model) => sse(answerEvents(text).map((e) => (e.type === 'message_start' ? { ...e, message: { ...e.message, model } } : e)));

test('config says Sonnet 5.5: between_tools + the refusal fallback (with its beta header), and a tool round hands the thinking block back WHOLE', async (t) => {
  const log = newLog();
  const replies = [thinkingToolRound(), answer('Your bench went from 205×5 to 225×5.', 'claude-sonnet-5-5')];
  fakeNet(t, log, { config: [{ model: 'claude-sonnet-5-5', effort: 'low', canary: true }], reply: () => replies.shift() });
  const handler = await loadFunction(log, {}, ENV);
  const events = await ask(handler, "what's my bench progress");
  assert.ok(events.find((e) => e.done), JSON.stringify(events));

  assert.equal(log.configReads.length, 1);
  assert.deepEqual(log.configReads[0].body, { p_fn: 'coach-ask', p_uid: null }, 'the fake JWT has no sub');
  assert.equal(log.configReads[0].headers.Authorization, 'Bearer svc-test');
  const [first, second] = log.requests;
  for (const [i, r] of [first, second].entries()) {
    assert.equal(r.model, 'claude-sonnet-5-5');
    assert.deepEqual(r.thinking, { type: 'between_tools' }, 'disabled is a 400 on Sonnet 5.5');
    assert.deepEqual(r.output_config, { effort: 'low' });
    assert.equal(r.fallbacks, 'default');
    assert.equal(log.inits[i].headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
  }
  const asked = second.messages.at(-2);
  assert.equal(asked.role, 'assistant');
  assert.deepEqual(asked.content[0], { type: 'thinking', thinking: 'Looking up the bench.', signature: 'sig-abc123' });
  assert.deepEqual(asked.content[1], { type: 'tool_use', id: 'tu_1', name: 'get_lift_history', input: { exercise: 'bench' } });
  assert.equal(settles(log)[0].p_model, 'claude-sonnet-5-5');
});

test('a refusal fallback answers as Sonnet 5: the meter prices the model that ANSWERED', async (t) => {
  const log = newLog();
  fakeNet(t, log, { config: [{ model: 'claude-sonnet-5-5', effort: 'low', canary: false }], reply: () => answer('Here is the answer.', 'claude-sonnet-5') });
  const handler = await loadFunction(log, {}, ENV);
  await ask(handler, 'how many sets should a beginner do');
  assert.equal(log.requests[0].model, 'claude-sonnet-5-5');
  assert.equal(settles(log)[0].p_model, 'claude-sonnet-5');
});

test('a failed config read runs the in-code default — Sonnet 5, disabled, no fallback, no beta header', async (t) => {
  const log = newLog();
  fakeNet(t, log, { config: () => new Response('{"message":"permission denied"}', { status: 401 }), reply: () => answer('Fine.', 'claude-sonnet-5') });
  const handler = await loadFunction(log, {}, ENV);
  const events = await ask(handler, 'how many sets should a beginner do');
  assert.ok(events.find((e) => e.done));
  const r = log.requests[0];
  assert.equal(r.model, 'claude-sonnet-5');
  assert.deepEqual(r.thinking, { type: 'disabled' });
  assert.equal(r.fallbacks, undefined);
  assert.equal(log.inits[0].headers['anthropic-beta'], undefined);
});

test('no service key: no config read at all, the default runs (the pre-0274 behaviour)', async (t) => {
  const log = newLog();
  fakeNet(t, log, { config: () => assert.fail('no read without the key'), reply: () => answer('Fine.', 'claude-sonnet-5') });
  const handler = await loadFunction(log);
  await ask(handler, 'how many sets should a beginner do');
  assert.equal(log.configReads.length, 0);
  assert.equal(log.requests[0].model, 'claude-sonnet-5');
});

test('a tapped web search never goes to a model without the web tool: config Haiku 5.5 → the search runs on Sonnet 5', async (t) => {
  const log = newLog();
  fakeNet(t, log, { config: [{ model: 'claude-haiku-5-5', effort: 'low', canary: false }], reply: () => answer('Found one.', 'claude-sonnet-5') });
  const handler = await loadFunction(log, {}, ENV);
  await askRaw(handler, { question: 'find me a high protein chili', history: [], context: {}, tz: 0, allowWeb: true });
  const r = log.requests[0];
  assert.equal(r.model, 'claude-sonnet-5');
  assert.ok(r.tools.some((x) => x.type === 'web_search_20260209'));
  assert.deepEqual(r.thinking, { type: 'disabled' });

  const plain = newLog();
  fakeNet(t, plain, { config: [{ model: 'claude-haiku-5-5', effort: 'low', canary: false }], reply: () => answer('Sure.', 'claude-haiku-5-5') });
  const h2 = await loadFunction(plain, {}, ENV);
  await ask(h2, 'how many sets should a beginner do');
  assert.equal(plain.requests[0].model, 'claude-haiku-5-5', 'a plain ask runs the configured Haiku');
});

const summaryReply = (model) => () =>
  new Response(JSON.stringify({ model, content: [{ type: 'text', text: 'You asked how your bench is going.' }], usage: { input_tokens: 300, output_tokens: 20 }, stop_reason: 'end_turn' }), { status: 200, headers: { 'content-type': 'application/json' } });
const summarize = (handler) => handler(request({ mode: 'summarize', question: '', history: [{ role: 'athlete', text: 'bench?' }, { role: 'holt', text: 'Up.' }, { role: 'athlete', text: 'nice' }] }));

test('the summary reads its own row (coach-ask:summary) and settles as the answering model', async (t) => {
  const log = newLog();
  fakeNet(t, log, { config: [{ model: 'claude-sonnet-5', effort: 'low', canary: false }], reply: summaryReply('claude-sonnet-5-20261101') });
  globalThis.__fakeCreateClient = () => fakeSupabase(log);
  const handler = await loadFunction(log, {}, ENV);
  assert.deepEqual(await (await summarize(handler)).json(), { ok: true, saved: true });
  assert.deepEqual(log.configReads[0].body, { p_fn: 'coach-ask:summary', p_uid: null });
  const r = log.requests[0];
  assert.equal(r.model, 'claude-sonnet-5', 'the row runs');
  assert.deepEqual(r.thinking, { type: 'disabled' });
  assert.equal(settles(log)[0].p_model, 'claude-sonnet-5-20261101', 'priced as the model that answered');
});

test('a row naming retired Haiku 4.5 is refused — the summary runs its default, Haiku 5.5', async (t) => {
  const log = newLog();
  fakeNet(t, log, { config: [{ model: 'claude-haiku-4-5', effort: null, canary: false }], reply: summaryReply('claude-haiku-5-5') });
  globalThis.__fakeCreateClient = () => fakeSupabase(log);
  const handler = await loadFunction(log, {}, ENV);
  assert.deepEqual(await (await summarize(handler)).json(), { ok: true, saved: true });
  assert.equal(log.requests[0].model, 'claude-haiku-5-5');
});
