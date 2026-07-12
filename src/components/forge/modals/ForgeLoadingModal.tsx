/**
 * ForgeLoadingModal
 * Spec: Forge Modal Library.dc.html Â§08
 *
 * Blocking overlay for operations the user must wait on.
 * The container is fixed; only the indicator swaps between states â€”
 * no layout shift, no second modal.
 *
 * States: loading (spinner) | success (green check) | failure (red X)
 */

import React, { useEffect, useState } from 'react'
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import { MODAL } from './_modalTokens'
import { ForgeModal } from './ForgeModal'
import type { ForgeLoadingModalProps, LoadingStatus } from './types'

export function ForgeLoadingModal({
  visible,
  status = 'loading',
  title,
  message,
  progress,
  onDismiss,
  accessibilityLabel = 'Loading',
}: ForgeLoadingModalProps) {
  const defaultTitle = _defaultTitle(status)
  const defaultMsg   = _defaultMessage(status)

  // Auto-dismiss on success/failure when onDismiss provided
  useEffect(() => {
    if ((status === 'success' || status === 'failure') && onDismiss) {
      const t = setTimeout(onDismiss, 1600)
      return () => clearTimeout(t)
    }
    return undefined
  }, [status, onDismiss])

  // Spec §08 determinate variant: when progress is measurable, replace the
  // spinner with a bronze progress bar and a live percentage — never a fake bar.
  const isDeterminate = status === 'loading' && typeof progress === 'number'
  const pct = isDeterminate ? Math.round(Math.min(1, Math.max(0, progress)) * 100) : 0

  return (
    <ForgeModal
      visible={visible}
      dismissible={false}
      variant="small"
      accessibilityLabel={accessibilityLabel}
    >
      {isDeterminate ? (
        <View style={styles.determinate}>
          <View style={styles.determinateHeader}>
            <Text style={styles.title}>{title ?? defaultTitle}</Text>
            <Text style={styles.percentage}>{pct}%</Text>
          </View>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: pct }}
          >
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
          {message ? (
            <Text style={styles.subLabel}>{message}</Text>
          ) : null}
        </View>
      ) : (
        <StatusSwap status={status}>
          <View style={styles.content}>
            <StatusIndicator status={status} />
            <View style={styles.textGroup}>
              <Text style={styles.title}>{title ?? defaultTitle}</Text>
              {(message ?? defaultMsg) ? (
                <Text style={styles.message}>{message ?? defaultMsg}</Text>
              ) : null}
            </View>
          </View>
        </StatusSwap>
      )}
    </ForgeModal>
  )
}

/**
 * Spec §14 loading transition — spinner ⇄ result swap in place over 200ms,
 * container fixed, no layout shift.
 */
function StatusSwap({ status, children }: { status: LoadingStatus; children: React.ReactNode }) {
  const opacity = useState(() => new Animated.Value(1))[0]

  useEffect(() => {
    opacity.setValue(0)
    Animated.timing(opacity, {
      toValue: 1,
      duration: MODAL.DUR_STATUS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }, [status, opacity])

  return <Animated.View style={{ opacity }}>{children}</Animated.View>
}

// â”€â”€ Spinner + success/failure indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StatusIndicator({ status }: { status: LoadingStatus }) {
  const [rotation] = useState(() => new Animated.Value(0))

  useEffect(() => {
    if (status !== 'loading') return undefined
    const anim = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )
    anim.start()
    return () => anim.stop()
  }, [status, rotation])

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  if (status === 'success') {
    return (
      <View style={[styles.circle, styles.circleSuccess]}>
        <Feather name="check" size={24} color={color.text.inverse} strokeWidth={3} />
      </View>
    )
  }

  if (status === 'failure') {
    return (
      <View style={[styles.circle, styles.circleFailure]}>
        <Feather name="x" size={22} color={color.text.inverse} />
      </View>
    )
  }

  // loading
  return (
    <Animated.View
      style={[styles.spinner, { transform: [{ rotate: spin }] }]}
      accessibilityLabel="Loading"
    />
  )
}

function _defaultTitle(s: LoadingStatus) {
  switch (s) {
    case 'success': return 'Done'
    case 'failure': return 'Something went wrong'
    default: return 'Please wait'
  }
}

function _defaultMessage(s: LoadingStatus): string | undefined {
  switch (s) {
    case 'success': return undefined
    case 'failure': return 'Try again in a moment.'
    default: return undefined
  }
}

// Type reference
void (undefined as unknown as LoadingStatus)

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  spinner: {
    width: MODAL.ICON_BOX_STATUS,
    height: MODAL.ICON_BOX_STATUS,
    borderRadius: MODAL.RADIUS_PILL,
    borderWidth: 3,
    borderColor: color.progressTrack,
    borderTopColor: color.accent.primary,
  },
  circle: {
    width: MODAL.ICON_BOX_STATUS,
    height: MODAL.ICON_BOX_STATUS,
    borderRadius: MODAL.RADIUS_PILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSuccess: {
    backgroundColor: color.success,
  },
  circleFailure: {
    backgroundColor: color.danger,
  },
  textGroup: {
    alignItems: 'center',
    gap: 4,
  },
  // Determinate variant — spec §08
  determinate: {
    gap: 10,
    paddingTop: 4,
    paddingBottom: 4,
  },
  determinateHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  percentage: {
    fontSize: 15,
    fontWeight: '600',
    color: color.accent.primary,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: MODAL.RADIUS_PILL,
    backgroundColor: color.progressTrack,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: MODAL.RADIUS_PILL,
    backgroundColor: color.accent.primary,
  },
  subLabel: {
    fontSize: 13,
    color: color.text.secondary,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: color.text.primary,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: color.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
  },
})
