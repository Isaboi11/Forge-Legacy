/**
 * CLA-C28 — HonorCard
 * Tier: 3 (Screen-level)
 * Spec: Forge Card Library.dc.html §05
 *
 * Badges and achievements. Center-aligned.
 * Anatomy: badge circle (64×64) · honor name · category chip
 * States: earned · locked · hidden · featured
 *
 * Performance Firewall (CLA-P3): bronze surfaces only for earned states.
 */

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { color, space, shadow } from '@/constants/tokens'
import { CARD } from './_cardTokens'
import type { HonorCardState } from './types'

export interface HonorCardProps {
  name: string
  category?: string
  /** Icon name (Feather) rendered inside the badge circle */
  iconName?: React.ComponentProps<typeof Feather>['name']
  state?: HonorCardState
  onPress?: () => void
}

export function HonorCard({
  name,
  category,
  iconName = 'award',
  state = 'locked',
  onPress,
}: HonorCardProps) {
  const isEarned   = state === 'earned' || state === 'featured'
  const isLocked   = state === 'locked'
  const isHidden   = state === 'hidden'
  const isFeatured = state === 'featured'

  const borderColor: string = isEarned ? CARD.BORDER_BRONZE : CARD.BORDER
  const innerHighlight: string = isEarned ? CARD.INNER_HIGHLIGHT_BRONZE : CARD.INNER_HIGHLIGHT

  const badgeIconColor: string = isLocked || isHidden
    ? color.text.tertiary
    : color.text.inverse

  const nameColor: string = isEarned ? color.text.primary : color.text.secondary

  const glowStyle = isFeatured ? {
    shadowColor: CARD.BRONZE_SHADOW,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  } : (shadow.card as object)

  return (
    <View
      style={[
        styles.base,
        glowStyle,
        { borderColor },
      ]}
    >
      {/* Earned tint gradient overlay */}
      {isEarned && (
        <LinearGradient
          colors={['rgba(200,169,126,0.06)', 'rgba(255,255,255,0)']}
          locations={[0, 0.45]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      {/* Inner top-edge highlight */}
      <View style={[styles.topHighlight, { backgroundColor: innerHighlight }]} pointerEvents="none" />

      {/* Badge circle */}
      <View style={styles.badgeWrapper}>
        {isEarned ? (
          <LinearGradient
            colors={['rgba(223,196,154,0.35)', 'rgba(200,169,126,0.10)']}
            style={styles.badge}
          >
            <View style={[styles.badgeGlow, isFeatured && styles.badgeGlowFeatured]} />
            <Feather name={iconName} size={28} color={badgeIconColor} />
          </LinearGradient>
        ) : (
          <View style={[styles.badge, styles.badgeLocked]}>
            <Feather
              name={isHidden ? 'help-circle' : 'lock'}
              size={24}
              color={color.text.tertiary}
            />
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={[styles.name, { color: nameColor }]} numberOfLines={2}>
        {isHidden ? '???' : name}
      </Text>

      {/* Category chip */}
      {category && !isHidden ? (
        <View style={[styles.chip, isEarned && styles.chipEarned]}>
          <Text style={[styles.chipText, isEarned && styles.chipTextEarned]}>
            {category}
          </Text>
        </View>
      ) : null}

      {/* Featured label */}
      {isFeatured ? (
        <Text style={styles.featuredLabel}>Featured</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: CARD.RADIUS,
    padding: CARD.PADDING,
    backgroundColor: color.background.surface,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: CARD.MIN_HEIGHT_HONOR,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  badgeWrapper: {
    marginBottom: space.xs,
  },
  badge: {
    width: CARD.BADGE_SIZE,
    height: CARD.BADGE_SIZE,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeLocked: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: CARD.BORDER,
  },
  badgeGlow: {
    position: 'absolute',
    width: CARD.BADGE_SIZE + 16,
    height: CARD.BADGE_SIZE + 16,
    borderRadius: 9999,
    backgroundColor: 'rgba(200,169,126,0.12)',
  },
  badgeGlowFeatured: {
    backgroundColor: 'rgba(200,169,126,0.22)',
    width: CARD.BADGE_SIZE + 28,
    height: CARD.BADGE_SIZE + 28,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CARD.CHIP_RADIUS,
    borderWidth: 1,
    borderColor: CARD.BORDER,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipEarned: {
    borderColor: 'rgba(200,169,126,0.25)',
    backgroundColor: 'rgba(200,169,126,0.08)',
  },
  chipText: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: color.text.tertiary,
  },
  chipTextEarned: {
    color: color.accent.primary,
  },
  featuredLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: color.accent.primary,
    marginTop: space.xs,
  },
})
