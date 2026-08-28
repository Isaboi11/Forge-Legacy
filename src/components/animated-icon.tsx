import { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ForgeSplash } from '@/components/forge-splash';

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
 * ══ AND THEN IT WAS THE RIGHT COLOUR WITH THE WRONG PICTURE ══
 *
 * Painting the splash's own `#0E0E12` fixed the flash of a different PRODUCT and left a flash of a
 * different FRAME: a flat rectangle where the OS had just been showing the carved pillars. The pillars
 * vanished for 600ms and came back. So the fill is now `ForgeSplash` — the splash reproduced in JS,
 * artwork and all — and this component finally does what its name says, which is nothing visible.
 *
 * The colour lives in `ForgeSplash` now, and `splash-continuity.test.mjs` still holds it equal to
 * `app.json`'s. Any colour that is not the splash's is a flash by construction.
 *
 * ⚠ NO SCALE. The keyframe used to blow the view up to `screenHeight / 90` and shrink it back — the
 * Expo template's logo-zoom, harmless while the content was a flat colour and wrong the moment the
 * content became artwork, because the pillars would have rushed in from nine times their size. A plain
 * fade is all a cover needs: what is underneath it (the boot hold, then Home's own hold) is the same
 * picture, so there is nothing for the athlete to see happen.
 *
 * ══ AND THEN ALABASTER MADE THE HAND-OFF VISIBLE AGAIN ══
 *
 * PO: *"when it's the white version the splash screen is black first then it goes to the white."* The
 * native splash is build config — one dark frame for every athlete on the binary — so a light theme
 * cannot be met by the OS, and the moment JS took over the ground CUT from dark to cream. This overlay
 * now renders the splash on the NATIVE ground (`ground="forge"`) whatever the theme, and fades out
 * over the theme's own splash beneath it: a Forge launch is unchanged (dark over dark), an Alabaster
 * launch dissolves from the frame the OS drew to the one the athlete chose. The pillars do not move;
 * only the ground behind them changes, and it changes over 180ms instead of in one frame.
 */
const DURATION = 600;

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: { opacity: 1 },
    70: { opacity: 1 },
    100: { opacity: 0 },
  });

  return (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.cover}
    >
      <ForgeSplash ground="forge" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
});
