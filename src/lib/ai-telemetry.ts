import {
  aiFailureMessage,
  aiFailureName,
  isReportableAiFailure,
  type AiFailure,
} from '@/domain/ai/ai-failure';
import { breadcrumb, reportError } from '@/lib/diagnostics';

/**
 * Report one failed AI call to `client_errors` and Sentry (AI Road to 10 Sprint 1, PL-4 / audit P-G1).
 *
 * Goes through `reportError` as `source: 'manual'`, so it gets the existing sanitising, the per-session and
 * per-fingerprint caps, and (on build 11) the Sentry forward. The athlete's own state — out of credits, no Premium AI,
 * the daily limit, their own cancel — is a breadcrumb, not an error.
 *
 * ⚠ TOTAL. Never throws: it is called from `catch` blocks.
 */
export function reportAiFailure(f: AiFailure): void {
  try {
    breadcrumb('net', aiFailureName(f), aiFailureMessage(f));
    if (!isReportableAiFailure(f.kind)) return;
    reportError({ name: aiFailureName(f), message: aiFailureMessage(f) }, { source: 'manual' });
  } catch {
    /* never propagate from a reporter */
  }
}

/** Milliseconds since `start` — `const t0 = Date.now(); … reportAiFailure({ …, latencyMs: elapsedMs(t0) })`. */
export const elapsedMs = (start: number): number => Math.max(0, Date.now() - start);
