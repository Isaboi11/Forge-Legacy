/**
 * Unassigned — not yet in the CLA-Cxx registry (Component-Library-Architecture-v1.0.md)
 * Tier: 2 (Composite)
 * Spec: Forge Card Library.dc.html §12
 *
 * Wide horizontal info card for promotions, system notices and tips.
 * Anatomy: leading icon box · message (title + subtitle) · optional CTA · dismiss
 * Variants: bronze · info · warning · success · error
 */

import React, { useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { color, space } from '@/constants/tokens'
import { CARD } from './_cardTokens'
import type { BannerVariant } from './types'

export interface BannerCardProps {
  title: string
  subtitle?: string
  ctaLabel?: string
  onCTAPress?: () => void
  onDismiss?: () => void
  /** Custom icon; defaults vary per variant */
  iconName?: React.ComponentProps<typeof Feather>['name']
  variant?: BannerVariant
}

const VARIANT_CONFIG: Record<BannerVariant, {
  icon: React.ComponentProps<typeof Feather>['name']
  accentColor: string
  bgStart: string
  bgEnd: string
  border: string
  iconBg: string
  textColor: string
}> = {
  bronze: {
    icon: 'star',
    accentColor: '#DFC49A',
    bgStart: 'rgba(200,169,126,0.10)',
    bgEnd: 'rgba(200,169,126,0.02)',
    border: 'rgba(200,169,126,0.40)',
    iconBg: 'radial-gradient(#DFC49A,#765B44)' ,
    textColor: '#DFC49A',
  },
  info: {
    icon: 'info',
    accentColor: color.info,
    bgStart: CARD.BANNER_INFO_BG,
    bgEnd: 'rgba(74,124,160,0)',
    border: CARD.BANNER_INFO_BORDER,
    iconBg: CARD.BANNER_INFO_ICON_BG,
    textColor: color.info,
  },
  warning: {
    icon: 'alert-triangle',
    accentColor: color.warning,
    bgStart: CARD.BANNER_WARNING_BG,
    bgEnd: 'rgba(200,169,126,0)',
    border: CARD.BANNER_WARNING_BORDER,
    iconBg: 'rgba(200,169,126,0.18)',
    textColor: color.warning,
  },
  success: {
    icon: 'check-circle',
    accentColor: color.success,
    bgStart: CARD.BANNER_SUCCESS_BG,
    bgEnd: 'rgba(90,158,104,0)',
    border: CARD.BANNER_SUCCESS_BORDER,
    iconBg: 'rgba(90,158,104,0.18)',
    textColor: color.success,
  },
  error: {
    icon: 'alert-circle',
    accentColor: color.danger,
    bgStart: CARD.BANNER_ERROR_BG,
    bgEnd: 'rgba(168,82,82,0)',
    border: CARD.BANNER_ERROR_BORDER,
    iconBg: 'rgba(168,82,82,0.18)',
    textColor: color.danger,
  },
}

export function BannerCard({
  title,
  subtitle,
  ctaLabel,
  onCTAPress,
  onDismiss,
  iconName,
  variant = 'info',
}: BannerCardProps) {
  const [dismissed, setDismissed] = useState(false)
  const cfg = VARIANT_CONFIG[variant]
  const icon = iconName ?? cfg.icon

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <View style={[styles.base, { borderColor: cfg.border }]}>
      {/* Gradient tint overlay */}
      <LinearGradient
        colors={[cfg.bgStart, cfg.bgEnd]}
        locations={[0, 0.60]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Inner top highlight */}
      <View style={styles.topHighlight} pointerEvents="none" />

      {/* Leading icon */}
      <View style={[styles.iconBox, { backgroundColor: cfg.iconBg }]}>
        {variant === 'bronze' ? (
          <Feather name={icon} size={22} color={color.text.inverse} />
        ) : (
          <Feather name={icon} size={22} color={cfg.accentColor} />
        )}
      </View>

      {/* Message */}
      <View style={styles.message}>
        <Text style={[styles.title, { color: cfg.textColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
        ) : null}
        {ctaLabel ? (
          <TouchableOpacity onPress={onCTAPress} style={styles.ctaRow}>
            <Text style={[styles.ctaLabel, { color: cfg.accentColor }]}>{ctaLabel}</Text>
            <Feather name="arrow-right" size={12} color={cfg.accentColor} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Dismiss */}
      <Pressable onPress={handleDismiss} hitSlop={10} style={styles.dismiss}>
        <Feather name="x" size={16} color={color.text.tertiary} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: CARD.RADIUS,
    padding: CARD.PADDING,
    backgroundColor: color.background.surface,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: CARD.INNER_HIGHLIGHT,
  },
  iconBox: {
    width: CARD.ICON_BOX_LARGE,
    height: CARD.ICON_BOX_LARGE,
    borderRadius: CARD.ICON_BOX_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  message: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    color: color.text.secondary,
    lineHeight: 18,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ctaLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  dismiss: {
    padding: 4,
    flexShrink: 0,
  },
})
