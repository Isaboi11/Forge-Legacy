/**
 * CLA-C14 — ForgeToggle
 * Tier: 2 (Composite)
 * Spec: Forge Legacy Input Library.dc.html §07 — Choice Controls · Toggle
 *
 * 44×26 pill track. 20×20 thumb animates translateX 0 → 18.
 * States: off · on · disabled-off · disabled-on · loading
 *
 * Track: off=#111118, on=#C8A97E
 * Thumb: off=#9E9890, on=#DFC49A (highlight)
 */

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { color } from '@/constants/tokens'
import { INP } from './_inputTokens'

export interface ForgeToggleProps {
  value?: boolean
  onChange?: (value: boolean) => void
  /** Label text rendered to the left of the toggle */
  label?: string
  disabled?: boolean
  loading?: boolean
  accessibilityLabel?: string
}

export function ForgeToggle({
  value = false,
  onChange,
  label,
  disabled = false,
  loading = false,
  accessibilityLabel,
}: ForgeToggleProps) {
  const [thumbX] = useState(() => new Animated.Value(value ? INP.THUMB_ON_X : 0))

  useEffect(() => {
    Animated.timing(thumbX, {
      toValue: value ? INP.THUMB_ON_X : 0,
      duration: 150,
      useNativeDriver: true,
    }).start()
  }, [value, thumbX])

  const handlePress = () => {
    if (disabled || loading) return
    onChange?.(!value)
  }

  const trackBg: string = loading || value
    ? color.accent.primary
    : color.background.surface

  const trackBorder: string = loading || value
    ? color.accent.primary
    : color.border.subtle

  const thumbBg: string = loading
    ? color.text.inverse
    : value
    ? color.accent.highlight
    : color.text.secondary

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel ?? label ?? 'Toggle'}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled, busy: loading }}
      style={[
        styles.row,
        disabled && styles.disabled,
      ]}
    >
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View
        style={[
          styles.track,
          { backgroundColor: trackBg, borderColor: trackBorder },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: thumbBg, transform: [{ translateX: thumbX }] },
          ]}
        >
          {loading && (
            <ActivityIndicator
              size={12}
              color={color.accent.primary}
            />
          )}
        </Animated.View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 36,
  },
  label: {
    flex: 1,
    fontSize: INP.INPUT_SIZE,
    fontWeight: INP.INPUT_WEIGHT,
    color: color.text.primary,
  },
  track: {
    width: INP.TOGGLE_W,
    height: INP.TOGGLE_H,
    borderRadius: 99,
    borderWidth: 1,
    padding: 2,
    flexShrink: 0,
  },
  thumb: {
    width: INP.THUMB_SIZE,
    height: INP.THUMB_SIZE,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.50,
    shadowRadius: 3,
    elevation: 2,
  },
  disabled: {
    opacity: 0.40,
  },
})
