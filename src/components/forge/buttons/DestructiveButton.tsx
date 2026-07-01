/**
 * CLA-C08 — DestructiveButton
 * Tier: 2 (Composite)
 * Spec: ButtonLibrary.dc.html · variant="destructive"
 *
 * Elevated dark surface fill, red 1px border, white text.
 * RESTRICTED: M-6 Destructive Confirm + L-13 Delete action ONLY (CLA-D8).
 * H 52 · R 12 · PX 24
 */

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native'
import { color, typography } from '@/constants/tokens'
import { BTN } from './_buttonTokens'
import { ButtonIcon } from './_ButtonIcon'
import type { ButtonBaseProps, ShadowStyle } from './_types'

export type DestructiveButtonProps = ButtonBaseProps

export function DestructiveButton({
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
}: DestructiveButtonProps) {
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

  let bgColor: string    = color.background.elevated
  let borderCol: string  = color.destructive
  let textColor: string  = BTN.WHITE
  let shadow: ShadowStyle = BTN.SHADOW_CARD

  if (selected) {
    bgColor   = BTN.SELECTED_DESTR_BG
    borderCol = '#C46A6A'
    shadow    = BTN.SHADOW_DESTRUCTIVE_PRESSED
  } else if (success) {
    bgColor   = BTN.SUCCESS_NON_FILL_BG
    borderCol = color.success
    textColor = color.success
    shadow    = BTN.SHADOW_SUCCESS
  } else if (error) {
    shadow    = BTN.SHADOW_ERROR
    borderCol = color.danger
  } else if (pressed) {
    bgColor   = BTN.DESTRUCTIVE_PRESSED
    shadow    = BTN.SHADOW_DESTRUCTIVE_PRESSED
  }

  if (focused) {
    shadow = { ...BTN.SHADOW_ERROR, shadowColor: color.destructive as string, shadowOpacity: 0.45 }
  }

  const iconName = success ? 'check' : error ? 'x' : iconLeft
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
        accessibilityState={{ disabled, busy: loading }}
        style={[
          styles.base,
          shadow,
          { backgroundColor: bgColor, borderColor: borderCol },
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
            {!success && !error && iconRight && (
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
  },
  disabled: {
    opacity: 0.3,
  },
})
