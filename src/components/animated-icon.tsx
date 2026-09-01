import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ForgeSplash } from '@/components/forge-splash';
import { IS_PAPER } from '@/constants/foundation';

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
 * ⚠ NO SCALE. The keyframe used to blow the view up to `screenHeight / 90` and shrink it back — the
 * Expo template's logo-zoom, harmless while the content was a flat colour and wrong the moment the
 * content became artwork, because the pillars would have rushed in from nine times their size. A plain
 * fade is all a cover needs: what is underneath it (the boot hold, then Home's own hold) is the same
 * picture, so there is nothing for the athlete to see happen.
 *
 * ══ ⚠ AND THE ALABASTER DISSOLVE WAS AT THE WRONG END OF THE ANIMATION ══
 *
 * PO, 2026-09-01: *"when I am on the light mode and the app opens up it opens the dark splash screen
 * first and then turns to light mode. Should just go straight to light mode if that's what I'm in."*
 *
 * The dissolve was already here — and it ran LAST. This overlay painted the native dark ground at full
 * opacity for the first **70% of 600ms** and only then faded, revealing the athlete's cream splash
 * underneath. So an Alabaster launch spent **420ms on a dark screen that JS had already chosen not to
 * be**, and the change, when it came, was the last thing that happened rather than the first.
 *
 * The layers are separated now. The theme's own splash is the FLOOR of this overlay and the native dark
 * ground is a sheet ON TOP of it that dissolves away in the first fifth of the animation — so the ground
 * arrives at the athlete's theme in ~270ms instead of ~600ms, and everything after that is already the
 * right colour. The outer fade still runs at the end, over an image identical to what is beneath it.
 *
 * ⚠ THE HOLD BEFORE THE DISSOLVE IS NOT PADDING. The native splash auto-hides (nothing in this app calls
 * `preventAutoHideAsync`), so for the first frames the OS may still be drawing its own dark screen on
 * top of ours. Starting the dissolve at zero would run it BEHIND the native splash and put the cut back
 * — visible at the moment the OS frame goes away, which is the exact defect this exists to prevent.
 *
 * ⚠ A FORGE LAUNCH RENDERS EXACTLY WHAT IT ALWAYS DID — one layer, no dissolve. Stacking two identical
 * dark splashes to animate between them would be pure cost on the default theme, and `IS_PAPER` is safe
 * to read here: this renders inside `_layout`, long after the boot gate resolved the theme. (It is the
 * boot gate itself that must not touch a token — see `src/boot.tsx`.)
 *
 * ⛔ WHAT THIS STILL CANNOT DO: the OS splash frame itself. `app.json`'s `backgroundColor` is BUILD
 * config — one value for every athlete on the binary — so the very first frame of a cold launch is dark
 * whatever the theme, and no OTA can change it. Closing that needs a new build AND would follow the
 * SYSTEM appearance rather than the in-app choice, so an Alabaster athlete running iOS in dark mode
 * would still get a dark frame. This is as close as the platform allows without a binary.
 */
const DURATION = 600;

/** When the native ground starts and finishes dissolving, as a share of `DURATION`. */
const DISSOLVE_START = 15; // ~90ms — long enough for the OS splash to be gone
const DISSOLVE_END = 45; // ~270ms — the ground is the athlete's theme from here on

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: { opacity: 1 },
    70: { opacity: 1 },
    100: { opacity: 0 },
  });

  /** The native dark ground, on top of the theme's, gone by the time anyone can read the screen. */
  const groundKeyframe = new Keyframe({
    0: { opacity: 1 },
    [DISSOLVE_START]: { opacity: 1 },
    [DISSOLVE_END]: { opacity: 0 },
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
      {IS_PAPER ? (
        <>
          {/* The floor: the splash the athlete actually chose. Everything above it is the hand-off. */}
          <View style={StyleSheet.absoluteFill}>
            <ForgeSplash />
          </View>
          <Animated.View entering={groundKeyframe.duration(DURATION)} style={StyleSheet.absoluteFill}>
            <ForgeSplash ground="forge" />
          </Animated.View>
        </>
      ) : (
        <ForgeSplash ground="forge" />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
});
