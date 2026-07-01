/**
 * CLA-C07 — SectionCard
 * Tier: 2 (Composite)
 * Spec: Forge Card Library.dc.html §11
 *
 * Lightweight grouping container. No surface background — transparent layout only.
 * Anatomy: section header (label + optional action link) · children stack
 */

import React from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { color, space } from '@/constants/tokens'

export interface SectionCardProps {
  /** Section label rendered as ALL-CAPS heading */
  label: string
  /** Optional trailing action link label (e.g. "See all") */
  actionLabel?: string
  onActionPress?: () => void
  children?: React.ReactNode
}

export function SectionCard({
  label,
  actionLabel,
  onActionPress,
  children,
}: SectionCardProps) {
  return (
    <View style={styles.root}>
      {/* Header row */}
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {actionLabel ? (
          <Pressable onPress={onActionPress} hitSlop={8}>
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    gap: space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: color.text.tertiary,
  },
  action: {
    fontSize: 13,
    fontWeight: '500',
    color: color.accent.primary,
  },
  content: {
    gap: space.md,
  },
})
