import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { color } from '@/constants/tokens'
import { ForgeProgressBar } from './ForgeProgressBar'
import type { ForgeGoalProgressProps, GoalType } from './types'

const GOAL_TYPES: GoalType[] = ['strength', 'consistency', 'endurance', 'habit']

const GOAL_LABELS: Record<GoalType, string> = {
  strength:    'Strength',
  consistency: 'Consistency',
  endurance:   'Endurance',
  habit:       'Habit',
}

export function ForgeGoalProgress({
  goalLabel,
  currentValue,
  targetValue,
  percentage,
  goalType,
  style,
  accessibilityLabel,
}: ForgeGoalProgressProps) {
  const pct = Math.max(0, Math.min(100, percentage))

  return (
    <View
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? `${goalLabel}: ${currentValue} of ${targetValue}`}
    >
      {/* Metric row */}
      <View style={styles.metricRow}>
        <Text style={styles.goalLabel} numberOfLines={1}>{goalLabel}</Text>
        <Text style={styles.values}>
          <Text style={styles.current}>{currentValue}</Text>
          {` / ${targetValue}`}
        </Text>
      </View>

      <ForgeProgressBar percentage={pct} height="default" />

      {/* Goal type chips */}
      <View style={styles.chips}>
        {GOAL_TYPES.map(type => {
          const isActive = type === goalType
          return (
            <View key={type} style={[styles.chip, isActive && styles.chipActive]}>
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {GOAL_LABELS[type]}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 7 },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: color.text.primary,
    flex: 1,
  },
  values: {
    fontSize: 20,
    fontWeight: '600',
    color: color.text.primary,
    fontVariant: ['tabular-nums'],
  },
  current: {
    color: color.accent.primary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: color.border.subtle,
    backgroundColor: 'transparent',
  },
  chipActive: {
    borderColor: color.accent.muted,
    backgroundColor: color.accent.glow,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: color.text.tertiary,
  },
  chipLabelActive: {
    color: color.accent.primary,
  },
})
