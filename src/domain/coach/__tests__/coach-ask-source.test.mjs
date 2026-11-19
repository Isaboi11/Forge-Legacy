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

test('guard → reserve → model → settle, in that order (Sprint 1 contract §1)', () => {
  const guard = at('const guarded = guardRoute(question)');
  const reserve = at(".rpc('coach_ai_reserve', { p_action: action, p_fn: 'coach-ask' })");
  // The ask's model call — the end-of-chat summary has its own, earlier in the file, behind its own meter.
  const model = SRC.indexOf("fetch('https://api.anthropic.com/v1/messages'", reserve);
  assert.ok(guard < reserve && reserve < model);
  const sumReserve = at("rpc('coach_ai_reserve', { p_action: 'summary', p_fn: 'coach-ask' })");
  assert.ok(sumReserve < SRC.indexOf("fetch('https://api.anthropic.com/v1/messages'", sumReserve));
  // ⛔ The old meter is gone from this function: a credit that can't be given back, and a usage row anyone can forge.
  assert.doesNotMatch(SRC, /coach_ai_spend_credits|coach_ai_record_usage/);
  // Settle is the one way out, and it is called once per reservation (`settler` keeps the first promise).
  assert.equal(SRC.match(/\.rpc\('coach_ai_settle'/g).length, 1);
  assert.match(SRC, /\(once \?\?= supabase\s*\.rpc\('coach_ai_settle'/);
  // An ask meters 'message'; only an ask the athlete TAPPED for online search meters 'web' (0218).
  assert.ok(SRC.includes("const action = allowWeb ? 'web' : 'message';"));
  assert.ok(SRC.includes('const allowWeb = body.allowWeb === true;'));
  // A guarded question returns a route and nothing else.
  assert.match(SRC, /if \(guarded\) return json\(\{ route: guarded \}\);/);
});

test('history is never sent beyond 8 turns — trimmed on the server, from the wire module', () => {
  // ⛔ …and every turn through the medical guard first (QA R2-F1) — the minor's guard for a profile minor
  // (P-G8) — then cut to the window.
  assert.match(SRC, /const stops = \(t: string\) => guardRoute\(t, minor\) !== null;/);
  assert.match(SRC, /const history = withoutStoppedTurns\(trimHistory\(body\.history, ASK_HISTORY_MAX \* 4\), stops\)\.slice\(-ASK_HISTORY_MAX\);/);
  // The raw body history is only ever read through a trim: the ask's (8 turns), the end-of-chat summary's (0218) and
  // the rolling recap's (Sprint 4b §1.2) — never handed to the model as the client sent it.
  assert.equal(SRC.match(/body\.history/g).length, 3);
  assert.match(SRC, /const turns = withoutStoppedTurns\(trimHistory\(body\.history, SUMMARY_TURNS \* 4\)\)\.slice\(-SUMMARY_TURNS\);/);
  assert.match(SRC, /const adult = withoutStoppedTurns\(trimHistory\(body\.history, SUMMARY_TURNS \* 4\)\)\.slice\(-SUMMARY_TURNS\);/);
  // …and the app trims too, before sending.
  assert.match(LIVE, /history: trimHistory\(history, ASK_HISTORY_MAX\)/);
});

test('⛔ Sprint 1 left the cached SYSTEM block byte-identical — the cache key did not move', async () => {
  const { createHash } = await import('node:crypto');
  const system = SRC.slice(SRC.indexOf('const SYSTEM = `'), SRC.indexOf('`;', SRC.indexOf('const SYSTEM = `')));
  // sha256 of the block as it stood at b87a2511 (Sprint 0, OTA #24). Change it only on purpose, with a cache plan.
  assert.equal(createHash('sha256').update(system).digest('hex'), 'b3cb1ee88eea110ef7769bf461e7d6ec9db670dc301ec756f5dc01c735c41dab');
});

test('the context goes in the final USER turn, never the system block', () => {
  // The server's age (P-G8) rides there too — from the reservation, never from the client.
  assert.match(SRC, /messages\.push\(\{ role: 'user', content: askUserTurn\(question, context, today, \{ ageYears: reserved\.age_years, minor \}\) \}\);/);
  assert.equal(SRC.match(/body\.context/g).length, 1);
  assert.doesNotMatch(SRC, /body\.(age|minor|birth)/, 'a client cannot claim an age');
  // The system block is one cached constant with nothing interpolated into it.
  // Sprint 4a: SYSTEM for an app without caps, SYSTEM_V1 for one with `actions_v1` — each one cached constant.
  assert.match(SRC, /system: \[\{ type: 'text', text: PROMPT, cache_control: \{ type: 'ephemeral' \} \}\]/);
  assert.match(SRC, /const PROMPT = v1 \? SYSTEM_V1_FOOD : SYSTEM;/);
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
    // The athlete's data is looked up, never disclaimed (ask-tools.ts; the bench question that started it).
    '# Looking things up',
    "Never say you don't have their data",
    'You can only see this athlete\'s own records.',
    'Body metrics are read only when the athlete asks',
  ]) assert.ok(system.includes(rule), `missing: ${rule}`);
});

test('streamed, capped, low effort, no thinking — as coach-interpret', () => {
  assert.match(SRC, /max_tokens: ASK_OUTPUT_CAP,/);
  assert.match(SRC, /stream: true,/);
  // PL-7 (Sprint 3b): thinking off + effort low in the form THIS model takes — one table, model-request.ts, whose test
  // walks every model. The default effort is low; the config (0274) can set another.
  assert.match(SRC, /\.\.\.requestFields\(model, \{ thinkingOff: true, effort: askEffort \}\),/);
  assert.match(SRC, /headers: anthropicHeaders\(ANTHROPIC_API_KEY!, askFields\),/);
  assert.match(SRC, /const EFFORT = 'low';/);
  assert.match(SRC, /const ALLOWED_MODELS = \[MODEL, HAIKU\];/);
  assert.match(SRC, /const MODEL = 'claude-sonnet-5-5';/, 'PO 11-18: Holt’s chat runs Sonnet 5.5 for everyone');
  assert.doesNotMatch(SRC, /thinking: \{ type: 'disabled' \}/, 'no hand-written thinking field: Sonnet 5.5 and Opus 5.5 reject it');
});

test('settle carries all four token counts, the latency and the outcome — however the stream ends', () => {
  for (const p of [
    'p_input_tokens: meterInt(u.input',
    'p_output_tokens: meterInt(u.output',
    'p_cache_read_input_tokens: meterInt(u.cacheRead',
    'p_cache_creation_input_tokens: meterInt(u.cacheWrite',
    'p_latency_ms: meterInt(Date.now() - startedAt',
    'p_outcome: outcome',
    'p_refund: refund',
  ]) {
    assert.ok(SRC.includes(p), p);
  }
  // The end of the turn settles BEFORE its last line (contract §1.3); the athlete leaving settles as cancelled,
  // never refunded.
  const end = SRC.slice(at('const { outcome, refund } = askSettlement({ failure, stop, delivered });'));
  const settled = end.indexOf('await settle(outcome, refund, servedBy, spent())');
  assert.ok(settled > 0 && settled < end.indexOf('send(askFailureEvent(') && settled < end.indexOf('done: true'));
  assert.match(SRC, /await settle\('cancelled', false, servedBy, spent\(\)\);/);
  assert.match(SRC, /cancel: \(\) => leave\(\),/);
});

test('the SSE the app reads: {t}, {status}, then {done, usage, remaining} or {error} — fixed codes, never detail', () => {
  assert.ok(SRC.includes('send({ t: d.text })'));
  assert.ok(SRC.includes('send({ status: s })'));
  assert.ok(SRC.includes('remaining: remaining ?? reserved.remaining'));
  assert.ok(SRC.includes("'Content-Type': 'text/event-stream; charset=utf-8'"));
  // ⛔ P-D8: no client event carries the upstream's words. The failure line is built in one place.
  assert.doesNotMatch(SRC, /\bdetail:/);
  assert.match(SRC, /send\(askFailureEvent\(failure, \{ refunded, remaining \}\)\);/);
  // C-D8: the model is chosen in one place — the configured model (PL-7, 0274) or MODEL — and a tapped web search never
  // goes to a model without the web search tool (Haiku): then it runs MODEL (Sonnet).
  assert.match(SRC, /const choice = await modelConfig\.pick\('coach-ask', uidFromAuthorization\(authorization\), \{ model: MODEL, effort: EFFORT \}\);/);
  assert.match(SRC, /const webModel = takesWebSearch\(choice\.model\) \? choice\.model : MODEL;/);
  assert.match(SRC, /const model = askModel\(body\.model, allowWeb, \[choice\.model, \.\.\.ALLOWED_MODELS\], allowWeb \? webModel : choice\.model\);/);
  assert.doesNotMatch(SRC, /body\.model && ALLOWED_MODELS\.includes/);
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
  // The function never routes the notes or the summary anywhere else — only `cleanContext` → `askUserTurn`. Its one
  // touch of the notes is the C-D7 filter (Sprint 2), which can only DROP a note: the guard coach-interpret runs.
  assert.ok(!/context\.training|body\.context\.notes/.test(SRC), 'the function must not route notes anywhere else');
  assert.equal((SRC.match(/context\.notes/g) ?? []).length, 2, 'one touch: the filter');
  assert.match(SRC, /context\.notes = \(context\.notes \?\? \[\]\)\.filter\(\(n\) => !stops\(n\) && !scanReply\(n\)\.hit\);/);
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

test('QA holtai-12 — Holt answers only the newest message, and the deploy bundle carries the rule', () => {
  at("- Answer only the athlete's newest message. Earlier messages are context: never answer one again, repeat a refusal you already gave, or recap what you said before.");
  assert.match(read('supabase/apply/deploy-coach-ask.ts'), /Answer only the athlete's newest message/, 'deploy-coach-ask.ts is stale — regenerate it');
});

test('Sprint 4a: `detail` leaves the function in ONE place — the caps status line — and the build mark is service-role only', () => {
  // P-D8 still holds: no upstream words. The only `detail` on the wire is the status line's (askStatusDetail, ask-wire.ts).
  assert.equal((SRC.match(/\bdetail\b/g) ?? []).filter(() => true).length >= 1, true);
  assert.match(SRC, /if \(Object\.keys\(detail\)\.length > 1\) send\(\{ status: line, detail \}\);/);
  assert.match(SRC, /const statusDetail = \(toolName: unknown, json: string\) => \{\n\s+if \(!v1\) return;/);
  // The mark: after the settle, kept turns only, with the service key — never the athlete's JWT.
  assert.match(SRC, /if \(openedBuild && outcome === 'ok' && !refunded\) await markBuild\(reserved\.reservation_id as string\);/);
  assert.match(SRC, /rpc\/coach_ai_mark_build`, \{/);
  assert.match(SRC, /headers: \{ apikey: SERVICE_ROLE_KEY, Authorization: `Bearer \$\{SERVICE_ROLE_KEY\}`/);
  // §1.3: the action-input check sits before the forward.
  const check = SRC.indexOf('if (words.some(stops) || (words.length > 0 && scanTexts(words, question).hit)) {');
  assert.ok(check > 0 && check < SRC.indexOf('send({ action: { name: c.name, input: out } });'));
});
