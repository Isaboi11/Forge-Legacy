/**
 * Button Library — Design Preview
 *
 * Live gallery of the Forge button components, mirroring the structure of
 * ButtonLibrary.dc.html (claude.ai/design project 7b89a003-0323-4193-af8a-686b1cd65d7d):
 * one section per variant, an 8-state grid, and a content/icon configs grid
 * for text-capable variants.
 *
 * "Pressed" and "Focused" are transient interaction states with no public
 * prop (by design — see _types.ts) so those two grid cells render a frozen,
 * presentation-only preview built directly from the shared BTN tokens. Every
 * other cell renders the real production component.
 *
 * Standalone route, not wired into the tab navigator — same convention as
 * legacy-design-test.tsx.
 */

import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'

import { color, typography, radius } from '@/constants/tokens'
import { BTN } from '@/components/forge/buttons/_buttonTokens'
import { ButtonIcon } from '@/components/forge/buttons/_ButtonIcon'
import type { ButtonIconName } from '@/components/forge/buttons/_types'
import {
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  DestructiveButton,
  IconButton,
  FloatingActionButton,
} from '@/components/forge/buttons'

type VariantKey = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'icon' | 'fab'
type StateKey = 'default' | 'pressed' | 'focused' | 'selected' | 'disabled' | 'loading' | 'success' | 'error'

const STATES: { key: StateKey; label: string }[] = [
  { key: 'default',  label: 'Default' },
  { key: 'pressed',  label: 'Pressed' },
  { key: 'focused',  label: 'Focused' },
  { key: 'selected', label: 'Selected' },
  { key: 'disabled', label: 'Disabled' },
  { key: 'loading',  label: 'Loading' },
  { key: 'success',  label: 'Success' },
  { key: 'error',    label: 'Error' },
]

const CONFIGS: { tag: string; label: string; iconLeft?: ButtonIconName; iconRight?: ButtonIconName }[] = [
  { tag: 'Icon Left',   label: 'Add Set',   iconLeft: 'plus' },
  { tag: 'Icon Right',  label: 'Continue',  iconRight: 'arrowRight' },
  { tag: 'Icon Only',   label: '',          iconLeft: 'plus' },
  { tag: 'Long Text',   label: 'Save And Continue To Next Set' },
  { tag: 'Short Text',  label: 'Go' },
]

const VARIANTS: {
  key: VariantKey
  name: string
  num: string
  sample: string
  icon: ButtonIconName
  textCapable: boolean
  specs: string[]
}[] = [
  { key: 'primary',     name: 'Primary Button',          num: '01', sample: 'Start Workout', icon: 'plus',     textCapable: true,  specs: ['Bronze gradient fill', 'White text', 'Glow on press', 'H 52 · R 12 · PX 24'] },
  { key: 'secondary',   name: 'Secondary Button',        num: '02', sample: 'View Details',  icon: 'plus',     textCapable: true,  specs: ['Subtle top-fade fill', '1px bronze border', 'Bronze text', 'Subtle glow'] },
  { key: 'ghost',       name: 'Ghost Button',             num: '03', sample: 'Skip For Now', icon: 'plus',     textCapable: true,  specs: ['No border', 'No fill', 'Bronze text', 'Opacity on press'] },
  { key: 'destructive', name: 'Destructive Button',       num: '04', sample: 'Delete Legacy', icon: 'trash',   textCapable: true,  specs: ['Dark gradient surface', 'Red accent', 'White text'] },
  { key: 'icon',        name: 'Icon Button',              num: '05', sample: '',             icon: 'settings', textCapable: false, specs: ['Square 44 × 44', 'Bronze outline glow', 'Centered icon'] },
  { key: 'fab',         name: 'Floating Action Button',   num: '06', sample: '',             icon: 'plus',     textCapable: false, specs: ['Circular 60 × 60', 'Bronze gradient', 'Strong glow', 'Elevated shadow'] },
]

// ─── Frozen (non-interactive) pressed/focused previews ──────────────────────
// Built directly from BTN tokens since these are transient interaction states
// with no public prop on the real components.

function FrozenPreview({ variant, forced, sample, icon }: {
  variant: VariantKey
  forced: 'pressed' | 'focused'
  sample: string
  icon: ButtonIconName
}) {
  const hasLabel = !!sample

  if (variant === 'primary' || variant === 'fab') {
    const isFab = variant === 'fab'
    const defaultShadow = isFab ? BTN.BOX_SHADOW_FAB_DEFAULT : BTN.BOX_SHADOW_PRIMARY_DEFAULT
    const pressedShadow = isFab ? BTN.BOX_SHADOW_FAB_PRESSED : BTN.BOX_SHADOW_PRIMARY_PRESSED
    const boxShadow = forced === 'pressed' ? pressedShadow : BTN.appendFocusRing(defaultShadow)
    const filter = forced === 'pressed' ? BTN.PRESSED_FILTER_BRONZE : undefined
    const size = isFab ? { width: BTN.HEIGHT_FAB, height: BTN.HEIGHT_FAB } : { height: BTN.HEIGHT, paddingHorizontal: hasLabel ? BTN.PADDING_H : 0, width: hasLabel ? undefined : BTN.HEIGHT }
    return (
      <LinearGradient
        colors={BTN.GRAD_COLORS}
        start={BTN.GRAD_START}
        end={BTN.GRAD_END}
        locations={BTN.GRAD_LOCATIONS}
        style={[styles.frozenRow, size, { borderRadius: isFab ? BTN.RADIUS_FAB : BTN.RADIUS, boxShadow, filter }]}
      >
        {!hasLabel && <ButtonIcon name={icon} size={isFab ? BTN.ICON_SIZE_FAB : BTN.ICON_SIZE} color={BTN.WHITE} />}
        {hasLabel && <Text style={[styles.frozenLabel, { color: BTN.WHITE }]}>{sample}</Text>}
      </LinearGradient>
    )
  }

  if (variant === 'secondary' || variant === 'icon') {
    const isIcon = variant === 'icon'
    const defaultShadow = isIcon ? BTN.BOX_SHADOW_ICON_DEFAULT : BTN.BOX_SHADOW_OUTLINE_DEFAULT
    const bg = forced === 'pressed' ? BTN.SECONDARY_PRESSED_BG : undefined
    const gradColors = bg ? ([bg, bg] as const) : BTN.SECONDARY_GRAD_COLORS
    const boxShadow = forced === 'pressed' ? BTN.BOX_SHADOW_OUTLINE_PRESSED : BTN.appendFocusRing(defaultShadow)
    const border = isIcon ? BTN.BORDER_BRONZE_ICON : BTN.BORDER_BRONZE_SECONDARY
    const size = isIcon
      ? { width: BTN.HEIGHT_ICON, height: BTN.HEIGHT_ICON }
      : { height: BTN.HEIGHT, paddingHorizontal: BTN.PADDING_H }
    return (
      <LinearGradient
        colors={isIcon ? BTN.ICON_GLOW_COLORS : gradColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.frozenRow, size, { borderRadius: BTN.RADIUS, borderWidth: 1, borderColor: border, boxShadow }]}
      >
        {!hasLabel && <ButtonIcon name={icon} size={isIcon ? BTN.ICON_SIZE_ICON : BTN.ICON_SIZE} color={BTN.DEFAULT_TEXT_OUTLINE} />}
        {!isIcon && hasLabel && <Text style={[styles.frozenLabel, { color: BTN.DEFAULT_TEXT_OUTLINE }]}>{sample}</Text>}
      </LinearGradient>
    )
  }

  if (variant === 'ghost') {
    const boxShadow = forced === 'pressed' ? 'none' : BTN.appendFocusRing('none')
    const backgroundColor = forced === 'pressed' ? BTN.GHOST_PRESSED_BG : 'transparent'
    const opacity = forced === 'pressed' ? BTN.GHOST_PRESSED_OPACITY : 1
    return (
      <View style={[styles.frozenRow, { height: BTN.HEIGHT, paddingHorizontal: BTN.PADDING_H, borderRadius: BTN.RADIUS, backgroundColor, boxShadow, opacity }]}>
        {!hasLabel && <ButtonIcon name={icon} size={BTN.ICON_SIZE} color={BTN.DEFAULT_TEXT_OUTLINE} />}
        {hasLabel && <Text style={[styles.frozenLabel, { color: BTN.DEFAULT_TEXT_OUTLINE }]}>{sample}</Text>}
      </View>
    )
  }

  // destructive
  const bg = forced === 'pressed' ? BTN.DESTRUCTIVE_PRESSED_BG : undefined
  const gradColors = bg ? ([bg, bg] as const) : BTN.DESTRUCTIVE_GRAD_COLORS
  const border = forced === 'pressed' ? BTN.DESTRUCTIVE_PRESSED_BORDER : 'rgba(196,86,60,0.9)'
  const boxShadow = forced === 'pressed' ? BTN.BOX_SHADOW_DESTRUCTIVE_PRESSED : BTN.appendFocusRing(BTN.BOX_SHADOW_DESTRUCTIVE_DEFAULT)
  return (
    <LinearGradient
      colors={gradColors}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.frozenRow, { height: BTN.HEIGHT, paddingHorizontal: BTN.PADDING_H, borderRadius: BTN.RADIUS, borderWidth: 1, borderColor: border, boxShadow }]}
    >
      {!hasLabel && <ButtonIcon name={icon} size={BTN.ICON_SIZE} color={BTN.WHITE} />}
      {hasLabel && <Text style={[styles.frozenLabel, { color: BTN.WHITE }]}>{sample}</Text>}
    </LinearGradient>
  )
}

// ─── Real-component cell (everything except pressed/focused) ────────────────

function LiveCell({ variant, state, sample, icon }: {
  variant: VariantKey
  state: StateKey
  sample: string
  icon: ButtonIconName
}) {
  const common = {
    selected: state === 'selected',
    disabled: state === 'disabled',
    loading:  state === 'loading',
    success:  state === 'success',
    error:    state === 'error',
  }

  switch (variant) {
    case 'primary':     return <PrimaryButton title={sample} {...common} />
    case 'secondary':   return <SecondaryButton title={sample} {...common} />
    case 'ghost':       return <GhostButton title={sample} {...common} />
    case 'destructive': return <DestructiveButton title={sample} {...common} />
    case 'icon':        return <IconButton icon={icon} accessibilityLabel={icon} {...common} />
    case 'fab':          return <FloatingActionButton icon={icon} accessibilityLabel={icon} {...common} />
  }
}

// ─── Layout pieces ────────────────────────────────────────────────────────

function SpecChip({ text }: { text: string }) {
  return (
    <View style={styles.specChip}>
      <View style={styles.specDot} />
      <Text style={styles.specText}>{text}</Text>
    </View>
  )
}

function VariantSection({ v }: { v: (typeof VARIANTS)[number] }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeadingRow}>
        <View style={styles.sectionHeadingLeft}>
          <Text style={styles.sectionNum}>{v.num}</Text>
          <Text style={styles.sectionTitle}>{v.name}</Text>
        </View>
        <View style={styles.specRow}>
          {v.specs.map((s) => <SpecChip key={s} text={s} />)}
        </View>
      </View>

      <Text style={styles.subheading}>States</Text>
      <View style={styles.grid}>
        {STATES.map((st) => (
          <View key={st.key} style={styles.cell}>
            <View style={styles.cellContent}>
              {st.key === 'pressed' || st.key === 'focused' ? (
                <FrozenPreview variant={v.key} forced={st.key} sample={v.sample} icon={v.icon} />
              ) : (
                <LiveCell variant={v.key} state={st.key} sample={v.sample} icon={v.icon} />
              )}
            </View>
            <Text style={styles.cellLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      {v.textCapable && (
        <>
          <Text style={styles.subheading}>Content &amp; Icon</Text>
          <View style={styles.grid}>
            {CONFIGS.map((c) => (
              <View key={c.tag} style={styles.cell}>
                <View style={styles.cellContent}>
                  {v.key === 'primary' && <PrimaryButton title={c.label} iconLeft={c.iconLeft} iconRight={c.iconRight} />}
                  {v.key === 'secondary' && <SecondaryButton title={c.label} iconLeft={c.iconLeft} iconRight={c.iconRight} />}
                  {v.key === 'ghost' && <GhostButton title={c.label} iconLeft={c.iconLeft} iconRight={c.iconRight} />}
                  {v.key === 'destructive' && <DestructiveButton title={c.label} iconLeft={c.iconLeft} iconRight={c.iconRight} />}
                </View>
                <Text style={styles.cellLabel}>{c.tag}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────

export default function ButtonLibraryPreview() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={color.background.primary} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Button Library</Text>
        <Text style={styles.pageSubtitle}>
          The permanent, reusable button system for Forge Legacy. Every variant, state, and
          configuration below inherits directly from the Forge design tokens.
        </Text>
        <View style={styles.divider} />

        {VARIANTS.map((v) => <VariantSection key={v.key} v={v} />)}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.background.primary,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 96,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -0.6,
    color: color.text.primary,
  },
  pageSubtitle: {
    marginTop: 10,
    maxWidth: 560,
    fontSize: typography.scale.secondaryContent.fontSize,
    lineHeight: typography.scale.secondaryContent.lineHeight,
    color: color.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: color.border.subtle,
    marginTop: 28,
  },

  section: {
    paddingTop: 40,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  sectionHeadingLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  sectionNum: {
    fontSize: 13,
    fontWeight: '600',
    color: color.accent.primary,
  },
  sectionTitle: {
    fontSize: typography.scale.screenSectionHeading.fontSize,
    fontWeight: typography.scale.screenSectionHeading.fontWeight,
    letterSpacing: typography.scale.screenSectionHeading.letterSpacing,
    color: color.text.primary,
  },
  specRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  specDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.accent.muted,
  },
  specText: {
    fontSize: typography.scale.mutedSecondary.fontSize,
    color: color.text.secondary,
  },

  subheading: {
    fontSize: typography.scale.sectionHeader.fontSize,
    letterSpacing: typography.scale.sectionHeader.letterSpacing,
    textTransform: 'uppercase',
    color: color.text.tertiary,
    marginTop: 26,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  cell: {
    flexGrow: 1,
    flexBasis: 168,
    minHeight: 128,
    backgroundColor: color.background.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  cellContent: {
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLabel: {
    fontSize: typography.scale.smallLabel.fontSize,
    letterSpacing: 0.3,
    color: color.text.tertiary,
  },

  frozenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  frozenLabel: {
    fontSize: 16,
    fontWeight: BTN.FONT_WEIGHT,
    letterSpacing: BTN.LETTER_SPACING,
  },
})
