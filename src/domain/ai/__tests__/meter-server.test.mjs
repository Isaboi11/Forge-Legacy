import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  ageLine,
  callFacts,
  failedCallReply,
  reserveFrom,
  settleArgs,
  settledFrom,
  settledTail,
  timedModelCall,
  UPSTREAM_ABORT_MS,
  withAgeLine,
} from '../meter-server.ts';

/*
 * The server half of the AI meter (AI Road to 10 Sprint 1; `Docs/AI-Sprint-1-Build-Notes.md` §1–§3), run for real:
 * what reserve's row becomes, how a model call ends (ok / non-2xx / unreachable / OUR timeout), what a settle sends,
 * the age line — and that the two self-contained functions carry an exact copy of it.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const SRC = read('src/domain/ai/meter-server.ts');

const quiet = async (fn) => {
  const err = console.error;
  const said = [];
  console.error = (...a) => said.push(a.join(' '));
  try {
    return { result: await fn(), said };
  } finally {
    console.error = err;
  }
};

/* ── reserve ──────────────────────────────────────────────────────────────── */

test('reserve: an allowed row is a reservation with the server age; every refusal keeps its reason', () => {
  const ok = reserveFrom(
    { allowed: true, reason: 'ok', reservation_id: 'r-1', credits_spent: 2, remaining: 148, allowance: 150, age_years: 16, minor: true },
    null,
  );
  assert.deepEqual(ok, { ok: true, id: 'r-1', credits: 2, remaining: 148, allowance: 150, ageYears: 16, minor: true });
  assert.deepEqual(reserveFrom({ allowed: true, reservation_id: 'r', age_years: null, minor: null }, null).ageYears, null);
  assert.equal(reserveFrom({ allowed: true, reservation_id: 'r', minor: null }, null).minor, false);
  for (const reason of ['not_entitled', 'no_consent', 'out_of_credits']) {
    assert.deepEqual(reserveFrom({ allowed: false, reason, remaining: 3, allowance: 150 }, null), { ok: false, reason, remaining: 3, allowance: 150 });
  }
  // A reason this code does not know is still a refusal, never a model call.
  assert.equal(reserveFrom({ allowed: false, reason: 'something_new' }, null).reason, 'out_of_credits');
  // The RPC failing (0268 not applied, a network error) is the meter being down — the existing 503.
  assert.equal(reserveFrom(null, { code: 'PGRST202' }).reason, 'meter_unavailable');
  assert.equal(reserveFrom(null, null).reason, 'meter_unavailable');
  assert.equal(reserveFrom({ allowed: true }, null).reason, 'meter_unavailable', 'allowed with no id cannot be settled — refuse');
});

/* ── the model call ───────────────────────────────────────────────────────── */

const okResponse = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });

test('a model call that answers is ok, with its payload and the round-trip time', async () => {
  const payload = { model: 'claude-sonnet-5', stop_reason: 'end_turn', usage: { input_tokens: 10 }, content: [{ type: 'text', text: 'hi' }] };
  const call = await timedModelCall(async (signal) => {
    assert.ok(signal instanceof AbortSignal, 'the request is given the abort signal');
    return okResponse(payload);
  }, 5_000);
  assert.equal(call.kind, 'ok');
  assert.deepEqual(call.payload, payload);
  assert.ok(call.latencyMs >= 0);
});

test('⛔ a non-2xx is upstream_error with its status — the upstream’s words go to the log, never into the result (P-D8)', async () => {
  const secret = '{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low"}}';
  const { result, said } = await quiet(() =>
    timedModelCall(async () => ({ ok: false, status: 400, text: async () => secret, json: async () => JSON.parse(secret) }), 5_000),
  );
  assert.deepEqual(Object.keys(result).sort(), ['kind', 'latencyMs', 'status']);
  assert.equal(result.kind, 'upstream_error');
  assert.equal(result.status, 400);
  assert.ok(!JSON.stringify(result).includes('credit balance'), 'no upstream text in the result');
  assert.ok(said.some((l) => l.includes('credit balance')), 'it is in the function log');
  assert.deepEqual(failedCallReply(result.kind), { reason: 'upstream_error' });
});

test('a request that throws is upstream_unreachable', async () => {
  const call = await timedModelCall(async () => {
    throw new TypeError('fetch failed');
  }, 5_000);
  assert.equal(call.kind, 'upstream_unreachable');
  assert.deepEqual(failedCallReply(call.kind), { reason: 'upstream_unreachable' });
});

test('OUR abort fires → timeout, reported as the existing upstream_error + upstream: "timeout" (contract §1.2)', async () => {
  const hang = (signal) =>
    new Promise((_, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  const started = Date.now();
  const call = await timedModelCall(hang, 30);
  assert.equal(call.kind, 'timeout');
  assert.ok(Date.now() - started < 2_000, 'the abort really ends the wait');
  assert.deepEqual(failedCallReply(call.kind), { reason: 'upstream_error', upstream: 'timeout' });
});

test('a reply whose BODY stalls is cut off by the same abort', async () => {
  const call = await timedModelCall(
    async (signal) => ({
      ok: true,
      status: 200,
      json: () => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))),
      text: async () => '',
    }),
    30,
  );
  assert.equal(call.kind, 'timeout');
});

test('a 200 whose body is not JSON is an upstream error, not a crash', async () => {
  const call = await timedModelCall(async () => ({ ok: true, status: 200, json: async () => JSON.parse('<html>'), text: async () => '<html>' }), 5_000);
  assert.equal(call.kind, 'upstream_error');
});

/* ── settle ───────────────────────────────────────────────────────────────── */

test('settle: every outcome but ok refunds; all four token counts; clamps; the reservation passed through', () => {
  const ok = settleArgs('r-9', 'ok', {
    model: 'claude-sonnet-5',
    usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 14_000, cache_creation_input_tokens: 0 },
    latencyMs: 2345.6,
  });
  assert.deepEqual(ok, {
    p_reservation: 'r-9',
    p_outcome: 'ok',
    p_model: 'claude-sonnet-5',
    p_input_tokens: 1200,
    p_output_tokens: 300,
    p_cache_read_input_tokens: 14_000,
    p_cache_creation_input_tokens: 0,
    p_latency_ms: 2346,
    p_refund: false,
  });
  for (const outcome of ['upstream_error', 'upstream_unreachable', 'timeout', 'refusal', 'truncated', 'not_a_program', 'unreadable', 'bad_output', 'cancelled', 'guarded']) {
    assert.equal(settleArgs('r', outcome, { model: 'm' }).p_refund, true, `${outcome} refunds`);
  }
  const bad = settleArgs('r', 'timeout', { model: 'm', usage: { input_tokens: -4, output_tokens: Number.NaN }, latencyMs: null });
  assert.equal(bad.p_input_tokens, 0);
  assert.equal(bad.p_output_tokens, 0);
  assert.equal(bad.p_latency_ms, null);
});

test('callFacts: the answering model and its usage; a failed call records the fallback model and no tokens', () => {
  const okCall = { kind: 'ok', payload: { model: 'claude-sonnet-5-20261201', usage: { input_tokens: 5 } }, latencyMs: 9 };
  assert.deepEqual(callFacts(okCall, 'claude-sonnet-5'), { model: 'claude-sonnet-5-20261201', usage: { input_tokens: 5 }, latencyMs: 9 });
  assert.deepEqual(callFacts({ kind: 'timeout', latencyMs: 75_000 }, 'claude-sonnet-5'), { model: 'claude-sonnet-5', usage: null, latencyMs: 75_000 });
  assert.equal(callFacts({ kind: 'ok', payload: {}, latencyMs: 1 }, 'fallback').model, 'fallback');
});

test('the reply tail: refunded only when the settle really refunded, and the balance after it', () => {
  assert.deepEqual(settledFrom({ settled: true, refunded: true, cost_usd: 0.002, remaining: 149 }, null), { settled: true, refunded: true, remaining: 149 });
  assert.deepEqual(settledFrom({ settled: false, refunded: false, remaining: null }, null), { settled: false, refunded: false, remaining: null });
  assert.deepEqual(settledFrom({ settled: false, refunded: true }, null).refunded, false, 'a no-op settle never claims a refund');
  assert.deepEqual(settledFrom(null, { message: 'network' }), { settled: false, refunded: false, remaining: null });
  assert.deepEqual(settledTail({ settled: true, refunded: true, remaining: 149 }, 147), { remaining: 149, refunded: true });
  assert.deepEqual(settledTail({ settled: true, refunded: false, remaining: 147 }, 147), { remaining: 147 });
  assert.deepEqual(settledTail({ settled: false, refunded: false, remaining: null }, 147), { remaining: 147 }, 'unanswered settle: the reserved balance, no refund claimed');
});

/* ── P-G8: the age line ───────────────────────────────────────────────────── */

test('the age line: an adult’s age; a minor gets the conservative, supervised, no-max, no-weight-loss instruction', () => {
  assert.equal(ageLine(34, false), "Athlete's age, from their profile: 34.");
  assert.equal(ageLine(null, false), null, 'unknown age is no line — it reads as an adult, as isUnderAge(null) does');
  const minor = ageLine(16, true);
  assert.match(minor, /16, under 18/);
  for (const words of ['conservative', 'supervised', 'no maximal-effort', 'max attempts', 'losing weight']) assert.ok(minor.includes(words), words);
  assert.match(ageLine(18, true), /18, under 18/, 'the year you turn 18 is still under 18');
  // coach-kitchen: the app's flag can make an adult-by-profile a minor (the stricter wins) — never "34, under 18".
  assert.match(ageLine(34, true), /profile: under 18\./);
  assert.match(ageLine(null, true), /profile: under 18\./);
  assert.equal(withAgeLine('turn', null, false), 'turn');
  assert.equal(withAgeLine('turn', 34, false), "turn\n\nAthlete's age, from their profile: 34.");
});

/* ── the module, its copies, and the contract's timeouts ─────────────────── */

test('the module has no imports, which is what lets the paste-copy builders inline it', () => {
  assert.ok(!/^import /m.test(SRC));
});

const block = (s) => {
  const a = s.indexOf('// ── METER: begin ──');
  const b = s.indexOf('// ── METER: end ──');
  assert.ok(a >= 0 && b > a, 'METER markers');
  return s.slice(a, b);
};

test('the self-contained functions carry an EXACT copy of the meter (only `export` differs)', () => {
  const want = block(SRC).replace(/^export /gm, '');
  for (const fn of ['workout-tidy', 'workout-card-read']) {
    assert.equal(block(read(`supabase/functions/${fn}/index.ts`)), want, `${fn}'s METER block differs — paste src/domain/ai/meter-server.ts again`);
  }
});

test('every server abort is the contract §3 figure, inside the app’s timeout (≥ 10 s inside, but for coach-author)', () => {
  const doc = read('Docs/AI-Sprint-1-Build-Notes.md');
  const table = doc.slice(doc.indexOf('## 3. Timeouts'), doc.indexOf('## 4.'));
  const rows = [...table.matchAll(/^\| ([a-z\- ·]+?) \| (\d+) s[^|]*\| (\d+) s \|$/gm)];
  const seen = new Set();
  for (const [, names, app, server] of rows) {
    for (const fn of names.split('·').map((s) => s.trim())) {
      seen.add(fn);
      const margin = Number(app) * 1000 - UPSTREAM_ABORT_MS[fn];
      assert.equal(UPSTREAM_ABORT_MS[fn], Number(server) * 1000, `${fn}: the contract says ${server} s`);
      assert.ok(margin > 0, `${fn}: the function must answer before the app's ${app} s`);
      // The contract's own row gives coach-author 25 s inside Sprint 0's 30 s (5 s): the app builds from the
      // rulebook at 30 s whatever happens, so the table wins over the general 10 s rule there.
      if (fn !== 'coach-author') assert.ok(margin >= 10_000, `${fn}: the abort must sit at least 10 s inside the app's ${app} s`);
    }
  }
  assert.deepEqual([...seen].sort(), Object.keys(UPSTREAM_ABORT_MS).sort(), 'one abort per function in the table, and no others');
});
