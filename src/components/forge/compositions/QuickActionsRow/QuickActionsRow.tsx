/**
 * QuickActionsRow — the Home "Quick Actions" utility row.
 * Source of truth: Forge Home.dc.html (§ Quick Actions, lines 256–267).
 *
 * Two utilities, deliberately lighter than the people above: Challenge (bronze-tint,
 * emphasized) + Competitions (subtle, with a count badge). Icons ported 1:1 from the
 * dc SVG paths. Handlers are placeholders (C-2 Create Challenge / Competitions Hub
 * are not built yet); the count is placeholder.
 */

import React from 'react'
import Svg, { Path } from 'react-native-svg'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { flColor, flRadius } from '@/constants/foundation'

export interface QuickActionsRowProps {
  onChallenge: () => void
  onCompetitions: () => void
  competitionsCount?: number
}

function SwordsIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 4.5L18 17.5M19 4.5L6 17.5M12.7 15.8L16.3 12.2M7.7 12.2L11.3 15.8" />
    </Svg>
  )
}
function TrophyIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 4v6a6 6 0 0 0 12 0V4M12 16v4M8.5 20h7" />
    </Svg>
  )
}

export function QuickActionsRow({ onChallenge, onCompetitions, competitionsCount = 2 }: QuickActionsRowProps) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onChallenge} accessibilityRole="button" accessibilityLabel="Challenge a friend" style={styles.challenge}>
        <SwordsIcon />
        <Text style={styles.challengeText}>Challenge</Text>
      </Pressable>
      <Pressable onPress={onCompetitions} accessibilityRole="button" accessibilityLabel="View competitions" style={styles.competitions}>
        <TrophyIcon />
        <Text style={styles.competitionsText}>Competitions</Text>
        {competitionsCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{competitionsCount}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  challenge: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  challengeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: flColor.bronze300,
  },
  competitions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  competitionsText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '600',
    color: flColor.gray400,
  },
  badge: {
    flexShrink: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: flColor.bronze300,
  },
})
