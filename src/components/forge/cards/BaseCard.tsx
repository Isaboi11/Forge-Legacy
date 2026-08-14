/**
 * CLA-C07 — BaseCard
 * Tier: 2 (Composite)
 * Spec: Forge Card Library.dc.html §01
 *
 * 7-slot container: leading-icon · title · subtitle · trailing-action
 *                   · body/children · footer · top-edge-highlight
 *
 * Variants: default · elevated · outlined · glowing
 * States: default · pressed · disabled · selected
 */

import React from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
/* `import type` on purpose: `ViewStyle` is a type, and importing a type in value position is
   indistinguishable — to a bundler, a reviewer, or `react-native-web-parity.test.mjs` — from importing a
   runtime binding that react-native-web may not have. Erased either way; only this form says so. */
import type { ViewStyle } from 'react-native'
import { color, shadow, space } from '@/constants/tokens'
import { CARD } from './_cardTokens'
import type { BaseCardProps } from './types'

export type { BaseCardProps }

export function BaseCard({
  variant = 'default',
  title,
  subtitle,
  leadingIcon,
  trailingAction,
  footer,
  children,
  onPress,
  onLongPress,
  disabled = false,
  selected = false,
  style,
  minHeight = CARD.MIN_HEIGHT_BASE,
  accessibilityLabel,
  accessibilityHint,
}: BaseCardProps) {
  const hasHeader = !!(leadingIcon || title || subtitle || trailingAction)

  const borderColor: string = selected
    ? color.accent.primary
    : variant === 'glowing'
    ? CARD.BORDER_GLOW
    : CARD.BORDER

  const depthShadow: ViewStyle =
    variant === 'elevated' ? (shadow.elevated as ViewStyle)
    : variant === 'outlined' ? {}
    : (shadow.card as ViewStyle)

  const glowStyle: ViewStyle | undefined = variant === 'glowing' ? {
    shadowColor: CARD.BRONZE_SHADOW,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  } : undefined

  const isInteractive = !!(onPress || onLongPress)

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled || !isInteractive}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={isInteractive ? 'button' : undefined}
      style={({ pressed }) => [
        styles.base,
        depthShadow,
        glowStyle,
        { borderColor, minHeight },
        pressed && isInteractive && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {/* Inner top-edge highlight — approximates CSS inset 0 1px 0 rgba(255,255,255,0.05) */}
      <View style={styles.topHighlight} pointerEvents="none" />

      {hasHeader && (
        <View style={styles.header}>
          {leadingIcon && (
            <View style={styles.iconBox}>{leadingIcon}</View>
          )}
          <View style={styles.headerText}>
            {title ? <Text style={styles.title} numberOfLines={2}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
          {trailingAction}
        </View>
      )}

      {children}

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: CARD.RADIUS,
    padding: CARD.PADDING,
    backgroundColor: color.background.surface,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: CARD.INNER_HIGHLIGHT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.sm,
  },
  iconBox: {
    width: CARD.ICON_BOX_SIZE,
    height: CARD.ICON_BOX_SIZE,
    borderRadius: CARD.ICON_BOX_RADIUS,
    backgroundColor: color.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.30,
    shadowRadius: 3,
    elevation: 2,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: color.text.primary,
    letterSpacing: -0.1,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    color: color.text.secondary,
    lineHeight: 20,
  },
  footer: {
    marginTop: space.sm,
  },
  pressed: {
    opacity: 0.80,
  },
  disabled: {
    opacity: 0.45,
  },
})
