/**
 * CLA-C22 — Toast
 * Tier: 2 (Composite)
 * Spec: Forge Modal Library.dc.html §04 (Toast)
 *
 * Transient and NON-modal — marks something that already succeeded, then auto-dismisses
 * after 3s (announced via an assertive/polite live region). Positive or neutral only;
 * failures are native alerts, never a toast. Rendered by the overlay provider at the
 * root; its wrapper is `pointerEvents="box-none"` so it never blocks touches.
 */

import React, { useEffect } from 'react'
import { Modal, Platform, StyleSheet, Text, View } from 'react-native'
import { flColor, flRadius, flShadow } from '@/constants/foundation'

export interface ToastProps {
  open: boolean
  message: string
  icon?: React.ReactNode
  onDismiss: () => void
  durationMs?: number
}

export function Toast({ open, message, icon, onDismiss, durationMs = 3000 }: ToastProps) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(t)
  }, [open, durationMs, onDismiss])

  if (!open) return null

  return (
    /*
      ══ ⚠ THE TOAST LIVES IN ITS OWN WINDOW, OR IT IS INVISIBLE EXACTLY WHEN IT MATTERS ══

      PO: *"When sending a workout or anything to the squad or to friends there's no indication that it
      was actually sent... I should be able to know that it sent and posted."*

      The confirmation was there the whole time. `squad-composer` toasts "Posted to your squad",
      `ShareSessionSheet` toasts its summary, `progress-photo-post` and `share-config` both toast — and
      NONE of them could be seen, because every one of those flows finishes from inside a `BottomSheet`,
      and `BottomSheet` is a native `Modal`. Its own header says it: *"A `Modal` is its own UIWindow."*
      The provider renders this component `position: absolute` in the ordinary view tree, which is
      underneath that window. So the app announced every post to a layer nobody was looking at.

      Wrapping it in a `Modal` of its own puts it in the topmost window, above any sheet that is still
      open or still animating out. One change fixes every caller rather than making eight of them
      remember to delay their own toast until after a close animation.

      ⚠ `transparent` AND `pointerEvents="box-none"` TOGETHER, AND BOTH MATTER. Without `transparent`
      the toast would paint an opaque page over the app; without `box-none` its full-screen wrapper
      would swallow every touch for three seconds — turning a confirmation into a freeze, which is worse
      than the silence it replaces.

      ⚠ `animationType="none"`. The pill is a transient mark, not a surface being presented; a slide
      would read as another sheet arriving on top of the one you just used.
    */
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent={Platform.OS === 'android'}
      // Nothing to do — it dismisses on its own timer. Supplied because Android's back button
      // otherwise has no handler on a visible Modal.
      onRequestClose={onDismiss}
    >
      <View pointerEvents="box-none" style={styles.wrap}>
        <View style={styles.pill} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 104,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    maxWidth: '86%',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  icon: {
    flexShrink: 0,
  },
  message: {
    flexShrink: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: flColor.cream100,
  },
})
