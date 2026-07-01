/**
 * CLA-C14 — ForgeRadioGroup
 * Tier: 2 (Composite)
 * Spec: Forge Legacy Input Library.dc.html §07 — Choice Controls · Radio
 *
 * 22×22 full-circle outer ring, 10×10 inner dot (bronze when selected).
 * Inner dot animates scale(0) → scale(1) on selection.
 */

import React from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { color } from '@/constants/tokens'
import { INP } from './_inputTokens'

export interface RadioOption {
  label: string
  value: string
  disabled?: boolean
}

export interface ForgeRadioGroupProps {
  options: RadioOption[]
  /** Currently selected value */
  value?: string
  onChange?: (value: string) => void
  /** Group label rendered above the options */
  label?: string
  /** Disables the entire group */
  disabled?: boolean
  /** Marks all unselected options with error border */
  error?: boolean
  helperText?: string
  errorText?: string
  accessibilityLabel?: string
}

export function ForgeRadioGroup({
  options,
  value,
  onChange,
  label,
  disabled = false,
  error = false,
  helperText,
  errorText,
  accessibilityLabel,
}: ForgeRadioGroupProps) {
  const displayHelper = error && errorText ? errorText : helperText
  const helperColor   = error ? color.danger : color.text.tertiary

  return (
    <View
      style={styles.root}
      accessibilityLabel={accessibilityLabel ?? label ?? 'Radio group'}
      accessibilityRole="radiogroup"
    >
      {label && <Text style={styles.groupLabel}>{label}</Text>}

      {options.map((opt) => {
        const isSelected = opt.value === value
        const isDisabled = disabled || !!opt.disabled

        const outerBorder: string = isSelected
          ? color.accent.primary
          : error
          ? color.danger
          : color.border.subtle

        const dotColor: string  = isSelected ? color.accent.primary : 'transparent'
        const dotScale  = isSelected ? 1 : 0

        return (
          <Pressable
            key={opt.value}
            onPress={() => { if (!isDisabled) onChange?.(opt.value) }}
            disabled={isDisabled}
            accessibilityLabel={opt.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected, disabled: isDisabled }}
            style={[styles.row, isDisabled && styles.disabled]}
          >
            {/* Outer ring */}
            <View style={[styles.ring, { borderColor: outerBorder }]}>
              {/* Inner dot */}
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: dotColor,
                    transform: [{ scale: dotScale }],
                  },
                ]}
              />
            </View>
            <Text style={styles.optionLabel}>{opt.label}</Text>
          </Pressable>
        )
      })}

      {displayHelper && (
        <Text style={[styles.helper, { color: helperColor }]}>{displayHelper}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    gap: 0,
  },
  groupLabel: {
    fontSize: INP.LABEL_SIZE,
    fontWeight: INP.LABEL_WEIGHT,
    color: color.text.secondary,
    letterSpacing: 0.1,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 36,
  },
  ring: {
    width: INP.CHECKBOX_SIZE,
    height: INP.CHECKBOX_SIZE,
    borderRadius: 99,
    borderWidth: 1.5,
    backgroundColor: color.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  optionLabel: {
    fontSize: INP.INPUT_SIZE,
    fontWeight: INP.INPUT_WEIGHT,
    color: color.text.primary,
    flex: 1,
  },
  helper: {
    fontSize: INP.HELPER_SIZE,
    lineHeight: INP.HELPER_LH,
    marginTop: 6,
  },
  disabled: {
    opacity: 0.45,
  },
})
