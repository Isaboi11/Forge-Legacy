// node --experimental-strip-types --test src/domain/admin/__tests__/ai-health-core.test.mjs
//
// /admin → AI health, shaped (0269 `admin_ai_health`), and the alert rules the page explains.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AiHealthUnreadable,
  CANARY_FRESH_HOURS,
  DEFAULT_AI_THRESHOLDS,
  alertDue,
  canaryVerdict,
  coolingDownUntil,
  failureRateLine,
  failureRateTrips,
  fnLabel,
  fnLine,
  helpfulShare,
  msText,
  pctText,
  shapeAiHealth,
  usdText,
} from '../ai-health-core.ts';

const T = DEFAULT_AI_THRESHOLDS;
const NOW = Date.parse('2026-11-17T16:00:00Z');

/** What 0269 returns, in the shape the PGlite run printed. */
const payload = (over = {}) => ({
  days: 7,
  tz: 'America/Los_Angeles',
  since: '2026-11-11T08:00:00+00:00',
  generated_at: '2026-11-17T16:00:00+00:00',
  totals: { calls: 16, failures: 6, cancelled: 0, refunds: 4, credits: 14, cost_usd: 0.008, legacy_calls: 3 },
  last_24h: { calls: 16, failures: 6 },
  by_fn: [
    { grp: 'coach-interpret', fn: 'coach-interpret', action: null, calls: 9, failures: 0, cancelled: 0, refunds: 0, credits: 9, cost_usd: 0, timed: 9, p50_ms: 900, p95_ms: 900 },
    { grp: 'legacy:program', fn: null, action: 'program', calls: 2, failures: 2, cancelled: 0, refunds: 0, credits: 2, cost_usd: 0.002, timed: 0, p50_ms: null, p95_ms: null },
    { grp: 'program-photo-read', fn: 'program-photo-read', action: null, calls: 1, failures: 1, cancelled: 0, refunds: 1, credits: 0, cost_usd: 0.004, timed: 0, p50_ms: null, p95_ms: null },
  ],
  by_fn_day: [
    { d: '2026-11-16', grp: 'legacy:program', fn: null, action: 'program', calls: 1, failures: 1, cancelled: 0, refunds: 0, credits: 1, cost_usd: 0.002, timed: 0, p50_ms: null, p95_ms: null },
    { d: '2026-11-17', grp: 'coach-interpret', fn: 'coach-interpret', action: null, calls: 9, failures: 0, cancelled: 0, refunds: 0, credits: 9, cost_usd: 0, timed: 9, p50_ms: 900, p95_ms: 900 },
    { d: '2026-11-17', grp: 'program-photo-read', fn: 'program-photo-read', action: null, calls: 1, failures: 1, cancelled: 0, refunds: 1, credits: 0, cost_usd: 0.004, timed: 0, p50_ms: null, p95_ms: null },
  ],
  feedback: [{ d: '2026-11-17', feature: 'chat', up: 0, down: 1 }],
  feedback_totals: [{ feature: 'chat', up: 0, down: 1 }],
  canary: {
    configured: true,
    last: { ran_at: '2026-11-17T15:40:00+00:00', ok: false, failed: 1, results: [{ model: 'claude-sonnet-5', kind: 'ok', status: 200, latency_ms: 700 }, { model: 'claude-haiku-4-5', kind: 'overloaded', status: 529, latency_ms: 300 }] },
    last_ok_at: '2026-11-16T15:40:00+00:00',
    recent: [{ ran_at: '2026-11-17T15:40:00+00:00', ok: false, failed: 1 }, { ran_at: '2026-11-16T15:40:00+00:00', ok: true, failed: 0 }],
  },
  unsettled: { count: 1, oldest_at: '2026-11-17T15:15:00+00:00' },
  alerts: {
    tripped: [{ kind: 'canary_failed', line: 'Canary failed: claude-haiku-4-5 overloaded' }, { kind: 'failure_rate', line: '37.5% of 16 AI calls failed in 24 h' }],
    last_sent: { canary_failed: '2026-11-17T15:40:01+00:00', bogus: 'x' },
    admins_with_device: 1,
  },
  thresholds: { fail_rate: 0.05, fail_min_calls: 10, drain_streak: 3, unsettled_minutes: 30, alert_cooldown_hours: 6, canary_min_gap_hours: 20 },
  ...over,
});

test('shapes the payload: rows, legacy grouped by action, days newest first', () => {
  const h = shapeAiHealth(payload());
  assert.equal(h.days, 7);
  assert.equal(h.tz, 'America/Los_Angeles');
  assert.equal(h.byFn.length, 3);
  const legacy = h.byFn.find((r) => r.legacy);
  assert.deepEqual(
    { key: legacy.key, fn: legacy.fn, action: legacy.action, label: legacy.label, p50: legacy.p50Ms },
    { key: 'legacy:program', fn: null, action: 'program', label: 'Legacy · program', p50: null },
    'a legacy row keeps its action and claims no function and no latency',
  );
  const live = h.byFn.find((r) => r.fn === 'coach-interpret');
  assert.equal(live.action, null);
  assert.equal(live.label, 'Typed to Holt');
  assert.deepEqual(h.byDay.map((d) => d.d), ['2026-11-17', '2026-11-16']);
  assert.deepEqual(h.byDay[0].rows.map((r) => r.key), ['coach-interpret', 'program-photo-read'], 'busiest first');
  assert.equal(h.totals.refunds, 4);
  assert.equal(h.totals.legacyCalls, 3);
  assert.equal(h.feedbackTotals[0].label, 'Holt chat');
  assert.equal(h.canary.last.results[1].kind, 'overloaded');
  assert.deepEqual(Object.keys(h.alerts.lastSent), ['canary_failed'], 'an unknown alert key is dropped');
  assert.equal(h.unsettled.count, 1);
  assert.deepEqual(h.thresholds, T);
});

test('⚠ an unreadable answer THROWS — it is never drawn as a page of zeros', () => {
  assert.throws(() => shapeAiHealth(null), AiHealthUnreadable);
  assert.throws(() => shapeAiHealth([]), AiHealthUnreadable);
  assert.throws(() => shapeAiHealth('ok'), AiHealthUnreadable);
  for (const k of ['totals', 'last_24h', 'canary', 'unsettled', 'alerts', 'thresholds']) {
    const p = payload();
    delete p[k];
    assert.throws(() => shapeAiHealth(p), (e) => e instanceof AiHealthUnreadable && e.message.includes(k), `missing ${k}`);
  }
  assert.throws(() => shapeAiHealth(payload({ by_fn: null })), AiHealthUnreadable);
  assert.throws(() => shapeAiHealth(payload({ by_fn_day: 'x' })), AiHealthUnreadable);
});

test('an empty window that DID load is honestly empty', () => {
  const h = shapeAiHealth(payload({ by_fn: [], by_fn_day: [], feedback: [], feedback_totals: [], totals: { calls: 0, failures: 0, cancelled: 0, refunds: 0, credits: 0, cost_usd: 0, legacy_calls: 0 } }));
  assert.equal(h.byFn.length, 0);
  assert.equal(h.byDay.length, 0);
  assert.equal(h.totals.calls, 0);
});

test('numbers from Postgres numeric arrive as strings and are read as numbers; a missing latency stays null', () => {
  const h = shapeAiHealth(payload({ by_fn: [{ grp: 'coach-ask', fn: 'coach-ask', calls: '4', failures: '1', refunds: 0, credits: '4', cost_usd: '0.0123', timed: 0, p50_ms: null, p95_ms: 'x' }] }));
  assert.equal(h.byFn[0].calls, 4);
  assert.equal(h.byFn[0].costUsd, 0.0123);
  assert.equal(h.byFn[0].p95Ms, null);
});

test('the 24 h failure rule: > 5% AND at least 10 calls — 1 failure in 2 never pages', () => {
  assert.equal(failureRateTrips(2, 1, T), false, '1 in 2: too few calls');
  assert.equal(failureRateTrips(9, 9, T), false, 'even all 9 failing: too few calls');
  assert.equal(failureRateTrips(10, 1, T), true, '1 in 10 is 10%');
  assert.equal(failureRateTrips(100, 5, T), false, 'exactly 5% does not page');
  assert.equal(failureRateTrips(100, 6, T), true, '6% pages');
  assert.equal(failureRateTrips(0, 0, T), false);
  assert.equal(failureRateLine(0, 0, T), 'No AI calls in the last 24 h.');
  assert.equal(failureRateLine(4, 1, T), '1 of 4 failed (25%) — too few calls to page (needs 10).');
  assert.equal(failureRateLine(40, 1, T), '1 of 40 failed (2.5%) — pages above 5%.');
  assert.equal(failureRateLine(16, 6, T), '6 of 16 failed (37.5%) — above 5%, so it pages.');
});

test('the cooldown: each alert kind pages at most once per 6 h', () => {
  const sent = '2026-11-17T13:00:00Z';
  assert.equal(alertDue(undefined, NOW, 6), true, 'never sent');
  assert.equal(alertDue('garbage', NOW, 6), true);
  assert.equal(alertDue(sent, NOW, 6), false, '3 h ago');
  assert.equal(alertDue('2026-11-17T09:59:00Z', NOW, 6), true, 'over 6 h ago');
  assert.equal(coolingDownUntil(sent, NOW, 6), Date.parse('2026-11-17T19:00:00Z'));
  assert.equal(coolingDownUntil(undefined, NOW, 6), null);
});

test('the canary in one sentence: off, never, ok, failed, stale', () => {
  const base = shapeAiHealth(payload()).canary;
  assert.deepEqual(canaryVerdict({ ...base, configured: false, last: null }, NOW), { state: 'off' });
  assert.deepEqual(canaryVerdict({ ...base, configured: true, last: null }, NOW), { state: 'never' });
  const failed = canaryVerdict(base, NOW);
  assert.equal(failed.state, 'failed');
  assert.deepEqual(failed.failing.map((p) => p.model), ['claude-haiku-4-5']);
  assert.equal(canaryVerdict({ ...base, last: { ...base.last, ok: true, failed: 0 } }, NOW).state, 'ok');
  const stale = canaryVerdict({ ...base, last: { ...base.last, ranAt: '2026-11-15T15:40:00Z' } }, NOW);
  assert.equal(stale.state, 'stale');
  assert.equal(stale.hours, 48);
  assert.equal(CANARY_FRESH_HOURS, 26, 'the same 26 h the SQL alert uses');
});

test('numbers as printed', () => {
  assert.equal(pctText(1, 3), '33.3%');
  assert.equal(pctText(0, 0), '—');
  assert.equal(msText(null), '—');
  assert.equal(msText(850), '850 ms');
  assert.equal(msText(1234), '1.2 s');
  assert.equal(msText(45_000), '45 s');
  assert.equal(usdText(0), '$0');
  assert.equal(usdText(0.00012), '$0.0001');
  assert.equal(usdText(1.234), '$1.23');
  assert.equal(helpfulShare(0, 0), null);
  assert.equal(helpfulShare(3, 1), 75);
  assert.equal(fnLabel(null, 'message'), 'Legacy · message');
  assert.equal(fnLabel('something-new', null), 'something-new');
  const h = shapeAiHealth(payload());
  assert.equal(fnLine(h.byFn.find((r) => r.fn === 'program-photo-read')), '1 failed (100%) · 1 refunded · no latency recorded · 0 credits · $0.0040');
  assert.equal(fnLine(h.byFn.find((r) => r.fn === 'coach-interpret')), '0 failed (0%) · p50 900 ms · p95 900 ms · 9 credits · $0');
});
