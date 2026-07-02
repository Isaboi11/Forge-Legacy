import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { color } from '@/constants/tokens'
import { PROG } from './_progressTokens'
import type { ForgeChallengeProgressProps } from './types'

export function ForgeChallengeProgress({
  challengeName,
  currentDay,
  totalDays,
  statusLabel,
  style,
  accessibilityLabel,
}: ForgeChallengeProgressProps) {
  const daysRemaining = totalDays - currentDay
  const pct = totalDays > 0 ? Math.round((currentDay / totalDays) * 100) : 0

  return (
    <View
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? `${challengeName}: Day ${currentDay} of ${totalDays}`}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.challengeName}>{challengeName.toUpperCase()}</Text>
          <View style={styles.dayRow}>
            <Text style={styles.dayCount}>{`Day ${currentDay}`}</Text>
            <Text style={styles.dayTotal}>{` / ${totalDays}`}</Text>
          </View>
        </View>
        {statusLabel ? (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>{statusLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* Tick marks */}
      <TickTrack total={totalDays} completed={currentDay} />

      {/* Footer row */}
      <View style={styles.footer}>
        <Text style={styles.remaining}>{`${daysRemaining} days remaining`}</Text>
        <Text style={styles.pct}>{`${pct}% through`}</Text>
      </View>
    </View>
  )
}

function TickTrack({ total, completed }: { total: number; completed: number }) {
  return (
    <View style={styles.ticks}>
      {Array.from({ length: total }, (_, i) => {
        const isDone = i < completed
        return isDone ? (
          <LinearGradient
            key={i}
            colors={[PROG.FILL_DARK_FROM, PROG.FILL_DARK_TO]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tick}
          />
        ) : (
          <View key={i} style={[styles.tick, styles.tickInactive]} />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  headerLeft: { gap: 2 },
  challengeName: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: color.accent.primary,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  dayCount: {
    fontSize: 30,
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  dayTotal: {
    fontSize: 13,
    color: color.text.secondary,
  },
  badge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: color.accent.muted,
    backgroundColor: color.accent.glow,
    alignSelf: 'flex-start',
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: color.accent.primary,
  },
  ticks: {
    flexDirection: 'row',
    gap: 3,
    flexWrap: 'wrap',
  },
  tick: {
    flex: 1,
    minWidth: 6,
    height: 10,
    borderRadius: 3,
  },
  tickInactive: {
    backgroundColor: PROG.TRACK_BG,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  remaining: {
    fontSize: 12,
    color: color.text.secondary,
  },
  pct: {
    fontSize: 12,
    color: color.text.tertiary,
    fontVariant: ['tabular-nums'],
  },
})
