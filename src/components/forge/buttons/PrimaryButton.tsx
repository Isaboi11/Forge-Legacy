/**
 * CLA-C08 — PrimaryButton
 * Tier: 2 (Composite)
 * Spec: ButtonLibrary.dc.html · variant="primary"
 *
 * Bronze gradient fill, white text, glow on press.
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
import { color, typography } from '@/constants/tokens'
import { BTN } from './_buttonTokens'
import { ButtonIcon } from './_ButtonIcon'
import type { ButtonBaseProps } from './_types'

export type PrimaryButtonProps = ButtonBaseProps

export function PrimaryButton({
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
}: PrimaryButtonProps) {
  const [scale]  = useState(() => new Animated.Value(1))
  const [shakeX] = useState(() => new Animated.Value(0))
  const [pressed, setPressed] = useState(false)
  const [focused, setFocused] = useState(false)

  // Shake on error
  useEffect(() => {
    if (!error) return
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -2, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,  duration: 50, useNativeDriver: true }),
    ]).start()
  }, [error, shakeX])

  const handlePressIn = () => {
    if (disabled || loading) return
    setPressed(true)
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start()
  }
  const handlePressOut = () => {
    setPressed(false)
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 2 }).start()
  }

  // Effective gradient colors
  const gradColors = success
    ? BTN.GRAD_COLORS_SUCCESS
    : selected
    ? BTN.GRAD_COLORS_SELECTED
    : BTN.GRAD_COLORS

  // Effective shadow
  const shadow = pressed
    ? BTN.SHADOW_GLOW_PRESSED
    : success
    ? BTN.SHADOW_SUCCESS
    : error
    ? BTN.SHADOW_ERROR
    : BTN.SHADOW_PRIMARY

  // Focused ring
  const focusedBorder = focused
    ? { borderWidth: 2, borderColor: color.accent.primary }
    : { borderWidth: 0 }

  const iconColor = BTN.WHITE
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
        accessibilityState={{ disabled, busy: loading, selected }}
        style={[fullWidth && styles.fullWidth]}
      >
        <LinearGradient
          colors={gradColors}
          start={BTN.GRAD_START}
          end={BTN.GRAD_END}
          locations={BTN.GRAD_LOCATIONS}
          style={[
            styles.base,
            shadow,
            focusedBorder,
            disabled && styles.disabled,
            fullWidth && styles.fullWidth,
            !hasLabel && styles.iconOnly,
          ]}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={BTN.WHITE}
              style={hasLabel ? styles.spinnerWithLabel : undefined}
            />
          ) : (
            <>
              {iconName && (
                <ButtonIcon name={iconName} size={BTN.ICON_SIZE} color={iconColor} />
              )}
              {hasLabel && (
                <Text style={styles.label} numberOfLines={1}>
                  {title}
                </Text>
              )}
              {!success && !error && iconRight && (
                <ButtonIcon name={iconRight} size={BTN.ICON_SIZE} color={iconColor} />
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
    fontFamily: undefined,
    fontSize: typography.scale.standardCardName.fontSize,
    fontWeight: BTN.FONT_WEIGHT,
    letterSpacing: BTN.LETTER_SPACING,
    lineHeight: typography.scale.standardCardName.lineHeight,
    color: BTN.WHITE,
  },
  disabled: {
    opacity: 0.3,
  },
  spinnerWithLabel: {
    marginHorizontal: BTN.PADDING_H,
  },
})
