/**
 * Forge Legacy — `ai-canary`: one tiny call per model, once a day (AI Road to 10, Sprint 1, PL-4).
 *
 * Audit G1/G2 (Docs/QA/AI-Audit-2026-11-16/5-platform.md): the 09-21 key drain was found by testers, because
 * nothing ever asked Anthropic "are you answering us?" on a day nobody used Holt. This does, every day, for each
 * model the app depends on, and hands the answer to `ai_canary_record` (migration 0269), which stores it and pushes
 * the operators when something is wrong.
 *
 * ══ ⛔ THE SECRET COMES FIRST ══
 *
 * pg_cron calls this with no user (`ai_canary_tick`, 0269), so it is deployed with "Verify JWT" OFF and the URL
 * is reachable by anyone. The `x-cron-secret` header is compared with the `AI_CANARY_SECRET` Edge Function secret
 * BEFORE the body is read, before the database and before any model — a stranger gets a 401 and Anthropic is never
 * called. An unset secret never matches. Then the database claims the run (`ai_canary_begin`: the same secret
 * again, and "not twice within 20 h") — still before any spend.
 *
 * ══ WHAT IT RECORDS ══
 *
 * Per model: the kind of answer (ok · rate_limited · overloaded · server_error · auth_error · key_drained ·
 * timeout · model_unavailable · bad_request · network_error), the HTTP status and the latency. NEVER the error
 * text: Anthropic's body is read only to tell "credit balance too low" from any other 400, and is then dropped.
 *
 * ══ COST — fractions of a cent ══
 *
 * Each probe is `max_tokens: 1` with a three-word prompt: about 12 input tokens and at most 1 output token.
 *   claude-sonnet-5    12 × $2/M   + 1 × $10/M   ≈ $0.000034
 *   claude-sonnet-5-5  12 × $2/M   + 1 × $10/M   ≈ $0.000034   (thinking off = between_tools, effort low)
 *   claude-haiku-5-5   12 × $0.1/M + 1 × $0.5/M  ≈ $0.0000017  (thinking disabled, effort low)
 *   claude-opus-5-5    12 × $4/M   + 1 × $20/M   ≈ $0.000068   (thinking cannot be turned off on Opus 5.5; low
 *                                                              effort, and max_tokens 1 caps it all the same)
 *   ≈ $0.00014 a run (0.014¢) · ≈ $0.004 a month at one run a day · ≈ $0.05 a year.
 * Nothing runs until the PO sets `ai_ops_config.canary_url` (0269's tick returns at once while it is null).
 *
 * ══ DEPLOY ══ (PO — see supabase/apply/pending-0269.sql's header for the order)
 *   1. Apply pending-0269.sql.  2. Secret: AI_CANARY_SECRET = `select cron_secret from public.ai_ops_config;`
 *   3. Deploy this file as `ai-canary` with "Verify JWT" OFF.  4. Set ai_ops_config.canary_url.
 * Uses ANTHROPIC_API_KEY (the coach functions' key) and the platform's own SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY: there is no caller to run as, and the two canary functions are granted to
 * service_role only. The service key never leaves this function.
 *
 * Self-contained: no import from the app. The part between the CANARY CORE markers is pure (no Deno, no
 * imports) so `src/domain/ai/__tests__/ai-canary.test.mjs` runs the real handler with a fake fetch.
 *
 * Responses: 200 {ok, run, results} · 401 unauthorized · 405 · 429 too_soon · 503 unconfigured|claim_failed ·
 * 500 record_failed.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

// ── CANARY CORE: begin ─────────────────────────────────────────────────────────────────────────────────

/**
 * Every model a deployed function calls (Sprint 3b, PL-7): Sonnet 5 (every function's in-code default), Sonnet 5.5
 * (coach-ask after the 0274 switch), Haiku 5.5 (coach-author + coach-kitchen after the switch, chat summaries, the
 * routing slots), Opus 5.5 (admin tools). Haiku 4.5 is retired — no function can run it any more.
 */
export const CANARY_MODELS = ['claude-sonnet-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5'] as const;

/** Each probe gives up after this long and is recorded as `timeout`. */
export const PROBE_ABORT_MS = 20_000;

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export type CanaryKind =
  | 'ok'
  | 'rate_limited'
  | 'overloaded'
  | 'server_error'
  | 'auth_error'
  | 'key_drained'
  | 'timeout'
  | 'model_unavailable'
  | 'bad_request'
  | 'network_error';

export interface CanaryResult {
  model: string;
  kind: CanaryKind;
  status: number | null;
  latency_ms: number;
}

/** Compare without stopping at the first difference. An empty `expected` never matches (an unset secret). */
export function secretMatches(given: string | null | undefined, expected: string | null | undefined): boolean {
  const a = String(given ?? '');
  const b = String(expected ?? '');
  if (b.length === 0) return false;
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/**
 * What one answer means. `body` is Anthropic's error text, read ONLY to tell a drained key from any other 400;
 * it is never returned or stored.
 */
export function classifyCanary(status: number, body: string): CanaryKind {
  if (status >= 200 && status < 300) return 'ok';
  if (status === 429) return 'rate_limited';
  if (status === 529) return 'overloaded';
  if (status === 401 || status === 403) return 'auth_error';
  if (status === 402 || (status === 400 && /credit balance|usage limit|spend limit|billing/i.test(body))) return 'key_drained';
  if (status === 404) return 'model_unavailable';
  if (status >= 500) return 'server_error';
  return 'bad_request';
}

/** The request body for one probe: as small as a Messages call gets. */
export function probeBody(model: string): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: 1,
    messages: [{ role: 'user', content: 'Reply with OK.' }],
  };
  // Each model's thinking-off form, as src/domain/ai/model-request.ts sends it (this file imports nothing, so the
  // shapes are written out; ai-canary.test.mjs holds them to requestFields). No refusal fallback: a probe asks whether
  // THIS model answers. Opus 5.5 always thinks — the lowest effort keeps it as short as the 1-token cap forces.
  if (model.startsWith('claude-opus-5-5')) body.output_config = { effort: 'low' };
  if (model.startsWith('claude-sonnet-5-5')) Object.assign(body, { thinking: { type: 'between_tools' }, output_config: { effort: 'low' } });
  if (model.startsWith('claude-haiku-5-5')) Object.assign(body, { thinking: { type: 'disabled' }, output_config: { effort: 'low' } });
  return body;
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ status: number; ok: boolean; text: () => Promise<string> }>;

/** One probe. Never throws: a failure is a result. */
export async function probe(model: string, apiKey: string, fetchImpl: FetchLike, now: () => number, abortMs = PROBE_ABORT_MS): Promise<CanaryResult> {
  const t0 = now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), abortMs);
  try {
    const res = await fetchImpl(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(probeBody(model)),
      signal: ctl.signal,
    });
    // The text is read so the connection is released and a drained key can be told apart. It is not kept.
    const text = await res.text().catch(() => '');
    return { model, kind: classifyCanary(res.status, res.ok ? '' : text), status: res.status, latency_ms: Math.max(0, now() - t0) };
  } catch {
    return { model, kind: ctl.signal.aborted ? 'timeout' : 'network_error', status: null, latency_ms: Math.max(0, now() - t0) };
  } finally {
    clearTimeout(timer);
  }
}

export interface CanaryDeps {
  /** AI_CANARY_SECRET. */
  secret: string;
  /** ANTHROPIC_API_KEY. */
  apiKey: string;
  /** Whether the database client could be built (SUPABASE_URL + the service key are set). */
  dbReady: boolean;
  rpc: (fn: 'ai_canary_begin' | 'ai_canary_record', args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  fetch: FetchLike;
  now: () => number;
}

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export function canaryHandler(deps: CanaryDeps): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    // ⛔ FIRST, before anything else is read or called: a request without the secret ends here, for free.
    if (!secretMatches(req.headers.get('x-cron-secret'), deps.secret)) return reply({ ok: false, reason: 'unauthorized' }, 401);
    if (req.method !== 'POST') return reply({ ok: false, reason: 'method' }, 405);
    if (!deps.apiKey || !deps.dbReady) return reply({ ok: false, reason: 'unconfigured' }, 503);

    // ⛔ ONCE A DAY, claimed in the database before any spend (a second call inside 20 h gets `too_soon`).
    const claim = await deps.rpc('ai_canary_begin', { p_secret: deps.secret });
    if (claim.error) return reply({ ok: false, reason: 'claim_failed' }, 503);
    if (claim.data !== true) return reply({ ok: false, reason: 'too_soon' }, 429);

    const results = await Promise.all(CANARY_MODELS.map((m) => probe(m, deps.apiKey, deps.fetch, deps.now)));

    const rec = await deps.rpc('ai_canary_record', { p_secret: deps.secret, p_results: results });
    if (rec.error) return reply({ ok: false, reason: 'record_failed', results }, 500);
    return reply({ ok: true, run: rec.data, results });
  };
}

// ── CANARY CORE: end ───────────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const db = SUPABASE_URL && SERVICE_ROLE ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } }) : null;

Deno.serve(
  canaryHandler({
    secret: Deno.env.get('AI_CANARY_SECRET') ?? '',
    apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
    dbReady: db !== null,
    rpc: async (fn, args) => {
      if (!db) return { data: null, error: 'unconfigured' };
      const { data, error } = await db.rpc(fn, args);
      return { data, error };
    },
    fetch: (url, init) => fetch(url, init),
    now: () => Date.now(),
  }),
);
