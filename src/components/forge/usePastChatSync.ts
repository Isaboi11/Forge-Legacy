import { useEffect } from 'react';

import type { Turn } from '@/domain/coach/chat-core';
import type { ThreadPlace } from '@/domain/coach/thread-lifecycle';
import { pastChatRow, rowSignature, threadFrom } from '@/domain/coach/past-chats';
import { isForgottenChat, savePastChat, writePastChatSummary, type PastChat } from '@/data/holt-past-chats-live';
import { afterThreadEnds, continueThread, ensureChatId, heldPlace, type EndedThread } from '@/lib/coach-thread';
import { track } from '@/lib/analytics';

/**
 * ══ PAST CHATS — keeping the row in step with the conversation (AI Road to 10 Sprint 4b §1.5, CH-4) ══
 *
 * Mounted ONCE in `CoachChatSheet` (`usePastChatSync(thread, premiumAi)`), and that is the whole of its footprint
 * there. What it does:
 *
 *   · THE CHAT ID AT THE FIRST ATHLETE LINE — `ensureChatId` (coach-thread), which keeps it in the thread's stored
 *     place so a relaunch, a hand-off and "Continue this chat" all keep writing the SAME row.
 *   · A DEBOUNCED SAVE after each finished reply (never while one is still arriving) — upsert of the whole row.
 *   · ONE LAST SAVE WHEN THE CHAT ENDS, then the summary: `afterThreadEnds` hands over the summariser's outcome
 *     (`summarizeChat`'s `SummarizeResult`), and its `summary` is written onto the row (§1.6).
 *
 * Saves are SERIAL (one chain): a debounced save that is still in flight can never land after the final one and
 * shrink the row back. `savePastChat` itself checks "Holt remembers" (0278) on every save.
 *
 * ⚠ ENABLED = PREMIUM AI. Past chats are Holt's memory, and "Holt remembers" is the Premium AI half of him (the
 *   summaries, the notes) — so a tap-only chat is not stored. ⚠ NEVER UNREGISTERED ON UNMOUNT, like
 *   `whenThreadEnds`: the unmount cleanup is itself one of the ends.
 */
export function usePastChatSync(thread: readonly Turn[], enabled: boolean): void {
  useEffect(() => {
    afterThreadEnds(enabled ? onThreadEnded : null);
  }, [enabled]);
  useEffect(() => {
    if (enabled) queuePastChatSave(thread);
  }, [thread, enabled]);
}

/** How long after the last change a chat is saved. The typewriter and a burst of cards settle well inside it. */
export const PAST_CHAT_SAVE_DEBOUNCE_MS = 1500;

let timer: ReturnType<typeof setTimeout> | null = null;
/** The newest thread the sheet holds for the chat on screen — fuller than the device copy (which trims at 100). */
let latest: { id: string; thread: readonly Turn[] } | null = null;
let chain: Promise<unknown> = Promise.resolve();
const lastSaved = new Map<string, string>();

type Held = Pick<ThreadPlace, 'chatId' | 'recap' | 'continued'> | null;

function saveNow(id: string, thread: readonly Turn[], held: Held): Promise<unknown> {
  chain = chain.then(async () => {
    if (isForgottenChat(id)) return;
    const row = pastChatRow({
      id,
      thread,
      recap: held?.recap ?? null,
      head: held?.chatId === id ? (held.continued?.head ?? null) : null,
    });
    if (!row) return;
    const sig = rowSignature(row);
    if (lastSaved.get(id) === sig) return;
    if ((await savePastChat(row)) === 'saved') lastSaved.set(id, sig);
  }).catch(() => undefined);
  return chain;
}

function queuePastChatSave(thread: readonly Turn[]): void {
  const id = ensureChatId(thread as Turn[]);
  if (!id) return;
  latest = { id, thread };
  /* After each FINISHED reply: a stream still arriving is saved when it ends. */
  if (thread.some((t) => t.kind === 'holt' && t.streaming)) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const held = heldPlace();
    /* The chat on screen moved on (ended, continued another) while this waited — its own end saved it. */
    if (!latest || held?.chatId !== latest.id) return;
    void saveNow(latest.id, latest.thread, held);
  }, PAST_CHAT_SAVE_DEBOUNCE_MS);
}

const summaryOf = (outcome: unknown): string | null => {
  const s = (outcome as { summary?: unknown } | null | undefined)?.summary;
  return typeof s === 'string' && s.trim() ? s : null;
};

function onThreadEnded(ended: EndedThread): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const id = ended.place?.chatId;
  const thread = latest && latest.id === id ? latest.thread : ended.turns;
  latest = null;
  if (!id || isForgottenChat(id)) return;
  const saved = saveNow(id, thread, ended.place);
  void Promise.all([saved, ended.outcome]).then(([, outcome]) => {
    const summary = summaryOf(outcome);
    if (summary) return writePastChatSummary(id, summary);
    return undefined;
  });
}

/* ── continue this chat ──────────────────────────────────────────────────────────────────────────────── */

/**
 * §1.5 — **Continue this chat**: the conversation on the phone ends as usual (its summary, its last save), and
 * this stored chat — its lines, its recap, its chat id, and the stored row as the head every later save builds
 * on — becomes the thread. The caller then opens the sheet (`openCoach()` + Home), which restores it.
 */
export async function continuePastChat(chat: PastChat): Promise<boolean> {
  const turns = threadFrom(chat.turns);
  if (!turns.some((t) => t.kind === 'me')) return false;
  const place: ThreadPlace = { mode: null, constraints: {}, chatId: chat.id, continued: { head: chat.turns } };
  if (chat.recap) place.recap = chat.recap;
  const ok = await continueThread(turns, place);
  if (ok) trackPastChat('continued');
  return ok;
}

/** §1.9 — `holt_past_chat`: what happened, and for a search how many came back. Never a word of any chat. */
export function trackPastChat(kind: 'opened' | 'searched' | 'continued' | 'deleted', count?: number): void {
  track('holt_past_chat', count == null ? { kind } : { kind, count });
}
