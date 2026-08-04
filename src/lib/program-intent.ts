import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * HOW THE ATHLETE ANSWERED "How do you want to start?" — the Home starting-point chooser.
 *
 * ══ WHY THIS IS REMEMBERED AT ALL ══
 *
 * Home stops asking the starting-point question once the athlete is settled, and "settled" was originally
 * read off the server as *has logged a workout* (`chapters.workout_count > 0`). That is one beat too late.
 * An athlete who taps "Start a freestyle workout", trains, and comes back before saving was shown their
 * "Continue Workout" card AND, underneath it, "How do you want to start?" — a question they had visibly
 * already answered, asked again over the evidence that they had answered it. Back out without logging a
 * set and the tap was forgotten entirely.
 *
 * **Choosing IS the answer.** The moment they walk through one of the three doors, the question is closed
 * and Home is the settled screen from then on — the same hero card a program athlete gets, with the quiet
 * "Want a plan? Build or browse programs →" line underneath.
 *
 * LOCAL, and that is the right scope: it decides what Home draws on this device, not anything about the
 * athlete worth syncing. It is cleared by `resetFirstRunFlags()` so the next account to sign in on this
 * device is asked its own question.
 *
 * (This file previously held a dead `'build_own' | 'recommended'` flag for a Home card that no longer
 * exists — nothing read or wrote it. Same slot, real job.)
 */
const KEY = 'forge_program_intent_v1';

/** The three doors on the chooser. `build_own` and `browse` usually end in a program, which settles Home
 *  on its own; `freestyle` never does, which is precisely why the choice has to be remembered. */
export type StartChoice = 'freestyle' | 'build_own' | 'browse';

const VALID: readonly string[] = ['freestyle', 'build_own', 'browse'];

export async function setStartChoice(choice: StartChoice): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, choice);
  } catch {
    // Best-effort. A lost write costs one re-ask, never a wrong screen.
  }
}

export async function getStartChoice(): Promise<StartChoice | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v != null && VALID.includes(v) ? (v as StartChoice) : null;
  } catch {
    return null;
  }
}

export async function clearStartChoice(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}
