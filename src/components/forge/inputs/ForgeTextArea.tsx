/**
 * CLA-C15 — ForgeTextArea
 * Tier: 2 (Composite)
 * Spec: Forge Legacy Input Library.dc.html §04 — Text Area
 *
 * Multi-line entry for notes. Helper row includes a live character counter.
 * No fixed height — expands with content (minHeight based on minRows).
 */

import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { color } from '@/constants/tokens'
import { INP } from './_inputTokens'
import { getBorderColor, getBgColor, getGlow, getHelperColor, resolveHelper } from './_inputUtils'
import type { InputBaseProps } from './_types'

export interface ForgeTextAreaProps
  extends Omit<InputBaseProps, 'iconLeft' | 'iconRight' | 'size'> {
  /** Minimum visible rows (default 3) */
  minRows?: number
  /** Maximum character count displayed in counter; 0 = no counter */
  maxLength?: number
  autoCorrect?: boolean
}

const ROW_HEIGHT = 22  // matches line-height from design (22px)
const MIN_ROWS   = 3

export function ForgeTextArea({
  label,
  value,
  placeholder,
  helperText,
  errorText,
  successText,
  error = false,
  success = false,
  disabled = false,
  loading = false,
  required = false,
  onChangeText,
  onFocus,
  onBlur,
  accessibilityLabel,
  fullWidth = false,
  minRows = MIN_ROWS,
  maxLength = 280,
  autoCorrect,
}: ForgeTextAreaProps) {
  const [focused, setFocused] = useState(false)

  const borderColor   = getBorderColor(focused, error, success, disabled)
  const bgColor       = getBgColor(disabled)
  const glow          = getGlow(focused, error)
  const helperColor   = getHelperColor(error, success)
  const displayHelper = resolveHelper(helperText, errorText, successText, error, success)

  const charCount  = value ? value.length : 0
  const showCount  = maxLength > 0
  const minHeight  = minRows * ROW_HEIGHT

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
          styles.container,
          { borderColor, backgroundColor: bgColor },
          glow,
          disabled && styles.disabled,
        ]}
      >
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor={color.text.tertiary}
          onChangeText={onChangeText}
          onFocus={() => { setFocused(true); onFocus?.() }}
          onBlur={() => { setFocused(false); onBlur?.() }}
          editable={!disabled && !loading}
          multiline
          style={[styles.input, { minHeight }]}
          accessibilityLabel={accessibilityLabel ?? label}
          maxLength={maxLength > 0 ? maxLength : undefined}
          autoCorrect={autoCorrect}
          scrollEnabled={false}
          textAlignVertical="top"
        />
      </View>
      {(displayHelper || showCount) && (
        <View style={styles.helperRow}>
          {displayHelper ? (
            <Text style={[styles.helper, { color: helperColor }]}>{displayHelper}</Text>
          ) : (
            <View />
          )}
          {showCount && (
            <Text style={styles.counter}>
              {charCount} / {maxLength}
            </Text>
          )}
        </View>
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
  container: {
    borderRadius: INP.RADIUS,
    borderWidth: 1,
    paddingHorizontal: INP.PADDING_H,
    paddingVertical: 12,  // matches space.md
  },
  input: {
    fontSize: INP.INPUT_SIZE,
    fontWeight: INP.INPUT_WEIGHT,
    color: color.text.primary,
    lineHeight: ROW_HEIGHT,
    width: '100%',
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  helper: {
    fontSize: INP.HELPER_SIZE,
    lineHeight: INP.HELPER_LH,
    flex: 1,
  },
  counter: {
    fontSize: INP.LABEL_SIZE,
    color: color.text.tertiary,
    flexShrink: 0,
  },
  disabled: {
    opacity: 0.45,
  },
})
