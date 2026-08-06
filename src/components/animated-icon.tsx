import { useState } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/**
 * The hand-off from the NATIVE splash to the first painted frame.
 *
 * ══ THIS SHIPPED AS A FLASH OF EXPO BLUE, AND ONLY ON A PHONE ══
 *
 * Reported from the tester build: "the first splash screen, then a blue splash, then the home screen."
 * That middle frame was this component, filling the screen with **`#208AEF`** — Expo's brand blue,
 * straight out of the `create-expo-app` template — for 600ms on every single launch.
 *
 * It survived because **the web twin (`animated-icon.web.tsx`) returns `null`**, so forgelegacy.expo.app
 * never showed it. Every review of this app happens on the web preview. The one surface that renders it
 * is the one nobody can open on a Windows machine.
 *
 * The fill is now the splash background itself (`#0E0E12`, the `expo-splash-screen` plugin colour in
 * `app.json`), which is the only value that makes this component invisible — it exists to COVER the gap
 * while the first frame mounts, then scale and fade away. Any colour that is not the splash's is a flash
 * by construction, and `splash-continuity.test.mjs` now fails if the two ever drift apart.
 */
const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;

/**
 * Must equal `expo.plugins['expo-splash-screen'].backgroundColor` in `app.json`.
 * Not imported from there: this runs in the render path and `app.json` is build config, so the guard
 * asserts the equality instead of the bundle carrying a JSON read to prove it.
 */
export const SPLASH_BACKGROUND = '#0E0E12';

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: INITIAL_SCALE_FACTOR }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  return (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.backgroundSolidColor}
    />
  );
}

const styles = StyleSheet.create({
  backgroundSolidColor: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_BACKGROUND,
    zIndex: 1000,
  },
});
