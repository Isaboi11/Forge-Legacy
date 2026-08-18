import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearHomeLevel } from './home-level';
import { clearHomeIntake } from './home-intake';
import { clearHomeTourStatus, clearTourStatus, clearUnlockAnnounced } from './tour';
import { clearScreenPrompts } from './screen-prompts';
import { clearRestTimerPref } from './rest-timer-pref';
import { clearWheelInputPref } from './set-input-pref';
import { clearSeenPodiums } from './podium-seen';
import { clearRetiredReviewWeeks } from './weekly-review-seen';
import { clearProgramDraft } from './program-draft';
import { clearWorkoutDraft } from './workout-builder-draft';
import { clearStartChoice } from './program-intent';
import { clearSession } from '@/domain/workout/autosave';
import { clearSquadFavorites } from './squad-favorites';
// ⚠ the STORE, not './pending-invite' — that module imports expo-router and this file is reached
//   during auth init, upstream of the router. See pending-invite-store.ts.
import { clearPendingInvite } from './pending-invite-store';
/* Both are AsyncStorage plus a TYPE-ONLY import of the coach's own types — no runtime weight, so neither
   drags anything into this file's graph. That matters here: `first-run` is reached during auth init,
   upstream of the router, which is the same reason the invite store is imported above rather than the
   module that wraps it. */
import { forgetExperience } from './coach-memory';
import { clearThread, forgetMetHolt } from './coach-thread';

/**
 * Clear the device-local state an account leaves behind. It lives in AsyncStorage (localStorage on web)
 * and is NOT tied to a Supabase account, so without this a new account signing in on the same
 * device/browser inherits the previous one's (the "fresh account still shows a suggestion" bug).
 *
 * Called from `AuthProvider` whenever the auth user id changes (sign-out, or a different account signing
 * in). `useTour` also resets its in-memory state on the same signal, so the storage clear and the live
 * provider stay in step.
 *
 * THREE OF THESE ARE NOT "FLAGS" — they are an account's WORK, and they were being left behind.
 *
 *   · An in-progress WORKOUT is the one that actually misleads: Home reads the saved session on focus and
 *     offers "Continue Workout — 12 sets logged" to whoever signs in next. That is another athlete's
 *     session, presented as yours, on the first screen you see.
 *   · A PROGRAM DRAFT is half-authored work belonging to someone else, which the builder would reopen.
 *   · SQUAD FAVOURITES are squad ids. Another account's ids match nothing, so they are silent dead weight.
 *
 * Found while planning a full account wipe for an open testing round: a server-side delete cannot reach any
 * of this, so a device that had used the app would carry a deleted account's session into a fresh signup.
 */
export async function resetFirstRunFlags(): Promise<void> {
  await Promise.all([
    clearHomeLevel(),
    clearHomeIntake(),
    clearTourStatus(),
    clearHomeTourStatus(),
    clearUnlockAnnounced(),
    clearScreenPrompts(),
    clearRestTimerPref(),
    clearWheelInputPref(),
    clearSeenPodiums(),
    // Weeks whose Home card has been read or skipped. Another account's weeks — inheriting them would
    // retire a review the new athlete has never laid eyes on.
    clearRetiredReviewWeeks(),
    clearSession(),
    clearProgramDraft(),
    // Same reasoning as the program draft: half-authored work belonging to whoever was signed in before.
    clearWorkoutDraft(),
    // Without this the next account is never asked how it wants to start — it inherits the answer.
    clearStartChoice(),
    clearSquadFavorites(),
    // An invite is tapped by a PERSON, before anyone is signed in. The next account on this phone is a
    // different person and did not tap it — inheriting it would route a stranger into somebody else's squad.
    clearPendingInvite(),
    /*
     * ⚠ THE COACH'S MEMORY, AND IT WAS THE ONE THING HERE THAT LEAKED BETWEEN PEOPLE.
     *
     * Holt stores three device-local facts: how long you have been training, whether you have met him,
     * and the conversation itself. None of them was cleared on an account change, so the SECOND athlete
     * on a phone inherited the first one's training level — and was never asked their own, because the
     * questionnaire skips a question it believes it already has the answer to. Reported as "it never
     * asked me what level I am", on a brand-new account, which is exactly what it would do.
     *
     * The same reasoning as every line above: another athlete's answers are not this athlete's answers.
     * The level is the one that matters most, because it silently shapes every program he builds.
     */
    forgetExperience(),
    forgetMetHolt(),
    clearThread(),
  ]);
}

/**
 * WHO THIS DEVICE LAST BELONGED TO — persisted, because a ref cannot outlive a mount.
 *
 * `resetFirstRunFlags` above is only useful if something notices the handover, and the in-memory check
 * that used to do it could not see across a page reload: signing up after one was the first auth event
 * the new mount observed, and the guard against wiping your own flags on boot skipped it. See
 * `domain/auth/device-handover.ts` for the rule this feeds.
 */
const OWNER_KEY = 'forge_device_owner_v1';

export async function lastAthleteId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(OWNER_KEY);
  } catch {
    /* Unreadable storage must not be read as "a different athlete" — that would wipe the flags of
       whoever is actually signed in, for a transient failure. Unknown means do nothing. */
    return null;
  }
}

export async function rememberAthleteId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(OWNER_KEY, id);
  } catch {
    // Failing to record the owner costs one missed handover, never a wrongly-wiped device.
  }
}
