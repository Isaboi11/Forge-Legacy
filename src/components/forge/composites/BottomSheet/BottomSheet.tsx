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
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { flColor, flRadius, flShadow } from '@/constants/foundation'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  dismissible?: boolean
  title?: string
  showHandle?: boolean
  children?: React.ReactNode
  /**
   * Scroll the body when it is taller than the sheet.
   *
   * OPT-IN, not automatic: ten sheets already own an inner `ScrollView` sized to their content, and
   * wrapping those in another would nest two scrollers on the same axis. The height cap below is
   * unconditional and fixes the worst of it for everybody; this is for a body that is genuinely long.
   */
  scroll?: boolean
  footer?: React.ReactNode
  /**
   * Fired once the sheet is really GONE, not merely asked to close — RN forwards this from the native
   * modal, so on iOS it lands after the dismissal animation finishes.
   *
   * ⚠ It exists because iOS refuses to present a second view controller while one is still on screen.
   * A sheet that offers "Choose from library" cannot call the photo picker in the same tick it closes
   * itself: the presentation is silently dropped and the athlete taps a row that does nothing. See
   * `useMediaPicker`, which awaits this before launching.
   *
   * NOT fired on Android or web (RN only implements it for iOS), so every caller needs a fallback.
   */
  onDismiss?: () => void
}

export function BottomSheet({ open, onClose, dismissible = true, title, showHandle = true, scroll = false, children, footer, onDismiss }: BottomSheetProps) {
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} onDismiss={onDismiss}>
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

          {scroll ? (
            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}

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
    /*
     * A SHEET TALLER THAN THE SCREEN HAS NO BOTTOM.
     *
     * There was no cap at all, so a long body — an imported six-day program, forty-five exercises —
     * simply ran off the top of the display with its Create button somewhere past the ceiling and no way
     * to reach it. 88% leaves the backdrop tappable above, which is how a sheet is dismissed.
     */
    maxHeight: '88%',
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
  /** Shrinks so the pinned footer keeps its place; the body scrolls inside whatever is left. */
  scrollBody: { flexShrink: 1 },
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
