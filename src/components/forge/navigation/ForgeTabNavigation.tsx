/**
 * ForgeTabNavigation
 * Spec: Forge Navigation Library.dc.html §05
 *
 * Five in-screen tab styles for switching views within a single destination.
 */

import React from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { color, space } from '@/constants/tokens'
import { NAV } from './_navigationTokens'
import type { ForgeTabNavigationProps, TabItem } from './types'

export function ForgeTabNavigation({
  variant = 'underline',
  items,
  activeKey,
  onPress,
}: ForgeTabNavigationProps) {
  if (variant === 'pill') {
    return <PillTabs items={items} activeKey={activeKey} onPress={onPress} />
  }
  if (variant === 'card') {
    return <CardTabs items={items} activeKey={activeKey} onPress={onPress} />
  }
  if (variant === 'scrollable') {
    return <ScrollableTabs items={items} activeKey={activeKey} onPress={onPress} />
  }
  if (variant === 'segmented') {
    return <SegmentedTabs items={items} activeKey={activeKey} onPress={onPress} />
  }
  // underline (default)
  return <UnderlineTabs items={items} activeKey={activeKey} onPress={onPress} />
}

// ── Pill tabs ──────────────────────────────────────────────────────────────

function PillTabs({ items, activeKey, onPress }: InnerTabProps) {
  return (
    <View style={pillStyles.container}>
      {items.map(tab => {
        const isActive = tab.key === activeKey
        const isDisabled = tab.disabled ?? false
        return (
          <Pressable
            key={tab.key}
            onPress={() => !isDisabled && onPress(tab.key)}
            disabled={isDisabled}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled: isDisabled }}
            style={({ pressed }) => [
              pillStyles.item,
              isActive && pillStyles.itemActive,
              !isActive && pressed && pillStyles.itemPressed,
              isDisabled && pillStyles.itemDisabled,
            ]}
          >
            <Text style={[
              pillStyles.label,
              isActive ? pillStyles.labelActive : pillStyles.labelInactive,
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const pillStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: color.background.elevated,
    borderWidth: 1,
    borderColor: color.border.subtle,
    padding: 5,
    borderRadius: NAV.RADIUS_PILL,
    alignSelf: 'flex-start',
  },
  item: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: NAV.RADIUS_PILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: {
    backgroundColor: color.accent.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  itemPressed: {
    backgroundColor: color.innerHighlight,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 14,
  },
  labelActive: {
    fontWeight: '600',
    color: color.text.inverse,
  },
  labelInactive: {
    fontWeight: '400',
    color: color.text.secondary,
  },
})

// ── Underline tabs ─────────────────────────────────────────────────────────

function UnderlineTabs({ items, activeKey, onPress }: InnerTabProps) {
  return (
    <View style={underStyles.container}>
      {items.map(tab => {
        const isActive = tab.key === activeKey
        const isDisabled = tab.disabled ?? false
        return (
          <Pressable
            key={tab.key}
            onPress={() => !isDisabled && onPress(tab.key)}
            disabled={isDisabled}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled: isDisabled }}
            style={({ pressed }) => [
              underStyles.item,
              pressed && !isDisabled && !isActive && underStyles.itemPressed,
              isDisabled && underStyles.itemDisabled,
            ]}
          >
            <Text style={[
              underStyles.label,
              isActive ? underStyles.labelActive : underStyles.labelInactive,
            ]}>
              {tab.label}
            </Text>
            <View style={[
              underStyles.indicator,
              isActive && underStyles.indicatorActive,
            ]} />
          </Pressable>
        )
      })}
    </View>
  )
}

const underStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: color.border.subtle,
  },
  item: {
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  itemPressed: {
    backgroundColor: color.innerHighlight,
    borderRadius: 8,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 15,
  },
  labelActive: {
    fontWeight: '600',
    color: color.text.primary,
  },
  labelInactive: {
    fontWeight: '400',
    color: color.text.secondary,
  },
  indicator: {
    position: 'absolute',
    bottom: -1,
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: color.accent.primary,
    shadowColor: color.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
})

// ── Card tabs ──────────────────────────────────────────────────────────────

function CardTabs({ items, activeKey, onPress }: InnerTabProps) {
  return (
    <View style={cardStyles.container}>
      {items.map(tab => {
        const isActive = tab.key === activeKey
        const isDisabled = tab.disabled ?? false
        return (
          <Pressable
            key={tab.key}
            onPress={() => !isDisabled && onPress(tab.key)}
            disabled={isDisabled}
            accessibilityLabel={`${tab.label}${tab.value ? ` ${tab.value}` : ''}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled: isDisabled }}
            style={[
              cardStyles.item,
              isActive ? cardStyles.itemActive : cardStyles.itemInactive,
              isDisabled && cardStyles.itemDisabled,
            ]}
          >
            {tab.value ? (
              <Text style={[
                cardStyles.value,
                isActive ? cardStyles.valueActive : cardStyles.valueInactive,
              ]}>
                {tab.value}
              </Text>
            ) : null}
            <Text style={[
              cardStyles.label,
              isActive ? cardStyles.labelActive : cardStyles.labelInactive,
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const cardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: space.sm,
  },
  item: {
    flex: 1,
    minHeight: 56,
    borderRadius: NAV.RADIUS,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  itemActive: {
    borderColor: color.accent.muted,
    backgroundColor: color.accent.glow,
  },
  itemInactive: {
    borderColor: color.border.subtle,
    backgroundColor: color.background.elevated,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
  },
  valueActive: { color: color.accent.primary },
  valueInactive: { color: color.text.primary },
  label: {
    fontSize: 12,
  },
  labelActive: { color: color.accent.primary },
  labelInactive: { color: color.text.secondary },
})

// ── Scrollable tabs ────────────────────────────────────────────────────────

function ScrollableTabs({ items, activeKey, onPress }: InnerTabProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={scrollStyles.content}
    >
      {items.map(tab => {
        const isActive = tab.key === activeKey
        const isDisabled = tab.disabled ?? false
        return (
          <Pressable
            key={tab.key}
            onPress={() => !isDisabled && onPress(tab.key)}
            disabled={isDisabled}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled: isDisabled }}
            style={[
              scrollStyles.item,
              isActive ? scrollStyles.itemActive : scrollStyles.itemInactive,
              isDisabled && scrollStyles.itemDisabled,
            ]}
          >
            <Text style={[
              scrollStyles.label,
              isActive ? scrollStyles.labelActive : scrollStyles.labelInactive,
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const scrollStyles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  item: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: NAV.RADIUS_PILL,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: {
    borderColor: color.accent.muted,
    backgroundColor: color.accent.glow,
  },
  itemInactive: {
    borderColor: color.border.subtle,
    backgroundColor: 'transparent',
  },
  itemDisabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 14,
    flexShrink: 0,
  },
  labelActive: { fontWeight: '600', color: color.accent.primary },
  labelInactive: { fontWeight: '400', color: color.text.secondary },
})

// ── Segmented (equal-width, no bronze) ────────────────────────────────────

function SegmentedTabs({ items, activeKey, onPress }: InnerTabProps) {
  return (
    <View style={segStyles.container}>
      {items.map(tab => {
        const isActive = tab.key === activeKey
        const isDisabled = tab.disabled ?? false
        return (
          <Pressable
            key={tab.key}
            onPress={() => !isDisabled && onPress(tab.key)}
            disabled={isDisabled}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled: isDisabled }}
            style={[
              segStyles.item,
              isActive && segStyles.itemActive,
              isDisabled && segStyles.itemDisabled,
            ]}
          >
            <Text style={[
              segStyles.label,
              isActive ? segStyles.labelActive : segStyles.labelInactive,
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const segStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: NAV.SEG_PAD,
    backgroundColor: color.background.elevated,
    borderWidth: 1,
    borderColor: color.border.subtle,
    padding: NAV.SEG_PAD,
    borderRadius: NAV.RADIUS_SEGMENT,
  },
  item: {
    flex: 1,
    minHeight: NAV.HEIGHT_SEGMENT,
    borderRadius: NAV.RADIUS_SEG_BTN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: {
    backgroundColor: NAV.SEG_ACTIVE_BG,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 2,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 14,
  },
  labelActive: { fontWeight: '600', color: color.text.primary },
  labelInactive: { fontWeight: '400', color: color.text.secondary },
})

// ── Internal shared prop type ─────────────────────────────────────────────

interface InnerTabProps {
  items: TabItem[]
  activeKey: string
  onPress: (key: string) => void
}
