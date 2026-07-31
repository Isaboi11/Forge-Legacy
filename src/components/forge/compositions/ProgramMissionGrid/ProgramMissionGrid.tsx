/**
 * ProgramMissionGrid — the Home 2-column Program | Mission grid.
 * Source of truth: Forge Home.dc.html (§ Program | Mission, lines 142–186).
 *
 * Program tile reads REAL data (the active program from `training/active-program.ts`).
 * Mission tile shows the real chapter goal (0025) — the caller passes it in.
 */

import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation'
import { ProgressBar } from '../../composites/ProgressBar'
import { ChevronRightIcon } from '../../primitives/icons/HomeIcons'

export interface ProgramMissionGridProps {
  programName: string
  completed: number
  total: number
  missionTarget: string
  goalsRemaining: number
  onProgram?: () => void
  onMission?: () => void
}

function TileHeader({ label }: { label: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>{label}</Text>
      <ChevronRightIcon size={14} color={flColor.gray600} />
    </View>
  )
}

function TargetIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={flColor.bronze400} strokeWidth={2} />
      <Circle cx={12} cy={12} r={3} stroke={flColor.bronze400} strokeWidth={2} />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="square" />
    </Svg>
  )
}

export function ProgramMissionGrid({
  programName,
  completed,
  total,
  missionTarget,
  goalsRemaining,
  onProgram,
  onMission,
}: ProgramMissionGridProps) {
  return (
    <View style={styles.grid}>
      <Pressable
        onPress={onProgram}
        accessibilityRole="button"
        accessibilityLabel={`Current program: ${programName}. ${completed} of ${total} workouts complete.`}
        style={styles.tile}
      >
        <TileHeader label="Current Program" />
        <Text style={styles.tileTitle} numberOfLines={2}>
          {programName}
        </Text>
        <View style={styles.progressBlock}>
          <View style={styles.countRow}>
            <Text style={styles.countBig}>{completed}</Text>
            <Text style={styles.countTotal}>/ {total}</Text>
            <Text style={styles.countLabel}>Workouts</Text>
          </View>
          <ProgressBar value={completed} max={total} label={`Program progress: ${completed} of ${total}`} />
        </View>
      </Pressable>

      <Pressable
        onPress={onMission}
        accessibilityRole="button"
        accessibilityLabel={`Mission: ${missionTarget}. ${goalsRemaining} goals remaining.`}
        style={styles.tile}
      >
        <TileHeader label="Mission" />
        <Text style={styles.tileTitle} numberOfLines={2}>
          {missionTarget}
        </Text>
        <Text style={styles.subtle}>Your long-term objective</Text>
        <View style={styles.missionDivider} />
        <View style={styles.goalsRow}>
          <TargetIcon />
          <Text style={styles.goalsText}>
            {goalsRemaining} {goalsRemaining === 1 ? 'goal' : 'goals'} remaining
          </Text>
        </View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 14,
  },
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: flColor.charcoal900,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.xl,
    padding: 16,
    paddingVertical: 18,
    gap: 11,
    boxShadow: flShadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.gray600,
  },
  tileTitle: {
    fontFamily: flFont.display,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 21,
    color: flColor.cream100,
  },
  progressBlock: {
    gap: 8,
    marginTop: 3,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  countBig: {
    fontFamily: flFont.display,
    fontSize: 27,
    fontWeight: '600',
    lineHeight: 26,
    color: flColor.cream100,
  },
  countTotal: {
    fontSize: 14,
    fontWeight: '500',
    color: flColor.gray400,
  },
  countLabel: {
    marginLeft: 'auto',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: flColor.gray600,
  },
  subtle: {
    fontSize: 12.5,
    color: flColor.gray400,
    marginTop: 2,
  },
  missionDivider: {
    height: 1,
    backgroundColor: flColor.bronzeBorderSubtle,
    marginVertical: 2,
  },
  goalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalsText: {
    fontSize: 12,
    color: flColor.gray400,
  },
})
