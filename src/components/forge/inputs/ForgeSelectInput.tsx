/**
 * CLA-C14 — ForgeSelectInput
 * Tier: 2 (Composite)
 * Spec: Forge Legacy Input Library.dc.html §05 — Select / Dropdown
 *
 * Styled trigger field with a bronze-marked selection modal.
 * Options menu slides up as a light Modal overlay.
 */

import React, { useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import { INP } from './_inputTokens'
import { getBorderColor, getBgColor, getGlow, getHelperColor, resolveHelper } from './_inputUtils'
import type { InputBaseProps } from './_types'

export interface SelectOption {
  label: string
  value: string
}

export interface ForgeSelectInputProps
  extends Omit<InputBaseProps, 'value' | 'onChangeText' | 'iconLeft' | 'iconRight'> {
  options: SelectOption[]
  /** Currently selected option value */
  selectedValue?: string
  /** Called when user picks an option */
  onValueChange?: (value: string) => void
}

export function ForgeSelectInput({
  label,
  placeholder = 'Choose one',
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
  options,
  selectedValue,
  onValueChange,
}: ForgeSelectInputProps) {
  const [open, setOpen] = useState(false)

  const isOpen  = open && !disabled && !loading
  const focused = isOpen

  const borderColor   = getBorderColor(focused, error, success, disabled)
  const bgColor       = getBgColor(disabled)
  const glow          = getGlow(focused, error)
  const helperColor   = getHelperColor(error, success)
  const displayHelper = resolveHelper(helperText, errorText, successText, error, success)
  const fieldHeight   = size === 'compact' ? INP.HEIGHT_COMPACT : INP.HEIGHT

  const selectedLabel = options.find(o => o.value === selectedValue)?.label
  const displayText   = selectedLabel ?? placeholder

  const showError   = error && !loading
  const showSuccess = success && !loading
  const showLoading = loading
  const showChevron = !showError && !showSuccess && !showLoading

  const handleOpen = () => {
    if (disabled || loading) return
    setOpen(true)
    onFocus?.()
  }

  const handlePick = (value: string) => {
    setOpen(false)
    onValueChange?.(value)
    onBlur?.()
  }

  const handleClose = () => {
    setOpen(false)
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
        onPress={handleOpen}
        disabled={disabled || loading}
        accessibilityLabel={accessibilityLabel ?? label ?? 'Select'}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: isOpen }}
      >
        <View
          style={[
            styles.row,
            { height: fieldHeight, borderColor, backgroundColor: bgColor },
            glow,
            disabled && styles.disabled,
          ]}
        >
          <Text
            style={[
              styles.displayText,
              !selectedLabel && styles.placeholder,
            ]}
            numberOfLines={1}
          >
            {displayText}
          </Text>
          {showLoading && <ActivityIndicator size="small" color={color.accent.primary} />}
          {showSuccess && <Feather name="check" size={INP.ICON_SIZE} color={color.accent.primary} />}
          {showError && <Feather name="alert-circle" size={INP.ICON_SIZE} color={color.danger} />}
          {showChevron && (
            <Feather
              name={isOpen ? 'chevron-up' : 'chevron-down'}
              size={INP.ICON_SIZE}
              color={color.text.secondary}
            />
          )}
        </View>
      </Pressable>
      {displayHelper && (
        <Text style={[styles.helper, { color: helperColor }]}>{displayHelper}</Text>
      )}

      {/* Options modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <View style={styles.menuWrapper}>
            <Pressable>
              {/* Inner pressable stops backdrop tap from propagating */}
              <View style={styles.menu}>
                <ScrollView
                  bounces={false}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {options.map((opt, idx) => {
                    const isSelected = opt.value === selectedValue
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => handlePick(opt.value)}
                        style={({ pressed }) => [
                          styles.option,
                          isSelected && styles.optionSelected,
                          pressed && styles.optionPressed,
                          idx === options.length - 1 && styles.optionLast,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {opt.label}
                        </Text>
                        {isSelected && (
                          <Feather
                            name="check"
                            size={16}
                            color={color.accent.primary}
                          />
                        )}
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
  backdrop: {
    flex: 1,
    backgroundColor: color.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuWrapper: {
    width: '100%',
    maxWidth: 360,
  },
  menu: {
    borderRadius: INP.RADIUS,
    backgroundColor: color.background.elevated,
    borderWidth: 1,
    borderColor: color.border.subtle,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
    elevation: 12,
    maxHeight: 280,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 12,
    gap: INP.ROW_GAP,
    borderRadius: 6,
    marginHorizontal: 4,
    marginTop: 4,
  },
  optionLast: {
    marginBottom: 4,
  },
  optionSelected: {
    backgroundColor: color.accent.glow,
  },
  optionPressed: {
    backgroundColor: color.background.surface,
  },
  optionLabel: {
    flex: 1,
    fontSize: INP.INPUT_SIZE,
    fontWeight: INP.INPUT_WEIGHT,
    color: color.text.primary,
  },
  optionLabelSelected: {
    color: color.accent.primary,
  },
})
