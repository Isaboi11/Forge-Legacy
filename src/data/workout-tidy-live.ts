import { supabase } from '@/lib/supabase';
import { ensureConsent, NO_AI_CONSENT, type NoAiConsent } from '@/lib/consent';
import { checkAiRewrite } from '@/domain/workout/workout-ai-gate';

/**
 * "FIX IT WITH AI" — the client half of `workout-tidy` (Import Amendment 002, PO 2026-09-28).
 *
 * Only ever called when `whenToUseAi` says the code reader could not read the card. The function hands back WORDS
 * in the reader's own layout; this module then runs `checkAiRewrite` against the card BEFORE the words are offered,
 * and a rewrite that wrote one number not on the card, dropped a %, or named a lift not on it comes back as
 * `unfaithful` and is never shown as the answer. The poster keeps their own words.
 *
 * ⚠ NEVER THROWS, and an outage never reads as a verdict on the card (the same three-way split as
 * `program-photo-live.ts`).
 */

export type TidyResult =
  | { kind: 'ok'; text: string }
  | { kind: 'unfaithful'; problems: string[] }
  | { kind: 'not_a_workout' }
  | { kind: 'not_entitled' }
  | { kind: 'out_of_credits' }
  | { kind: 'daily_limit' }
  | { kind: 'too_long' }
  | { kind: 'unreadable' }
  | { kind: 'unavailable' }
  | { kind: 'offline' };

/** The same card tidied twice this session is free the second time. Only a faithful rewrite is kept. */
const tidied = new Map<string, string>();

export async function tidyWrittenWorkout(text: string, resolveKey: (name: string) => string | undefined): Promise<TidyResult | NoAiConsent> {
  const card = text.trim();
  const already = tidied.get(card);
  if (already) return { kind: 'ok', text: already };

  /* Consent before sharing (MHMDA / Nevada SB 370): nothing goes to the AI provider without a stored yes. */
  if (!(await ensureConsent('ai_sharing'))) return NO_AI_CONSENT;
  try {
    const { data, error } = await supabase.functions.invoke('workout-tidy', { body: { text: card } });
    let body: unknown = data;
    if (error) {
      /* A non-2xx still carries the function's reason on the error's Response; only no answer at all is offline. */
      const ctx = (error as { context?: unknown }).context;
      if (!(ctx instanceof Response)) return { kind: 'offline' };
      body = await ctx.json().catch(() => null);
      if (!body) return { kind: 'unavailable' };
    }
    const d = (body ?? {}) as { ok?: boolean; text?: string; reason?: string };
    if (!d.ok || typeof d.text !== 'string') {
      switch (d.reason) {
        case 'not_a_workout':
        case 'not_entitled':
        case 'out_of_credits':
        case 'daily_limit':
        case 'too_long':
        case 'unreadable':
          return { kind: d.reason };
        default:
          return { kind: 'unavailable' };
      }
    }
    /* ⚠ THE CHECK. On the device, against the card, with the same reader the post will use. */
    const problems = checkAiRewrite(card, d.text, resolveKey);
    if (problems.length) return { kind: 'unfaithful', problems };
    tidied.set(card, d.text);
    return { kind: 'ok', text: d.text };
  } catch {
    return { kind: 'offline' };
  }
}
