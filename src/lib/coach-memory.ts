import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Experience } from '@/domain/coach/constraints';
import { fetchProfileExperience, saveProfileExperience } from '@/data/coach-profile-live';
import { isRoom, type Room } from '@/domain/coach/chat-core';

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
 * ⚠ **AND WHERE THEY TRAIN IS THE SECOND (PO, 2026-09-30).** This file used to argue the room "genuinely
 * varies" and left it out. The PO, asked it again: *"Wouldn't those always be the same after I answer it
 * the first time? So he should remember."* It is kept now — and because it CAN differ on a given day,
 * Holt says which room he built for whenever he assumed it (`roomAssumedLine`), so it is never silent.
 *
 * Everything else is deliberately NOT here. The time they have today, what hurts this week, what they
 * feel like training — those genuinely vary, and pre-filling them would be worse than asking: the athlete
 * would get a session built around last Tuesday's circumstances without ever being given the chance to
 * say otherwise. A coach who assumes is not better than one who asks.
 *
 * ══ WHY DEVICE-LOCAL — AND WHY THE LEVEL IS NOT ONLY THAT (QA holt-31) ══
 *
 * Same reasoning as the thread and the Builder's draft: this is a working convenience, not a record.
 * Losing it costs one extra tap. It is not training history, and nothing downstream trusts it — the
 * value seeds the questionnaire and is then answered, confirmed or overwritten like any other.
 * The LEVEL is the exception: it is written through to `profiles.experience`, the one level every screen
 * reads, so the chat and the wizards can never disagree about it. See `loadExperience`.
 *
 * ⚠ IT IS WIPED ON SIGN-OUT (`first-run.ts`), so the sheet falls back to the athlete's own profile —
 * what they told onboarding — before it asks again. See the mount effect in `CoachChatSheet`.
 */
const EXPERIENCE_KEY = 'forge_coach_experience_v1';
const ROOM_KEY = 'forge_coach_room_v1';

const LEVELS: readonly Experience[] = ['beginner', 'intermediate', 'advanced'];

/** Both disciplines, because an advanced lifter can be a beginner runner and the engine reads them apart. */
export interface RememberedExperience {
  lifting: Experience;
  running: Experience;
}

const valid = (v: unknown): v is Experience => typeof v === 'string' && (LEVELS as readonly string[]).includes(v);

async function readDevice(): Promise<RememberedExperience | null> {
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

/** Set once this device's answer has reached `profiles.experience`. Cleared with the answer. */
const SYNCED_KEY = 'forge_coach_experience_synced_v1';

const pushToProfile = async (lifting: Experience): Promise<void> => {
  if (await saveProfileExperience(lifting)) {
    try {
      await AsyncStorage.setItem(SYNCED_KEY, '1');
    } catch {
      // Harmless: it is pushed again next time.
    }
  }
};

/**
 * ══ ONE LEVEL, AND IT IS THE PROFILE'S (QA holt-31) ══
 *
 * The chat read this device copy and the wizards read `profiles.experience`, so the same athlete had two
 * levels, and whichever did not know asked again. Now the profile is the answer and this copy is a cache:
 *   · a device answer that never reached the profile (every answer given before this fix) is pushed there
 *     once, because it is the newest thing the athlete said;
 *   · after that the profile wins — it is what every other screen and device reads. The running level stays
 *     the device's when it has one (the profile holds a single level).
 */
export async function loadExperience(): Promise<RememberedExperience | null> {
  const device = await readDevice();
  let synced = false;
  try {
    synced = (await AsyncStorage.getItem(SYNCED_KEY)) === '1';
  } catch {
    // Treated as not yet synced — pushing the same value twice is harmless.
  }
  if (device && !synced) {
    await pushToProfile(device.lifting);
    return device;
  }
  const profile = await fetchProfileExperience();
  if (profile) return { lifting: profile, running: device?.running ?? profile };
  return device;
}

export async function rememberExperience(e: RememberedExperience): Promise<void> {
  if (!valid(e?.lifting) || !valid(e?.running)) return;
  try {
    await AsyncStorage.setItem(EXPERIENCE_KEY, JSON.stringify({ lifting: e.lifting, running: e.running }));
  } catch {
    // Best-effort. Worst case he asks once more.
  }
  await pushToProfile(e.lifting);
}

/**
 * Forgets the DEVICE copy only (sign-out, "change my level"). ⚠ Never the profile: sign-out must not erase
 * the athlete's answer, and a level being changed is overwritten by the new answer, not blanked first.
 */
export async function forgetExperience(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([EXPERIENCE_KEY, SYNCED_KEY]);
  } catch {
    // ignore
  }
}

/** Where they train. Validated like the level: an unknown value is no answer, and he asks. */
export async function loadRoom(): Promise<Room | null> {
  try {
    const raw = await AsyncStorage.getItem(ROOM_KEY);
    return isRoom(raw) ? raw : null;
  } catch {
    return null;
  }
}

export async function rememberRoom(room: Room): Promise<void> {
  try {
    if (!isRoom(room)) return;
    await AsyncStorage.setItem(ROOM_KEY, room);
  } catch {
    // Best-effort. Worst case he asks once more.
  }
}

export async function forgetRoom(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ROOM_KEY);
  } catch {
    // ignore
  }
}
