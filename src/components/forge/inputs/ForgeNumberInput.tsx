/**
 * CLA-C14 — ForgeNumberInput
 * Tier: 2 (Composite)
 * Spec: Forge Legacy Input Library.dc.html §06 — Numeric / Date (NumberInput)
 *
 * Numeric field with inline minus/plus stepper controls on the right.
 * Decrement button: surface bg with subtle border.
 * Increment button: accent-primary bg, inverse text.
 */

import React, { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import { INP } from './_inputTokens'
import { getBorderColor, getBgColor, getGlow, getHelperColor, resolveHelper } from './_inputUtils'
import type { InputBaseProps } from './_types'

export interface ForgeNumberInputProps
  extends Omit<InputBaseProps, 'value' | 'onChangeText' | 'iconLeft' | 'iconRight'> {
  value?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Unit label displayed after the value (e.g. "lb", "kg", "reps") */
  unit?: string
}

export function ForgeNumberInput({
  label,
  placeholder = '0',
  helperText,
  errorText,
  successText,
  error = false,
  success = false,
  disabled = false,
  loading = false,
  required = false,
  onFocus,
  onBlur,
  accessibilityLabel,
  fullWidth = false,
  size = 'comfortable',
  value,
  onValueChange,
  min,
  max,
  step = 1,
  unit,
}: ForgeNumberInputProps) {
  const [focused, setFocused] = useState(false)

  const borderColor   = getBorderColor(focused, error, success, disabled)
  const bgColor       = getBgColor(disabled)
  const glow          = getGlow(focused, error)
  const helperColor   = getHelperColor(error, success)
  const displayHelper = resolveHelper(helperText, errorText, successText, error, success)
  const fieldHeight   = size === 'compact' ? INP.HEIGHT_COMPACT : INP.HEIGHT

  const showError   = error && !loading
  const showSuccess = success && !loading

  const handleDecrement = () => {
    if (disabled || loading) return
    const next = (value ?? 0) - step
    if (min !== undefined && next < min) return
    onValueChange?.(next)
  }

  const handleIncrement = () => {
    if (disabled || loading) return
    const next = (value ?? 0) + step
    if (max !== undefined && next > max) return
    onValueChange?.(next)
  }

  const handleTextChange = (text: string) => {
    const n = parseFloat(text.replace(/[^0-9.-]/g, ''))
    if (!isNaN(n)) onValueChange?.(n)
    else if (text === '' || text === '-') onValueChange?.(0)
  }

  const displayValue = value !== undefined ? String(value) : ''

  return (
    <View style={[styles.root, fullWidth && styles.fullWidth]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      )}
      <View
        style={[
          styles.row,
          { height: fieldHeight, borderColor, backgroundColor: bgColor },
          glow,
          disabled && styles.disabled,
        ]}
      >
        <TextInput
          value={displayValue}
          placeholder={placeholder}
          placeholderTextColor={color.text.tertiary}
          onChangeText={handleTextChange}
          onFocus={() => { setFocused(true); onFocus?.() }}
          onBlur={() => { setFocused(false); onBlur?.() }}
          editable={!disabled && !loading}
          style={[styles.input, styles.tabularNums]}
          accessibilityLabel={accessibilityLabel ?? label}
          keyboardType="numeric"
        />
        {unit && (
          <Text style={styles.unit}>{unit}</Text>
        )}

        {loading && <ActivityIndicator size="small" color={color.accent.primary} />}
        {showSuccess && <Feather name="check" size={INP.ICON_SIZE} color={color.accent.primary} />}
        {showError && <Feather name="alert-circle" size={INP.ICON_SIZE} color={color.danger} />}

        {!loading && !showSuccess && !showError && (
          <View style={styles.steppers}>
            <Pressable
              onPress={handleDecrement}
              disabled={disabled || (min !== undefined && (value ?? 0) <= min)}
              style={[styles.stepperBtn, styles.stepperDec]}
              accessibilityLabel="Decrease"
            >
              <Feather name="minus" size={14} color={color.text.secondary} />
            </Pressable>
            <Pressable
              onPress={handleIncrement}
              disabled={disabled || (max !== undefined && (value ?? 0) >= max)}
              style={[styles.stepperBtn, styles.stepperInc]}
              accessibilityLabel="Increase"
            >
              <Feather name="plus" size={14} color={color.text.inverse} />
            </Pressable>
          </View>
        )}
      </View>
      {displayHelper && (
        <Text style={[styles.helper, { color: helperColor }]}>{displayHelper}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    gap: 6,
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  label: {
    fontSize: INP.LABEL_SIZE,
    fontWeight: INP.LABEL_WEIGHT,
    color: color.text.secondary,
    letterSpacing: 0.1,
  },
  required: {
    color: color.danger,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: INP.RADIUS,
    borderWidth: 1,
    paddingLeft: INP.PADDING_H,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: INP.INPUT_SIZE,
    fontWeight: INP.INPUT_WEIGHT,
    color: color.text.primary,
  },
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 13,
    color: color.text.tertiary,
    flexShrink: 0,
  },
  steppers: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
  },
  stepperBtn: {
    width: INP.STEPPER_BTN_SIZE,
    height: INP.STEPPER_BTN_SIZE,
    borderRadius: INP.STEPPER_BTN_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.border.subtle,
  },
  stepperDec: {
    backgroundColor: color.background.surface,
  },
  stepperInc: {
    backgroundColor: color.accent.primary,
    borderColor: color.accent.primary,
  },
  helper: {
    fontSize: INP.HELPER_SIZE,
    lineHeight: INP.HELPER_LH,
  },
  disabled: {
    opacity: 0.45,
  },
})
