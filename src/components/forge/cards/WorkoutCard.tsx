/**
 * CLA-C07 — WorkoutCard
 * Tier: 2 (Composite)
 * Spec: Forge Card Library.dc.html §04
 *
 * Scheduled or history workout row.
 * Anatomy: date-block · title · program + session meta
 * States: upcoming · active · completed · missed
 */

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color, space } from '@/constants/tokens'
import { BaseCard } from './BaseCard'
import { CARD } from './_cardTokens'
import type { WorkoutCardState } from './types'

export interface WorkoutCardProps {
  title: string
  programName?: string
  sessionLabel?: string
  /** Day-of-month number shown in the date block */
  day: number
  /** Short month abbreviation, e.g. "JAN" */
  month: string
  state?: WorkoutCardState
  onPress?: () => void
}

const STATE_ACCENT: Record<WorkoutCardState, string> = {
  upcoming:  '#C8A97E',
  active:    '#5A9E68',
  completed: '#5A9E68',
  missed:    '#A85252',
}

const STATE_LABEL: Record<WorkoutCardState, string> = {
  upcoming:  'Upcoming',
  active:    'Active',
  completed: 'Completed',
  missed:    'Missed',
}

export function WorkoutCard({
  title,
  programName,
  sessionLabel,
  day,
  month,
  state = 'upcoming',
  onPress,
}: WorkoutCardProps) {
  const accentColor = STATE_ACCENT[state]
  const stateLabel = STATE_LABEL[state]
  const isCompleted = state === 'completed'
  const isMissed = state === 'missed'

  return (
    <BaseCard
      minHeight={CARD.MIN_HEIGHT_WORKOUT}
      onPress={onPress}
    >
      <View style={styles.row}>
        {/* Date block */}
        <View style={styles.dateBlock}>
          <Text style={styles.day}>{day}</Text>
          <Text style={styles.month}>{month}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>

          {(programName || sessionLabel) ? (
            <Text style={styles.meta} numberOfLines={1}>
              {[programName, sessionLabel].filter(Boolean).join(' · ')}
            </Text>
          ) : null}

          {/* State label */}
          <View style={styles.stateRow}>
            {isCompleted && (
              <Feather name="check-circle" size={12} color={accentColor} />
            )}
            {isMissed && (
              <Feather name="x-circle" size={12} color={accentColor} />
            )}
            <Text style={[styles.stateLabel, { color: accentColor }]}>{stateLabel}</Text>
          </View>
        </View>

        {/* Chevron */}
        {onPress ? (
          <Feather name="chevron-right" size={16} color={color.text.tertiary} />
        ) : null}
      </View>
    </BaseCard>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  dateBlock: {
    width: CARD.DATE_BOX_SIZE,
    height: CARD.DATE_BOX_SIZE,
    borderRadius: CARD.DATE_BOX_RADIUS,
    backgroundColor: color.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.30,
    shadowRadius: 3,
    elevation: 2,
  },
  day: {
    fontSize: 20,
    fontWeight: '600',
    color: color.text.primary,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  month: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: color.text.tertiary,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: color.text.primary,
    lineHeight: 22,
  },
  meta: {
    fontSize: 13,
    color: color.text.secondary,
    lineHeight: 18,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  stateLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
})
