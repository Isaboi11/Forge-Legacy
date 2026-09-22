/**
 * What a photo read came back as — the `program-photo-read` Edge Function's answer, in the app's words.
 *
 * Pure, so `node --test` can hold the mapping to what it says (`photo-read-result.test.mjs`). The fetch
 * lives in `data/program-photo-live.ts`; the only decisions made here are WHICH failure the athlete is
 * told about, and that is the part that went wrong (stress test, 2026-09-21): a 400 for a too-big image
 * and a 503 for a missing key both reached the athlete as "check your connection".
 */

export type PhotoReadResult =
  /** Tab-separated rows, ready for `parseProgramTable()`. Never prose — the function's guard drops it. */
  | { kind: 'ok'; tsv: string; rows: number; remaining: number | null }
  /** Read fine; it is not a training table. */
  | { kind: 'not_a_program' }
  /** We looked and could not get rows out of it. A clearer photo may work. */
  | { kind: 'unreadable' }
  /** Bigger than the function accepts — only reachable if the downscale was skipped. */
  | { kind: 'too_large' }
  /** Sixty reads in one day on this account — a runaway client or a tester, never a real import. */
  | { kind: 'daily_limit' }
  /** The month's credits are gone. A commercial state, not a verdict on the photo. */
  | { kind: 'out_of_credits'; remaining: number; allowance: number }
  /**
   * This account does not have Premium AI — the server's 0203 gate answers with an allowance of 0. Told
   * as "you're out of credits" it read as a used-up month to someone who never had any.
   */
  | { kind: 'not_entitled' }
  /** An image type the reader does not take (a HEIC the browser could not convert). The photo is fine; the format is not. */
  | { kind: 'unsupported_format' }
  /** We reached the server and IT failed — no key, meter down, model error. Not the athlete's connection. */
  | { kind: 'unavailable' }
  /** The app failed. Never conflate with the two above. */
  | { kind: 'offline' };

/** What `program-photo-read` accepts — its `ALLOWED_MEDIA`, word for word. */
export const READABLE_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * The image type from its first bytes, not from the label the blob arrived with.
 *
 * A blob read from a `file://` uri on a phone can come back typed `application/octet-stream`, and a
 * browser labels a HEIC it could not convert `image/heic` or nothing at all. The bytes do not lie, and
 * the model is told the type — sending a PNG as "image/jpeg" is its own failure.
 */
export function sniffMediaType(base64: string): string | null {
  let head: string;
  try {
    head = atob(base64.slice(0, 16)); // the first 12 bytes
  } catch {
    return null;
  }
  if (head.startsWith('\xFF\xD8\xFF')) return 'image/jpeg';
  if (head.startsWith('\x89PNG')) return 'image/png';
  if (head.startsWith('GIF8')) return 'image/gif';
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return 'image/webp';
  if (head.slice(4, 8) === 'ftyp') return `image/${head.slice(8, 12).trim() || 'heic'}`; // HEIC/HEIF/AVIF — refused, and named
  return null;
}

/** The function's JSON body — from a 200 or from a non-2xx alike — as a result. */
export function photoResultFrom(body: unknown): PhotoReadResult {
  if (!body || typeof body !== 'object') return { kind: 'unavailable' };
  const d = body as {
    ok?: boolean;
    tsv?: string;
    rows?: number;
    reason?: string;
    remaining?: number;
    allowance?: number;
  };

  if (d.ok && typeof d.tsv === 'string' && d.tsv.length > 0) {
    return {
      kind: 'ok',
      tsv: d.tsv,
      rows: typeof d.rows === 'number' ? d.rows : 0,
      remaining: typeof d.remaining === 'number' ? d.remaining : null,
    };
  }

  switch (d.reason) {
    case 'not_a_program':
      return { kind: 'not_a_program' };
    case 'unreadable':
      return { kind: 'unreadable' };
    case 'too_large':
      return { kind: 'too_large' };
    case 'out_of_credits':
      // 0203's gate refuses a non-Premium-AI account as (allowed false, allowance 0) — no allowance at
      // all is not a month used up.
      if (!d.allowance) return { kind: 'not_entitled' };
      return { kind: 'out_of_credits', remaining: d.remaining ?? 0, allowance: d.allowance };
    case 'daily_limit':
      return { kind: 'daily_limit' };
    case 'bad_request':
      return { kind: 'unsupported_format' };
    default:
      // `unconfigured`, `meter_unavailable`, `upstream_error`, `upstream_unreachable`, or a reason this
      // build does not know. The server failed; none of it is a statement about the photo, and none of
      // it is the athlete's connection either.
      return { kind: 'unavailable' };
  }
}
