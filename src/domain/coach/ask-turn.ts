/**
 * ══ ONE `coach-ask` TURN — THE MONEY, THE RETRY AND THE CLOCK (AI Road to 10 Sprint 1) ══
 *
 * The rules `supabase/functions/coach-ask/index.ts` follows for one ask, kept here so `node --test` can walk
 * them without a model, a meter or Deno. Pure and IMPORT-FREE on purpose: the paste builder
 * (`scripts/build-coach-ask-deploy.mjs`) inlines this file whole, and refuses one with imports of its own.
 *
 * Contract: `Docs/AI-Sprint-1-Build-Notes.md` §1 (reserve → model → settle), §1.2 (what the app is told), §3
 * (timeouts). Audit rows: P-D2 (a failed ask kept the credit), C-I2 (no retry on an overload), C-G5 (silence
 * during lookups), C-D8 (web search on Haiku), P-D8 (upstream text reached the app).
 *
 * ══ THE MONEY ══
 *
 * The credit is RESERVED before the model (`coach_ai_reserve`) and SETTLED after it (`coach_ai_settle`), and
 * settle gives it back on every failure that is ours or the model's: the upstream errored or was unreachable,
 * our own clock ran out, the model refused, it was cut at the cap before anything reached the app, or nothing
 * usable came back. A cut-off whose words WERE shown is charged (integrator, Sprint 1: refunding it would make a
 * long ask free). It is
 * NOT given back when the athlete closed the sheet: that is their decision, the model ran for them, and a
 * refund there would make "ask, read, close" free.
 *
 * Settle runs BEFORE the line that tells the app the turn is over, so an answer is never on screen while its
 * refund is still being decided (contract §1.3). The reservation id never leaves the function.
 *
 * ══ THE RETRY (C-I2) ══
 *
 * One retry per upstream request, on 429 / 529 / 5xx or a network error — and ONLY while nothing has been
 * forwarded to the app in this turn. Once a word is on screen, a second model call would write a second,
 * different answer under it; so after the first word, a failure is a failure.
 */

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Timeouts — the function always answers before the app gives up (contract §3)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The whole turn's upstream budget: every model round and every lookup between them. Past it the upstream is
 * aborted, the credit is refunded, and the app is told `upstream_error` + `upstream: 'timeout'`.
 *
 * ⚠ ≥ 10 s INSIDE THE APP'S WALL. `ASK_TOTAL_MS` (75 s) in `ask-stream.ts` is the app's outer limit for an
 * ordinary ask, `ASK_WEB_TOTAL_MS` (105 s) for a tapped online search — 15 s of margin each, for settle and
 * the last line. ask-turn.test.mjs pins the margin.
 */
export const ASK_SERVER_TURN_MS = 60_000;
/** A tapped online search runs up to two searches inside the model's own turn, so it gets longer. */
export const ASK_SERVER_WEB_TURN_MS = 90_000;
/**
 * Anthropic silent this long — no headers, no event, not even its `ping` — and the upstream is aborted as a
 * timeout. Inside the app's idle clock (`ASK_IDLE_MS`, 45 s) by 15 s.
 */
export const ASK_SERVER_IDLE_MS = 30_000;
/**
 * A keep-alive comment (`ASK_KEEPALIVE`) at least this often while the stream is open, so a long tool round
 * never reads as a dead line to the app's clock (OTA #24's first-byte wait is 20 s, its idle wait 45 s), or to
 * anything between the function and the phone.
 */
export const ASK_KEEPALIVE_MS = 10_000;
/** The end-of-chat summary's upstream abort. The app gives up at `SUMMARY_TIMEOUT_MS` (30 s). */
export const SUMMARY_UPSTREAM_MS = 20_000;

/** The turn budget for this ask. */
export const askTurnMs = (allowWeb: boolean): number => (allowWeb ? ASK_SERVER_WEB_TURN_MS : ASK_SERVER_TURN_MS);

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The model (C-D8)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Which model serves this ask. A request may name one of `allowed` (the CA-D7 routing benchmark); anything
 * else runs `fallback`.
 *
 * ⛔ A TAPPED ONLINE SEARCH IS ALWAYS `fallback` (Sonnet). Anthropic's `web_search_20260209` tool is not
 * offered on Haiku 4.5, so a `model: 'claude-haiku-4-5'` request with `allowWeb` was a latent 400 — on the one
 * ask that costs three credits (audit C-D8).
 */
export function askModel(requested: unknown, allowWeb: boolean, allowed: readonly string[], fallback: string): string {
  if (allowWeb) return fallback;
  return typeof requested === 'string' && allowed.includes(requested) ? requested : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The retry (C-I2)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Anthropic's own advice is the ceiling we honour; past this we retry anyway, once. */
export const RETRY_AFTER_CAP_MS = 3_000;
/** The wait when the upstream gave no `retry-after` (or the request never reached it). */
export const RETRY_DEFAULT_MS = 1_000;

/** 429 rate limit, 529 overloaded, any other 5xx. A 4xx is our request's fault and would fail the same way. */
export const isRetryableStatus = (status: number | null | undefined): boolean =>
  typeof status === 'number' && (status === 429 || status === 529 || (status >= 500 && status <= 599));

/**
 * How long to wait before the one retry. `retry-after` in seconds (or an HTTP date) is honoured up to
 * {@link RETRY_AFTER_CAP_MS}; without one, {@link RETRY_DEFAULT_MS}.
 */
export function retryDelayMs(retryAfter: string | null | undefined, now: number = Date.now()): number {
  const raw = typeof retryAfter === 'string' ? retryAfter.trim() : '';
  if (!raw) return RETRY_DEFAULT_MS;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.min(Math.max(0, seconds * 1000), RETRY_AFTER_CAP_MS);
  const at = Date.parse(raw);
  if (Number.isFinite(at)) return Math.min(Math.max(0, at - now), RETRY_AFTER_CAP_MS);
  return RETRY_DEFAULT_MS;
}

/** The slice of a fetch `Response` the retry reads — structural, so a test can hand it a plain object. */
export interface UpstreamReply {
  ok: boolean;
  status: number;
  body: unknown;
  headers: { get(name: string): string | null };
}

export type UpstreamResult<R extends UpstreamReply> =
  | { ok: true; response: R; attempts: number }
  /** `upstream_error` — it answered, with an error. `upstream_unreachable` — the request itself threw. */
  | { ok: false; failure: 'upstream_error' | 'upstream_unreachable'; status: number | null; attempts: number };

/**
 * One upstream request, retried AT MOST ONCE.
 *
 *   · `call` — makes the request (a fresh one each time; a request body cannot be sent twice).
 *   · `canRetry` — asked at the moment of the retry: false once any text has gone to the app in this turn, or
 *     once the turn is over (our timeout, the athlete gone). Asked again after the wait, because either can
 *     happen during it.
 *   · `wait` — the backoff; the function's version wakes early when the turn is aborted.
 *   · `failed` — told about every failed attempt (status, reply, thrown error), to log it server-side and to
 *     release the reply's body. ⛔ What it learns stays on the server (P-D8).
 *
 * Anthropic's `x-should-retry: false` is respected: it knows when a retry would fail the same way.
 */
export async function upstreamWithRetry<R extends UpstreamReply>(
  call: () => Promise<R>,
  opts: {
    canRetry: () => boolean;
    wait: (ms: number) => Promise<void>;
    failed?: (attempt: { status: number | null; reply: R | null; error: unknown }) => void | Promise<void>;
  },
): Promise<UpstreamResult<R>> {
  for (let attempt = 1; ; attempt += 1) {
    let reply: R | null = null;
    let error: unknown = null;
    try {
      reply = await call();
    } catch (e) {
      error = e;
    }
    if (reply && reply.ok && reply.body) return { ok: true, response: reply, attempts: attempt };
    const status = reply ? reply.status : null;
    await opts.failed?.({ status, reply, error });
    const retryable = reply ? isRetryableStatus(status) && reply.headers.get('x-should-retry') !== 'false' : true;
    if (attempt === 1 && retryable && opts.canRetry()) {
      await opts.wait(retryDelayMs(reply?.headers.get('retry-after') ?? null));
      if (opts.canRetry()) continue;
    }
    return { ok: false, failure: reply ? 'upstream_error' : 'upstream_unreachable', status, attempts: attempt };
  }
}

/** A wait that ends early when `signal` aborts — the backoff must not outlive the turn. */
export function waitUnlessAborted(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, Math.max(0, ms));
    signal?.addEventListener('abort', finish);
  });
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The money: reserve → settle (contract §1)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** One row of `coach_ai_reserve(p_action, p_fn)`. ⛔ `reservation_id` never leaves the function. */
export interface AskReservation {
  allowed: boolean;
  reason: string | null;
  reservation_id: string | null;
  credits_spent: number | null;
  remaining: number | null;
  allowance: number | null;
  age_years: number | null;
  minor: boolean | null;
}

/** One row of `coach_ai_settle(...)`. */
export interface AskSettleRow {
  settled: boolean;
  refunded: boolean;
  cost_usd: number | null;
  remaining: number | null;
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/**
 * What the app is told when the meter said no — or null when the credit is held and the ask goes ahead.
 *
 * The routes are the ones every shipped app already reads (`fromRoute` in `coach-ask-live.ts`):
 *   · `not_entitled` / `out_of_credits` → `{ route: 'out_of_credits', remaining, allowance }`, 200 — exactly what
 *     `coach_ai_spend_credits` produced (0203 refuses a non-AI account with 0 / 0, and the app reads
 *     `allowance` 0 as "Premium AI is not on").
 *   · `no_consent` (new, P-G9) → `{ route: 'error', reason: 'no_consent' }`, 403. An old app reads it as its
 *     outage card; it never gets here in practice, because it asks for the consent before it asks Holt.
 *   · No row, or "allowed" without a reservation to settle → the meter is broken → `meter_unavailable`, 503.
 */
export function reserveRefusal(row: unknown): { status: number; body: Record<string, unknown> } | null {
  const r = (row && typeof row === 'object' ? row : null) as Partial<AskReservation> | null;
  if (!r) return { status: 503, body: { route: 'error', reason: 'meter_unavailable' } };
  if (r.allowed === true) {
    return typeof r.reservation_id === 'string' && r.reservation_id
      ? null
      : { status: 503, body: { route: 'error', reason: 'meter_unavailable' } };
  }
  if (r.reason === 'no_consent') return { status: 403, body: { route: 'error', reason: 'no_consent' } };
  return { status: 200, body: { route: 'out_of_credits', remaining: num(r.remaining), allowance: num(r.allowance) } };
}

/** How a turn failed on OUR side of the wire. `upstream_dropped` — the stream broke partway. */
export type AskTurnFailure = 'timeout' | 'upstream_error' | 'upstream_unreachable' | 'upstream_dropped';

/**
 * The settle vocabulary this function uses (contract §1 `p_outcome`). `guarded` — the code guard stopped the ask
 * AFTER the reserve (a profile minor, P-G8), refunded; ai/s1-money's 0268 adds it to the vocabulary.
 */
export type AskOutcome =
  | 'ok'
  | 'upstream_error'
  | 'upstream_unreachable'
  | 'timeout'
  | 'refusal'
  | 'truncated'
  | 'bad_output'
  | 'cancelled'
  | 'guarded'
  | 'other';

/** A reply stopped at the length cap (or the context window). Mirrors `CUT_STOPS` in `ask-stream.ts`. */
export const ASK_CUT_STOPS: readonly string[] = ['max_tokens', 'model_context_window_exceeded'];

/**
 * How a turn is settled. ORDER MATTERS: the athlete's own cancel first (never refunded), then our failures,
 * then the model's endings, then "nothing came back".
 *
 *   · `delivered` — a word or an action reached the app. A turn that ended cleanly with neither showed the
 *     athlete an outage card, so it is refunded as `bad_output`.
 *   · A cut-off (`truncated`) is CHARGED when anything was delivered — the words stand and he says they are not all
 *     of it (C-D4); refunding it would make "write me an essay" free. A cut-off before anything reached the app
 *     is refunded (integrator decision, Sprint 1).
 */
export function askSettlement(t: {
  failure: AskTurnFailure | null;
  stop: string | null;
  delivered: boolean;
  cancelled?: boolean;
}): { outcome: AskOutcome; refund: boolean } {
  if (t.cancelled) return { outcome: 'cancelled', refund: false };
  if (t.failure === 'timeout') return { outcome: 'timeout', refund: true };
  if (t.failure === 'upstream_unreachable') return { outcome: 'upstream_unreachable', refund: true };
  if (t.failure) return { outcome: 'upstream_error', refund: true };
  if (t.stop === 'refusal') return { outcome: 'refusal', refund: true };
  if (t.stop != null && ASK_CUT_STOPS.includes(t.stop)) return { outcome: 'truncated', refund: !t.delivered };
  if (!t.delivered) return { outcome: 'bad_output', refund: true };
  return { outcome: 'ok', refund: false };
}

/**
 * The failure line the app reads (`readAskEvent`). Fixed codes only — ⛔ no `detail`, no Anthropic status line,
 * no error body, ever (P-D8). Our own timeout is the EXISTING `upstream_error` plus `upstream: 'timeout'`
 * (contract §1.2), so an app that knows only `upstream_error` still shows its outage card.
 */
export function askFailureEvent(
  failure: AskTurnFailure,
  settled: { refunded: boolean; remaining: number | null },
): { error: string; upstream?: 'timeout'; refunded?: true; remaining?: number } {
  return {
    error: failure === 'timeout' ? 'upstream_error' : failure,
    ...(failure === 'timeout' ? { upstream: 'timeout' as const } : {}),
    ...(settled.refunded ? { refunded: true as const } : {}),
    ...(typeof settled.remaining === 'number' && Number.isFinite(settled.remaining) ? { remaining: settled.remaining } : {}),
  };
}

/** Clamp a token count or a latency for the settle call (the SQL clamps too). */
export const meterInt = (v: unknown, max: number): number => Math.min(max, Math.max(0, Math.round(num(v))));
