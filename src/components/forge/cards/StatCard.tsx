/**
 * Unassigned — not yet in the CLA-Cxx registry (Component-Library-Architecture-v1.0.md)
 * Tier: 2 (Composite)
 * Spec: Forge Card Library.dc.html §02
 *
 * Dashboard metrics card.
 * Anatomy: label row · large value · secondary label · trend row
 * States: default · positive · warning · locked
 */

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { EngravedIcon, type EngravedName } from '@/components/forge/primitives/icons/EngravedIcon'
import { color, space, size } from '@/constants/tokens'
import { BaseCard } from './BaseCard'
import { CARD } from './_cardTokens'
import type { StatCardState, TrendDirection } from './types'

export interface StatCardProps {
  label: string
  value: string
  secondary?: string
  /** Engraved icon name shown next to the label */
  iconName?: EngravedName
  trend?: TrendDirection
  trendValue?: string
  state?: StatCardState
  onPress?: () => void
}

const TREND_ICON: Record<TrendDirection, EngravedName> = {
  up:      'trend-up',
  down:    'trend-up',
  neutral: 'minus',
}

export function StatCard({
  label,
  value,
  secondary,
  iconName,
  trend,
  trendValue,
  state = 'default',
  onPress,
}: StatCardProps) {
  const isLocked = state === 'locked'

  const valueColor: string =
    state === 'positive' ? color.success
    : state === 'warning' ? color.warning
    : color.text.primary

  const trendColor: string = trend === 'up'
    ? CARD.TREND_UP
    : trend === 'down'
    ? CARD.TREND_DOWN
    : CARD.TREND_NEUTRAL

  return (
    <BaseCard
      minHeight={CARD.MIN_HEIGHT_STAT}
      onPress={onPress}
      disabled={isLocked}
      style={isLocked ? styles.locked : undefined}
    >
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {iconName && !isLocked && (
          <EngravedIcon name={iconName} size={size.iconInline} />
        )}
        {isLocked && (
          <EngravedIcon name="lock" size={size.iconInline} color={color.text.tertiary} />
        )}
      </View>

      {/* Value */}
      <Text style={[styles.value, { color: isLocked ? color.text.tertiary : valueColor }]}>
        {isLocked ? '—' : value}
      </Text>

      {/* Secondary */}
      {secondary ? (
        <Text style={styles.secondary} numberOfLines={1}>{secondary}</Text>
      ) : null}

      {/* Trend row */}
      {trend && trendValue && !isLocked ? (
        <View style={styles.trendRow}>
          <View style={trend === 'down' ? styles.trendDown : undefined}>
            <EngravedIcon name={TREND_ICON[trend]} size={13} color={trendColor} />
          </View>
          <Text style={[styles.trendValue, { color: trendColor }]}>{trendValue}</Text>
        </View>
      ) : null}
    </BaseCard>
  )
}

const styles = StyleSheet.create({
  /** No engraved trend-down — the trend-up glyph, mirrored. */
  trendDown: { transform: [{ scaleY: -1 }] },
  locked: {
    opacity: 0.55,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  label: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: color.text.tertiary,
  },
  value: {
    fontSize: 28,
    fontWeight: '600',
    color: color.text.primary,
    letterSpacing: -0.4,
    lineHeight: 34,
    marginBottom: 2,
  },
  secondary: {
    fontSize: 13,
    color: color.text.tertiary,
    lineHeight: 18,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: space.xs,
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '500',
  },
})
