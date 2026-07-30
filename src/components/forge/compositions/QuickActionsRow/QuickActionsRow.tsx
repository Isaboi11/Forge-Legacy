/**
 * QuickActionsRow — the Home "Quick Actions" utility row.
 * Source of truth: Forge Home.dc.html (§ Quick Actions, lines 256–267).
 *
 * Two utilities, deliberately lighter than the people above: Train Together (bronze-tint,
 * emphasized) + Competitions (subtle, with a count badge). Icons ported 1:1 from the
 * dc SVG paths.
 *
 * THE FIRST ACTION WAS "CHALLENGE". It opened a sheet whose every row was inert — S-10 Train Together is
 * unbuilt and FRIENDS-context competitions are deferred — so it duplicated the button beside it and then
 * dead-ended. It is now presence: who from your circle is lifting right now, which is the honest form of
 * "work out with friends" while a shared session does not exist. Competitions is unchanged; a challenge
 * still starts from the hub.
 *
 * THE COUNT DEFAULTS TO ZERO, i.e. no badge. It used to default to 2 — a number the dc drew for its
 * mock and this component inherited as a literal, so every athlete was told they had two live
 * competitions whether or not they had ever entered one. A badge is a claim; it now only draws when the
 * caller supplies a real figure.
 */

import React from 'react'
import Svg, { Path } from 'react-native-svg'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { flColor, flRadius } from '@/constants/foundation'

export interface QuickActionsRowProps {
  onTrainTogether: () => void
  onCompetitions: () => void
  competitionsCount?: number
  /** How many of the athlete's circle are mid-workout. 0 draws no badge. */
  trainingCount?: number
  /** "2 people from Iron Vigil are working out" — the sub-line, when anyone is. */
  trainingSummary?: string | null
}

function FlameIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3s5 4.2 5 8.6a5 5 0 0 1-10 0C7 9 9 7 9 7s.6 2 1.6 2.6C11.4 8 12 5.6 12 3z" />
    </Svg>
  )
}
function TrophyIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M6 4v6a6 6 0 0 0 12 0V4M12 16v4M8.5 20h7" />
    </Svg>
  )
}

export function QuickActionsRow({
  onTrainTogether,
  onCompetitions,
  competitionsCount = 0,
  trainingCount = 0,
  trainingSummary = null,
}: QuickActionsRowProps) {
  return (
    <View>
      <View style={styles.row}>
        <Pressable
          onPress={onTrainTogether}
          accessibilityRole="button"
          accessibilityLabel={trainingSummary ?? 'See who is training now'}
          style={styles.challenge}
        >
          <FlameIcon />
          <Text style={styles.challengeText}>Train Together</Text>
          {trainingCount > 0 ? (
            <View style={styles.liveDot} />
          ) : null}
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

      {/* Said once, in words, rather than as a number on a button nobody decodes. */}
      {trainingSummary ? <Text style={styles.summary}>{trainingSummary}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  liveDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: flColor.greenMuted, boxShadow: '0 0 6px rgba(90, 158, 104, 0.6)' },
  summary: { marginTop: 9, paddingHorizontal: 2, fontSize: 11.5, color: flColor.gray600 },
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
