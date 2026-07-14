import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { LC, LS } from '@/constants/legacy-theme'
import type { Chapter } from '@/types/legacy'

// ─── Goal outcome (shared by State A + B) ────────────────────────────────────

function GoalOutcome({ goal }: { goal: Chapter['goal'] }) {
  if (goal.kind === 'none') return null

  if (goal.kind === 'quantifiable') {
    return goal.achieved
      ? <Text style={styles.achieved}>✓ {goal.name} achieved</Text>
      : <Text style={styles.inProgress}>{goal.name} — in progress at sealing</Text>
  }

  return goal.achieved
    ? <Text style={styles.achieved}>✓ {goal.name} achieved</Text>
    : <Text style={styles.inProgress}>{goal.name} — in progress at sealing</Text>
}

// ─── State A — recently sealed (0–7 days ago), expanded ──────────────────────

function StateACard({ chapter, onPress }: { chapter: Chapter; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.stateACard}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Sealed chapter: ${chapter.name}. Tap to view chapter.`}
    >
      <Text style={styles.aName}>{chapter.name}</Text>
      <Text style={styles.aMeta}>{chapter.dateRangeFull}</Text>
      <GoalOutcome goal={chapter.goal} />
      {chapter.reflection ? (
        <Text style={styles.aReflection}>
          "{chapter.reflection.slice(0, 120)}"
        </Text>
      ) : null}
      <Text style={styles.aCounts}>
        {chapter.workoutCount} workouts · {chapter.honorCount} honors · Sealed {chapter.sealedAt}
      </Text>
    </TouchableOpacity>
  )
}

// ─── State B — older sealed chapters, compact ────────────────────────────────

function StateBCard({ chapter, onPress }: { chapter: Chapter; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.stateBCard}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Sealed chapter: ${chapter.name}. Tap to view chapter.`}
    >
      <View style={styles.bRow}>
        <Text style={styles.bName} numberOfLines={1}>{chapter.name}</Text>
        <Text style={styles.bMeta} numberOfLines={1}>{chapter.dateRangeCompact}</Text>
      </View>
      <GoalOutcome goal={chapter.goal} />
      <Text style={styles.bCounts}>
        {chapter.workoutCount} workouts · {chapter.honorCount} honors
      </Text>
    </TouchableOpacity>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

type Props = {
  chapters: Chapter[]
  onChapterPress?: (id: string) => void
}

export function ChapterHistorySection({ chapters, onChapterPress }: Props) {
  if (chapters.length === 0) return null

  const [stateA, ...stateB] = chapters

  return (
    <View style={styles.container}>
      <StateACard chapter={stateA} onPress={() => onChapterPress?.(stateA.id)} />
      {stateB.map(ch => (
        <StateBCard key={ch.id} chapter={ch} onPress={() => onChapterPress?.(ch.id)} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },

  // State A
  stateACard: {
    backgroundColor: LC.surface,
    borderRadius: LS.cardRadius,
    borderWidth: 1,
    borderColor: LC.surfaceBorder,
    padding: LS.cardPad,
    minHeight: 120,
  },
  aName: {
    fontSize: 22,
    fontWeight: '700',
    color: LC.text,
  },
  aMeta: {
    fontSize: 13,
    color: LC.textMuted,
    marginTop: 4,
  },
  aReflection: {
    fontSize: 13,
    color: LC.textMuted,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 19,
  },
  aCounts: {
    fontSize: 12,
    color: LC.textMuted,
    marginTop: 10,
  },

  // State B
  stateBCard: {
    backgroundColor: LC.surface,
    borderRadius: LS.cardRadius,
    borderWidth: 1,
    borderColor: LC.surfaceBorder,
    padding: LS.cardPad,
    minHeight: 60,
  },
  bRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  bName: {
    fontSize: 14,
    fontWeight: '600',
    color: LC.text,
    flexShrink: 1,
  },
  bMeta: {
    fontSize: 12,
    color: LC.textMuted,
    flexShrink: 0,
  },
  bCounts: {
    fontSize: 12,
    color: LC.textMuted,
    marginTop: 4,
  },

  // Shared
  achieved: {
    fontSize: 14,
    fontWeight: '500',
    color: LC.success,
    marginTop: 8,
  },
  inProgress: {
    fontSize: 14,
    color: LC.textMuted,
    marginTop: 8,
  },
})
