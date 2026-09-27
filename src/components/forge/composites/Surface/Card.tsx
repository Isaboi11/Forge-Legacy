/**
 * CLA-C07 — Card
 * Tier: 2 (Composite)
 * Spec: components/Surface/Card.jsx (Claude Design)
 *
 * Surface + the standard padding contract. Every Tier-3 screen card
 * (MissionCard, the Train Together container, future ChapterCard /
 * ProgramCard / GoalCard / HonorCard / SquadCard) is built on Card, never a
 * bespoke container.
 *   default  — standard content card
 *   hero     — the one dominant top-of-scroll element (bronze machined edge)
 *   elevated — lifts above the page, for sheets / floating cards
 */

import React from 'react'
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { flColor, flGradient, flRadius, flShadow } from '@/constants/foundation'

export type CardVariant = 'default' | 'hero' | 'elevated'
export type CardRadius = keyof typeof flRadius

const CARD: Record<CardVariant, { bronzeEdge: boolean; shadow: string; pad: number; flat?: string }> = {
  default: { bronzeEdge: false, shadow: flShadow.card, pad: 20 },
  hero: { bronzeEdge: true, shadow: `${flShadow.elevated}, ${flShadow.glowSubtle}`, pad: 24 },
  elevated: { bronzeEdge: false, shadow: flShadow.elevated, pad: 22, flat: flColor.charcoal700 },
}

export interface CardProps {
  variant?: CardVariant
  radius?: CardRadius
  padding?: number
  onPress?: () => void
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export function Card({ variant = 'default', radius = 'xl', padding, onPress, children, style }: CardProps) {
  const c = CARD[variant]

  const content = (
    <View
      style={[
        styles.base,
        {
          borderRadius: flRadius[radius],
          borderColor: c.bronzeEdge ? flColor.bronzeBorder : flColor.charcoal600,
          padding: padding ?? c.pad,
          boxShadow: c.shadow,
        },
        style,
      ]}
    >
      {c.flat ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.flat, borderRadius: flRadius[radius] }]} />
      ) : (
        <LinearGradient
          pointerEvents="none"
          /* ⚠ THE TOKEN, NOT A LITERAL. This was '#181A1C' → charcoal800, which is Forge's surfaceCard
             exactly — so the dark side is unchanged — but on Alabaster it painted a near-black top fading
             into cream: every Nutrition meal card read as a dark block. */
          {...flGradient.surfaceCard}
          style={[StyleSheet.absoluteFill, { borderRadius: flRadius[radius] }]}
        />
      )}
      <View style={styles.contentLayer}>{children}</View>
    </View>
  )

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    )
  }
  return content
}

const styles = StyleSheet.create({
  base: {
    position: 'relative',
    borderWidth: 1,
    overflow: 'hidden',
  },
  contentLayer: {
    position: 'relative',
  },
})
