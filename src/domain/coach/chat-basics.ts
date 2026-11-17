/**
 * ══ CHAT BASICS: STOP · REGENERATE · EDIT AND RESEND (AI Road to 10 Sprint 3a, CH-6) ══
 *
 * The thread rules behind the controls on Holt's replies, kept pure so they are tested without the sheet.
 *
 *   · Stop ends the ask through the same abort the sheet's close uses. coach-ask settles it `cancelled` and does
 *     NOT refund it — the model ran for them (Sprint 1 §1: "never on the athlete's own cancel"). A Stop before
 *     the call left the phone costs nothing (no reservation was made).
 *   · What a Stop leaves: the words so far, unless they say nothing (under CUT_OFF_KEEP_CHARS, like a dropped
 *     line) — and ⛔ never words the output scan would have taken back. The scan runs on a FINISHED reply; a
 *     stopped one never finishes, so it is scanned here.
 *   · Regenerate and Edit act only on the LAST AI reply, so the thread never forks: nothing the athlete said
 *     after it, and no card (a change to confirm, a stop, an error) standing under it.
 */
import { withOutputScan } from './ask-stream.ts';
import { CUT_OFF_KEEP_CHARS, type Turn } from './chat-core.ts';

/** What a Stop leaves of the reply that was arriving: its words, nothing, or the medical stop in its place. */
export function afterStop(shown: string, asked: string): 'keep' | 'drop' | 'retract' {
  const said = shown.trim();
  if (said.length < CUT_OFF_KEEP_CHARS) return 'drop';
  const scanned = withOutputScan({ kind: 'answer', text: said, remaining: null, complete: false, cut: false, actions: [] }, asked);
  return scanned.kind === 'retracted' ? 'retract' : 'keep';
}

/**
 * The `sid` of the reply Regenerate and Edit may act on, or null. Holt's own scripted lines after it (the
 * question on the table, "that ran long") and chips may follow it — those are re-said by the new answer.
 */
export function lastReplySid(thread: readonly Turn[]): number | null {
  for (let i = thread.length - 1; i >= 0; i -= 1) {
    const t = thread[i];
    if (t.kind === 'holt' && t.sid != null) return t.streaming ? null : t.sid;
    if (t.kind === 'chips' || t.kind === 'holt') continue;
    return null;
  }
  return null;
}

const replyIndex = (thread: readonly Turn[], sid: number) => thread.findIndex((t) => t.kind === 'holt' && t.sid === sid);

/** Regenerate: the thread without that reply and everything after it. Null when the reply is gone. */
export function withoutReply(thread: readonly Turn[], sid: number): Turn[] | null {
  const i = replyIndex(thread, sid);
  return i < 0 ? null : thread.slice(0, i);
}

/**
 * Edit and resend: the athlete's question that reply answered, and the thread from before it. Null when there is
 * no typed question to edit (the reply came from a chip, or the question carried a picture).
 */
export function questionOf(thread: readonly Turn[], sid: number): { text: string; before: Turn[] } | null {
  const i = replyIndex(thread, sid);
  for (let j = i - 1; j >= 0; j -= 1) {
    const t = thread[j];
    if (t.kind === 'me') return t.picture || t.stopped ? null : { text: t.text, before: thread.slice(0, j) };
    if (t.kind !== 'holt' && t.kind !== 'chips') return null;
  }
  return null;
}
