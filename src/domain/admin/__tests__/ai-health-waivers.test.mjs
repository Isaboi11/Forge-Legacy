// node --experimental-strip-types --test src/domain/admin/__tests__/ai-health-waivers.test.mjs
//
// /admin → AI health counts what rode free (0272 `admin_ai_health`, Monetization Amendment 012): the soft floor's
// free daily uses, typed builds not charged twice, photo tidy passes at no charge — and still draws from a read
// that predates 0272 (no field → unknown, never zero).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { fnLine, shapeAiHealth } from '../ai-health-core.ts';

const row = (over = {}) => ({
  grp: 'coach-ask', fn: 'coach-ask', action: null, calls: 20, failures: 0, cancelled: 0, refunds: 1, credits: 14,
  cost_usd: 0.04, timed: 20, p50_ms: 900, p95_ms: 1800, ...over,
});

/** 0269's shape — what a server without 0272 answers. */
const read0269 = (over = {}) => ({
  days: 7,
  tz: 'UTC',
  since: '2026-11-11T00:00:00+00:00',
  generated_at: '2026-11-17T16:00:00+00:00',
  totals: { calls: 20, failures: 0, cancelled: 0, refunds: 1, credits: 14, cost_usd: 0.04, legacy_calls: 0 },
  last_24h: { calls: 20, failures: 0 },
  by_fn: [row()],
  by_fn_day: [{ d: '2026-11-17', ...row() }],
  feedback: [],
  feedback_totals: [],
  canary: { configured: false, last: null, last_ok_at: null, recent: [] },
  unsettled: { count: 0, oldest_at: null },
  alerts: { tripped: [], last_sent: {}, admins_with_device: 1 },
  thresholds: { fail_rate: 0.05, fail_min_calls: 10, drain_streak: 3, unsettled_minutes: 30, alert_cooldown_hours: 6, canary_min_gap_hours: 20 },
  ...over,
});

/** 0272's shape: the same, plus totals.waivers and three counts on every per-function row. */
const read0272 = () => {
  const waivedRow = (o) => row({ floor_uses: 5, typed_build: 0, photo_tidy: 0, ...o });
  return read0269({
    totals: { calls: 20, failures: 0, cancelled: 0, refunds: 1, credits: 14, cost_usd: 0.04, legacy_calls: 0, waivers: { floor: '12', typed_build: 1, photo_tidy: 3 } },
    by_fn: [
      waivedRow({ floor_uses: 12 }),
      row({ grp: 'coach-author', fn: 'coach-author', calls: 2, credits: 1, floor_uses: 0, typed_build: 1, photo_tidy: 0 }),
      row({ grp: 'workout-tidy', fn: 'workout-tidy', calls: 4, credits: 1, floor_uses: 0, typed_build: 0, photo_tidy: 3 }),
    ],
    by_fn_day: [{ d: '2026-11-17', ...waivedRow({}) }],
  });
};

test('a 0272 read: what rode free, overall and per function, numbers from numeric strings', () => {
  const h = shapeAiHealth(read0272());
  assert.deepEqual(h.waived, { floor: 12, typedBuild: 1, photoTidy: 3 });
  const by = Object.fromEntries(h.byFn.map((r) => [r.fn, r.waived]));
  assert.deepEqual(by['coach-ask'], { floor: 12, typedBuild: 0, photoTidy: 0 });
  assert.deepEqual(by['coach-author'], { floor: 0, typedBuild: 1, photoTidy: 0 });
  assert.deepEqual(by['workout-tidy'], { floor: 0, typedBuild: 0, photoTidy: 3 });
  assert.deepEqual(h.byDay[0].rows[0].waived, { floor: 5, typedBuild: 0, photoTidy: 0 });
});

test('the line per function says it in words — and leaves out a count that is 0', () => {
  const h = shapeAiHealth(read0272());
  const line = (fn) => fnLine(h.byFn.find((r) => r.fn === fn));
  assert.equal(line('coach-ask'), '0 failed (0%) · 1 refunded · p50 900 ms · p95 1.8 s · 14 credits · 12 free daily uses · $0.04');
  assert.match(line('coach-author'), / · 1 credit · 1 typed build not charged twice · /);
  assert.match(line('workout-tidy'), / · 1 credit · 3 photo tidies free · /);
  assert.doesNotMatch(line('coach-author'), /free daily|photo tid/);
});

test('⚠ a read from before 0272 still draws — the waived counts are unknown (null), never zeros', () => {
  const h = shapeAiHealth(read0269());
  assert.equal(h.waived, null);
  assert.equal(h.byFn[0].waived, null);
  assert.equal(h.byDay[0].rows[0].waived, null);
  assert.equal(fnLine(h.byFn[0]), '0 failed (0%) · 1 refunded · p50 900 ms · p95 1.8 s · 14 credits · $0.04', 'the old line, unchanged');
  // A malformed waivers block is not a page of zeros either.
  assert.equal(shapeAiHealth(read0269({ totals: { ...read0269().totals, waivers: 'x' } })).waived, null);
});

test('the page shows them in plain words, only when the server sent them', () => {
  // Web / trunk: AI health is the Business CRM page (`AiHealthPage`); the three counts are figures beside
  // "Credits charged", spread in only when `h.waived` is not null (build 11: three StatLines on /admin-ai).
  const page = readFileSync(new URL('../../../components/forge/admin/pages/AiHealthPage.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(page, /\.\.\.\(h\.waived\n\s+\? \[\n\s+\{ label: 'Free daily uses \(after the month ran out\)', value: h\.waived\.floor\.toLocaleString\('en-US'\) \},\n\s+\{ label: 'Typed builds not charged twice', value: h\.waived\.typedBuild\.toLocaleString\('en-US'\) \},\n\s+\{ label: 'Photo tidy passes at no charge', value: h\.waived\.photoTidy\.toLocaleString\('en-US'\) \},\n\s+\]\n\s+: \[\]\),/);
});
