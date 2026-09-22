import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { buildCoachAskDeploy, DEPLOY_COPY } from '../../../../scripts/build-coach-ask-deploy.mjs';

/*
 * SOURCE TESTS for supabase/functions/coach-ask/index.ts — it runs in Deno against a live API and a live
 * meter, neither of which `node --test` can reach. So these read the source and pin the properties that
 * make it safe and cheap: guard before credit before model, the CA-D1 history cap, context in the USER
 * turn (never the cached system block), the CA-D5 output cap, and usage recorded with all four counts.
 */
const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');
const SRC = read('supabase/functions/coach-ask/index.ts');
const LIVE = read('src/data/coach-ask-live.ts');

const at = (needle) => {
  const i = SRC.indexOf(needle);
  assert.ok(i >= 0, `expected to find: ${needle}`);
  return i;
};

test('guard → credit → model, in that order', () => {
  const guard = at('const guarded = guardRoute(question)');
  const spend = at("rpc('coach_ai_spend_credits', { p_action: action })");
  const model = at("fetch('https://api.anthropic.com/v1/messages'");
  assert.ok(guard < spend && spend < model);
  assert.match(SRC, /const action = 'message';/);
  // A guarded question returns a route and nothing else.
  assert.match(SRC, /if \(guarded\) return json\(\{ route: guarded \}\);/);
});

test('history is never sent beyond 8 turns — trimmed on the server, from the wire module', () => {
  assert.match(SRC, /const history = trimHistory\(body\.history, ASK_HISTORY_MAX\);/);
  // The raw body history is read in exactly one place: that trim.
  assert.equal(SRC.match(/body\.history/g).length, 1);
  // …and the app trims too, before sending.
  assert.match(LIVE, /history: trimHistory\(history, ASK_HISTORY_MAX\)/);
});

test('the context goes in the final USER turn, never the system block', () => {
  assert.match(SRC, /messages\.push\(\{ role: 'user', content: askUserTurn\(question, context, today\) \}\);/);
  assert.equal(SRC.match(/body\.context/g).length, 1);
  // The system block is one cached constant with nothing interpolated into it.
  assert.match(SRC, /system: \[\{ type: 'text', text: SYSTEM, cache_control: \{ type: 'ephemeral' \} \}\]/);
  const system = SRC.slice(SRC.indexOf('const SYSTEM = `'), SRC.indexOf('`;', SRC.indexOf('const SYSTEM = `')));
  assert.ok(!system.includes('${'), 'SYSTEM must not interpolate anything — it is the cache key');
  // Sonnet 5 caches a 1024+ token prefix; ~4 characters a token, with margin.
  assert.ok(system.length > 6000, `SYSTEM is ${system.length} chars — too short to cache`);
});

test('the system prompt carries the rules the brief asks for', () => {
  const system = SRC.slice(SRC.indexOf('const SYSTEM = `'), SRC.indexOf('`;', SRC.indexOf('const SYSTEM = `')));
  for (const rule of [
    '# Who Holt is',
    '# What Holt talks about, and where he stops',
    '# The app, so answers about it are right',
    'answer from that record',
    'Do not invent a different reason',
    'never builds a program in prose',
    '"Build it" button',
    '1 to 5 short sentences',
    'Plain text only',
    'If you do not know where something is, say so rather than inventing a screen.',
  ]) assert.ok(system.includes(rule), `missing: ${rule}`);
});

test('streamed, capped, low effort, no thinking — as coach-interpret', () => {
  assert.match(SRC, /max_tokens: ASK_OUTPUT_CAP,/);
  assert.match(SRC, /stream: true,/);
  assert.match(SRC, /thinking: \{ type: 'disabled' \}, output_config: \{ effort: 'low' \}/);
  assert.match(SRC, /const ALLOWED_MODELS = \[MODEL, HAIKU\];/);
  assert.match(SRC, /const MODEL = 'claude-sonnet-5';/);
});

test('usage is recorded with all four token counts, however the stream ends', () => {
  for (const p of ['p_input_tokens: u.input', 'p_output_tokens: u.output', 'p_cache_read_input_tokens: u.cacheRead', 'p_cache_creation_input_tokens: u.cacheWrite']) {
    assert.ok(SRC.includes(p), p);
  }
  // Success, failure mid-stream, and the client going away all record.
  assert.ok(SRC.includes('await finish(false);\n        send({\n          done: true'));
  assert.match(SRC, /async cancel\(\) \{[\s\S]*?await finish\(false\);/);
  assert.match(SRC, /await finish\(!sawText && usage\.output === 0\);/);
});

test('the SSE the app reads: {t}, then {done, usage, remaining}, or {error, detail}', () => {
  assert.ok(SRC.includes('send({ t: d.text })'));
  assert.ok(SRC.includes('remaining: reserved.remaining'));
  assert.ok(SRC.includes("'Content-Type': 'text/event-stream; charset=utf-8'"));
});

test('the dashboard paste copy is current', () => {
  const committed = read(DEPLOY_COPY);
  assert.equal(committed, buildCoachAskDeploy(), 'run `node scripts/build-coach-ask-deploy.mjs`');
  assert.ok(!committed.includes("from '../../../src/"), 'the paste copy cannot import from src/');
});

test('the app calls the function with expo/fetch and the athlete\'s JWT, and never throws', () => {
  assert.match(LIVE, /^import \{ fetch \} from 'expo\/fetch';/m);
  assert.match(LIVE, /Authorization: `Bearer \$\{jwt\}`/);
  assert.match(LIVE, /functions\/v1\/coach-ask/);
  assert.ok(!/ANTHROPIC|x-api-key/i.test(LIVE), 'no key, no direct model call from the app');
});

test('CA-D2 notes and the training summary reach the model ONLY through the user turn', () => {
  const WIRE = read('src/domain/coach/ask-wire.ts');
  // The function never touches the notes or the summary itself — only `cleanContext` → `askUserTurn`.
  assert.ok(!/context\.notes|context\.training|body\.context\.notes/.test(SRC), 'the function must not route notes anywhere else');
  const system = SRC.slice(SRC.indexOf('const SYSTEM = `'), SRC.indexOf('`;', SRC.indexOf('const SYSTEM = `')));
  assert.ok(!system.includes('${'), 'nothing per-athlete is interpolated into the cached block');
  // …and the wire puts them in the user turn, with the notes labelled as what Holt knows.
  const turn = WIRE.slice(WIRE.indexOf('export function askUserTurn'), WIRE.indexOf('// Server-Sent Events'));
  assert.ok(turn.includes('What you know about this athlete:'));
  assert.ok(turn.includes('context.notes'));
  assert.ok(turn.includes('context.training'));
  // The system prompt tells Holt how to use both, without pretending to see more.
  assert.ok(system.includes('What you know about this athlete'));
  assert.ok(system.includes("athlete's logged training is provided"));
  // And the paste copy carries it too.
  assert.ok(read(DEPLOY_COPY).includes('What you know about this athlete:'));
});
