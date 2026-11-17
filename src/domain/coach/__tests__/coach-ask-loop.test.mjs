import test from 'node:test';
import assert from 'node:assert/strict';

import {
  answerRound,
  ask,
  fakeAnthropic,
  loadFunction,
  newLog,
  RESERVATION,
  request,
  settles,
  sse,
  toolRound,
} from './coach-ask-harness.mjs';

/*
 * THE TOOL LOOP, RUN FOR REAL — offline, for free.
 *
 * `coach-ask` is a Deno function against a live model and a live database, so `coach-ask-source.test.mjs`
 * can only read its source. This runs the actual dashboard paste copy (the exact code that gets deployed)
 * in Node, with `Deno`, `createClient` and the Anthropic API replaced by fakes (`coach-ask-harness.mjs`). The
 * fake model does what the real one does on "what's my bench progress": asks for the bench history, then
 * answers from it.
 *
 * ⚠ No request leaves the machine. `fetch` is replaced for the whole test and throws on any URL that is
 * not the fake model. Sprint 1's meter, retry, clock and status lines are in coach-ask-turn.test.mjs.
 */

test("\"what's my bench progress\": Holt looks it up, and answers from the athlete's own log", async (t) => {
  const log = newLog();
  const replies = [toolRound(), answerRound('Your bench went from 205×5 in March to 225×5 on Monday.')];
  fakeAnthropic(t, log, () => {
    const r = replies.shift();
    assert.ok(r, 'the function called the model more times than the fake had replies');
    return r;
  });

  const handler = await loadFunction(log);
  const events = await ask(handler, "what's my bench progress");

  // The athlete sees the answer, streamed, and a clean finish.
  const said = events.filter((e) => typeof e.t === 'string').map((e) => e.t).join('');
  assert.equal(said, 'Your bench went from 205×5 in March to 225×5 on Monday.');
  const done = events.find((e) => e.done);
  assert.ok(done, `no done event: ${JSON.stringify(events)}`);
  assert.equal(done.remaining, 41);
  assert.equal(done.stop, 'end_turn');
  assert.equal(done.refunded, undefined, 'a delivered answer is charged');

  // Two model calls: the first offers the tools, the second carries the tool call and its result.
  assert.equal(log.requests.length, 2);
  const [first, second] = log.requests;
  assert.ok(first.tools.some((x) => x.name === 'get_lift_history'));
  assert.deepEqual(first.tools, second.tools, 'the tool list must not change between rounds (cache)');
  assert.equal(first.tool_choice, undefined);
  assert.equal(second.tool_choice, undefined, 'round 2 of 4 may still use tools');
  const [asked, result] = second.messages.slice(-2);
  assert.equal(asked.role, 'assistant');
  assert.deepEqual(asked.content, [{ type: 'tool_use', id: 'tu_1', name: 'get_lift_history', input: { exercise: 'bench' } }]);
  assert.equal(result.role, 'user');
  assert.equal(result.content[0].type, 'tool_result');
  assert.equal(result.content[0].tool_use_id, 'tu_1');
  assert.ok(!result.content[0].is_error);
  // The athlete's real numbers reached the model, on their calendar.
  assert.match(result.content[0].content, /Barbell Bench Press — 2 sessions/);
  assert.match(result.content[0].content, /2026-09-22 \(Tue\): 225×5/);

  // The reads ran as the athlete from the JWT, filtered to their own id.
  assert.equal(log.jwt, 'jwt-abc');
  for (const r of log.reads) assert.ok(r.eq.some(([, v]) => v === 'athlete-1'), `${r.table} read without the own-id filter`);

  // One credit reserved, settled once — usage summed across both rounds, nothing refunded.
  const reserve = log.rpcs.filter(([n]) => n === 'coach_ai_reserve');
  assert.equal(reserve.length, 1);
  assert.deepEqual(reserve[0][1], { p_action: 'message', p_fn: 'coach-ask' });
  const [s] = settles(log);
  assert.equal(settles(log).length, 1);
  assert.equal(s.p_reservation, RESERVATION);
  assert.equal(s.p_outcome, 'ok');
  assert.equal(s.p_refund, false);
  assert.equal(s.p_model, 'claude-sonnet-5');
  assert.equal(s.p_input_tokens, 900 + 1400);
  assert.equal(s.p_output_tokens, 40 + 60);
  assert.equal(s.p_cache_read_input_tokens, 6000);
  assert.equal(s.p_cache_creation_input_tokens, 0);
  assert.ok(Number.isInteger(s.p_latency_ms) && s.p_latency_ms >= 0);
});

test('a model that keeps reaching for data is made to answer after the last round', async (t) => {
  const log = newLog();
  // Keep calling tools until told not to.
  fakeAnthropic(t, log, (body) => (body.tool_choice?.type === 'none' ? answerRound("I've got enough to go on — here's the picture.") : toolRound()));

  const handler = await loadFunction(log);
  const events = await ask(handler, 'tell me everything about my training');
  assert.equal(log.requests.length, 5, 'four tool rounds, then one forced answer');
  assert.equal(log.requests[4].tool_choice.type, 'none');
  assert.ok(events.find((e) => e.done));
  assert.match(events.filter((e) => e.t).map((e) => e.t).join(''), /enough to go on/);
});

test('the medical guard still runs before any model call or credit', async (t) => {
  const log = newLog();
  fakeAnthropic(t, log, () => assert.fail('the model must not be called for a guarded question'));
  const handler = await loadFunction(log);
  // Acuity always stops (medical-routing.ts) — "hurts" alone deliberately does not, so a swap can be asked for.
  const res = await handler(request({ question: 'I think I tore my rotator cuff benching, what should I do' }, { Authorization: 'Bearer x' }));
  const body = await res.json();
  assert.equal(body.route, 'medical_stop');
  assert.equal(log.rpcs.length, 0, 'no reserve, no settle');
});

// ── Coach-AI-Amendment-002: actions, web search on a tap, and the end-of-chat summary ────────────────

const actionRound = () =>
  sse([
    { type: 'message_start', message: { model: 'claude-sonnet-5', usage: { input_tokens: 800, output_tokens: 1 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tu_e', name: 'propose_program_edit', input: {} } },
    { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"op":"swap","exercise":"bench","to":"dumbbell press","day":"Monday"}' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 30 } },
    { type: 'message_stop' },
  ]);

test('a program change is FORWARDED to the app to confirm — never applied on the server', async (t) => {
  const log = newLog();
  const replies = [actionRound(), answerRound('Set it up for you. Check it and tap to confirm.')];
  fakeAnthropic(t, log, () => replies.shift());
  const handler = await loadFunction(log);
  const events = await ask(handler, 'can you swap bench for dumbbell press on monday');

  const action = events.find((e) => e.action);
  assert.deepEqual(action.action, { name: 'propose_program_edit', input: { op: 'swap', exercise: 'bench', to: 'dumbbell press', day: 'Monday' } });
  // The server wrote nothing: no program read, no update.
  assert.ok(!log.reads.some((r) => r.table === 'programs'), 'the function must not touch programs for an action');
  // The model was told the app has it, and must not claim it is done.
  const [, result] = log.requests[1].messages.slice(-2);
  assert.match(result.content[0].content, /Do not say it is done/);
  assert.ok(events.find((e) => e.done));
  // An action is not a lookup: no status line for it (C-G5).
  assert.ok(!events.some((e) => e.status), 'an action has no status line');
});

test('web search is offered only on a TAPPED ask, and that ask meters as web', async (t) => {
  const log = newLog();
  fakeAnthropic(t, log, () => answerRound('Found one.'));
  const handler = await loadFunction(log);

  await ask(handler, 'any ideas for dinner');
  assert.ok(!log.requests[0].tools.some((x) => x.type?.startsWith('web_search')), 'no web search without the tap');
  assert.equal(log.rpcs.find(([n]) => n === 'coach_ai_reserve')[1].p_action, 'message');

  log.rpcs.length = 0;
  const res = await handler(request({ question: 'Find me a recipe online: high-protein chili', allowWeb: true }));
  await res.text();
  const webReq = log.requests[1];
  assert.ok(webReq.tools.some((x) => x.type === 'web_search_20260209' && x.max_uses === 2));
  // The reads and actions come first, in the same order, so each variant keeps one cached prefix.
  assert.deepEqual(webReq.tools.slice(0, -1).map((x) => x.name), log.requests[0].tools.map((x) => x.name));
  assert.match(webReq.messages.at(-1).content, /tapped "Find one online"/);
  assert.deepEqual(log.rpcs.find(([n]) => n === 'coach_ai_reserve')[1], { p_action: 'web', p_fn: 'coach-ask' });
});

test('the end of a chat writes one summary as the athlete, via the Premium AI gate, on Haiku', async (t) => {
  const log = newLog();
  fakeAnthropic(
    t,
    log,
    () =>
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'Asked how their bench is going; up from 205x5 to 225x5. Said their shoulder hurts on dips.' }],
          usage: { input_tokens: 300, output_tokens: 40 },
          stop_reason: 'end_turn',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
  );
  const handler = await loadFunction(log);
  const res = await handler(
    request({
      mode: 'summarize',
      question: '',
      history: [
        { role: 'athlete', text: "what's my bench progress" },
        { role: 'holt', text: 'Up from 205x5 to 225x5.' },
        { role: 'athlete', text: 'nice, thanks' },
      ],
    }),
  );
  assert.deepEqual(await res.json(), { ok: true, saved: true });
  assert.equal(log.requests[0].model, 'claude-haiku-4-5');
  assert.equal(log.rpcs[0][0], 'coach_ai_reserve');
  assert.deepEqual(log.rpcs[0][1], { p_action: 'summary', p_fn: 'coach-ask' });
  // Settled once, as a delivered summary, with its tokens.
  const [s] = settles(log);
  assert.equal(s.p_outcome, 'ok');
  assert.equal(s.p_refund, false);
  assert.equal(s.p_model, 'claude-haiku-4-5');
  assert.equal(s.p_input_tokens, 300);
  assert.equal(s.p_output_tokens, 40);
  // The medical sentence never reached storage.
  assert.deepEqual(log.inserts, [['holt_chat_summaries', { summary: 'Asked how their bench is going; up from 205x5 to 225x5.' }]]);
});
