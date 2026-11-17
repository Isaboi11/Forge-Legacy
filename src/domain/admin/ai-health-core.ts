/**
 * ══ /admin → AI HEALTH, SHAPED (AI Road to 10, Sprint 1 — PL-4; migration 0269 `admin_ai_health`) ══
 *
 * The page answers "is the AI working, and what does it cost?" per function, per day: calls, failures, refunds,
 * p50/p95 latency, credits charged and real cost — plus the daily canary, unsettled reservations, the thumbs, and
 * which of the four alerts would page right now.
 *
 * Pure and dependency-free so `node --test` holds it. Two jobs:
 *
 *   1. `shapeAiHealth` turns the jsonb into what the screen draws. ⚠ A payload it cannot read THROWS — the page
 *      then says the load failed. It never fills a missing block with zeros: a dashboard that draws "0 failures"
 *      for "I could not read the failures" is the exact blindness Sprint 1 exists to end (audit G1).
 *   2. The alert rules, as numbers (`failureRateTrips`, `alertDue`, `canaryVerdict`). The SERVER decides what
 *      pages (`ai_health_alert_state` / `_tick` in 0269); these mirror it so the page can explain each line
 *      ("1 of 4 failed — too few calls to page"), and a test holds the two to the same thresholds.
 */

import type { AiFeedbackFeature } from '../ai/ai-feedback-core.ts';
import { AI_FEEDBACK_FEATURE_LABEL } from '../ai/ai-feedback-core.ts';

// ── Thresholds — ⚠ the defaults are 0269's `ai_ops_config` column defaults (a test compares them) ─────────

export interface AiThresholds {
  /** Page when MORE than this share of the last 24 h's calls failed… */
  failRate: number;
  /** …and only once there are at least this many calls, so 1 failure in 2 calls never pages. */
  failMinCalls: number;
  /** The newest N app calls all failing at Anthropic reads as a drained key. */
  drainStreak: number;
  /** A reservation older than this with no settle is "unsettled". */
  unsettledMinutes: number;
  /** Each alert kind pages at most once per this many hours. */
  alertCooldownHours: number;
  /** The canary refuses a second run within this many hours. */
  canaryMinGapHours: number;
}

export const DEFAULT_AI_THRESHOLDS: AiThresholds = {
  failRate: 0.05,
  failMinCalls: 10,
  drainStreak: 3,
  unsettledMinutes: 30,
  alertCooldownHours: 6,
  canaryMinGapHours: 20,
};

/** A canary older than this is not "the latest": the daily run missed (same 26 h as `ai_health_alert_state`). */
export const CANARY_FRESH_HOURS = 26;

export type AiAlertKind = 'canary_failed' | 'key_drained' | 'failure_rate' | 'unsettled';
export const AI_ALERT_KINDS: readonly AiAlertKind[] = ['canary_failed', 'key_drained', 'failure_rate', 'unsettled'];
export const AI_ALERT_LABEL: Readonly<Record<AiAlertKind, string>> = {
  canary_failed: 'Canary failed',
  key_drained: 'Key looks drained',
  failure_rate: 'Too many failures (24 h)',
  unsettled: 'Unsettled reservations',
};

/** The 24 h failure rule — exactly `v_calls >= fail_min_calls and v_fail / v_calls > fail_rate` in 0269. */
export function failureRateTrips(calls: number, failures: number, t: AiThresholds): boolean {
  return calls >= t.failMinCalls && calls > 0 && failures / calls > t.failRate;
}

/** The line under "Failure rate, last 24 h" — what the number is, and why it does or does not page. */
export function failureRateLine(calls: number, failures: number, t: AiThresholds): string {
  const limit = `${trimPct(t.failRate * 100)}%`;
  if (calls <= 0) return 'No AI calls in the last 24 h.';
  const pct = `${trimPct((100 * failures) / calls)}%`;
  if (calls < t.failMinCalls) {
    return `${failures} of ${calls} failed (${pct}) — too few calls to page (needs ${t.failMinCalls}).`;
  }
  return failureRateTrips(calls, failures, t)
    ? `${failures} of ${calls} failed (${pct}) — above ${limit}, so it pages.`
    : `${failures} of ${calls} failed (${pct}) — pages above ${limit}.`;
}

/** Whether an alert kind may page again: never sent, or sent at least `hours` ago (the tick's cooldown). */
export function alertDue(lastSentIso: string | null | undefined, nowMs: number, hours: number): boolean {
  if (!lastSentIso) return true;
  const at = Date.parse(lastSentIso);
  if (!Number.isFinite(at)) return true;
  return at < nowMs - hours * 3_600_000;
}

/** When a kind that just paged may page again, or null when it is not cooling down. */
export function coolingDownUntil(lastSentIso: string | null | undefined, nowMs: number, hours: number): number | null {
  if (alertDue(lastSentIso, nowMs, hours)) return null;
  return Date.parse(String(lastSentIso)) + hours * 3_600_000;
}

// ── The payload ──────────────────────────────────────────────────────────────────────────────────────────

export interface AiFnRow {
  /** `coach-ask` · `legacy:message` — unique within a day. */
  key: string;
  /** The deployed slug; null on a legacy row (written before 0268, or by an old deployed function). */
  fn: string | null;
  /** Set only on a legacy row — the action it was metered as. Never guessed into a function. */
  action: string | null;
  legacy: boolean;
  label: string;
  calls: number;
  failures: number;
  cancelled: number;
  refunds: number;
  credits: number;
  costUsd: number;
  /** How many calls carried a latency — legacy rows carry none, so p50/p95 can be null. */
  timed: number;
  p50Ms: number | null;
  p95Ms: number | null;
}

export interface AiCanaryProbe {
  model: string;
  kind: string;
  status: number | null;
  latencyMs: number | null;
}

export interface AiCanary {
  /** `ai_ops_config.canary_url` is set — the PO switched it on. */
  configured: boolean;
  last: { ranAt: string; ok: boolean; failed: number; results: AiCanaryProbe[] } | null;
  lastOkAt: string | null;
  recent: { ranAt: string; ok: boolean; failed: number }[];
}

export interface AiFeedbackCount {
  feature: string;
  label: string;
  up: number;
  down: number;
}

export interface AiHealth {
  days: number;
  tz: string;
  since: string;
  generatedAt: string;
  totals: { calls: number; failures: number; cancelled: number; refunds: number; credits: number; costUsd: number; legacyCalls: number };
  last24h: { calls: number; failures: number };
  byFn: AiFnRow[];
  byDay: { d: string; rows: AiFnRow[] }[];
  feedback: (AiFeedbackCount & { d: string })[];
  feedbackTotals: AiFeedbackCount[];
  canary: AiCanary;
  unsettled: { count: number; oldestAt: string | null };
  alerts: {
    tripped: { kind: AiAlertKind | string; line: string }[];
    lastSent: Partial<Record<AiAlertKind, string>>;
    adminsWithDevice: number;
  };
  thresholds: AiThresholds;
}

/** Plain names for the slugs (`AiFunction` in domain/ai/ai-failure.ts, plus the admin tools). */
const FN_LABEL: Readonly<Record<string, string>> = {
  'coach-ask': 'Holt chat',
  'coach-interpret': 'Typed to Holt',
  'coach-author': 'Holt writes a program',
  'coach-kitchen': 'Kitchen',
  'coach-form-check': 'Form check',
  'meal-photo-read': 'Meal photo',
  'recipe-photo-read': 'Recipe photo',
  'recipe-link-read': 'Recipe link',
  'program-photo-read': 'Program photo',
  'workout-card-read': 'Workout card',
  'workout-tidy': 'Workout tidy',
  'bug-plain': 'Bug summaries (admin)',
  'social-plan': 'Social planner (admin)',
  other: 'Other',
};

export function fnLabel(fn: string | null, action: string | null): string {
  if (fn == null) return `Legacy · ${action ?? 'unknown'}`;
  return FN_LABEL[fn] ?? fn;
}

export function feedbackLabel(feature: string): string {
  return AI_FEEDBACK_FEATURE_LABEL[feature as AiFeedbackFeature] ?? feature;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v != null && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Thrown when the answer is not the shape 0269 returns. The page shows it as a failed load. */
export class AiHealthUnreadable extends Error {
  constructor(what: string) {
    super(`The AI health answer could not be read (${what}).`);
    this.name = 'AiHealthUnreadable';
  }
}

function block(raw: Obj, key: string): Obj {
  const v = raw[key];
  if (!isObj(v)) throw new AiHealthUnreadable(`no ${key}`);
  return v;
}

function fnRow(r: unknown): AiFnRow | null {
  if (!isObj(r)) return null;
  const fn = str(r.fn);
  const action = str(r.action);
  const key = str(r.grp) ?? (fn ?? `legacy:${action ?? 'unknown'}`);
  return {
    key,
    fn,
    action: fn == null ? action : null,
    legacy: fn == null,
    label: fnLabel(fn, action),
    calls: num(r.calls),
    failures: num(r.failures),
    cancelled: num(r.cancelled),
    refunds: num(r.refunds),
    credits: num(r.credits),
    costUsd: num(r.cost_usd),
    timed: num(r.timed),
    p50Ms: numOrNull(r.p50_ms),
    p95Ms: numOrNull(r.p95_ms),
  };
}

function feedbackRow(r: unknown): AiFeedbackCount | null {
  if (!isObj(r) || !str(r.feature)) return null;
  const feature = String(r.feature);
  return { feature, label: feedbackLabel(feature), up: num(r.up), down: num(r.down) };
}

export function shapeAiHealth(raw: unknown): AiHealth {
  if (!isObj(raw)) throw new AiHealthUnreadable('not an object');
  const totals = block(raw, 'totals');
  const last24h = block(raw, 'last_24h');
  const canary = block(raw, 'canary');
  const unsettled = block(raw, 'unsettled');
  const alerts = block(raw, 'alerts');
  const th = block(raw, 'thresholds');
  if (!Array.isArray(raw.by_fn) || !Array.isArray(raw.by_fn_day)) throw new AiHealthUnreadable('no per-function rows');

  const byFn = raw.by_fn.map(fnRow).filter((r): r is AiFnRow => r != null);

  const days = new Map<string, AiFnRow[]>();
  for (const r of raw.by_fn_day) {
    if (!isObj(r)) continue;
    const d = str(r.d);
    const row = fnRow(r);
    if (!d || !row) continue;
    const list = days.get(d) ?? [];
    list.push(row);
    days.set(d, list);
  }
  const byDay = [...days.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([d, rows]) => ({ d, rows: rows.sort((x, y) => y.calls - x.calls || x.key.localeCompare(y.key)) }));

  const last = isObj(canary.last) ? canary.last : null;
  const lastSentRaw = isObj(alerts.last_sent) ? alerts.last_sent : {};
  const lastSent: Partial<Record<AiAlertKind, string>> = {};
  for (const k of AI_ALERT_KINDS) {
    const v = str(lastSentRaw[k]);
    if (v) lastSent[k] = v;
  }

  const thresholds: AiThresholds = {
    failRate: numOrNull(th.fail_rate) ?? DEFAULT_AI_THRESHOLDS.failRate,
    failMinCalls: numOrNull(th.fail_min_calls) ?? DEFAULT_AI_THRESHOLDS.failMinCalls,
    drainStreak: numOrNull(th.drain_streak) ?? DEFAULT_AI_THRESHOLDS.drainStreak,
    unsettledMinutes: numOrNull(th.unsettled_minutes) ?? DEFAULT_AI_THRESHOLDS.unsettledMinutes,
    alertCooldownHours: numOrNull(th.alert_cooldown_hours) ?? DEFAULT_AI_THRESHOLDS.alertCooldownHours,
    canaryMinGapHours: numOrNull(th.canary_min_gap_hours) ?? DEFAULT_AI_THRESHOLDS.canaryMinGapHours,
  };

  return {
    days: num(raw.days),
    tz: str(raw.tz) ?? 'UTC',
    since: str(raw.since) ?? '',
    generatedAt: str(raw.generated_at) ?? '',
    totals: {
      calls: num(totals.calls),
      failures: num(totals.failures),
      cancelled: num(totals.cancelled),
      refunds: num(totals.refunds),
      credits: num(totals.credits),
      costUsd: num(totals.cost_usd),
      legacyCalls: num(totals.legacy_calls),
    },
    last24h: { calls: num(last24h.calls), failures: num(last24h.failures) },
    byFn,
    byDay,
    feedback: arr(raw.feedback)
      .map((r) => {
        const row = feedbackRow(r);
        const d = isObj(r) ? str(r.d) : null;
        return row && d ? { ...row, d } : null;
      })
      .filter((r): r is AiFeedbackCount & { d: string } => r != null),
    feedbackTotals: arr(raw.feedback_totals)
      .map(feedbackRow)
      .filter((r): r is AiFeedbackCount => r != null),
    canary: {
      configured: canary.configured === true,
      last: last
        ? {
            ranAt: str(last.ran_at) ?? '',
            ok: last.ok === true,
            failed: num(last.failed),
            results: arr(last.results)
              .filter(isObj)
              .map((p) => ({ model: str(p.model) ?? '?', kind: str(p.kind) ?? 'other', status: numOrNull(p.status), latencyMs: numOrNull(p.latency_ms) })),
          }
        : null,
      lastOkAt: str(canary.last_ok_at),
      recent: arr(canary.recent)
        .filter(isObj)
        .map((r) => ({ ranAt: str(r.ran_at) ?? '', ok: r.ok === true, failed: num(r.failed) })),
    },
    unsettled: { count: num(unsettled.count), oldestAt: str(unsettled.oldest_at) },
    alerts: {
      tripped: arr(alerts.tripped)
        .filter(isObj)
        .map((a) => ({ kind: str(a.kind) ?? 'unknown', line: str(a.line) ?? '' }))
        .filter((a) => a.line),
      lastSent,
      adminsWithDevice: num(alerts.admins_with_device),
    },
    thresholds,
  };
}

// ── The canary, in one sentence ──────────────────────────────────────────────────────────────────────────

export type CanaryVerdict =
  | { state: 'off' }
  | { state: 'never' }
  | { state: 'ok'; at: string }
  | { state: 'failed'; at: string; failing: AiCanaryProbe[] }
  | { state: 'stale'; at: string; hours: number };

/**
 * `off` — the PO has not switched it on (no URL). `never` — on, but no run yet. `stale` — the newest run is
 * older than a day and a bit, so the daily job missed (that is its own problem, and the alert no longer counts
 * the old result). Otherwise the newest run's verdict.
 */
export function canaryVerdict(c: AiCanary, nowMs: number): CanaryVerdict {
  if (!c.last) return c.configured ? { state: 'never' } : { state: 'off' };
  const at = Date.parse(c.last.ranAt);
  const hours = Number.isFinite(at) ? (nowMs - at) / 3_600_000 : Infinity;
  if (hours > CANARY_FRESH_HOURS) return { state: 'stale', at: c.last.ranAt, hours: Math.floor(hours) };
  if (c.last.ok) return { state: 'ok', at: c.last.ranAt };
  return { state: 'failed', at: c.last.ranAt, failing: c.last.results.filter((r) => r.kind !== 'ok') };
}

// ── Numbers as the page prints them ──────────────────────────────────────────────────────────────────────

function trimPct(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

/** `3.2%`, or `—` when there is nothing to divide. */
export function pctText(part: number, whole: number): string {
  return whole > 0 ? `${trimPct((100 * part) / whole)}%` : '—';
}

/** `850 ms` · `1.2 s` · `14 s` · `—` (no latency recorded). */
export function msText(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 10_000) return `${(Math.round(ms / 100) / 10).toFixed(1)} s`;
  return `${Math.round(ms / 1000)} s`;
}

/** `$0.0042` under a cent (the canary lives there), `$1.23` above. */
export function usdText(usd: number): string {
  if (!Number.isFinite(usd) || usd === 0) return '$0';
  return Math.abs(usd) < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
}

/** Share of votes that said Helpful, or null with none. */
export function helpfulShare(up: number, down: number): number | null {
  const n = up + down;
  return n > 0 ? Math.round((100 * up) / n) : null;
}

/** One function's figures on one line — the compact form the page lists. */
export function fnLine(r: AiFnRow): string {
  const parts = [
    `${r.failures} failed (${pctText(r.failures, r.calls)})`,
    r.refunds ? `${r.refunds} refunded` : null,
    r.cancelled ? `${r.cancelled} cancelled` : null,
    r.timed ? `p50 ${msText(r.p50Ms)} · p95 ${msText(r.p95Ms)}` : 'no latency recorded',
    `${r.credits} credit${r.credits === 1 ? '' : 's'}`,
    usdText(r.costUsd),
  ];
  return parts.filter(Boolean).join(' · ');
}
