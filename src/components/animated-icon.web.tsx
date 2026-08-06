/**
 * Web twin of the native splash hand-off — deliberately nothing.
 *
 * The browser has no native splash to hand off FROM: `expo-splash-screen` is a native-only concern, so
 * there is no gap to cover and an overlay here would be a flash the web does not otherwise have.
 *
 * ⚠ This file is also why the native one shipped broken. It returned `null` while its native sibling
 * filled the screen with Expo blue for 600ms on every launch, and since every review of this app happens
 * on forgelegacy.expo.app, nobody saw it until it was on a tester's phone. **A `.web.tsx` that renders
 * less than its native twin is a blind spot, not a simplification** — anything meaningful behind this
 * boundary needs a device or a test, because the preview cannot report it.
 */
export function AnimatedSplashOverlay() {
  return null;
}
