/**
 * Shared enter/exit transition driver for modal overlays.
 * Spec: Forge Modal Library.dc.html §14 Motion
 *
 * Two animated values, per the motion table:
 *   backdrop — fades 0→1 over DUR_BACKDROP (ease-out) so the overlay dims
 *              in before the panel moves; reverses over the exit duration.
 *   panel    — 0→1; components interpolate translate/scale/opacity from it.
 *              Entrance is a clamped spring (no bounce past rest) or an
 *              ease-out timing; exit is always ease-in and faster than in.
 *
 * `rendered` keeps the native Modal mounted until the exit animation lands.
 */

import { useEffect, useState } from 'react'
import { Animated, Easing } from 'react-native'
import { MODAL } from './_modalTokens'

interface OverlayTransitionOptions {
  /** Panel entrance duration when not using a spring */
  enterDuration?: number
  exitDuration?: number
  /** Clamped spring entrance (spec: spring · soft / spring · gentle) */
  spring?: boolean
}

export function useOverlayTransition(
  visible: boolean,
  {
    enterDuration = MODAL.DUR_ENTER,
    exitDuration = MODAL.DUR_EXIT,
    spring = false,
  }: OverlayTransitionOptions = {},
) {
  const [backdrop] = useState(() => new Animated.Value(0))
  const [panel] = useState(() => new Animated.Value(0))
  const [rendered, setRendered] = useState(visible)

  // Mount the Modal in the same render that `visible` turns on, so the
  // entrance animation plays against an already-rendered tree.
  if (visible && !rendered) setRendered(true)

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: MODAL.DUR_BACKDROP,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        spring
          ? Animated.spring(panel, {
              toValue: 1,
              stiffness: 320,
              damping: 30,
              mass: 1,
              overshootClamping: true,
              useNativeDriver: true,
            })
          : Animated.timing(panel, {
              toValue: 1,
              duration: enterDuration,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
      ]).start()
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 0,
          duration: exitDuration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(panel, {
          toValue: 0,
          duration: exitDuration,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false)
      })
    }
  }, [visible, rendered, backdrop, panel, spring, enterDuration, exitDuration])

  return { backdrop, panel, rendered }
}
