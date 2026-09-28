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
    void syncAppleHealth();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void syncAppleHealth();
    });
    return () => sub.remove();
  }, []);

  return null;
}
