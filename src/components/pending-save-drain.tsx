import { useEffect } from 'react';
import { AppState } from 'react-native';

import { drainPendingSaves } from '@/data/pending-save-live';

/**
 * Replays workouts that could not reach the server (W-9 §13.4). Renders nothing.
 *
 * ══ WHY A COMPONENT AND NOT A MODULE SIDE EFFECT ══
 *
 * The drain needs a signed-in user, and at import time there is not one — `AuthProvider` has not run. It
 * also needs to fire again on every foreground, because "the connection came back" is not an event this
 * app can observe directly: there is no NetInfo in this project (it is a native dependency, and adding
 * one moves the fingerprint), so **returning to the app is the proxy for returning to signal.** That is
 * the whole reason this listens to `AppState` rather than to connectivity.
 *
 * ══ WHERE IT IS MOUNTED ══
 *
 * Beside `AnalyticsTracker` in the root layout — inside the providers, outside the Stack. Inside the
 * Stack it would remount on every navigation and re-run the drain on each one.
 *
 * ══ REACT-COMPILER COMPLIANCE, STATED BECAUSE THE LINT IS AN ERROR NOT A WARNING ══
 *
 * No state, no refs, no `setState` in an effect body. `drainPendingSaves` is fire-and-forget, guards
 * itself against overlapping runs, and swallows everything — so this component can never delay a render,
 * fail a navigation, or take the app down on launch.
 */
export function PendingSaveDrain() {
  useEffect(() => {
    void drainPendingSaves();

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void drainPendingSaves();
    });
    return () => sub.remove();
  }, []);

  return null;
}
