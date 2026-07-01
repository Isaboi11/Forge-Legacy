/**
 * ForgeSuccessModal
 * Spec: Forge Modal Library.dc.html Â§09
 *
 * The ceremony modal â€” the one place bronze runs the full surface.
 * Reserved for something the athlete EARNED: finished session, honor, completed program.
 * It reveals slowly and holds. Never reuse for system confirmations.
 *
 * Visual: elevation.modal (#1F1F28) bg, accent.muted border,
 *         88Ã—88 bronze icon circle, overline + title + description.
 */

import React from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { color, elevation } from '@/constants/tokens'
import { MODAL } from './_modalTokens'
import type { ForgeSuccessModalProps } from './types'

export function ForgeSuccessModal({
  visible,
  onClose,
  iconName = 'award',
  overline = 'Earned',
  title,
  description,
  primaryAction,
  secondaryAction,
  accessibilityLabel = 'Achievement unlocked',
}: ForgeSuccessModalProps) {
  const insets = useSafeAreaInsets()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <View
        style={[styles.backdrop, { paddingBottom: insets.bottom + 20 }]}
        accessibilityLabel={accessibilityLabel}
        
        accessibilityViewIsModal
      >
        {/* Ceremony container â€” premium border, deeper bg */}
        <View style={styles.container}>
          {/* Hero icon */}
          <View style={styles.heroCircle}>
            <Feather name={iconName as 'award'} size={44} color={color.text.inverse} />
          </View>

          {/* Text group */}
          <View style={styles.textGroup}>
            {overline ? (
              <Text style={styles.overline}>{overline.toUpperCase()}</Text>
            ) : null}
            {title ? (
              <Text style={styles.title}>{title}</Text>
            ) : null}
            {description ? (
              <Text style={styles.description}>{description}</Text>
            ) : null}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {primaryAction ? (
              <Pressable
                onPress={primaryAction.onPress}
                disabled={primaryAction.disabled}
                accessibilityLabel={primaryAction.accessibilityLabel ?? primaryAction.label}
                accessibilityRole="button"
                accessibilityState={{ disabled: !!primaryAction.disabled }}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnPrimary,
                  pressed && styles.btnPrimaryPressed,
                  primaryAction.disabled && styles.btnDisabled,
                ]}
              >
                <Text style={styles.btnPrimaryLabel}>{primaryAction.label}</Text>
              </Pressable>
            ) : null}
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
                  pressed && styles.btnSecondaryPressed,
                  secondaryAction.disabled && styles.btnDisabled,
                ]}
              >
                <Text style={styles.btnSecondaryLabel}>{secondaryAction.label}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.background.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: elevation.modal,
    borderRadius: MODAL.RADIUS,
    borderWidth: 1,
    borderColor: color.accent.muted,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
    elevation: 12,
    padding: 32,
    gap: 18,
    alignItems: 'center',
  },
  heroCircle: {
    width: MODAL.ICON_BOX_SUCCESS,
    height: MODAL.ICON_BOX_SUCCESS,
    borderRadius: MODAL.RADIUS_PILL,
    backgroundColor: color.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Glow effect via shadow
    shadowColor: color.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 6,
  },
  textGroup: {
    alignItems: 'center',
    gap: 6,
  },
  overline: {
    fontSize: 11,
    fontWeight: '500',
    color: color.accent.primary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: color.text.primary,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: color.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: 8,
  },
  btn: {
    height: MODAL.BTN_H,
    borderRadius: MODAL.RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnPrimary: {
    backgroundColor: color.accent.primary,
  },
  btnPrimaryPressed: {
    backgroundColor: color.accent.highlight,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: color.accent.muted,
  },
  btnSecondaryPressed: {
    backgroundColor: color.accent.glow,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnPrimaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.inverse,
  },
  btnSecondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.accent.primary,
  },
})
