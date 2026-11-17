/**
 * ══ THE AI METER, SERVER HALF — reserve → model → settle (AI Road to 10, Sprint 1 · PL-1 / PL-2 / PL-3) ══
 *
 * `Docs/AI-Sprint-1-Build-Notes.md` §1 (the meter), §1.2 (what a function returns), §3 (timeouts). Migration 0268
 * holds the money; this module only shapes the calls and the replies, so every metered Edge Function does it the
 * same way:
 *
 *   1. `coach_ai_reserve(action, fn)` holds the credits (and refuses: no Premium AI, no consent, out of credits).
 *      `reserveFrom` reads its row. ⛔ The reservation id stays in the function's memory — no reply carries it.
 *   2. The model call runs through `timedModelCall`, with the function's own upstream abort (§3, at least 10 s
 *      inside the app's timeout), so a slow model ends as a refunded failure the app can show.
 *   3. `coach_ai_settle` runs ONCE, before the answer is returned: `settleArgs` builds its arguments, and every
 *      outcome except `ok` refunds (P-D2). `settledTail` puts `refunded: true` and the balance on the reply.
 *
 * ⛔ NOTHING THE UPSTREAM SAID REACHES THE APP (P-D8). `timedModelCall` logs a non-2xx body to the function's own
 * log and returns only its kind and status; `failedCallReply` turns the kind into the function's existing reason.
 *
 * ⚠ NO IMPORTS. The paste-copy builders (`scripts/build-*-deploy.mjs`) inline this file into each bundled function
 * and refuse a module that has imports of its own. The self-contained functions (`workout-card-read`,
 * `workout-tidy`) carry a COPY of the block between the METER markers; `meter-server.test.mjs` fails when a copy
 * differs from this file by anything but the `export` keywords.
 */

// ── METER: begin ──
/**
 * The outcome `coach_ai_settle` stores (contract §1). Every value except `ok` refunds. `guarded`: a server guard
 * stopped the call after the reserve (coach-ask, a server-derived minor).
 */
export type SettleOutcome =
  | 'ok'
  | 'upstream_error'
  | 'upstream_unreachable'
  | 'timeout'
  | 'refusal'
  | 'truncated'
  | 'not_a_program'
  | 'unreadable'
  | 'bad_output'
  | 'cancelled'
  | 'guarded';

/**
 * The server's own upstream abort, per function (contract §3). Each sits at least 10 s inside the app's timeout, so
 * the function always answers — with a refund — before the app gives up. coach-author's is the budget for BOTH of its
 * attempts together.
 */
export const UPSTREAM_ABORT_MS: Readonly<Record<string, number>> = {
  'meal-photo-read': 75_000,
  'recipe-photo-read': 75_000,
  'program-photo-read': 75_000,
  'workout-card-read': 75_000,
  'coach-form-check': 75_000,
  'coach-kitchen': 45_000,
  'coach-interpret': 45_000,
  'workout-tidy': 45_000,
  'coach-author': 25_000,
};

/** As much of Anthropic's `usage` block as the ledger keeps. */
export interface ModelUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

/** The parts of a Messages API reply the functions read. */
export interface ModelPayload {
  content?: { type: string; text: string }[];
  stop_reason?: string;
  model?: string;
  usage?: ModelUsage;
}

/** One model round trip. The failure kinds are the settle outcomes of the same name. */
export type ModelCall =
  | { kind: 'ok'; payload: ModelPayload; latencyMs: number }
  | { kind: 'upstream_error'; status: number; latencyMs: number }
  | { kind: 'upstream_unreachable'; latencyMs: number }
  | { kind: 'timeout'; latencyMs: number };

/** What `coach_ai_reserve` answered. `id` is the reservation — ⛔ never put it, or this object, in a reply. */
export type MeterReserve =
  | { ok: true; id: string; credits: number; remaining: number; allowance: number; ageYears: number | null; minor: boolean }
  | { ok: false; reason: 'not_entitled' | 'no_consent' | 'out_of_credits' | 'meter_unavailable'; remaining: number; allowance: number };

/** What `coach_ai_settle` answered. A settle that could not be written reads as not settled and not refunded. */
export interface Settled {
  settled: boolean;
  refunded: boolean;
  remaining: number | null;
}

/** The facts of the model call(s) a settle records. */
export interface CallFacts {
  model: string;
  usage?: ModelUsage | null;
  latencyMs?: number | null;
}

const meterInt = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);

/** `coach_ai_reserve`'s row → the reservation, or the refusal in the function's terms. A failed RPC is the meter down. */
export function reserveFrom(data: unknown, error: unknown): MeterReserve {
  if (error || !data || typeof data !== 'object') return { ok: false, reason: 'meter_unavailable', remaining: 0, allowance: 0 };
  const d = data as Record<string, unknown>;
  if (d.allowed === true) {
    if (typeof d.reservation_id !== 'string' || !d.reservation_id) return { ok: false, reason: 'meter_unavailable', remaining: 0, allowance: 0 };
    return {
      ok: true,
      id: d.reservation_id,
      credits: meterInt(d.credits_spent),
      remaining: meterInt(d.remaining),
      allowance: meterInt(d.allowance),
      ageYears: typeof d.age_years === 'number' && Number.isFinite(d.age_years) ? d.age_years : null,
      minor: d.minor === true,
    };
  }
  // Refused. An answer this code does not know is still a refusal — it never reaches a model.
  const reason = d.reason === 'not_entitled' || d.reason === 'no_consent' ? d.reason : 'out_of_credits';
  return { ok: false, reason, remaining: meterInt(d.remaining), allowance: meterInt(d.allowance) };
}

/**
 * One model round trip under the function's own abort (contract §3). `send` makes the request with the signal it is
 * given; the body is read here too, so a reply that stalls half-way is also cut off. The upstream's own words go to
 * the function's log (dashboard → Edge Functions → Logs) and never into the result (P-D8).
 */
export async function timedModelCall(send: (signal: AbortSignal) => Promise<Response>, abortMs: number): Promise<ModelCall> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Math.max(0, abortMs));
  const started = Date.now();
  const took = () => Date.now() - started;
  try {
    const response = await send(controller.signal);
    if (!response.ok) {
      const said = await response.text().catch(() => '');
      console.error('anthropic', response.status, said.slice(0, 800));
      return { kind: 'upstream_error', status: response.status, latencyMs: took() };
    }
    try {
      return { kind: 'ok', payload: (await response.json()) as ModelPayload, latencyMs: took() };
    } catch {
      return timedOut ? { kind: 'timeout', latencyMs: took() } : { kind: 'upstream_error', status: response.status, latencyMs: took() };
    }
  } catch {
    return timedOut ? { kind: 'timeout', latencyMs: took() } : { kind: 'upstream_unreachable', latencyMs: took() };
  } finally {
    clearTimeout(timer);
  }
}

/** A failed call, in the function's EXISTING reasons: our own timeout is `upstream_error` + `upstream: 'timeout'` (§1.2). */
export function failedCallReply(kind: 'upstream_error' | 'upstream_unreachable' | 'timeout'): { reason: 'upstream_error' | 'upstream_unreachable'; upstream?: 'timeout' } {
  if (kind === 'timeout') return { reason: 'upstream_error', upstream: 'timeout' };
  return { reason: kind };
}

/** The model, tokens and round-trip time of one call, for the settle. */
export function callFacts(call: ModelCall, fallbackModel: string): CallFacts {
  if (call.kind !== 'ok') return { model: fallbackModel, usage: null, latencyMs: call.latencyMs };
  return {
    model: typeof call.payload.model === 'string' && call.payload.model ? call.payload.model : fallbackModel,
    usage: call.payload.usage ?? null,
    latencyMs: call.latencyMs,
  };
}

/** `coach_ai_settle`'s arguments. Every outcome but `ok` refunds — a delivered, readable answer is the only charge. */
export function settleArgs(reservation: string, outcome: SettleOutcome, facts: CallFacts): Record<string, unknown> {
  const u = facts.usage ?? {};
  return {
    p_reservation: reservation,
    p_outcome: outcome,
    p_model: facts.model,
    p_input_tokens: meterInt(u.input_tokens),
    p_output_tokens: meterInt(u.output_tokens),
    p_cache_read_input_tokens: meterInt(u.cache_read_input_tokens),
    p_cache_creation_input_tokens: meterInt(u.cache_creation_input_tokens),
    p_latency_ms: facts.latencyMs == null ? null : meterInt(facts.latencyMs),
    p_refund: outcome !== 'ok',
  };
}

/** `coach_ai_settle`'s row → what happened. */
export function settledFrom(data: unknown, error: unknown): Settled {
  if (error || !data || typeof data !== 'object') return { settled: false, refunded: false, remaining: null };
  const d = data as Record<string, unknown>;
  return {
    settled: d.settled === true,
    refunded: d.settled === true && d.refunded === true,
    remaining: typeof d.remaining === 'number' && Number.isFinite(d.remaining) ? d.remaining : null,
  };
}

/** The balance after the settle (the reservation's when the settle did not answer), and `refunded: true` when it refunded. */
export function settledTail(s: Settled, reservedRemaining: number): { remaining: number; refunded?: true } {
  const remaining = s.remaining ?? reservedRemaining;
  return s.refunded ? { remaining, refunded: true } : { remaining };
}

/**
 * P-G8: the server's age, as ONE line for the USER turn of a function whose model writes advice. It never goes in the
 * cached system block. Unknown age is no line (an unknown age reads as an adult, as `isUnderAge(null)` does). A minor
 * also gets the conservative-advice instruction.
 */
export function ageLine(ageYears: number | null, minor: boolean): string | null {
  if (minor) {
    const age = ageYears != null && ageYears <= 18 ? `${ageYears}, under 18` : 'under 18';
    return `Athlete's age, from their profile: ${age}. Keep every suggestion conservative and right for supervised training: no maximal-effort sets or max attempts, and nothing about losing weight.`;
  }
  return ageYears == null ? null : `Athlete's age, from their profile: ${ageYears}.`;
}

/** A user turn with the age line after it, or unchanged when there is none. */
export function withAgeLine(turn: string, ageYears: number | null, minor: boolean): string {
  const line = ageLine(ageYears, minor);
  return line ? `${turn}\n\n${line}` : turn;
}
// ── METER: end ──
