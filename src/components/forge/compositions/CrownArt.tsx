import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { flRadius } from '@/constants/foundation';

/**
 * The competition crown — the emblem behind C-3's and C-4's heroes, with the design's light sweep.
 *
 * TWO ASSETS, AND WHICH ONE IS USED MATTERS:
 *
 *   competition-crown.png       RGB, NO ALPHA — an opaque near-black rectangle with bronze line art on
 *                               it. The design renders this one and hides its edges behind
 *                               `mask-image: radial-gradient(78% 82% at 50% 44%, #000 78%, transparent
 *                               98%)`, which dissolves the rectangle into the page.
 *   competition-crown-mask.png  RGBA — the SAME drawing with real transparency, alpha following the
 *                               crown's line work. The design uses it only as the shimmer's mask.
 *
 * Passing the first one straight into RN — which is what this screen did — puts an opaque rectangle on
 * a textured background with no radial mask to dissolve it, and then sweeps an UNMASKED bright bar
 * across the whole box. That is the "broken and weird" light: in the design the band is clipped to the
 * crown's linework by `mask-image: url(competition-crown-mask.png)` plus `mix-blend-mode: screen`, so
 * light travels along the metal. Mine travelled across a rectangle.
 *
 * THE FIX, WITHOUT A MASKING LIBRARY. `@react-native-masked-view/masked-view` isn't installed and its
 * web support is the thing this project is previewed on, so the intersection is built out of the assets
 * instead: the ALPHA asset is drawn as the art (no rectangle exists to hide, so the radial mask has
 * nothing to do), and the shimmer is more copies of that same alpha asset revealed through a travelling
 * clip window. The window decides WHERE the light is; the PNG's own alpha decides WHAT it lands on. That
 * is the same intersection the design gets from two stacked CSS masks.
 *
 * Three nested windows share a centre at descending widths, so the band falls off at its edges rather
 * than ending in a hard line — the design's `transparent 44% → rgba(230,202,156,0.62) 50% → transparent
 * 56%` gradient, approximated in layers. Composited they peak near 0.58.
 *
 * NOT CARRIED: the band's 15° tilt (`105deg`). Tilting the window would tilt the crown inside it, and
 * un-skewing the content needs `skewX`, which RN and react-native-web disagree about. On line art a
 * vertical band reads the same.
 */

const ART = require('../../../../assets/competition/competition-crown-mask.png');

const W = 308;
const H = 200;

/** Widths and strengths of the three stacked reveal windows, widest and faintest first. */
const BANDS = [
  { width: 132, opacity: 0.18 },
  { width: 82, opacity: 0.24 },
  { width: 40, opacity: 0.32 },
] as const;

/** The design's 10s cycle: still, then a 2.1s sweep, then still — one glint, not a constant shine. */
const HOLD_BEFORE = 6800;
const SWEEP = 2100;
const HOLD_AFTER = 1100;
const START_DELAY = 2000;

export interface CrownArtProps {
  /**
   * Resting opacity of the art. C-3 emerges to 0.90; C-4 settles fully revealed at 1.00.
   *
   * ══ ⚠ THIS NUMBER IS NOT THE CROWN'S BRIGHTNESS, AND THAT IS WHY IT KEPT BEING TOO DARK ══
   *
   * It has now been raised twice from PO reports — 0.34 → 0.60 → here — because everyone reasoned about
   * it as "how visible is the crown", when it is only a MULTIPLIER on an asset that is already mostly
   * transparent. Measured from `competition-crown-mask.png` itself:
   *
   *     max alpha 255 · MEAN ALPHA WHERE DRAWN 81/255 (32%) · brightest pixel luminance 150/255
   *
   * So at 0.60 the crown was reaching the screen at roughly **19% effective alpha**, over a vignette AND
   * a textured background, which is why "hardly visible" survived a fix that looked generous on paper.
   * The file is a MASK: authored soft, to be filled or lit, not to be drawn straight at a fraction.
   *
   * Even at 1.00 nothing can blow out — the brightest pixel in the art is a mid bronze (150/255), not
   * white. There is no headroom being given away here, only headroom being stopped from being thrown
   * away twice over.
   *
   * The design's ordering is restored with it: C-4 settles MORE revealed (1.00) than C-3 emerges (0.90),
   * which was inverted while C-3 sat above C-4 during the last fix.
   */
  opacity: number;
  /** C-3 rises the crown into place; C-4 settles it. Both fade in over `duration`. */
  duration?: number;
  /** The light sweep. Off for the results hero — that season is already decided. */
  shimmer?: boolean;
  width?: number;
  height?: number;
}

export function CrownArt({ opacity, duration = 900, shimmer = true, width = W, height = H }: CrownArtProps) {
  const [enter] = useState(() => new Animated.Value(0));
  const [glint] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const entrance = Animated.timing(enter, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    entrance.start();
    return () => entrance.stop();
  }, [enter, duration]);

  useEffect(() => {
    if (!shimmer) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(HOLD_BEFORE),
        Animated.timing(glint, { toValue: 1, duration: SWEEP, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(HOLD_AFTER),
        Animated.timing(glint, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    const kick = setTimeout(() => loop.start(), START_DELAY);
    return () => {
      clearTimeout(kick);
      loop.stop();
    };
  }, [glint, shimmer]);

  return (
    <View style={[styles.wrap, { width, height }]} pointerEvents="none">
      {/*
        ⚠ THE GLOW IS DOING THE WORK THE OPACITY COULD NOT.
        Raising alpha makes the crown brighter; it does nothing about CONTRAST, and the crown sits on a
        vignette over a textured stone background — a busy near-black ground that a thin bronze line
        drawing simply disappears into. A soft bronze wash behind the art lifts it off that ground, which
        is what "I can hardly see it" was actually describing. It fades in with the crown so nothing
        arrives before the thing it is lighting.
      */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: width * 0.62,
            height: width * 0.62,
            borderRadius: width * 0.31,
            opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
          },
        ]}
      />
      {/* The art. Its own alpha means there is no rectangle to dissolve. */}
      <Animated.View
        style={{
          opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0, opacity] }),
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
          ],
        }}
      >
        <Image source={ART} style={{ width, height }} contentFit="contain" />
      </Animated.View>

      {/* The sweep. A sibling of the art, not a child — in the design it is not dimmed by the crown's
          own opacity, which is what lets a 0.34 crown still catch a bright highlight. */}
      {shimmer
        ? BANDS.map((band) => {
            // Window travels right → left, matching `background-position: 190% → -90%`.
            const from = width + 60 - band.width / 2;
            const to = -60 - band.width / 2;
            return (
              <Animated.View
                key={band.width}
                style={[
                  styles.band,
                  { width: band.width, height, transform: [{ translateX: glint.interpolate({ inputRange: [0, 1], outputRange: [from, to] }) }] },
                ]}
              >
                {/* Counter-translated by exactly the window's offset, so the crown inside stays put
                    while the window slides over it. */}
                <Animated.View style={{ transform: [{ translateX: glint.interpolate({ inputRange: [0, 1], outputRange: [-from, -to] }) }] }}>
                  <Image source={ART} style={{ width, height, opacity: band.opacity }} contentFit="contain" />
                </Animated.View>
              </Animated.View>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden', borderRadius: flRadius.sm },
  /* Centred behind the crown. A blurred bronze disc rather than a gradient image: one view, no asset,
     and it costs nothing on a screen that already carries a full-bleed background. */
  glow: {
    position: 'absolute',
    alignSelf: 'center',
    top: '14%',
    backgroundColor: 'rgba(181,138,97,0.20)',
    boxShadow: '0 0 64px 26px rgba(181,138,97,0.20)',
  },
  band: { position: 'absolute', top: 0, left: 0, overflow: 'hidden' },
});
