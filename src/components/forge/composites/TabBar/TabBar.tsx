/**
 * CLA-C19 — TabBar
 * Tier: 2 (Composite)
 * Spec: Forge Home.dc.html · components/TabBar/TabBar.jsx (Claude Design)
 *
 * Bottom navigation. The active item glows bronze; an `emphasized` item (the
 * signature Legacy tab) sits in a lit bronze tile when active.
 *
 * This is the app-wide navigation standard, replacing `expo-router`'s
 * `NativeTabs` (native chrome couldn't render the bronze glow / emphasized
 * tile / custom icons). `TabBar` is the bar shell; `TabBarButton` is the
 * per-tab visual, designed to sit inside an `expo-router/ui` `<TabTrigger
 * asChild>` (which supplies `isFocused`, `onPress`, etc.) — see
 * `src/components/app-tabs.tsx` for the wiring.
 */

import React from 'react'
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { flColor, flGradient, flRadius, flShadow } from '@/constants/foundation'

export interface TabBarProps {
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export function TabBar({ children, style }: TabBarProps) {
  const insets = useSafeAreaInsets()
  return <View style={[styles.bar, { paddingBottom: 12 + insets.bottom }, style]}>{children}</View>
}

export interface TabBarButtonProps extends Omit<PressableProps, 'children'> {
  label: string
  /** Render-prop so the icon can be recolored for the active/emphasized state (no CSS `currentColor` in react-native-svg). */
  renderIcon: (color: string) => React.ReactNode
  /** Give this tab the lit bronze-tile treatment when active (the Legacy tab). */
  emphasized?: boolean
  isFocused?: boolean
  /** Count riding the tab icon — omitted or 0 renders nothing. Caps at "9+". */
  badge?: number
}

export function TabBarButton({ label, renderIcon, emphasized = false, isFocused = false, badge = 0, style: _triggerStyle, ...rest }: TabBarButtonProps) {
  const active = isFocused
  const emph = emphasized && active
  const color = active ? flColor.bronze400 : flColor.gray600
  const showBadge = badge > 0

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={showBadge ? `${label}, ${badge} pending` : label}
      accessibilityState={{ selected: active }}
      {...rest}
      style={styles.button}
    >
      <View style={styles.iconSlot}>
        {emph ? (
          <LinearGradient
            colors={flGradient.bronzeFill.colors}
            locations={flGradient.bronzeFill.locations}
            start={flGradient.bronzeFill.start}
            end={flGradient.bronzeFill.end}
            style={[styles.iconWrap, styles.iconWrapEmphasized, { boxShadow: flShadow.glowSubtle }]}
          >
            {renderIcon(flColor.bronze300)}
          </LinearGradient>
        ) : (
          <View style={styles.iconWrap}>{renderIcon(color)}</View>
        )}
        {showBadge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.label, { color, fontWeight: active ? '600' : '500' }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(13, 13, 15, 0.92)',
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal600,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    minHeight: 44,
  },
  iconSlot: {
    position: 'relative',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 5,
    borderRadius: flRadius.pill,
    backgroundColor: flColor.bronze400,
    borderWidth: 1.5,
    borderColor: 'rgba(13, 13, 15, 0.92)', // the bar's own fill, so the badge reads as lifted off the icon
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    color: '#1A1206',
  },
  iconWrapEmphasized: {
    width: 46,
    height: 32,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.3,
  },
})
