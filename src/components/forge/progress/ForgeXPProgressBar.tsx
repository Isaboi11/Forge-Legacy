import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { color } from '@/constants/tokens'
import { ForgeProgressBar } from './ForgeProgressBar'
import type { ForgeXPProgressBarProps } from './types'

export function ForgeXPProgressBar({
  current,
  total,
  currentLevel,
  nextLevel,
  style,
  accessibilityLabel,
}: ForgeXPProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  const remaining = total - current

  return (
    <View
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? `Level ${currentLevel}: ${current} of ${total} XP`}
    >
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={styles.levelLabel}>{`Level ${currentLevel}`}</Text>
        <Text style={styles.xpFraction}>
          <Text style={styles.xpCurrent}>{current.toLocaleString()}</Text>
          {` / ${total.toLocaleString()} XP`}
        </Text>
      </View>

      <ForgeProgressBar percentage={pct} height="default" />

      {/* Helper row */}
      <View style={styles.helperRow}>
        <Text style={styles.helper}>{`${remaining.toLocaleString()} XP remaining`}</Text>
        <Text style={styles.helperMuted}>{`Level ${nextLevel}`}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: color.text.secondary,
  },
  xpFraction: {
    fontSize: 13,
    color: color.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  xpCurrent: {
    color: color.accent.primary,
    fontWeight: '600',
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  helper: {
    fontSize: 12,
    color: color.text.secondary,
  },
  helperMuted: {
    fontSize: 12,
    color: color.text.tertiary,
  },
})
