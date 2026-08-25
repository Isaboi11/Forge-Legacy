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
 *
 * ══ THE MARK IS PART OF THE TITLE, ON EVERY SCREEN ══
 *
 * PO, 2026-08-25: *"how on the home screen it has the logo and the forge legacy in the top left, the
 * other screens need to have the logo and then the title of the page in that same font and size."*
 *
 * Home had its own `HomeWordmark` — the pillars mark beside "Forge Legacy" in Playfair 16 — and every
 * other screen drew a bare string, at one of THREE different sizes: 17 sans, 21 serif, or a screen's
 * own 32px `barTitle` passed in as a ReactNode. Four treatments of the same element.
 *
 * The mark now belongs to the bar, so the 185 screens that pass a string title get it without being
 * touched, and there is one implementation instead of one per screen. Home passes `title="Forge Legacy"`
 * like everyone else.
 *
 * ⚠ `serif` IS GONE RATHER THAN IGNORED. It selected a second title font that no longer exists as a
 * distinct thing; leaving it accepted-and-inert would be a prop that silently does nothing, which is
 * the defect this codebase has been bitten by before. Its 35 call sites were removed with it.
 */

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { flColor, flRadius } from '@/constants/foundation'
import { ForgeMarkIcon } from '@/components/forge/primitives/icons/HomeIcons'

export interface AppBarProps {
  title?: React.ReactNode
  /**
   * A second line under the title — a squad name, a photo's chapter, an audience.
   *
   * Exists so the handful of screens that needed one did not have to hand-roll a ReactNode title and
   * lose the mark with it. `title` still accepts a node for anything genuinely bespoke.
   */
  subtitle?: string
  onBack?: () => void
  onClose?: () => void
  avatar?: React.ReactNode
  onAvatar?: () => void
  actions?: React.ReactNode
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

export function AppBar({ title, subtitle, onBack, onClose, avatar, onAvatar, actions, transparent = false }: AppBarProps) {
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
          <View style={styles.wordmark}>
            <ForgeMarkIcon />
            <View style={styles.titleStack}>
              <Text numberOfLines={1} style={styles.title}>
                {title}
              </Text>
              {subtitle ? (
                <Text numberOfLines={1} style={styles.subtitle}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
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
  /** The mark and the words are one unit — the same row Home's wordmark has always been. */
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  titleStack: { flexShrink: 1 },
  subtitle: {
    fontSize: 11.5,
    color: flColor.gray400,
    marginTop: 1,
  },
  /** Home's wordmark spec, now every screen's title. */
  title: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: flColor.cream100,
    flexShrink: 1,
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
