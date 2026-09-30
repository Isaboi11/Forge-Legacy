import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { REST_DONE_ID, REST_DONE_KIND, restDoneDelaySec } from '@/lib/rest-notification-model';

/**
 * The "rest complete" notification — the DEVICE half. Why it exists: `rest-notification-model.ts`.
 *
 * ══ SHIPS OVER THE AIR ══
 *
 * `expo-notifications` has been in the binary since build 6 (0120), so this is pure JS against a module
 * the phone already has — same as `photo-reminder.ts`.
 *
 * ⚠ THE SOUND IS iOS'S DEFAULT, NOT OUR DING. A custom notification sound has to be bundled into the
 * native binary (the plugin's `sounds` list), which moves the fingerprint. The default is what an
 * `eas update` can reach; `rest-ding.wav` can replace it in a later build.
 *
 * ══ NEVER PROMPTS ══
 *
 * `PushProvider` asks for notification permission (with sound) at sign-in. An athlete who said no there
 * is not asked again mid-set; they simply keep the on-screen ding.
 */

/* Calls arrive in bursts (±15s tapped four times), and each is a cancel THEN a schedule across the
   native bridge. Run them one at a time, and let only the newest do any work. */
let chain: Promise<void> = Promise.resolve();
let gen = 0;
let scheduled = false;

/** Whether iOS is currently holding a notification for the running rest. Read by the late-ding rule. */
export function restDoneScheduled(): boolean {
  return scheduled;
}

/**
 * True when the countdown has hit zero but the app should NOT act on it yet.
 *
 * ⚠ THE RACE THIS CLOSES. JS keeps running for a few seconds after the phone locks. A rest that ends in
 * that window would be expired by the ticker, which clears the deadline, which cancels the notification
 * — a moment before it rings — while the in-app ding cannot play from the background either. Silence,
 * in exactly the case this feature is for. So in the background the OS's copy is left alone, and the
 * ticker finishes the job when the athlete comes back.
 */
export function restExpiryDeferred(): boolean {
  return Platform.OS !== 'web' && scheduled && AppState.currentState === 'background';
}

/**
 * Make the OS match the rest clock: `endsAt` = ring then; `null` = nothing should ring.
 *
 * Called on every change to the deadline — start, ±15s, pause, resume, skip, expiry — so there is one
 * rule instead of six call sites that each have to remember.
 */
export function syncRestDone(endsAt: number | null): void {
  if (Platform.OS === 'web') return; // the preview has no notifications; the ding there is `ding.web.ts`
  const mine = ++gen;
  chain = chain.then(async () => {
    if (mine !== gen) return; // superseded before it ran
    try {
      await Notifications.cancelScheduledNotificationAsync(REST_DONE_ID);
      /* And the one already DELIVERED, if any — back in the app, a "Rest complete" left sitting in
         Notification Center is about a rest that is over. */
      await Notifications.dismissNotificationAsync(REST_DONE_ID);
    } catch {
      // best-effort; nothing to cancel is the common case
    }
    scheduled = false;
    if (endsAt == null) return;

    const seconds = restDoneDelaySec(endsAt, Date.now());
    if (seconds == null) return;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted' || mine !== gen) return;
      await Notifications.scheduleNotificationAsync({
        identifier: REST_DONE_ID,
        content: {
          title: 'Rest complete',
          body: 'Next set.',
          sound: 'default',
          /* Read by `push.tsx`: silenced while the app is on screen (the ding covers it), and a tap
             opens the app where it was instead of routing anywhere. */
          data: { kind: REST_DONE_KIND },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
      });
      scheduled = true;
    } catch {
      // Sound is a courtesy. A phone that will not schedule it still runs a workout.
    }
  });
}
