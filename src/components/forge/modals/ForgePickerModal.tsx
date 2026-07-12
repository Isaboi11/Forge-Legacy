/**
 * ForgePickerModal
 * Spec: Forge Modal Library.dc.html Â§06
 *
 * Two content modes:
 *   list — search â†’ filter â†’ select â†’ confirm. Fixed header (title + close),
 *          search field, filter chips, scrollable item list, pinned confirm.
 *   date — month calendar grid. Month header with prev/next, weekday row,
 *          day grid with selected/today states, confirm counts the pick.
 *
 * Used for: Exercise Picker, Date Picker, Program/Goal/Challenge Picker.
 */

import React, { useCallback, useState } from 'react'
import {
  Animated,
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
import { useOverlayTransition } from './_useOverlayTransition'
import type { ForgePickerModalProps, PickerItem } from './types'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

export function ForgePickerModal({
  visible,
  onClose,
  mode = 'list',
  title = 'Select',
  placeholder = 'Search…',
  searchValue = '',
  onSearchChange,
  filters = [],
  activeFilter,
  onFilterChange,
  items = [],
  selectedKeys = [],
  multiSelect = false,
  onSelectionChange,
  confirmLabel,
  onConfirm,
  selectedDate,
  onDateChange,
  onConfirmDate,
  accessibilityLabel = 'Picker',
}: ForgePickerModalProps) {
  const insets = useSafeAreaInsets()
  const [localSelected, setLocalSelected] = useState<string[]>(selectedKeys)

  // Date mode state
  const [localDate, setLocalDate] = useState<Date | undefined>(selectedDate)
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const base = selectedDate ?? new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  // Spec §14: modal entrance — backdrop dims first, panel pops in
  const { backdrop, panel, rendered } = useOverlayTransition(visible, { spring: true })

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
    if (mode === 'date') {
      if (localDate) onConfirmDate?.(localDate)
      onClose()
      return
    }
    onConfirm?.(localSelected)
    onClose()
  }, [mode, localDate, onConfirmDate, localSelected, onConfirm, onClose])

  const selectDay = useCallback((day: number) => {
    const next = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day)
    setLocalDate(next)
    onDateChange?.(next)
  }, [monthCursor, onDateChange])

  const shiftMonth = useCallback((delta: number) => {
    setMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }, [])

  const baseLabel = confirmLabel ?? (mode === 'date' ? 'Set Date' : 'Confirm')
  const confirmText = mode === 'date'
    ? (localDate
        ? `${baseLabel} · ${MONTHS_SHORT[localDate.getMonth()]} ${localDate.getDate()}`
        : baseLabel)
    : (localSelected.length > 0
        ? `${baseLabel} (${localSelected.length})`
        : baseLabel)
  const confirmDisabled = mode === 'date' && !localDate

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
        style={[
          styles.backdrop,
          mode === 'date' && styles.backdropCenter,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        accessibilityLabel={accessibilityLabel}
      >
        <Animated.View
          style={[
            styles.container,
            mode === 'date' && styles.containerDate,
            {
              opacity: panel,
              transform: [
                { translateY: panel.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                { scale: panel.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
              hitSlop={(MODAL.TAP_MIN - 28) / 2}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            >
              <Feather name="x" size={12} color={color.text.secondary} />
            </Pressable>
          </View>

          {mode === 'date' ? (
            /* Date grid — spec §06 date variant */
            <View style={styles.calendar}>
              <View style={styles.monthHeader}>
                <Text style={styles.monthTitle}>
                  {MONTHS[monthCursor.getMonth()]} {monthCursor.getFullYear()}
                </Text>
                <View style={styles.monthNav}>
                  <Pressable
                    onPress={() => shiftMonth(-1)}
                    accessibilityLabel="Previous month"
                    accessibilityRole="button"
                    hitSlop={(MODAL.TAP_MIN - 28) / 2}
                    style={({ pressed }) => [styles.navBtn, pressed && styles.closeBtnPressed]}
                  >
                    <Feather name="chevron-left" size={14} color={color.text.secondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => shiftMonth(1)}
                    accessibilityLabel="Next month"
                    accessibilityRole="button"
                    hitSlop={(MODAL.TAP_MIN - 28) / 2}
                    style={({ pressed }) => [styles.navBtn, pressed && styles.closeBtnPressed]}
                  >
                    <Feather name="chevron-right" size={14} color={color.text.secondary} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.weekRow}>
                {WEEKDAYS.map((d, i) => (
                  <Text key={`${d}-${i}`} style={styles.weekday}>{d}</Text>
                ))}
              </View>

              <View style={styles.dayGrid}>
                {_calendarCells(monthCursor).map((day, i) => {
                  if (day === null) {
                    return <View key={`blank-${i}`} style={styles.dayCell} />
                  }
                  const isSelected = !!localDate
                    && localDate.getFullYear() === monthCursor.getFullYear()
                    && localDate.getMonth() === monthCursor.getMonth()
                    && localDate.getDate() === day
                  const today = new Date()
                  const isToday = today.getFullYear() === monthCursor.getFullYear()
                    && today.getMonth() === monthCursor.getMonth()
                    && today.getDate() === day
                  return (
                    <Pressable
                      key={day}
                      onPress={() => selectDay(day)}
                      accessibilityLabel={`${MONTHS[monthCursor.getMonth()]} ${day}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      style={[
                        styles.dayCell,
                        isToday && !isSelected && styles.dayCellToday,
                        isSelected && styles.dayCellSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayLabel,
                          isToday && !isSelected && styles.dayLabelToday,
                          isSelected && styles.dayLabelSelected,
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          ) : (
          <>
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
          </>
          )}

          {/* Confirm footer */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleConfirm}
              disabled={confirmDisabled}
              accessibilityLabel={confirmText}
              accessibilityRole="button"
              accessibilityState={{ disabled: confirmDisabled }}
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && !confirmDisabled && styles.confirmBtnPressed,
                confirmDisabled && styles.confirmBtnDisabled,
              ]}
            >
              <Text style={styles.confirmLabel}>{confirmText}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

/** Sunday-first cell list for the month: leading blanks, then days 1..n */
function _calendarCells(monthCursor: Date): (number | null)[] {
  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
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
  backdropFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.background.overlay,
  },
  backdrop: {
    flex: 1,
    paddingHorizontal: 16,
  },
  backdropCenter: {
    justifyContent: 'center',
  },
  containerDate: {
    flex: 0,
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
  // ── Date mode — spec §06 date-grid variant ────────────────────────────────
  calendar: {
    paddingBottom: 4,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: color.border.subtle,
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.primary,
  },
  monthNav: {
    flexDirection: 'row',
    gap: 6,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: MODAL.RADIUS_PILL,
    backgroundColor: color.background.surface,
    borderWidth: 1,
    borderColor: color.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: color.text.tertiary,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    borderRadius: MODAL.RADIUS_PILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: color.accent.muted,
  },
  dayCellSelected: {
    backgroundColor: color.accent.primary,
  },
  dayLabel: {
    fontSize: 13,
    color: color.text.primary,
  },
  dayLabelToday: {
    color: color.accent.primary,
    fontWeight: '600',
  },
  dayLabelSelected: {
    color: color.text.inverse,
    fontWeight: '600',
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
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.inverse,
  },
})
