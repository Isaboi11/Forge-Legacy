/**
 * CLA-C06 — Surface
 * Tier: 2 (Composite)
 * Spec: components/Surface/Surface.jsx (Claude Design)
 *
 * The forged-steel container primitive. Every card, sheet and panel is a
 * Surface underneath — it never renders a flat gray rectangle. Composition
 * only; it adds no padding of its own (that is Card's job).
 */

import React from 'react'
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { flColor, flRadius, flShadow } from '@/constants/foundation'

export type SurfaceVariant = 'card' | 'elevated' | 'recessed' | 'panel' | 'modal'
export type SurfaceRadius = keyof typeof flRadius

const SURFACE: Record<SurfaceVariant, { border: string; shadow?: string; flat?: string }> = {
  card: { border: flColor.charcoal600, shadow: flShadow.card },
  elevated: { border: flColor.charcoal600, shadow: flShadow.elevated },
  recessed: { border: flColor.charcoal700, shadow: 'inset 0 2px 6px rgba(0,0,0,0.45)', flat: flColor.base },
  panel: { border: flColor.charcoal600, flat: flColor.charcoal800 },
  modal: { border: flColor.charcoal500, shadow: flShadow.elevated, flat: flColor.charcoal700 },
}

export interface SurfaceProps {
  variant?: SurfaceVariant
  radius?: SurfaceRadius
  bronzeEdge?: boolean
  glow?: boolean
  onPress?: () => void
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export function Surface({ variant = 'card', radius = 'lg', bronzeEdge = false, glow = false, onPress, children, style }: SurfaceProps) {
  const s = SURFACE[variant]
  const boxShadow = [s.shadow, glow ? flShadow.glowSubtle : ''].filter(Boolean).join(', ') || undefined

  const content = (
    <View
      style={[
        styles.base,
        {
          borderRadius: flRadius[radius],
          borderColor: bronzeEdge ? flColor.bronzeBorder : s.border,
          boxShadow,
        },
        style,
      ]}
    >
      {variant === 'card' && !s.flat ? (
        <LinearGradient
          pointerEvents="none"
          colors={['#181A1C', flColor.charcoal800]}
          style={[StyleSheet.absoluteFill, { borderRadius: flRadius[radius] }]}
        />
      ) : null}
      {s.flat ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: s.flat, borderRadius: flRadius[radius] }]} /> : null}
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
