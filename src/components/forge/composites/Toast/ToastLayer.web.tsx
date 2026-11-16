/**
 * The window the toast is drawn in — web.
 *
 * ⛔ NOT A `Modal` ON WEB EITHER (11-16). react-native-web's transparent Modal is a `position: fixed`
 * full-screen `<div aria-modal>` with no `pointer-events` rule AND a focus trap. So for the toast's 3 s
 * every click on the page landed on an invisible sheet, and focus was pulled out of whatever field the
 * athlete was typing in — the "freeze" on the web preview, same shape as the iOS one.
 *
 * Instead the toast is portalled straight onto `<body>` above everything (RN-web modals sit at z 9999) in
 * a layer that takes no pointer events at all.
 */

import React from 'react'
import { createPortal } from 'react-dom'

export function ToastLayer({ children }: { children: React.ReactNode; onRequestClose: () => void }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 2147483000, pointerEvents: 'none', display: 'flex' }}>
      {children}
    </div>,
    document.body,
  )
}
