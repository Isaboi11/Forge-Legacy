import { useEffect } from 'react';
import { usePathname } from 'expo-router';

import { startAnalytics, trackScreen } from '@/lib/analytics';

/**
 * Records which screen is open. Renders nothing.
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
  }, [pathname]);

  return null;
}
