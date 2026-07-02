import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { color } from '@/constants/tokens'
import { ForgeProgressBar } from './ForgeProgressBar'
import type { ForgeProgramProgressProps } from './types'

export function ForgeProgramProgress({
  programName,
  completedSessions,
  totalSessions,
  style,
  accessibilityLabel,
}: ForgeProgramProgressProps) {
  const pct       = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0
  const remaining = totalSessions - completedSessions

  return (
    <View
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? `${programName}: ${pct}% complete`}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <Text style={styles.name} numberOfLines={1}>{programName}</Text>
        <Text style={styles.ratio}>{`${completedSessions} / ${totalSessions}`}</Text>
      </View>

      {/* 10px track */}
      <ForgeProgressBar percentage={pct} height="thick" />

      {/* Helper row */}
      <View style={styles.helperRow}>
        <Text style={styles.helper}>{`${pct}% complete`}</Text>
        <Text style={styles.helperMuted}>{`${remaining} session${remaining !== 1 ? 's' : ''} remaining`}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 7 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.primary,
    flex: 1,
    marginRight: 8,
  },
  ratio: {
    fontSize: 13,
    fontWeight: '600',
    color: color.text.secondary,
    fontVariant: ['tabular-nums'],
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
