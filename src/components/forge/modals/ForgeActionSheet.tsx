/**
 * ForgeActionSheet
 * Spec: Forge Modal Library.dc.html Â§05
 *
 * Contextual list of operations on a single object.
 * Destructive actions sit last, separated by a divider.
 * A standalone Cancel row always closes it.
 */

import React, { useCallback, useEffect, useState } from 'react'
import {
  Animated,
  Easing,
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
import { useOverlayTransition } from './_useOverlayTransition'
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

  // Spec §14: action sheet 200ms ease-out (translateY 24 → 0, fade)
  const { backdrop, panel, rendered } = useOverlayTransition(visible, {
    enterDuration: MODAL.DUR_ACTION,
  })

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
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
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
        onPress={onClose}
        accessibilityLabel="Close"
        accessibilityRole="button"
      />

      {/* Panels */}
      <Animated.View
        style={[
          styles.panels,
          { paddingBottom: insets.bottom + 8 },
          {
            opacity: panel,
            transform: [
              { translateY: panel.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            ],
          },
        ]}
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
            <StaggerIn key={item.key} visible={visible} index={i}>
              <ActionItem
                item={item}
                onPress={handleItem}
                isLast={i === normalItems.length - 1 && destructiveItems.length === 0}
              />
            </StaggerIn>
          ))}

          {/* Separator before destructive */}
          {destructiveItems.length > 0 && normalItems.length > 0 ? (
            <View style={styles.separator} />
          ) : null}

          {/* Destructive items */}
          {destructiveItems.map((item, i) => (
            <StaggerIn key={item.key} visible={visible} index={normalItems.length + i}>
              <ActionItem
                item={item}
                onPress={handleItem}
                isLast={i === destructiveItems.length - 1}
              />
            </StaggerIn>
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
      </Animated.View>
    </Modal>
  )
}

/** Spec §14 — options stagger in under 40ms each */
function StaggerIn({
  visible,
  index,
  children,
}: {
  visible: boolean
  index: number
  children: React.ReactNode
}) {
  const [opacity] = useState(() => new Animated.Value(0))

  useEffect(() => {
    if (visible) {
      opacity.setValue(0)
      Animated.timing(opacity, {
        toValue: 1,
        duration: MODAL.DUR_ACTION,
        delay: index * MODAL.STAGGER_ACTION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start()
    }
  }, [visible, index, opacity])

  return <Animated.View style={{ opacity }}>{children}</Animated.View>
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
  backdropFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.background.overlay,
  },
  backdrop: {
    flex: 1,
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
