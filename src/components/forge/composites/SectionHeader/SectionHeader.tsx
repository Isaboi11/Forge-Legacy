/**
 * CLA-C17 — SectionHeader
 * Tier: 2 (Composite)
 * Spec: components/SectionHeader/SectionHeader.jsx (Claude Design)
 *
 * The 11sp ALL-CAPS label that precedes every distinct content group
 * ("TRAIN TOGETHER", honor categories). This is the ONLY sanctioned
 * all-caps scale in the product (CLA-D14). Optional trailing action
 * ("View all →").
 */

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { flColor, flText } from '@/constants/foundation'

export interface SectionHeaderProps {
  label: string
  action?: string
  onAction?: () => void
}

export function SectionHeader({ label, action, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>

      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.actionBtn} hitSlop={8}>
          <Text style={styles.actionText}>{action}</Text>
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
            <Path d="M9 5l7 7-7 7" stroke={flColor.bronze400} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flText.bronzeLabel,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: flColor.bronze400,
  },
})
