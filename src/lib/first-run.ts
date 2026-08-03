import { clearHomeLevel } from './home-level';
import { clearHomeIntake } from './home-intake';
import { clearHomeTourStatus, clearTourStatus, clearUnlockAnnounced } from './tour';
import { clearScreenPrompts } from './screen-prompts';
import { clearRestTimerPref } from './rest-timer-pref';
import { clearSeenPodiums } from './podium-seen';
import { clearProgramDraft } from './program-draft';
import { clearSession } from '@/domain/workout/autosave';
import { clearSquadFavorites } from './squad-favorites';

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
    clearSeenPodiums(),
    clearSession(),
    clearProgramDraft(),
    clearSquadFavorites(),
  ]);
}
