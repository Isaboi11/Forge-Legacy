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
 * ══ THE CHAT AS THE END-OF-CHAT SUMMARY READS IT (QA holtai-13) ══
 *
 * The summariser only ever saw the words, so what the APP did was invisible to it: a request that failed
 * shows up as an error card, a plan is a card, and whether that plan was saved is a `saved` line — none of
 * them words. It read "build it around dumbbells" and wrote that it had happened; it read Holt presenting a
 * block and wrote "built and underway", for a block that was discarded. So the outcomes go in too, as short
 * bracketed notes in Holt's column that say plainly what the app did and did not do. `SUMMARY_SYSTEM`
 * (`ask-tools.ts`) tells the summariser what the brackets mean.
 *
 * Same stop rule as `askHistory` — a stopped line and the reply to it never leave the phone.
 */
export function summaryHistory(thread: readonly Turn[]): AskTurn[] {
  const out: AskTurn[] = [];
  const note = (text: string) => out.push({ role: 'holt', text: `[${text}]` });
  for (const x of thread) {
    switch (x.kind) {
      case 'me':
        if (!x.stopped && x.text.trim()) out.push({ role: 'athlete', text: x.text });
        break;
      case 'holt':
        if (x.text.trim()) out.push({ role: 'holt', text: x.text });
        break;
      case 'error':
        note(`The app: that did not work — ${x.text.trim()} Nothing was changed.`);
        break;
      case 'saved':
        note(`The app: ${x.text.trim()}`);
        break;
      case 'program':
      case 'day':
      case 'pick':
        note(`The app showed "${x.card.title}" as a card. Not started or saved unless a later note says so.`);
        break;
      case 'refusal':
        note(`The app: Holt could not do that — ${x.card.title}.`);
        break;
      default:
        break;
    }
  }
  return withoutStoppedTurns(out);
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
