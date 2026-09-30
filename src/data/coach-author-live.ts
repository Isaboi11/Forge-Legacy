import { supabase } from '@/lib/supabase';
import { ensureConsent, NO_AI_CONSENT, type NoAiConsent } from '@/lib/consent';
import { authorResultFrom, type AuthorRequest, type AuthorResult } from '@/domain/coach/author';
import { medicalRoute } from '@/domain/coach/medical-routing';

/**
 * HOLT WRITES IT — the client half of `coach-author` (Coach-AI-Amendment-003). Never throws: an outage is a
 * result, and the caller builds from the rulebook and says so (`authorFallbackLine`).
 */
export async function authorLive(req: AuthorRequest): Promise<AuthorResult | NoAiConsent> {
  /* The code guard, on the device too — a stop must not wait on the network (the function runs it again). */
  for (const line of req.said) {
    const guard = medicalRoute(line);
    if (guard === 'clear') continue;
    return { kind: 'stop', route: guard === 'crisis' || guard === 'urgent' || guard === 'care' ? guard : 'medical' };
  }
  /* Consent before sharing (MHMDA / Nevada SB 370): nothing goes to the AI provider without a stored yes. */
  if (!(await ensureConsent('ai_sharing'))) return NO_AI_CONSENT;
  try {
    const { data, error } = await supabase.functions.invoke('coach-author', { body: req });
    // ⚠ A non-2xx is NOT "offline" — its body is on the error's `context` (see `recipe-photo-live.ts`).
    let body: unknown = data;
    if (error) {
      const ctx = (error as { context?: unknown }).context;
      if (!(ctx instanceof Response)) return { kind: 'offline' };
      body = await ctx.json().catch(() => null);
      if (!body) return { kind: 'unavailable' };
    }
    if (!body) return { kind: 'offline' };
    return authorResultFrom(body, req.kind);
  } catch {
    return { kind: 'offline' };
  }
}
