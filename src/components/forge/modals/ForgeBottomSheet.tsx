/**
 * ForgeBottomSheet
 * Spec: Forge Modal Library.dc.html §04
 *
 * Anchored to the bottom edge, dismissed by swipe-down or backdrop tap.
 * A drag handle signals its grab affordance; content scrolls independently
 * of the pinned footer. While dragging, the sheet tracks the finger and the
 * shadow lifts; past the release threshold it slides out and closes.
 *
 * Sizes (spec §04 size variants):
 *   small      38% viewport — single action or quick pick
 *   medium     55% viewport — default · list + footer
 *   large      78% viewport — rich content, scrolls
 *   fullHeight 96% viewport — near-fullscreen task
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color } from '@/constants/tokens'
import { MODAL } from './_modalTokens'
import { useOverlayTransition } from './_useOverlayTransition'
import type { BottomSheetSize, ForgeBottomSheetProps } from './types'

export function ForgeBottomSheet({
  visible,
  onClose,
  size = 'medium',
  dragHandle = true,
  header,
  footer,
  children,
  scrollableContent = false,
  dismissible = true,
  accessibilityLabel = 'Bottom sheet',
}: ForgeBottomSheetProps) {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()

  const sheetHeightPx = windowHeight * _fractionForSize(size)

  // Spec §14: bottom sheet slide 240ms ease-out (translateY 100% → 0)
  const { backdrop, panel, rendered } = useOverlayTransition(visible, {
    enterDuration: MODAL.DUR_SHEET,
  })

  // Swipe-down gesture — the sheet tracks the finger (positive dy only)
  const [dragY] = useState(() => new Animated.Value(0))
  const [dragging, setDragging] = useState(false)

  const panResponder = useMemo(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderGrant: () => setDragging(true),
      onPanResponderMove: (_evt, gesture) => {
        dragY.setValue(Math.max(0, gesture.dy))
      },
      onPanResponderRelease: (_evt, gesture) => {
        setDragging(false)
        const pastThreshold =
          gesture.dy > sheetHeightPx * 0.25 || gesture.vy > 0.8
        if (pastThreshold && dismissible && onClose) {
          Animated.timing(dragY, {
            toValue: sheetHeightPx,
            duration: MODAL.DUR_EXIT,
            useNativeDriver: true,
          }).start(() => onClose())
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            stiffness: 320,
            damping: 30,
            overshootClamping: true,
            useNativeDriver: true,
          }).start()
        }
      },
      onPanResponderTerminate: () => {
        setDragging(false)
        Animated.spring(dragY, {
          toValue: 0,
          stiffness: 320,
          damping: 30,
          overshootClamping: true,
          useNativeDriver: true,
        }).start()
      },
    }),
  [dragY, sheetHeightPx, dismissible, onClose])

  // Reset drag offset whenever the sheet re-opens
  useEffect(() => {
    if (visible) dragY.setValue(0)
  }, [visible, dragY])

  const handleBackdropPress = useCallback(() => {
    if (dismissible && onClose) onClose()
  }, [dismissible, onClose])

  const BodyContent = scrollableContent ? (
    <ScrollView
      style={styles.scrollContent}
      contentContainerStyle={[styles.scrollPad, { paddingBottom: insets.bottom + 12 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, { paddingBottom: insets.bottom + 12 }]}>
      {children}
    </View>
  )

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={handleBackdropPress}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      {/* Backdrop */}
      <Animated.View
        pointerEvents="none"
        style={[styles.backdropFill, { opacity: backdrop }]}
      />
      <Pressable
        style={styles.backdrop}
        onPress={handleBackdropPress}
        accessibilityLabel="Close sheet"
        accessibilityRole="button"
      />

      {/* Sheet panel */}
      <Animated.View
        style={[
          styles.sheet,
          dragging && styles.sheetDragging,
          { height: sheetHeightPx },
          {
            transform: [
              {
                translateY: Animated.add(
                  panel.interpolate({ inputRange: [0, 1], outputRange: [sheetHeightPx, 0] }),
                  dragY,
                ),
              },
            ],
          },
        ]}
        accessibilityLabel={accessibilityLabel}

        accessibilityViewIsModal
      >
        {/* Grab zone — drag handle + header respond to swipe-down */}
        <View {...panResponder.panHandlers}>
          {dragHandle ? (
            <View style={[styles.handle, dragging && styles.handleActive]} />
          ) : null}

          {/* Header slot */}
          {header ? (
            <View style={styles.header}>{header}</View>
          ) : null}
        </View>

        {/* Body */}
        <View style={styles.body}>{BodyContent}</View>

        {/* Footer slot */}
        {footer ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
            {footer}
          </View>
        ) : null}
      </Animated.View>
    </Modal>
  )
}

function _fractionForSize(size: BottomSheetSize): number {
  switch (size) {
    case 'small':      return 0.38
    case 'large':      return 0.78
    case 'fullHeight': return 0.96
    default:           return 0.55
  }
}

const styles = StyleSheet.create({
  backdropFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.background.overlay,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: color.background.elevated,
    borderTopWidth: 1,
    borderTopColor: color.border.subtle,
    borderTopLeftRadius: MODAL.RADIUS_SHEET,
    borderTopRightRadius: MODAL.RADIUS_SHEET,
    shadowColor: MODAL.SHEET_SHADOW_COLOR,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  // Spec §04 dragging state — tracks the finger, shadow lifts
  sheetDragging: {
    shadowOffset: { width: 0, height: -14 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 14,
  },
  handle: {
    width: MODAL.HANDLE_W,
    height: MODAL.HANDLE_H,
    borderRadius: MODAL.RADIUS_PILL,
    backgroundColor: color.text.tertiary,
    alignSelf: 'center',
    marginTop: MODAL.HANDLE_MT,
    marginBottom: MODAL.HANDLE_MB,
    opacity: 0.7,
  },
  handleActive: {
    backgroundColor: color.text.primary,
    opacity: 1,
  },
  header: {
    paddingHorizontal: MODAL.PAD_SHEET_H,
    paddingBottom: 8,
  },
  body: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    flex: 1,
  },
  scrollPad: {
    paddingHorizontal: MODAL.PAD_SHEET_H,
  },
  staticContent: {
    paddingHorizontal: MODAL.PAD_SHEET_H,
    flex: 1,
  },
  footer: {
    paddingHorizontal: MODAL.PAD_SHEET_H,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: color.border.subtle,
  },
})
