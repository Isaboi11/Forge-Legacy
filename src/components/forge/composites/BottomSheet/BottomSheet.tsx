/**
 * CLA-C21 — BottomSheet
 * Tier: 2 (Composite)
 * Spec: components/Overlays/BottomSheet.jsx (Claude Design)
 *
 * The utility surface for everything that is NOT a ceremony: Profile, Honor
 * Detail, filters, confirmations, Set Input, action menus, Share
 * Configuration. Slides up from the bottom; tap-outside dismiss is allowed
 * by default.
 */

import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { flColor, flRadius, flShadow } from '@/constants/foundation'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  dismissible?: boolean
  title?: string
  showHandle?: boolean
  children?: React.ReactNode
  footer?: React.ReactNode
}

export function BottomSheet({ open, onClose, dismissible = true, title, showHandle = true, children, footer }: BottomSheetProps) {
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      {/* Backdrop = tap-to-dismiss surface only. It must NOT be an accessibilityRole="button" — on web that
          makes it keyboard-activatable, so a SPACEBAR press inside a text field bubbles up and "clicks" the
          backdrop, dismissing the sheet mid-typing. `focusable={false}` keeps it out of the keyboard path. */}
      <Pressable style={styles.backdrop} onPress={dismissible ? onClose : undefined} focusable={false}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          focusable={false}
          style={[styles.sheet, { paddingBottom: 22 + insets.bottom }]}
        >
          {showHandle ? (
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>
          ) : null}

          {title ? <Text style={styles.title}>{title}</Text> : null}

          <View style={styles.content}>{children}</View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: flColor.overlayDark,
  },
  sheet: {
    backgroundColor: flColor.charcoal700,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    borderBottomWidth: 0,
    borderTopLeftRadius: flRadius.xl,
    borderTopRightRadius: flRadius.xl,
    boxShadow: flShadow.ambient,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: flRadius.pill,
    backgroundColor: flColor.charcoal500,
  },
  title: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 4,
    fontSize: 17,
    fontWeight: '600',
    color: flColor.cream100,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 22,
  },
  footer: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal600,
    gap: 10,
  },
})
