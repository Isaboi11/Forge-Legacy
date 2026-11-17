import { ensureConsent, NO_AI_CONSENT, type NoAiConsent } from '@/lib/consent';
import { invokeAi, reportAiCall } from '@/lib/ai-invoke';
import { ranOutOfTime, refundedResult, serverSaysNoConsent, type Refundable } from '@/domain/ai/ai-call';
import { READABLE_MEDIA, photoResultFrom, type PhotoReadResult } from '@/domain/program/photo-read-result';
import { cleanCardTranscript } from '@/domain/workout/card-transcript';
import { readAsBase64 } from '@/data/program-photo-live';

/**
 * READING A PHOTOGRAPHED WORKOUT CARD — the client half of `workout-card-read` (PO 2026-09-30).
 *
 * A card is copied line by line — its name, warm-up, every lift, the rests, the margin's "super set all 3", the
 * recovery — instead of being pressed into the table `program-photo-read` writes, where a title has no row and the
 * rest of it lands wherever the model puts it that day. What comes back is TEXT for the poster's own box, exactly
 * as if they had typed it; `workout-write.tsx` then runs the AI layout and the code reader over it.
 *
 * ⚠ `cleanCardTranscript` DECIDES what is accepted, here, on the device: no sets or reps in the answer is "not a
 * workout", whatever the function said.
 *
 * ⚠ `not_deployed` IS ITS OWN ANSWER. The function goes up by dashboard paste, after the app ships. Until then the
 * call answers 404 and the screen falls back to the table read — no credit is spent on a function that is not there.
 *
 * ⚠ NEVER THROWS, and an outage never reads as a verdict on the photo (the same split as `program-photo-live.ts`).
 */

export type CardReadResult = Refundable<
  | { kind: 'ok'; text: string }
  | { kind: 'not_deployed' }
  | Exclude<PhotoReadResult, { kind: 'ok' }>
> & {
  /** Either clock ran out (the app's 90 s, or the function's own upstream abort). */
  slow?: boolean;
};

/**
 * The card reader had no answer, so the table read (`program-photo-read`) is tried instead — not deployed yet, no
 * connection, or the server failed. ⚠ NOT AFTER A TIMEOUT (AI audit V-D5): a second read of the same photo would be
 * just as slow, and the athlete has already waited a minute and a half.
 */
export function cardReadFallsBack(card: CardReadResult | NoAiConsent): boolean {
  if (card.kind === 'no_consent') return false;
  return (card.kind === 'not_deployed' || card.kind === 'offline' || card.kind === 'unavailable') && !card.slow;
}

/** The same picture picked again is free: keyed by its bytes, since the web gives a fresh blob uri each time. */
const readByContent = new Map<string, string>();
const MAX_REMEMBERED = 12;

function fingerprint(base64: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < base64.length; i++) {
    h ^= base64.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${base64.length}:${(h >>> 0).toString(36)}`;
}

/** ⏱ 90 s (contract §3), aborted when `signal` fires. Failures are reported (P-G1); a refund rides on the result. */
export async function readWorkoutCard(uri: string, signal?: AbortSignal): Promise<CardReadResult | NoAiConsent> {
  const file = await readAsBase64(uri);
  if (!file) return { kind: 'offline' };
  if (!READABLE_MEDIA.includes(file.mediaType)) return { kind: 'unsupported_format' };

  const key = fingerprint(file.data);
  const already = readByContent.get(key);
  if (already) return { kind: 'ok', text: already };

  /* Consent before sharing (MHMDA / Nevada SB 370): nothing goes to the AI provider without a stored yes. */
  if (!(await ensureConsent('ai_sharing'))) return NO_AI_CONSENT;
  /* A non-2xx still carries the function's reason on the error's Response (`invokeAi`); only no answer is offline. */
  const a = await invokeAi('workout-card-read', { image: file.data, mediaType: file.mediaType }, { signal });
  if (serverSaysNoConsent(a)) return NO_AI_CONSENT;
  const r = ((): CardReadResult => {
    if (a.offline || a.cancelled) return { kind: 'offline' };
    if (a.timedOut) return { kind: 'unavailable', slow: true };
    if (a.status === 404) return { kind: 'not_deployed' };
    const body = a.body;
    if (!body) return a.status === 200 ? { kind: 'offline' } : { kind: 'unavailable' };

    const d = body as { ok?: boolean; text?: unknown };
    if (d.ok) {
      const clean = cleanCardTranscript(d.text);
      if (!clean.ok) return { kind: clean.reason };
      if (readByContent.size >= MAX_REMEMBERED) readByContent.delete(readByContent.keys().next().value!);
      readByContent.set(key, clean.text);
      return { kind: 'ok', text: clean.text };
    }
    /* Every refusal is the same set `program-photo-read` gives, so it is read by the same function. */
    const failed = photoResultFrom(body);
    if (failed.kind === 'ok') return { kind: 'unavailable' };
    return ranOutOfTime(a) && failed.kind === 'unavailable' ? { ...failed, slow: true } : failed;
  })();
  if (r.kind === 'ok') return r;
  reportAiCall(a, r.kind);
  return refundedResult(r, a);
}
