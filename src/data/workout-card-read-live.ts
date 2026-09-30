import { supabase } from '@/lib/supabase';
import { ensureConsent, NO_AI_CONSENT, type NoAiConsent } from '@/lib/consent';
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

export type CardReadResult =
  | { kind: 'ok'; text: string }
  | { kind: 'not_deployed' }
  | Exclude<PhotoReadResult, { kind: 'ok' }>;

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

export async function readWorkoutCard(uri: string): Promise<CardReadResult | NoAiConsent> {
  const file = await readAsBase64(uri);
  if (!file) return { kind: 'offline' };
  if (!READABLE_MEDIA.includes(file.mediaType)) return { kind: 'unsupported_format' };

  const key = fingerprint(file.data);
  const already = readByContent.get(key);
  if (already) return { kind: 'ok', text: already };

  /* Consent before sharing (MHMDA / Nevada SB 370): nothing goes to the AI provider without a stored yes. */
  if (!(await ensureConsent('ai_sharing'))) return NO_AI_CONSENT;
  try {
    const { data, error } = await supabase.functions.invoke('workout-card-read', {
      body: { image: file.data, mediaType: file.mediaType },
    });
    let body: unknown = data;
    if (error) {
      /* A non-2xx still carries the function's reason on the error's Response; only no answer at all is offline. */
      const ctx = (error as { context?: unknown }).context;
      if (!(ctx instanceof Response)) return { kind: 'offline' };
      if (ctx.status === 404) return { kind: 'not_deployed' };
      body = await ctx.json().catch(() => null);
      if (!body) return { kind: 'unavailable' };
    }
    if (!body) return { kind: 'offline' };

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
    return failed.kind === 'ok' ? { kind: 'unavailable' } : failed;
  } catch {
    return { kind: 'offline' };
  }
}
