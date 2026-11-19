import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Turn } from '@/domain/coach/chat-core';
/* ⚠ RELATIVE AND WITH THE EXTENSION, NOT `@/`. The `@/` alias above it is a TYPE import and is erased;
   this one is a runtime import, and `node --test` cannot resolve the alias — `intro.test.mjs` reaches
   this file through the chat core and died with ERR_MODULE_NOT_FOUND the moment this was written as
   `@/domain/...`. Every runtime cross-import in `src/domain` is written this way for the same reason. */
import { allowWrites, mayPersist, readThreadPlace, stopWrites, withHeldPlace, type ThreadPlace } from '../domain/coach/thread-lifecycle.ts';
import { withoutPartialReplies } from '../domain/coach/chat-core.ts';
// The app's own id minter (Hermes has no `crypto.randomUUID` everywhere) — import-free, so node can load it too.
import { uuid } from './app-session.ts';

/**
 * The conversation, kept between visits.
 *
 * ══ WHY IT PERSISTS (PROMPT §15.1–15.3) ══
 *
 * One rolling thread per athlete. It survives leaving the app, and — the part that actually matters — it
 * survives leaving for the Program Builder and coming back, so the outcome can be written into the
 * conversation that produced it. A coach who forgets the last five minutes every time you glance at
 * something else is not a coach.
 *
 * Device-local, like the Builder's own draft: this is a working surface, not a record. Nothing here is
 * training history, and the programs it produces are saved through the Builder like everything else.
 *
 * ⚠ TRIMMED, per §15.6. A thread past ~100 turns is a scroll-performance problem and, worse, a JSON blob
 * that grows without bound in device storage. The OLDEST turns go: the recent ones are the conversation,
 * and the introduction is not worth carrying forever.
 */
const KEY = 'forge_coach_thread_v1';
/*
 * ⚠ SEPARATE FROM THE THREAD, BECAUSE THE THREAD CANNOT ANSWER THIS.
 *
 * "Have we met" is not "is there a conversation stored": somebody can open Holt, read the introduction,
 * close him, and never say a word. The thread is correctly empty and they have still met him — replaying
 * the introduction at them would be the app forgetting a conversation they remember having.
 */
const MET_KEY = 'forge_coach_met_v1';
/** The mode and the answers so far, beside the words (QA holt-08) — see `ThreadPlace`. */
const PLACE_KEY = 'forge_coach_thread_place_v1';
const MAX_TURNS = 100;

/** The conversation as last saved — what `endThread` hands to whoever remembers it. */
let current: Turn[] | null = null;
/* Whatever the summariser returns (`summarizeChat`'s promise) is handed on to `afterEnd` as the outcome. */
let onEnd: ((turns: Turn[]) => unknown) | null = null;

/**
 * Sprint 4b §1.5 — the halves of the stored place the SHEET does not hold: this chat's id in `holt_chats` (minted
 * here at the first athlete line), the recap, and a continued chat's head. Merged into every place written
 * (`withHeldPlace`), restored with the thread, forgotten with it.
 */
let held: Pick<ThreadPlace, 'chatId' | 'recap' | 'continued'> | null = null;

/** A conversation that just ended, as `afterThreadEnds` is told it. */
export interface EndedThread {
  turns: Turn[];
  place: ThreadPlace | null;
  /** What the summariser returned (its `SummarizeResult` once it settles), or undefined. Never rejects. */
  outcome: Promise<unknown>;
}
let afterEnd: ((ended: EndedThread) => void) | null = null;

const holdFrom = (p: ThreadPlace | null): typeof held =>
  p ? { chatId: p.chatId, recap: p.recap, continued: p.continued } : null;

/**
 * ⚠ **A STORED INTRODUCTION IS NOT A CONVERSATION, AND TREATING IT AS ONE BRICKED THE SHEET.**
 *
 * The thread saves on every change, so it saved the introduction as it was still arriving. Close Holt
 * within about two seconds of opening him — which is exactly what a first look at a new screen is — and
 * what persisted was a single line: *"I'm Holt."*
 *
 * On the next open that thread was restored AND the intro was switched off, because a restored
 * conversation should not replay an introduction over the top of it. So beats two and three never
 * arrived, the opener chips they end with never arrived, and the athlete was left with one sentence, no
 * pills, and nothing to tap. **Permanently** — every subsequent open re-saved the same single line, so
 * the sheet could not recover on its own and reinstalling would not have cleared it either.
 *
 * The rule that fixes it and also RESCUES a device already stuck: a thread is worth restoring only once
 * the athlete has put something in it. Every real interaction produces a `me` turn — tapping a chip
 * echoes one exactly like typing does — so until one exists there is nothing to remember, and the
 * introduction should simply run again.
 */
export const isConversation = (turns: Turn[]): boolean => turns.some((t) => t.kind === 'me');

export async function loadThread(): Promise<Turn[] | null> {
  /* A sheet is opening and asking for the thread — whatever ended the last conversation is spent. */
  allowWrites();
  held = null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Turn[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (!isConversation(parsed)) return null;
    /* The chat id (and recap, and a continued chat's head) come back WITH the words — only with them. */
    held = holdFrom(readThreadPlace(await AsyncStorage.getItem(PLACE_KEY)));
    /* A thread saved before `saveThread` stripped them can still hold a reply marked "still arriving" — a
       cut-off answer, which is dropped rather than restored as finished (kitchen-09). */
    return withoutPartialReplies(parsed).map((t) => (t.kind === 'holt' && (t.streaming || t.sid != null) ? { ...t, streaming: undefined, sid: undefined } : t));
  } catch {
    // A thread we cannot read is a thread we start again — never an error in the athlete's face.
    return null;
  }
}

export async function saveThread(turns: Turn[], place?: ThreadPlace): Promise<void> {
  try {
    /* ⚠ A CLEARED CONVERSATION STAYS CLEARED. `clearThread` closes this gate, so a `say()` that resolves
       after the athlete closed him cannot write the thread back — which is what made "closing him"
       appear not to work at all, even though the `removeItem` had always run. */
    if (!mayPersist()) return;
    /* Nothing to keep until the athlete has said something — and writing a half-arrived introduction is
       what caused the bug above. `loadThread` would ignore it now anyway; not writing it keeps the
       stored thread honest rather than relying on the reader to disbelieve it. */
    if (!isConversation(turns)) return;
    /* `live` is a transient — it means "this line is typing itself right now". Persisting it would make
       every restored line replay its typewriter, so the conversation would appear to be written afresh
       each time the sheet opens. */
    /* `streaming` and `sid` are transients of the same kind: a reply saved mid-stream would restore as
       "still arriving" forever and hold every message behind it (QA R2-F5). */
    /* ⚠ A REPLY STILL ARRIVING IS NOT SAVED AT ALL (kitchen-09, QA 09-26): closing mid-stream kept "N" as
       Holt's whole answer. The finished reply is saved on the next write, when its stream ends. */
    const settled = withoutPartialReplies(turns.slice(-MAX_TURNS))
      .map((t) => (t.kind === 'holt' ? { ...t, live: false, streaming: undefined, sid: undefined } : t));
    current = settled;
    /* Sprint 4b §1.5: the chat gets its id at its first athlete line — this is the first save that has one. */
    if (!held?.chatId) held = { ...held, chatId: uuid() };
    await AsyncStorage.setItem(KEY, JSON.stringify(settled));
    if (place) {
      const full = withHeldPlace(place, held);
      held = holdFrom(full);
      await AsyncStorage.setItem(PLACE_KEY, JSON.stringify(full));
    }
  } catch {
    // Best-effort: losing the thread costs the conversation, never the training.
  }
}

/**
 * Where the restored conversation had got to (QA holt-08). Read only alongside a restored thread — on its
 * own it is a set of answers to questions nobody can see.
 */
export async function loadThreadPlace(): Promise<ThreadPlace | null> {
  try {
    return readThreadPlace(await AsyncStorage.getItem(PLACE_KEY));
  } catch {
    return null;
  }
}

/**
 * Who is told when a conversation ENDS (Coach-AI-Amendment-002: Holt keeps a short summary of each chat).
 * The sheet registers the summariser here; `null` unregisters. Module-level rather than a ref in the
 * sheet, because `collapse` runs inside `PanResponder` and the unmount cleanup runs after the sheet's own
 * effects are gone — both reach this, neither can reach a component.
 */
export function whenThreadEnds(fn: ((turns: Turn[]) => unknown) | null): void {
  onEnd = fn;
}

/**
 * Sprint 4b §1.5 — who ELSE is told when a conversation ends: the past-chat sync (`usePastChatSync`), which saves
 * the row one last time and writes the summary onto it when the summariser's `outcome` settles. A second slot
 * rather than a second job inside the summariser, so neither can stop the other; `null` unregisters.
 */
export function afterThreadEnds(fn: ((ended: EndedThread) => void) | null): void {
  afterEnd = fn;
}

/**
 * Sprint 4b §1.5 — this conversation's row in `holt_chats`, minting it if this is its first athlete line. Null
 * when the conversation has been ended (the write gate is shut) or has no athlete line yet: nothing to keep.
 */
export function ensureChatId(turns: Turn[]): string | null {
  if (!mayPersist() || !isConversation(turns)) return null;
  if (!held?.chatId) held = { ...held, chatId: uuid() };
  return held.chatId ?? null;
}

/** The stored place's held half as it stands — the chat id, the recap, a continued chat's head. */
export function heldPlace(): Pick<ThreadPlace, 'chatId' | 'recap' | 'continued'> | null {
  return held;
}

/**
 * Sprint 4b §1.5 — **Continue this chat.** The conversation on the device ends as usual (the summariser and the
 * past-chat sync are told, then it is cleared), and `turns` + `place` (the stored chat's lines, its recap, its
 * chat id and head) are written as the thread, for the sheet to restore when it next opens.
 *
 * ⚠ THE SAME CHAT IS NOT ENDED. When the thread on the device already IS this chat (it was handed off to look at
 * the list), it is kept as it is — it is the fresher copy — and nothing is written.
 *
 * ⚠ A THREAD ONLY IN STORAGE IS ENDED TOO. `current` is set by `saveThread`, so after a relaunch it is empty
 * while a handed-off thread still sits in storage; it is read back first so it is summarised and saved rather
 * than silently overwritten.
 */
export async function continueThread(turns: Turn[], place: ThreadPlace): Promise<boolean> {
  if (!current) {
    try {
      const [raw, rawPlace] = await Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(PLACE_KEY)]);
      const parsed = raw ? (JSON.parse(raw) as Turn[]) : null;
      if (Array.isArray(parsed) && isConversation(parsed)) {
        current = withoutPartialReplies(parsed);
        held = holdFrom(readThreadPlace(rawPlace)) ?? { chatId: uuid() };
        if (!held.chatId) held = { ...held, chatId: uuid() };
      }
    } catch {
      // Unreadable is nothing to end.
    }
  }
  if (current && place.chatId && held?.chatId === place.chatId) return true;
  await endThread();
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(turns.slice(-MAX_TURNS)));
    await AsyncStorage.setItem(PLACE_KEY, JSON.stringify(place));
    held = holdFrom(place);
    /* Somebody with past chats has met him — the introduction must not play over the chat they asked for. */
    await rememberMetHolt();
    return true;
  } catch {
    return false;
  }
}

/**
 * The athlete ENDED the conversation (closed Holt, started a new chat, or the sheet went away) — tell the
 * summariser, then clear it exactly as `clearThread` does.
 *
 * ⚠ NOT `clearThread`, WHICH STAYS SILENT ON PURPOSE. `first-run.ts` clears the thread when a DIFFERENT
 * athlete signs in; summarising then would write one person's chat into the next person's memory.
 */
export async function endThread(): Promise<void> {
  const ended = current;
  const place = ended ? withHeldPlace({ mode: null, constraints: {} }, held) : null;
  current = null;
  let outcome: unknown;
  if (ended && onEnd) {
    try {
      outcome = onEnd(ended);
    } catch {
      // A memory that fails to save never stops the conversation from ending.
    }
  }
  if (ended && afterEnd) {
    try {
      afterEnd({ turns: ended, place, outcome: Promise.resolve(outcome).catch(() => undefined) });
    } catch {
      // Same rule: a past chat that fails to save never stops the conversation from ending.
    }
  }
  return clearThread();
}

export async function clearThread(): Promise<void> {
  current = null;
  held = null;
  /* ⚠ BEFORE THE AWAIT, AND OUTSIDE THE `try`. Deleting is the easy half; the flag is what makes it
     stick, and it must be set even if storage itself throws. */
  stopWrites();
  try {
    await AsyncStorage.multiRemove([KEY, PLACE_KEY]);
  } catch {
    // ignore
  }
}

/**
 * ══ THE X ON "I BUILD THE TRAINING" RETIRES IT (PO 2026-09-28) ══
 * *"Every time I load the app coach holt says I build the training… I pressed x and it still just keeps
 * coming back."* The X used to close it for the launch only. It now closes it for good — kept apart from
 * `MET_KEY`, which also decides whether the chat plays his introduction; closing a floating line is not
 * having met him. Cleared with `forgetMetHolt`, so the next athlete on the phone is still told who he is.
 */
const INTRO_CLOSED_KEY = 'fl_holt_intro_closed_v1';

export async function hasClosedHoltIntro(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(INTRO_CLOSED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function rememberClosedHoltIntro(): Promise<void> {
  try {
    await AsyncStorage.setItem(INTRO_CLOSED_KEY, '1');
  } catch {
    // A flag that will not save is the line coming back once more, not a failure worth surfacing.
  }
}

/** True once Holt has introduced himself on this device. */
export async function hasMetHolt(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(MET_KEY)) === '1';
  } catch {
    // Unreadable means treat them as new: a second introduction is a small cost, a missing one is not.
    return false;
  }
}

/**
 * Forget that anyone here has met Holt — a DIFFERENT athlete is signing in.
 *
 * ⚠ WITHOUT THIS, HE GREETS A STRANGER AS THOUGH THEY HAD ALREADY SPOKEN. The introduction is shown once
 * ever, keyed on this flag, and the flag is device-local — so the second account on a phone never heard
 * who he is or what he does. Cleared from `resetFirstRunFlags`, alongside the thread and the remembered
 * training level, for the same reason every other line in that function exists.
 */
export async function forgetMetHolt(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([MET_KEY, INTRO_CLOSED_KEY]);
  } catch {
    // A flag that will not clear is a re-shown introduction, not a broken sign-in.
  }
}

export async function rememberMetHolt(): Promise<void> {
  try {
    await AsyncStorage.setItem(MET_KEY, '1');
  } catch {
    // Best-effort. Worst case he introduces himself twice.
  }
}
