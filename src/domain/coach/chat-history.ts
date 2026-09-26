/**
 * ══ THE ONE PLACE A CHAT BECOMES HISTORY FOR A MODEL ══
 *
 * Every request that carries this conversation — `coach-ask` (the question and the kitchen fallback),
 * `coach-interpret`, and the end-of-chat summary — builds its history HERE, so a future caller cannot forget
 * the rule below.
 *
 * ⛔ A STOPPED MESSAGE NEVER LEAVES THE PHONE AGAIN (QA R2-F1, 2026-09-26; PO medical rule 09-22).
 * "I'm 20 weeks pregnant" was stopped, then rode along in the history of the next ordinary question and
 * Holt answered the pregnancy. Two locks:
 *   1. The turn the app stopped is MARKED where it is stopped (`markStopped`) and dropped here.
 *   2. Every remaining turn is run through the same code guard the question goes through
 *      (`withoutStoppedTurns`) — which also covers threads stored before the mark existed.
 * The Edge Functions run lock 2 again on whatever arrives; a client is not a boundary.
 *
 * Stop cards are `stop` turns and never qualify. The `holt` arm is load-bearing: the Training Gaps answer
 * reaches a follow-up only as a `holt` turn (`training-gaps.test.mjs`).
 *
 * Pure and import-clean (relative imports only) so `node --test` can run it.
 */
import type { Turn } from './chat-core.ts';
import type { AskTurn } from './ask-wire.ts';
import { withoutStoppedTurns } from './medical-routing.ts';

/** How many spoken turns a question carries (CA-D1). The server trims again. */
export const CHAT_HISTORY_TURNS = 8;

/**
 * The spoken turns of `thread` as a model may see them: athlete and Holt lines only, nothing stopped,
 * newest `max` kept (after the drop, so the window stays full).
 */
export function askHistory(thread: readonly Turn[], max: number = CHAT_HISTORY_TURNS): AskTurn[] {
  const spoken: AskTurn[] = [];
  for (const x of thread) {
    if (x.kind !== 'me' && x.kind !== 'holt') continue;
    if (x.text.trim() === '') continue;
    if (x.kind === 'me' && x.stopped) continue;
    spoken.push({ role: x.kind === 'me' ? 'athlete' : 'holt', text: x.text });
  }
  const safe = withoutStoppedTurns(spoken);
  return max === Infinity ? safe : safe.slice(-Math.max(0, max));
}

/**
 * `thread` with the athlete's line `said` marked stopped — every unmarked `me` turn with those exact
 * words, since the same words would stop again. Returns the same array when nothing changed.
 */
export function markStopped(thread: Turn[], said: string): Turn[] {
  const words = said.trim();
  if (!words) return thread;
  let changed = false;
  const next = thread.map((x) => {
    if (x.kind !== 'me' || x.stopped || x.text.trim() !== words) return x;
    changed = true;
    return { ...x, stopped: true };
  });
  return changed ? next : thread;
}
