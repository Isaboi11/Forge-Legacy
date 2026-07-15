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
import { StyleSheet, Text, View } from 'react-native'
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
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={styles.pill} accessibilityLiveRegion="polite" accessibilityRole="alert">
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </View>
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
