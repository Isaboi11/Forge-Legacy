import './harness/hooks.mjs';
import { registerHooks } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * `summarizeChat` (the end-of-chat summary, coach-ask mode 'summarize') — AI Road to 10 Sprint 1, PL-3 / PL-4.
 * Before Sprint 1 it had no clock and no report: a dead line hung it, and a failure was invisible. Now it has
 * the ask's own clock, an abort, and every failure goes to `reportAiFailure`. Fake fetch only — no function, no model.
 */

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'expo/fetch') {
      return { url: 'data:text/javascript,export const fetch = (...a) => globalThis.__sumFetch(...a);', shortCircuit: true };
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

const { supabase, db, ATHLETE } = await import('@/lib/supabase');
const { CONSENT_POLICY_VERSION } = await import('@/domain/consent/consent');
const { refreshConsents } = await import('@/lib/consent');
const { summarizeChat, SUMMARY_TIMEOUT_MS } = await import('@/data/holt-chats-live');

const TURNS = [
  { role: 'athlete', text: "what's my bench progress" },
  { role: 'holt', text: 'Up 20 lb since March.' },
  { role: 'athlete', text: 'nice, thanks' },
];
const reports = () => globalThis.__aiReports ?? [];
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Install a fake function; records each request's body and signal. */
function replyWith(make) {
  const seen = { calls: 0, signal: null, body: null };
  globalThis.__sumFetch = async (_url, init) => {
    seen.calls += 1;
    seen.signal = init.signal;
    seen.body = JSON.parse(init.body);
    return make(init);
  };
  return seen;
}

test.beforeEach(async () => {
  globalThis.__aiReports = [];
  db.reset();
  db.rows('health_consents').push({ athlete_id: ATHLETE, kind: 'ai_sharing', action: 'granted', policy_version: CONSENT_POLICY_VERSION.ai_sharing, created_at: new Date().toISOString() });
  await refreshConsents();
  supabase.auth.getSession = async () => ({ data: { session: { access_token: 'jwt', user: { id: ATHLETE } } }, error: null });
});

test('a saved summary reports nothing, and the request carried a signal', async () => {
  const seen = replyWith(() => json({ ok: true, saved: true }));
  await summarizeChat(TURNS);
  assert.equal(seen.calls, 1);
  assert.equal(seen.body.mode, 'summarize');
  assert.ok(seen.signal instanceof AbortSignal);
  assert.deepEqual(reports(), []);
  assert.equal(SUMMARY_TIMEOUT_MS, 30_000);
});

test('"nothing to keep", "too short" and "no Premium AI" are not failures', async () => {
  for (const reason of ['nothing_to_keep', 'too_short', 'not_allowed']) {
    replyWith(() => json({ ok: true, saved: false, reason }));
    await summarizeChat(TURNS);
  }
  assert.deepEqual(reports(), []);
});

test('a failed summary is reported: the kind, our reason, refunded — and the function’s timeout reads as timeout', async () => {
  replyWith(() => json({ ok: true, saved: false, reason: 'upstream_error', refunded: true }));
  await summarizeChat(TURNS);
  const [f] = reports();
  assert.deepEqual({ fn: f.fn, kind: f.kind, reason: f.reason, status: f.status, refunded: f.refunded }, {
    fn: 'coach-ask',
    kind: 'upstream',
    reason: 'summary_upstream_error',
    status: 200,
    refunded: true,
  });
  globalThis.__aiReports = [];
  replyWith(() => json({ ok: true, saved: false, reason: 'upstream_error', upstream: 'timeout', refunded: true }));
  await summarizeChat(TURNS);
  assert.equal(reports()[0].kind, 'timeout');
  globalThis.__aiReports = [];
  replyWith(() => json({ route: 'error', reason: 'unconfigured' }, 503));
  await summarizeChat(TURNS);
  assert.deepEqual([reports()[0].kind, reports()[0].status], ['meter', 503]);
});

test('⚠ a dead line no longer hangs it: the clock aborts the request and the failure is reported', async () => {
  const seen = replyWith((init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))));
  const t0 = Date.now();
  await summarizeChat(TURNS, { timeoutMs: 60 });
  assert.ok(Date.now() - t0 < 1000);
  assert.equal(seen.signal.aborted, true);
  assert.deepEqual([reports()[0].kind, reports()[0].reason], ['timeout', 'summary_timeout']);
});

test('the caller’s abort stops it (a breadcrumb, not an error); a network error is "offline"', async () => {
  const seen = replyWith((init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))));
  const ctl = new AbortController();
  const p = summarizeChat(TURNS, { signal: ctl.signal });
  setTimeout(() => ctl.abort(), 20);
  await p;
  assert.equal(seen.signal.aborted, true);
  assert.equal(reports()[0].kind, 'cancelled');

  globalThis.__aiReports = [];
  replyWith(() => {
    throw new Error('Network request failed');
  });
  await summarizeChat(TURNS);
  assert.deepEqual([reports()[0].kind, reports()[0].reason, reports()[0].status], ['offline', 'summary_fetch_failed', null]);
});

test('a greeting is not a chat, and no consent means nothing is sent', async () => {
  const seen = replyWith(() => json({ ok: true, saved: true }));
  await summarizeChat([{ role: 'athlete', text: 'hi' }]);
  db.reset();
  await refreshConsents();
  await summarizeChat(TURNS);
  assert.equal(seen.calls, 0);
  assert.deepEqual(reports(), []);
});
