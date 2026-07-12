/**
 * Unassigned — not yet in the CLA-Cxx registry (Component-Library-Architecture-v1.0.md)
 * Tier: 2 (Composite)
 * Spec: Forge Card Library.dc.html §06
 *
 * Challenge and competition card.
 * Anatomy: type chip · timeframe · title · participants · progress · CTA
 * States: open · active · completed · lost · expired
 */

import React from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color, space } from '@/constants/tokens'
import { BaseCard } from './BaseCard'
import { CARD } from './_cardTokens'
import type { ChallengeCardState } from './types'

export interface ChallengeCardProps {
  title: string
  type: string
  timeframe: string
  participantCount?: number
  progress?: number
  progressLabel?: string
  state?: ChallengeCardState
  onPress?: () => void
  onCTAPress?: () => void
}

const CTA_LABEL: Record<ChallengeCardState, string> = {
  open:      'Join Challenge',
  active:    'View Progress',
  completed: 'View Results',
  lost:      'View Results',
  expired:   'View Results',
}

const STATE_COLOR: Record<ChallengeCardState, string> = {
  open:      '#C8A97E',
  active:    '#5A9E68',
  completed: '#5A9E68',
  lost:      '#A85252',
  expired:   '#666060',
}

const STATE_LABEL: Record<ChallengeCardState, string> = {
  open:      'Open',
  active:    'In Progress',
  completed: 'Completed',
  lost:      'Lost',
  expired:   'Expired',
}

export function ChallengeCard({
  title,
  type,
  timeframe,
  participantCount,
  progress,
  progressLabel,
  state = 'open',
  onPress,
  onCTAPress,
}: ChallengeCardProps) {
  const stateColor = STATE_COLOR[state]
  const stateLabel = STATE_LABEL[state]
  const isExpired = state === 'expired'
  const isActive = state === 'active' || state === 'open'

  return (
    <BaseCard
      minHeight={CARD.MIN_HEIGHT_CHALLENGE}
      onPress={onPress}
    >
      {/* Top chip row */}
      <View style={styles.topRow}>
        <View style={[styles.chip, isExpired && styles.chipMuted]}>
          <Text style={[styles.chipText, isExpired && styles.chipTextMuted]}>{type}</Text>
        </View>
        <View style={styles.timeframeRow}>
          <Feather name="clock" size={11} color={color.text.tertiary} />
          <Text style={styles.timeframe}>{timeframe}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.title, isExpired && styles.titleMuted]} numberOfLines={2}>
        {title}
      </Text>

      {/* Participants */}
      {participantCount !== undefined ? (
        <View style={styles.participantsRow}>
          <Feather name="users" size={12} color={color.text.tertiary} />
          <Text style={styles.participants}>
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
          </Text>
        </View>
      ) : null}

      {/* State label */}
      <View style={styles.stateRow}>
        <View style={[styles.stateDot, { backgroundColor: stateColor }]} />
        <Text style={[styles.stateLabel, { color: stateColor }]}>{stateLabel}</Text>
      </View>

      {/* Progress bar (active/completed states) */}
      {progress !== undefined && isActive ? (
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.round(progress * 100))}%` as `${number}%` },
              ]}
            />
          </View>
          {progressLabel ? (
            <Text style={styles.progressLabel}>{progressLabel}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.spacer} />

      {/* CTA */}
      <TouchableOpacity
        onPress={onCTAPress ?? onPress}
        style={[styles.cta, !isActive && styles.ctaOutlined]}
        activeOpacity={0.75}
      >
        <Text style={[styles.ctaLabel, !isActive && styles.ctaLabelMuted]}>
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
  chipMuted: {
    borderColor: CARD.BORDER,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: color.accent.primary,
    textTransform: 'uppercase',
  },
  chipTextMuted: {
    color: color.text.tertiary,
  },
  timeframeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeframe: {
    fontSize: 12,
    color: color.text.tertiary,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: color.text.primary,
    letterSpacing: -0.1,
    lineHeight: 24,
    marginBottom: space.xs,
  },
  titleMuted: {
    color: color.text.secondary,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: space.xs,
  },
  participants: {
    fontSize: 12,
    color: color.text.tertiary,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: space.sm,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },
  stateLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressSection: {
    gap: 5,
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
  },
  ctaOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: CARD.BORDER,
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
