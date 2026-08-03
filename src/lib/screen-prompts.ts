import AsyncStorage from '@react-native-async-storage/async-storage';

import { SCREEN_TOURS, type ScreenTourKey } from '@/domain/onboarding/tour-plan';
import { createSeenSet } from './screen-prompts-model';

/**
 * First-visit screen walkthroughs — the "explore on your own" half of Onboarding-Amendment-003 (realizing
 * ONB-A2-D4b). A device-local SEEN-SET: the surfaces the athlete has already been walked through, so each
 * one fires exactly once and never again. Local only (mirrors `home-level.ts` / `tour.ts`), no Supabase
 * write, cleared on account switch by `first-run.ts`.
 *
 * THE KEY SET IS NO LONGER THE TAB LIST. It covers the branched surfaces too — Program Builder, the Day
 * Builder inside it, the live session, Program Detail, the Exercise Library, Templates — because those are
 * where the app is least self-explanatory and a walkthrough that stops at the four tabs stops exactly where
 * it starts being needed.
 *
 * THE KEY LIST IS DERIVED FROM THE STEP DATA, NOT RETYPED BESIDE IT. This file used to carry its own
 * hand-written array of all 28 keys, which had to stay in lockstep with `ScreenTourKey` by discipline
 * alone. The failure mode was silent and permanent: a key present in the tour data but missing from the
 * validator here is filtered out on every READ, so that surface records itself as seen, reads back as
 * unseen, and **fires its walkthrough on every single visit, forever**. `SCREEN_TOURS` is keyed by the
 * same union, so its own keys are the list — the two cannot drift because there is only one.
 *
 * Storage mechanics (serialized read-modify-write) live in `screen-prompts-model.ts`; see that file for
 * why the obvious implementation loses writes.
 */
const KEY = 'forge_screen_prompts_seen_v1';
const TIPS_KEY = 'forge_guided_tips_enabled_v1';

export type ScreenKey = ScreenTourKey;

const SCREEN_KEYS: readonly string[] = Object.keys(SCREEN_TOURS);
const isScreenKey = (x: unknown): x is ScreenKey => typeof x === 'string' && SCREEN_KEYS.includes(x);

const seenSet = createSeenSet<ScreenKey>({ store: AsyncStorage, storageKey: KEY, isKey: isScreenKey });

export async function getSeenPrompts(): Promise<ScreenKey[]> {
  return seenSet.read();
}

/** Add a screen to the seen-set (idempotent, and safe against a concurrent mark of another screen). */
export async function markPromptSeen(key: ScreenKey): Promise<void> {
  return seenSet.mark(key);
}

/** Forget every first-visit walkthrough (used by the account-switch reset and "Replay all tips"). */
export async function clearScreenPrompts(): Promise<void> {
  return seenSet.clear();
}

/**
 * The Guided Tips master switch (Account Settings).
 *
 * Deliberately SEPARATE from the seen-set. Deriving "tips are on" from `seen.length === 0` would make
 * the toggle appear to switch itself off as the athlete simply used the app — a control that lies about
 * its own state. This is an explicit preference: absent means on, which is the first-run default.
 */
export async function getGuidedTipsEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TIPS_KEY)) !== 'off';
  } catch {
    return true;
  }
}

export async function setGuidedTipsEnabled(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(TIPS_KEY, on ? 'on' : 'off');
  } catch {
    // best-effort; the walkthroughs simply keep their previous behaviour
  }
}
