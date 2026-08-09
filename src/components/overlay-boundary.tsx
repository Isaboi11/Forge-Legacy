import React from 'react';

/**
 * A decoration must never be able to take the app down.
 *
 * ══ WHY THIS EXISTS ══
 *
 * `CoachBubble` renders beside the navigator, so it is on screen for every route in the app. It called
 * `useSafeAreaInsets()`, which THROWS when no `SafeAreaProvider` is above it — and there wasn't one at
 * that level, because until then nothing outside the navigator had ever asked for insets. The bubble threw
 * on first render and the entire app failed to launch on device.
 *
 * It shipped because it did not reproduce on web: `react-native-safe-area-context` has a DOM
 * implementation that reads real metrics instead of throwing, so the web build was perfect and the phone
 * showed nothing. Every automated check was green.
 *
 * The provider was the bug and it is fixed. This is the category: anything rendered globally as
 * decoration is wrapped here, so the worst case is a missing bubble rather than a missing app. It is
 * deliberately dumb — no retry, no reporting, no fallback UI. An overlay that failed should be absent.
 *
 * ⚠ NOT FOR SCREENS. A screen that throws should surface, not vanish silently — swallowing a real screen's
 * error hides a bug from everyone including the athlete. This is only for things whose absence is
 * survivable.
 */
export class OverlayBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Console only, on purpose. A crash here is a development-time defect and the athlete can do nothing
    // about it; a toast would be noise about something they cannot see and did not ask for.
    console.warn('[OverlayBoundary] an overlay failed and was removed:', error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
