/**
 * CLA-C08 — SecondaryButton
 * Tier: 2 (Composite)
 * Spec: ButtonLibrary.dc.html · variant="secondary"
 *
 * Subtle top-fade fill, 1px bronze border, bronze text, ambient glow.
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

export type SecondaryButtonProps = ButtonBaseProps

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
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 0 }).start()
  }

  let bgColors: readonly [string, string] = BTN.SECONDARY_GRAD_COLORS
  let borderColor: string = BTN.BORDER_BRONZE_SECONDARY
  let textColor: string = BTN.DEFAULT_TEXT_OUTLINE
  let stateBoxShadow: string = BTN.BOX_SHADOW_OUTLINE_DEFAULT

  if (selected) {
    bgColors = [BTN.SELECTED_BRONZE_BG, BTN.SELECTED_BRONZE_BG] as const
    borderColor = color.accent.highlight
    textColor = color.accent.highlight
    stateBoxShadow = BTN.BOX_SHADOW_OUTLINE_SELECTED
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
    bgColors = [BTN.SECONDARY_PRESSED_BG, BTN.SECONDARY_PRESSED_BG] as const
    stateBoxShadow = BTN.BOX_SHADOW_OUTLINE_PRESSED
  }

  const boxShadow = disabled
    ? BTN.DISABLED_BOX_SHADOW
    : focused
    ? BTN.appendFocusRing(stateBoxShadow)
    : stateBoxShadow

  // Icon-swap semantics: selected auto-checks only if no custom icon was
  // supplied; success keeps a custom icon if one was given; error never
  // changes the icon for text buttons.
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
        accessibilityState={{ disabled, busy: loading, selected }}
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
