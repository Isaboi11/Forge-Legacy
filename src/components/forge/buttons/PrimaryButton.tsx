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
    Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, speed: 50, bounciness: 0 }).start()
  }
  const handlePressOut = () => {
    setPressed(false)
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 2 }).start()
  }

  // Effective gradient
  const gradColors = success
    ? BTN.GRAD_COLORS_SUCCESS
    : selected
    ? BTN.GRAD_COLORS_SELECTED
    : BTN.GRAD_COLORS
  const gradStart = success || selected ? BTN.GRAD_START_ANGLED : BTN.GRAD_START
  const gradEnd   = success || selected ? BTN.GRAD_END_ANGLED   : BTN.GRAD_END

  // Effective box-shadow (state precedence, then focus ring, then disabled
  // override — matching Button.dc.html's ordering exactly)
  const stateBoxShadow = success
    ? BTN.BOX_SHADOW_PRIMARY_SUCCESS
    : error
    ? BTN.BOX_SHADOW_PRIMARY_ERROR
    : selected
    ? BTN.BOX_SHADOW_PRIMARY_SELECTED
    : pressed
    ? BTN.BOX_SHADOW_PRIMARY_PRESSED
    : BTN.BOX_SHADOW_PRIMARY_DEFAULT
  const focusedBoxShadow = disabled
    ? BTN.DISABLED_BOX_SHADOW
    : focused
    ? BTN.appendFocusRing(stateBoxShadow)
    : stateBoxShadow

  const filter = disabled
    ? BTN.DISABLED_FILTER
    : pressed
    ? BTN.PRESSED_FILTER_BRONZE
    : undefined

  const textShadowColor = success ? BTN.TEXT_SHADOW_SUCCESS : BTN.TEXT_SHADOW_BRONZE

  const iconColor = BTN.WHITE
  // Icon-swap semantics (transcribed from Button.dc.html effIconLeft logic):
  // selected auto-checks only if no custom icon was supplied; success keeps a
  // custom icon if one was given; error never changes the icon for text buttons.
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
          colors={gradColors}
          start={gradStart}
          end={gradEnd}
          locations={BTN.GRAD_LOCATIONS}
          style={[
            styles.base,
            { boxShadow: focusedBoxShadow, filter },
            disabled && styles.disabled,
            fullWidth && styles.fullWidth,
            !hasLabel && styles.iconOnly,
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={BTN.HIGHLIGHT_OVERLAY_COLORS}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.55 }}
            style={[StyleSheet.absoluteFill, styles.highlightOverlay]}
          />
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
                <Text
                  style={[
                    styles.label,
                    { textShadowColor },
                  ]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              )}
              {iconRight && (
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
    overflow: 'hidden',
  },
  highlightOverlay: {
    borderRadius: BTN.RADIUS,
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
    color: BTN.WHITE,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  disabled: {
    opacity: BTN.DISABLED_OPACITY,
  },
  spinnerWithLabel: {
    marginHorizontal: BTN.PADDING_H,
  },
})
