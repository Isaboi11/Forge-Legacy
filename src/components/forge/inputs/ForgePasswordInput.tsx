/**
 * CLA-C14 — ForgePasswordInput
 * Tier: 2 (Composite)
 * Spec: Forge Legacy Input Library.dc.html §03 — Password
 *
 * Masked entry with a reveal toggle. Lock icon always left.
 * Eye shows in default/focused. Error/success icons replace eye in those states.
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

export type ForgePasswordInputProps =
  Omit<InputBaseProps, 'iconLeft' | 'iconRight' | 'keyboardType'>

export function ForgePasswordInput({
  label,
  value,
  placeholder = 'Enter password',
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
}: ForgePasswordInputProps) {
  const [focused, setFocused]   = useState(false)
  const [revealed, setRevealed] = useState(false)

  const borderColor   = getBorderColor(focused, error, success, disabled)
  const bgColor       = getBgColor(disabled)
  const glow          = getGlow(focused, error)
  const helperColor   = getHelperColor(error, success)
  const displayHelper = resolveHelper(helperText, errorText, successText, error, success)
  const fieldHeight   = size === 'compact' ? INP.HEIGHT_COMPACT : INP.HEIGHT

  const showError   = error && !loading
  const showSuccess = success && !loading
  const showLoading = loading
  // Eye replaces the trailing slot unless error/success/loading
  const showEye     = !showError && !showSuccess && !showLoading

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
        {/* Lock icon — always present */}
        <Feather name="lock" size={INP.ICON_SIZE} color={color.text.tertiary} />

        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor={color.text.tertiary}
          secureTextEntry={!revealed}
          onChangeText={onChangeText}
          onFocus={() => { setFocused(true); onFocus?.() }}
          onBlur={() => { setFocused(false); onBlur?.() }}
          editable={!disabled && !loading}
          style={[styles.input, styles.passwordInput]}
          accessibilityLabel={accessibilityLabel ?? label ?? 'Password'}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {showLoading && <ActivityIndicator size="small" color={color.accent.primary} />}
        {showSuccess && <Feather name="check" size={INP.ICON_SIZE} color={color.accent.primary} />}
        {showError && <Feather name="alert-circle" size={INP.ICON_SIZE} color={color.danger} />}
        {showEye && (
          <Pressable
            onPress={() => setRevealed(r => !r)}
            disabled={disabled}
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={8}
          >
            <Feather
              name={revealed ? 'eye-off' : 'eye'}
              size={INP.ICON_SIZE_EYE}
              color={color.text.secondary}
            />
          </Pressable>
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
  passwordInput: {
    letterSpacing: 1,
  },
  helper: {
    fontSize: INP.HELPER_SIZE,
    lineHeight: INP.HELPER_LH,
  },
  disabled: {
    opacity: 0.45,
  },
})
