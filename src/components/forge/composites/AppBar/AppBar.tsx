/**
 * CLA-C18 — AppBar
 * Tier: 2 (Composite)
 * Spec: Forge Home.dc.html · components/AppBar/AppBar.jsx (Claude Design)
 *
 * The fixed top bar. Three leading conventions:
 *   tab root      — no leading control; title left, avatar entry right
 *   pushed screen — back chevron + "‹ Screen Name"  (pass `onBack`)
 *   modal-native  — [×] dismiss  (pass `onClose`)
 * Hidden entirely only during Active Workout (the screen omits it).
 * `avatar` is the single entry point to Profile (there is no Profile tab).
 */

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { flColor, flRadius } from '@/constants/foundation'

export interface AppBarProps {
  title?: React.ReactNode
  onBack?: () => void
  onClose?: () => void
  avatar?: React.ReactNode
  onAvatar?: () => void
  actions?: React.ReactNode
  serif?: boolean
  transparent?: boolean
}

function BackChevron() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={flColor.cream100} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8} />
    </Svg>
  )
}

function CloseX() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={flColor.cream100} strokeWidth={2} strokeLinecap="square" />
    </Svg>
  )
}

export function AppBar({ title, onBack, onClose, avatar, onAvatar, actions, serif = false, transparent = false }: AppBarProps) {
  const insets = useSafeAreaInsets()
  const leading = onBack ? { control: <BackChevron />, handler: onBack, label: 'Back' }
    : onClose ? { control: <CloseX />, handler: onClose, label: 'Close' }
    : null

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: 8 + insets.top },
        transparent ? styles.transparent : styles.opaque,
      ]}
    >
      {leading ? (
        <Pressable accessibilityRole="button" accessibilityLabel={leading.label} onPress={leading.handler} style={styles.ctrlBtn} hitSlop={8}>
          {leading.control}
        </Pressable>
      ) : null}

      <View style={[styles.titleWrap, { paddingLeft: leading ? 2 : 6 }]}>
        {typeof title === 'string' ? (
          <Text numberOfLines={1} style={[styles.title, serif ? styles.titleSerif : styles.titleSans]}>
            {title}
          </Text>
        ) : (
          title
        )}
      </View>

      {actions ? <View style={styles.actions}>{actions}</View> : null}

      {avatar != null ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={onAvatar} style={styles.avatarBtn} hitSlop={4}>
          {avatar}
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  opaque: {
    backgroundColor: flColor.surfaceNav,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal600,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  ctrlBtn: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.round,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: '600',
    color: flColor.cream100,
  },
  titleSans: {
    fontSize: 17,
    letterSpacing: 0.1,
  },
  titleSerif: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 21,
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
