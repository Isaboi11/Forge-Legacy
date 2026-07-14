/**
 * CLA-C05 — AvatarGlyph
 * Tier: 1 (Primitive)
 * Spec: components/Avatar/AvatarGlyph.jsx (Claude Design)
 *
 * The initials fallback shown when an athlete has no profile photo — a
 * forged charcoal disc with bronze letters. Never a generic silhouette icon.
 */

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { flColor, flRadius } from '@/constants/foundation'

export type AvatarSize = 'squadStack' | 'appBar' | 'listRow' | 'profile' | 'modalProfile' | number

const SIZES: Record<Exclude<AvatarSize, number>, number> = {
  squadStack: 28,
  appBar: 36,
  listRow: 40,
  profile: 88,
  modalProfile: 96,
}

export function resolveAvatarSize(size: AvatarSize): number {
  return typeof size === 'number' ? size : SIZES[size]
}

export function initials(name = ''): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export interface AvatarGlyphProps {
  name?: string
  size?: AvatarSize
}

export function AvatarGlyph({ name, size = 'listRow' }: AvatarGlyphProps) {
  const px = resolveAvatarSize(size)
  return (
    <View
      accessibilityLabel={name ? `${name}, no photo` : 'Athlete'}
      style={[
        styles.disc,
        {
          width: px,
          height: px,
          borderRadius: flRadius.round,
          boxShadow: `inset 0 1px 0 ${flColor.innerHighlight}`,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: Math.max(10, Math.round(px * 0.38)) }]}>{initials(name)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  disc: {
    flexShrink: 0,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: flColor.bronze400,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
