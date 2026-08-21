import { useEffect } from 'react';
import { usePathname } from 'expo-router';

import { startAnalytics, trackScreen } from '@/lib/analytics';
import { noteRoute } from '@/lib/diagnostics';

/**
 * Records which screen is open, for BOTH the product-usage log and the crash breadcrumb trail.
 * Renders nothing.
 *
 * ══ WHY IT LIVES OUTSIDE THE STACK ══
 *
 * Mounted next to `CoachBubble` in the root layout, which is the position already proven to have router
 * context (the bubble calls `usePathname()` there today). Inside the Stack it would remount per screen
 * and lose the interval and the queue on every navigation.
 *
 * ══ REACT-COMPILER COMPLIANCE, STATED BECAUSE THE LINT IS AN ERROR NOT A WARNING ══
 *
 * No `setState` in the effect body. No `ref.current` read during render. No ref at all — the `[pathname]`
 * dependency does the de-duplication a "previous path" ref would otherwise be reached for, and a ref
 * here would trip `react-hooks/set-state-in-effect`'s sibling rule for no gain.
 *
 * `trackScreen` is synchronous, returns void and cannot throw. It is not awaited and its result is not
 * rendered, so this component can never delay or fail a navigation.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    startAnalytics();
  }, []);

  useEffect(() => {
    trackScreen(pathname);
    /*
     * ⭐ THE SPINE OF THE TRAIL (0176).
     *
     * A route crumb is the single most useful entry in a crash report, and a sequence of them is
     * usually the whole diagnosis on its own: the "app is frozen" week would have read
     * `/sign-in → /onboarding → /onboarding ×214` and ended in one minute instead of three wrong guesses.
     *
     * ⚠ TWO CALLS, NOT ONE, AND THEY ARE NOT REDUNDANT. `trackScreen` respects the analytics opt-out and
     *   returns early; `noteRoute` also updates the CURRENT screen, which is the `screen` field on every
     *   error report. Knowing which screen broke is a fact about our software rather than a record of
     *   the athlete's journey, so it survives the opt-out while the trail itself does not. Collapsing
     *   these into one call would silently make every report from an opted-out athlete say `screen:
     *   null` — which is most of the value, lost quietly.
     */
    noteRoute(pathname);
  }, [pathname]);

  return null;
}
