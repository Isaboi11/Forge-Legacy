import React, { useEffect, useState } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { color } from '@/constants/tokens'
import { PROG } from './_progressTokens'
import type { ForgeLoadingProgressProps } from './types'

export function ForgeLoadingProgress({
  variant = 'indeterminate',
  percentage = 0,
  label,
  style,
  accessibilityLabel,
}: ForgeLoadingProgressProps) {
  return (
    <View
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={variant === 'determinate'
        ? { min: 0, max: 100, now: Math.max(0, Math.min(100, percentage)) }
        : undefined}
    >
      {variant === 'determinate'   ? <DeterminateBar percentage={percentage} /> :
       variant === 'indeterminate' ? <IndeterminateBar /> :
                                     <InlineSpinner />}

      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  )
}

// ─── Determinate ─────────────────────────────────────────────────────────────

function DeterminateBar({ percentage }: { percentage: number }) {
  const pct = Math.max(0, Math.min(100, percentage))
  return (
    <View style={styles.track}>
      {pct > 0 ? (
        <LinearGradient
          colors={[PROG.FILL_FROM, PROG.FILL_MID, PROG.FILL_TO]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${pct}%` }]}
        >
          <View style={styles.cap} />
        </LinearGradient>
      ) : null}
    </View>
  )
}

// ─── Indeterminate shimmer ────────────────────────────────────────────────────

function IndeterminateBar() {
  const translateX = useState(() => new Animated.Value(-1))[0]

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue:         1.5,
        duration:        1500,
        easing:          Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    )
    anim.start()
    return () => anim.stop()
  }, [translateX])

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.shimmerContainer,
          {
            transform: [
              {
                translateX: translateX.interpolate({
                  inputRange:  [-1, 1.5],
                  outputRange: [-200, 400],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', PROG.FILL_DARK_FROM, PROG.FILL_TO, PROG.FILL_DARK_FROM, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmer}
        />
      </Animated.View>
    </View>
  )
}

// ─── Inline spinner ───────────────────────────────────────────────────────────

export function InlineSpinner({ size = 26 }: { size?: number }) {
  const rotation = useState(() => new Animated.Value(0))[0]

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, {
        toValue:         1,
        duration:        900,
        easing:          Easing.linear,
        useNativeDriver: true,
      })
    )
    anim.start()
    return () => anim.stop()
  }, [rotation])

  const spin   = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const stroke = Math.max(2, Math.round(size * 0.115))
  const inner  = size - stroke * 2

  return (
    <Animated.View
      style={[
        styles.spinnerOuter,
        { width: size, height: size, borderRadius: size / 2, borderWidth: stroke },
        { transform: [{ rotate: spin }] },
      ]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.spinnerArc,
          { borderRadius: size / 2, borderTopColor: color.accent.primary, borderWidth: stroke },
        ]}
      />
      <View
        style={[
          styles.spinnerHole,
          { width: inner, height: inner, borderRadius: inner / 2 },
        ]}
      />
    </Animated.View>
  )
}

const TRACK_H = PROG.HEIGHT_DEFAULT

const styles = StyleSheet.create({
  root: { gap: 8 },
  track: {
    height: TRACK_H,
    borderRadius: 99,
    backgroundColor: PROG.TRACK_BG,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 99,
  },
  cap: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: TRACK_H + 2,
    borderRadius: 99,
    backgroundColor: PROG.CAP_COLOR,
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
  },
  shimmer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: color.text.secondary,
  },
  spinnerOuter: {
    borderColor: PROG.TRACK_BG,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    alignSelf: 'flex-start',
  },
  spinnerArc: {
    borderTopColor: color.accent.primary,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  spinnerHole: {
    position: 'absolute',
    backgroundColor: color.background.primary,
  },
})
