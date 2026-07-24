/**
 * CLA-C14 — InputField
 * Tier: 2 (Composite)
 * Spec: components/Inputs/InputField.jsx (Claude Design, Visual Foundation 5368b220)
 *
 * Single-line text entry for names and short fields (chapter, goal, program) — all with
 * explicit character caps. Recessed forged well, bronze focus edge, optional label /
 * helper / counter. Anti-shame: an over-limit or error state is a quiet muted-red edge,
 * never an alarming fill.
 */

import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation'

export interface InputFieldProps extends Omit<TextInputProps, 'onChange' | 'onChangeText' | 'style'> {
  label?: string
  value: string
  onChange: (v: string) => void
  helper?: string
  error?: string
  maxLength?: number
  showCount?: boolean
  leadingIcon?: React.ReactNode
  disabled?: boolean
}

const WELL_INSET = 'inset 0 2px 6px rgba(0,0,0,0.45)'

export function InputField({
  label,
  value,
  onChange,
  helper,
  error,
  maxLength,
  showCount = false,
  leadingIcon,
  disabled = false,
  ...rest
}: InputFieldProps) {
  const [focus, setFocus] = useState(false)
  const len = value.length
  const edge = error ? flColor.redMuted : focus ? flColor.bronze400 : flColor.charcoal500
  const showFooter = helper != null || error != null || (showCount && maxLength != null)

  return (
    <View>
      {label != null ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.well,
          { borderColor: edge, boxShadow: focus ? `${WELL_INSET}, ${flShadow.glowSubtle}` : WELL_INSET },
          disabled && styles.wellDisabled,
        ]}
      >
        {leadingIcon ? <View style={styles.leading}>{leadingIcon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChange}
          maxLength={maxLength}
          editable={!disabled}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholderTextColor={flColor.gray600}
          accessibilityLabel={label}
          style={styles.input}
          {...rest}
        />
      </View>

      {showFooter ? (
        <View style={styles.footer}>
          <Text style={[styles.helper, error != null && styles.helperError]}>{error ?? helper ?? ''}</Text>
          {showCount && maxLength != null ? (
            <Text style={[styles.count, len >= maxLength && styles.countFull]}>
              {len}/{maxLength}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: flColor.bronze400,
    marginBottom: 9,
  },
  well: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1.5,
    borderRadius: flRadius.md,
    paddingHorizontal: 14,
  },
  wellDisabled: { opacity: 0.5 },
  leading: { flexShrink: 0 },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'transparent',
    color: flColor.cream100,
    fontFamily: flFont.sans,
    fontSize: 15,
    paddingVertical: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  helper: { flex: 1, fontSize: 12, lineHeight: 17, color: flColor.gray600 },
  helperError: { color: flColor.redMuted },
  count: { flexShrink: 0, fontSize: 11, color: flColor.gray600, fontVariant: ['tabular-nums'] },
  countFull: { color: flColor.redMuted },
})
