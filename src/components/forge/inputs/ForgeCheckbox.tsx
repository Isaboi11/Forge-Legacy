/**
 * CLA-C14 — ForgeCheckbox
 * Tier: 2 (Composite)
 * Spec: Forge Legacy Input Library.dc.html §07 — Choice Controls · Checkbox
 *
 * 22×22 · R 4 · 1.5px border
 * States: unchecked · checked · indeterminate · error · disabled
 */

import React from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import { INP } from './_inputTokens'

export interface ForgeCheckboxProps {
  checked?: boolean
  /** Shows a horizontal dash (partially selected state) */
  indeterminate?: boolean
  /** Label text rendered to the right of the checkbox */
  label?: string
  onChange?: (checked: boolean) => void
  disabled?: boolean
  /** Activates error border (unchecked, required) */
  error?: boolean
  accessibilityLabel?: string
}

export function ForgeCheckbox({
  checked = false,
  indeterminate = false,
  label,
  onChange,
  disabled = false,
  error = false,
  accessibilityLabel,
}: ForgeCheckboxProps) {
  const handlePress = () => {
    if (disabled) return
    onChange?.(!checked)
  }

  const isFilled = checked || indeterminate

  const boxBg: string = isFilled
    ? color.accent.primary
    : color.background.elevated

  const boxBorder: string = isFilled
    ? color.accent.primary
    : error
    ? color.danger
    : color.border.subtle

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label ?? 'Checkbox'}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      style={[styles.row, disabled && styles.disabled]}
    >
      <View
        style={[
          styles.box,
          { backgroundColor: boxBg, borderColor: boxBorder },
        ]}
      >
        {checked && !indeterminate && (
          <Feather name="check" size={14} color={color.text.inverse} strokeWidth={2.6} />
        )}
        {indeterminate && (
          <Feather name="minus" size={14} color={color.text.inverse} strokeWidth={2.6} />
        )}
      </View>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,   // space.md
    minHeight: 36,
  },
  box: {
    width: INP.CHECKBOX_SIZE,
    height: INP.CHECKBOX_SIZE,
    borderRadius: INP.CHECKBOX_RADIUS,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: {
    fontSize: INP.INPUT_SIZE,
    fontWeight: INP.INPUT_WEIGHT,
    color: color.text.primary,
    flex: 1,
  },
  disabled: {
    opacity: 0.45,
  },
})
