import { Platform } from 'react-native';
/**
 * `expo-file-system` is NOT listed in package.json, deliberately, and this is not an oversight.
 *
 * It ships as a dependency of `expo` itself, so it is installed and autolinked already and is inside
 * build 3 — importing it is not a native change and cannot break an OTA update. LISTING it, however,
 * edits package.json, which `@expo/fingerprint` reads; and the whole lesson of 2026-08-06
 * (`Docs/Release-And-OTA-Runbook.md` § THE TRAP) is that a file with no effect on the binary can still
 * move the fingerprint and cut every existing build off from updates. Add the dependency line in the
 * same commit as the next `eas build`, which re-baselines the fingerprint and makes the edit free.
 */
import { File, UploadType } from 'expo-file-system';

import { supabase } from '@/lib/supabase';
import {
  classifyStatus,
  HARD_TIMEOUT_MS,
  MAX_UPLOAD_ATTEMPTS,
  messageFor,
  retryDelayMs,
  shouldRetry,
  STALL_TIMEOUT_MS,
  tooLargeMessage,
  type UploadErrorKind,
} from '@/lib/storage-upload-core';

export { extensionFor } from '@/lib/storage-upload-core';

/**
 * ONE way to put a file in a Supabase Storage bucket.
 *
 * ══ WHAT THIS REPLACES, AND WHY IT WAS REPORTED AS "NOT EVEN POSTING" ══
 *
 * Both upload paths in the app were the same four lines: `fetch(uri)` → `.blob()` →
 * `supabase.storage.upload(blob)`. That reads the ENTIRE file into the JavaScript heap before a single
 * byte goes anywhere. For a 30-second clip off a modern phone camera that is tens of megabytes of
 * base64-shaped memory on a device that has other plans for it, and when it goes wrong it does not
 * throw — the app dies, or the promise never settles, and the athlete watches a spinner that has
 * already lost. There was also no progress, no timeout, no retry, no cancel, and no size check, so
 * "slow" and "dead" were the same picture.
 *
 * The native path here streams from disk instead: `expo-file-system`'s upload task hands the file to
 * the platform's own URL session, which means constant memory, real byte counts to put in front of the
 * athlete, and a cancel that actually cancels.
 *
 * ══ WHAT IT DOES NOT DO — AND WHAT NOW HAPPENS UPSTREAM INSTEAD ══
 *
 * This still does not compress, and it should not: an upload's job is to move bytes reliably and report
 * honestly about it. But the paragraph that used to sit here — *"nothing in this stack transcodes video…
 * the libraries that would fix that are native dependencies, and this pass ships over the air"* — has
 * been overtaken. `useMediaPicker` transcodes to 720p before an athlete ever reaches this function, so
 * the guard below now refuses a clip that is genuinely too large rather than one that merely came out
 * of a 4K camera.
 *
 * ⚠ THE TRANSCODE IS NATIVE-ONLY AND NEEDS A NEW BUILD. On the web preview, and on any install running
 * an older binary, the old behaviour is exactly what it was — which is why the size guard, its message
 * and the streaming path all stay as they are. They are what catches the clips compression cannot.
 */

export interface UploadOpts {
  /** 0..1, called on every progress tick. Native only — the web branch has no byte-level feedback. */
  onProgress?: (fraction: number) => void;
  /** Cancels the upload, and every remaining retry with it. */
  signal?: AbortSignal;
  /** Refused before a byte moves, with the real number in the message. */
  maxBytes?: number;
  /** Falls back to the file's own type, then to this. */
  contentType?: string;
}

export class UploadError extends Error {
  readonly kind: UploadErrorKind;
  constructor(kind: UploadErrorKind, message?: string) {
    super(message ?? messageFor(kind));
    this.name = 'UploadError';
    this.kind = kind;
  }
}

/**
 * Re-exported, not defined here — the numbers moved to `storage-upload-core` so a `node --test` file can
 * assert against them. Nothing importing them has to know or change.
 *
 * The move had a reason beyond tidiness: `video-compress-core` has to guarantee its "worth compressing"
 * threshold stays well below the ceiling it protects, and it could not read a constant that only exists
 * in a file importing `expo-file-system`. A rule nothing can test is a rule that drifts.
 */
export { MAX_CHECKIN_BYTES, MAX_IMAGE_BYTES } from './storage-upload-core';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** The object's public URL. Bucket-relative, no cache-buster — callers add one if they need it. */
export function publicUrlFor(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const isAbort = (e: unknown): boolean =>
  e instanceof Error && (e.name === 'AbortError' || /abort/i.test(e.message));

/**
 * Upload `uri` to `bucket/path`. Resolves with the object's public URL, or throws an `UploadError`
 * whose `message` is already a sentence an athlete can act on.
 */
export async function uploadToBucket(bucket: string, path: string, uri: string, opts: UploadOpts = {}): Promise<string> {
  const { onProgress, signal, maxBytes, contentType } = opts;

  if (signal?.aborted) throw new UploadError('cancelled');

  /*
   * ⚠ WEB IS CHOSEN HERE, UP FRONT — never as a `catch` fallback.
   *
   * `expo-file-system`'s web implementation does not throw. Its upload task's `start()` logs a warning
   * and RESOLVES with `{ body: '', status: 0, headers: {} }`. A try/catch fallback would therefore
   * never fire: every upload on forgelegacy.expo.app — the surface this project is reviewed on — would
   * report success and store nothing at all. Branching on the platform is the only correct shape.
   */
  if (Platform.OS === 'web') return uploadViaBlob(bucket, path, uri, { maxBytes, contentType, signal });

  const file = new File(uri);
  if (!file.exists) throw new UploadError('network', 'That file is no longer on the device. Try picking it again.');
  if (maxBytes != null && file.size > maxBytes) throw new UploadError('too_large', tooLargeMessage(file.size, maxBytes));

  const mime = contentType ?? 'application/octet-stream';
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  const headers = await authHeaders(mime);

  let lastKind: UploadErrorKind = 'network';
  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await sleep(retryDelayMs(attempt));
      if (signal?.aborted) throw new UploadError('cancelled');
    }
    try {
      await runUpload(file, url, headers, mime, onProgress, signal);
      return publicUrlFor(bucket, path);
    } catch (e) {
      if (e instanceof UploadError) {
        if (!shouldRetry(e.kind)) throw e;
        lastKind = e.kind;
      } else if (isAbort(e)) {
        throw new UploadError('cancelled');
      } else {
        lastKind = 'network';
      }
    }
  }
  throw new UploadError(lastKind);
}

/**
 * One attempt.
 *
 * The stall watchdog is the interesting part. `UploadTask` gives progress ticks and an `AbortSignal`
 * but no notion of "this connection has gone quiet", so the timer is reset on every tick and fires its
 * own abort if one never comes. A wall-clock deadline was rejected deliberately: it would kill a large
 * file on a slow-but-working connection, which is the exact upload this module exists to rescue.
 */
async function runUpload(
  file: File,
  url: string,
  headers: Record<string, string>,
  mime: string,
  onProgress: ((f: number) => void) | undefined,
  outer: AbortSignal | undefined,
): Promise<void> {
  const controller = new AbortController();
  let stalled = false;
  let stallTimer: ReturnType<typeof setTimeout> | undefined;

  const giveUp = () => {
    stalled = true;
    controller.abort();
  };
  const resetStall = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(giveUp, STALL_TIMEOUT_MS);
  };
  const hardTimer = setTimeout(giveUp, HARD_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  outer?.addEventListener('abort', onOuterAbort);
  resetStall();

  try {
    const task = file.createUploadTask(url, {
      httpMethod: 'POST',
      // The Storage object endpoint takes the raw body. MULTIPART would wrap it in form framing that
      // the endpoint does not want, and whose bytes would also show up in the progress figures.
      uploadType: UploadType.BINARY_CONTENT,
      headers,
      mimeType: mime,
      /*
       * `'foreground'`, against the default. A background session may outlive the app, but the JS task
       * is NOT restored if the runtime dies — so its promise, its progress callbacks and its cancel
       * would all be promises this code cannot keep. For a 30-second clip behind a visible progress bar
       * and a Cancel button, foreground is the honest match.
       */
      sessionType: 'foreground',
      signal: controller.signal,
      onProgress: ({ bytesSent, totalBytes }) => {
        resetStall();
        if (totalBytes > 0) onProgress?.(Math.min(1, bytesSent / totalBytes));
      },
    });

    const res = await task.uploadAsync();
    // ⚠ NEVER SKIP THIS. A 413 or a 403 is a RESOLVED promise here — see `classifyStatus`.
    const kind = classifyStatus(res.status);
    if (kind) throw new UploadError(kind, kind === 'too_large' ? 'The server refused that file for being too large.' : undefined);
    onProgress?.(1);
  } catch (e) {
    if (stalled) throw new UploadError('stalled');
    if (outer?.aborted || isAbort(e)) throw new UploadError('cancelled');
    throw e;
  } finally {
    if (stallTimer) clearTimeout(stallTimer);
    clearTimeout(hardTimer);
    outer?.removeEventListener('abort', onOuterAbort);
  }
}

/** The token has to be the SESSION's, not the anon key: 0075 scopes bucket writes to `owner = auth.uid()`. */
async function authHeaders(mime: string): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new UploadError('denied', 'Not signed in');
  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: ANON_KEY,
    'Content-Type': mime,
    'x-upsert': 'true',
    'Cache-Control': 'max-age=3600',
  };
}

/**
 * The web path — unchanged from what shipped, plus the size guard.
 *
 * A browser is not carrying the memory problem the native path had (the blob is backed by the file,
 * not copied into the JS heap the way React Native's fetch does it), so there is nothing here worth
 * replacing. The one thing it still lacks is a real progress figure; that needs `XMLHttpRequest`
 * against the same REST endpoint and is a clean follow-up, not a blocker.
 */
async function uploadViaBlob(
  bucket: string,
  path: string,
  uri: string,
  { maxBytes, contentType, signal }: Pick<UploadOpts, 'maxBytes' | 'contentType' | 'signal'>,
): Promise<string> {
  let blob: Blob;
  try {
    const res = await fetch(uri, signal ? { signal } : undefined);
    blob = await res.blob();
  } catch (e) {
    if (isAbort(e)) throw new UploadError('cancelled');
    throw new UploadError('network', 'Could not read that file.');
  }
  if (maxBytes != null && blob.size > maxBytes) throw new UploadError('too_large', tooLargeMessage(blob.size, maxBytes));
  if (signal?.aborted) throw new UploadError('cancelled');

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || contentType || 'application/octet-stream',
    upsert: true,
  });
  if (error) {
    const status = Number((error as { statusCode?: string | number }).statusCode ?? 0);
    throw new UploadError(classifyStatus(status) ?? 'server', /too large|exceeded/i.test(error.message) ? messageFor('too_large') : undefined);
  }
  return publicUrlFor(bucket, path);
}
