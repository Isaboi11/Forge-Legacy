/**
 * HonorCeremony — the reusable honor-earned ceremony (built to `Forge First Honor Ceremony.dc.html`,
 * Design b029488a). A centered ceremony Modal (never tap-outside dismissible) whose centerpiece is a
 * "living forged medallion": a bronze-metallic ring over a recessed face holding the honor's SYMBOL, with
 * a forge-heat bloom breathing behind it, the symbol flickering under a bronze glow, and the medallion
 * striking in on the ceremony curve while the name / body / footer rise in staged.
 *
 * The SYMBOL is the only per-honor variable (see HonorSymbol) — the frame, coloring, glow, and motion are
 * identical for every honor. Used both for the fresh-athlete's first honor (Initiative, "Keep Building" →
 * the guided tour) and, via `useCeremony`, for every honor earned through the ceremony queue.
 *
 * Visual deltas vs the .dc: the radial bloom/symbol glows are real (SVG radial), the light-sweep across
 * the face is dropped, and entrances use RN `Animated` (spring strike + staggered rise) rather than CSS
 * keyframes. Reduced Motion collapses all of it to the final resting state.
 */

import React, { useEffect, useState } from 'react';
import { Animated, Easing, Modal as RNModal, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

export interface HonorCeremonyProps {
  open: boolean;
  eyebrow?: string;
  honorName: string;
  body?: string;
  /** The per-honor mark rendered inside the medallion (already sized/colored). */
  symbol: React.ReactNode;
  /** Stacked action buttons — supplied per context (e.g. "Keep Building", or "Continue" + "Share"). */
  footer: React.ReactNode;
  /** Hardware-back / required-action close. Never fired by tapping the scrim. */
  onRequestClose: () => void;
}

export function HonorCeremony({ open, eyebrow = 'Honor Earned', honorName, body, symbol, footer, onRequestClose }: HonorCeremonyProps) {
  const reduce = useReducedMotion();

  // Lazy useState (not useRef) for the animated values — the strict hooks rules forbid reading a ref during
  // render, and these `.interpolate()` into styles. The value is created once and mutated imperatively.
  const [strike] = useState(() => new Animated.Value(0));
  const [bloom] = useState(() => new Animated.Value(0));
  const [flicker] = useState(() => new Animated.Value(0));
  const [nameRise] = useState(() => new Animated.Value(0));
  const [bodyRise] = useState(() => new Animated.Value(0));
  const [footRise] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!open) return;
    if (reduce) {
      strike.setValue(1);
      nameRise.setValue(1);
      bodyRise.setValue(1);
      footRise.setValue(1);
      bloom.setValue(0.5);
      flicker.setValue(0.5);
      return;
    }
    strike.setValue(0);
    nameRise.setValue(0);
    bodyRise.setValue(0);
    footRise.setValue(0);

    Animated.spring(strike, { toValue: 1, friction: 7, tension: 62, useNativeDriver: true }).start();
    Animated.stagger(140, [
      Animated.timing(nameRise, { toValue: 1, duration: 520, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bodyRise, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(footRise, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    const loop = (v: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      );
    const bloomLoop = loop(bloom, 1700);
    const flickerLoop = loop(flicker, 1300);
    bloomLoop.start();
    flickerLoop.start();
    return () => {
      bloomLoop.stop();
      flickerLoop.stop();
    };
  }, [open, reduce, strike, bloom, flicker, nameRise, bodyRise, footRise]);

  const rise = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });

  return (
    <RNModal visible={open} transparent statusBarTranslucent animationType={reduce ? 'none' : 'fade'} onRequestClose={onRequestClose}>
      <View style={styles.scrim}>
        <View style={styles.card} accessibilityViewIsModal accessibilityRole="alert">
          {/* ── living forged medallion ── */}
          <Animated.View
            style={[
              styles.medallion,
              { opacity: strike, transform: [{ scale: strike.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }] },
            ]}
          >
            {/* forge-heat bloom, breathing behind the medallion (radial → real) */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.bloom,
                {
                  opacity: bloom.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
                  transform: [{ scale: bloom.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] }) }],
                },
              ]}
            >
              <Svg width="100%" height="100%">
                <Defs>
                  <RadialGradient id="honor-bloom" cx="50%" cy="50%" rx="50%" ry="50%">
                    <Stop offset="0" stopColor="rgba(186, 134, 84,0.38)" />
                    <Stop offset="0.46" stopColor="rgba(186, 134, 84,0.09)" />
                    <Stop offset="0.7" stopColor="rgba(186, 134, 84,0)" />
                  </RadialGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#honor-bloom)" />
              </Svg>
            </Animated.View>

            <LinearGradient
              colors={flGradient.bronzeMetallic.colors}
              locations={flGradient.bronzeMetallic.locations}
              start={flGradient.bronzeMetallic.start}
              end={flGradient.bronzeMetallic.end}
              style={styles.ring}
            >
              <View style={styles.inner}>
                {/* soft radial behind the symbol */}
                <View pointerEvents="none" style={styles.symbolGlow}>
                  <Svg width="100%" height="100%">
                    <Defs>
                      <RadialGradient id="honor-sym" cx="50%" cy="60%" rx="50%" ry="50%">
                        <Stop offset="0" stopColor="rgba(201, 151, 103,0.55)" />
                        <Stop offset="0.45" stopColor="rgba(186, 134, 84,0.16)" />
                        <Stop offset="0.72" stopColor="rgba(186, 134, 84,0)" />
                      </RadialGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#honor-sym)" />
                  </Svg>
                </View>
                <Animated.View
                  style={{
                    opacity: flicker.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
                    transform: [{ scale: flicker.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
                  }}
                >
                  {symbol}
                </Animated.View>
              </View>
            </LinearGradient>
          </Animated.View>

          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Animated.Text style={[styles.name, rise(nameRise)]}>{honorName}</Animated.Text>
          {body ? <Animated.Text style={[styles.body, rise(bodyRise)]}>{body}</Animated.Text> : null}
          <Animated.View style={[styles.footer, rise(footRise)]}>{footer}</Animated.View>
        </View>
      </View>
    </RNModal>
  );
}

const RING = 108;
const BLOOM = 232;

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: flColor.overlayDark,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 34,
    paddingBottom: 24,
    gap: 14,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    boxShadow: `${flShadow.borderInset}, ${flShadow.ambient}, ${flShadow.glowSubtle}`,
  },

  medallion: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  bloom: {
    position: 'absolute',
    width: BLOOM,
    height: BLOOM,
    left: (RING - BLOOM) / 2,
    top: (RING - BLOOM) / 2,
  },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `${flShadow.borderInset}, ${flShadow.glowBadge}`,
  },
  inner: {
    width: '100%',
    height: '100%',
    borderRadius: (RING - 16) / 2,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
  },
  symbolGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  eyebrow: {
    fontFamily: flFont.sans,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  name: {
    fontFamily: flFont.display,
    fontSize: 27,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 30,
    textAlign: 'center',
    color: flColor.cream100,
  },
  body: {
    fontFamily: flFont.sans,
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
    color: flColor.gray400,
    maxWidth: 300,
  },
  footer: { alignSelf: 'stretch', marginTop: 8, gap: 10 },
});
