import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Experience } from '@/domain/coach/constraints';

/**
 * The answers Holt should only ever need once.
 *
 * ══ WHAT BELONGS IN HERE, AND WHAT DOES NOT ══
 *
 * ⚠ **ONLY FACTS THAT DO NOT CHANGE BETWEEN TUESDAY AND THURSDAY.** How long somebody has been training
 * is one of them, and asking it at the start of every single session is the app visibly failing to
 * remember a conversation it just had — the PO's words: *"once I answer my skill level in one area it
 * just needs to remember that and use that as the answer from now on."*
 *
 * Everything else is deliberately NOT here. The time they have today, the room they are in, what hurts
 * this week, what they feel like training — those genuinely vary, and pre-filling them would be worse
 * than asking: the athlete would get a session built around last Tuesday's circumstances without ever
 * being given the chance to say otherwise. A coach who assumes is not better than one who asks.
 *
 * ══ WHY DEVICE-LOCAL ══
 *
 * Same reasoning as the thread and the Builder's draft: this is a working convenience, not a record.
 * Losing it costs one extra tap. It is not training history, and nothing downstream trusts it — the
 * value seeds the questionnaire and is then answered, confirmed or overwritten like any other.
 */
const EXPERIENCE_KEY = 'forge_coach_experience_v1';

const LEVELS: readonly Experience[] = ['beginner', 'intermediate', 'advanced'];

/** Both disciplines, because an advanced lifter can be a beginner runner and the engine reads them apart. */
export interface RememberedExperience {
  lifting: Experience;
  running: Experience;
}

const valid = (v: unknown): v is Experience => typeof v === 'string' && (LEVELS as readonly string[]).includes(v);

export async function loadExperience(): Promise<RememberedExperience | null> {
  try {
    const raw = await AsyncStorage.getItem(EXPERIENCE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedExperience>;
    /* ⚠ VALIDATED, NOT TRUSTED. A stale or hand-edited value would otherwise reach `assemble()` as a
       difficulty gate and silently prescribe the wrong thing — a bad answer is worse than no answer. */
    return valid(parsed?.lifting) && valid(parsed?.running) ? { lifting: parsed.lifting, running: parsed.running } : null;
  } catch {
    return null;
  }
}

export async function rememberExperience(e: RememberedExperience): Promise<void> {
  try {
    if (!valid(e?.lifting) || !valid(e?.running)) return;
    await AsyncStorage.setItem(EXPERIENCE_KEY, JSON.stringify({ lifting: e.lifting, running: e.running }));
  } catch {
    // Best-effort. Worst case he asks once more.
  }
}

export async function forgetExperience(): Promise<void> {
  try {
    await AsyncStorage.removeItem(EXPERIENCE_KEY);
  } catch {
    // ignore
  }
}
