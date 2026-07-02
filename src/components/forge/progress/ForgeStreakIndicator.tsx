import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { color } from '@/constants/tokens'
import type { ForgeStreakIndicatorProps, StreakState } from './types'

function FlameSVG({ state }: { state: StreakState }) {
  // Approximate SVG flame using a View placeholder.
  // Replace with <Svg><Path> if react-native-svg is added to the project.
  const isActive  = state === 'active'
  const isPaused  = state === 'paused'
  const isBroken  = state === 'broken'

  return (
    <View
      style={[
        styles.flameBox,
        isActive && styles.flameActive,
        isPaused && styles.flamePaused,
        isBroken && styles.flameBroken,
      ]}
      accessibilityElementsHidden
    />
  )
}

export function ForgeStreakIndicator({
  count,
  state = 'active',
  style,
  accessibilityLabel,
}: ForgeStreakIndicatorProps) {
  const isActive = state === 'active'
  const isBroken = state === 'broken'

  const stateLabel =
    state === 'active' ? 'Active · day streak' :
    state === 'paused' ? 'Paused · rest day'   :
                         'Broken · streak lost'

  const stateColor =
    state === 'active' ? color.accent.primary :
    state === 'paused' ? color.text.secondary :
                         color.danger

  return (
    <View
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? `${count} day streak, ${state}`}
    >
      <View style={styles.countRow}>
        <FlameSVG state={state} />
        <Text
          style={[
            styles.count,
            !isActive && !isBroken && styles.countMuted,
            isBroken && styles.countBroken,
          ]}
        >
          {count}
        </Text>
      </View>
      <Text style={[styles.stateLabel, { color: stateColor }]}>
        {stateLabel.toUpperCase()}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 10, alignItems: 'flex-start' },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flameBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  flameActive: {
    backgroundColor: color.accent.primary,
    shadowColor: color.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 2,
  },
  flamePaused: {
    backgroundColor: color.text.secondary,
    opacity: 0.6,
  },
  flameBroken: {
    backgroundColor: color.text.tertiary,
    opacity: 0.55,
  },
  count: {
    fontSize: 28,
    fontWeight: '700',
    color: color.text.primary,
    fontVariant: ['tabular-nums'],
  },
  countMuted: {
    color: color.text.secondary,
  },
  countBroken: {
    color: color.text.tertiary,
  },
  stateLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
