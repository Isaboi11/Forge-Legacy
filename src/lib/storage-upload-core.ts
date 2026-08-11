/**
 * storage-upload-core — the decisions an upload makes, with no React Native in them.
 *
 * Split out from `storage-upload.ts` for the same reason `image-downscale-core.ts` is split from the
 * picker: the rules that decide whether to retry, what to call a failure, and what to tell the athlete
 * are the part worth a test, and they cannot be tested through `expo-file-system`.
 */

/**
 * What went wrong, in the only terms the caller has to care about.
 *
 * `stalled` is deliberately distinct from `network`. A stalled upload is one where bytes stopped
 * moving while the request stayed open — the case that produced "it just spins forever", and the case
 * a plain `fetch` cannot even detect.
 */
export type UploadErrorKind = 'too_large' | 'network' | 'stalled' | 'cancelled' | 'denied' | 'server';

/**
 * 50 MB. Matches the `squad-media` bucket's `file_size_limit`, set in 0122 so the two cannot drift.
 *
 * Here rather than in `storage-upload.ts` so that pure code can read it — `video-compress-core` asserts
 * its compression threshold stays comfortably below this ceiling, and a rule nothing can test is a rule
 * that drifts. `storage-upload.ts` re-exports it, so every existing import site is unchanged.
 */
export const MAX_CHECKIN_BYTES = 50 * 1024 * 1024;

/** Photos are already downscaled by `useMediaPicker`; this is a backstop against a stray original. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Map an HTTP status onto a failure kind.
 *
 * ⚠ THIS EXISTS BECAUSE A FAILED UPLOAD USED TO LOOK LIKE A SUCCESSFUL ONE. `UploadTask.uploadAsync()`
 * resolves for "completed HTTP responses, INCLUDING non-2xx status codes" — its own words. A 413 from
 * the storage bucket's size limit and a 403 from an RLS policy are both resolved promises carrying a
 * body nobody reads. Every caller must run the status through here; nothing else distinguishes a stored
 * object from a rejected one.
 */
export function classifyStatus(status: number): UploadErrorKind | null {
  if (status >= 200 && status < 300) return null;
  if (status === 413) return 'too_large';
  if (status === 401 || status === 403) return 'denied';
  if (status >= 500) return 'server';
  /*
   * 0 is the `expo-file-system` WEB STUB's resolved status — `{ body: '', status: 0, headers: {} }`,
   * returned after a console warning. It is not a real response and it must never read as one. The web
   * branch is chosen up front in `storage-upload.ts` so this should be unreachable; it is classified
   * anyway, because "unreachable" is exactly what the previous version of this bug was called.
   */
  if (status === 0) return 'network';
  return 'server';
}

/**
 * Whether a failure is worth trying again.
 *
 * A 4xx is a decision, not a hiccup — retrying a 413 or a 403 turns one clear failure into three slow
 * ones. `cancelled` is the athlete's own choice and is never second-guessed.
 */
export function shouldRetry(kind: UploadErrorKind): boolean {
  return kind === 'network' || kind === 'stalled' || kind === 'server';
}

/** Backoff before attempt `n` (1-based). Short, because someone is watching a progress bar. */
export function retryDelayMs(attempt: number): number {
  return attempt <= 1 ? 0 : attempt === 2 ? 1000 : 3000;
}

export const MAX_UPLOAD_ATTEMPTS = 3;

/** Human size, to one decimal above a megabyte. Used in the message, so it has to read like a number. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return mb >= 100 ? `${Math.round(mb)} MB` : `${Math.round(mb * 10) / 10} MB`;
}

/**
 * The sentence shown when a clip is over the cap.
 *
 * It names the ACTUAL size, because "too large" on its own leaves the athlete with no idea whether they
 * are 2 MB over or 100, and no idea what to do about it. The advice is the one lever that works on both
 * platforms: recording in the app is capped at 30 seconds, whereas a library clip is whatever the phone
 * saved.
 */
export function tooLargeMessage(actualBytes: number, maxBytes: number): string {
  return `That clip is ${formatBytes(actualBytes)} — check-ins are capped at ${formatBytes(maxBytes)}. Record it in the app rather than picking from your library, or trim it first.`;
}

/** The sentence for every other kind. One line, no error codes, always says what to do next. */
export function messageFor(kind: UploadErrorKind): string {
  switch (kind) {
    case 'too_large':
      return 'That file is too large to upload.';
    case 'network':
      return "Couldn't reach the server. Check your connection and try again.";
    case 'stalled':
      return 'The upload stopped part-way. Try again on a stronger connection.';
    case 'cancelled':
      return 'Upload cancelled.';
    case 'denied':
      return "You're not signed in to upload that. Sign out and back in, then try again.";
    case 'server':
      return 'The server refused the upload. Try again in a moment.';
  }
}

/**
 * File extension for a stored object, from its MIME type.
 *
 * The bucket is public and the URL is rendered by `expo-video`, which reads the extension when the
 * server's own content type is unhelpful — so a `.mov` recorded on an iPhone has to stay a `.mov`.
 */
export function extensionFor(mimeType: string | null | undefined, fallback: string): string {
  const t = (mimeType ?? '').toLowerCase();
  if (t.includes('quicktime')) return 'mov';
  if (t.includes('mp4')) return 'mp4';
  if (t.includes('png')) return 'png';
  if (t.includes('webp')) return 'webp';
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
  return fallback;
}

/**
 * How long to wait for the next progress tick before calling an upload dead.
 *
 * A STALL TIMEOUT, NOT A DEADLINE. A wall-clock limit punishes a large file on a slow-but-working
 * connection, which is the exact case this whole module exists to survive; watching the gaps BETWEEN
 * ticks separates "slow" from "dead" without caring how big the file is.
 */
export const STALL_TIMEOUT_MS = 20_000;

/** A backstop for a connection that trickles forever without ever going quiet enough to stall. */
export const HARD_TIMEOUT_MS = 180_000;
