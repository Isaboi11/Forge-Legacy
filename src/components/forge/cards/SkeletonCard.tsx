/**
 * CLA-C07 — SkeletonCard
 * Tier: 2 (Composite)
 * Spec: Forge Card Library.dc.html §13
 *
 * Shimmer placeholders for loading states.
 * Uses opacity pulse animation — Animated.loop over Animated.sequence.
 * Variants: base · stat · media · feed · compact
 */

import React, { useEffect, useRef } from 'react'
import {
  Animated,
  StyleSheet,
  View,
} from 'react-native'
import { color, space } from '@/constants/tokens'
import { CARD } from './_cardTokens'
import type { SkeletonVariant } from './types'

export interface SkeletonCardProps {
  variant?: SkeletonVariant
}

function usePulse() {
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.40,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])

  return opacity
}

function Bone({
  width,
  height = 12,
  borderRadius = 4,
  opacity,
}: {
  width: number | `${number}%`
  height?: number
  borderRadius?: number
  opacity: Animated.Value
}) {
  return (
    <Animated.View
      style={[
        styles.bone,
        { width, height, borderRadius, opacity },
      ]}
    />
  )
}

export function SkeletonCard({ variant = 'base' }: SkeletonCardProps) {
  const opacity = usePulse()

  if (variant === 'compact') {
    return (
      <View style={[styles.base, styles.compactBase]}>
        <View style={styles.topHighlight} />
        <Bone width={40} height={40} borderRadius={8} opacity={opacity} />
        <View style={styles.compactContent}>
          <Bone width="60%" height={14} opacity={opacity} />
          <Bone width="40%" height={11} opacity={opacity} />
        </View>
        <Bone width={16} height={16} borderRadius={99} opacity={opacity} />
      </View>
    )
  }

  if (variant === 'stat') {
    return (
      <View style={styles.base}>
        <View style={styles.topHighlight} />
        <Bone width="40%" height={10} opacity={opacity} />
        <View style={{ marginTop: space.sm }}>
          <Bone width="60%" height={28} opacity={opacity} />
        </View>
        <View style={{ marginTop: space.xs }}>
          <Bone width="50%" height={11} opacity={opacity} />
        </View>
      </View>
    )
  }

  if (variant === 'media') {
    return (
      <View style={[styles.base, { padding: 0 }]}>
        <View style={styles.topHighlight} />
        {/* Square media placeholder */}
        <Animated.View style={[styles.mediaSquare, { opacity }]} />
        <View style={styles.mediaCaptionArea}>
          <Bone width="70%" height={13} opacity={opacity} />
          <Bone width="45%" height={11} opacity={opacity} />
        </View>
      </View>
    )
  }

  if (variant === 'feed') {
    return (
      <View style={styles.base}>
        <View style={styles.topHighlight} />
        {/* Header */}
        <View style={styles.feedHeader}>
          <Bone width={40} height={40} borderRadius={99} opacity={opacity} />
          <View style={styles.feedMeta}>
            <Bone width={120} height={13} opacity={opacity} />
            <Bone width={80} height={11} opacity={opacity} />
          </View>
        </View>
        {/* Body text lines */}
        <View style={styles.feedBody}>
          <Bone width="90%" height={13} opacity={opacity} />
          <Bone width="75%" height={13} opacity={opacity} />
          <Bone width="55%" height={13} opacity={opacity} />
        </View>
        {/* Reaction row */}
        <View style={styles.feedReactions}>
          <Bone width={50} height={13} opacity={opacity} />
          <Bone width={50} height={13} opacity={opacity} />
        </View>
      </View>
    )
  }

  // base (default)
  return (
    <View style={styles.base}>
      <View style={styles.topHighlight} />
      {/* Icon + title row */}
      <View style={styles.baseHeader}>
        <Bone width={CARD.ICON_BOX_SIZE} height={CARD.ICON_BOX_SIZE} borderRadius={8} opacity={opacity} />
        <View style={styles.baseHeaderText}>
          <Bone width="60%" height={14} opacity={opacity} />
          <Bone width="40%" height={11} opacity={opacity} />
        </View>
      </View>
      {/* Body lines */}
      <View style={styles.baseBody}>
        <Bone width="85%" height={12} opacity={opacity} />
        <Bone width="65%" height={12} opacity={opacity} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: CARD.RADIUS,
    padding: CARD.PADDING,
    backgroundColor: color.background.surface,
    borderWidth: 1,
    borderColor: CARD.BORDER,
    minHeight: CARD.MIN_HEIGHT_BASE,
    overflow: 'hidden',
    gap: space.sm,
  },
  compactBase: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: CARD.MIN_HEIGHT_COMPACT,
    paddingVertical: space.md,
    gap: space.md,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: CARD.INNER_HIGHLIGHT,
  },
  bone: {
    backgroundColor: CARD.SHIMMER_BASE,
  },
  // Compact
  compactContent: {
    flex: 1,
    gap: 5,
  },
  // Stat — no extra styles needed (uses gap in base)
  // Media
  mediaSquare: {
    aspectRatio: 1,
    backgroundColor: CARD.SHIMMER_BASE,
    width: '100%',
  },
  mediaCaptionArea: {
    paddingHorizontal: CARD.PADDING,
    paddingBottom: CARD.PADDING,
    gap: 5,
  },
  // Feed
  feedHeader: {
    flexDirection: 'row',
    gap: space.md,
    marginBottom: space.xs,
  },
  feedMeta: {
    flex: 1,
    gap: 5,
  },
  feedBody: {
    gap: 5,
  },
  feedReactions: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.xs,
  },
  // Base
  baseHeader: {
    flexDirection: 'row',
    gap: space.sm,
  },
  baseHeaderText: {
    flex: 1,
    gap: 5,
    justifyContent: 'center',
  },
  baseBody: {
    gap: 5,
    marginTop: space.xs,
  },
})
