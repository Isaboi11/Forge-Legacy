/**
 * CLA-C11 — Avatar
 * Tier: 2 (Composite)
 * Spec: components/Avatar/Avatar.jsx (Claude Design)
 *
 * Circular athlete photo at a fixed per-context size (squadStack 28 · appBar
 * 36 · listRow 40 · profile 88 · modalProfile 96, or an explicit px). Falls
 * back to the initials glyph (CLA-C05) when no `src` is set. `ring` adds a
 * bronze machined edge (used on the profile hero). `presence` shows the
 * squad-online dot.
 */

import React from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { flColor, flRadius, flShadow } from '@/constants/foundation'
import { type AvatarSize, initials, resolveAvatarSize } from './AvatarGlyph'

export interface AvatarProps {
  src?: string
  name?: string
  size?: AvatarSize
  ring?: boolean
  presence?: boolean
}

export function Avatar({ src, name, size = 'listRow', ring = false, presence = false }: AvatarProps) {
  const px = resolveAvatarSize(size)
  const dotSize = Math.max(8, Math.round(px * 0.22))

  return (
    <View style={{ width: px, height: px }}>
      <View
        style={[
          styles.disc,
          {
            width: px,
            height: px,
            borderRadius: flRadius.round,
            borderWidth: ring ? 1.5 : 1,
            borderColor: ring ? flColor.bronze400 : flColor.bronzeBorderSubtle,
            boxShadow: ring ? flShadow.avatarRingGlow : `inset 0 1px 0 ${flColor.innerHighlight}`,
          },
        ]}
      >
        {src ? (
          <Image source={{ uri: src }} accessibilityLabel={name ?? 'Athlete'} style={styles.image} />
        ) : (
          <Text
            accessibilityLabel={name ? `${name}, no photo` : 'Athlete'}
            style={[styles.text, { fontSize: Math.max(10, Math.round(px * 0.38)) }]}
          >
            {initials(name)}
          </Text>
        )}
      </View>

      {presence ? (
        <View
          style={[
            styles.presenceDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: flRadius.round,
              boxShadow: flShadow.presenceDotGlow,
            },
          ]}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  disc: {
    overflow: 'hidden',
    backgroundColor: flColor.charcoal700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  text: {
    color: flColor.bronze400,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  presenceDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: flColor.greenMuted,
    borderWidth: 2,
    borderColor: flColor.charcoal900,
  },
})
