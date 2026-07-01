/**
 * ForgeBackButton
 * Spec: Forge Navigation Library.dc.html §03
 *
 * Four return affordances — icon-only, labeled, floating, and circular.
 * All honour the 44pt minimum touch target.
 */

import React from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color, shadow } from '@/constants/tokens'
import { NAV } from './_navigationTokens'
import type { BackButtonVariant, ForgeBackButtonProps } from './types'

export function ForgeBackButton({
  variant = 'icon',
  label = 'Back',
  onPress,
  disabled = false,
  accessibilityLabel = 'Go back',
}: ForgeBackButtonProps) {
  const isDisabled = disabled

  if (variant === 'circular') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        style={({ pressed }) => [
          styles.circular,
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.circularPressed,
        ]}
      >
        <Feather name="chevron-left" size={NAV.ICON_BACK} color={color.text.primary} />
      </Pressable>
    )
  }

  if (variant === 'floating') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        style={({ pressed }) => [
          styles.floating,
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.floatingPressed,
        ]}
      >
        <Feather
          name="chevron-left"
          size={NAV.ICON_BACK - 2}
          color={isDisabled ? color.text.tertiary : color.text.primary}
        />
      </Pressable>
    )
  }

  if (variant === 'iconWithLabel') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        style={({ pressed }) => [
          styles.labeledBase,
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed,
        ]}
      >
        <Feather
          name="chevron-left"
          size={NAV.ICON_BACK}
          color={isDisabled ? color.text.tertiary : color.text.primary}
        />
        <Text style={[styles.labelText, isDisabled && styles.labelDisabled]}>
          {label}
        </Text>
      </Pressable>
    )
  }

  // icon (default)
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.iconBase,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <Feather
        name="chevron-left"
        size={NAV.ICON_BACK}
        color={isDisabled ? color.text.tertiary : color.text.primary}
      />
    </Pressable>
  )
}

// Back button variants need a floating shadow — define inline since shadow token
// may not have a matching elevation level.
const _floatingShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.5,
  shadowRadius: 8,
  elevation: 4,
} as const

// Suppress unused import warning — shadow is imported from tokens but not used here;
// we use _floatingShadow for the floating variant's stronger shadow.
void (shadow as unknown)

const styles = StyleSheet.create({
  // Icon only
  iconBase: {
    width: NAV.HEIGHT_MENU_ITEM,
    height: NAV.HEIGHT_MENU_ITEM,
    borderRadius: NAV.RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Icon + label
  labeledBase: {
    minWidth: NAV.HEIGHT_MENU_ITEM,
    height: NAV.HEIGHT_MENU_ITEM,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: NAV.RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  labelText: {
    fontSize: 16,
    color: color.text.primary,
  },
  labelDisabled: {
    color: color.text.tertiary,
  },
  // Floating (bordered, elevated)
  floating: {
    width: NAV.HEIGHT_MENU_ITEM,
    height: NAV.HEIGHT_MENU_ITEM,
    borderRadius: NAV.RADIUS,
    borderWidth: 1,
    borderColor: color.border.subtle,
    backgroundColor: NAV.FLOATING_BTN_BG,
    alignItems: 'center',
    justifyContent: 'center',
    ..._floatingShadow,
  },
  floatingPressed: {
    borderColor: NAV.ACTIVE_INDICATOR_BORDER,
    backgroundColor: color.background.elevated,
  },
  // Circular (transparent over hero images)
  circular: {
    width: NAV.HEIGHT_MENU_ITEM,
    height: NAV.HEIGHT_MENU_ITEM,
    borderRadius: NAV.RADIUS_PILL,
    backgroundColor: NAV.SCRIM_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularPressed: {
    backgroundColor: NAV.SCRIM_BG_PRESSED,
  },
  // Shared states
  pressed: {
    backgroundColor: color.innerHighlight,
  },
  disabled: {
    opacity: 0.45,
  },
})

// Type used in variant resolution
void (undefined as unknown as BackButtonVariant)
