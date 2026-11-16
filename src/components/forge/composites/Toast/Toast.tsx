/**
 * CLA-C22 — Toast
 * Tier: 2 (Composite)
 * Spec: Forge Modal Library.dc.html §04 (Toast)
 *
 * Transient and NON-modal — marks something that already succeeded, then dismisses itself. Positive or
 * neutral only; failures are native alerts, never a toast. Rendered by the overlay provider at the root.
 *
 * ══ 11-16 — MADE NOTICEABLE (PO: "it's not super noticeable") ══
 *
 * It used to be a small dark pill low on the screen that popped in and out with no motion — dark on a
 * dark app, next to the tab bar, away from where the eye is. Now, in BOTH themes (layout rule):
 *   · it slides down from the TOP, under the status bar, and slides back up — motion is what the eye catches;
 *   · a bronze check disc leads every message (a caller's own `icon` replaces it);
 *   · the phone gives the Success haptic (gated by the athlete's Haptics setting via `useHaptics`);
 *   · Forge only (colour rule): a solid bronze edge with a soft bronze glow. Alabaster keeps its earned
 *     bronze edge (`accentBorder`) and gets a deeper lift instead of a glow.
 *
 * ⛔ IT NEVER HOLDS THE SCREEN (PO 11-16: "make sure it's not holding and freezing the screen").
 *   · The layer AND the card take no touches (`pointerEvents="none"`) — a tap anywhere, the card's own
 *     strip included, reaches the app underneath. Nothing waits for it to leave.
 *   · Total time on screen is still `durationMs` (3 s), slide-in and slide-out included.
 *   · The window it lives in is chosen per platform in `ToastLayer` — on iOS and web a `Modal` takes
 *     every touch on the page, which is exactly the freeze this file has already shipped once.
 */

import React, { useEffect, useEffectEvent, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { flColor, flRadius, flShadow } from '@/constants/foundation'
import { forgeOr } from '@/constants/theme-scrim'
import { useHaptics, useReduceMotion } from '@/lib/settings'
import { EngravedIcon } from '../../primitives/icons/EngravedIcon'
import { ToastLayer } from './ToastLayer'

export interface ToastProps {
  open: boolean
  message: string
  icon?: React.ReactNode
  onDismiss: () => void
  durationMs?: number
}

const ENTER_MS = 280
const EXIT_MS = 200

export function Toast({ open, message, icon, onDismiss, durationMs = 3000 }: ToastProps) {
  const insets = useSafeAreaInsets()
  const haptics = useHaptics()
  const reduceMotion = useReduceMotion()
  const [a] = useState(() => new Animated.Value(0))

  /* Effect events, so a caller passing an inline `onDismiss` (ShareSheet does) cannot restart the timer —
     or re-fire the haptic — on every one of its re-renders. */
  const dismiss = useEffectEvent(() => onDismiss())
  const arrive = useEffectEvent((text: string) => {
    haptics.success()
    AccessibilityInfo.announceForAccessibility(text)
  })

  useEffect(() => {
    if (!open) return
    arrive(message)
    a.setValue(0)
    const enter = Animated.timing(a, {
      toValue: 1,
      duration: ENTER_MS,
      // A small overshoot so it lands rather than stops. `easing` on timing() is fine under the native
      // driver — it is only interpolate() that cannot take one.
      easing: Easing.out(Easing.back(1.3)),
      useNativeDriver: true,
    })
    enter.start()
    let exit: Animated.CompositeAnimation | null = null
    const t = setTimeout(() => {
      exit = Animated.timing(a, { toValue: 0, duration: EXIT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true })
      exit.start(({ finished }) => {
        if (finished) dismiss()
      })
    }, Math.max(ENTER_MS, durationMs - EXIT_MS))
    return () => {
      clearTimeout(t)
      enter.stop()
      exit?.stop()
    }
  }, [open, message, durationMs, a])

  if (!open) return null

  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: reduceMotion ? [0, 0] : [-36, 0] })
  const opacity = a.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' })

  return (
    <ToastLayer onRequestClose={onDismiss}>
      <View pointerEvents="none" style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
        <Animated.View
          style={[styles.card, { opacity, transform: [{ translateY }] }]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {icon ? (
            <View style={styles.icon}>{icon}</View>
          ) : (
            <View style={styles.check}>
              <EngravedIcon name="check" size={16} color={flColor.charcoal900} />
            </View>
          )}
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </Animated.View>
      </View>
    </ToastLayer>
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
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    width: '100%',
    maxWidth: 520,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: forgeOr(flColor.bronze400, flColor.accentBorder),
    backgroundColor: flColor.charcoal800,
    boxShadow: forgeOr(
      `${flShadow.card}, 0 12px 30px rgba(0, 0, 0, 0.6), 0 0 26px rgba(186, 134, 84, 0.28)`,
      `${flShadow.card}, 0 10px 26px -6px rgba(70, 58, 42, 0.34)`,
    ),
  },
  check: {
    flexShrink: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.bronze400,
    boxShadow: forgeOr('0 0 10px rgba(186, 134, 84, 0.45)', 'none'),
  },
  icon: {
    flexShrink: 0,
  },
  message: {
    flexShrink: 1,
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: flColor.cream100,
  },
})
