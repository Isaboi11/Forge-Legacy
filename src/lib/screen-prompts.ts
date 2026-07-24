import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * First-visit screen prompts — the "explore on your own" half of Onboarding-Amendment-003 (realizing
 * ONB-A2-D4b). A device-local SEEN-SET: the major surfaces the athlete has already been welcomed to, so
 * each one-time contextual banner fires exactly once and never again. Local only (mirrors `home-level.ts`
 * / `tour.ts`), no Supabase write, cleared on account switch by `first-run.ts`.
 */
const KEY = 'forge_screen_prompts_seen_v1';
const TIPS_KEY = 'forge_guided_tips_enabled_v1';

export type ScreenKey = 'home' | 'workouts' | 'legacy' | 'squads' | 'friends';

const SCREEN_KEYS: readonly string[] = ['home', 'workouts', 'legacy', 'squads', 'friends'];
const isScreenKey = (x: unknown): x is ScreenKey => typeof x === 'string' && SCREEN_KEYS.includes(x);

export async function getSeenPrompts(): Promise<ScreenKey[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isScreenKey) : [];
  } catch {
    return [];
  }
}

/** Add a screen to the seen-set (idempotent). */
export async function markPromptSeen(key: ScreenKey): Promise<void> {
  try {
    const seen = await getSeenPrompts();
    if (seen.includes(key)) return;
    await AsyncStorage.setItem(KEY, JSON.stringify([...seen, key]));
  } catch {
    // best-effort; a failed write just shows the prompt again next time
  }
}

/** Forget every first-visit prompt (used by the account-switch reset). */
export async function clearScreenPrompts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
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
    // best-effort; the prompts simply keep their previous behaviour
  }
}
