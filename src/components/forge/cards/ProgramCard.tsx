/**
 * CLA-C07 — ProgramCard
 * Tier: 2 (Composite)
 * Spec: Forge Card Library.dc.html §03
 *
 * Training program card.
 * Anatomy: family chip · title · level dot + meta · progress bar · CTA
 * States: notStarted · inProgress · completed · locked
 */

import React from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color, space, size } from '@/constants/tokens'
import { BaseCard } from './BaseCard'
import { CARD } from './_cardTokens'
import type { ProgramCardState, DifficultyLevel } from './types'

export interface ProgramCardProps {
  title: string
  family: string
  difficulty: DifficultyLevel
  /** Current session (1-indexed) */
  currentSession?: number
  totalSessions?: number
  durationWeeks?: number
  state?: ProgramCardState
  onPress?: () => void
  onCTAPress?: () => void
}

const LEVEL_COLOR: Record<DifficultyLevel, string> = {
  beginner:     '#5A9E68',
  intermediate: '#C8A97E',
  advanced:     '#A85252',
}

const LEVEL_LABEL: Record<DifficultyLevel, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
}

const CTA_LABEL: Record<ProgramCardState, string> = {
  notStarted: 'Start Program',
  inProgress: 'Resume',
  completed:  'View Summary',
  locked:     'Unlock',
}

export function ProgramCard({
  title,
  family,
  difficulty,
  currentSession = 0,
  totalSessions = 1,
  durationWeeks,
  state = 'notStarted',
  onPress,
  onCTAPress,
}: ProgramCardProps) {
  const isLocked = state === 'locked'
  const isCompleted = state === 'completed'
  const progress = totalSessions > 0 ? currentSession / totalSessions : 0
  const levelColor = LEVEL_COLOR[difficulty]

  return (
    <BaseCard
      minHeight={CARD.MIN_HEIGHT_PROGRAM}
      onPress={onPress}
      disabled={isLocked}
    >
      {/* Family chip + level dot */}
      <View style={styles.topRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{family}</Text>
        </View>
        <View style={styles.levelRow}>
          <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
          <Text style={styles.levelLabel}>{LEVEL_LABEL[difficulty]}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{title}</Text>

      {/* Duration meta */}
      {durationWeeks ? (
        <Text style={styles.meta}>{durationWeeks} weeks</Text>
      ) : null}

      {/* Progress */}
      {state === 'inProgress' && (
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as `${number}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {currentSession} / {totalSessions} sessions
          </Text>
        </View>
      )}

      {isCompleted && (
        <View style={styles.completedRow}>
          <Feather name="check-circle" size={14} color={color.success} />
          <Text style={[styles.meta, { color: color.success }]}>Completed</Text>
        </View>
      )}

      {/* Spacer to push CTA to bottom */}
      <View style={styles.spacer} />

      {/* CTA */}
      <TouchableOpacity
        onPress={onCTAPress ?? onPress}
        disabled={isLocked}
        style={[styles.cta, isCompleted && styles.ctaOutlined]}
        activeOpacity={0.75}
      >
        {isLocked && (
          <Feather name="lock" size={14} color={color.text.secondary} style={styles.ctaIcon} />
        )}
        <Text style={[styles.ctaLabel, isCompleted && styles.ctaLabelMuted]}>
          {CTA_LABEL[state]}
        </Text>
      </TouchableOpacity>
    </BaseCard>
  )
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CARD.CHIP_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(200,169,126,0.25)',
    backgroundColor: 'rgba(200,169,126,0.08)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: color.accent.primary,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },
  levelLabel: {
    fontSize: 12,
    color: color.text.secondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: color.text.primary,
    letterSpacing: -0.1,
    lineHeight: 24,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: color.text.tertiary,
    marginBottom: space.xs,
  },
  progressSection: {
    marginTop: space.sm,
    gap: 6,
  },
  progressTrack: {
    height: CARD.PROGRESS_HEIGHT,
    borderRadius: 99,
    backgroundColor: color.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: color.accent.primary,
  },
  progressLabel: {
    fontSize: 12,
    color: color.text.tertiary,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: space.sm,
  },
  spacer: {
    flex: 1,
    minHeight: space.sm,
  },
  cta: {
    marginTop: space.sm,
    height: 40,
    borderRadius: 8,
    backgroundColor: color.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  ctaOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: CARD.BORDER,
  },
  ctaIcon: {
    marginRight: 2,
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: color.text.inverse,
    letterSpacing: 0.1,
  },
  ctaLabelMuted: {
    color: color.text.secondary,
  },
})
