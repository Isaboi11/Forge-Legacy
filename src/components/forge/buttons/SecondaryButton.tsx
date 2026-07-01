/**
 * CLA-C08 — SecondaryButton
 * Tier: 2 (Composite)
 * Spec: ButtonLibrary.dc.html · variant="secondary"
 *
 * Transparent fill, 1px bronze border, bronze text, subtle ambient glow.
 * H 52 · R 12 · PX 24
 */

import React, { useRef, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { color, typography } from '@/constants/tokens'
import { BTN } from './_buttonTokens'
import { ButtonIcon } from './_ButtonIcon'
import type { ButtonBaseProps, ShadowStyle } from './_types'

export interface SecondaryButtonProps extends ButtonBaseProps {}

export function SecondaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  selected = false,
  success = false,
  error = false,
  iconLeft,
  iconRight,
  accessibilityLabel,
  fullWidth = false,
}: SecondaryButtonProps) {
  const scale = useRef(new Animated.Value(1)).current
  const shakeX = useRef(new Animated.Value(0)).current
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
  }, [error])

  const handlePressIn = () => {
    if (disabled || loading) return
    setPressed(true)
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 0 }).start()
  }
  const handlePressOut = () => {
    setPressed(false)
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 2 }).start()
  }

  // Derived state
  const isSuccess = success
  const isError   = error
  const isSelected = selected

  let bgColor: string = 'transparent'
  let borderColor: string = color.accent.highlight
  let textColor: string = color.accent.primary
  let shadow: ShadowStyle = BTN.SHADOW_CARD

  if (isSelected) {
    bgColor = BTN.SELECTED_BRONZE_BG
    borderColor = color.accent.highlight
    textColor = color.accent.highlight
    shadow = BTN.SHADOW_GLOW_PRESSED
  } else if (isSuccess) {
    bgColor = BTN.SUCCESS_NON_FILL_BG
    borderColor = color.success
    textColor = color.success
    shadow = BTN.SHADOW_SUCCESS
  } else if (isError) {
    bgColor = BTN.ERROR_NON_FILL_BG
    borderColor = color.danger
    textColor = BTN.ERROR_TEXT
    shadow = BTN.SHADOW_ERROR
  } else if (pressed) {
    bgColor = BTN.SECONDARY_PRESSED_BG
    shadow = BTN.SHADOW_GLOW_PRESSED
  }

  const focusShadow = focused
    ? { ...shadow, shadowColor: color.accent.primary, shadowOpacity: 0.4, shadowRadius: 8 }
    : shadow

  const iconName = isSuccess ? 'check' : isError ? 'x' : iconLeft
  const hasLabel = !!(title && title.trim().length > 0)

  return (
    <Animated.View
      style={[
        { transform: [{ scale }, { translateX: shakeX }] },
        fullWidth && styles.fullWidth,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled || loading}
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button"
        accessibilityState={{ disabled, busy: loading, selected }}
        style={[
          styles.base,
          { backgroundColor: bgColor, borderColor },
          focusShadow,
          focused && styles.focusRing,
          disabled && styles.disabled,
          fullWidth && styles.fullWidth,
          !hasLabel && styles.iconOnly,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <>
            {iconName && (
              <ButtonIcon name={iconName} size={BTN.ICON_SIZE} color={textColor} />
            )}
            {hasLabel && (
              <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
                {title}
              </Text>
            )}
            {!isSuccess && !isError && iconRight && (
              <ButtonIcon name={iconRight} size={BTN.ICON_SIZE} color={textColor} />
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  base: {
    height: BTN.HEIGHT,
    borderRadius: BTN.RADIUS,
    borderWidth: 1,
    paddingHorizontal: BTN.PADDING_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    minWidth: BTN.HEIGHT,
  },
  iconOnly: {
    width: BTN.HEIGHT,
    paddingHorizontal: 0,
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  label: {
    fontSize: typography.scale.standardCardName.fontSize,
    fontWeight: BTN.FONT_WEIGHT,
    letterSpacing: BTN.LETTER_SPACING,
    lineHeight: typography.scale.standardCardName.lineHeight,
  },
  focusRing: {
    borderWidth: 2,
    borderColor: color.accent.primary,
  },
  disabled: {
    opacity: 0.3,
  },
})
