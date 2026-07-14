/**
 * CLA-C09 — Pill
 * Tier: 2 (Composite)
 * Spec: components/Pill/Pill.jsx (Claude Design)
 *
 * A small uppercase attribute tag (COMPOUND, PUSH, "2 Goals"). Hairline
 * bronze border, near-transparent fill. Never a solid bronze slab.
 */

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { flColor, flRadius, flText } from '@/constants/foundation'

export type PillTone = 'bronze' | 'muted'
export type PillSize = 'sm' | 'md'

export interface PillProps {
  children: React.ReactNode
  tone?: PillTone
  size?: PillSize
}

export function Pill({ children, tone = 'bronze', size = 'md' }: PillProps) {
  return (
    <View style={[styles.base, sizeStyles[size], toneStyles[tone]]}>
      <Text style={[styles.text, textSizeStyles[size], { color: tone === 'bronze' ? flText.bronzeLabel : flText.secondary }]}>
        {children}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: flRadius.sm,
  },
  text: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
})

const sizeStyles = StyleSheet.create({
  sm: { paddingVertical: 5, paddingHorizontal: 10 },
  md: { paddingVertical: 9, paddingHorizontal: 16 },
})

const textSizeStyles = StyleSheet.create({
  sm: { fontSize: 10, letterSpacing: 0.9 },
  md: { fontSize: 12, letterSpacing: 1 },
})

const toneStyles = StyleSheet.create({
  bronze: {
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  muted: {
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: 'transparent',
  },
})
