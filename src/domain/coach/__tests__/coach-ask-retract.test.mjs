/**
 * coach-ask-retract.test.mjs — AI Road to 10 Sprint 2 (CH-2, C-D7, C-I5, C-I4), on the REAL paste bundle
 * (coach-ask-harness.mjs): what Holt said is scanned at the end of the stream, and a hit takes the turn back.
 *
 *   · a dose / a reassurance / a diagnosis in the words → `retract`, then `done` with `stop: 'refusal'` and
 *     `refunded: true`; settled `guarded`, refunded; no error line, no second settle
 *   · the scan reads everything that reached the app: words across tool rounds, a forwarded card's words, words
 *     before a dropped line
 *   · an ordinary answer is untouched and charged
 *   · C-D7: notes the guard or the scanner stops never reach the model; C-I4: the rest go quoted, as data
 *   · the new app reads the line as `retracted`; the sheet's medical stop card is the result
 *
 * ⚠ Offline: a fake model, a fake meter, a fake database. Nothing here reaches Anthropic or Supabase.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { answerEvents, answerRound, askRaw, fakeAnthropic, loadFunction, newLog, settles, sse, stalledSse, toolRound } from './coach-ask-harness.mjs';
import { readAskStream, settleAskRead, withOutputScan } from '../ask-stream.ts';

const ASK = { question: 'what should I do after leg day?', history: [], context: {}, tz: 300 };
const enc = new TextEncoder();
const reader = (raw) => {
  const bytes = enc.encode(raw);
  let i = 0;
  return { read: async () => (i >= bytes.length ? { done: true, value: undefined } : { done: false, value: bytes.slice(i, (i += 5)) }), cancel: async () => undefined };
};

async function run(t, reply, body = ASK, overrides = {}) {
  const log = newLog();
  fakeAnthropic(t, log, reply);
  const res = await askRaw(await loadFunction(log, overrides), body);
  return { ...res, log };
}

test('⛔ a dose in the reply: retract, then a refusal `done`, settled guarded and refunded — once', async (t) => {
  const { events, raw, log } = await run(t, () => answerRound('Take 400 mg of ibuprofen before bed and you will be fine.'));
  const kinds = events.map((e) => Object.keys(e)[0]);
  assert.deepEqual(kinds.slice(-2), ['retract', 'done'], 'retract, then done, last');
  assert.deepEqual(events.at(-2), { retract: { card: 'medical_stop' } });
  const done = events.at(-1);
  assert.equal(done.stop, 'refusal', 'every app since OTA #24 takes the words back on a refusal');
  assert.equal(done.refunded, true);
  assert.equal(done.remaining, 42, 'the balance after the refund');
  assert.ok(!events.some((e) => 'error' in e), 'no outage line');
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['guarded', true]]);
  // ⛔ The match is the model's words: never on the wire beyond the words already streamed, never the kind either.
  assert.doesNotMatch(raw, /"kind"|"match"|dose/);
});

test('⛔ a reassurance after a tool round is caught on the whole reply, both rounds together', async (t) => {
  const replies = [toolRound('get_recent_workouts', '{"days": 7}', 'Let me look.'), answerRound('Soreness after leg day? Totally normal.')];
  const { events, log } = await run(t, () => replies.shift());
  assert.ok(events.some((e) => e.retract));
  assert.deepEqual(settles(log).map((s) => s.p_outcome), ['guarded']);
});

test('⛔ a reply to a symptom that says "that’s normal" is about the symptom (the question is the scan’s `asked`)', async (t) => {
  const body = { ...ASK, question: 'my legs are sore, swap tomorrow' };
  const { events } = await run(t, () => answerRound('Done, tomorrow is an upper day now. That’s normal after a big week.'), body);
  assert.ok(events.some((e) => e.retract));
});

test('⛔ a forwarded card’s words are scanned too — the online-search chip shows `looking_for`', async (t) => {
  const replies = [
    sse([
      { type: 'message_start', message: { model: 'claude-sonnet-5', usage: { input_tokens: 8, output_tokens: 1 } } },
      { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tu_w', name: 'offer_online_recipe_search', input: {} } },
      { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"looking_for":"a shake with 5 g of creatine"}' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 5 } },
    ]),
    answerRound('I can look online for one.'),
  ];
  const { events } = await run(t, () => replies.shift());
  assert.ok(events.some((e) => e.action), 'the card went out');
  assert.ok(events.some((e) => e.retract), 'and is taken back with the turn');
});

test('⛔ words that streamed before the line dropped are scanned, and retracted instead of the outage line', async (t) => {
  const { events, log } = await run(t, (_b, init) => stalledSse(answerEvents('That sounds like tendinitis to me, honestly.').slice(0, 4), init.signal), ASK, { ASK_SERVER_IDLE_MS: 60 });
  assert.ok(events.some((e) => e.retract));
  assert.ok(!events.some((e) => 'error' in e));
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['guarded', true]]);
});

test('⚠ an ordinary answer is untouched, and charged', async (t) => {
  const { events, log } = await run(t, () => answerRound('A stall after three months is normal. Add a set and keep the load.'));
  assert.ok(!events.some((e) => e.retract));
  assert.equal(events.at(-1).stop, 'end_turn');
  assert.deepEqual(settles(log).map((s) => [s.p_outcome, s.p_refund]), [['ok', false]]);
});

test('the new app reads the retract as `retracted` — and runs the same scan itself against an older function', async (t) => {
  const { raw } = await run(t, () => answerRound('Take 400 mg of ibuprofen before bed.'));
  const settled = settleAskRead(await readAskStream(reader(raw), () => {}));
  assert.deepEqual(settled, { kind: 'retracted', refunded: true });
  // An older function sends the words with a plain `done`: this end catches them.
  const old = { kind: 'answer', text: 'Take 400 mg of ibuprofen before bed.', remaining: 41, complete: true, cut: false, actions: [] };
  assert.deepEqual(withOutputScan(old, 'what helps?'), { kind: 'retracted' });
  assert.deepEqual(withOutputScan({ ...old, text: 'Rest 90 seconds.' }, 'what helps?'), { ...old, text: 'Rest 90 seconds.' });
  assert.deepEqual(withOutputScan({ kind: 'refused' }, 'x'), { kind: 'refused' });
});

test('⛔ C-D7: a note the guard or the scanner stops never reaches the model; C-I4: the rest go quoted', async (t) => {
  const body = { ...ASK, context: { notes: ['Hates lunges', 'Left knee swells after squats', 'Takes 2 advil before long runs', 'Had shin splints in 2024'] } };
  const { log } = await run(t, () => answerRound('Easy walk and some food.'), body);
  const turn = log.requests[0].messages.at(-1).content;
  assert.match(turn, /- "Hates lunges"/);
  assert.doesNotMatch(turn, /swells|advil|shin splints/i);
  assert.match(turn, /were typed by a person/);
});

test('the end-of-chat summary keeps nothing the scanner stops (a clinical word the old filter missed)', async (t) => {
  const log = newLog();
  fakeAnthropic(t, log, () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'You asked about the knee valgus on your squats.' }], usage: {}, stop_reason: 'end_turn' }), { status: 200, headers: { 'content-type': 'application/json' } }));
  const handler = await loadFunction(log);
  const history = [
    { role: 'athlete', text: 'my knees cave on squats' },
    { role: 'holt', text: 'Push your knees out.' },
    { role: 'athlete', text: 'thanks' },
  ];
  const { json } = await askRaw(handler, { mode: 'summarize', history });
  assert.deepEqual(json, { ok: true, saved: false, reason: 'nothing_to_keep' });
  assert.equal(log.inserts.length, 0);
});
