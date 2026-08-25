/**
 * CLA-C08 — Button (v2)
 * Tier: 2 (Composite)
 * Spec: components/Button/Button.jsx (Claude Design)
 *
 * Five roles:
 *  - `primary`     the one sanctioned bronze full-fill (one per screen)
 *  - `secondary`   machined charcoal surface + hairline edge (lower-emphasis)
 *  - `destructive` machined red outline (End Workout, delete confirm)
 *  - `text`        bronze affordance ("View all →", "Manage", "Edit")
 *  - `icon`        square icon-only control (44dp hit target)
 *
 * This is the CLA-C08 slot for the new (Claude Design) visual system —
 * additive to the LEGACY `forge/buttons` library, which stays in place until
 * every consuming screen migrates. New screens (Home v2 on) import this one.
 */

import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { flColor, flGradient, flRadius, flShadow } from '@/constants/foundation'

const DISABLED_FILL_COLORS = ['#1C1E22', '#15171B'] as const

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'text' | 'icon'

/**
 * `lg` — the hero CTA metrics: 64dp tall, 17px label, 2.4px tracking, 14 radius.
 *
 * ⚠ A SIZE, NOT A SECOND BUTTON. `Forge Workout Entry.dc.html` §7 specifies a CTA at those numbers, and
 * the alternative was hand-rolling `flGradient.bronzeFill` in that screen — which §7 itself forbids
 * ("the design system's single sanctioned bronze fill"). A screen that needs a bigger button asks for a
 * bigger button; it does not get its own copy of the fill, the rim and the glow to drift away from.
 *
 * Applies to the filled variants only. `secondary`/`text`/`icon` ignore it — nothing has asked, and a
 * size that silently does nothing on three of five roles is worse than one that is scoped.
 */
export type ButtonSize = 'md' | 'lg'

export interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: React.ReactNode
  trailingIcon?: React.ReactNode
  fullWidth?: boolean
  disabled?: boolean
  onPress?: () => void
  children?: React.ReactNode
  accessibilityLabel?: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon = null,
  trailingIcon = null,
  fullWidth = false,
  disabled = false,
  onPress,
  children,
  accessibilityLabel,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false)

  const hasLabel = variant !== 'icon' && children != null
  const lg = size === 'lg'

  if (variant === 'primary' || variant === 'destructive') {
    const isPrimary = variant === 'primary'
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={fullWidth ? styles.fullWidth : undefined}
      >
        {isPrimary ? (
          <LinearGradient
            colors={disabled ? DISABLED_FILL_COLORS : (pressed ? flGradient.bronzeFillPressed.colors : flGradient.bronzeFill.colors)}
            locations={disabled ? undefined : flGradient.bronzeFill.locations}
            start={flGradient.bronzeFill.start}
            end={flGradient.bronzeFill.end}
            style={[
              styles.base,
              styles.filled,
              lg && styles.filledLg,
              fullWidth && styles.fullWidth,
              {
                borderColor: disabled ? 'rgba(150, 140, 122, 0.22)' : flColor.bronzeBorder,
                boxShadow: disabled ? undefined : flShadow.buttonPrimary,
              },
            ]}
          >
            {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
            {hasLabel ? (
              <Text style={[styles.filledLabel, lg && styles.filledLabelLg, { color: disabled ? 'rgba(240,237,232,0.42)' : flColor.onBronze }]}>{children}</Text>
            ) : null}
            {trailingIcon ? <View style={styles.iconWrap}>{trailingIcon}</View> : null}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.base,
              styles.filled,
              fullWidth && styles.fullWidth,
              {
                backgroundColor: '#171111',
                borderColor: disabled ? 'rgba(120, 74, 70, 0.30)' : 'rgba(150, 74, 66, 0.72)',
              },
            ]}
          >
            {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
            {hasLabel ? (
              <Text style={[styles.filledLabel, { color: disabled ? 'rgba(190, 90, 76, 0.34)' : flColor.redMuted }]}>{children}</Text>
            ) : null}
            {trailingIcon ? <View style={styles.iconWrap}>{trailingIcon}</View> : null}
          </View>
        )}
      </Pressable>
    )
  }

  if (variant === 'secondary') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.base,
          styles.secondary,
          fullWidth && styles.fullWidth,
          {
            backgroundColor: disabled ? flColor.charcoal800 : flColor.charcoal700,
            borderColor: disabled ? flColor.charcoal600 : flColor.charcoal500,
            boxShadow: `inset 0 1px 0 ${flColor.innerHighlight}`,
          },
        ]}
      >
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        {hasLabel ? (
          <Text style={[styles.secondaryLabel, { color: disabled ? 'rgba(240,237,232,0.34)' : flColor.cream100 }]}>{children}</Text>
        ) : null}
        {trailingIcon ? <View style={styles.iconWrap}>{trailingIcon}</View> : null}
      </Pressable>
    )
  }

  if (variant === 'icon') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.iconButton,
          {
            backgroundColor: flColor.charcoal700,
            borderColor: flColor.charcoal500,
          },
        ]}
      >
        {icon}
      </Pressable>
    )
  }

  // text
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} disabled={disabled} onPress={onPress} style={styles.textBtn}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      {hasLabel ? <Text style={[styles.textLabel, { color: disabled ? 'rgba(219, 170, 104, 0.4)' : flColor.bronze400 }]}>{children}</Text> : null}
      {trailingIcon ? <View style={styles.iconWrap}>{trailingIcon}</View> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: flRadius.md,
    borderWidth: 1,
  },
  filled: {
    paddingVertical: 15,
    paddingHorizontal: 26,
  },
  filledLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  /** `size="lg"` — the hero CTA. Height rather than padding, so the 64 is the 64 the design names. */
  filledLg: { height: 64, paddingVertical: 0, paddingHorizontal: 22, gap: 16, borderRadius: 14 },
  filledLabelLg: { fontSize: 17, letterSpacing: 2.4 },
  secondary: {
    paddingVertical: 14,
    paddingHorizontal: 26,
  },
  secondaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  iconButton: {
    width: 44,
    height: 44,
    minWidth: 44,
    borderRadius: flRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignSelf: 'flex-start',
  },
  textLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  iconWrap: {
    flexShrink: 0,
  },
  fullWidth: {
    width: '100%',
    alignSelf: 'stretch',
  },
})
