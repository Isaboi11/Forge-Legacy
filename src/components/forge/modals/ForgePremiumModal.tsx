/**
 * ForgePremiumModal
 * Spec: Forge Modal Library.dc.html Â§11
 *
 * The upgrade surface. Bronze signals earned access, not a hard sell.
 * Restrained illustration, short benefits list, one clear price, easy way out.
 * Never feels pushy â€” the athlete chose to be here.
 */

import React from 'react'
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { color, elevation } from '@/constants/tokens'
import { MODAL } from './_modalTokens'
import { useOverlayTransition } from './_useOverlayTransition'
import type { ForgePremiumModalProps } from './types'

const DEFAULT_BENEFITS = [
  { key: 'b1', label: 'Unlimited active programs' },
  { key: 'b2', label: 'Unlimited photo storage' },
  { key: 'b3', label: 'Unlimited squad memberships' },
  { key: 'b4', label: 'Import training history' },
]

export function ForgePremiumModal({
  visible,
  onClose,
  illustration,
  overline = 'Forge Premium',
  title = 'Train Without Limits',
  benefits = DEFAULT_BENEFITS,
  pricingLine,
  primaryAction,
  secondaryAction,
  accessibilityLabel = 'Premium upgrade',
}: ForgePremiumModalProps) {
  const insets = useSafeAreaInsets()

  // Spec §14: backdrop 150ms ease-out; entrance 220ms spring·soft; exit 180ms ease-in
  const { backdrop, panel, rendered } = useOverlayTransition(visible, { spring: true })

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.backdropFill, { opacity: backdrop }]}
      />
      <View
        style={[styles.backdrop, { paddingBottom: insets.bottom + 20 }]}
        accessibilityLabel={accessibilityLabel}

        accessibilityViewIsModal
      >
        {/* Premium container â€” accent.muted border, deeper bg */}
        <Animated.View
          style={[
            styles.container,
            {
              opacity: panel,
              transform: [
                { translateY: panel.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                { scale: panel.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
              ],
            },
          ]}
        >
          {/* Illustration banner */}
          <View style={styles.banner}>
            {illustration ?? (
              <Feather name="shield" size={46} color={color.accent.highlight} strokeWidth={1.4} />
            )}
            {/* Close button floated top-right */}
            {onClose ? (
              <Pressable
                onPress={onClose}
                accessibilityLabel="Close"
                accessibilityRole="button"
                hitSlop={(MODAL.TAP_MIN - 28) / 2}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              >
                <Feather name="x" size={13} color={color.text.secondary} />
              </Pressable>
            ) : null}
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Heading */}
            <View style={styles.headingGroup}>
              {overline ? (
                <Text style={styles.overline}>{overline.toUpperCase()}</Text>
              ) : null}
              {title ? (
                <Text style={styles.title}>{title}</Text>
              ) : null}
            </View>

            {/* Benefits list */}
            {benefits.length > 0 ? (
              <View style={styles.benefits}>
                {benefits.map(b => (
                  <View key={b.key} style={styles.benefitRow}>
                    <View style={styles.checkCircle}>
                      <Feather name="check" size={11} color={color.accent.primary} strokeWidth={3} />
                    </View>
                    <Text style={styles.benefitLabel}>{b.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Pricing */}
            {pricingLine ? (
              <Text style={styles.pricing}>{pricingLine}</Text>
            ) : null}

            {/* CTAs */}
            <View style={styles.actions}>
              {primaryAction ? (
                <Pressable
                  onPress={primaryAction.onPress}
                  disabled={primaryAction.disabled}
                  accessibilityLabel={primaryAction.accessibilityLabel ?? primaryAction.label}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !!primaryAction.disabled }}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.btnPrimary,
                    pressed && styles.btnPrimaryPressed,
                    primaryAction.disabled && styles.btnDisabled,
                  ]}
                >
                  <Text style={styles.btnPrimaryLabel}>{primaryAction.label}</Text>
                </Pressable>
              ) : null}
              {secondaryAction ? (
                <Pressable
                  onPress={secondaryAction.onPress}
                  disabled={secondaryAction.disabled}
                  accessibilityLabel={secondaryAction.accessibilityLabel ?? secondaryAction.label}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !!secondaryAction.disabled }}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.btnSecondary,
                    pressed && styles.btnSecondaryPressed,
                    secondaryAction.disabled && styles.btnDisabled,
                  ]}
                >
                  <Text style={styles.btnSecondaryLabel}>{secondaryAction.label}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdropFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.background.overlay,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: elevation.modal,
    borderRadius: MODAL.RADIUS,
    borderWidth: 1,
    borderColor: color.accent.muted,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  banner: {
    height: MODAL.PREMIUM_BANNER_H,
    backgroundColor: color.accent.muted,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: color.accent.muted,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: MODAL.RADIUS_PILL,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    padding: MODAL.PAD_MODAL,
    gap: 16,
  },
  headingGroup: {
    gap: 5,
    alignItems: 'center',
  },
  overline: {
    fontSize: 11,
    fontWeight: '500',
    color: color.accent.primary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: color.text.primary,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  benefits: {
    gap: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  checkCircle: {
    width: MODAL.ICON_CHECK_PREMIUM,
    height: MODAL.ICON_CHECK_PREMIUM,
    borderRadius: MODAL.RADIUS_PILL,
    backgroundColor: color.accent.glow,
    borderWidth: 1,
    borderColor: color.accent.muted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  benefitLabel: {
    fontSize: 14,
    color: color.text.primary,
  },
  pricing: {
    fontSize: 14,
    color: color.text.secondary,
    textAlign: 'center',
  },
  actions: {
    gap: 8,
  },
  btn: {
    height: MODAL.BTN_H,
    borderRadius: MODAL.RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: color.accent.primary,
  },
  btnPrimaryPressed: {
    backgroundColor: color.accent.highlight,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
  },
  btnSecondaryPressed: {
    opacity: 0.6,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnPrimaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.inverse,
  },
  btnSecondaryLabel: {
    fontSize: 14,
    color: color.text.secondary,
  },
})
