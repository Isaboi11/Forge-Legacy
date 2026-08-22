import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { RemindFreq } from '@/data/transformation-live';

/**
 * The Transformation capture reminder — the DEVICE half of a switch that has never done anything.
 *
 * ══ ⚠ WHAT THIS FIXES, AND IT IS THE WORST KIND OF DEFECT ══
 *
 * PO: *"hasn't sent any reminders for progress pics even though I did."*
 *
 * They had. `/transformation` has carried a "Capture reminder" switch with weekly / every two weeks /
 * monthly options since L-17 shipped. Turning it on wrote `forge.xform.remind` to AsyncStorage — and
 * **nothing in the app has ever read that key.** No scheduler, no notification kind, no job. The switch
 * moved, the sub-line said "On · monthly", and the app then did precisely nothing, for months, with no
 * error to find. This is the same class as the "coming soon" toast and the dead photo-import button: a
 * control that reports success and performs nothing is worse than no control, because it also spends the
 * athlete's trust that the feature exists.
 *
 * ══ WHY LOCAL, AND WHY IT SHIPS OVER THE AIR ══
 *
 * `expo-notifications` is ALREADY IN THE BINARY — build 6 shipped it for push (0120), which is why that
 * pass needed a native build and this one does not. Scheduling is pure JS against a native module the
 * phone already has, so this reaches a tester on an `eas update`.
 *
 * A local notification is also the honest mechanism for this particular reminder. "Take a photo" is a
 * decision about the athlete's own body on their own schedule; it needs no server, no row, and no other
 * athlete. Routing it through push would mean a migration, a new kind in `notifications-live`'s
 * allow-list, and a cron — for a message the phone can already produce on its own, offline.
 *
 * The trade, stated rather than hidden: it lives on ONE device, it does not appear in `/inbox`, and a
 * reinstall clears it. `/transformation` re-syncs from the stored preference on every visit, so the
 * common recoveries fix themselves.
 */

/** Tags every notification this module owns, so `cancel` can find them with no stored identifier. */
export const PHOTO_REMINDER_KIND = 'progress_photo';

/**
 * What happened, so the screen can stop claiming "On" when it isn't.
 *
 * ⚠ `denied` IS THE WHOLE REASON THIS RETURNS ANYTHING. iOS will happily accept a scheduled
 * notification and then never display it, because notifications are off for the app — which reproduces
 * the exact bug being fixed, one layer down, and would be just as invisible. The caller shows it.
 */
export type ReminderResult = 'scheduled' | 'off' | 'denied' | 'unsupported';

/** 9am on the day it lands. Early enough to act on, late enough not to be an alarm clock. */
const HOUR = 9;
const MINUTE = 0;

const BODY: Record<RemindFreq, string> = {
  weekly: 'A week since the last one. Same spot, same light — that is what makes the comparison mean anything.',
  biweekly: 'Two weeks. Stand where you stood last time and take the set.',
  monthly: 'It has been a month. A month is long enough to see something you cannot see day to day.',
};

/**
 * The trigger for each cadence.
 *
 * ⚠ `biweekly` IS THE ODD ONE AND HAS TO BE. The SDK offers DAILY, WEEKLY and MONTHLY calendar
 * triggers and there is no fortnightly member — so it runs on a repeating 14-day interval instead.
 * The difference is real and worth knowing: a calendar trigger fires on the same weekday forever, while
 * an interval counts from the moment it was scheduled and drifts across the week if the athlete ever
 * turns it off and on again. Fourteen days is fourteen days either way, which is what was promised.
 */
function triggerFor(freq: RemindFreq): Notifications.NotificationTriggerInput {
  if (freq === 'weekly') {
    // 1 = Sunday. The start of a week is when someone is willing to look at themselves honestly.
    return { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: HOUR, minute: MINUTE };
  }
  if (freq === 'monthly') {
    return { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: 1, hour: HOUR, minute: MINUTE };
  }
  return { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 14 * 24 * 60 * 60, repeats: true };
}

/**
 * Remove every reminder this module has scheduled.
 *
 * ⚠ FOUND BY TAG, NOT BY A STORED IDENTIFIER — deliberately. An id in AsyncStorage can be lost (a
 * cleared store, a crash between scheduling and writing, an account switch) and the orphaned
 * notification would then be un-cancellable by the app that created it: the athlete turns the switch off
 * and keeps getting reminded, which is a bug with no way to fix it from inside the app. The OS's own
 * list is the source of truth, so this is idempotent and self-repairing.
 *
 * `cancelAllScheduledNotificationsAsync` would be simpler and is wrong — it would take any other
 * feature's scheduled notification with it.
 */
export async function cancelPhotoReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      const data = n.content?.data as Record<string, unknown> | undefined;
      if (data?.kind === PHOTO_REMINDER_KIND) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  } catch {
    // best-effort; a scheduling failure must never break the screen it was called from
  }
}

/** How many reminders this module currently has scheduled with the OS. */
async function scheduledCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.filter((n) => (n.content?.data as Record<string, unknown> | undefined)?.kind === PHOTO_REMINDER_KIND).length;
  } catch {
    return 0;
  }
}

/**
 * Self-heal on visit: schedule only if the preference says ON and the OS holds nothing.
 *
 * ⚠ THIS IS NOT `syncPhotoReminder` AND MUST NOT BECOME IT. Sync cancels first, and cancelling restarts
 * `biweekly`'s 14-day interval from zero — so an athlete who opens `/transformation` every few days
 * would reset the countdown every time and **never be reminded at all**, which is the original bug
 * wearing a scheduler. This one is a no-op whenever a reminder already exists.
 *
 * What it recovers: a reinstall, a restored backup, an OS that dropped the schedule — the cases where
 * the stored preference outlived the notification it stands for.
 */
export async function ensurePhotoReminder(enabled: boolean, freq: RemindFreq): Promise<void> {
  if (Platform.OS === 'web' || !enabled) return;
  if ((await scheduledCount()) > 0) return;
  try {
    // Permission only — never PROMPT from a passive screen visit. The athlete asked for this by
    // flipping the switch; being asked again for having merely opened a screen is how an app teaches
    // someone to deny it. `syncPhotoReminder` is the one that may ask, because it follows a tap.
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
  } catch {
    return;
  }
  await syncPhotoReminder(enabled, freq);
}

/**
 * Make the device match the stored preference. Safe to call on every visit — it cancels first.
 *
 * ⚠ CANCEL BEFORE SCHEDULE, ALWAYS. Without it, changing weekly → monthly leaves the weekly one running
 * and the athlete now has two, which is the failure an athlete reads as "this app will not leave me
 * alone" and answers by turning notifications off at the OS level, permanently.
 */
export async function syncPhotoReminder(enabled: boolean, freq: RemindFreq): Promise<ReminderResult> {
  if (Platform.OS === 'web') return 'unsupported'; // the preview has no notifications; the switch still saves
  await cancelPhotoReminder();
  if (!enabled) return 'off';

  try {
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted' && current.canAskAgain) {
      // No badge, no sound — this is a nudge, not an alert. Asking for less is asking for less to refuse.
      const asked = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: false } });
      status = asked.status;
    }
    if (status !== 'granted') return 'denied';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Progress photo',
        body: BODY[freq],
        /* Read by `push.tsx`'s `targetFrom` and routed by `destinationFor` — the same path a real push
           takes, so a tap lands on `/transformation` rather than the `/inbox` catch-all. */
        data: { kind: PHOTO_REMINDER_KIND },
      },
      trigger: triggerFor(freq),
    });
    return 'scheduled';
  } catch {
    return 'denied'; // it did not get scheduled, and the screen must not claim otherwise
  }
}
