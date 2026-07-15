import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * ScreenBackground — the ONE background layer for every product screen (the categorical replacement
 * for the per-screen `bgAtmospheric` gradient). Renders the design's per-screen artwork (cover) on a
 * near-black base, with a darkening gradient over it for text legibility — the `.dc` layers a dark
 * gradient over the artwork the same way. `image` omitted → base + overlay only (graceful).
 *
 * `image` is the static base artwork (cover). `fadeImage` is an optional distinct layer over it that
 * dissolves as `scrollY` grows — the Legacy hero mountains fading away on scroll (the `.dc` "premium
 * scroll choreography"). Screens without a fade pass only `image`.
 *
 * Absolutely positioned + `pointerEvents="none"` so it sits behind content and never intercepts taps.
 */
export function ScreenBackground({
  image,
  fadeImage,
  scrollY,
}: {
  image?: number;
  fadeImage?: number;
  scrollY?: Animated.Value;
}) {
  const fadeOpacity = scrollY
    ? scrollY.interpolate({ inputRange: [0, 260], outputRange: [1, 0], extrapolate: 'clamp' })
    : 1;

  return (
    <View style={styles.base} pointerEvents="none">
      {image != null ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      {fadeImage != null ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeOpacity }]}>
          <Image source={fadeImage} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Animated.View>
      ) : null}
      <LinearGradient
        colors={['rgba(5,5,5,0.22)', 'rgba(5,5,5,0.36)', 'rgba(5,5,5,0.55)']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#050505' },
});
