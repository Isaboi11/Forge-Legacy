import './harness/hooks.mjs';
import { registerHooks } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * `askHolt` against a FAKE coach-ask stream (AI audit 2026-11-16, C-D2 · C-D4). The request and the stream are
 * faked through `expo/fetch`; the clock, the reader and the endings are the real ones. Nothing here reaches a
 * deployed function or a model.
 */

/* `expo/fetch` → whatever the test installed as `globalThis.__askFetch`. `@/lib/ai-telemetry` → a recorder, so each
   test can read exactly what the ask reported (Sprint 1, PL-4) — and so the shared stubs need no `breadcrumb`. */
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'expo/fetch') {
      return { url: 'data:text/javascript,export const fetch = (...a) => globalThis.__askFetch(...a);', shortCircuit: true };
    }
    if (specifier === '@/lib/ai-telemetry') {
      return {
        url:
          'data:text/javascript,export const elapsedMs = (s) => Math.max(0, Date.now() - s); ' +
          'export const reportAiFailure = (f) => void (globalThis.__aiReports ??= []).push(f);',
        shortCircuit: true,
      };
    }
    return next(specifier, context);
  },
});
const reports = () => globalThis.__aiReports ?? [];

const { supabase, db, ATHLETE } = await import('@/lib/supabase');
const { CONSENT_POLICY_VERSION } = await import('@/domain/consent/consent');
const { refreshConsents } = await import('@/lib/consent');
const { askHolt } = await import('@/data/coach-ask-live');

const enc = new TextEncoder();
const line = (o) => enc.encode(`data: ${JSON.stringify(o)}\n\n`);
const CONTEXT = {};

/**
 * A fake SSE response. `chunks` are sent with `gap` ms between them; `hang` leaves it open afterwards.
 * Records the request's signal, and whether the stream was cancelled (the function's `cancel()` path).
 */
function streamWith(chunks, { gap = 0, hang = false } = {}) {
  const seen = { signal: null, cancelled: false, calls: 0 };
  globalThis.__askFetch = async (_url, init) => {
    seen.calls += 1;
    seen.signal = init.signal;
    let i = 0;
    const body = new ReadableStream({
      async pull(c) {
        if (i < chunks.length) {
          if (gap) await new Promise((r) => setTimeout(r, gap));
          c.enqueue(chunks[i++]);
          return;
        }
        if (hang) return new Promise(() => {});
        c.close();
      },
      cancel() {
        seen.cancelled = true;
      },
    });
    return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
  };
  return seen;
}

/* A short clock only where a test WANTS it to run out; everywhere else a long one, so a busy machine cannot flake it. */
const FAST = { firstByteMs: 60, idleMs: 60 };
const ask = (opts = {}, onText = () => {}) =>
  askHolt('how should I warm up for squats?', [], CONTEXT, onText, { firstByteMs: 5000, idleMs: 5000, ...opts });

test.beforeEach(async () => {
  globalThis.__aiReports = [];
  db.reset();
  db.rows('health_consents').push({ athlete_id: ATHLETE, kind: 'ai_sharing', action: 'granted', policy_version: CONSENT_POLICY_VERSION.ai_sharing, created_at: new Date().toISOString() });
  await refreshConsents();
  supabase.auth.getSession = async () => ({ data: { session: { access_token: 'jwt', user: { id: ATHLETE } } }, error: null });
});

test('a whole answer streams, is complete, and the request carried the clock’s signal', async () => {
  const seen = streamWith([line({ t: 'Two light sets, ' }), line({ t: 'then build up.' }), line({ done: true, usage: {}, remaining: 149, stop: 'end_turn' })]);
  const heard = [];
  const r = await ask({}, (t) => heard.push(t));
  assert.equal(r.kind, 'answer');
  assert.equal(r.text, 'Two light sets, then build up.');
  assert.equal(r.complete, true);
  assert.equal(r.cut, false);
  assert.equal(r.remaining, 149);
  assert.deepEqual(heard, ['Two light sets, ', 'Two light sets, then build up.']);
  assert.ok(seen.signal instanceof AbortSignal, 'fetch got a signal');
  assert.equal(seen.signal.aborted, false);
});

test('⚠ the request never answers: the first-byte clock ends it as an outage that says it timed out', async () => {
  let signal = null;
  globalThis.__askFetch = (_u, init) => {
    signal = init.signal;
    return new Promise(() => {});
  };
  const t0 = Date.now();
  const r = await ask(FAST);
  assert.ok(Date.now() - t0 < 1000, 'it did not wait on the stalled request');
  assert.deepEqual(r, { kind: 'offline', detail: 'timeout', timedOut: true, aborted: false });
  assert.equal(signal.aborted, true, 'and the request itself was aborted');
});

test('⚠ the stream opens and goes silent: nothing said yet is a timed-out outage, and the stream is cancelled', async () => {
  const seen = streamWith([], { hang: true });
  const r = await ask(FAST);
  assert.equal(r.kind, 'offline');
  assert.equal(r.timedOut, true);
  assert.equal(seen.signal.aborted, true);
  assert.equal(seen.cancelled, true, 'coach-ask’s cancel() runs, so the model stops writing');
});

test('⚠ words, then silence: the idle clock keeps the words as a cut-off answer', async () => {
  streamWith([line({ t: 'Start with the empty bar and ' })], { hang: true });
  const r = await ask(FAST);
  assert.equal(r.kind, 'answer');
  assert.equal(r.complete, false);
  assert.equal(r.text, 'Start with the empty bar and');
});

test('a slow but steady reply is never cut by the idle clock', async () => {
  streamWith([line({ t: 'a' }), line({ t: 'b' }), line({ t: 'c' }), line({ done: true, usage: {}, remaining: 1, stop: 'end_turn' })], { gap: 20 });
  const r = await askHolt('q?', [], CONTEXT, () => {}, { firstByteMs: 200, idleMs: 200 });
  assert.equal(r.kind, 'answer');
  assert.equal(r.complete, true);
  assert.equal(r.text, 'abc');
});

test('⚠ the sheet closing mid-reply aborts the request and resolves quietly (aborted, not an outage to show)', async () => {
  const seen = streamWith([line({ t: 'Your squat ' })], { hang: true });
  const sheet = new AbortController();
  const pending = askHolt('q?', [], CONTEXT, () => {}, { firstByteMs: 2000, idleMs: 2000, signal: sheet.signal });
  setTimeout(() => sheet.abort(), 30);
  const r = await pending;
  assert.deepEqual(r, { kind: 'offline', detail: 'aborted', timedOut: false, aborted: true });
  assert.equal(seen.signal.aborted, true);
  assert.equal(seen.cancelled, true);
});

test('⚠ a refusal is "refused" — with or without words before it — never the outage', async () => {
  streamWith([line({ done: true, usage: {}, remaining: 148, stop: 'refusal' })]);
  assert.deepEqual(await ask(), { kind: 'refused' });
  streamWith([line({ t: 'Sure, the dose ' }), line({ done: true, usage: {}, remaining: 148, stop: 'refusal' })]);
  assert.deepEqual(await ask(), { kind: 'refused' });
});

test('a reply that hit the length cap is an answer marked cut', async () => {
  streamWith([line({ t: 'Week one builds the base, week two ' }), line({ done: true, usage: {}, remaining: 147, stop: 'max_tokens' })]);
  const r = await ask();
  assert.equal(r.kind, 'answer');
  assert.equal(r.complete, true);
  assert.equal(r.cut, true);
});

test('the meter’s JSON still answers out_of_credits, with the balance it reported', async () => {
  globalThis.__askFetch = async () => new Response(JSON.stringify({ route: 'out_of_credits', remaining: 0, allowance: 150 }), { headers: { 'content-type': 'application/json' } });
  assert.deepEqual(await ask(), { kind: 'out_of_credits', remaining: 0, allowance: 150 });
  globalThis.__askFetch = async () => new Response(JSON.stringify({ route: 'error', reason: 'meter_unavailable' }), { status: 503, headers: { 'content-type': 'application/json' } });
  assert.deepEqual(await ask(), { kind: 'offline', detail: 'meter_unavailable', timedOut: false, aborted: false });
});

test('a request that fails outright is an outage that never started — not a timeout', async () => {
  globalThis.__askFetch = async () => {
    throw new Error('Network request failed');
  };
  const r = await ask();
  assert.equal(r.kind, 'offline');
  assert.equal(r.timedOut, false);
  assert.match(r.detail, /Network request failed/);
});

test('the code guard and consent still come first — no request for a stopped line', async () => {
  const seen = streamWith([]);
  /* "I TORE MY ACL" is `acute` in medical-routing's own tests — a stop, whatever the clock. */
  const r = await askHolt('I TORE MY ACL', [], CONTEXT, () => {});
  assert.equal(r.kind, 'medical');
  assert.equal(seen.calls, 0);
  assert.deepEqual(reports(), [], 'a medical stop is not a failure');
});

// ── AI Road to 10 Sprint 1 — status lines, the wall, "Not charged", and every failure reported ───────────

const ka = enc.encode(': ka\n\n');

test('C-G5: status lines reach onStatus in order — only the fixed table’s; keep-alives are invisible', async () => {
  streamWith([
    ka,
    line({ status: 'Checking your lift log…' }),
    ka,
    line({ status: 'Sure, your squat is weak because' }),
    line({ status: 'Checking your records…' }),
    line({ t: 'Up 20 lb.' }),
    line({ done: true, usage: {}, remaining: 148, stop: 'end_turn' }),
  ]);
  const statuses = [];
  const heard = [];
  const r = await ask({ onStatus: (s) => statuses.push(s) }, (t) => heard.push(t));
  assert.deepEqual(statuses, ['Checking your lift log…', 'Checking your records…'], 'the model’s words never become a status');
  assert.deepEqual(heard, ['Up 20 lb.']);
  assert.equal(r.kind, 'answer');
  assert.equal(r.complete, true);
  assert.deepEqual(reports(), [], 'a whole answer reports nothing');
});

test('the wall: keep-alives forever no longer hold an ask open — totalMs ends it as a timeout', async () => {
  const seen = streamWith(Array.from({ length: 400 }, () => ka), { gap: 10 });
  const t0 = Date.now();
  const r = await ask({ firstByteMs: 5000, idleMs: 5000, totalMs: 150 });
  assert.ok(Date.now() - t0 < 2000);
  assert.deepEqual(r, { kind: 'offline', detail: 'timeout', timedOut: true, aborted: false });
  assert.equal(seen.signal.aborted, true);
  assert.equal(reports().length, 1);
  assert.equal(reports()[0].kind, 'timeout');
  assert.equal(reports()[0].reason, 'timeout');
});

test('P-D2: a refunded failure says refunded; the function’s own timeout reads as timed out — and both are reported', async () => {
  streamWith([ka, line({ error: 'upstream_error', refunded: true, remaining: 149 })]);
  const r = await ask();
  assert.deepEqual(r, { kind: 'offline', detail: 'upstream_error', timedOut: false, aborted: false, refunded: true });
  const [f] = reports();
  assert.equal(f.fn, 'coach-ask');
  assert.equal(f.kind, 'upstream');
  assert.equal(f.reason, 'upstream_error');
  assert.equal(f.status, 200);
  assert.equal(f.refunded, true);
  assert.ok(Number.isFinite(f.latencyMs) && f.latencyMs >= 0);

  globalThis.__aiReports = [];
  streamWith([line({ error: 'upstream_error', upstream: 'timeout', refunded: true })]);
  const t = await ask();
  assert.deepEqual(t, { kind: 'offline', detail: 'upstream_error', timedOut: true, aborted: false, refunded: true });
  assert.equal(reports()[0].kind, 'timeout');
});

test('P-D2: words then a refunded failure keep the words, marked refunded; a refused or cut reply carries it too', async () => {
  streamWith([line({ t: 'Squat first, ' }), line({ error: 'upstream_dropped', refunded: true })]);
  const partial = await ask();
  assert.equal(partial.kind, 'answer');
  assert.equal(partial.complete, false);
  assert.equal(partial.refunded, true);
  assert.equal(reports()[0].kind, 'upstream');
  assert.equal(reports()[0].reason, 'upstream_dropped');

  globalThis.__aiReports = [];
  streamWith([line({ done: true, usage: {}, remaining: 150, stop: 'refusal', refunded: true })]);
  assert.deepEqual(await ask(), { kind: 'refused', refunded: true });
  assert.deepEqual([reports()[0].kind, reports()[0].reason, reports()[0].refunded], ['unreadable', 'refusal', true]);

  globalThis.__aiReports = [];
  streamWith([line({ t: 'Week one builds ' }), line({ done: true, usage: {}, remaining: 150, stop: 'max_tokens', refunded: true })]);
  const cut = await ask();
  assert.equal(cut.cut, true);
  assert.equal(cut.refunded, true);
  assert.deepEqual([reports()[0].kind, reports()[0].reason], ['unreadable', 'truncated']);
});

test('⛔ P-D8: an older function’s upstream words never reach the result or the report', async () => {
  streamWith([line({ error: 'upstream_error', detail: '400 invalid_request_error: Your credit balance is too low' })]);
  const r = await ask();
  assert.equal(r.detail, 'upstream_error');
  assert.ok(!JSON.stringify(r).includes('credit balance'));
  assert.ok(!JSON.stringify(reports()).includes('credit balance'));
});

test('every other ending is reported once, with our reason — never the platform’s message', async () => {
  globalThis.__askFetch = async () => {
    throw new Error('Network request failed: https://xyz.supabase.co/functions/v1/coach-ask');
  };
  await ask();
  assert.deepEqual([reports()[0].kind, reports()[0].reason, reports()[0].status], ['offline', 'fetch_failed', null]);
  assert.ok(!JSON.stringify(reports()).includes('supabase.co'));

  // The server's consent check (P-G9): an outage card here, reported as the bug it is.
  globalThis.__aiReports = [];
  globalThis.__askFetch = async () => new Response(JSON.stringify({ route: 'error', reason: 'no_consent' }), { status: 403, headers: { 'content-type': 'application/json' } });
  assert.deepEqual(await ask(), { kind: 'offline', detail: 'no_consent', timedOut: false, aborted: false });
  assert.deepEqual([reports()[0].kind, reports()[0].status], ['no_consent', 403]);

  // The meter down, and out of credits (a breadcrumb, not an error — `reportAiFailure` decides).
  globalThis.__aiReports = [];
  globalThis.__askFetch = async () => new Response(JSON.stringify({ route: 'error', reason: 'meter_unavailable' }), { status: 503, headers: { 'content-type': 'application/json' } });
  await ask();
  assert.equal(reports()[0].kind, 'meter');
  globalThis.__aiReports = [];
  globalThis.__askFetch = async () => new Response(JSON.stringify({ route: 'out_of_credits', remaining: 0, allowance: 150 }), { headers: { 'content-type': 'application/json' } });
  await ask();
  assert.equal(reports()[0].kind, 'out_of_credits');

  // The sheet closing: reported as the athlete's own cancel.
  globalThis.__aiReports = [];
  streamWith([line({ t: 'Your ' })], { hang: true });
  const sheet = new AbortController();
  const p = askHolt('q?', [], CONTEXT, () => {}, { firstByteMs: 2000, idleMs: 2000, signal: sheet.signal });
  setTimeout(() => sheet.abort(), 30);
  await p;
  assert.equal(reports().length, 1);
  assert.equal(reports()[0].kind, 'cancelled');
});

test('the athlete’s "Not now" and a medical stop are not failures — nothing reported', async () => {
  const seen = streamWith([]);
  await askHolt('I want to hurt myself', [], CONTEXT, () => {});
  assert.equal(seen.calls, 0);
  assert.deepEqual(reports(), []);
});
