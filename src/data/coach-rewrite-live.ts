import { ensureConsent } from '@/lib/consent';
import { invokeAi, reportAiCall } from '@/lib/ai-invoke';
import { serverSaysNoConsent } from '@/domain/ai/ai-call';
import { medicalRoute } from '@/domain/coach/medical-routing';
import type { RewriteRequest } from '@/domain/coach/rewrite';

/** A rewrite of a 5-day block measured 10–55 s live (11-19); the function's own budget is 75 s, this is ≥ 10 s past it. */
export const REWRITE_TIMEOUT_MS = 90_000;

export type RewriteLiveResult = { kind: 'ok'; text: string } | { kind: 'unavailable' | 'offline' | 'out_of_credits' };

/**
 * HOLT REWRITES IT — the client half of `coach-rewrite` (Holt Listens, PO D12). Never throws: an outage is a result and
 * the engine says "I couldn't rework it just now", the program unchanged. The code guard runs here first, so a stop
 * never waits on the network (the function runs it again); consent before anything leaves the phone.
 */
export async function rewriteLive(req: RewriteRequest, signal?: AbortSignal): Promise<RewriteLiveResult> {
  for (const line of [...req.said, req.brief]) if (medicalRoute(line) !== 'clear') return { kind: 'unavailable' };
  if (!(await ensureConsent('ai_sharing'))) return { kind: 'unavailable' };
  const a = await invokeAi('coach-rewrite', req, { signal, timeoutMs: REWRITE_TIMEOUT_MS });
  if (serverSaysNoConsent(a)) return { kind: 'unavailable' };
  if (a.offline || a.cancelled) return { kind: 'offline' };
  const body = (a.body ?? null) as { ok?: boolean; text?: unknown; reason?: unknown } | null;
  if (body?.ok === true && typeof body.text === 'string') return { kind: 'ok', text: body.text };
  if (body?.reason === 'out_of_credits') return { kind: 'out_of_credits' };
  reportAiCall(a, a.timedOut ? 'unavailable' : 'bad_output');
  return { kind: 'unavailable' };
}
