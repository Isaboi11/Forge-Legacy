/**
 * ══ AI FAILURES, NAMED ONCE (AI Road to 10, Sprint 1 — PL-3 / PL-4, audit P-G1) ══
 *
 * Every AI call in the app can fail the same handful of ways, and before Sprint 1 none of them reached Sentry or
 * `client_errors`: the 09-21 key drain was found by testers. This module is the one vocabulary for those failures, so
 * every data module reports them the same way and the AI health page can group them.
 *
 * Pure and import-free on purpose: `node --test` runs it directly, and nothing here touches the network.
 * The reporting half (which needs `reportError`) is `src/lib/ai-telemetry.ts`.
 *
 * Contract: `Docs/AI-Sprint-1-Build-Notes.md` §1.2 (what a function returns) and §4 (telemetry).
 */

/** Every Edge Function that calls a model, plus the two that feed them. The slug is the deployed name. */
export type AiFunction =
  | 'coach-ask'
  | 'coach-interpret'
  | 'coach-author'
  | 'coach-kitchen'
  | 'coach-form-check'
  | 'meal-photo-read'
  | 'recipe-photo-read'
  | 'recipe-link-read'
  | 'program-photo-read'
  | 'workout-card-read'
  | 'workout-tidy'
  | 'bug-plain'
  | 'meal-describe';

/**
 * What went wrong, from the athlete's side of the screen.
 *
 * `timeout` — our own clock ran out (the app's, or the function's upstream abort, which arrives as
 *   `upstream_error` + `upstream: 'timeout'`).
 * `offline` — the request never reached the function.
 * `upstream` — the function reached Anthropic and it failed (5xx, 429, unreachable).
 * `meter` — the credit meter itself failed (`meter_unavailable`) or the function is `unconfigured`.
 * `unreadable` — the model answered but the answer could not be used (refusal, cut off, not a program, bad JSON).
 * `rejected` — the request was refused before any model (bad_request, too_long, too_large).
 * `no_consent` — the server's consent check refused it (Sprint 1, P-G9). The app asks first, so this is a bug.
 * The rest are the athlete's own state, not faults: `out_of_credits`, `not_entitled`, `daily_limit`, `cancelled`.
 */
export type AiFailureKind =
  | 'timeout'
  | 'offline'
  | 'upstream'
  | 'meter'
  | 'unreadable'
  | 'rejected'
  | 'no_consent'
  | 'out_of_credits'
  | 'not_entitled'
  | 'daily_limit'
  | 'cancelled'
  | 'unknown';

export interface AiFailure {
  fn: AiFunction;
  kind: AiFailureKind;
  /** The function's own `reason` string when it sent one (`upstream_error`, `not_a_program`, …). */
  reason?: string | null;
  /** HTTP status when the function answered with one. */
  status?: number | null;
  model?: string | null;
  latencyMs?: number | null;
  /** The function said it gave the credits back (`refunded: true`). */
  refunded?: boolean;
}

const REASON_KIND: Readonly<Record<string, AiFailureKind>> = {
  upstream_error: 'upstream',
  upstream_unreachable: 'upstream',
  overloaded: 'upstream',
  timeout: 'timeout',
  meter_unavailable: 'meter',
  unconfigured: 'meter',
  unreadable: 'unreadable',
  refusal: 'unreadable',
  truncated: 'unreadable',
  not_a_program: 'unreadable',
  not_a_workout: 'unreadable',
  not_food: 'unreadable',
  not_a_recipe: 'unreadable',
  bad_output: 'unreadable',
  bad_request: 'rejected',
  too_long: 'rejected',
  too_large: 'rejected',
  no_consent: 'no_consent',
  out_of_credits: 'out_of_credits',
  not_entitled: 'not_entitled',
  daily_limit: 'daily_limit',
  cancelled: 'cancelled',
};

/**
 * Classify one failed call. Precedence: the athlete's own cancel, then our timeout, then "never left the phone", then
 * whatever reason the function gave, then the HTTP status.
 */
export function classifyAiFailure(input: {
  reason?: string | null;
  /** The function's `upstream` hint — `'timeout'` when its own upstream abort fired. */
  upstream?: string | null;
  status?: number | null;
  /** The app's timeout fired (functions-js reports it as an aborted fetch). */
  timedOut?: boolean;
  /** The athlete closed the screen / pressed stop. */
  cancelled?: boolean;
  /** No HTTP response at all (fetch threw before a status). */
  offline?: boolean;
}): AiFailureKind {
  if (input.cancelled) return 'cancelled';
  if (input.timedOut || input.upstream === 'timeout') return 'timeout';
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (reason && REASON_KIND[reason]) return REASON_KIND[reason];
  if (input.offline) return 'offline';
  const status = typeof input.status === 'number' ? input.status : null;
  if (status === 429 || status === 529 || (status !== null && status >= 500)) return 'upstream';
  if (status !== null && status >= 400) return 'rejected';
  return 'unknown';
}

/** The athlete's own state is not a fault. Everything else is reported. */
export function isReportableAiFailure(kind: AiFailureKind): boolean {
  return kind !== 'out_of_credits' && kind !== 'not_entitled' && kind !== 'daily_limit' && kind !== 'cancelled';
}

/** `client_errors.name` — the grouping column. No spaces (a space reads as prose and is dropped to 'Error'). */
export function aiFailureName(f: Pick<AiFailure, 'fn' | 'kind'>): string {
  return `ai.${f.fn}.${f.kind}`.slice(0, 60);
}

const clean = (v: unknown, max = 60): string =>
  String(v)
    .replace(/[\s=]+/g, '_')
    .slice(0, max);

/** `client_errors.message` — one line of key=value pairs, never user content, never upstream text. */
export function aiFailureMessage(f: AiFailure): string {
  const parts = [`fn=${f.fn}`, `kind=${f.kind}`];
  if (f.reason) parts.push(`reason=${clean(f.reason, 40)}`);
  if (typeof f.status === 'number') parts.push(`status=${f.status}`);
  if (f.model) parts.push(`model=${clean(f.model)}`);
  if (typeof f.latencyMs === 'number' && Number.isFinite(f.latencyMs)) parts.push(`ms=${Math.max(0, Math.round(f.latencyMs))}`);
  if (f.refunded) parts.push('refunded=true');
  return parts.join(' ');
}

/** The function gave the credits back. Read from a failure body (`{ ok: false, reason, refunded: true }`). */
export function wasRefunded(body: unknown): boolean {
  return !!body && typeof body === 'object' && (body as { refunded?: unknown }).refunded === true;
}

/** The one line every AI surface shows under a failure the server refunded. Form check already says this. */
export const NOT_CHARGED = 'Not charged.';
