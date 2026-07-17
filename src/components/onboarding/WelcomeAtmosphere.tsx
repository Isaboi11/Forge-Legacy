import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * WelcomeAtmosphere — the constructed "forged hall" behind the Welcome/entry screen, built up to
 * `Forge Onboarding.dc`'s first screen: a near-black ground with a faint cathedral arch, pillar-edge
 * shadows, a warm forge glow rising from the floor, an inward vignette, and a broad focal light in the
 * stone behind the logo.
 *
 * All feasible + cross-platform — SVG `RadialGradient` (the `ScreenBackground` engine's technique, incl.
 * an INVERSE transparent→dark radial the shared engine can't express), `expo-linear-gradient` pillars,
 * and a `boxShadow` inset on the arch. The design's `feTurbulence` stone texture, SMIL sheen sweep, and
 * ember-pulse are a web-polish fast-follow (Tier B), deliberately not here. Absolutely positioned,
 * `pointerEvents="none"`, so it sits behind content and never intercepts taps.
 */
export function WelcomeAtmosphere() {
  return (
    <View style={styles.root} pointerEvents="none">
      {/* forged-hall arch — a faint rounded-top silhouette, its inset shadow darkening the ceiling */}
      <View style={styles.arch} />

      {/* pillar-edge shadows — the hall falls into dark at both sides */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.pillarLeft}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.pillarRight}
      />

      {/* radial lights — forge glow (floor) · vignette (inward, transparent→dark) · focal light (in the
          stone, behind the logo). Stacked full-bleed rects; the warm focal sits ON TOP of the vignette
          so the light punches through the darkening. */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="wa-forge" cx="50%" cy="100%" rx="75%" ry="44%">
            <Stop offset="0" stopColor="rgba(201,128,44,0.12)" />
            <Stop offset="0.5" stopColor="rgba(120,70,20,0.05)" />
            <Stop offset="1" stopColor="rgba(201,128,44,0)" />
          </RadialGradient>
          <RadialGradient id="wa-vignette" cx="50%" cy="42%" rx="80%" ry="68%">
            <Stop offset="0.44" stopColor="rgba(4,6,8,0)" />
            <Stop offset="1" stopColor="rgba(4,6,8,0.5)" />
          </RadialGradient>
          <RadialGradient id="wa-focal" cx="50%" cy="20%" rx="58%" ry="42%">
            <Stop offset="0" stopColor="rgba(201,128,44,0.12)" />
            <Stop offset="0.4" stopColor="rgba(163,112,52,0.05)" />
            <Stop offset="1" stopColor="rgba(201,128,44,0)" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#wa-forge)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#wa-vignette)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#wa-focal)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#08090B', overflow: 'hidden' },
  arch: {
    position: 'absolute',
    top: '-30%',
    left: '-12%',
    right: '-12%',
    height: '80%',
    borderTopLeftRadius: 320,
    borderTopRightRadius: 320,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(198,156,100,0.03)',
    boxShadow: 'inset 0 10px 50px rgba(0,0,0,0.4)',
  },
  pillarLeft: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 54 },
  pillarRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 54 },
});
