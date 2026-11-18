/**
 * coach-ask-caps.test.mjs — AI Road to 10 Sprint 4a "Holt can do things", lane A (CH-3). The REAL paste bundle, offline
 * (coach-ask-harness.mjs): nothing leaves the machine.
 *
 *   §1.1  THE CAPS FLAG — an app that sends no `caps` (every phone shipped before 4a) gets v28 to the byte: the same tool
 *         list (frozen from e1abd8ef in fixtures/v28-ask-tool-list.json), the same SYSTEM (its pinned sha256), the same
 *         events. Only `caps: ['actions_v1']` gets the action tools, the food lookup, the one-brain prompt and `detail`.
 *   §1.3  An action's own words go through the guard + the scan BEFORE it is forwarded; a hit is never forwarded and the
 *         turn is taken back. A food action that names no food get_foods returned goes back to the model as an error.
 *   §1.4  A kept turn that forwarded a build marks its reservation (service role, `coach_ai_mark_build`, 0276) after the
 *         settle and before the `done` line — and only then.
 *   §1.5  `{status, detail}` on a caps stream; the phones already out there read it as the plain status (and ignore it).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { answerRound, fakeSupabase, loadFunction, newLog, request, RESERVATION, sse, toolRound, dataEvents } from './coach-ask-harness.mjs';
import { readAskStream as readAskStream3b, settleAskRead as settleAskRead3b } from './fixtures/ota3b-ask-stream.ts';
import { readAskStream as readAskStream25, settleAskRead as settleAskRead25 } from './fixtures/ota25-ask-stream.ts';
import { readAskStream as readAskStreamNow } from '../ask-stream.ts';
import { ASK_ACTIONS, ASK_ACTIONS_V1, ASK_TOOLS } from '../ask-tools.ts';
import { HOLT_ACTION_CAPS, LEGACY_ACTIONS, NEW_ACTIONS } from '../holt-actions.ts';

const V28_TOOLS = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'v28-ask-tool-list.json'), 'utf8'));
const V28_SYSTEM_SHA = 'b3cb1ee88eea110ef7769bf461e7d6ec9db670dc301ec756f5dc01c735c41dab';
const SRC = fs.readFileSync(path.join(process.cwd(), 'supabase/functions/coach-ask/index.ts'), 'utf8').replace(/\r\n/g, '\n');
const constantBody = (name) => {
  const start = SRC.indexOf(`const ${name} = \``);
  return SRC.slice(start, SRC.indexOf('`;', start));
};
const CAPS = [HOLT_ACTION_CAPS];

/**
 * A fetch for one test: Anthropic answers `reply(body, n)`; the service-role RPCs (the model config read, the 0276 build
 * mark) answer like PostgREST. Everything is recorded on `log`; anything else throws.
 */
function fakeNet(t, log, reply, { markOk = true } = {}) {
  const real = globalThis.fetch;
  let n = 0;
  log.marks = [];
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u === 'https://api.anthropic.com/v1/messages') {
      const body = JSON.parse(init.body);
      log.requests.push(body);
      log.timeline.push(['model', Date.now()]);
      n += 1;
      return reply(body, n);
    }
    if (u.endsWith('/rest/v1/rpc/coach_ai_model_pick')) return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    if (u.endsWith('/rest/v1/rpc/coach_ai_mark_build')) {
      log.marks.push({ body: JSON.parse(init.body), auth: init.headers.Authorization });
      log.timeline.push(['mark', Date.now()]);
      return new Response(markOk ? 'true' : '{"message":"nope"}', { status: markOk ? 200 : 404 });
    }
    throw new Error(`unexpected network call: ${u}`);
  };
  t.after(() => (globalThis.fetch = real));
}

const actionRound = (name, input, id = 'tu_a') =>
  sse([
    { type: 'message_start', message: { model: 'claude-sonnet-5-5', usage: { input_tokens: 900, output_tokens: 1 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id, name, input: {} } },
    { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: JSON.stringify(input) } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 30 } },
    { type: 'message_stop' },
  ]);

async function run(t, replies, body, { env = {}, meter = {}, markOk = true } = {}) {
  const log = newLog(meter);
  const queue = [...replies];
  fakeNet(t, log, () => queue.shift() ?? answerRound('Done talking.'), { markOk });
  const handler = await loadFunction(log, {}, env);
  const res = await handler(request(body));
  const raw = await res.text();
  return { log, raw, events: dataEvents(raw) };
}

const settlesOf = (log) => log.rpcs.filter(([n]) => n === 'coach_ai_settle').map(([, a]) => a);

// ─────────────────────────────────────────────────────────────────────────────
// §1.1 — an old phone gets v28, byte for byte
// ─────────────────────────────────────────────────────────────────────────────

test('§1.1 no caps → v28: the exact tool list (frozen from e1abd8ef), the pinned SYSTEM, no action tool of 4a', async (t) => {
  for (const body of [{ question: "what's my bench progress" }, { question: "what's my bench progress", caps: [] }, { question: 'hi', caps: ['something_else'] }, { question: 'hi', caps: 'actions_v1' }]) {
    const { log } = await run(t, [answerRound('Bench is moving.')], body);
    const sent = log.requests[0];
    assert.deepEqual(sent.tools, V28_TOOLS, `tools changed for ${JSON.stringify(body.caps)}`);
    assert.equal(createHash('sha256').update(`const SYSTEM = \`${sent.system[0].text}`).digest('hex'), V28_SYSTEM_SHA);
    assert.deepEqual(sent.system[0].cache_control, { type: 'ephemeral' });
    for (const n of NEW_ACTIONS) assert.ok(!JSON.stringify(sent).includes(`"${n}"`), `${n} reached an old phone's request`);
  }
});

test('§1.1 no caps → the same events as v28 for a lookup: status with no detail, words, done', async (t) => {
  const { events } = await run(t, [toolRound('get_lift_history', '{"exercise":"bench","weeks":8}'), answerRound('Your bench went from 205 to 225.')], {
    question: "what's my bench progress",
  });
  assert.deepEqual(
    events.map((e) => Object.keys(e).sort().join(',')),
    ['status', 't', 't', 'done,remaining,stop,usage'],
  );
  assert.ok(!events.some((e) => 'detail' in e));
});

test('§1.1 caps → the 4a prefix: reads, food reads, actions, the v1 actions, food actions — and SYSTEM_V1', async (t) => {
  const { log } = await run(t, [answerRound('Bench is moving.')], { question: 'hi', caps: CAPS });
  const sent = log.requests[0];
  const names = sent.tools.map((x) => x.name);
  assert.deepEqual(names, [...ASK_TOOLS, ...ASK_ACTIONS, ...ASK_ACTIONS_V1].map((x) => x.name), 'lane B’s FOOD_* are still the empty stub here');
  assert.equal(sent.system[0].text, constantBody('SYSTEM_V1').slice('const SYSTEM_V1 = `'.length));
  assert.notEqual(sent.system[0].text, constantBody('SYSTEM').slice('const SYSTEM = `'.length));
  // Two prefixes, each stable: the same caps body twice sends the same bytes before the messages.
  const again = await run(t, [answerRound('Again.')], { question: 'something else', caps: CAPS });
  assert.equal(JSON.stringify(again.log.requests[0].tools), JSON.stringify(sent.tools));
  assert.equal(again.log.requests[0].system[0].text, sent.system[0].text);
});

test('the one-brain prompt: cached, nothing interpolated, says "confirm" and never "done", carries the build fields and the stop', () => {
  const v1 = constantBody('SYSTEM_V1');
  assert.ok(!v1.slice(5).includes('${'), 'SYSTEM_V1 is a cache key — nothing interpolated');
  assert.ok(v1.length > 12000);
  for (const rule of [
    'Never say it is done, saved, logged, booked, built or changed.',
    'nothing changes until the athlete taps Confirm',
    'propose_program —',
    'propose_day —',
    'swap_exercise_today —',
    'start_workout —',
    'schedule_session —',
    'set_targets —',
    'remember_note —',
    'open_door —',
    'log_food —',
    'never a number',
    'Never for an athlete under 18',
    '# Soreness is not an injury',
    'and you call no action at all',
    'Nothing about pain, injury, symptoms, medication, a medical condition, their weight or their body ever goes into an action.',
    '# Three lines he does not cross',
    "- Answer only the athlete's newest message.",
    'Plain text only',
  ]) assert.ok(v1.includes(rule), `missing: ${rule}`);
  // Every action the prompt names is offered, and every v1 action is named.
  for (const a of ASK_ACTIONS_V1) assert.ok(v1.includes(`${a.name} —`), `${a.name} is not explained`);
  for (const n of [...LEGACY_ACTIONS, ...NEW_ACTIONS]) assert.ok(v1.includes(n), `${n} missing from the prompt`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Forwarding, with caps
// ─────────────────────────────────────────────────────────────────────────────

test('caps: a clean action is forwarded as {action:{name,input}}, acknowledged with its v1 line, and the turn ends end_turn', async (t) => {
  const { events, log } = await run(t, [actionRound('swap_exercise_today', { exercise: 'squats', to: 'leg press' }), answerRound('Swap is on the card — check it and confirm.')], {
    question: 'squat rack is taken, swap squats for leg press today',
    caps: CAPS,
  });
  const acts = events.filter((e) => e.action);
  assert.deepEqual(acts, [{ action: { name: 'swap_exercise_today', input: { exercise: 'squats', to: 'leg press' } } }]);
  const result = log.requests[1].messages.at(-1).content[0];
  assert.equal(result.type, 'tool_result');
  assert.match(result.content, /nothing changes until they tap Confirm/);
  assert.match(result.content, /Do not say it is done/);
  assert.equal(events.at(-1).stop, 'end_turn');
  assert.deepEqual(settlesOf(log).map((s) => [s.p_outcome, s.p_refund]), [['ok', false]]);
});

test('without caps a 4a action name is NOT forwarded (an old phone has no card for it) — it is not even offered', async (t) => {
  const { events } = await run(t, [actionRound('start_workout', {}), answerRound('Go train.')], { question: "let's go" });
  assert.ok(!events.some((e) => e.action));
});

// ─────────────────────────────────────────────────────────────────────────────
// §1.3 — the action's own words, checked before anything leaves
// ─────────────────────────────────────────────────────────────────────────────

for (const [label, name, input] of [
  ['a note with a dose', 'remember_note', { note: 'Takes 2 advil before long runs' }],
  ['a note the guard stops', 'remember_note', { note: 'doing physio exercises for my knee' }],
  ['exercise words the guard stops', 'swap_exercise_today', { exercise: 'squats', to: 'physio exercises' }],
  ['a build whose focus the guard stops', 'propose_day', { dayFocus: 'ibuprofen before runs' }],
  ['a legacy edit (old phones too)', 'propose_program_edit', { op: 'swap', exercise: 'bench', to: 'physio exercises' }],
]) {
  test(`⛔ §1.3 ${label}: never forwarded, the turn is retracted, refunded, and no further round runs`, async (t) => {
    for (const caps of name === 'propose_program_edit' ? [undefined, CAPS] : [CAPS]) {
      const { events, log } = await run(t, [actionRound(name, input), answerRound('Noted.')], { question: 'remember this for me', ...(caps ? { caps } : {}) });
      assert.ok(!events.some((e) => e.action), 'nothing forwarded');
      assert.ok(events.some((e) => e.retract), 'taken back');
      assert.equal(events.at(-1).stop, 'refusal');
      assert.equal(log.requests.length, 1, 'no second model round');
      assert.deepEqual(settlesOf(log).map((s) => [s.p_outcome, s.p_refund]), [['guarded', true]]);
    }
  });
}

test('§1.3 a food action that names no food get_foods returned goes back to the model as an error — nothing forwarded', async (t) => {
  const { events, log } = await run(t, [actionRound('log_food', { meal: 'breakfast', items: [{ key: 'made-up', grams: 100 }] }), answerRound('Let me look those up first.')], {
    question: 'log 2 eggs for breakfast',
    caps: CAPS,
  });
  assert.ok(!events.some((e) => e.action));
  const result = log.requests[1].messages.at(-1).content[0];
  assert.equal(result.is_error, true);
  assert.match(result.content, /get_foods/);
  assert.ok(!events.some((e) => e.retract), 'an unchecked food is a retry, not a stop');
});

// ─────────────────────────────────────────────────────────────────────────────
// §1.4 — the build mark (0276)
// ─────────────────────────────────────────────────────────────────────────────

const SERVICE = { SUPABASE_SERVICE_ROLE_KEY: 'service-key' };

test('§1.4 a kept caps turn that forwarded propose_program marks its reservation — service role, after the settle, before done', async (t) => {
  const { events, log, raw } = await run(t, [actionRound('propose_program', { daysPerWeek: 4, goal: 'strength' }), answerRound('Four days for strength — building it now.')], {
    question: '4 days a week, I want to get stronger',
    caps: CAPS,
  }, { env: SERVICE });
  assert.deepEqual(log.marks, [{ body: { p_reservation: RESERVATION }, auth: 'Bearer service-key' }]);
  const settledAt = log.timeline.findIndex((x) => x[0] === 'settled');
  const markedAt = log.timeline.findIndex((x) => x[0] === 'mark');
  assert.ok(settledAt >= 0 && markedAt > settledAt, 'marked after the settle');
  assert.ok(events.at(-1).done);
  assert.ok(!raw.includes(RESERVATION), 'the reservation id never reaches the app');
  assert.ok(!raw.includes('service-key'));
});

test('§1.4 no mark: a chat that opened nothing, no caps, a refunded turn, a retracted one, or no service key', async (t) => {
  const plain = await run(t, [answerRound('RPE is effort out of ten.')], { question: "what's RPE", caps: CAPS }, { env: SERVICE });
  assert.deepEqual(plain.log.marks, []);
  const edit = await run(t, [actionRound('propose_program_edit', { op: 'skip', day: 'Friday' }), answerRound('Check the card.')], { question: 'skip Friday', caps: CAPS }, { env: SERVICE });
  assert.deepEqual(edit.log.marks, [], 'an edit is not a build');
  const refunded = await run(t, [actionRound('propose_day', { dayFocus: 'legs' }), answerRound('', 'refusal')], { question: 'give me a leg day', caps: CAPS }, { env: SERVICE });
  assert.deepEqual(refunded.log.marks, []);
  const stopped = await run(t, [actionRound('propose_day', { dayFocus: 'ibuprofen before runs' })], { question: 'give me a leg day', caps: CAPS }, { env: SERVICE });
  assert.deepEqual(stopped.log.marks, []);
  const keyless = await run(t, [actionRound('propose_day', { dayFocus: 'legs' }), answerRound('Leg day coming up.')], { question: 'give me a leg day', caps: CAPS });
  assert.equal(keyless.log.marks.length, 0);
  assert.ok(keyless.events.at(-1).done, 'and the turn still ends cleanly');
});

test('§1.4 a mark that fails (0276 not pasted yet) changes nothing the athlete sees', async (t) => {
  const { events } = await run(t, [actionRound('propose_day', { dayFocus: 'legs' }), answerRound('Leg day coming up.')], { question: 'give me a leg day', caps: CAPS }, { env: SERVICE, markOk: false });
  assert.ok(events.some((e) => e.action));
  assert.equal(events.at(-1).stop, 'end_turn');
});

// ─────────────────────────────────────────────────────────────────────────────
// §1.5 — status detail
// ─────────────────────────────────────────────────────────────────────────────

test('§1.5 caps: a lookup adds {status, detail} once its input is complete — numbers, and the lift only in the athlete’s words', async (t) => {
  const { events } = await run(t, [toolRound('get_lift_history', '{"exercise":"bench","weeks":8}'), answerRound('Your bench went from 205 to 225.')], {
    question: "what's my bench progress",
    caps: CAPS,
  });
  const st = events.filter((e) => 'status' in e);
  assert.deepEqual(st, [{ status: 'Checking your lift log…' }, { status: 'Checking your lift log…', detail: { tool: 'get_lift_history', days: 56, lift: 'bench' } }]);
  // A name the model wrote that the athlete never typed stays off the wire.
  const made = await run(t, [toolRound('get_lift_history', '{"exercise":"barbell bench press"}'), answerRound('Up 20.')], { question: 'how is my pressing going', caps: CAPS });
  assert.ok(!made.events.some((e) => e.detail?.lift), 'never the model’s words');
});

/** A reader over `raw`, `size` bytes at a time. */
const chunked = (raw, size) => {
  const bytes = new TextEncoder().encode(raw);
  let i = 0;
  return { read: async () => (i >= bytes.length ? { done: true, value: undefined } : { done: false, value: bytes.slice(i, (i += size)) }), cancel: async () => undefined };
};
const withoutDetail = (raw) => raw.split('\n\n').filter((b) => !(b.startsWith('data: {"status":') && b.includes('"detail"'))).join('\n\n');

test('§1.5 old phones: a stream with `detail` reads exactly as the same stream without it (OTA #25 and the 3b build on phones)', async (t) => {
  const { raw } = await run(t, [toolRound('get_lift_history', '{"exercise":"bench","weeks":8}'), answerRound('Your bench went from 205 to 225.')], {
    question: "what's my bench progress",
    caps: CAPS,
  });
  assert.ok(raw.includes('"detail"'));
  for (const size of [1, 5, 64, 1 << 16]) {
    const statuses3b = [];
    const now3b = settleAskRead3b(await readAskStream3b(chunked(raw, size), () => {}, undefined, (s) => statuses3b.push(s)));
    const plain3b = settleAskRead3b(await readAskStream3b(chunked(withoutDetail(raw), size), () => {}));
    assert.deepEqual(now3b, plain3b, `the 3b build read detail as something (chunk ${size})`);
    assert.ok(statuses3b.every((s) => s === 'Checking your lift log…'), 'it sees only the table line');
    assert.deepEqual(settleAskRead25(await readAskStream25(chunked(raw, size), () => {})), settleAskRead25(await readAskStream25(chunked(withoutDetail(raw), size), () => {})));
  }
  // …and this build reads the detail, narrowed.
  const details = [];
  await readAskStreamNow(chunked(raw, 7), () => {}, undefined, (s, d) => details.push([s, d ?? null]));
  assert.deepEqual(details.at(-1), ['Checking your lift log…', { tool: 'get_lift_history', days: 56, lift: 'bench' }]);
});

test('the harness fake supabase is the one in use (sanity)', () => {
  assert.equal(typeof fakeSupabase, 'function');
});
