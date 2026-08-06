import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const CARVED_LOGO = require('@/assets/welcome-logo-carved.png');

/**
 * WelcomeLogo — the exact `Forge Onboarding.dc` entry mark (Tier C). The carved-stone logo is a baked PNG
 * (the .dc's 5-stop gradient + feTurbulence stone texture + crack, exported 4× at 308×452) — feTurbulence
 * can't render in react-native-svg, so the texture is baked in. Rendered at 77×113 with the .dc's exact
 * drop-shadow, over a breathing bronze glow (flBreath, 9s). This is the Welcome-only mark; the AppBar
 * wordmark keeps its flat vector ForgeMarkIcon.
 *
 * `filter` (drop-shadow / blur) renders on web (the deploy target); on native it degrades gracefully.
 * The one-time entrance sheen sweep is deferred (masking the baked PNG is heavy) — the carved mark +
 * glows carry the fidelity.
 */
export function WelcomeLogo() {
  // flBreath — 9s round trip (4.5s timing, reversed), opacity .5↔.88, scale .98↔1.04.
  const breath = useSharedValue(0);
  useEffect(() => {
    breath.value = withRepeat(withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [breath]);
  const breathStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.5, 0.88]),
    transform: [{ scale: interpolate(breath.value, [0, 1], [0.98, 1.04]) }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.breathGlow, breathStyle]} pointerEvents="none">
        <Svg width={140} height={140}>
          <Defs>
            <RadialGradient id="wl-breath" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="rgb(201,128,44)" stopOpacity={0.10} />
              <Stop offset="0.48" stopColor="rgb(186,134,84)" stopOpacity={0.035} />
              <Stop offset="1" stopColor="rgb(201,128,44)" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={140} height={140} fill="url(#wl-breath)" />
        </Svg>
      </Animated.View>
      <Image source={CARVED_LOGO} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  breathGlow: { position: 'absolute', width: 140, height: 140, filter: 'blur(4px)' },
  logo: {
    width: 77,
    height: 113,
    filter: 'drop-shadow(0 0 5px rgba(198,156,100,0.11)) drop-shadow(0 5px 13px rgba(120,70,20,0.30))',
  },
});
