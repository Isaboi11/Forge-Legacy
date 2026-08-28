import { Image, StyleSheet, View } from 'react-native';
import { IS_PAPER } from '@/constants/foundation';
import { SPLASH_LOGO, SPLASH_LOGO_BOX, SPLASH_LOGO_TOP } from '@/components/splash-geometry';

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
 * The artwork and its box live in `splash-geometry.ts` — shared with the boot gate, which cannot import
 * this file. The box is `app.json`'s `imageWidth`, and it is a SQUARE the mark is contain-fitted into,
 * not the mark's width; drawing "104 wide" here against a plugin that thinks in squares is exactly how
 * the launch came to show two sizes of pillar. See the note on `SPLASH_LOGO`.
 */

type Props = {
  /**
   * `theme` (default) — the ground the athlete chose. Every hold renders this.
   *
   * `forge` — the NATIVE splash's ground, whatever the theme. Only `AnimatedSplashOverlay` asks for it:
   * that overlay is the continuation of what the OS was already drawing, and `app.json`'s colour is
   * build config that cannot know a per-athlete preference. It fades out over the theme's own splash,
   * so an Alabaster launch DISSOLVES from the dark native frame to the light app instead of cutting —
   * which is as close as the platform allows to a splash that follows the theme.
   */
  ground?: 'theme' | 'forge';
};

export function ForgeSplash({ ground = 'theme' }: Props) {
  return (
    <View style={[styles.fill, ground === 'forge' && styles.fillForge]}>
      <Image source={SPLASH_LOGO} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  /* `flex: 1`, not `absoluteFill` — this is a SCREEN in one of its three homes (the boot hold renders it
     in place of the whole navigator) and only an overlay in the other two, where the caller supplies the
     absolute box. A component that must fill both a layout slot and an overlay fills the layout slot. */
  fill: { flex: 1, backgroundColor: SPLASH_BACKGROUND },
  fillForge: { backgroundColor: SPLASH_BACKGROUND_FORGE },
  logo: {
    position: 'absolute',
    alignSelf: 'center',
    top: SPLASH_LOGO_TOP,
    width: SPLASH_LOGO_BOX,
    height: SPLASH_LOGO_BOX,
  },
});
