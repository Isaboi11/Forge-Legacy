/**
 * ONE id for one sitting, shared by everything that records anything.
 *
 * ══ WHY THIS WAS PULLED OUT OF `analytics.ts` ══
 *
 * It used to be a private `sessionId` in that module. It is here now because a second subsystem needs
 * the SAME value, and a copy would have quietly defeated the point.
 *
 * `client_errors.session_id` (0176) and `app_events.session_id` (0131) are the same column on purpose.
 * That is what lets an error row join back to the athlete's product-usage trail for the same sitting —
 * so when the 40 breadcrumbs a crash report carries are not enough, the whole session is still there to
 * read behind it. Two independently-minted ids would have made that join return nothing, and nobody
 * would have noticed until the day it was needed.
 *
 * ══ THE 30-MINUTE RULE ══
 *
 * A new session after 30 minutes backgrounded — the same rule most analytics tools use, chosen so
 * "session length" means a sitting rather than a calendar day. Unchanged from the original.
 *
 * ══ ⚠ NOT A DEVICE ID ══
 *
 * Random per sitting, minted on the client, not derived from hardware, not stable across sessions. The
 * privacy policy says that in as many words and `0131`'s header repeats it. Nothing here may ever become
 * stable — an id that survives a session is a tracking identifier, whatever it is called.
 */

const SESSION_GAP_MS = 30 * 60_000;

let sessionId: string | null = null;
let sessionStartedAt = 0;
let lastBackgroundedAt = 0;

/** `crypto.randomUUID` is not on every runtime this ships to; this only needs to be unique, not secret. */
export function uuid(): string {
  try {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    /* fall through */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * The current sitting's id, minting one if this is the first call or the app was away long enough.
 *
 * Synchronous and total — it cannot throw and cannot return null. The error reporter calls this while
 * handling a crash, which is the worst possible moment to need an await or a fallback branch.
 */
export function currentAppSession(): string {
  if (!sessionId || (lastBackgroundedAt && Date.now() - lastBackgroundedAt > SESSION_GAP_MS)) {
    sessionId = uuid();
    sessionStartedAt = Date.now();
    lastBackgroundedAt = 0;
  }
  return sessionId;
}

/** When the current sitting began, epoch ms. 0 before the first `currentAppSession()`. */
export function sessionStartedMs(): number {
  return sessionStartedAt;
}

/** Called from the AppState listener in `analytics.ts` — the clock the 30-minute rule reads. */
export function noteBackgrounded(): void {
  lastBackgroundedAt = Date.now();
}

/**
 * End the sitting (sign-out).
 *
 * ⚠ The NEXT call to `currentAppSession()` mints a fresh id rather than returning null — a crash during
 *   sign-out still has somewhere to belong, and a reporter that has to handle a null session is a
 *   reporter with a branch that only runs on the worst day.
 */
export function endAppSession(): void {
  sessionId = null;
  sessionStartedAt = 0;
  lastBackgroundedAt = 0;
}
