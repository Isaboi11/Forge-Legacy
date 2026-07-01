/**
 * ForgeActionSheet
 * Spec: Forge Modal Library.dc.html Â§05
 *
 * Contextual list of operations on a single object.
 * Destructive actions sit last, separated by a divider.
 * A standalone Cancel row always closes it.
 */

import React, { useCallback } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import { MODAL } from './_modalTokens'
import type { ActionSheetItem, ActionItemVariant, ForgeActionSheetProps } from './types'

export function ForgeActionSheet({
  visible,
  onClose,
  title,
  items,
  cancelLabel = 'Cancel',
  accessibilityLabel = 'Action sheet',
}: ForgeActionSheetProps) {
  const insets = useSafeAreaInsets()

  const handleItem = useCallback((item: ActionSheetItem) => {
    if (item.variant === 'disabled') return
    onClose()
    item.onPress?.()
  }, [onClose])

  // Group: normal/selected items first, then destructive last
  const normalItems  = items.filter(i => i.variant !== 'destructive')
  const destructiveItems = items.filter(i => i.variant === 'destructive')

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      {/* Backdrop */}
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Close"
        accessibilityRole="button"
      />

      {/* Panels */}
      <View
        style={[styles.panels, { paddingBottom: insets.bottom + 8 }]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="menu"
      >
        {/* Main panel */}
        <View style={styles.panel}>
          {/* Context title */}
          {title ? (
            <View style={styles.titleRow}>
              <Text style={styles.titleText}>{title}</Text>
            </View>
          ) : null}

          {/* Normal items */}
          {normalItems.map((item, i) => (
            <ActionItem
              key={item.key}
              item={item}
              onPress={handleItem}
              isLast={i === normalItems.length - 1 && destructiveItems.length === 0}
            />
          ))}

          {/* Separator before destructive */}
          {destructiveItems.length > 0 && normalItems.length > 0 ? (
            <View style={styles.separator} />
          ) : null}

          {/* Destructive items */}
          {destructiveItems.map((item, i) => (
            <ActionItem
              key={item.key}
              item={item}
              onPress={handleItem}
              isLast={i === destructiveItems.length - 1}
            />
          ))}
        </View>

        {/* Cancel panel */}
        <Pressable
          onPress={onClose}
          accessibilityLabel={cancelLabel}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancelPanel, pressed && styles.cancelPressed]}
        >
          <Text style={styles.cancelLabel}>{cancelLabel}</Text>
        </Pressable>
      </View>
    </Modal>
  )
}

function ActionItem({
  item,
  onPress,
  isLast,
}: {
  item: ActionSheetItem
  onPress: (item: ActionSheetItem) => void
  isLast: boolean
}) {
  const isDestructive = item.variant === 'destructive'
  const isSelected    = item.variant === 'selected'
  const isDisabled    = item.variant === 'disabled'

  const textColor = isDestructive ? color.danger
    : isSelected ? color.accent.primary
    : isDisabled ? color.text.tertiary
    : color.text.primary

  return (
    <Pressable
      onPress={() => onPress(item)}
      disabled={isDisabled}
      accessibilityLabel={item.label}
      accessibilityRole="menuitem"
      accessibilityState={{ disabled: isDisabled, selected: isSelected }}
      style={({ pressed }) => [
        styles.item,
        !isLast && styles.itemBorder,
        pressed && !isDisabled && styles.itemPressed,
        isDisabled && styles.itemDisabled,
      ]}
    >
      {item.iconName ? (
        <Feather
          name={item.iconName as 'edit'}
          size={20}
          color={isDestructive ? color.danger : isSelected ? color.accent.primary : color.text.secondary}
        />
      ) : null}
      <Text style={[styles.itemLabel, { color: textColor }]}>
        {item.label}
      </Text>
    </Pressable>
  )
}

// Type reference
void (undefined as unknown as ActionItemVariant)

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.background.overlay,
  },
  panels: {
    paddingHorizontal: 8,
    gap: 8,
  },
  panel: {
    backgroundColor: color.background.elevated,
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: MODAL.RADIUS_SHEET,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  titleRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: color.border.subtle,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 12,
    color: color.text.tertiary,
  },
  separator: {
    height: 1,
    backgroundColor: color.border.subtle,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: color.border.subtle,
  },
  itemPressed: {
    backgroundColor: color.innerHighlight,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelPanel: {
    backgroundColor: color.background.elevated,
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: MODAL.RADIUS_SHEET,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cancelPressed: {
    backgroundColor: color.innerHighlight,
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: color.text.primary,
  },
})
