/**
 * CLA-C08 — DestructiveButton
 * Tier: 2 (Composite)
 * Spec: ButtonLibrary.dc.html · variant="destructive"
 *
 * Dark gradient surface fill, red 1px border, white text.
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
import { LinearGradient } from 'expo-linear-gradient'
import { color } from '@/constants/tokens'
import { BTN } from './_buttonTokens'
import { ButtonIcon } from './_ButtonIcon'
import type { ButtonBaseProps } from './_types'

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

  let bgColors: readonly [string, string] = BTN.DESTRUCTIVE_GRAD_COLORS
  let borderColor: string = 'rgba(196,86,60,0.9)'
  let textColor: string = BTN.WHITE
  let stateBoxShadow: string = BTN.BOX_SHADOW_DESTRUCTIVE_DEFAULT

  if (selected) {
    bgColors = [BTN.SELECTED_DESTR_BG, BTN.SELECTED_DESTR_BG] as const
    borderColor = BTN.SELECTED_DESTR_BORDER
    stateBoxShadow = BTN.BOX_SHADOW_DESTRUCTIVE_SELECTED
  } else if (success) {
    bgColors = [BTN.SUCCESS_NON_FILL_BG, BTN.SUCCESS_NON_FILL_BG] as const
    borderColor = color.success
    textColor = color.success
    stateBoxShadow = BTN.BOX_SHADOW_SUCCESS_NON_FILL
  } else if (error) {
    bgColors = [BTN.ERROR_NON_FILL_BG, BTN.ERROR_NON_FILL_BG] as const
    borderColor = color.danger
    textColor = BTN.ERROR_TEXT
    stateBoxShadow = BTN.BOX_SHADOW_ERROR_NON_FILL
  } else if (pressed) {
    bgColors = [BTN.DESTRUCTIVE_PRESSED_BG, BTN.DESTRUCTIVE_PRESSED_BG] as const
    borderColor = BTN.DESTRUCTIVE_PRESSED_BORDER
    stateBoxShadow = BTN.BOX_SHADOW_DESTRUCTIVE_PRESSED
  }

  const boxShadow = disabled
    ? BTN.DISABLED_BOX_SHADOW
    : focused
    ? BTN.appendFocusRing(stateBoxShadow)
    : stateBoxShadow

  const hasLabel = !!(title && title.trim().length > 0)
  let iconName = iconLeft
  if (selected && !iconName && hasLabel) iconName = 'check'
  if (success && !iconName) iconName = 'check'

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
        style={[fullWidth && styles.fullWidth]}
      >
        <LinearGradient
          colors={bgColors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[
            styles.base,
            { borderColor, boxShadow },
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
              {iconRight && (
                <ButtonIcon name={iconRight} size={BTN.ICON_SIZE} color={textColor} />
              )}
            </>
          )}
        </LinearGradient>
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
    fontSize: 16,
    fontWeight: BTN.FONT_WEIGHT,
    letterSpacing: BTN.LETTER_SPACING,
    lineHeight: BTN.LABEL_LINE_HEIGHT,
  },
  disabled: {
    opacity: BTN.DISABLED_OPACITY,
  },
})
