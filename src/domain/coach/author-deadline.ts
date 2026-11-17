/**
 * HOW LONG HOLT MAY TAKE TO WRITE IT — the device's deadline on `coach-author` (AI audit 11-16, B-D8).
 *
 * The sheet sat on "building" until the network itself gave up — a minute or more on a bad gym signal, with the
 * composer locked. After `AUTHOR_TIMEOUT_MS` the request is aborted and the answer is `unavailable`, so the caller
 * builds from the rulebook and says so (`authorFallbackLine`'s "couldn't write that one out just now"), exactly as
 * for any other failure.
 *
 * ⚠ ITS OWN MODULE ON PURPOSE. `author.ts` is inlined into the function's dashboard paste copy
 * (`scripts/build-coach-author-deploy.mjs`); a device-only deadline has no business in the server's bundle.
 *
 * ⚠ A WRITE THE SERVER FINISHES AFTER THE DEADLINE MAY STILL SPEND ITS CREDIT — `coach-author` reserves one before it
 * calls the model and has no refund path. That is B-D8's server half, not this one.
 */

import type { AuthorResult } from './author.ts';

export const AUTHOR_TIMEOUT_MS = 30_000;

/**
 * `call`, or `unavailable` once `ms` have passed. Raced as well as aborted: React Native's `AbortSignal` is a
 * polyfill, and the answer must not wait on it. An error the abort itself causes reads as the timeout it is, not as
 * "no connection".
 */
export async function authorWithin(ms: number, call: (signal: AbortSignal) => Promise<AuthorResult>): Promise<AuthorResult> {
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<AuthorResult>((resolve) => {
    timer = setTimeout(() => {
      abort.abort();
      resolve({ kind: 'unavailable' });
    }, ms);
  });
  const work = call(abort.signal).then(
    (r): AuthorResult => (abort.signal.aborted ? { kind: 'unavailable' } : r),
    (): AuthorResult => (abort.signal.aborted ? { kind: 'unavailable' } : { kind: 'offline' }),
  );
  try {
    return await Promise.race([work, late]);
  } finally {
    clearTimeout(timer);
  }
}
