import { ensureConsent, NO_AI_CONSENT, type NoAiConsent } from '@/lib/consent';
import { invokeAi, reportAiCall } from '@/lib/ai-invoke';
import { refundedResult, serverSaysNoConsent, type Refundable } from '@/domain/ai/ai-call';
import { authorResultFrom, type AuthorRequest, type AuthorResult } from '@/domain/coach/author';
import { AUTHOR_TIMEOUT_MS, authorWithin } from '@/domain/coach/author-deadline';
import { medicalRoute } from '@/domain/coach/medical-routing';

/**
 * HOLT WRITES IT — the client half of `coach-author` (Coach-AI-Amendment-003). Never throws: an outage is a
 * result, and the caller builds from the rulebook and says so (`authorFallbackLine`).
 *
 * ⏱ 30 s (Sprint 0, B-D8 — `authorWithin` still races it), aborted when `signal` fires (the sheet closed). Failures
 * are reported (P-G1); a refund rides on the result.
 */
export async function authorLive(req: AuthorRequest, signal?: AbortSignal): Promise<Refundable<AuthorResult> | NoAiConsent> {
  /* The code guard, on the device too — a stop must not wait on the network (the function runs it again). */
  for (const line of req.said) {
    const guard = medicalRoute(line);
    if (guard === 'clear') continue;
    return { kind: 'stop', route: guard === 'crisis' || guard === 'urgent' || guard === 'care' ? guard : 'medical' };
  }
  /* Consent before sharing (MHMDA / Nevada SB 370): nothing goes to the AI provider without a stored yes. */
  if (!(await ensureConsent('ai_sharing'))) return NO_AI_CONSENT;
  /* Thirty seconds, then the rulebook builds it and he says so (AI audit 11-16, B-D8) — see `authorWithin`. The call
     carries the same 30 s itself (`invokeAi`), so the timeout is reported as one. */
  let consentRefused = false;
  /* `authorWithin` hands back the call's own object (or its `unavailable`), so a refund on it survives. */
  const r: Refundable<AuthorResult> = await authorWithin(AUTHOR_TIMEOUT_MS, async (): Promise<Refundable<AuthorResult>> => {
    // ⚠ A non-2xx is NOT "offline" — its body is on the error's `context`, which `invokeAi` reads.
    const a = await invokeAi('coach-author', req, { signal, timeoutMs: AUTHOR_TIMEOUT_MS });
    if (serverSaysNoConsent(a)) {
      consentRefused = true;
      return { kind: 'unavailable' };
    }
    const out = ((): AuthorResult => {
      if (a.offline || a.cancelled) return { kind: 'offline' };
      if (a.timedOut) return { kind: 'unavailable' };
      if (!a.body) return a.status === 200 ? { kind: 'offline' } : { kind: 'unavailable' };
      return authorResultFrom(a.body, req.kind);
    })();
    if (out.kind === 'ok' || out.kind === 'stop') return out;
    /* `none` from a 2xx: what he wrote did not survive the device's guard. */
    reportAiCall(a, out.kind === 'none' ? 'bad_output' : out.kind);
    return refundedResult(out, a);
  });
  return consentRefused ? NO_AI_CONSENT : r;
}
