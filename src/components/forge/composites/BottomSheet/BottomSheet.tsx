/**
 * CLA-C21 — BottomSheet
 * Tier: 2 (Composite)
 * Spec: components/Overlays/BottomSheet.jsx (Claude Design)
 *
 * The utility surface for everything that is NOT a ceremony: Profile, Honor
 * Detail, filters, confirmations, Set Input, action menus, Share
 * Configuration. Slides up from the bottom; tap-outside dismiss is allowed
 * by default.
 *
 * ══ THE GRABBER NOW GRABS ══
 *
 * PO, 2026-08-25: *"all the places where it pulls a page up and it shows it as if you can drag it down
 * but none of them drag down."* This component draws a grabber at the top of every sheet and had no
 * gesture behind it — and **49 files use it**, so that was 49 screens making a promise the app did not
 * keep. A drag handle is not decoration; it is the standard signal that a surface is dismissible by
 * dragging, and drawing one without wiring it is the same defect class as a button that only fires a
 * "coming soon" toast.
 *
 * ⚠ THE PAN IS ON THE HANDLE, NOT THE SHEET, and that is deliberate rather than lazy. This file's own
 * history is a gesture conflict: a backdrop `Pressable` wrapping the body once ate the drag that should
 * have scrolled a long sheet (see the note on the backdrop below). A responder on the whole sheet would
 * do it again — `onMoveShouldSetPanResponder` on a vertical drag cannot tell "dismiss the sheet" from
 * "scroll the list", and the scroller is the one that loses. Scoped to the grab area, the two gestures
 * can never contend: the body scrolls exactly as it did, and the handle does the thing it depicts.
 *
 * The gesture itself lives in `useSheetDrag`, shared with the five sheets that roll their own Modal,
 * so every sheet in the app dismisses at the same distance and the same fling.
 */

import React from 'react'
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { flColor, flRadius, flShadow } from '@/constants/foundation'
import { useSheetDrag } from '@/hooks/useSheetDrag'

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
  const { height: windowHeight } = useWindowDimensions()

  const drag = useSheetDrag({ onClose, dismissible })

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} onDismiss={onDismiss}>
      {/*
        ══ THE BACKDROP IS A SIBLING, NOT A PARENT — AND THAT IS WHAT MAKES THE BODY SCROLL ══

        It used to WRAP the sheet: a `Pressable` backdrop containing a second `Pressable` that swallowed
        the tap so it would not dismiss. Two nested pressables in the ancestry of the ScrollView, which is
        fine with a mouse and fatal on a touch screen — RN Web's Pressable claims the touch through the
        responder system, so the drag that should scroll the body was consumed as a press gesture on the
        way down. A long preview (an imported 15-week plan) could be seen and not moved.

        As siblings, nothing is above the ScrollView but plain Views, and the backdrop still catches every
        tap outside the sheet because it fills the screen behind it.

        It must NOT be accessibilityRole="button" — on web that makes it keyboard-activatable, so a
        SPACEBAR press inside a text field bubbles up and "clicks" it, dismissing the sheet mid-typing.
        `focusable={false}` keeps it out of the keyboard path.

        ══ AND THE KEYBOARD MUST NOT SIT ON TOP OF THE FIELD ══

        A sheet is pinned to the BOTTOM of the screen, which is exactly where the keyboard opens — so the
        input the athlete just tapped is the first thing covered. It was worst on the import sheet, whose
        whole job is a big paste box: the keyboard came up over it and there was no way to see what had
        been pasted.

        `padding` on iOS lifts the sheet by the keyboard's height. Android is left alone because
        `adjustResize` already does it at the window level, and doing both double-counts.

        ⚠ NOT WHEN THE BODY SCROLLS. A `Modal` is its own UIWindow, so KeyboardAvoidingView measures the
        keyboard against the wrong frame and over-pads — it squeezes the sheet and carries the footer off
        the bottom with it. That is invisible on a sheet with no text field (the keyboard never opens), so
        it only ever bit the ONE scrolling sheet that takes typed input: Edit Identity, whose Save button
        became unreachable. A scrolling sheet does not need it — `automaticallyAdjustKeyboardInsets` moves
        the keyboard out of the way INSIDE the scroller, which is modal-safe.
      */}
      <KeyboardAvoidingView style={styles.root} behavior={!scroll && Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissible ? onClose : undefined}
          focusable={false}
        />
        <Animated.View
          onLayout={drag.onLayout}
          style={[styles.sheet, { paddingBottom: 22 + insets.bottom }, drag.style]}
        >
          {showHandle ? (
            // The pan lives here, on the grab area — see the note at the top of the file.
            <View style={styles.handleRow} {...drag.panHandlers}>
              <View style={styles.handle} />
            </View>
          ) : null}

          {title ? <Text style={styles.title}>{title}</Text> : null}

          {scroll ? (
            <ScrollView
              /*
               * The cap is EXPLICIT, not just `flexShrink: 1`. Shrinking a flex child relies on the
               * parent resolving a definite height from `maxHeight: '88%'`, and when it doesn't the
               * ScrollView simply grows to its content — so it never scrolls AND it pushes the footer
               * past the bottom of the screen. A real number can't fail that way: 60% of the window
               * always leaves room for the title, the footer and the safe-area inset beneath it.
               */
              style={[styles.scrollBody, { maxHeight: windowHeight * 0.6 }]}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  /** Holds the dim and the layout; the tap target is the absolute-fill Pressable behind the sheet. */
  root: {
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
    // ⚠ A 4px bar is not a touch target. The row is padded so the GRAB area is ~22px tall, which is
    // what makes the gesture findable — the drawn handle stays the size the design specifies.
    paddingBottom: 8,
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
