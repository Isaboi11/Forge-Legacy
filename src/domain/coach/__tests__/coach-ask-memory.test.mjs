/**
 * coach-ask-memory.test.mjs — AI Road to 10 Sprint 4b "Holt remembers you", lane A (CH-4). The REAL paste bundle,
 * offline (coach-ask-harness.mjs): nothing leaves the machine.
 *
 *   §1.1  ⛔ memory_v1 NEVER moves the cached prefix: the system block and the tool list are byte-identical with and
 *         without it (so every recording under the 4a prompt hashes — ask-safety, ask-answers, ask-actions — stays
 *         valid with NO re-record), and with no `earlier` the whole request is identical. No caps is still v28.
 *   §1.2  `earlier` rides in the MESSAGES, only with memory_v1, guarded again here. `mode: 'recap'` exists only with
 *         memory_v1, on Haiku, metered as 'summary', every stopped turn dropped and every medical sentence removed.
 *   §1.3  summarize with memory_v1 returns {summary, facts} (structured output); the SERVER keeps the facts as the
 *         athlete, source 'chat', through keepFact + the memory guard + the cap; old phones get 4a's reply shape.
 *   §1.4  the off switch: nothing is summarised or kept for ANY app version, and get_past_chats reads nothing.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { answerRound, loadFunction, newLog, request, toolRound, dataEvents } from './coach-ask-harness.mjs';
import { HOLT_ACTION_CAPS } from '../holt-actions.ts';
import { HOLT_MEMORY_CAPS, RECAP_SYSTEM, SUMMARY_SYSTEM_V1, MEMORY_SUMMARY_SCHEMA, RECAP_WIRE_CHARS } from '../holt-memory.ts';
import { SUMMARY_SYSTEM, PAST_CHATS_MEMORY_OFF } from '../ask-tools.ts';

const V28_TOOLS = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'v28-ask-tool-list.json'), 'utf8'));
const V28_SYSTEM_SHA = 'b3cb1ee88eea110ef7769bf461e7d6ec9db670dc301ec756f5dc01c735c41dab';
const CAPS_4A = [HOLT_ACTION_CAPS];
const CAPS_4B = [HOLT_ACTION_CAPS, HOLT_MEMORY_CAPS];
const sha = (x) => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');

/** A non-streamed Anthropic reply (the memory jobs read `res.json()`). */
const jsonReply = (text, { stop = 'end_turn', model = 'claude-haiku-5-5' } = {}) =>
  new Response(JSON.stringify({ model, content: [{ type: 'text', text }], stop_reason: stop, usage: { input_tokens: 700, output_tokens: 90 } }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

/** A fetch for one test: Anthropic answers from `replies` in turn; the model-config read answers like PostgREST. */
function fakeNet(t, log, replies) {
  const real = globalThis.fetch;
  const queue = [...replies];
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u === 'https://api.anthropic.com/v1/messages') {
      log.requests.push(JSON.parse(init.body));
      const next = queue.shift();
      if (!next) throw new Error('no reply queued for the model');
      return typeof next === 'function' ? next() : next;
    }
    if (u.endsWith('/rest/v1/rpc/coach_ai_model_pick')) return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    throw new Error(`unexpected network call: ${u}`);
  };
  t.after(() => (globalThis.fetch = real));
}

async function call(t, body, replies = [], meter = {}) {
  const log = newLog(meter);
  fakeNet(t, log, replies);
  const handler = await loadFunction(log);
  const res = await handler(request(body));
  const raw = await res.text();
  const type = res.headers.get('content-type') ?? '';
  return { log, status: res.status, raw, json: type.includes('json') ? JSON.parse(raw) : null, events: type.includes('event-stream') ? dataEvents(raw) : [] };
}

const reserves = (log) => log.rpcs.filter(([n]) => n === 'coach_ai_reserve').map(([, a]) => a);
const settles = (log) => log.rpcs.filter(([n]) => n === 'coach_ai_settle').map(([, a]) => a);
const inserted = (log, table) => log.inserts.filter(([t]) => t === table).map(([, r]) => r);

const HISTORY = [
  { role: 'holt', text: 'Hey. What are we working on?' },
  { role: 'athlete', text: 'how should I warm up for squats' },
  { role: 'holt', text: 'Two light sets, then build up.' },
];
const ASK = { question: 'and for deadlifts?', history: HISTORY, context: {}, tz: 300 };

// ─────────────────────────────────────────────────────────────────────────────
// §1.1 — the cached prefix does not move
// ─────────────────────────────────────────────────────────────────────────────

test('⛔ §1.1 memory_v1 with no earlier: the WHOLE request equals 4a’s — the system block, the tools (names AND bytes), the messages', async (t) => {
  const a = await call(t, { ...ASK, caps: CAPS_4A }, [answerRound('Same as squats.')]);
  const b = await call(t, { ...ASK, caps: CAPS_4B }, [answerRound('Same as squats.')]);
  const ra = a.log.requests[0];
  const rb = b.log.requests[0];
  // The prompt hash and the tool names, as the contract states it — then every byte.
  assert.equal(sha(rb.system[0].text), sha(ra.system[0].text));
  assert.deepEqual(rb.tools.map((x) => x.name), ra.tools.map((x) => x.name));
  assert.equal(sha(rb.tools), sha(ra.tools));
  assert.deepEqual(rb.system, ra.system);
  assert.deepEqual(rb.messages, ra.messages);
  assert.deepEqual({ ...rb, messages: null }, { ...ra, messages: null });
});

test('⛔ §1.1 memory_v1 WITH earlier: system + tools byte-identical; only the first message gains the recap block', async (t) => {
  const earlier = 'The athlete can train Monday, Wednesday and Friday, 45 minutes. Holt offered a 3-day full-body block.';
  const a = await call(t, { ...ASK, caps: CAPS_4A }, [answerRound('Same as squats.')]);
  const b = await call(t, { ...ASK, caps: CAPS_4B, earlier }, [answerRound('Same as squats.')]);
  const ra = a.log.requests[0];
  const rb = b.log.requests[0];
  assert.equal(JSON.stringify(rb.system), JSON.stringify(ra.system));
  assert.equal(JSON.stringify(rb.tools), JSON.stringify(ra.tools));
  // History starts with Holt's opener: the recap takes the placeholder's place, ahead of the history.
  assert.equal(ra.messages[0].content, '(The athlete opened the chat with Holt.)');
  assert.match(rb.messages[0].content, /^\[Earlier in this conversation — the app's short notes of the turns before the ones below, not the athlete's own words: The athlete can train Monday, Wednesday and Friday, 45 minutes\./);
  assert.deepEqual(rb.messages.slice(1), ra.messages.slice(1));
  assert.ok(!rb.system[0].text.includes('Monday, Wednesday'), 'never in the system block');
});

test('⛔ §1.1 no caps is still v28 — with memory_v1 alone, or with an earlier the old body never had', async (t) => {
  for (const body of [{ ...ASK }, { ...ASK, caps: [HOLT_MEMORY_CAPS] }, { ...ASK, earlier: 'The athlete trains Mondays only.' }]) {
    const { log } = await call(t, body, [answerRound('Fine.')]);
    const sent = log.requests[0];
    assert.deepEqual(sent.tools, V28_TOOLS);
    assert.equal(createHash('sha256').update(`const SYSTEM = \`${sent.system[0].text}`).digest('hex'), V28_SYSTEM_SHA);
    assert.ok(!JSON.stringify(sent.messages).includes('Earlier in this conversation'), `${JSON.stringify(body.caps)}: the recap reached a request without memory_v1 + a reason to read it`);
  }
});

test('§1.1 earlier without memory_v1 (a 4a body) is ignored: the request is the one it always was', async (t) => {
  const a = await call(t, { ...ASK, caps: CAPS_4A }, [answerRound('Fine.')]);
  const b = await call(t, { ...ASK, caps: CAPS_4A, earlier: 'The athlete trains Mondays only.' }, [answerRound('Fine.')]);
  assert.deepEqual(b.log.requests[0], a.log.requests[0]);
});

// ─────────────────────────────────────────────────────────────────────────────
// §1.2 — earlier, guarded again; the recap mode
// ─────────────────────────────────────────────────────────────────────────────

test('⛔ §1.2 earlier is guarded again on the server: a medical sentence never reaches the model; the rest does; ≤ 800 chars', async (t) => {
  const earlier = 'The athlete wants a 225 bench by March. My knee has been aching after squats for weeks. Holt offered a 4-day upper/lower block.';
  const { log } = await call(t, { question: 'what did we decide?', history: [{ role: 'athlete', text: 'hi' }, { role: 'holt', text: 'Hey.' }], caps: CAPS_4B, earlier }, [answerRound('A 225 bench by March.')]);
  const first = log.requests[0].messages[0].content;
  assert.match(first, /225 bench by March/);
  assert.match(first, /4-day upper\/lower/);
  assert.ok(!/knee|aching/i.test(JSON.stringify(log.requests[0].messages)), 'the stopped sentence rode along');
  // History led by the athlete: the block leads their first line.
  assert.match(first, /\]\n\nhi$/);
  const long = await call(t, { question: 'ok', history: [], caps: CAPS_4B, earlier: 'The athlete trains every morning at six. '.repeat(60) }, [answerRound('Ok.')]);
  const block = long.log.requests[0].messages[0].content.split('\n\n')[0];
  assert.ok(block.length <= RECAP_WIRE_CHARS + 140, `block ${block.length}`);
});

test('⛔ §1.2 the memory filter too: a body sentence the guard lets through ("mentioned their knee", "takes creatine") never rides in earlier or a recap', async (t) => {
  const earlier = 'The athlete wants a 225 bench by March. The athlete mentioned their knee. The athlete takes creatine.';
  const ask = await call(t, { question: 'what did we decide?', history: [], caps: CAPS_4B, earlier }, [answerRound('A 225 bench.')]);
  const sent = JSON.stringify(ask.log.requests[0].messages);
  assert.match(sent, /225 bench by March/);
  assert.ok(!/knee|creatine/i.test(sent), sent);
  const rc = await call(t, { mode: 'recap', caps: CAPS_4B, history: HISTORY }, [jsonReply('The athlete asked about squat warm-ups. The athlete mentioned their knee.')]);
  assert.equal(rc.json.recap, 'The athlete asked about squat warm-ups.');
});

test('§1.2 mode recap WITHOUT memory_v1 is an ordinary ask with no question — a 400, no credit, no model', async (t) => {
  for (const caps of [undefined, CAPS_4A, 'memory_v1']) {
    const { status, json, log } = await call(t, { mode: 'recap', caps, history: HISTORY, earlier: '' });
    assert.equal(status, 400);
    assert.deepEqual(json, { route: 'error', reason: 'bad_request' });
    assert.equal(reserves(log).length, 0);
    assert.equal(log.requests.length, 0);
  }
});

test('§1.2 mode recap: Haiku, RECAP_SYSTEM, metered as summary — stopped turns never sent, medical sentences dropped both ways', async (t) => {
  const history = [
    { role: 'athlete', text: 'I can train Monday Wednesday Friday, 45 minutes' },
    { role: 'holt', text: 'Three 45-minute sessions it is.' },
    { role: 'athlete', text: "I'm 20 weeks pregnant, is squatting safe?" },
    { role: 'holt', text: 'That one is for your doctor.' },
    { role: 'athlete', text: 'ok, I want a 225 bench by March' },
    { role: 'holt', text: 'Doable.' },
  ];
  const earlier = 'The athlete hates burpees. The athlete said their shoulder hurts when pressing.';
  const reply = 'The athlete trains Monday, Wednesday and Friday for 45 minutes. They want a 225 bench by March. Their lower back pain flares on deadlifts.';
  const { json, log } = await call(t, { mode: 'recap', caps: CAPS_4B, history, earlier }, [jsonReply(reply)]);
  assert.deepEqual(reserves(log), [{ p_action: 'summary', p_fn: 'coach-ask' }]);
  const sent = log.requests[0];
  assert.equal(sent.model, 'claude-haiku-5-5');
  assert.equal(sent.system[0].text, RECAP_SYSTEM);
  assert.deepEqual(sent.system[0].cache_control, { type: 'ephemeral' });
  assert.deepEqual(sent.thinking, { type: 'disabled' });
  assert.ok(!sent.tools, 'a recap has no tools');
  const user = sent.messages[0].content;
  assert.match(user, /hates burpees/);
  assert.ok(!/pregnan|shoulder|hurts/i.test(user), `a stopped line or sentence was sent: ${user}`);
  assert.match(user, /Monday Wednesday Friday/);
  assert.equal(json.ok, true);
  assert.match(json.recap, /Monday, Wednesday and Friday/);
  assert.match(json.recap, /225 bench by March/);
  assert.ok(!/back pain|flares/i.test(json.recap));
  assert.ok(json.recap.length <= 600);
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['ok', false]]);
  // Nothing is written anywhere: the recap goes back to the device only.
  assert.equal(log.inserts.length, 0);
});

test('§1.2 recap: no Premium AI → nothing called; a failure is our reason; memory off does NOT stop it (it is this chat)', async (t) => {
  const refused = await call(t, { mode: 'recap', caps: CAPS_4B, history: HISTORY }, [], { reserve: { allowed: false, reason: 'not_entitled', reservation_id: null } });
  assert.deepEqual(refused.json, { ok: true, recap: null, reason: 'not_allowed' });
  assert.equal(refused.log.requests.length, 0);
  const failed = await call(t, { mode: 'recap', caps: CAPS_4B, history: HISTORY }, [new Response(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'SECRET' } }), { status: 500 })]);
  assert.deepEqual(failed.json, { ok: true, recap: null, reason: 'upstream_error', refunded: true });
  assert.ok(!failed.raw.includes('SECRET'));
  const off = await call(t, { mode: 'recap', caps: CAPS_4B, history: HISTORY }, [jsonReply('The athlete asked how to warm up for squats. Holt said two light sets, then build up.')], {
    tables: { holt_memory_prefs: [{ remembers: false }] },
  });
  assert.match(off.json.recap, /warm up for squats/);
});

// ─────────────────────────────────────────────────────────────────────────────
// §1.3 — summarize: old phones unchanged, memory_v1 keeps facts
// ─────────────────────────────────────────────────────────────────────────────

const CHAT = [
  { role: 'athlete', text: 'Please never give me burpees again' },
  { role: 'holt', text: 'Noted, no burpees.' },
  { role: 'athlete', text: 'I train Monday Wednesday Friday mornings. Also my knee is bad so nothing jumpy' },
  { role: 'holt', text: 'Got it.' },
];

test('§1.3 old phones: summarize is 4a’s call and 4a’s reply shape — SUMMARY_SYSTEM, plain text, no facts kept', async (t) => {
  const { json, log } = await call(t, { mode: 'summarize', question: '', history: CHAT }, [jsonReply('You asked for no burpees and train Monday, Wednesday and Friday mornings.')]);
  assert.deepEqual(json, { ok: true, saved: true });
  const sent = log.requests[0];
  assert.equal(sent.system[0].text, SUMMARY_SYSTEM);
  assert.equal(sent.max_tokens, 200);
  assert.ok(!sent.output_config?.format, 'no schema for an old phone');
  assert.deepEqual(inserted(log, 'holt_chat_summaries'), [{ summary: 'You asked for no burpees and train Monday, Wednesday and Friday mornings.' }]);
  assert.deepEqual(inserted(log, 'holt_notes'), []);
});

test('§1.3 memory_v1: one Haiku call returns {summary, facts}; the server keeps the clean facts as the athlete, source chat, with their kind', async (t) => {
  const model = JSON.stringify({
    summary: 'You asked for no burpees and said you train Monday, Wednesday and Friday mornings.',
    facts: [
      { kind: 'dislike', text: 'Hates burpees' },
      { kind: 'schedule', text: 'Trains Mon, Wed, Fri mornings' },
      { kind: 'avoid', text: 'Avoid jumping' },
      { kind: 'other', text: 'Bad knee' },
      { kind: 'avoid', text: 'Avoid jumping because of the knee' },
      { kind: 'goal', text: 'Wants to lose 20 lbs' },
      { kind: 'like', text: 'hates burpees' },
      { kind: 'bogus', text: 'Left-handed' },
    ],
  });
  const { json, log } = await call(t, { mode: 'summarize', question: '', history: CHAT, caps: CAPS_4B }, [jsonReply(model)], {
    tables: { holt_notes: [{ text: 'Trains Mon, Wed, Fri mornings' }] },
  });
  const sent = log.requests[0];
  assert.equal(sent.system[0].text, SUMMARY_SYSTEM_V1);
  assert.deepEqual(sent.output_config, { effort: 'low', format: { type: 'json_schema', schema: MEMORY_SUMMARY_SCHEMA } });
  assert.match(sent.messages[0].content, /^Already kept about this athlete:\n- Trains Mon, Wed, Fri mornings\n\nThe chat:\nAthlete: Please never give me burpees again/);
  assert.deepEqual(reserves(log), [{ p_action: 'summary', p_fn: 'coach-ask' }]);
  assert.deepEqual(inserted(log, 'holt_notes'), [
    { text: 'Hates burpees', source: 'chat', kind: 'dislike' },
    { text: 'Avoid jumping', source: 'chat', kind: 'avoid' },
    { text: 'Left-handed', source: 'chat', kind: 'other' },
  ]);
  assert.deepEqual(json, { ok: true, saved: true, summary: 'You asked for no burpees and said you train Monday, Wednesday and Friday mornings.', kept: 3 });
});

test('§1.3 the cap: 19 kept → one more; 20 → none (the summary still saves); a trigger refusal stops the rest', async (t) => {
  const model = JSON.stringify({ summary: 'You asked for no burpees.', facts: [{ kind: 'dislike', text: 'Hates burpees' }, { kind: 'like', text: 'Likes rowing' }] });
  const nineteen = Array.from({ length: 19 }, (_, i) => ({ text: `Note ${i}` }));
  const a = await call(t, { mode: 'summarize', question: '', history: CHAT, caps: CAPS_4B }, [jsonReply(model)], { tables: { holt_notes: nineteen } });
  assert.equal(inserted(a.log, 'holt_notes').length, 1);
  assert.equal(a.json.kept, 1);
  const b = await call(t, { mode: 'summarize', question: '', history: CHAT, caps: CAPS_4B }, [jsonReply(model)], { tables: { holt_notes: [...nineteen, { text: 'Note 19' }] } });
  assert.equal(inserted(b.log, 'holt_notes').length, 0);
  assert.deepEqual(b.json, { ok: true, saved: true, summary: 'You asked for no burpees.', kept: 0 });
  const c = await call(t, { mode: 'summarize', question: '', history: CHAT, caps: CAPS_4B }, [jsonReply(model)], {
    insertErrors: { holt_notes: [{ code: 'P0001', message: 'holt_notes_cap: an athlete keeps at most 20 notes' }] },
  });
  assert.equal(inserted(c.log, 'holt_notes').length, 1, 'stopped after the refusal');
  assert.equal(c.json.kept, 0);
});

test('§1.3 before 0278: no kind column → the fact is kept without it; an unreadable note list keeps no facts', async (t) => {
  const model = JSON.stringify({ summary: 'You asked for no burpees.', facts: [{ kind: 'dislike', text: 'Hates burpees' }] });
  const a = await call(t, { mode: 'summarize', question: '', history: CHAT, caps: CAPS_4B }, [jsonReply(model)], {
    insertErrors: { holt_notes: [{ code: 'PGRST204', message: "Could not find the 'kind' column" }] },
  });
  assert.deepEqual(inserted(a.log, 'holt_notes'), [
    { text: 'Hates burpees', source: 'chat', kind: 'dislike' },
    { text: 'Hates burpees', source: 'chat' },
  ]);
  assert.equal(a.json.kept, 1);
  const b = await call(t, { mode: 'summarize', question: '', history: CHAT, caps: CAPS_4B }, [jsonReply(model)], { tableErrors: { holt_notes: { code: '500', message: 'down' } } });
  assert.equal(inserted(b.log, 'holt_notes').length, 0);
  assert.deepEqual(b.json, { ok: true, saved: true, summary: 'You asked for no burpees.', kept: 0 });
});

test('⛔ §1.3 a medical summary sentence is dropped from the summary too; JSON that is not the shape keeps nothing', async (t) => {
  const model = JSON.stringify({ summary: 'You asked for no burpees. Your knee has been aching after squats.', facts: [] });
  const a = await call(t, { mode: 'summarize', question: '', history: CHAT, caps: CAPS_4B }, [jsonReply(model)]);
  assert.deepEqual(inserted(a.log, 'holt_chat_summaries'), [{ summary: 'You asked for no burpees.' }]);
  const b = await call(t, { mode: 'summarize', question: '', history: CHAT, caps: CAPS_4B }, [jsonReply('Sure! Here is the summary.')]);
  assert.deepEqual(b.json, { ok: true, saved: false, reason: 'nothing_to_keep', summary: null, kept: 0 });
  assert.equal(b.log.inserts.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// §1.4 — the off switch, for every app version
// ─────────────────────────────────────────────────────────────────────────────

test('⛔ §1.4 memory off: summarize keeps nothing for ANY app — no reserve, no model, no row; reason memory_off', async (t) => {
  for (const caps of [undefined, CAPS_4A, CAPS_4B]) {
    const { json, log } = await call(t, { mode: 'summarize', question: '', history: CHAT, caps }, [], { tables: { holt_memory_prefs: [{ remembers: false }] } });
    assert.equal(json.saved, false);
    assert.equal(json.reason, 'memory_off');
    assert.equal(reserves(log).length, 0);
    assert.equal(log.requests.length, 0);
    assert.equal(log.inserts.length, 0);
    if (caps !== CAPS_4B) assert.deepEqual(Object.keys(json).sort(), ['ok', 'reason', 'saved'], 'old phones: the old reply shape');
  }
});

test('§1.4 the switch read: no row or no table yet = on; any other failure = unknown = nothing kept', async (t) => {
  const reply = () => jsonReply('You asked for no burpees.');
  const none = await call(t, { mode: 'summarize', question: '', history: CHAT }, [reply]);
  assert.deepEqual(none.json, { ok: true, saved: true });
  const missing = await call(t, { mode: 'summarize', question: '', history: CHAT }, [reply], { tableErrors: { holt_memory_prefs: { code: 'PGRST205', message: 'no table' } } });
  assert.deepEqual(missing.json, { ok: true, saved: true });
  const broken = await call(t, { mode: 'summarize', question: '', history: CHAT }, [reply], { tableErrors: { holt_memory_prefs: { code: '57014', message: 'timeout' } } });
  assert.deepEqual(broken.json, { ok: true, saved: false, reason: 'memory_unknown' });
  assert.equal(broken.log.requests.length, 0);
  const on = await call(t, { mode: 'summarize', question: '', history: CHAT }, [reply], { tables: { holt_memory_prefs: [{ remembers: true }] } });
  assert.deepEqual(on.json, { ok: true, saved: true });
});

test('⛔ §1.4 memory off: get_past_chats says so and reads no summary — on every app', async (t) => {
  for (const caps of [undefined, CAPS_4B]) {
    const { log } = await call(t, { question: 'what did we talk about last time?', caps }, [toolRound('get_past_chats', '{}'), answerRound('Memory is off.')], {
      tables: { holt_memory_prefs: [{ remembers: false }], holt_chat_summaries: [{ summary: 'You asked about squats.', created_at: '2026-11-01T10:00:00Z' }] },
    });
    const result = log.requests[1].messages.at(-1).content[0];
    assert.equal(result.content, PAST_CHATS_MEMORY_OFF);
    assert.ok(!log.reads.some((q) => q.table === 'holt_chat_summaries'), 'a summary was read with memory off');
  }
  // On: the summaries come back as before.
  const { log } = await call(t, { question: 'what did we talk about last time?' }, [toolRound('get_past_chats', '{}'), answerRound('Squats.')], {
    tables: { holt_chat_summaries: [{ summary: 'You asked about squats.', created_at: '2026-11-01T10:00:00Z' }] },
  });
  assert.match(log.requests[1].messages.at(-1).content[0].content, /You asked about squats\./);
});
