/**
 * CLA-C08 — GhostButton
 * Tier: 2 (Composite)
 * Spec: ButtonLibrary.dc.html · variant="ghost"
 *
 * No border, no fill, bronze text. Opacity and background tint on press.
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
import { color } from '@/constants/tokens'
import { BTN } from './_buttonTokens'
import { ButtonIcon } from './_ButtonIcon'
import type { ButtonBaseProps } from './_types'

export type GhostButtonProps = ButtonBaseProps

export function GhostButton({
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
}: GhostButtonProps) {
  const [opacity] = useState(() => new Animated.Value(1))
  const [shakeX]  = useState(() => new Animated.Value(0))
  const [pressed, setPressed]   = useState(false)
  const [focused, setFocused]   = useState(false)

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
    Animated.timing(opacity, { toValue: BTN.GHOST_PRESSED_OPACITY, duration: 60, useNativeDriver: true }).start()
  }
  const handlePressOut = () => {
    setPressed(false)
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start()
  }

  // Ghost never has a real border by default — success/error borrow the
  // shared non-fill treatment (which does add a real 1px border), everything
  // else uses an inset box-shadow ring instead so layout never shifts.
  let bgColor: string = 'transparent'
  let textColor: string = BTN.DEFAULT_TEXT_OUTLINE
  let borderWidth = 0
  let borderColor: string = 'transparent'
  let stateBoxShadow = 'none'

  if (selected) {
    bgColor = BTN.SELECTED_GHOST_BG
    stateBoxShadow = BTN.BOX_SHADOW_GHOST_SELECTED
  } else if (success) {
    bgColor = BTN.SUCCESS_NON_FILL_BG
    borderWidth = 1
    borderColor = color.success
    textColor = color.success
    stateBoxShadow = BTN.BOX_SHADOW_SUCCESS_NON_FILL
  } else if (error) {
    bgColor = BTN.ERROR_NON_FILL_BG
    borderWidth = 1
    borderColor = color.danger
    textColor = BTN.ERROR_TEXT
    stateBoxShadow = BTN.BOX_SHADOW_ERROR_NON_FILL
  } else if (pressed) {
    bgColor = BTN.GHOST_PRESSED_BG
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
        { transform: [{ translateX: shakeX }], opacity },
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
          { backgroundColor: bgColor, borderWidth, borderColor, boxShadow },
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
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  base: {
    height: BTN.HEIGHT,
    borderRadius: BTN.RADIUS,
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
