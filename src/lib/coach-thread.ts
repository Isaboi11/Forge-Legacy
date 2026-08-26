import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Turn } from '@/domain/coach/chat-core';
/* ⚠ RELATIVE AND WITH THE EXTENSION, NOT `@/`. The `@/` alias above it is a TYPE import and is erased;
   this one is a runtime import, and `node --test` cannot resolve the alias — `intro.test.mjs` reaches
   this file through the chat core and died with ERR_MODULE_NOT_FOUND the moment this was written as
   `@/domain/...`. Every runtime cross-import in `src/domain` is written this way for the same reason. */
import { allowWrites, mayPersist, stopWrites } from '../domain/coach/thread-lifecycle.ts';

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
const MAX_TURNS = 100;

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
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Turn[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return isConversation(parsed) ? parsed : null;
  } catch {
    // A thread we cannot read is a thread we start again — never an error in the athlete's face.
    return null;
  }
}

export async function saveThread(turns: Turn[]): Promise<void> {
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
    const settled = turns.slice(-MAX_TURNS).map((t) => (t.kind === 'holt' ? { ...t, live: false } : t));
    await AsyncStorage.setItem(KEY, JSON.stringify(settled));
  } catch {
    // Best-effort: losing the thread costs the conversation, never the training.
  }
}

export async function clearThread(): Promise<void> {
  /* ⚠ BEFORE THE AWAIT, AND OUTSIDE THE `try`. Deleting is the easy half; the flag is what makes it
     stick, and it must be set even if storage itself throws. */
  stopWrites();
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
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
    await AsyncStorage.removeItem(MET_KEY);
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
