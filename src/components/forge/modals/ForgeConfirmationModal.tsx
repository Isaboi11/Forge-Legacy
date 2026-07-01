/**
 * ForgeConfirmationModal
 * Spec: Forge Modal Library.dc.html Â§03
 *
 * One icon, one line of consequence, two choices.
 * Tone colors ONLY the icon circle and the primary CTA â€” never the surface.
 *
 * Tones: success (green) | warning (bronze) | danger (crimson)
 */

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import { MODAL } from './_modalTokens'
import { ForgeModal } from './ForgeModal'
import type { ConfirmationTone, ForgeConfirmationModalProps } from './types'

export function ForgeConfirmationModal({
  visible,
  tone = 'danger',
  iconName,
  title,
  description,
  primaryAction,
  secondaryAction,
  dismissible = true,
  onClose,
  accessibilityLabel = 'Confirmation',
}: ForgeConfirmationModalProps) {
  const { iconColor, iconBg, iconBorder, primaryBg } = _toneStyles(tone)

  const footer = (
    <View style={styles.footer}>
      <Pressable
        onPress={primaryAction.onPress}
        disabled={primaryAction.disabled}
        accessibilityLabel={primaryAction.accessibilityLabel ?? primaryAction.label}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!primaryAction.disabled }}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: primaryBg },
          pressed && styles.primaryPressed,
          primaryAction.disabled && styles.btnDisabled,
        ]}
      >
        <Text style={styles.primaryLabel}>{primaryAction.label}</Text>
      </Pressable>
      {secondaryAction ? (
        <Pressable
          onPress={secondaryAction.onPress}
          disabled={secondaryAction.disabled}
          accessibilityLabel={secondaryAction.accessibilityLabel ?? secondaryAction.label}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!secondaryAction.disabled }}
          style={({ pressed }) => [
            styles.btn,
            styles.btnSecondary,
            pressed && styles.secondaryPressed,
            secondaryAction.disabled && styles.btnDisabled,
          ]}
        >
          <Text style={styles.secondaryLabel}>{secondaryAction.label}</Text>
        </Pressable>
      ) : null}
    </View>
  )

  return (
    <ForgeModal
      visible={visible}
      onClose={onClose}
      dismissible={dismissible}
      variant="small"
      accessibilityLabel={accessibilityLabel}
      footer={footer}
    >
      <View style={styles.content}>
        {/* Tone icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: iconBg, borderColor: iconBorder }]}>
          {iconName ? (
            <Feather name={iconName as 'alert-triangle'} size={24} color={iconColor} />
          ) : (
            <Feather name={_defaultIcon(tone)} size={24} color={iconColor} />
          )}
        </View>

        {/* Title + description */}
        <View style={styles.textGroup}>
          <Text style={styles.title}>{title}</Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}
        </View>
      </View>
    </ForgeModal>
  )
}

function _defaultIcon(tone: ConfirmationTone): 'check' | 'alert-triangle' | 'alert-octagon' {
  if (tone === 'success') return 'check'
  if (tone === 'warning') return 'alert-triangle'
  return 'alert-octagon'
}

function _toneStyles(tone: ConfirmationTone) {
  switch (tone) {
    case 'success':
      return {
        iconColor:  color.success,
        iconBg:     MODAL.SUCCESS_GLOW,
        iconBorder: color.success,
        primaryBg:  color.success,
      }
    case 'warning':
      return {
        iconColor:  color.accent.primary,
        iconBg:     color.accent.glow,
        iconBorder: color.accent.muted,
        primaryBg:  color.accent.primary,
      }
    case 'danger':
    default:
      return {
        iconColor:  color.danger,
        iconBg:     MODAL.DANGER_GLOW,
        iconBorder: color.danger,
        primaryBg:  color.danger,
      }
  }
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: 14,
    paddingTop: 4,
  },
  iconCircle: {
    width: MODAL.ICON_BOX_CONFIRM,
    height: MODAL.ICON_BOX_CONFIRM,
    borderRadius: MODAL.RADIUS_PILL,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: color.text.primary,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: color.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  footer: {
    gap: 8,
    marginTop: 2,
  },
  btn: {
    height: MODAL.BTN_H_SM,
    borderRadius: MODAL.RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: color.border.subtle,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  primaryPressed: {
    opacity: 0.85,
  },
  secondaryPressed: {
    backgroundColor: color.innerHighlight,
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.inverse,
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.primary,
  },
})
