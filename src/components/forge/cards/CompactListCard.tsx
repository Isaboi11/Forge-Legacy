/**
 * Unassigned — not yet in the CLA-Cxx registry (Component-Library-Architecture-v1.0.md);
 * conceptually related to CLA-C16 ListItem, but not a confirmed mapping.
 * Tier: 2 (Composite)
 * Spec: Forge Card Library.dc.html §10
 *
 * Small row/card hybrid for lists and settings.
 * Anatomy: leading icon/avatar · title · subtitle · trailing slot
 * Trailing variants: chevron · badge · toggle · checkbox · button · number
 * States: default · disabled · selected · destructive
 */

import React from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color, space, size } from '@/constants/tokens'
import { ForgeToggle } from '../inputs/ForgeToggle'
import { ForgeCheckbox } from '../inputs/ForgeCheckbox'
import { CARD } from './_cardTokens'
import type { CompactTrailingVariant } from './types'

export interface CompactListCardProps {
  title: string
  subtitle?: string
  /** Feather icon name for the leading icon box */
  iconName?: React.ComponentProps<typeof Feather>['name']
  /** URI for avatar image (renders circle instead of icon box) */
  avatarInitials?: string
  trailingVariant?: CompactTrailingVariant
  /** Used for badge variant */
  badgeLabel?: string
  /** Used for toggle variant */
  toggleValue?: boolean
  onToggleChange?: (value: boolean) => void
  /** Used for checkbox variant */
  checkboxChecked?: boolean
  onCheckboxChange?: (checked: boolean) => void
  /** Used for button variant */
  buttonLabel?: string
  onButtonPress?: () => void
  /** Used for number variant */
  numberValue?: string | number
  onPress?: () => void
  disabled?: boolean
  destructive?: boolean
  selected?: boolean
}

export function CompactListCard({
  title,
  subtitle,
  iconName,
  avatarInitials,
  trailingVariant = 'chevron',
  badgeLabel,
  toggleValue,
  onToggleChange,
  checkboxChecked,
  onCheckboxChange,
  buttonLabel,
  onButtonPress,
  numberValue,
  onPress,
  disabled = false,
  destructive = false,
  selected = false,
}: CompactListCardProps) {
  const titleColor: string = destructive ? color.destructive : color.text.primary
  const borderColor: string = selected ? color.accent.primary : CARD.BORDER

  const trailing = (() => {
    switch (trailingVariant) {
      case 'chevron':
        return <Feather name="chevron-right" size={size.iconInline} color={color.text.tertiary} />

      case 'badge':
        return badgeLabel ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
        ) : null

      case 'toggle':
        return (
          <ForgeToggle
            value={toggleValue ?? false}
            onChange={onToggleChange}
            disabled={disabled}
          />
        )

      case 'checkbox':
        return (
          <ForgeCheckbox
            checked={checkboxChecked ?? false}
            onChange={onCheckboxChange}
            disabled={disabled}
          />
        )

      case 'button':
        return buttonLabel ? (
          <Pressable onPress={onButtonPress} disabled={disabled} style={styles.inlineBtn}>
            <Text style={styles.inlineBtnLabel}>{buttonLabel}</Text>
          </Pressable>
        ) : null

      case 'number':
        return numberValue !== undefined ? (
          <Text style={styles.numberValue}>{numberValue}</Text>
        ) : null

      default:
        return null
    }
  })()

  const isInteractive = !!(onPress) &&
    trailingVariant !== 'toggle' &&
    trailingVariant !== 'checkbox'

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={disabled || !isInteractive}
      style={({ pressed }) => [
        styles.base,
        { borderColor },
        pressed && isInteractive && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.topHighlight} pointerEvents="none" />

      {/* Leading */}
      {avatarInitials ? (
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{avatarInitials.slice(0, 2).toUpperCase()}</Text>
        </View>
      ) : iconName ? (
        <View style={styles.iconBox}>
          <Feather name={iconName} size={size.iconCard} color={color.text.secondary} />
        </View>
      ) : null}

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>

      {/* Trailing */}
      {trailing}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: CARD.RADIUS,
    paddingVertical: space.md,
    paddingHorizontal: CARD.PADDING,
    backgroundColor: color.background.surface,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: CARD.MIN_HEIGHT_COMPACT,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
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
    width: CARD.AVATAR_SIZE,
    height: CARD.AVATAR_SIZE,
    borderRadius: CARD.ICON_BOX_RADIUS,
    backgroundColor: color.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarCircle: {
    width: CARD.AVATAR_SIZE,
    height: CARD.AVATAR_SIZE,
    borderRadius: 9999,
    backgroundColor: color.info,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: color.text.primary,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: color.text.primary,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    color: color.text.secondary,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CARD.CHIP_RADIUS,
    backgroundColor: color.accent.primary,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: color.text.inverse,
  },
  inlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CARD.BORDER,
  },
  inlineBtnLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: color.text.primary,
  },
  numberValue: {
    fontSize: 15,
    fontWeight: '500',
    color: color.text.secondary,
  },
  pressed: {
    opacity: 0.80,
  },
  disabled: {
    opacity: 0.45,
  },
})
