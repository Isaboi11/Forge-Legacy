/**
 * ForgeSearchHeader
 * Spec: Forge Navigation Library.dc.html §11
 *
 * Contextual search bar that drives the top of search/filter surfaces.
 * The `state` prop controls layout transitions:
 *   default  — resting bar with back button, field, and optional filter icon
 *   focused  — enlarged field with bronze border + glow, Cancel replaces filter
 *   typing   — focused + clear X button visible
 *   results  — spinner instead of search icon; clear X; Cancel
 *   empty    — same as results layout, but parent sets empty-results UI below
 *
 * Compose a TextInput internally — ForgeSearchInput carries its own container,
 * label, and helper text which are not needed here.
 */

import React, { useRef } from 'react'
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import { NAV } from './_navigationTokens'
import type { ForgeSearchHeaderProps } from './types'

export function ForgeSearchHeader({
  placeholder = 'Search',
  value,
  onChangeText,
  onFocus,
  onBlur,
  onClear,
  onCancel,
  onBack,
  onFilter,
  state = 'default',
  loading = false,
  showFilter = true,
  accessibilityLabel = 'Search',
}: ForgeSearchHeaderProps) {
  const inputRef = useRef<TextInput>(null)

  const isFocusedOrActive = state === 'focused' || state === 'typing' || state === 'results' || state === 'empty'
  const showClear         = state === 'typing' || state === 'results' || state === 'empty'
  const showSpinner       = loading && (state === 'results' || state === 'empty')
  const showCancel        = isFocusedOrActive

  // ── Default state: compact pill-bar layout ────────────────────────────────
  if (!isFocusedOrActive) {
    return (
      <View style={styles.defaultContainer}>
        {/* Back button */}
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          >
            <Feather name="arrow-left" size={20} color={color.text.secondary} />
          </Pressable>
        ) : null}

        {/* Search pill */}
        <Pressable
          onPress={() => {
            inputRef.current?.focus()
            onFocus?.()
          }}
          style={styles.defaultField}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="search"
        >
          <Feather name="search" size={NAV.ICON_SEARCH} color={color.text.tertiary} />
          {value ? (
            <Text style={styles.defaultFieldText} numberOfLines={1}>{value}</Text>
          ) : (
            <Text style={styles.defaultPlaceholder} numberOfLines={1}>{placeholder}</Text>
          )}
        </Pressable>

        {/* Filter button */}
        {showFilter && onFilter ? (
          <Pressable
            onPress={onFilter}
            accessibilityLabel="Filter"
            accessibilityRole="button"
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          >
            <Feather name="sliders" size={20} color={color.text.secondary} />
          </Pressable>
        ) : null}
      </View>
    )
  }

  // ── Focused / Active state: expanded field layout ────────────────────────
  return (
    <View style={styles.activeRow}>
      {/* Search field */}
      <View style={styles.activeFieldContainer}>
        {/* Leading icon: spinner or search */}
        {showSpinner ? (
          <ActivityIndicator
            size="small"
            color={color.accent.primary}
            style={styles.fieldIcon}
          />
        ) : (
          <Feather
            name="search"
            size={NAV.ICON_SEARCH}
            color={color.accent.primary}
            style={styles.fieldIcon}
          />
        )}

        <TextInput
          ref={inputRef}
          style={styles.activeInput}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={color.text.tertiary}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          autoFocus={state === 'focused'}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="search"
        />

        {/* Clear button */}
        {showClear && value.length > 0 ? (
          <Pressable
            onPress={onClear}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            hitSlop={8}
            style={styles.clearBtn}
          >
            <View style={styles.clearCircle}>
              <Feather name="x" size={NAV.ICON_CLEAR} color={color.text.secondary} />
            </View>
          </Pressable>
        ) : null}
      </View>

      {/* Cancel button */}
      {showCancel ? (
        <Pressable
          onPress={onCancel}
          accessibilityLabel="Cancel search"
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]}
        >
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

// ── Type reference (suppress unused import warnings) ─────────────────────────
void (undefined as unknown as Animated.Value)

const styles = StyleSheet.create({
  // Default (resting) layout
  defaultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: color.background.elevated,
    borderRadius: NAV.RADIUS_SEARCH,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  defaultField: {
    flex: 1,
    height: NAV.SEARCH_FIELD_H_SM,
    backgroundColor: color.background.primary,
    borderRadius: NAV.RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  defaultFieldText: {
    flex: 1,
    fontSize: 14,
    color: color.text.primary,
  },
  defaultPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: color.text.tertiary,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: NAV.RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    backgroundColor: color.innerHighlight,
  },

  // Active (focused/typing/results/empty) layout
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeFieldContainer: {
    flex: 1,
    height: NAV.SEARCH_FIELD_H,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.background.primary,
    borderWidth: 1,
    borderColor: color.accent.primary,
    borderRadius: NAV.RADIUS,
    // Bronze glow approximation — box-shadow not available in RN;
    // use a subtle shadow on iOS / elevation on Android
    shadowColor: color.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    paddingLeft: 10,
    paddingRight: 6,
  },
  fieldIcon: {
    marginRight: 6,
  },
  activeInput: {
    flex: 1,
    fontSize: 15,
    color: color.text.primary,
    paddingVertical: 0,
  },
  clearBtn: {
    marginLeft: 4,
  },
  clearCircle: {
    width: NAV.CLEAR_BTN,
    height: NAV.CLEAR_BTN,
    borderRadius: NAV.RADIUS_PILL,
    backgroundColor: '#2C2C36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  cancelBtnPressed: {
    opacity: 0.6,
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.accent.primary,
  },
})
