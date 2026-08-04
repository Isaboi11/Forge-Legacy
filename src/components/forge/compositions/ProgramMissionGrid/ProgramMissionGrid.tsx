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
import { useTourAnchor } from '@/hooks/useTourAnchors'
import type { TourAnchorId } from '@/domain/onboarding/tour-plan'
import { ProgressBar } from '../../composites/ProgressBar'
import { ChevronRightIcon } from '../../primitives/icons/HomeIcons'

export interface ProgramMissionGridProps {
  /**
   * The active program — OMITTED when there isn't one, leaving Mission alone across the full width.
   *
   * ══ WHY THIS IS OPTIONAL, WHICH IS THE INTERESTING PART ══
   *
   * The Mission tile was never program-dependent. It reads the athlete's live chapter goals and has
   * nothing to do with a program. But Home guarded this whole two-tile grid on one condition — the
   * program's name being non-empty — so an athlete with no program silently lost their GOAL as well.
   * Collateral damage from a single `&&`, and invisible precisely because nothing was drawn to notice.
   *
   * The day-to-day athlete is the one who had it taken; making the program half optional gives it back
   * without a second component.
   */
  programName?: string
  completed?: number
  total?: number
  missionTarget: string
  goalsRemaining: number
  onProgram?: () => void
  onMission?: () => void
  /** Guided-tour spotlight targets. Each tile is rung separately — they are two unrelated ideas. */
  programAnchor?: TourAnchorId
  missionAnchor?: TourAnchorId
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
  programAnchor,
  missionAnchor,
}: ProgramMissionGridProps) {
  const programRef = useTourAnchor(programAnchor)
  const missionRef = useTourAnchor(missionAnchor)

  const done = completed ?? 0
  const all = total ?? 0

  return (
    <View style={styles.grid}>
      {programName ? (
        <Pressable
          ref={programRef}
          onPress={onProgram}
          accessibilityRole="button"
          accessibilityLabel={`Current program: ${programName}. ${done} of ${all} workouts complete.`}
          style={styles.tile}
        >
          <TileHeader label="Current Program" />
          <Text style={styles.tileTitle} numberOfLines={2}>
            {programName}
          </Text>
          <View style={styles.progressBlock}>
            <View style={styles.countRow}>
              <Text style={styles.countBig}>{done}</Text>
              <Text style={styles.countTotal}>/ {all}</Text>
              <Text style={styles.countLabel}>Workouts</Text>
            </View>
            <ProgressBar value={done} max={all} label={`Program progress: ${done} of ${all}`} />
          </View>
        </Pressable>
      ) : null}

      <Pressable
        ref={missionRef}
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
