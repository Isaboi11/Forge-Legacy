// node --experimental-strip-types --test src/domain/ai/__tests__/ai-canary.test.mjs
//
// supabase/functions/ai-canary (AI Road to 10 Sprint 1, PL-4). The function is self-contained and runs on Deno,
// so the test lifts its pure CANARY CORE (between the markers), strips the types, and runs the REAL handler with
// a fake fetch and a fake database: a stranger without the secret gets a 401 and Anthropic is never called.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const SRC = readFileSync(new URL('../../../../supabase/functions/ai-canary/index.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const BEGIN = '// ── CANARY CORE: begin';
const END = '// ── CANARY CORE: end';
const CORE = SRC.slice(SRC.indexOf(BEGIN), SRC.indexOf(END));
const core = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(CORE)).toString('base64')}`);

const SECRET = 'a'.repeat(64);

/** A fake world: records every model call and every RPC. */
function world({ claim = { data: true, error: null }, record = { data: { run: 7, ok: true, failed: 0 }, error: null }, answer = () => ({ status: 200, body: '{}' }) } = {}) {
  const fetches = [];
  const rpcs = [];
  let clock = 1_000;
  const deps = {
    secret: SECRET,
    apiKey: 'sk-test',
    dbReady: true,
    rpc: async (fn, args) => {
      rpcs.push({ fn, args });
      return fn === 'ai_canary_begin' ? claim : record;
    },
    fetch: async (url, init) => {
      fetches.push({ url, init, body: JSON.parse(init.body) });
      const a = await answer(JSON.parse(init.body).model, init);
      clock += 250;
      return { status: a.status, ok: a.status >= 200 && a.status < 300, text: async () => a.body };
    },
    now: () => clock,
  };
  return { deps, fetches, rpcs };
}
const req = (headers = {}, method = 'POST') => new Request('https://x.supabase.co/functions/v1/ai-canary', { method, headers });

test('⛔ no secret, a wrong secret, or an unset secret → 401, and NOTHING is called (no model, no database)', async () => {
  for (const [label, headers, secret] of [
    ['no header', {}, SECRET],
    ['wrong', { 'x-cron-secret': 'b'.repeat(64) }, SECRET],
    ['a prefix', { 'x-cron-secret': SECRET.slice(0, 63) }, SECRET],
    ['empty header', { 'x-cron-secret': '' }, SECRET],
    ['secret unset in the function', { 'x-cron-secret': '' }, ''],
  ]) {
    const w = world();
    const res = await core.canaryHandler({ ...w.deps, secret })(req(headers));
    assert.equal(res.status, 401, label);
    assert.deepEqual(await res.json(), { ok: false, reason: 'unauthorized' }, label);
    assert.equal(w.fetches.length, 0, `${label}: Anthropic was called`);
    assert.equal(w.rpcs.length, 0, `${label}: the database was called`);
  }
});

test('the secret check is the first statement of the handler, before the body, the database and any fetch (source)', () => {
  const handler = CORE.slice(CORE.indexOf('export function canaryHandler'));
  const first = handler.indexOf('if (!secretMatches(req.headers.get(\'x-cron-secret\'), deps.secret))');
  assert.ok(first > 0, 'the check is there');
  for (const later of ['req.method', 'deps.rpc(', 'probe(', 'req.json', 'req.text']) {
    const at = handler.indexOf(later);
    if (at >= 0) assert.ok(first < at, `the secret check comes before ${later}`);
  }
  // And outside the core nothing runs on a request except the handler.
  const tail = SRC.slice(SRC.indexOf(END));
  assert.doesNotMatch(tail, /api\.anthropic\.com/);
  assert.match(tail, /Deno\.serve\(\s*canaryHandler\(/);
  assert.match(tail, /secret: Deno\.env\.get\('AI_CANARY_SECRET'\) \?\? ''/);
});

test('with the secret: the database claims the run BEFORE any model call; a refused claim spends nothing', async () => {
  const tooSoon = world({ claim: { data: false, error: null } });
  const r1 = await core.canaryHandler(tooSoon.deps)(req({ 'x-cron-secret': SECRET }));
  assert.equal(r1.status, 429);
  assert.equal((await r1.json()).reason, 'too_soon');
  assert.equal(tooSoon.fetches.length, 0);
  assert.deepEqual(tooSoon.rpcs.map((r) => r.fn), ['ai_canary_begin']);

  const broken = world({ claim: { data: null, error: { code: '42501' } } });
  const r2 = await core.canaryHandler(broken.deps)(req({ 'x-cron-secret': SECRET }));
  assert.equal(r2.status, 503);
  assert.equal(broken.fetches.length, 0);

  const notPost = world();
  assert.equal((await core.canaryHandler(notPost.deps)(req({ 'x-cron-secret': SECRET }, 'GET'))).status, 405);
  assert.equal(notPost.fetches.length + notPost.rpcs.length, 0);

  const noKey = world();
  assert.equal((await core.canaryHandler({ ...noKey.deps, apiKey: '' })(req({ 'x-cron-secret': SECRET }))).status, 503);
  assert.equal(noKey.fetches.length + noKey.rpcs.length, 0);
});

test('a run: one tiny call per model (max_tokens 1), then the record with kinds and numbers only', async () => {
  const w = world({
    answer: (model) =>
      model === 'claude-haiku-4-5'
        ? { status: 400, body: '{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}}' }
        : model === 'claude-opus-5-5'
          ? { status: 529, body: '{"error":{"message":"Overloaded"}}' }
          : { status: 200, body: '{"content":[{"type":"text","text":"OK"}]}' },
  });
  const res = await core.canaryHandler(w.deps)(req({ 'x-cron-secret': SECRET }));
  assert.equal(res.status, 200);
  assert.deepEqual(w.rpcs.map((r) => r.fn), ['ai_canary_begin', 'ai_canary_record']);
  assert.deepEqual(w.fetches.map((f) => f.body.model), ['claude-sonnet-5', 'claude-haiku-4-5', 'claude-opus-5-5']);
  for (const f of w.fetches) {
    assert.equal(f.url, 'https://api.anthropic.com/v1/messages');
    assert.equal(f.body.max_tokens, 1);
    assert.equal(f.body.messages.length, 1);
    assert.ok(f.body.messages[0].content.length <= 20, 'a three-word prompt');
    assert.equal(f.init.headers['x-api-key'], 'sk-test');
    assert.ok(f.init.signal instanceof AbortSignal, 'each call can be aborted');
  }
  assert.deepEqual(w.fetches[2].body.output_config, { effort: 'low' }, 'Opus 5.5 always thinks: lowest effort');
  const sent = w.rpcs[1].args.p_results;
  assert.equal(w.rpcs[1].args.p_secret, SECRET);
  assert.deepEqual(sent.map((r) => [r.model, r.kind, r.status]), [
    ['claude-sonnet-5', 'ok', 200],
    ['claude-haiku-4-5', 'key_drained', 400],
    ['claude-opus-5-5', 'overloaded', 529],
  ]);
  for (const r of sent) {
    assert.deepEqual(Object.keys(r).sort(), ['kind', 'latency_ms', 'model', 'status']);
    assert.equal(typeof r.latency_ms, 'number');
  }
  const out = JSON.stringify(await res.json());
  assert.doesNotMatch(out + JSON.stringify(sent), /credit balance|Overloaded|invalid_request/, 'never the error text');
});

test('a call that hangs is cut at the abort and recorded as a timeout; a thrown fetch is a network error', async () => {
  const hang = (_url, init) =>
    new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  const r = await core.probe('claude-sonnet-5', 'k', hang, () => 0, 20);
  assert.deepEqual([r.kind, r.status], ['timeout', null]);
  const down = await core.probe('claude-sonnet-5', 'k', async () => { throw new Error('dns'); }, () => 0);
  assert.deepEqual([down.kind, down.status], ['network_error', null]);
  assert.equal(core.PROBE_ABORT_MS, 20_000);
});

test('classification of every answer', () => {
  const c = core.classifyCanary;
  assert.equal(c(200, ''), 'ok');
  assert.equal(c(429, ''), 'rate_limited');
  assert.equal(c(529, ''), 'overloaded');
  assert.equal(c(500, ''), 'server_error');
  assert.equal(c(503, ''), 'server_error');
  assert.equal(c(401, ''), 'auth_error');
  assert.equal(c(403, ''), 'auth_error');
  assert.equal(c(400, 'Your credit balance is too low to access the Anthropic API.'), 'key_drained');
  assert.equal(c(400, 'You have reached your specified workspace API usage limits.'), 'key_drained');
  assert.equal(c(402, ''), 'key_drained');
  assert.equal(c(400, 'max_tokens: must be positive'), 'bad_request');
  assert.equal(c(404, 'model: claude-x'), 'model_unavailable');
  assert.equal(core.secretMatches(SECRET, SECRET), true);
  assert.equal(core.secretMatches(null, SECRET), false);
  assert.equal(core.secretMatches('', ''), false, 'an unset secret never matches');
});

test('the models are the ones in use, and the file says what it costs and how it is deployed', () => {
  assert.deepEqual([...core.CANARY_MODELS], ['claude-sonnet-5', 'claude-haiku-4-5', 'claude-opus-5-5']);
  assert.match(SRC, /≈ \$0\.00012 a run/);
  assert.match(SRC, /≈ \$0\.004 a month/);
  assert.match(SRC, /"Verify JWT" OFF/);
  assert.doesNotMatch(CORE, /\bDeno\b|\bimport\b/, 'the core is pure');
});
