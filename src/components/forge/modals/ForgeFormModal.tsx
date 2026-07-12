/**
 * ForgeFormModal
 * Spec: Forge Modal Library.dc.html Â§12
 *
 * A modal that hosts a short input task (Rename, Create, Invite, Edit).
 * Lifts above the keyboard. Validation resolves inline, never in an alert.
 * Children are the form content; consumer controls the fields.
 */

import React from 'react'
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import { MODAL } from './_modalTokens'
import { useOverlayTransition } from './_useOverlayTransition'
import type { ForgeFormModalProps } from './types'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function ForgeFormModal({
  visible,
  onClose,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  errorMessage,
  loading = false,
  accessibilityLabel = 'Form',
}: ForgeFormModalProps) {
  const insets = useSafeAreaInsets()
  const isDisabled = loading

  // Spec §14: backdrop 150ms ease-out; entrance 220ms spring·soft; exit 180ms ease-in
  const { backdrop, panel, rendered } = useOverlayTransition(visible, { spring: true })

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.backdropFill, { opacity: backdrop }]}
        />
        <Pressable
          style={[styles.backdrop, { paddingBottom: insets.bottom + 20 }]}
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          {/* Container */}
          <AnimatedPressable
            onPress={() => {}}
            style={[
              styles.container,
              {
                opacity: panel,
                transform: [
                  { translateY: panel.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                  { scale: panel.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
                ],
              },
            ]}
            accessibilityLabel={accessibilityLabel}

            accessibilityViewIsModal
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerText}>
                {title ? (
                  <Text style={styles.title}>{title}</Text>
                ) : null}
                {description ? (
                  <Text style={styles.description}>{description}</Text>
                ) : null}
              </View>
              {onClose ? (
                <Pressable
                  onPress={onClose}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                  hitSlop={(MODAL.TAP_MIN - MODAL.CLOSE_BTN) / 2}
                  style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
                >
                  <Feather name="x" size={14} color={color.text.secondary} />
                </Pressable>
              ) : null}
            </View>

            {/* Form content */}
            <ScrollView
              style={styles.formArea}
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}

              {/* Inline validation error */}
              {errorMessage ? (
                <View style={styles.errorRow}>
                  <Feather name="alert-circle" size={14} color={color.danger} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}
            </ScrollView>

            {/* Footer buttons */}
            {(primaryAction || secondaryAction) ? (
              <View style={styles.footer}>
                {secondaryAction ? (
                  <Pressable
                    onPress={secondaryAction.onPress}
                    disabled={isDisabled || secondaryAction.disabled}
                    accessibilityLabel={secondaryAction.accessibilityLabel ?? secondaryAction.label}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !!(isDisabled || secondaryAction.disabled) }}
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnSecondary,
                      pressed && styles.btnSecondaryPressed,
                      (isDisabled || secondaryAction.disabled) && styles.btnDisabled,
                    ]}
                  >
                    <Text style={styles.btnSecondaryLabel}>{secondaryAction.label}</Text>
                  </Pressable>
                ) : null}
                {primaryAction ? (
                  <Pressable
                    onPress={primaryAction.onPress}
                    disabled={isDisabled || primaryAction.disabled}
                    accessibilityLabel={primaryAction.accessibilityLabel ?? primaryAction.label}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !!(isDisabled || primaryAction.disabled) }}
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnPrimary,
                      pressed && styles.btnPrimaryPressed,
                      (isDisabled || primaryAction.disabled) && styles.btnDisabled,
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={color.text.inverse} />
                    ) : (
                      <Text style={styles.btnPrimaryLabel}>{primaryAction.label}</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </AnimatedPressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdropFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.background.overlay,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: color.background.elevated,
    borderRadius: MODAL.RADIUS,
    borderWidth: 1,
    borderColor: color.border.subtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: MODAL.PAD_MODAL,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: color.border.subtle,
  },
  headerText: {
    flex: 1,
    gap: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: color.text.primary,
  },
  description: {
    fontSize: 14,
    color: color.text.secondary,
    lineHeight: 19,
  },
  closeBtn: {
    width: MODAL.CLOSE_BTN,
    height: MODAL.CLOSE_BTN,
    borderRadius: MODAL.RADIUS_PILL,
    backgroundColor: color.background.surface,
    borderWidth: 1,
    borderColor: color.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  closeBtnPressed: {
    backgroundColor: color.innerHighlight,
  },
  formArea: {
    maxHeight: 380,
  },
  formContent: {
    padding: MODAL.PAD_MODAL,
    gap: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: color.danger,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    padding: MODAL.PAD_MODAL,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: color.border.subtle,
  },
  btn: {
    flex: 1,
    height: MODAL.BTN_H,
    borderRadius: MODAL.RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: color.border.subtle,
  },
  btnSecondaryPressed: {
    backgroundColor: color.innerHighlight,
  },
  btnPrimary: {
    backgroundColor: color.accent.primary,
  },
  btnPrimaryPressed: {
    backgroundColor: color.accent.highlight,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnSecondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.primary,
  },
  btnPrimaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.inverse,
  },
})
