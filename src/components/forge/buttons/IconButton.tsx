/**
 * CLA-C08 — IconButton
 * Tier: 2 (Composite)
 * Spec: ButtonLibrary.dc.html · variant="icon"
 *
 * Square 44×44, border-radius 12, bronze outline glow, centered Feather icon.
 * Icon-only — no label prop (use accessibilityLabel for screen readers).
 */

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { color } from '@/constants/tokens'
import { BTN } from './_buttonTokens'
import { ButtonIcon } from './_ButtonIcon'
import type { ButtonIconName } from './_types'

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
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 0 }).start()
  }
  const handlePressOut = () => {
    setPressed(false)
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 2 }).start()
  }

  let bgColors: readonly [string, string, string] = BTN.ICON_GLOW_COLORS
  let borderColor: string = BTN.BORDER_BRONZE_ICON
  let iconColor: string = BTN.DEFAULT_TEXT_OUTLINE
  let stateBoxShadow: string = BTN.BOX_SHADOW_ICON_DEFAULT

  if (selected) {
    bgColors = [BTN.SELECTED_BRONZE_BG, BTN.SELECTED_BRONZE_BG, BTN.SELECTED_BRONZE_BG] as const
    borderColor = color.accent.highlight
    iconColor = color.accent.highlight
    stateBoxShadow = BTN.BOX_SHADOW_OUTLINE_SELECTED
  } else if (success) {
    bgColors = [BTN.SUCCESS_NON_FILL_BG, BTN.SUCCESS_NON_FILL_BG, BTN.SUCCESS_NON_FILL_BG] as const
    borderColor = color.success
    iconColor = color.success
    stateBoxShadow = BTN.BOX_SHADOW_SUCCESS_NON_FILL
  } else if (error) {
    bgColors = [BTN.ERROR_NON_FILL_BG, BTN.ERROR_NON_FILL_BG, BTN.ERROR_NON_FILL_BG] as const
    borderColor = color.danger
    iconColor = BTN.ERROR_TEXT
    stateBoxShadow = BTN.BOX_SHADOW_ERROR_NON_FILL
  } else if (pressed) {
    bgColors = [BTN.ICON_PRESSED_BG, BTN.ICON_PRESSED_BG, BTN.ICON_PRESSED_BG] as const
    stateBoxShadow = BTN.BOX_SHADOW_OUTLINE_PRESSED
  }

  const boxShadow = disabled
    ? BTN.DISABLED_BOX_SHADOW
    : focused
    ? BTN.appendFocusRing(stateBoxShadow)
    : stateBoxShadow

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
      >
        <LinearGradient
          colors={bgColors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[
            styles.base,
            { borderColor, boxShadow },
            disabled && styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <ButtonIcon name={displayIcon} size={BTN.ICON_SIZE_ICON} color={iconColor} />
          )}
        </LinearGradient>
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
  disabled: {
    opacity: BTN.DISABLED_OPACITY,
  },
})
