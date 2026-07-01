/**
 * ForgeBottomNav
 * Spec: Forge Navigation Library.dc.html §04
 *
 * The permanent five-tab spine of the app.
 * Active destination lifts to bronze with a soft indicator; everything else rests in gray.
 * Handles safe-area bottom inset internally.
 */

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color } from '@/constants/tokens'
import { NAV } from './_navigationTokens'
import type { BottomNavItem, ForgeBottomNavProps } from './types'

export function ForgeBottomNav({ items }: ForgeBottomNavProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.row}>
        {items.map(item => (
          <NavTab key={item.key} item={item} />
        ))}
      </View>
      {/* Home indicator placeholder rendered by RN safe area — this is extra bottom padding */}
    </View>
  )
}

function NavTab({ item }: { item: BottomNavItem }) {
  const { iconName, label, active = false, badgeCount, hasBadge, onPress, disabled = false } = item

  const iconColor = active ? color.accent.primary : disabled ? color.text.tertiary : color.text.tertiary
  const labelColor = active ? color.accent.primary : disabled ? color.text.tertiary : color.text.tertiary
  const labelWeight = active ? ('600' as const) : ('500' as const)

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      style={({ pressed }) => [
        styles.tab,
        pressed && !disabled && styles.tabPressed,
        disabled && styles.disabled,
      ]}
    >
      {/* Top active indicator bar */}
      <View style={[styles.indicator, active && styles.indicatorActive]} />

      {/* Glow halo (approximated — RN can't do radial-gradient) */}
      {active && <View style={styles.glow} pointerEvents="none" />}

      {/* Icon with optional badge */}
      <View style={styles.iconWrap}>
        <Feather name={iconName as 'home'} size={NAV.ICON_NAV} color={iconColor} />
        {(hasBadge || (badgeCount !== undefined && badgeCount > 0)) && (
          <View style={styles.badge}>
            {badgeCount !== undefined && badgeCount > 0 && (
              <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : String(badgeCount)}</Text>
            )}
          </View>
        )}
      </View>

      {/* Label */}
      <Text style={[styles.label, { color: labelColor, fontWeight: labelWeight }]}>
        {label}
      </Text>
    </Pressable>
  )
}

// Type guard reference
void (undefined as unknown as BottomNavItem)

const styles = StyleSheet.create({
  container: {
    backgroundColor: NAV.BOTTOM_SURFACE,
    borderTopWidth: 1,
    borderTopColor: '#222229',
    borderRadius: NAV.RADIUS_BOTTOM,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    minHeight: NAV.HEIGHT_BOTTOM_ITEM,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 14,
    gap: 5,
    position: 'relative',
  },
  tabPressed: {
    backgroundColor: color.innerHighlight,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: NAV.INDICATOR_W,
    height: NAV.INDICATOR_H,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: color.accent.primary,
    shadowColor: color.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 6,
    elevation: 2,
  },
  glow: {
    position: 'absolute',
    top: 9,
    width: NAV.GLOW_W,
    height: NAV.GLOW_H,
    borderRadius: NAV.RADIUS_PILL,
    backgroundColor: NAV.GLOW_BG,
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: NAV.BADGE_SIZE,
    height: NAV.BADGE_SIZE,
    paddingHorizontal: 4,
    borderRadius: NAV.RADIUS_PILL,
    backgroundColor: color.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: NAV.BOTTOM_SURFACE,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: color.text.inverse,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.45,
  },
})
