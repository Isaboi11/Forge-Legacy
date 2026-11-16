/**
 * The window the toast is drawn in — native. The web build resolves `ToastLayer.web.tsx` instead.
 *
 * The layer is the whole point of the toast's history: it must sit ABOVE every sheet and modal (or the
 * confirmation is drawn underneath the sheet that caused it), and it must NEVER take a touch (or the
 * confirmation freezes the app). See the notes in `Toast.tsx`.
 */

import React from 'react'
import { Modal, Platform } from 'react-native'
import { FullWindowOverlay } from 'react-native-screens'

export function ToastLayer({ children, onRequestClose }: { children: React.ReactNode; onRequestClose: () => void }) {
  /*
    ⛔ iOS: NEVER A `Modal` (PO 11-16 — "the screen freezes whenever I finish a workout and it takes me
    back to Legacy. It never unfreezes. Nothing moves. No popup.").

    On iOS a `Modal` is a PRESENTED VIEW CONTROLLER, and it takes every touch on the screen whatever
    `pointerEvents` says inside it — `box-none` only works within RN's own view tree. So every toast froze
    the app for its 3 s. Worse: "Save & Share" toasts "Posted to …" and then dismisses Workout Complete (a
    fullScreenModal). When the toast is presented while that dismissal is still running, iOS attaches it to
    the controller being torn down: it never shows (no popup), and it never goes away (never unfreezes).

    `FullWindowOverlay` is react-native-screens' own window above everything (sheets and modals included)
    whose hit-test returns nil outside its children, so touches reach the app. It ships over the air.
  */
  if (Platform.OS === 'ios') return <FullWindowOverlay>{children}</FullWindowOverlay>

  /*
    Android only (not a shipping platform today). A transparent `Modal` is the topmost window there, so the
    toast shows above an open BottomSheet. ⚠ An Android Modal is a Dialog and DOES hold touches while it is
    up — if Android ever ships, give it a non-modal overlay before launch.
  */
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onRequestClose}>
      {children}
    </Modal>
  )
}
