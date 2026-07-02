import React, { useEffect, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { color } from '@/constants/tokens'
import { PROG } from './_progressTokens'
import { ForgeCircularProgress } from './ForgeCircularProgress'
import type { ForgeCountdownProgressProps } from './types'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ForgeCountdownProgress({
  secondsRemaining,
  totalSeconds,
  state = 'active',
  variant = 'circular',
  style,
  accessibilityLabel,
}: ForgeCountdownProgressProps) {
  const pct        = totalSeconds > 0 ? Math.max(0, Math.min(100, (secondsRemaining / totalSeconds) * 100)) : 0
  const timeLabel  = formatTime(secondsRemaining)
  const isWarning  = state === 'warning'
  const isComplete = state === 'complete'

  const pulseOpacity = useState(() => new Animated.Value(1))[0]

  useEffect(() => {
    if (!isWarning) {
      pulseOpacity.setValue(1)
      return
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, { toValue: 0.4, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [isWarning, pulseOpacity])

  const accentColor = isWarning ? color.danger : color.accent.primary

  if (variant === 'linear') {
    const fillColors: [string, string, string] = isWarning
      ? [color.danger, color.danger, color.danger]
      : [PROG.FILL_FROM, PROG.FILL_MID, PROG.FILL_TO]

    return (
      <View
        style={[styles.linearRoot, style]}
        accessibilityLabel={accessibilityLabel ?? `${timeLabel} remaining`}
      >
        <View style={styles.linearTrack}>
          {pct > 0 ? (
            <LinearGradient
              colors={fillColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.linearFill, { width: `${pct}%` }]}
            />
          ) : null}
        </View>
        <Text style={[styles.linearTime, isWarning && styles.textWarning]}>
          {timeLabel}
        </Text>
      </View>
    )
  }

  const centerContent = isComplete ? (
    <Text style={styles.checkmark}>{'checkmark'}</Text>
  ) : (
    <Text style={[styles.timeText, isWarning && styles.textWarning]}>{timeLabel}</Text>
  )

  return (
    <Animated.View
      style={[styles.circRoot, { opacity: isWarning ? pulseOpacity : 1 }, style]}
      accessibilityLabel={accessibilityLabel ?? `${timeLabel} remaining`}
    >
      <ForgeCircularProgress
        percentage={pct}
        size="medium"
        centerContent={centerContent}
        centerBg={color.background.surface}
      />
      <Text style={[styles.stateLabel, { color: accentColor }]}>
        {state.charAt(0).toUpperCase() + state.slice(1)}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  circRoot: {
    alignItems: 'center',
    gap: 10,
  },
  timeText: {
    fontSize: 20,
    fontWeight: '600',
    color: color.text.primary,
    fontVariant: ['tabular-nums'],
  },
  textWarning: {
    color: color.danger,
  },
  checkmark: {
    fontSize: 24,
    fontWeight: '700',
    color: color.accent.primary,
  },
  stateLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  linearRoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  linearTrack: {
    flex: 1,
    height: 8,
    borderRadius: 99,
    backgroundColor: PROG.TRACK_BG,
    overflow: 'hidden',
  },
  linearFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 99,
  },
  linearTime: {
    fontSize: 16,
    fontWeight: '600',
    color: color.text.primary,
    fontVariant: ['tabular-nums'],
  },
})
