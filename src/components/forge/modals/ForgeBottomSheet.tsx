/**
 * ForgeBottomSheet
 * Spec: Forge Modal Library.dc.html Â§04
 *
 * Anchored to the bottom edge, dismissed by backdrop tap.
 * A drag handle signals its affordance; content scrolls independently.
 *
 * Sizes:
 *   small      ~35% viewport
 *   medium     ~55% viewport
 *   large      ~75% viewport
 *   fullHeight ~92% viewport
 */

import React, { useCallback } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color } from '@/constants/tokens'
import { MODAL } from './_modalTokens'
import type { BottomSheetSize, ForgeBottomSheetProps } from './types'

export function ForgeBottomSheet({
  visible,
  onClose,
  size = 'medium',
  dragHandle = true,
  header,
  footer,
  children,
  scrollableContent = false,
  dismissible = true,
  accessibilityLabel = 'Bottom sheet',
}: ForgeBottomSheetProps) {
  const insets = useSafeAreaInsets()

  const handleBackdropPress = useCallback(() => {
    if (dismissible && onClose) onClose()
  }, [dismissible, onClose])

  const sheetHeight = _heightForSize(size)

  const BodyContent = scrollableContent ? (
    <ScrollView
      style={styles.scrollContent}
      contentContainerStyle={[styles.scrollPad, { paddingBottom: insets.bottom + 12 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, { paddingBottom: insets.bottom + 12 }]}>
      {children}
    </View>
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleBackdropPress}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      {/* Backdrop */}
      <Pressable
        style={styles.backdrop}
        onPress={handleBackdropPress}
        accessibilityLabel="Close sheet"
        accessibilityRole="button"
      />

      {/* Sheet panel */}
      <View
        style={[styles.sheet, { height: sheetHeight }]}
        accessibilityLabel={accessibilityLabel}
        
        accessibilityViewIsModal
      >
        {/* Drag handle */}
        {dragHandle ? <View style={styles.handle} /> : null}

        {/* Header slot */}
        {header ? (
          <View style={styles.header}>{header}</View>
        ) : null}

        {/* Body */}
        <View style={styles.body}>{BodyContent}</View>

        {/* Footer slot */}
        {footer ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
            {footer}
          </View>
        ) : null}
      </View>
    </Modal>
  )
}

function _heightForSize(size: BottomSheetSize): `${number}%` {
  switch (size) {
    case 'small':      return '35%'
    case 'large':      return '75%'
    case 'fullHeight': return '92%'
    default:           return '55%'
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.background.overlay,
  },
  sheet: {
    backgroundColor: color.background.elevated,
    borderTopWidth: 1,
    borderTopColor: color.border.subtle,
    borderTopLeftRadius: MODAL.RADIUS_SHEET,
    borderTopRightRadius: MODAL.RADIUS_SHEET,
    shadowColor: MODAL.SHEET_SHADOW_COLOR,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  handle: {
    width: MODAL.HANDLE_W,
    height: MODAL.HANDLE_H,
    borderRadius: MODAL.RADIUS_PILL,
    backgroundColor: color.text.tertiary,
    alignSelf: 'center',
    marginTop: MODAL.HANDLE_MT,
    marginBottom: MODAL.HANDLE_MB,
    opacity: 0.7,
  },
  header: {
    paddingHorizontal: MODAL.PAD_SHEET_H,
    paddingBottom: 8,
  },
  body: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    flex: 1,
  },
  scrollPad: {
    paddingHorizontal: MODAL.PAD_SHEET_H,
  },
  staticContent: {
    paddingHorizontal: MODAL.PAD_SHEET_H,
    flex: 1,
  },
  footer: {
    paddingHorizontal: MODAL.PAD_SHEET_H,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: color.border.subtle,
  },
})
