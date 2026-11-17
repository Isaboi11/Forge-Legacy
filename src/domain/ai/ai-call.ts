/**
 * ══ ONE AI CALL, AS THE APP SEES IT (AI Road to 10, Sprint 1 — PL-3 / PL-4, audit P-G1 / P-G3) ══
 *
 * Before Sprint 1 every AI data module called `supabase.functions.invoke` with no clock, read the failure body its
 * own way, and told nobody when it broke. This is the one shape every non-chat module now shares:
 *
 *   · `AI_APP_TIMEOUT_MS` — the app's outer wall per function (contract §3). The function's own upstream abort sits
 *     ≥ 10 s inside it, so a slow model ends as a refunded `upstream_error` the app can show, never as a charge for
 *     an answer nobody saw.
 *   · `AiAnswer` — what one call came back with, before any module reads it.
 *   · `aiFailureOf` — that answer as the `AiFailure` telemetry sends (`src/lib/ai-telemetry.ts`).
 *   · `withNotCharged` — the one line every AI surface adds under a failure the server refunded.
 *
 * Pure: `node --test` runs it directly. The network half is `src/lib/ai-invoke.ts`.
 * Contract: `Docs/AI-Sprint-1-Build-Notes.md` §1.2, §3, §4.
 */

import { NOT_CHARGED, classifyAiFailure, wasRefunded, type AiFailure, type AiFunction } from './ai-failure.ts';

/**
 * Contract §3, in milliseconds. `coach-author` keeps Sprint 0's 30 s (B-D8, `author-deadline.ts`), and then the
 * rulebook builds it. `bug-plain` is not in §3: it is an admin tool on the longest model, so it gets the photo
 * readers' 90 s (reported to the integrator as a contract addition).
 */
export const AI_APP_TIMEOUT_MS = {
  'meal-photo-read': 90_000,
  'recipe-photo-read': 90_000,
  'program-photo-read': 90_000,
  'workout-card-read': 90_000,
  'coach-form-check': 90_000,
  'coach-kitchen': 60_000,
  'coach-interpret': 60_000,
  'workout-tidy': 60_000,
  'coach-author': 30_000,
  'recipe-link-read': 30_000,
  'bug-plain': 90_000,
} as const satisfies Partial<Record<AiFunction, number>>;

/** The functions this app calls through `invokeAi` (every AI function but the chat's streamed `coach-ask`). */
export type TimedAiFunction = keyof typeof AI_APP_TIMEOUT_MS;

/** What one call came back with. Exactly one of ok-with-a-status, `offline`, `timedOut`, `cancelled` describes it. */
export interface AiAnswer {
  fn: AiFunction;
  /** The function's JSON — `data` on a 2xx, the error Response's body on a non-2xx. Null when there was none. */
  body: unknown;
  /** HTTP status when the function answered; null when nothing did. */
  status: number | null;
  /** No HTTP answer at all: no signal, or the request never reached the function. */
  offline: boolean;
  /** The app's own clock ran out (`AI_APP_TIMEOUT_MS`). */
  timedOut: boolean;
  /** The screen went away, or the athlete stopped it. Never reported. */
  cancelled: boolean;
  latencyMs: number;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const field = (body: unknown, key: string): unknown => (body && typeof body === 'object' ? (body as Record<string, unknown>)[key] : undefined);

/** The function's own `reason` (`upstream_error`, `not_a_program`, `no_consent`, …), when it sent one. */
export const reasonOf = (body: unknown): string | null => str(field(body, 'reason'));

/** The function's `upstream` hint — `'timeout'` when its own upstream abort fired (contract §1.2). */
export const upstreamOf = (body: unknown): string | null => str(field(body, 'upstream'));

/** The server said it gave the credits back. */
export const refundedBy = (a: Pick<AiAnswer, 'body'>): boolean => wasRefunded(a.body);

/** Either clock ran out: the app's, or the function's own upstream abort. A second try would be just as slow. */
export const ranOutOfTime = (a: Pick<AiAnswer, 'body' | 'timedOut'>): boolean => a.timedOut || upstreamOf(a.body) === 'timeout';

/**
 * The server's consent check refused it (Sprint 1, P-G9) although this phone believed it had a yes. Routed to the
 * consent sheet (`reaskConsent`), never shown as a generic error.
 */
export const serverSaysNoConsent = (a: Pick<AiAnswer, 'body'>): boolean => reasonOf(a.body) === 'no_consent';

/**
 * One answer as the failure telemetry sends. `outcome` is what the module made of it (`unfaithful`, `not_a_workout`,
 * `unavailable` …) and stands in as the reason only when the function gave none — a 2xx the device's own guard
 * refused is still a failure the AI health page should see.
 */
export function aiFailureOf(a: AiAnswer, outcome?: string | null): AiFailure {
  const reason = reasonOf(a.body) ?? (outcome && outcome !== 'ok' ? outcome : null);
  return {
    fn: a.fn,
    kind: classifyAiFailure({
      reason,
      upstream: upstreamOf(a.body),
      status: a.status,
      timedOut: a.timedOut,
      cancelled: a.cancelled,
      offline: a.offline,
    }),
    reason,
    status: a.status,
    latencyMs: a.latencyMs,
    refunded: wasRefunded(a.body),
  };
}

/**
 * A failure line, plus "Not charged." when the server gave the credits back (contract §1.2). One sentence, at the
 * end, in every surface — the copy form check has always used on its unreadable step.
 */
export function withNotCharged(line: string, refunded: boolean | null | undefined): string {
  if (!refunded || line.includes(NOT_CHARGED)) return line;
  return `${line.trimEnd()} ${NOT_CHARGED}`;
}

/** A result that may say the server refunded it. Every non-chat AI module's failure carries this. */
export type Refundable<T> = T & { refunded?: boolean };

/** Attach `refunded: true` to a failed result when the answer says so; anything else is returned untouched. */
export function refundedResult<T extends { kind: string }>(r: T, a: Pick<AiAnswer, 'body'>): Refundable<T> {
  return r.kind !== 'ok' && wasRefunded(a.body) ? { ...r, refunded: true } : r;
}
