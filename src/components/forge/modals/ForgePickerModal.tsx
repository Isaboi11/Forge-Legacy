/**
 * ForgePickerModal
 * Spec: Forge Modal Library.dc.html Â§06
 *
 * Search â†’ filter â†’ select â†’ confirm.
 * Layout: fixed header (title + close), search field, filter chips,
 * scrollable item list, pinned confirm button.
 *
 * Used for: Exercise Picker, Date Picker, Program/Goal/Challenge Picker.
 */

import React, { useCallback, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import { MODAL } from './_modalTokens'
import type { ForgePickerModalProps, PickerItem } from './types'

export function ForgePickerModal({
  visible,
  onClose,
  title = 'Select',
  placeholder = 'Searchâ€¦',
  searchValue = '',
  onSearchChange,
  filters = [],
  activeFilter,
  onFilterChange,
  items,
  selectedKeys = [],
  multiSelect = false,
  onSelectionChange,
  confirmLabel = 'Confirm',
  onConfirm,
  accessibilityLabel = 'Picker',
}: ForgePickerModalProps) {
  const insets = useSafeAreaInsets()
  const [localSelected, setLocalSelected] = useState<string[]>(selectedKeys)

  const toggleItem = useCallback((key: string) => {
    setLocalSelected(prev => {
      if (multiSelect) {
        const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        onSelectionChange?.(next)
        return next
      } else {
        const next = [key]
        onSelectionChange?.(next)
        return next
      }
    })
  }, [multiSelect, onSelectionChange])

  const handleConfirm = useCallback(() => {
    onConfirm?.(localSelected)
    onClose()
  }, [localSelected, onConfirm, onClose])

  const confirmText = localSelected.length > 0
    ? `${confirmLabel} (${localSelected.length})`
    : confirmLabel

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <View
        style={[styles.backdrop, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            >
              <Feather name="x" size={12} color={color.text.secondary} />
            </Pressable>
          </View>

          {/* Search + filters */}
          <View style={styles.searchArea}>
            <View style={styles.searchField}>
              <Feather name="search" size={16} color={color.text.tertiary} />
              <TextInput
                value={searchValue}
                onChangeText={onSearchChange}
                placeholder={placeholder}
                placeholderTextColor={color.text.tertiary}
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                accessibilityLabel="Search"
                accessibilityRole="search"
              />
              {searchValue.length > 0 ? (
                <Pressable onPress={() => onSearchChange?.('')} hitSlop={8}>
                  <Feather name="x-circle" size={16} color={color.text.tertiary} />
                </Pressable>
              ) : null}
            </View>

            {filters.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterRow}
                contentContainerStyle={styles.filterContent}
              >
                {filters.map(f => {
                  const isActive = f.key === activeFilter
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => onFilterChange?.(f.key)}
                      accessibilityLabel={f.label}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isActive }}
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                        {f.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>
            ) : null}
          </View>

          {/* Item list */}
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {items.map(item => (
              <PickerRow
                key={item.key}
                item={item}
                isSelected={localSelected.includes(item.key)}
                onPress={toggleItem}
              />
            ))}
          </ScrollView>

          {/* Confirm footer */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleConfirm}
              accessibilityLabel={confirmText}
              accessibilityRole="button"
              style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmBtnPressed]}
            >
              <Text style={styles.confirmLabel}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function PickerRow({
  item,
  isSelected,
  onPress,
}: {
  item: PickerItem
  isSelected: boolean
  onPress: (key: string) => void
}) {
  return (
    <Pressable
      onPress={() => onPress(item.key)}
      accessibilityLabel={item.label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
        isSelected && styles.rowSelected,
      ]}
    >
      {item.iconName ? (
        <Feather
          name={item.iconName as 'activity'}
          size={18}
          color={isSelected ? color.accent.primary : color.text.secondary}
        />
      ) : null}
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}>
          {item.label}
        </Text>
        {item.subtitle ? (
          <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
        ) : null}
      </View>
      {isSelected ? (
        <Feather name="check" size={18} color={color.accent.primary} />
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.background.overlay,
    paddingHorizontal: 16,
  },
  container: {
    flex: 1,
    backgroundColor: color.background.elevated,
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: MODAL.RADIUS_SHEET,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: color.border.subtle,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: color.text.primary,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: MODAL.RADIUS_PILL,
    backgroundColor: color.background.surface,
    borderWidth: 1,
    borderColor: color.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: {
    backgroundColor: color.innerHighlight,
  },
  searchArea: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.border.subtle,
  },
  searchField: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    backgroundColor: color.background.surface,
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: MODAL.RADIUS,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: color.text.primary,
    paddingVertical: 0,
  },
  filterRow: {
    flexGrow: 0,
    marginBottom: 10,
  },
  filterContent: {
    gap: 6,
    paddingRight: 4,
  },
  filterChip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: color.background.surface,
    borderWidth: 1,
    borderColor: color.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: color.accent.glow,
    borderColor: color.accent.muted,
  },
  filterLabel: {
    fontSize: 13,
    color: color.text.secondary,
  },
  filterLabelActive: {
    color: color.accent.primary,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: color.border.subtle,
    minHeight: 44,
  },
  rowPressed: {
    backgroundColor: color.innerHighlight,
  },
  rowSelected: {
    backgroundColor: color.accent.glow,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    color: color.text.primary,
  },
  rowLabelSelected: {
    color: color.accent.primary,
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 12,
    color: color.text.tertiary,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: color.border.subtle,
  },
  confirmBtn: {
    height: MODAL.BTN_H,
    backgroundColor: color.accent.primary,
    borderRadius: MODAL.RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnPressed: {
    backgroundColor: color.accent.highlight,
  },
  confirmLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.inverse,
  },
})
