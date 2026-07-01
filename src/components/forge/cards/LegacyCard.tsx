/**
 * CLA-C07 — LegacyCard
 * Tier: 2 (Composite)
 * Spec: Forge Card Library.dc.html §07
 *
 * Flagship hero card for chapters, programs, legacy milestones.
 * Anatomy: bronze ambient orb (top-right) · title · subtitle · body · CTA
 * States: default · featured · achieved · locked
 *
 * Background approximates radial-gradient(130% 110% at 100% 0%, …) via an
 * absolutely-positioned bronze orb View (React Native has no radial gradient).
 */

import React from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color, space } from '@/constants/tokens'
import { CARD } from './_cardTokens'
import type { LegacyCardState } from './types'

export interface LegacyCardProps {
  title: string
  subtitle?: string
  body?: string
  ctaLabel?: string
  state?: LegacyCardState
  onPress?: () => void
  onCTAPress?: () => void
}

export function LegacyCard({
  title,
  subtitle,
  body,
  ctaLabel,
  state = 'default',
  onPress,
  onCTAPress,
}: LegacyCardProps) {
  const isFeatured = state === 'featured'
  const isAchieved = state === 'achieved'
  const isLocked   = state === 'locked'
  const hasBronzeAccent = isFeatured || isAchieved

  const borderColor: string = hasBronzeAccent ? CARD.BORDER_BRONZE : CARD.BORDER

  const glowStyle = isFeatured ? {
    shadowColor: CARD.BRONZE_SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 20,
    elevation: 12,
  } : {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.50,
    shadowRadius: 16,
    elevation: 8,
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isLocked}
      style={({ pressed }) => [
        styles.base,
        glowStyle,
        { borderColor },
        pressed && onPress && styles.pressed,
        isLocked && styles.locked,
      ]}
    >
      {/* Top highlight */}
      <View
        style={[
          styles.topHighlight,
          { backgroundColor: hasBronzeAccent ? CARD.INNER_HIGHLIGHT_BRONZE : CARD.INNER_HIGHLIGHT_MD },
        ]}
        pointerEvents="none"
      />

      {/* Bronze ambient orb — approximates radial-gradient at 100% 0% */}
      {hasBronzeAccent && (
        <View style={styles.bronzeOrb} pointerEvents="none" />
      )}

      {/* Lock overlay */}
      {isLocked && (
        <View style={styles.lockRow}>
          <Feather name="lock" size={14} color={color.text.tertiary} />
          <Text style={styles.lockLabel}>Locked</Text>
        </View>
      )}

      {/* State label (featured / achieved) */}
      {(isFeatured || isAchieved) && (
        <View style={styles.badgeRow}>
          {isAchieved && <Feather name="check-circle" size={13} color={color.accent.primary} />}
          <Text style={styles.stateBadge}>
            {isFeatured ? 'Featured' : 'Achieved'}
          </Text>
        </View>
      )}

      {/* Content */}
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      ) : null}
      {body ? (
        <Text style={styles.body} numberOfLines={3}>{body}</Text>
      ) : null}

      {/* CTA */}
      {ctaLabel && !isLocked ? (
        <TouchableOpacity
          onPress={onCTAPress ?? onPress}
          style={styles.cta}
          activeOpacity={0.75}
        >
          <Text style={styles.ctaLabel}>{ctaLabel}</Text>
          <Feather name="arrow-right" size={14} color={color.text.inverse} />
        </TouchableOpacity>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: CARD.RADIUS,
    padding: CARD.PADDING_LEGACY,
    backgroundColor: color.background.surface,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: CARD.MIN_HEIGHT_LEGACY,
    gap: space.sm,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  bronzeOrb: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 9999,
    backgroundColor: 'rgba(200,169,126,0.10)',
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: space.xs,
  },
  lockLabel: {
    fontSize: 12,
    color: color.text.tertiary,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: space.xs,
  },
  stateBadge: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: color.accent.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: color.text.primary,
    letterSpacing: -0.2,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 15,
    color: color.text.secondary,
    lineHeight: 21,
  },
  body: {
    fontSize: 14,
    color: color.text.secondary,
    lineHeight: 20,
    marginTop: space.xs,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space.sm,
    alignSelf: 'flex-start',
    backgroundColor: color.accent.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: color.text.inverse,
  },
  pressed: {
    opacity: 0.80,
  },
  locked: {
    opacity: 0.50,
  },
})
