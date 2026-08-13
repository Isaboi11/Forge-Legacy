/**
 * ⚠️ LEGACY (2026-07-14) — old `legacy-theme` component, NO LONGER USED BY THE
 * Legacy tab. Superseded this session (STEP D) by the foundation-based
 * `src/app/legacy.tsx`, rebuilt to the handoff `Forge Legacy.dc.html`. Retained
 * (not deleted) as reference — still consumed by the non-tab `/legacy-design-test`
 * dev route.
 */
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { LC, LS } from '@/constants/legacy-theme'
import { SectionLabel } from './SectionLabel'
import type { FeaturedMoment, FLMEventType } from '@/types/legacy'

const EVENT_LABEL: Record<FLMEventType, string> = {
  CHAPTER_SEALED:   'Chapter Sealed',
  GOAL_ACHIEVED:    'Goal Achieved',
  RANK_UP:          'Rank Achieved',
  PROGRAM_GRADUATED:'Program Graduated',
  PROGRAM_COMPLETED:'Week Complete',
  ACCOMPLISHMENT:   'Accomplishment',
  HONOR_EARNED:     'Honor Earned',
  REFLECTION_ADDED: 'Reflection Added',
  MEMORY_ADDED:     'Memory Added',
  PHOTO_ADDED:      'Photo Added',
}

type Props = {
  moment: FeaturedMoment
  onPress?: () => void
}

export function FeaturedMomentCard({ moment, onPress }: Props) {
  const isInteractive = !moment.isInert && !!onPress

  return (
    <View>
      <SectionLabel label="Featured Moment" />
      <TouchableOpacity
        style={styles.card}
        onPress={isInteractive ? onPress : undefined}
        activeOpacity={isInteractive ? 0.7 : 1}
        accessibilityRole={isInteractive ? 'button' : 'text'}
        accessibilityLabel={`${EVENT_LABEL[moment.eventType]}: ${moment.primaryText}. ${moment.dateLabel}.`}
      >
        <View style={styles.header}>
          <Text style={styles.eventLabel}>{EVENT_LABEL[moment.eventType]}</Text>
          <Text style={styles.date}>{moment.dateLabel}</Text>
        </View>

        <Text style={styles.primary}>{moment.primaryText}</Text>

        {moment.secondaryText ? (
          <Text style={styles.secondary}>{moment.secondaryText}</Text>
        ) : null}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: LC.accent,
  },
  date: {
    fontSize: 12,
    color: LC.textMuted,
  },
  primary: {
    fontSize: 18,
    fontWeight: '600',
    color: LC.text,
    marginTop: 10,
  },
  secondary: {
    fontSize: 13,
    color: LC.textMuted,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 19,
  },
})
