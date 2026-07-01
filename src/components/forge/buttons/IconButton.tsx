/**
 * CLA-C08 — IconButton
 * Tier: 2 (Composite)
 * Spec: ButtonLibrary.dc.html · variant="icon"
 *
 * Square 44×44, border-radius 12, bronze outline, centered Feather icon.
 * Icon-only — no label prop (use accessibilityLabel for screen readers).
 */

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
} from 'react-native'
import { color } from '@/constants/tokens'
import { BTN } from './_buttonTokens'
import { ButtonIcon } from './_ButtonIcon'
import type { ButtonIconName, ShadowStyle } from './_types'

export interface IconButtonProps {
  /** Phosphor/Feather icon name to display */
  icon: ButtonIconName
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  selected?: boolean
  success?: boolean
  error?: boolean
  accessibilityLabel: string
}

export function IconButton({
  icon,
  onPress,
  disabled = false,
  loading = false,
  selected = false,
  success = false,
  error = false,
  accessibilityLabel,
}: IconButtonProps) {
  const [scale]  = useState(() => new Animated.Value(1))
  const [shakeX] = useState(() => new Animated.Value(0))
  const [pressed, setPressed] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!error) return
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start()
  }, [error, shakeX])

  const handlePressIn = () => {
    if (disabled || loading) return
    setPressed(true)
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start()
  }
  const handlePressOut = () => {
    setPressed(false)
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 2 }).start()
  }

  let bgColor: string   = 'transparent'
  let borderCol: string = color.accent.highlight
  let iconColor: string = color.accent.primary
  let shadow: ShadowStyle = BTN.SHADOW_CARD

  if (selected) {
    bgColor   = BTN.SELECTED_BRONZE_BG
    borderCol = color.accent.highlight
    iconColor = color.accent.highlight
    shadow    = BTN.SHADOW_GLOW_PRESSED
  } else if (success) {
    bgColor   = BTN.SUCCESS_NON_FILL_BG
    borderCol = color.success
    iconColor = color.success
    shadow    = BTN.SHADOW_SUCCESS
  } else if (error) {
    bgColor   = BTN.ERROR_NON_FILL_BG
    borderCol = color.danger
    iconColor = BTN.ERROR_TEXT
    shadow    = BTN.SHADOW_ERROR
  } else if (pressed) {
    bgColor   = BTN.ICON_PRESSED_BG
    shadow    = BTN.SHADOW_GLOW_PRESSED
  }

  const displayIcon: ButtonIconName = success ? 'check' : error ? 'x' : icon

  return (
    <Animated.View style={{ transform: [{ scale }, { translateX: shakeX }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled || loading}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled, busy: loading, selected }}
        style={[
          styles.base,
          shadow,
          { backgroundColor: bgColor, borderColor: borderCol },
          focused && styles.focusRing,
          disabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <ButtonIcon name={displayIcon} size={BTN.ICON_SIZE_ICON} color={iconColor} />
        )}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  base: {
    width: BTN.HEIGHT_ICON,
    height: BTN.HEIGHT_ICON,
    borderRadius: BTN.RADIUS,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusRing: {
    borderWidth: 2,
    borderColor: color.accent.primary,
  },
  disabled: {
    opacity: 0.3,
  },
})
