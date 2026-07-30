import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/**
 * WelcomeAtmosphere — the exact `Forge Onboarding.dc` "forged hall" behind the Welcome (Tier C).
 * Gradient OPACITIES are reproduced verbatim from the .dc (no re-tuning — that's what read flat before).
 * Transparent base — it layers OVER the shared slate ScreenBackground: forged-hall arch · pillar-edge
 * shadows · a warm floor forge-glow · an inward vignette ·
 * a broad focal light in the stone · and the animated ember (flEmber, 8s). Each glow is positioned to its
 * .dc box with an SVG RadialGradient. Absolutely positioned, pointerEvents none.
 *
 * Honest note: CSS radial-gradient extent (farthest-corner) ≠ SVG RadialGradient `r`, so the glow GEOMETRY
 * is mapped, not pixel-identical; the colors/opacities and box positions ARE exact. `filter: blur` renders
 * on web (the deploy target); on native it's a graceful no-op.
 */
export function WelcomeAtmosphere() {
  // flEmber — 8s round trip (4s timing, reversed), opacity .85↔1, scale 1↔1.05.
  const ember = useSharedValue(0);
  useEffect(() => {
    ember.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [ember]);
  const emberStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ember.value, [0, 1], [0.85, 1]),
    transform: [{ translateX: -140 }, { scale: interpolate(ember.value, [0, 1], [1, 1.05]) }],
  }));

  return (
    <View style={styles.root} pointerEvents="none">
      {/* forged-hall arch — faint rounded-top silhouette, its inset shadow darkening the ceiling */}
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

      {/* focal light in the stone — top 6%, 540×540, radial circle at 50% 42% */}
      <View style={styles.focal}>
        <Svg width={540} height={540}>
          <Defs>
            <RadialGradient id="wa-focal" cx="50%" cy="42%" r="64%">
              <Stop offset="0" stopColor="rgba(201,128,44,0.11)" />
              <Stop offset="0.52" stopColor="rgba(163,112,52,0.05)" />
              <Stop offset="1" stopColor="rgba(201,128,44,0)" />
            </RadialGradient>
          </Defs>
          <Rect width={540} height={540} fill="url(#wa-focal)" />
        </Svg>
      </View>

      {/* forge glow — floor, 150%×38% at the bottom */}
      <View style={styles.forge}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="wa-forge" cx="50%" cy="100%" rx="58%" ry="82%">
              <Stop offset="0" stopColor="rgba(201,128,44,0.055)" />
              <Stop offset="0.36" stopColor="rgba(120,70,20,0.028)" />
              <Stop offset="0.72" stopColor="rgba(201,128,44,0)" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#wa-forge)" />
        </Svg>
      </View>

      {/* vignette — inward, transparent→dark */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="wa-vignette" cx="50%" cy="42%" rx="80%" ry="68%">
            <Stop offset="0.44" stopColor="rgba(4,6,8,0)" />
            <Stop offset="1" stopColor="rgba(4,6,8,0.5)" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#wa-vignette)" />
      </Svg>

      {/* ember — animated (flEmber 8s), top 20%, 280×340 behind the logo */}
      <Animated.View style={[styles.ember, emberStyle]}>
        <Svg width={280} height={340}>
          <Defs>
            <RadialGradient id="wa-ember" cx="50%" cy="44%" rx="46%" ry="40%">
              <Stop offset="0" stopColor="rgba(201,128,44,0.10)" />
              <Stop offset="0.42" stopColor="rgba(186, 134, 84,0.04)" />
              <Stop offset="0.72" stopColor="rgba(120,70,20,0)" />
            </RadialGradient>
          </Defs>
          <Rect width={280} height={340} fill="url(#wa-ember)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Transparent base — the shared slate ScreenBackground sits UNDER this; the forged-hall gradients
  // (arch, pillars, forge glow, vignette, focal, ember) layer over the slate texture (the .dc order).
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  arch: {
    position: 'absolute',
    top: '-34%',
    left: '-12%',
    right: '-12%',
    height: '80%',
    borderTopLeftRadius: 320,
    borderTopRightRadius: 320,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(198,156,100,0.028)',
    boxShadow: 'inset 0 10px 50px rgba(0,0,0,0.4)',
  },
  pillarLeft: {
    position: 'absolute',
    top: '-8%',
    bottom: 0,
    left: 0,
    width: 54,
    borderRightWidth: 1,
    borderRightColor: 'rgba(198,156,100,0.03)',
  },
  pillarRight: {
    position: 'absolute',
    top: '-8%',
    bottom: 0,
    right: 0,
    width: 54,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(198,156,100,0.03)',
  },
  focal: { position: 'absolute', top: '6%', left: '50%', width: 540, height: 540, marginLeft: -270 },
  forge: { position: 'absolute', bottom: '-2%', left: '-25%', width: '150%', height: '38%' },
  ember: { position: 'absolute', top: '20%', left: '50%', width: 280, height: 340, filter: 'blur(4px)' },
});
