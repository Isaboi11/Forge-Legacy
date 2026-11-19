import { useCallback, useEffect, useRef, useState } from 'react';

import type { Turn } from '@/domain/coach/chat-core';
import type { ChatRecap } from '@/domain/coach/holt-memory';
import { earlierFor, liveRecap, planRecap } from '@/domain/coach/chat-history';
import { clearKeptNotice, readKeptNotice, recapChat } from '@/data/holt-chats-live';
import { loadThreadPlace } from '@/lib/coach-thread';

/**
 * ══ HOLT REMEMBERS THIS CHAT — the sheet's one memory hook (AI Road to 10 Sprint 4b §1.2, §1.3; lane A) ══
 *
 * Mounted in `CoachChatSheet` with a few lines (the sheet is shared with lane B — everything else lives here):
 *
 *   recap     — the rolling recap of this chat's older turns, for the sheet to keep in its stored place
 *               (`ThreadPlace.recap`). Restored from that place when the sheet opens.
 *   earlier   — what the next question sends as `earlier` (`earlierFor`: only once something fell out of the window).
 *   kept      — "Holt kept N things from your last chat", read once when the sheet opens (then cleared), or null.
 *   dismissKept / restore — for the line's tap, and for a continued past chat (lane B) to hand its recap over.
 *
 * When a reply has finished and ≥ RECAP_BATCH spoken turns have fallen out of the window uncovered (`planRecap`), it
 * folds them with ONE fire-and-forget `recapChat` — never awaited by a question, never shown; a failure keeps the old
 * recap (and is not retried for the same turns). Runs whether memory is on or off: it is this chat's own words (§1.2).
 * `enabled` is Premium AI (the only athletes whose questions reach coach-ask).
 *
 * ⚠ Strict react-hooks: no synchronous setState in an effect (each set is in a promise's callback), no ref read in
 * render (refs are read and written only inside effects and callbacks).
 */
export function useChatRecap(thread: Turn[], { enabled }: { enabled: boolean }) {
  const [recap, setRecap] = useState<ChatRecap | null>(null);
  const [kept, setKept] = useState<number | null>(null);
  /** A fold in flight, the `through` that last failed, and the chat the fold was asked for. */
  const busy = useRef(false);
  const failedAt = useRef<number | null>(null);
  const latest = useRef<Turn[]>(thread);
  const ctl = useRef<AbortController | null>(null);

  /* Open: the stored recap (it is only used while it still belongs to the thread — `liveRecap`), and the kept line. */
  useEffect(() => {
    let alive = true;
    void loadThreadPlace().then((place) => {
      if (alive && place?.recap) setRecap((now) => now ?? place.recap ?? null);
    });
    void readKeptNotice().then((n) => {
      if (!alive || !n) return;
      setKept(n);
      void clearKeptNotice();
    });
    return () => {
      alive = false;
      ctl.current?.abort();
    };
  }, []);

  useEffect(() => {
    latest.current = thread;
    if (!enabled || busy.current) return;
    const plan = planRecap(thread, recap);
    if (!plan || failedAt.current === plan.through) return;
    busy.current = true;
    const controller = new AbortController();
    ctl.current = controller;
    const first = firstLine(thread);
    void recapChat(liveRecap(thread, recap)?.text ?? null, plan.turns, { signal: controller.signal }).then((text) => {
      busy.current = false;
      if (controller.signal.aborted) return;
      /* The chat it was written for is still the one on screen — a new chat never inherits an old recap. */
      if (firstLine(latest.current) !== first) return;
      if (text) setRecap({ text, through: plan.through });
      else failedAt.current = plan.through;
    });
  }, [thread, recap, enabled]);

  const dismissKept = useCallback(() => {
    setKept(null);
    void clearKeptNotice();
  }, []);
  const restore = useCallback((r: ChatRecap | null) => setRecap(r), []);

  const live = liveRecap(thread, recap);
  return { recap: live, earlier: earlierFor(thread, live), kept, dismissKept, restore };
}

/** Which chat this is: its first athlete line (and when it was said). A new or continued chat has another. */
function firstLine(thread: readonly Turn[]): string {
  const t = thread.find((x) => x.kind === 'me');
  return t && t.kind === 'me' ? `${t.at ?? ''}|${t.text}` : '';
}
