import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { IS_PAPER } from '@/constants/foundation';

const CARVED_LOGO = require('@/assets/welcome-logo-carved.png');

/**
 * THE ONE LOADING STATE THE APP HAS, AND IT IS THE SPLASH ITSELF.
 *
 * ══ WHY THIS IS NOT A SPINNER ══
 *
 * Launching used to run through four different pictures: the native splash (the carved pillars on
 * `#0E0E12`), then a flat `#0E0E12` fill with no pillars, then a bronze `ActivityIndicator` on a
 * slightly different dark, then Home assembling itself section by section. Four frames, three of which
 * exist only because a read had not come back yet.
 *
 * This is the single frame all of them become. It is a deliberate REPRODUCTION of the native splash —
 * same artwork, same width, same background, centred on the same point of the same screen — so the hand-
 * off from the OS to JavaScript changes nothing on the glass. Whatever is still loading behind it, the
 * athlete is looking at one continuous image from the moment they tap the icon.
 *
 * ⚠ IT IS STATIC, AND THAT IS THE POINT. An earlier draft breathed the bronze glow the way `WelcomeLogo`
 * does. But this renders in up to three places at once (the hand-off overlay, the boot hold, Home's own
 * hold) and they mount at DIFFERENT times — so their breath cycles would be out of phase and the
 * hand-off between two of them would be a visible pulse of brightness. Identical still frames cannot
 * disagree with each other. The native splash is static too, which is the whole argument.
 *
 * ⚠ NO CONTEXT, NO INSETS, NO ROUTER. It renders OUTSIDE the navigator (the boot hold is what stands in
 * FOR the navigator), and anything out there with a `useSafeAreaInsets()` in it takes the app down on
 * device — see the note on `SafeAreaProvider` in `app/_layout.tsx`. A `View` and an `Image`, nothing more.
 */

/**
 * The Forge value must equal `expo.plugins['expo-splash-screen'].backgroundColor` in `app.json`.
 *
 * Not imported from there: this runs in the render path and `app.json` is build config, so
 * `splash-continuity.test.mjs` asserts the equality instead of the bundle carrying a JSON read to prove
 * it. In any colour but the splash's own, this component IS the flash it exists to prevent — which is
 * how `#208AEF` (Expo blue) once shipped to TestFlight.
 */
export const SPLASH_BACKGROUND_FORGE = '#0E0E12';

/**
 * Paper's canvas (`--fl-charcoal-900`), so loading is the theme the athlete chose rather than a dark
 * frame in front of a light app.
 *
 * ⚠ THE NATIVE SPLASH CANNOT FOLLOW THIS AND DOES NOT NEED TO. `app.json`'s splash colour is BUILD
 *   config — one value for every athlete on that binary — so on native there is a hand-off that has to
 *   match, and it matches because native resolves to Forge (see `theme-choice.ts`). On WEB there is no
 *   native splash to hand off from: the browser paints `+html.tsx` and then React mounts, so a Paper
 *   splash there has nothing to disagree with. `splash-continuity.test.mjs` holds that reasoning as an
 *   assertion rather than a comment.
 */
export const SPLASH_BACKGROUND_PAPER = '#F6F2E8';

export const SPLASH_BACKGROUND = IS_PAPER ? SPLASH_BACKGROUND_PAPER : SPLASH_BACKGROUND_FORGE;

/**
 * `imageWidth` from the same `expo-splash-screen` plugin entry, and the source PNG's own aspect ratio
 * (308 × 452). Matching the width is what makes the hand-off invisible; guessing it would put a pillar
 * of one size on top of a pillar of another.
 */
const LOGO_WIDTH = 104;
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * 452) / 308);

/**
 * Centred on the WINDOW, not on this component's own box — and that difference is the whole reason this
 * is computed rather than laid out with `justifyContent: 'center'`.
 *
 * The boot hold fills the screen, but Home's hold fills only the area above the tab bar. Centring each
 * one inside itself would put the pillars ~20pt higher on Home than on boot, so they would visibly JUMP
 * at the moment the tabs mounted — the exact class of stutter this component exists to remove. An
 * absolute offset from the top of the screen is the same number in both.
 *
 * Read once at module scope: the app is portrait-locked (`orientation: "portrait"`), so there is no
 * rotation for this to go stale against.
 */
const LOGO_TOP = Math.round(Dimensions.get('window').height / 2 - LOGO_HEIGHT / 2);

export function ForgeSplash() {
  return (
    <View style={styles.fill}>
      <Image source={CARVED_LOGO} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  /* `flex: 1`, not `absoluteFill` — this is a SCREEN in one of its three homes (the boot hold renders it
     in place of the whole navigator) and only an overlay in the other two, where the caller supplies the
     absolute box. A component that must fill both a layout slot and an overlay fills the layout slot. */
  fill: { flex: 1, backgroundColor: SPLASH_BACKGROUND },
  logo: { position: 'absolute', alignSelf: 'center', top: LOGO_TOP, width: LOGO_WIDTH, height: LOGO_HEIGHT },
});
