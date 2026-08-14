/**
 * BACKGROUND LOCATION — the run keeps measuring with the phone in your pocket.
 *
 * PO: *"Will this TestFlight app now do GPS without having the screen on?"* It would not. `useRunTracker`
 * held a foreground `watchPositionAsync` and nothing else, so iOS suspended the JS the moment the screen
 * locked and the trace simply stopped — a run measured only for the part you were watching. The hook's own
 * header stated the limit rather than fixing it.
 *
 * ══ ⚠ THE HOOK'S STATE DOES NOT EXIST WHILE THE APP IS SUSPENDED ══
 *
 * A background task is not a callback into the running app. iOS wakes the JS runtime, runs the task, and
 * puts it back to sleep — React state, refs and the component tree are all gone or stale. So the task
 * cannot call `acceptFix` and cannot touch the track: it does exactly one thing, appends the raw fixes to
 * a durable buffer, and the hook DRAINS that buffer through the same `acceptFix` the foreground uses when
 * it comes back.
 *
 * That split is the whole design, and it is why there is only one distance rule in this app rather than a
 * foreground one and a background one that disagree about what a jitter is.
 *
 * ══ WHY THE TASK IS DEFINED AT MODULE SCOPE ══
 *
 * `TaskManager.defineTask` must run before the OS delivers anything, and after a cold background launch
 * that means at import time — not in an effect, which needs a mounted component that does not exist yet.
 * `_layout.tsx` imports this module for that side effect alone.
 *
 * Buffer, not truth: nothing here is the run. The run is the track the hook builds.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import type { Fix } from './run-core';

export const RUN_LOCATION_TASK = 'forge-run-location-v1';
const BUFFER_KEY = 'forge_run_bg_fixes_v1';

/**
 * A hard ceiling on the buffer.
 *
 * At one fix every few seconds a long trail run backgrounded for three hours is a few thousand entries;
 * unbounded, a task that is never drained (the app killed mid-run, say) grows until a write fails. The
 * OLDEST are dropped rather than the newest, because a resumed run needs to know where you are now more
 * than where you were two hours ago — and the distance already banked lives in the track, not here.
 */
const MAX_BUFFERED = 5000;

/** Read and clear. Draining is destructive on purpose: a fix applied twice is distance counted twice. */
export async function drainBackgroundFixes(): Promise<Fix[]> {
  try {
    const raw = await AsyncStorage.getItem(BUFFER_KEY);
    if (!raw) return [];
    await AsyncStorage.removeItem(BUFFER_KEY);
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Fix[]) : [];
  } catch {
    // A corrupt buffer is dropped rather than thrown: it costs the athlete the backgrounded segment,
    // where throwing would cost them the run.
    return [];
  }
}

/** Throw away anything left over — called at START so a new run never inherits the last one's tail. */
export async function clearBackgroundFixes(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BUFFER_KEY);
  } catch {
    /* nothing to do, and nothing worth failing a run over */
  }
}

async function appendFixes(fixes: Fix[]): Promise<void> {
  if (!fixes.length) return;
  const raw = await AsyncStorage.getItem(BUFFER_KEY);
  const prev: Fix[] = raw ? ((JSON.parse(raw) as Fix[]) ?? []) : [];
  const next = [...prev, ...fixes];
  await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(next.length > MAX_BUFFERED ? next.slice(-MAX_BUFFERED) : next));
}

/** The location payload the task receives. Typed here because the SDK hands it over as `unknown`. */
interface LocationTaskData {
  locations?: Location.LocationObject[];
}

TaskManager.defineTask(RUN_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as LocationTaskData | undefined)?.locations ?? [];
  if (!locations.length) return;
  try {
    await appendFixes(
      locations.map((l) => ({
        lat: l.coords.latitude,
        lon: l.coords.longitude,
        accuracy: l.coords.accuracy ?? null,
        at: l.timestamp,
        /* Carried for the same reason the foreground carries them — this is where a trail run's climb
           comes from, and it is the half of a run most likely to happen with the phone away. */
        alt: l.coords.altitude ?? null,
        altAccuracy: l.coords.altitudeAccuracy ?? null,
      })),
    );
  } catch {
    // Never throw out of a task: on iOS a task that throws repeatedly gets its budget cut.
  }
});

/**
 * Start delivering fixes while the app is away.
 *
 * ⚠ IT ASKS FOR "ALWAYS" AND CARRIES ON WITHOUT IT. Background permission is a second, heavier prompt
 * that an athlete can decline — and a declined prompt must degrade to the foreground run that has always
 * worked, not refuse to start. Every failure here is swallowed for that reason: the return value says
 * whether the background stream attached, and nothing about whether the run may proceed.
 */
export async function startBackgroundFixes(): Promise<boolean> {
  try {
    const { granted } = await Location.requestBackgroundPermissionsAsync();
    if (!granted) return false;
    if (await TaskManager.isTaskRegisteredAsync(RUN_LOCATION_TASK)) return true;
    await Location.startLocationUpdatesAsync(RUN_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 3,
      timeInterval: 1000,
      /* Android will not keep a location service alive without a visible notification, and this is the
         honest version of one: it says the app is measuring, which is exactly what it is doing. */
      foregroundService: {
        notificationTitle: 'Forge Legacy is measuring your run',
        notificationBody: 'Distance, pace and climb are being recorded.',
        notificationColor: '#BA8654',
      },
      pausesUpdatesAutomatically: false,
      /* iOS shows the blue status bar while an app tracks in the background. Deliberately left ON: the
         athlete should be able to see, at a glance and without opening anything, that their location is
         being read. Hiding it would be the opposite of the sentence in the permission prompt. */
      showsBackgroundLocationIndicator: true,
    });
    return true;
  } catch {
    return false;
  }
}

/** Stop the background stream. Safe to call when it was never started. */
export async function stopBackgroundFixes(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(RUN_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(RUN_LOCATION_TASK);
    }
  } catch {
    /* already gone, or never registered */
  }
}
