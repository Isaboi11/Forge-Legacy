import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { LC, LS } from '@/constants/legacy-theme'
import { SectionLabel } from './SectionLabel'
import type { Chapter } from '@/types/legacy'

function GoalBlock({ goal }: { goal: Chapter['goal'] }) {
  if (goal.kind === 'none') return null

  if (goal.kind === 'quantifiable') {
    if (goal.achieved) {
      return (
        <Text style={styles.goalAchieved} numberOfLines={1}>
          ✓ {goal.name} achieved
        </Text>
      )
    }
    return (
      <View style={styles.goalBlock}>
        <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${goal.progress}%` }]} />
        </View>
        <Text style={styles.progressPct}>{goal.progress}%</Text>
      </View>
    )
  }

  if (goal.kind === 'narrative') {
    if (goal.achieved) {
      return <Text style={styles.goalAchieved}>✓ {goal.name} achieved</Text>
    }
    return <Text style={styles.goalMuted}>{goal.name} — In Progress</Text>
  }

  return null
}

type Props = {
  chapter: Chapter
  dayCount: number
  onPress?: () => void
}

export function ActiveChapterCard({ chapter, dayCount, onPress }: Props) {
  return (
    <View>
      <SectionLabel label="Active Chapter" />
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Active chapter: ${chapter.name}. Started ${chapter.startDate}. Tap to view chapter detail.`}
      >
        <Text style={styles.name}>{chapter.name}</Text>
        <Text style={styles.meta}>
          Since {chapter.startDate} · {dayCount} days in
        </Text>
        <GoalBlock goal={chapter.goal} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: LC.surface,
    borderRadius: LS.cardRadius,
    borderWidth: 1,
    borderColor: LC.surfaceBorder,
    padding: LS.cardPad,
    marginTop: LS.labelGap,
    minHeight: 80,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: LC.text,
  },
  meta: {
    fontSize: 13,
    color: LC.textMuted,
    marginTop: 4,
  },
  goalBlock: {
    marginTop: 12,
  },
  goalName: {
    fontSize: 14,
    color: LC.textMuted,
  },
  progressTrack: {
    height: LS.progressH,
    backgroundColor: LC.surfaceBorder,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: LC.accent,
    borderRadius: 2,
  },
  progressPct: {
    fontSize: 12,
    color: LC.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  goalAchieved: {
    fontSize: 14,
    fontWeight: '500',
    color: LC.success,
    marginTop: 12,
  },
  goalMuted: {
    fontSize: 14,
    color: LC.textMuted,
    marginTop: 12,
  },
})
