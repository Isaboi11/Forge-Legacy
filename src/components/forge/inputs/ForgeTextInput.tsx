/**
 * CLA-C14 — ForgeTextInput
 * Tier: 2 (Composite)
 * Spec: Forge Legacy Input Library.dc.html §01 — Text Fields
 *
 * Single-line text entry. Base field all other text inputs inherit the anatomy of.
 * H 52 · R 8 · PX 16
 */

import React, { useState } from 'react'
import {
  ActivityIndicator,
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

export interface ForgeTextInputProps extends InputBaseProps {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoCorrect?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url' | 'decimal-pad'
  returnKeyType?: 'done' | 'next' | 'search' | 'go' | 'send'
  maxLength?: number
  onSubmitEditing?: () => void
}

export function ForgeTextInput({
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
  size = 'comfortable',
  iconLeft,
  iconRight,
  autoCapitalize,
  autoCorrect,
  keyboardType,
  returnKeyType,
  maxLength,
  onSubmitEditing,
}: ForgeTextInputProps) {
  const [focused, setFocused] = useState(false)

  const borderColor   = getBorderColor(focused, error, success, disabled)
  const bgColor       = getBgColor(disabled)
  const glow          = getGlow(focused, error)
  const helperColor   = getHelperColor(error, success)
  const displayHelper = resolveHelper(helperText, errorText, successText, error, success)
  const fieldHeight   = size === 'compact' ? INP.HEIGHT_COMPACT : INP.HEIGHT

  const showError   = error && !loading
  const showSuccess = success && !loading
  const showLoading = loading
  const showRight   = !showError && !showSuccess && !showLoading && !!iconRight

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
        {iconLeft && (
          <Feather name={iconLeft as any} size={INP.ICON_SIZE} color={color.text.tertiary} />
        )}
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor={color.text.tertiary}
          onChangeText={onChangeText}
          onFocus={() => { setFocused(true); onFocus?.() }}
          onBlur={() => { setFocused(false); onBlur?.() }}
          editable={!disabled && !loading}
          style={styles.input}
          accessibilityLabel={accessibilityLabel ?? label}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          maxLength={maxLength}
          onSubmitEditing={onSubmitEditing}
        />
        {showLoading && <ActivityIndicator size="small" color={color.accent.primary} />}
        {showSuccess && <Feather name="check" size={INP.ICON_SIZE} color={color.accent.primary} />}
        {showError && <Feather name="alert-circle" size={INP.ICON_SIZE} color={color.danger} />}
        {showRight && <Feather name={iconRight as any} size={INP.ICON_SIZE} color={color.text.tertiary} />}
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
    gap: INP.ROW_GAP,
    borderRadius: INP.RADIUS,
    borderWidth: 1,
    paddingHorizontal: INP.PADDING_H,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: INP.INPUT_SIZE,
    fontWeight: INP.INPUT_WEIGHT,
    color: color.text.primary,
  },
  helper: {
    fontSize: INP.HELPER_SIZE,
    lineHeight: INP.HELPER_LH,
  },
  disabled: {
    opacity: 0.45,
  },
})
