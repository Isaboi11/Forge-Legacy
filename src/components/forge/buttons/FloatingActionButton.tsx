/**
 * CLA-C08 — FloatingActionButton
 * Tier: 2 (Composite)
 * Spec: ButtonLibrary.dc.html · variant="fab"
 *
 * Circular 60×60, bronze gradient, strong elevated shadow, ambient glow.
 * Typically absolutely positioned at the bottom-right of the viewport.
 */

import React, { useRef, useEffect, useState } from 'react'
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
  const scale  = useRef(new Animated.Value(1)).current
  const shakeX = useRef(new Animated.Value(0)).current
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
  }, [error])

  const handlePressIn = () => {
    if (disabled || loading) return
    setPressed(true)
    Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 50, bounciness: 0 }).start()
  }
  const handlePressOut = () => {
    setPressed(false)
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 3 }).start()
  }

  const gradColors = success
    ? BTN.GRAD_COLORS_SUCCESS
    : selected
    ? BTN.GRAD_COLORS_SELECTED
    : BTN.GRAD_COLORS

  const shadow = pressed
    ? BTN.SHADOW_FAB_PRESSED
    : success
    ? BTN.SHADOW_SUCCESS
    : error
    ? BTN.SHADOW_ERROR
    : BTN.SHADOW_FAB

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
          start={BTN.GRAD_START}
          end={BTN.GRAD_END}
          locations={BTN.GRAD_LOCATIONS}
          style={[
            styles.base,
            shadow,
            focused && styles.focusRing,
          ]}
        >
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
  },
  focusRing: {
    borderWidth: 2,
    borderColor: color.accent.primary,
  },
  disabled: {
    opacity: 0.3,
  },
})
