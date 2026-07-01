/**
 * ForgeTopBar
 * Spec: Forge Navigation Library.dc.html §02
 *
 * The screen header — one component, six configurations.
 * Handles safe-area top inset internally.
 */

import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color, space } from '@/constants/tokens'
import { NAV } from './_navigationTokens'
import { ForgeBackButton } from './ForgeBackButton'
import type { ForgeTopBarProps } from './types'

export function ForgeTopBar({
  variant = 'default',
  title,
  subtitle,
  overline,
  leadingAction,
  trailingActions = [],
  showAvatar = false,
  showSearch = false,
  showNotification = false,
  notificationCount,
  loading = false,
  cancelLabel = 'Cancel',
  saveLabel = 'Save',
  onCancel,
  onSave,
  accessibilityLabel,
}: ForgeTopBarProps) {
  const insets = useSafeAreaInsets()
  const topInset = insets.top

  // ── Modal variant ────────────────────────────────────────────────────────
  if (variant === 'modal') {
    return (
      <View
        style={styles.modalContainer}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="header"
      >
        <View style={styles.modalHandle} />
        <View style={styles.modalRow}>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.modalAction, pressed && styles.iconPressed]}
            accessibilityLabel={cancelLabel}
            accessibilityRole="button"
          >
            <Text style={styles.modalCancel}>{cancelLabel}</Text>
          </Pressable>
          {title ? (
            <Text style={styles.modalTitle} numberOfLines={1}>{title}</Text>
          ) : null}
          <Pressable
            onPress={onSave}
            style={({ pressed }) => [styles.modalAction, pressed && styles.iconPressed]}
            accessibilityLabel={saveLabel}
            accessibilityRole="button"
          >
            <Text style={styles.modalSave}>{saveLabel}</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // ── Transparent variant ──────────────────────────────────────────────────
  if (variant === 'transparent') {
    return (
      <View
        style={[styles.transparentContainer, { paddingTop: topInset }]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="header"
      >
        <View style={styles.transparentRow}>
          {leadingAction ? (
            <ForgeBackButton variant="circular" onPress={leadingAction.onPress} accessibilityLabel={leadingAction.accessibilityLabel} />
          ) : null}
          <View style={styles.flex} />
          {trailingActions.map(action => (
            <Pressable
              key={action.iconName}
              onPress={action.onPress}
              accessibilityLabel={action.accessibilityLabel}
              accessibilityRole="button"
              style={({ pressed }) => [styles.circularBtn, pressed && styles.circularBtnPressed]}
            >
              <Feather name={action.iconName as 'search'} size={NAV.ICON_TOP} color={color.text.primary} />
            </Pressable>
          ))}
        </View>
      </View>
    )
  }

  // ── Collapsed / scrolled variant ─────────────────────────────────────────
  if (variant === 'collapsed') {
    return (
      <View
        style={[styles.collapsedContainer, { paddingTop: topInset }]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="header"
      >
        <View style={styles.collapsedRow}>
          {leadingAction ? (
            <Pressable
              onPress={leadingAction.onPress}
              accessibilityLabel={leadingAction.accessibilityLabel}
              accessibilityRole="button"
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconPressed]}
            >
              <Feather name="chevron-left" size={NAV.ICON_BACK} color={color.text.primary} />
            </Pressable>
          ) : null}
          <View style={styles.flex} />
          {title ? (
            <Text style={styles.collapsedTitle} numberOfLines={1}>{title}</Text>
          ) : null}
          <View style={styles.flex} />
          {_renderTrailing(trailingActions, showSearch, showNotification, notificationCount, loading)}
        </View>
      </View>
    )
  }

  // ── Large Title variant ──────────────────────────────────────────────────
  if (variant === 'largeTitle') {
    return (
      <View
        style={[styles.container, { paddingTop: topInset }]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="header"
      >
        <View style={styles.largeTitleRow}>
          <View style={styles.largeTitleText}>
            {overline ? (
              <Text style={styles.overline} numberOfLines={1}>{overline}</Text>
            ) : null}
            <Text style={styles.largeTitle} numberOfLines={1}>{title}</Text>
          </View>
          {showAvatar ? (
            <View style={styles.avatar}>
              <Feather name="user" size={20} color={color.text.secondary} />
            </View>
          ) : null}
          {_renderTrailing(trailingActions, showSearch, showNotification, notificationCount, loading)}
        </View>
      </View>
    )
  }

  // ── Back Navigation variant ──────────────────────────────────────────────
  if (variant === 'backNavigation') {
    return (
      <View
        style={[styles.container, { paddingTop: topInset }]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="header"
      >
        <View style={[styles.defaultRow, { paddingHorizontal: NAV.PAD_H_SM }]}>
          {leadingAction ? (
            <ForgeBackButton variant="icon" onPress={leadingAction.onPress} accessibilityLabel={leadingAction.accessibilityLabel} />
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
          <View style={styles.centeredTitleBlock}>
            {title ? (
              <Text style={styles.centeredTitle} numberOfLines={1}>{title}</Text>
            ) : null}
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            ) : null}
          </View>
          {_renderTrailing(trailingActions, showSearch, showNotification, notificationCount, loading)}
        </View>
      </View>
    )
  }

  // ── Default variant ──────────────────────────────────────────────────────
  return (
    <View
      style={[styles.container, { paddingTop: topInset }]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="header"
    >
      <View style={styles.defaultRow}>
        {leadingAction ? (
          <ForgeBackButton
            variant={leadingAction.label ? 'iconWithLabel' : 'icon'}
            label={leadingAction.label}
            onPress={leadingAction.onPress}
            accessibilityLabel={leadingAction.accessibilityLabel}
          />
        ) : null}
        {title ? (
          <Text style={styles.defaultTitle} numberOfLines={1}>{title}</Text>
        ) : null}
        <View style={styles.flex} />
        {_renderTrailing(trailingActions, showSearch, showNotification, notificationCount, loading)}
      </View>
    </View>
  )
}

// ── Shared trailing actions renderer ────────────────────────────────────────

function _renderTrailing(
  actions: ForgeTopBarProps['trailingActions'],
  showSearch: boolean,
  showNotification: boolean,
  notificationCount: number | undefined,
  loading: boolean,
) {
  return (
    <View style={styles.trailingRow}>
      {loading && <ActivityIndicator size="small" color={color.accent.primary} />}
      {showSearch && (
        <View style={styles.iconBtn}>
          <Feather name="search" size={NAV.ICON_TOP} color={color.text.primary} />
        </View>
      )}
      {showNotification && (
        <View style={[styles.iconBtn, { position: 'relative' }]}>
          <Feather name="bell" size={NAV.ICON_TOP} color={color.text.primary} />
          {(notificationCount !== undefined && notificationCount > 0) || true ? (
            <View style={styles.dotBadge} />
          ) : null}
        </View>
      )}
      {(actions ?? []).map(action => (
        <Pressable
          key={action.iconName}
          onPress={action.onPress}
          accessibilityLabel={action.accessibilityLabel}
          accessibilityRole="button"
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconPressed]}
        >
          <Feather name={action.iconName as 'more-vertical'} size={NAV.ICON_TOP} color={color.text.primary} />
          {action.badge && <View style={styles.dotBadge} />}
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  // ── Default / backNavigation / largeTitle ──────────────────────────────
  container: {
    backgroundColor: color.background.elevated,
    borderBottomWidth: 1,
    borderBottomColor: color.border.subtle,
  },
  defaultRow: {
    height: NAV.HEIGHT_TOP,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: NAV.PAD_H,
    gap: space.sm,
  },
  defaultTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: color.text.primary,
  },
  centeredTitleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  centeredTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: color.text.primary,
  },
  subtitle: {
    fontSize: 12,
    color: color.text.secondary,
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
  },
  // ── Large Title ──────────────────────────────────────────────────────────
  largeTitleRow: {
    paddingHorizontal: NAV.PAD_H,
    paddingBottom: 14,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  largeTitleText: {
    flex: 1,
    gap: 4,
  },
  overline: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: color.accent.primary,
  },
  largeTitle: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 32,
    color: color.text.primary,
  },
  avatar: {
    width: NAV.AVATAR_SIZE,
    height: NAV.AVATAR_SIZE,
    borderRadius: 9999,
    backgroundColor: color.background.surface,
    borderWidth: 1,
    borderColor: color.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: space.md,
  },
  // ── Trailing actions ────────────────────────────────────────────────────
  trailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: NAV.RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPressed: {
    backgroundColor: color.innerHighlight,
  },
  dotBadge: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: NAV.BADGE_DOT,
    height: NAV.BADGE_DOT,
    borderRadius: NAV.RADIUS_PILL,
    backgroundColor: color.accent.primary,
    borderWidth: 2,
    borderColor: color.background.elevated,
  },
  // ── Modal variant ────────────────────────────────────────────────────────
  modalContainer: {
    backgroundColor: color.background.elevated,
  },
  modalHandle: {
    width: NAV.HANDLE_W,
    height: NAV.HANDLE_H,
    borderRadius: NAV.RADIUS_PILL,
    backgroundColor: color.background.surface,
    alignSelf: 'center',
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  modalRow: {
    height: NAV.HEIGHT_TOP,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  modalAction: {
    minWidth: 44,
    height: 44,
    borderRadius: NAV.RADIUS,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancel: {
    fontSize: 16,
    color: color.text.secondary,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: color.text.primary,
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: color.accent.primary,
  },
  // ── Transparent variant ──────────────────────────────────────────────────
  transparentContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  transparentRow: {
    height: NAV.HEIGHT_TOP,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: space.sm,
  },
  circularBtn: {
    width: 40,
    height: 40,
    borderRadius: 99,
    backgroundColor: NAV.SCRIM_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularBtnPressed: {
    backgroundColor: NAV.SCRIM_BG_PRESSED,
  },
  // ── Collapsed / scrolled ─────────────────────────────────────────────────
  collapsedContainer: {
    backgroundColor: NAV.COLLAPSED_SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: color.border.subtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  collapsedRow: {
    height: NAV.HEIGHT_COLLAPSED,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: NAV.PAD_H_SM,
    gap: space.sm,
  },
  collapsedTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.primary,
  },
  flex: {
    flex: 1,
  },
})
