/**
 * CLA-C13 — ForgeSearchInput
 * Tier: 2 (Composite)
 * Spec: Forge Legacy Input Library.dc.html §02 — Search
 *
 * Leading magnifier (muted), inline clear affordance (X in circle),
 * and a loading state for async results.
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

export interface ForgeSearchInputProps
  extends Omit<InputBaseProps, 'iconLeft' | 'iconRight'> {
  /** Clears the field; consumer must also reset `value` */
  onClear?: () => void
  autoFocus?: boolean
}

export function ForgeSearchInput({
  label,
  value,
  placeholder = 'Search',
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
  onClear,
  accessibilityLabel,
  fullWidth = false,
  size = 'comfortable',
  autoFocus = false,
}: ForgeSearchInputProps) {
  const [focused, setFocused] = useState(false)

  const borderColor   = getBorderColor(focused, error, success, disabled)
  const bgColor       = getBgColor(disabled)
  const glow          = getGlow(focused, error)
  const helperColor   = getHelperColor(error, success)
  const displayHelper = resolveHelper(helperText, errorText, successText, error, success)
  const fieldHeight   = size === 'compact' ? INP.HEIGHT_COMPACT : INP.HEIGHT

  const hasValue  = !!value && value.length > 0
  const showClear = hasValue && !disabled && !loading

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
        {/* Magnifier — always left, muted opacity */}
        <View style={styles.searchIcon}>
          <Feather name="search" size={INP.ICON_SIZE} color={color.text.tertiary} />
        </View>

        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor={color.text.tertiary}
          onChangeText={onChangeText}
          onFocus={() => { setFocused(true); onFocus?.() }}
          onBlur={() => { setFocused(false); onBlur?.() }}
          editable={!disabled && !loading}
          style={styles.input}
          accessibilityLabel={accessibilityLabel ?? label ?? 'Search'}
          returnKeyType="search"
          autoFocus={autoFocus}
          clearButtonMode="never"
        />

        {loading && <ActivityIndicator size="small" color={color.accent.primary} />}
        {showClear && (
          <Pressable
            onPress={onClear}
            accessibilityLabel="Clear search"
            hitSlop={8}
            style={styles.clearBtn}
          >
            <Feather
              name="x"
              size={INP.ICON_SIZE_CLEAR}
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
  searchIcon: {
    opacity: 0.65,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: INP.INPUT_SIZE,
    fontWeight: INP.INPUT_WEIGHT,
    color: color.text.primary,
  },
  clearBtn: {
    width: INP.CLEAR_BTN_SIZE,
    height: INP.CLEAR_BTN_SIZE,
    borderRadius: 99,
    backgroundColor: color.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  helper: {
    fontSize: INP.HELPER_SIZE,
    lineHeight: INP.HELPER_LH,
  },
  disabled: {
    opacity: 0.45,
  },
})
