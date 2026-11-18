/**
 * ask-turn.test.mjs — the rules of one coach-ask turn, pure (AI Road to 10 Sprint 1: P-D2 · C-I2 · C-G5 · C-D8 · P-D8).
 *
 * The function itself is run for real (paste bundle, fake model, fake meter) in coach-ask-turn.test.mjs; this
 * file walks the decisions it makes. Nothing here touches the network.
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/__tests__/ask-turn.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASK_CUT_STOPS,
  ASK_KEEPALIVE_MS,
  ASK_SERVER_IDLE_MS,
  ASK_SERVER_TURN_MS,
  ASK_SERVER_WEB_TURN_MS,
  RETRY_AFTER_CAP_MS,
  RETRY_DEFAULT_MS,
  SUMMARY_UPSTREAM_MS,
  askFailureEvent,
  askModel,
  askSettlement,
  askTurnMs,
  isRetryableStatus,
  reserveRefusal,
  retryDelayMs,
  upstreamWithRetry,
  waitUnlessAborted,
} from '../ask-turn.ts';
import { ASK_FIRST_BYTE_MS, ASK_IDLE_MS, ASK_TOTAL_MS, ASK_WEB_FIRST_BYTE_MS, ASK_WEB_TOTAL_MS, SUMMARY_TIMEOUT_MS } from '../ask-stream.ts';
import { ASK_STATUS_PHRASES, askStatusFor, isAskStatus } from '../ask-wire.ts';
import { ASK_ACTION_NAMES, ASK_TOOLS } from '../ask-tools.ts';

// ─────────────────────────────────────────────────────────────────────────────
// THE RETRY (C-I2): once, only before any text, only on what a retry can fix
// ─────────────────────────────────────────────────────────────────────────────

const reply = (status, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  body: status >= 200 && status < 300 ? {} : null,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
});

/** A scripted `call`: each entry is a status, or an Error to throw. Records how many requests went out. */
function script(...steps) {
  const s = { calls: 0, waits: [], failed: [] };
  s.call = async () => {
    const step = steps[Math.min(s.calls, steps.length - 1)];
    s.calls += 1;
    if (step instanceof Error) throw step;
    return typeof step === 'number' ? reply(step) : step;
  };
  s.wait = async (ms) => void s.waits.push(ms);
  s.onFailed = (a) => void s.failed.push(a.status);
  return s;
}

test('retry: a 529 then a reply — one retry, and the reply is used', async () => {
  const s = script(reply(529, { 'retry-after': '2' }), 200);
  const r = await upstreamWithRetry(s.call, { canRetry: () => true, wait: s.wait, failed: s.onFailed });
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 2);
  assert.equal(s.calls, 2);
  assert.deepEqual(s.waits, [2000], 'retry-after honoured');
  assert.deepEqual(s.failed, [529], 'the failed attempt is told (for the server log), the good one is not');
});

test('retry: AT MOST ONCE — two overloads in a row are a failure after two requests', async () => {
  for (const status of [429, 529, 500, 502, 503]) {
    const s = script(status, status, 200);
    const r = await upstreamWithRetry(s.call, { canRetry: () => true, wait: s.wait });
    assert.deepEqual({ ok: r.ok, failure: r.failure, status: r.status, attempts: r.attempts }, { ok: false, failure: 'upstream_error', status, attempts: 2 }, `status ${status}`);
    assert.equal(s.calls, 2, `status ${status}: a third request must never go out`);
  }
});

test('retry: a network error is retried once; two are "unreachable"', async () => {
  const once = script(new Error('connection reset'), 200);
  assert.equal((await upstreamWithRetry(once.call, { canRetry: () => true, wait: once.wait })).ok, true);
  assert.deepEqual(once.waits, [RETRY_DEFAULT_MS]);
  const twice = script(new Error('connection reset'), new Error('connection reset'), 200);
  const r = await upstreamWithRetry(twice.call, { canRetry: () => true, wait: twice.wait });
  assert.deepEqual({ ok: r.ok, failure: r.failure, status: r.status }, { ok: false, failure: 'upstream_unreachable', status: null });
  assert.equal(twice.calls, 2);
});

test('retry: ⛔ never once text has gone to the app — canRetry false means one request only', async () => {
  const s = script(529, 200);
  const r = await upstreamWithRetry(s.call, { canRetry: () => false, wait: s.wait });
  assert.equal(r.ok, false);
  assert.equal(s.calls, 1);
  assert.deepEqual(s.waits, [], 'and no wait either');
});

test('retry: asked again AFTER the wait — text (or the turn ending) during the backoff stops it', async () => {
  let allowed = true;
  const s = script(529, 200);
  const r = await upstreamWithRetry(s.call, {
    canRetry: () => allowed,
    wait: async () => {
      allowed = false;
    },
  });
  assert.equal(r.ok, false);
  assert.equal(s.calls, 1);
});

test('retry: a 4xx is our request — never retried; nor when Anthropic says x-should-retry: false', async () => {
  for (const status of [400, 401, 403, 404, 413, 422]) {
    const s = script(status, 200);
    const r = await upstreamWithRetry(s.call, { canRetry: () => true, wait: s.wait });
    assert.equal(r.ok, false);
    assert.equal(s.calls, 1, `status ${status}`);
  }
  const s = script(reply(529, { 'x-should-retry': 'false' }), 200);
  assert.equal((await upstreamWithRetry(s.call, { canRetry: () => true, wait: s.wait })).ok, false);
  assert.equal(s.calls, 1);
});

test('retry-after: honoured up to the cap, seconds or an HTTP date; 1 s without one', () => {
  assert.equal(retryDelayMs(null), RETRY_DEFAULT_MS);
  assert.equal(retryDelayMs(''), RETRY_DEFAULT_MS);
  assert.equal(retryDelayMs('garbage'), RETRY_DEFAULT_MS);
  assert.equal(retryDelayMs('0'), 0);
  assert.equal(retryDelayMs('1.5'), 1500);
  assert.equal(retryDelayMs('30'), RETRY_AFTER_CAP_MS, 'a long retry-after is capped, not obeyed');
  assert.equal(retryDelayMs('-4'), 0);
  const now = Date.parse('2026-11-17T12:00:00Z');
  assert.equal(retryDelayMs(new Date(now + 2000).toUTCString(), now), 2000);
  assert.equal(retryDelayMs(new Date(now + 60_000).toUTCString(), now), RETRY_AFTER_CAP_MS);
  assert.equal(RETRY_AFTER_CAP_MS, 3000);
  assert.equal(RETRY_DEFAULT_MS, 1000);
});

test('isRetryableStatus: 429, 529 and 5xx only', () => {
  for (const s of [429, 500, 502, 503, 504, 529]) assert.equal(isRetryableStatus(s), true, String(s));
  for (const s of [200, 400, 401, 403, 404, 413, 422, null, undefined]) assert.equal(isRetryableStatus(s), false, String(s));
});

test('waitUnlessAborted: the backoff ends the moment the turn is aborted', async () => {
  const ctl = new AbortController();
  const t0 = Date.now();
  const p = waitUnlessAborted(10_000, ctl.signal);
  setTimeout(() => ctl.abort(), 20);
  await p;
  assert.ok(Date.now() - t0 < 1000);
  const t1 = Date.now();
  await waitUnlessAborted(10_000, ctl.signal);
  assert.ok(Date.now() - t1 < 50, 'an already-aborted turn does not wait at all');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE MONEY (P-D2): refunded on every failure that is ours — never on the athlete's own cancel
// ─────────────────────────────────────────────────────────────────────────────

test('settlement: every server-side failure is refunded, with its outcome', () => {
  const s = (o) => askSettlement({ failure: null, stop: 'end_turn', delivered: true, ...o });
  assert.deepEqual(s({}), { outcome: 'ok', refund: false });
  assert.deepEqual(s({ failure: 'upstream_error' }), { outcome: 'upstream_error', refund: true });
  assert.deepEqual(s({ failure: 'upstream_dropped' }), { outcome: 'upstream_error', refund: true }, 'a failure mid-stream too');
  assert.deepEqual(s({ failure: 'upstream_unreachable' }), { outcome: 'upstream_unreachable', refund: true });
  assert.deepEqual(s({ failure: 'timeout' }), { outcome: 'timeout', refund: true });
  assert.deepEqual(s({ stop: 'refusal' }), { outcome: 'refusal', refund: true });
  // A cut-off whose words were shown is CHARGED (they stand; refunding would make a long ask free). Before any
  // word or action reached the app, it is refunded (integrator decision, Sprint 1).
  for (const stop of ASK_CUT_STOPS) {
    assert.deepEqual(s({ stop }), { outcome: 'truncated', refund: false }, `${stop} with words shown`);
    assert.deepEqual(s({ stop, delivered: false }), { outcome: 'truncated', refund: true }, `${stop} with nothing shown`);
  }
  assert.deepEqual(s({ delivered: false }), { outcome: 'bad_output', refund: true }, 'a clean ending with nothing in it');
  assert.deepEqual(s({ stop: null }), { outcome: 'ok', refund: false }, 'an older stream with no stop reason, delivered');
});

test('settlement: ⛔ the athlete’s own cancel is never refunded — whatever else went wrong', () => {
  for (const failure of [null, 'upstream_error', 'timeout', 'upstream_unreachable']) {
    for (const delivered of [true, false]) {
      assert.deepEqual(askSettlement({ failure, stop: 'refusal', delivered, cancelled: true }), { outcome: 'cancelled', refund: false });
    }
  }
});

test('failure line: fixed codes only — our timeout is upstream_error + upstream, refunded and the balance when settled', () => {
  assert.deepEqual(askFailureEvent('timeout', { refunded: true, remaining: 42 }), { error: 'upstream_error', upstream: 'timeout', refunded: true, remaining: 42 });
  assert.deepEqual(askFailureEvent('upstream_error', { refunded: false, remaining: null }), { error: 'upstream_error' });
  assert.deepEqual(askFailureEvent('upstream_unreachable', { refunded: true, remaining: 0 }), { error: 'upstream_unreachable', refunded: true, remaining: 0 });
  assert.deepEqual(askFailureEvent('upstream_dropped', { refunded: true, remaining: null }), { error: 'upstream_dropped', refunded: true });
  // ⛔ P-D8: nothing else is ever on it — no detail, no status line, no message.
  for (const f of ['timeout', 'upstream_error', 'upstream_unreachable', 'upstream_dropped']) {
    const keys = Object.keys(askFailureEvent(f, { refunded: true, remaining: 1 }));
    assert.ok(keys.every((k) => ['error', 'upstream', 'refunded', 'remaining'].includes(k)), keys.join());
  }
});

test('reserve: each refusal is the route a shipped app already reads; the credit is held only with an id', () => {
  const ok = { allowed: true, reason: 'ok', reservation_id: 'r-1', credits_spent: 1, remaining: 9, allowance: 150, age_years: 30, minor: false };
  assert.equal(reserveRefusal(ok), null);
  assert.deepEqual(reserveRefusal({ ...ok, reservation_id: null }), { status: 503, body: { route: 'error', reason: 'meter_unavailable' } }, 'allowed with nothing to settle is a broken meter');
  assert.deepEqual(reserveRefusal(null), { status: 503, body: { route: 'error', reason: 'meter_unavailable' } });
  // 0203 refused a non-AI account with 0 / 0 — the app reads allowance 0 as "Premium AI is not on".
  assert.deepEqual(reserveRefusal({ allowed: false, reason: 'not_entitled', remaining: 0, allowance: 0 }), { status: 200, body: { route: 'out_of_credits', remaining: 0, allowance: 0 } });
  assert.deepEqual(reserveRefusal({ allowed: false, reason: 'out_of_credits', remaining: 2, allowance: 150 }), { status: 200, body: { route: 'out_of_credits', remaining: 2, allowance: 150 } });
  assert.deepEqual(reserveRefusal({ allowed: false, reason: 'no_consent' }), { status: 403, body: { route: 'error', reason: 'no_consent' } });
  // ⛔ The reservation id is never in what the app is told.
  for (const row of [{ ...ok, allowed: false, reason: 'out_of_credits' }, { ...ok, allowed: false, reason: 'no_consent' }]) {
    assert.ok(!JSON.stringify(reserveRefusal(row)).includes('r-1'));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// THE MODEL (C-D8)
// ─────────────────────────────────────────────────────────────────────────────

test('model: ⛔ a tapped web search is always Sonnet, even when Haiku was asked for', () => {
  const ALLOWED = ['claude-sonnet-5', 'claude-haiku-4-5'];
  assert.equal(askModel('claude-haiku-4-5', true, ALLOWED, 'claude-sonnet-5'), 'claude-sonnet-5');
  assert.equal(askModel(undefined, true, ALLOWED, 'claude-sonnet-5'), 'claude-sonnet-5');
  // Without the search, the routing benchmark may still ask for Haiku; anything unlisted runs the default.
  assert.equal(askModel('claude-haiku-4-5', false, ALLOWED, 'claude-sonnet-5'), 'claude-haiku-4-5');
  assert.equal(askModel('claude-opus-5-5', false, ALLOWED, 'claude-sonnet-5'), 'claude-sonnet-5');
  assert.equal(askModel({ model: 'x' }, false, ALLOWED, 'claude-sonnet-5'), 'claude-sonnet-5');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE CLOCK (contract §3): the function always answers before the app gives up
// ─────────────────────────────────────────────────────────────────────────────

test('timeouts: every server clock sits ≥ 10 s inside the app clock it races', () => {
  const INSIDE = 10_000;
  assert.ok(ASK_SERVER_TURN_MS + INSIDE <= ASK_TOTAL_MS, `turn ${ASK_SERVER_TURN_MS} vs app wall ${ASK_TOTAL_MS}`);
  assert.ok(ASK_SERVER_WEB_TURN_MS + INSIDE <= ASK_WEB_TOTAL_MS, `web turn ${ASK_SERVER_WEB_TURN_MS} vs app wall ${ASK_WEB_TOTAL_MS}`);
  assert.ok(ASK_SERVER_IDLE_MS + INSIDE <= ASK_IDLE_MS, `upstream silence ${ASK_SERVER_IDLE_MS} vs app idle ${ASK_IDLE_MS}`);
  assert.ok(SUMMARY_UPSTREAM_MS + INSIDE <= SUMMARY_TIMEOUT_MS, 'the summary too');
  // The keep-alive: the first byte goes out at once (coach-ask-turn.test.mjs), then the worst quiet gap is ~1.5×
  // the interval (it skips a tick right after other bytes) — inside the app's idle clock with 10 s to spare, and
  // inside even OTA #24's 20 s first-byte wait.
  assert.ok(ASK_KEEPALIVE_MS * 1.5 + INSIDE <= ASK_IDLE_MS, `keep-alive ${ASK_KEEPALIVE_MS}`);
  assert.ok(ASK_KEEPALIVE_MS * 1.5 < ASK_FIRST_BYTE_MS && ASK_KEEPALIVE_MS * 1.5 < ASK_WEB_FIRST_BYTE_MS);
  assert.equal(askTurnMs(false), ASK_SERVER_TURN_MS);
  assert.equal(askTurnMs(true), ASK_SERVER_WEB_TURN_MS);
});

// ─────────────────────────────────────────────────────────────────────────────
// STATUS LINES (C-G5): one fixed phrase per read tool, never the model's words
// ─────────────────────────────────────────────────────────────────────────────

test('status: every read tool has a line, no action has one, and web search has its own', () => {
  for (const t of ASK_TOOLS) assert.ok(askStatusFor(t.name), `${t.name} has no status line — add one to ASK_STATUS_PHRASES`);
  for (const a of ASK_ACTION_NAMES) assert.equal(askStatusFor(a), null, `${a} is a card, not a wait`);
  assert.equal(askStatusFor('web_search'), 'Searching online…');
  // Nothing in the table is not a tool we run.
  // get_foods: lane B's food lookup (ask-food-tools.ts), offered only with caps `actions_v1` (Sprint 4a).
  const known = new Set([...ASK_TOOLS.map((t) => t.name), 'web_search', 'get_foods']);
  for (const k of Object.keys(ASK_STATUS_PHRASES)) assert.ok(known.has(k), `${k} is not a tool`);
});

test('status: fixed phrases — no placeholders, short, plain, and a name is only ever looked up', () => {
  for (const [k, p] of Object.entries(ASK_STATUS_PHRASES)) {
    assert.ok(!/[${}<>`]/.test(p), `${k}: a phrase must not be a template`);
    assert.ok(p.length <= 40, `${k}: one short line`);
    assert.ok(p.endsWith('…'), `${k}: a wait, still going`);
    assert.ok(isAskStatus(p));
  }
  // ⛔ The model's input can never become a phrase: only exact names map, and prototype keys are not names.
  for (const junk of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'get_lift_history ', 'Checking your bench log…', null, 7, {}]) {
    assert.equal(askStatusFor(junk), null, String(junk));
  }
  assert.equal(isAskStatus('Checking your bench log…'), false);
});
