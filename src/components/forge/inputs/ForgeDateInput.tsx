/**
 * CLA-C14 — ForgeDateInput
 * Tier: 2 (Composite)
 * Spec: Forge Legacy Input Library.dc.html §06 — Numeric / Date (DateInput)
 *
 * Calendar icon + formatted date display. Tap to open the native date picker.
 * Uses @react-native-community/datetimepicker.
 */

import React, { useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import { INP } from './_inputTokens'
import { getBorderColor, getBgColor, getGlow, getHelperColor, resolveHelper } from './_inputUtils'
import type { InputBaseProps } from './_types'

export interface ForgeDateInputProps
  extends Omit<InputBaseProps, 'value' | 'onChangeText' | 'iconLeft' | 'iconRight'> {
  value?: Date
  onValueChange?: (date: Date) => void
  minimumDate?: Date
  maximumDate?: Date
  /** Custom date format function; defaults to locale short date */
  displayFormat?: (date: Date) => string
}

const DEFAULT_FORMAT = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function ForgeDateInput({
  label,
  placeholder = 'Select date',
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
  minimumDate,
  maximumDate,
  displayFormat = DEFAULT_FORMAT,
}: ForgeDateInputProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const focused     = pickerOpen
  const borderColor = getBorderColor(focused, error, success, disabled)
  const bgColor     = getBgColor(disabled)
  const glow        = getGlow(focused, error)
  const helperColor = getHelperColor(error, success)
  const displayHelper = resolveHelper(helperText, errorText, successText, error, success)
  const fieldHeight = size === 'compact' ? INP.HEIGHT_COMPACT : INP.HEIGHT

  const showError   = error && !loading
  const showSuccess = success && !loading
  const showLoading = loading

  const handlePress = () => {
    if (disabled || loading) return
    setPickerOpen(true)
    onFocus?.()
  }

  const handleChange = (_: any, selectedDate?: Date) => {
    // On Android: picker closes after selection; on iOS: user must confirm
    if (Platform.OS === 'android') {
      setPickerOpen(false)
      onBlur?.()
    }
    if (selectedDate) {
      onValueChange?.(selectedDate)
    } else {
      // User pressed Cancel on Android
      setPickerOpen(false)
      onBlur?.()
    }
  }

  const handleIOSDismiss = () => {
    setPickerOpen(false)
    onBlur?.()
  }

  return (
    <View style={[styles.root, fullWidth && styles.fullWidth]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      )}
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        accessibilityLabel={accessibilityLabel ?? label ?? 'Date'}
        accessibilityRole="button"
      >
        <View
          style={[
            styles.row,
            { height: fieldHeight, borderColor, backgroundColor: bgColor },
            glow,
            disabled && styles.disabled,
          ]}
        >
          <Feather name="calendar" size={INP.ICON_SIZE} color={color.text.tertiary} />

          <Text
            style={[styles.displayText, !value && styles.placeholder]}
            numberOfLines={1}
          >
            {value ? displayFormat(value) : placeholder}
          </Text>

          {showLoading && <ActivityIndicator size="small" color={color.accent.primary} />}
          {showSuccess && <Feather name="check" size={INP.ICON_SIZE} color={color.accent.primary} />}
          {showError && <Feather name="alert-circle" size={INP.ICON_SIZE} color={color.danger} />}
        </View>
      </Pressable>
      {displayHelper && (
        <Text style={[styles.helper, { color: helperColor }]}>{displayHelper}</Text>
      )}

      {pickerOpen && Platform.OS === 'ios' && (
        <View style={styles.iosPicker}>
          <View style={styles.iosPickerHeader}>
            <Pressable onPress={handleIOSDismiss} hitSlop={8}>
              <Text style={styles.iosDone}>Done</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={value ?? new Date()}
            mode="date"
            display="spinner"
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            themeVariant="dark"
          />
        </View>
      )}

      {pickerOpen && Platform.OS === 'android' && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
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
  displayText: {
    flex: 1,
    fontSize: INP.INPUT_SIZE,
    fontWeight: INP.INPUT_WEIGHT,
    color: color.text.primary,
  },
  placeholder: {
    color: color.text.tertiary,
  },
  helper: {
    fontSize: INP.HELPER_SIZE,
    lineHeight: INP.HELPER_LH,
  },
  disabled: {
    opacity: 0.45,
  },
  iosPicker: {
    borderRadius: INP.RADIUS,
    borderWidth: 1,
    borderColor: color.border.subtle,
    backgroundColor: color.background.elevated,
    marginTop: 4,
    overflow: 'hidden',
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.border.subtle,
  },
  iosDone: {
    fontSize: 15,
    fontWeight: '600',
    color: color.accent.primary,
  },
})
