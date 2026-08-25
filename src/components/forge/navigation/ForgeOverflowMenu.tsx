/**
 * ForgeOverflowMenu
 * Spec: Forge Navigation Library.dc.html §10
 *
 * Secondary actions tucked behind an overflow affordance.
 * Supports dropdown (rendered via Modal for z-index safety) and bottom-sheet panel.
 * Selected item: bronze. Destructive item: crimson. Normal: white. Disabled: dimmed.
 */

import React, { useCallback, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import { NAV } from './_navigationTokens'
import type { ForgeOverflowMenuProps, MenuItem, MenuItemVariant } from './types'
import { useSheetDrag } from '@/hooks/useSheetDrag'

export function ForgeOverflowMenu({
  items,
  triggerStyle = 'dotsVertical',
  triggerLabel = 'More',
  placement = 'dropdown',
  accessibilityLabel = 'More options',
}: ForgeOverflowMenuProps) {
  const [visible, setVisible] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const triggerRef = useRef<View>(null)

  const openMenu = useCallback(() => {
    if (placement === 'dropdown') {
      triggerRef.current?.measureInWindow((x, y, w, h) => {
        const screenW = Dimensions.get('window').width
        setDropdownPos({ top: y + h + 4, right: screenW - x - w })
      })
    }
    setVisible(true)
  }, [placement])

  const closeMenu = useCallback(() => setVisible(false), [])
  const drag = useSheetDrag({ onClose: closeMenu })

  const handleItem = useCallback((item: MenuItem) => {
    if (item.variant === 'disabled') return
    closeMenu()
    item.onPress?.()
  }, [closeMenu])

  return (
    <>
      {/* Trigger */}
      <View ref={triggerRef}>
        <Trigger
          style={triggerStyle}
          label={triggerLabel}
          onPress={openMenu}
          accessibilityLabel={accessibilityLabel}
        />
      </View>

      {/* Menu panel */}
      {placement === 'dropdown' ? (
        <Modal
          visible={visible}
          transparent
          animationType="none"
          onRequestClose={closeMenu}
          statusBarTranslucent
        >
          {/* Dismiss backdrop */}
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} accessibilityLabel="Close menu" />
          <View style={[styles.dropdown, { top: dropdownPos.top, right: dropdownPos.right }]}>
            {_renderItems(items, handleItem)}
          </View>
        </Modal>
      ) : (
        /* Bottom Sheet */
        <Modal
          visible={visible}
          transparent
          animationType="slide"
          onRequestClose={closeMenu}
          statusBarTranslucent
        >
          <Pressable style={styles.sheetBackdrop} onPress={closeMenu} accessibilityLabel="Close menu" />
          <Animated.View onLayout={drag.onLayout} style={[styles.sheet, drag.style]}>
            {/* The grabber grabs — see `useSheetDrag`. */}
            <View style={styles.sheetHandleRow} {...drag.panHandlers}>
              <View style={styles.sheetHandle} />
            </View>
            {_renderItems(items, handleItem, true)}
          </Animated.View>
        </Modal>
      )}
    </>
  )
}

// ── Trigger button ───────────────────────────────────────────────────────────

function Trigger({
  style,
  label,
  onPress,
  accessibilityLabel,
}: {
  style: ForgeOverflowMenuProps['triggerStyle']
  label: string
  onPress: () => void
  accessibilityLabel: string
}) {
  if (style === 'dropdownButton') {
    return (
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.triggerPressed]}
      >
        <Text style={styles.dropdownTriggerLabel}>{label}</Text>
        <Feather name="chevron-down" size={18} color={color.text.primary} />
      </Pressable>
    )
  }

  const iconName = style === 'dotsHorizontal' ? 'more-horizontal' : 'more-vertical'
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={({ pressed }) => [styles.dotsTrigger, pressed && styles.triggerPressed]}
    >
      <Feather name={iconName} size={NAV.ICON_TOP} color={color.text.primary} />
    </Pressable>
  )
}

// ── Menu items ────────────────────────────────────────────────────────────────

function _renderItems(
  items: MenuItem[],
  onPress: (item: MenuItem) => void,
  isSheet = false,
) {
  const grouped: (MenuItem | 'separator')[] = []
  items.forEach((item, i) => {
    if (i > 0 && item.variant === 'destructive' && items[i - 1].variant !== 'destructive') {
      grouped.push('separator')
    }
    grouped.push(item)
  })

  return grouped.map((entry, i) => {
    if (entry === 'separator') {
      return <View key={`sep-${i}`} style={styles.separator} />
    }
    return (
      <MenuItemRow
        key={entry.key}
        item={entry}
        onPress={onPress}
        isSheet={isSheet}
      />
    )
  })
}

function MenuItemRow({
  item,
  onPress,
  isSheet,
}: {
  item: MenuItem
  onPress: (item: MenuItem) => void
  isSheet: boolean
}) {
  const isSelected    = item.variant === 'selected'
  const isDestructive = item.variant === 'destructive'
  const isDisabled    = item.variant === 'disabled'

  const textColor = isSelected ? color.accent.primary
    : isDestructive ? color.destructive
    : isDisabled ? color.text.tertiary
    : color.text.primary

  const itemHeight = isSheet ? NAV.HEIGHT_SHEET_ITEM : NAV.HEIGHT_MENU_ITEM

  return (
    <Pressable
      onPress={() => onPress(item)}
      disabled={isDisabled}
      accessibilityLabel={item.label}
      accessibilityRole="menuitem"
      accessibilityState={{ disabled: isDisabled, selected: isSelected }}
      style={({ pressed }) => [
        styles.menuItem,
        { minHeight: itemHeight },
        isSelected && styles.menuItemSelected,
        isDestructive && pressed && styles.menuItemDestructivePressed,
        !isSelected && !isDestructive && pressed && styles.menuItemPressed,
        isDisabled && styles.menuItemDisabled,
      ]}
    >
      {item.iconName ? (
        <Feather
          name={item.iconName as 'edit'}
          size={NAV.ICON_MENU}
          color={isSelected ? color.accent.primary : isDestructive ? color.destructive : color.text.secondary}
        />
      ) : null}
      <Text style={[styles.menuLabel, { color: textColor }]}>{item.label}</Text>
    </Pressable>
  )
}

// Type reference
void (undefined as unknown as MenuItemVariant)

const styles = StyleSheet.create({
  // Trigger
  dotsTrigger: {
    width: 44,
    height: 44,
    borderRadius: NAV.RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownTrigger: {
    height: 44,
    paddingLeft: 14,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: color.border.subtle,
    backgroundColor: color.background.elevated,
    borderRadius: NAV.RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropdownTriggerLabel: {
    fontSize: 14,
    color: color.text.primary,
  },
  triggerPressed: {
    backgroundColor: color.innerHighlight,
  },
  // Dropdown panel
  dropdown: {
    position: 'absolute',
    width: 220,
    backgroundColor: NAV.MENU_BG,
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: NAV.RADIUS,
    shadowColor: NAV.MENU_SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
    padding: 6,
  },
  // Bottom sheet panel
  sheetBackdrop: {
    flex: 1,
    backgroundColor: color.background.overlay,
  },
  sheet: {
    backgroundColor: NAV.MENU_BG,
    borderTopWidth: 1,
    borderTopColor: color.innerHighlightMd,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 8,
    paddingBottom: 16,
    shadowColor: NAV.MENU_SHADOW_COLOR,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  sheetHandleRow: { alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
  sheetHandle: {
    width: NAV.HANDLE_W,
    height: NAV.HANDLE_H,
    borderRadius: NAV.RADIUS_PILL,
    backgroundColor: '#2C2C36',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  menuItemSelected: {
    backgroundColor: color.accent.glow,
  },
  menuItemPressed: {
    backgroundColor: color.innerHighlight,
  },
  menuItemDestructivePressed: {
    backgroundColor: 'rgba(168,82,82,0.10)',
  },
  menuItemDisabled: {
    opacity: 0.45,
  },
  menuLabel: {
    fontSize: 15,
  },
  // Separator
  separator: {
    height: 1,
    backgroundColor: color.border.subtle,
    marginVertical: 6,
    marginHorizontal: 4,
  },
})
