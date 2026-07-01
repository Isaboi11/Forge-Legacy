/**
 * ForgeSegmentedControl
 * Spec: Forge Navigation Library.dc.html §06
 *
 * Compact 2/3/4-option mutually-exclusive toggle.
 * Deliberately uses no bronze — these switch context, not mark achievement (CLA-P1).
 */

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { color } from '@/constants/tokens'
import { NAV } from './_navigationTokens'
import type { ForgeSegmentedControlProps } from './types'

export function ForgeSegmentedControl({
  options,
  activeKey,
  onChange,
  disabled = false,
}: ForgeSegmentedControlProps) {
  return (
    <View
      style={[styles.container, disabled && styles.disabled]}
      accessibilityRole="tablist"
      accessibilityLabel="Options"
    >
      {options.map(opt => {
        const isActive = opt.key === activeKey
        return (
          <Pressable
            key={opt.key}
            onPress={() => !disabled && onChange(opt.key)}
            disabled={disabled}
            accessibilityLabel={opt.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled }}
            style={[
              styles.item,
              isActive && styles.itemActive,
            ]}
          >
            <Text style={[
              styles.label,
              isActive ? styles.labelActive : styles.labelInactive,
            ]}>
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: NAV.SEG_PAD,
    backgroundColor: color.background.elevated,
    borderWidth: 1,
    borderColor: color.border.subtle,
    padding: NAV.SEG_PAD,
    borderRadius: NAV.RADIUS_SEGMENT,
  },
  item: {
    flex: 1,
    minHeight: NAV.HEIGHT_SEGMENT,
    borderRadius: NAV.RADIUS_SEG_BTN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: {
    backgroundColor: NAV.SEG_ACTIVE_BG,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 14,
  },
  labelActive: {
    fontWeight: '600',
    color: color.text.primary,
  },
  labelInactive: {
    fontWeight: '400',
    color: color.text.secondary,
  },
  disabled: {
    opacity: 0.45,
  },
})
