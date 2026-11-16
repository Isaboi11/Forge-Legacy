import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncAppleHealth } from '@/data/apple-health-sync-live';

/**
 * Checks Apple Health for new workouts on app open and every return to the foreground (Build 10 ·
 * Apple-Health-Build-Plan §3.4). Renders nothing.
 *
 * Not background delivery, on purpose: that needs another entitlement, a headless launch and a live
 * session while suspended. A 7am Garmin run appearing when the athlete opens Forge at 7:05 is the goal.
 *
 * Mounted beside `PendingSaveDrain`, for the same reasons: inside the providers so a session exists,
 * outside the Stack so navigation never remounts it, inside a boundary so it can never take the app down.
 * `syncAppleHealth` is total — it is inert off an iPhone build with HealthKit, when not connected, and
 * inside its own 10-minute throttle — so this component holds no state and no refs.
 */
export function AppleHealthSync() {
  useEffect(() => {
    // ⚠ Only while the app is on screen. iOS can launch the app in the BACKGROUND (a push, a Live
    // Activity) with the phone locked, and Health data is unreadable while locked — both the anchored
    // read and its fallback fail, which reached Sentry as the hk_anchor_invalid + hk_query_failed pair
    // (FORGE-LEGACY-4/5/F/G/M/N/P/Q, 11-16). The 'active' listener below catches the real open.
    if (AppState.currentState === 'active') void syncAppleHealth();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void syncAppleHealth();
    });
    return () => sub.remove();
  }, []);

  return null;
}
