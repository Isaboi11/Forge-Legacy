/**
 * ForgeModal
 * Spec: Forge Modal Library.dc.html Â§02
 *
 * Base modal primitive. Every other modal in this library either composes
 * ForgeModal directly or mirrors its backdrop/container pattern.
 *
 * Slots (in render order): illustration/icon â†’ header â†’ body â†’ footer
 * Variants:  small (320dp max) | medium (360dp max) | large (400dp max) | fullScreen
 * States:    default | loading | disabled | error
 */

import React, { useCallback } from 'react'
import {
  ActivityIndicator,
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
import { color, size } from '@/constants/tokens'
import { MODAL } from './_modalTokens'
import type { ForgeModalProps, ModalVariant } from './types'

export function ForgeModal({
  visible,
  onClose,
  title,
  subtitle,
  iconName,
  illustration,
  children,
  footer,
  primaryAction,
  secondaryAction,
  variant = 'medium',
  state = 'default',
  scrollable = false,
  dismissible = true,
  loading = false,
  accessibilityLabel = 'Modal',
}: ForgeModalProps) {
  const insets = useSafeAreaInsets()
  const isDisabled = state === 'disabled' || loading

  const handleBackdropPress = useCallback(() => {
    if (dismissible && onClose) onClose()
  }, [dismissible, onClose])

  const maxWidth = _maxWidth(variant)
  const isFullScreen = variant === 'fullScreen'

  const BodyContent = scrollable ? (
    <ScrollView
      style={styles.scrollBody}
      contentContainerStyle={styles.scrollBodyContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.body}>{children}</View>
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleBackdropPress}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <Pressable
          style={[styles.backdrop, { paddingBottom: insets.bottom }]}
          onPress={handleBackdropPress}
          accessibilityLabel="Close modal"
          accessibilityRole="button"
        >
          {/* Container â€” stop backdrop tap from propagating */}
          <Pressable
            onPress={() => {}}
            style={[
              styles.container,
              isFullScreen ? styles.containerFullScreen : { maxWidth },
              isFullScreen && { paddingBottom: insets.bottom + MODAL.PAD_MODAL },
            ]}
            accessibilityLabel={accessibilityLabel}
            
            accessibilityViewIsModal
          >
            {/* Header row: illustration/icon + title/subtitle + close */}
            {(illustration || iconName || title || subtitle || onClose) ? (
              <View style={styles.header}>
                {/* Left: illustration or icon box */}
                {illustration ?? (iconName ? (
                  <View style={styles.iconBox}>
                    <Feather name={iconName as 'award'} size={20} color={color.accent.primary} />
                  </View>
                ) : null)}

                {/* Centre: title + subtitle */}
                {(title || subtitle) ? (
                  <View style={styles.headerText}>
                    {title ? (
                      <Text style={styles.title} numberOfLines={2}>
                        {title}
                      </Text>
                    ) : null}
                    {subtitle ? (
                      <Text style={styles.subtitle} numberOfLines={2}>
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {/* Right: close button */}
                {onClose ? (
                  <Pressable
                    onPress={onClose}
                    accessibilityLabel="Close"
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
                  >
                    <Feather name="x" size={14} color={color.text.secondary} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* Body */}
            {children ? BodyContent : null}

            {/* Loading overlay inside container */}
            {loading && state === 'loading' ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={color.accent.primary} />
              </View>
            ) : null}

            {/* Footer */}
            {footer ?? ((primaryAction || secondaryAction) ? (
              <View style={styles.footer}>
                {secondaryAction ? (
                  <Pressable
                    onPress={secondaryAction.onPress}
                    disabled={isDisabled || secondaryAction.disabled}
                    accessibilityLabel={secondaryAction.accessibilityLabel ?? secondaryAction.label}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !!(isDisabled || secondaryAction.disabled) }}
                    style={({ pressed }) => [
                      styles.footerBtn,
                      styles.footerBtnSecondary,
                      pressed && styles.footerBtnSecondaryPressed,
                      (isDisabled || secondaryAction.disabled) && styles.footerBtnDisabled,
                    ]}
                  >
                    <Text style={styles.footerBtnSecondaryLabel}>
                      {secondaryAction.label}
                    </Text>
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
                      styles.footerBtn,
                      styles.footerBtnPrimary,
                      pressed && styles.footerBtnPrimaryPressed,
                      (isDisabled || primaryAction.disabled) && styles.footerBtnDisabled,
                    ]}
                  >
                    {primaryAction.loading ? (
                      <ActivityIndicator size="small" color={color.text.inverse} />
                    ) : (
                      <Text style={styles.footerBtnPrimaryLabel}>{primaryAction.label}</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            ) : null)}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function _maxWidth(v: ModalVariant): number {
  switch (v) {
    case 'small':  return 300
    case 'large':  return 400
    default:       return size.modalMaxWidth   // medium = 340
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: color.background.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    backgroundColor: color.background.elevated,
    borderRadius: MODAL.RADIUS,
    borderWidth: 1,
    borderColor: color.border.subtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
    elevation: 12,
    // inner top highlight
    overflow: 'hidden',
    padding: MODAL.PAD_MODAL,
    gap: 16,
  },
  containerFullScreen: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 0,
    borderWidth: 0,
    justifyContent: 'flex-end',
    padding: MODAL.PAD_MODAL,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: MODAL.ICON_BOX,
    height: MODAL.ICON_BOX,
    borderRadius: MODAL.RADIUS,
    backgroundColor: color.accent.glow,
    borderWidth: 1,
    borderColor: color.accent.muted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: color.text.primary,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 14,
    color: color.text.secondary,
    lineHeight: 18,
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
  body: {
    gap: 8,
  },
  scrollBody: {
    maxHeight: 320,
  },
  scrollBodyContent: {
    gap: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(24,24,31,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MODAL.RADIUS,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  footerBtn: {
    flex: 1,
    height: MODAL.BTN_H,
    borderRadius: MODAL.RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: color.border.subtle,
  },
  footerBtnSecondaryPressed: {
    backgroundColor: color.innerHighlight,
  },
  footerBtnPrimary: {
    backgroundColor: color.accent.primary,
  },
  footerBtnPrimaryPressed: {
    backgroundColor: color.accent.highlight,
  },
  footerBtnDisabled: {
    opacity: 0.45,
  },
  footerBtnSecondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.primary,
  },
  footerBtnPrimaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.inverse,
  },
})
