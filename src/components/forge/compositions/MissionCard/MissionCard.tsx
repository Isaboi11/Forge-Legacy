/**
 * ⚠️ LEGACY (2026-07-14) — NO LONGER USED ON HOME. Superseded by the Phase-2
 * re-layout to the handoff `Forge Home.dc.html`: a dedicated resolver-driven
 * `TodaysWorkoutCard` hero + a separate `ProgramMissionGrid`. Retained (not
 * deleted) as reference; safe to remove once nothing else references it.
 *
 * CLA-C25/C26 (fused) — MissionCard
 * Tier: 3 (Composition)
 * Spec: Forge Home.dc.html
 *
 * Home v2's single composed daily-focus experience: Chapter + Primary Goal +
 * Active Program + Today's Session + the Workout CTA, in one card. Supersedes
 * the separate Chapter Card (Tier 1) / Active Program Card (Tier 2) split
 * from Home-Screen-Wireframe-Spec-H1.md v1.3 for this screen — see the
 * implementation summary for the reconciliation note.
 *
 * Built from library composites (Pill, ProgressBar, Button) plus foundation
 * tokens; the outer card and its two icon rows are Home-specific layout, not
 * generic library pieces (matching the Claude Design source 1:1).
 */

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { flColor, flGradient, flRadius, flShadow, flType } from '@/constants/foundation'
import { Pill } from '../../composites/Pill'
import { ProgressBar } from '../../composites/ProgressBar'
import { Button } from '../../composites/Button'
import { BarbellIcon, CalendarIcon, ChevronRightIcon, FlameIcon } from '../../primitives/icons/HomeIcons'
import type { MissionData } from '@/types/home'

export interface MissionCardProps {
  data: MissionData
  onGoalPress?: () => void
  onProgramPress?: () => void
  onTodaySessionPress?: () => void
  onStartWorkout?: () => void
}

function MissionRow({
  icon,
  eyebrow,
  title,
  subtitle,
  onPress,
  accessibilityLabel,
  children,
}: {
  icon: React.ReactNode
  eyebrow: string
  title: string
  subtitle?: string
  onPress?: () => void
  accessibilityLabel: string
  children?: React.ReactNode
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={styles.row}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowBody}>
        <Text style={flType.missionEyebrowMuted}>{eyebrow}</Text>
        <Text style={flType.displaySub} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={flType.bodySmall}>{subtitle}</Text> : null}
        {children}
      </View>
      {onPress ? <ChevronRightIcon size={20} color={flColor.gray600} /> : null}
    </Pressable>
  )
}

export function MissionCard({ data: mission, onGoalPress, onProgramPress, onTodaySessionPress, onStartWorkout }: MissionCardProps) {
  const pct = Math.round((mission.program.workoutsComplete / mission.program.workoutsTotal) * 100)

  return (
    <View style={styles.card}>
      <LinearGradient
        pointerEvents="none"
        colors={flGradient.missionCardWash.colors}
        locations={flGradient.missionCardWash.locations}
        start={flGradient.missionCardWash.start}
        end={flGradient.missionCardWash.end}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        {/* Chapter header */}
        <View style={styles.chapterHeader}>
          <View style={styles.eyebrowRow}>
            <Text style={flType.missionEyebrow}>Mission</Text>
            <Text style={flType.bodyTertiary}>{mission.weekLabel}</Text>
          </View>

          <View style={styles.chapterTitles}>
            <Text style={flType.displayTitle}>{mission.chapterName}</Text>
            <Text style={flType.bodySecondary}>{mission.forgingSinceLabel}</Text>
          </View>

          <View style={styles.tagsRow}>
            {mission.tags.map((tag, i) => (
              <Pill key={tag} size="sm" tone={i === 0 ? 'bronze' : 'muted'}>
                {tag}
              </Pill>
            ))}
          </View>

          <Pressable
            onPress={onGoalPress}
            accessibilityRole="button"
            accessibilityLabel={`Primary goal: ${mission.goal.label}`}
            style={styles.goalRow}
          >
            <Text style={styles.goalLabel}>Primary Goal</Text>
            <Text style={flType.displayGoal}>{mission.goal.label}</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <MissionRow
          icon={<BarbellIcon />}
          eyebrow="Program"
          title={mission.program.name}
          onPress={onProgramPress}
          accessibilityLabel={`${mission.program.name}. ${mission.program.workoutsComplete} of ${mission.program.workoutsTotal} workouts complete. Double-tap to view program.`}
        >
          <View style={styles.programProgress}>
            <Text style={styles.programCount}>
              {mission.program.workoutsComplete} of {mission.program.workoutsTotal}
            </Text>
            <ProgressBar
              value={mission.program.workoutsComplete}
              max={mission.program.workoutsTotal}
              label={`Program progress: ${pct}%`}
            />
          </View>
        </MissionRow>

        <View style={styles.divider} />

        <MissionRow
          icon={<CalendarIcon />}
          eyebrow="Today’s Session"
          title={mission.todaySession.title}
          subtitle={mission.todaySession.meta}
          onPress={onTodaySessionPress}
          accessibilityLabel={`Today's session: ${mission.todaySession.title}. ${mission.todaySession.meta}.`}
        />

        <Button variant="primary" fullWidth onPress={onStartWorkout} icon={<FlameIcon />} accessibilityLabel="Start workout">
          Start Workout
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.missionCard,
    marginBottom: 52,
  },
  content: {
    padding: 22,
    paddingTop: 26,
    gap: 18,
  },
  chapterHeader: {
    gap: 16,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chapterTitles: {
    gap: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingTop: 2,
  },
  goalLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.bronze400,
    opacity: 0.7,
    flexShrink: 0,
  },
  divider: {
    height: 1,
    marginVertical: 2,
    backgroundColor: flColor.bronzeBorderSubtle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  rowIcon: {
    width: 46,
    height: 46,
    flexShrink: 0,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  programProgress: {
    gap: 5,
    marginTop: 2,
  },
  programCount: {
    alignSelf: 'flex-end',
    fontSize: 13,
    fontWeight: '600',
    color: flColor.bronze400,
    letterSpacing: -0.1,
  },
})
