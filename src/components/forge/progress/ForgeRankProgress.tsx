import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { color } from '@/constants/tokens'
import { PROG } from './_progressTokens'
import type { ForgeRankProgressProps } from './types'

export function ForgeRankProgress({
  currentRank,
  nextRank,
  currentRP,
  requiredRP,
  style,
  accessibilityLabel,
}: ForgeRankProgressProps) {
  const pct       = requiredRP > 0 ? Math.max(0, Math.min(100, (currentRP / requiredRP) * 100)) : 0
  const toPromote = requiredRP - currentRP
  const h         = PROG.HEIGHT_RANK

  return (
    <View
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? `Rank progress: ${currentRP} of ${requiredRP} RP toward ${nextRank}`}
    >
      {/* Rank row */}
      <View style={styles.rankRow}>
        <Text style={styles.currentRank}>{currentRank}</Text>
        <Text style={styles.arrow}>{'→'}</Text>
        <Text style={styles.nextRank}>{nextRank}</Text>
      </View>

      {/* Track */}
      <View style={[styles.track, { height: h, borderRadius: h / 2 }]}>
        {pct > 0 ? (
          <LinearGradient
            colors={[PROG.FILL_FROM, PROG.FILL_MID, PROG.FILL_TO]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${pct}%`, borderRadius: h / 2 }]}
          >
            <View style={[styles.cap, { width: h + 4, borderRadius: h / 2 }]} />
          </LinearGradient>
        ) : null}
      </View>

      {/* RP row */}
      <View style={styles.rpRow}>
        <Text style={styles.rpCurrent}>
          <Text style={styles.rpValue}>{currentRP.toLocaleString()}</Text>
          {` / ${requiredRP.toLocaleString()} RP`}
        </Text>
        <Text style={styles.rpRemaining}>{`${toPromote.toLocaleString()} to promote`}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currentRank: {
    fontSize: 16,
    fontWeight: '600',
    color: color.text.secondary,
  },
  arrow: {
    fontSize: 12,
    color: color.text.tertiary,
  },
  nextRank: {
    fontSize: 16,
    fontWeight: '600',
    color: color.accent.primary,
  },
  track: {
    width: '100%',
    backgroundColor: PROG.TRACK_RANK,
    borderWidth: 1,
    borderColor: color.border.subtle,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  cap: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: PROG.CAP_COLOR,
    shadowColor: PROG.GLOW_CAP,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 2,
  },
  rpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rpCurrent: {
    fontSize: 12,
    color: color.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  rpValue: {
    color: color.accent.primary,
    fontWeight: '600',
  },
  rpRemaining: {
    fontSize: 12,
    color: color.text.tertiary,
  },
})
