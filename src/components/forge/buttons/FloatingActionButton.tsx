/**
 * CLA-C08 — FloatingActionButton
 * Tier: 2 (Composite)
 * Spec: ButtonLibrary.dc.html · variant="fab"
 *
 * Circular 60×60, bronze gradient, strong elevated shadow, ambient glow.
 * Typically absolutely positioned at the bottom-right of the viewport.
 */

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BTN } from './_buttonTokens'
import { ButtonIcon } from './_ButtonIcon'
import type { ButtonIconName } from './_types'

export interface FloatingActionButtonProps {
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

export function FloatingActionButton({
  icon,
  onPress,
  disabled = false,
  loading = false,
  selected = false,
  success = false,
  error = false,
  accessibilityLabel,
}: FloatingActionButtonProps) {
  const [scale]  = useState(() => new Animated.Value(1))
  const [shakeX] = useState(() => new Animated.Value(0))
  const [pressed, setPressed] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!error) return
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 5,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 5,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start()
  }, [error, shakeX])

  const handlePressIn = () => {
    if (disabled || loading) return
    setPressed(true)
    Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, speed: 50, bounciness: 0 }).start()
  }
  const handlePressOut = () => {
    setPressed(false)
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 0 }).start()
  }

  const gradColors = success
    ? BTN.GRAD_COLORS_SUCCESS
    : selected
    ? BTN.GRAD_COLORS_SELECTED
    : BTN.GRAD_COLORS
  const gradStart = success || selected ? BTN.GRAD_START_ANGLED : BTN.GRAD_START
  const gradEnd   = success || selected ? BTN.GRAD_END_ANGLED   : BTN.GRAD_END

  const stateBoxShadow = success
    ? BTN.BOX_SHADOW_FAB_SUCCESS
    : error
    ? BTN.BOX_SHADOW_FAB_ERROR
    : selected
    ? BTN.BOX_SHADOW_FAB_SELECTED
    : pressed
    ? BTN.BOX_SHADOW_FAB_PRESSED
    : BTN.BOX_SHADOW_FAB_DEFAULT
  const boxShadow = disabled
    ? BTN.DISABLED_BOX_SHADOW
    : focused
    ? BTN.appendFocusRing(stateBoxShadow)
    : stateBoxShadow

  const filter = disabled
    ? BTN.DISABLED_FILTER
    : pressed
    ? BTN.PRESSED_FILTER_BRONZE
    : undefined

  const iconColor = BTN.WHITE
  const displayIcon: ButtonIconName = success ? 'check' : error ? 'x' : icon

  return (
    <Animated.View
      style={{ transform: [{ scale }, { translateX: shakeX }] }}
    >
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
        style={[disabled && styles.disabled]}
      >
        <LinearGradient
          colors={gradColors}
          start={gradStart}
          end={gradEnd}
          locations={BTN.GRAD_LOCATIONS}
          style={[styles.base, { boxShadow, filter }]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={BTN.HIGHLIGHT_OVERLAY_COLORS}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.55 }}
            style={[StyleSheet.absoluteFill, styles.highlightOverlay]}
          />
          {loading ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <ButtonIcon name={displayIcon} size={BTN.ICON_SIZE_FAB} color={iconColor} />
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  base: {
    width: BTN.HEIGHT_FAB,
    height: BTN.HEIGHT_FAB,
    borderRadius: BTN.RADIUS_FAB,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  highlightOverlay: {
    borderRadius: BTN.RADIUS_FAB,
  },
  disabled: {
    opacity: BTN.DISABLED_OPACITY,
  },
})
