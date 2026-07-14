/**
 * Forge Legacy — Visual Foundation (v2)
 *
 * RN bridge for the `--fl-*` tokens defined in the Claude Design "Forge Legacy
 * Blueprint" project (Visual Foundation, tokens/foundation.css). This is the
 * new, approved material/atmosphere layer — additive to `@/constants/tokens`,
 * not a replacement. Existing LEGACY components keep consuming
 * `@/constants/tokens`; new compositions (Home v2 and whatever adopts the new
 * design system next) consume this file instead.
 *
 * Two deliberate divergences from `@/constants/tokens`' palette, carried over
 * from the design source: the bronze accent is warmer (#BF8F4F vs #C8A97E)
 * and the charcoal ramp is neutralized (cooler, less blue-black).
 *
 * Source: Claude Design project "Forge Legacy Blueprint" (5368b220-9e78-4104-
 * bd8b-969c39e84346) tokens/foundation.css.
 */

import type { TextStyle } from 'react-native'

// ─────────────────────────────────────────────────────────────────────────────
// CORE PALETTE
// ─────────────────────────────────────────────────────────────────────────────

export const flColor = {
  base: '#05080A',
  charcoal900: '#0C1013',
  charcoal800: '#131517',
  charcoal700: '#1A1A1E',
  charcoal600: '#24242A',
  charcoal500: '#2E2E35',

  cream100: '#F0EDE8',
  gray400: '#9E9890',
  gray600: '#666060',

  bronze300: '#CDA063',
  bronze400: '#BF8F4F',
  bronze600: '#7A6040',
  bronzeDark: '#574029',

  greenMuted: '#5A9E68',
  redMuted: '#BE5A4C',
  blueMuted: '#568AAE',

  overlayDark: 'rgba(0, 0, 0, 0.75)',
  innerHighlight: 'rgba(255, 255, 255, 0.04)',
  innerHighlightMd: 'rgba(255, 255, 255, 0.07)',

  bronzeBorder: 'rgba(186, 146, 92, 0.40)',
  bronzeBorderSubtle: 'rgba(186, 146, 92, 0.19)',
  bronzeTint: 'rgba(186, 146, 92, 0.05)',
} as const

export const flText = {
  primary: flColor.cream100,
  secondary: flColor.gray400,
  tertiary: flColor.gray600,
  bronzeLabel: flColor.bronze400,
} as const

export const flIcon = {
  bronze: flColor.bronze400,
  inactive: flColor.gray600,
  containerBg: flColor.charcoal800,
  containerBorder: flColor.bronzeBorderSubtle,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENTS — expo-linear-gradient friendly stop lists
// ─────────────────────────────────────────────────────────────────────────────

export const flGradient = {
  /** Atmospheric app background — cold-iron dark, faint cool apex. */
  bgAtmospheric: {
    colors: ['#0B0F13', flColor.charcoal900, flColor.base] as const,
    locations: [0, 0.44, 1] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  /** Standard card surface — faint top-to-bottom lift. */
  surfaceCard: {
    colors: ['#181A1C', flColor.charcoal800] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  /** Bronze machined-metal sweep — thin highlight bar only, never a full fill. */
  bronzeMetallic: {
    colors: [flColor.bronze600, flColor.bronze400, flColor.bronze300, flColor.bronze400, flColor.bronzeDark] as const,
    locations: [0, 0.38, 0.5, 0.62, 1] as const,
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
  /** Sanctioned forged-bronze button fill (default). */
  bronzeFill: {
    colors: ['#8A6A3E', '#573F24', '#3D2F1A', '#2E2314', '#342817', '#42321C', '#4A3822', '#382A18'] as const,
    locations: [0, 0.06, 0.26, 0.5, 0.72, 0.92, 0.97, 1] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  /** Sanctioned forged-bronze button fill (hover/pressed). */
  bronzeFillPressed: {
    colors: ['#A17E4A', '#63492A', '#43331C', '#322616', '#382B19', '#493720', '#52402A', '#3D2E1A'] as const,
    locations: [0, 0.06, 0.26, 0.5, 0.72, 0.92, 0.97, 1] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  /** Faint warm wash inside the Mission Card, fading out by ~42% down the card. */
  missionCardWash: {
    colors: ['rgba(202,162,106,0.07)', 'rgba(202,162,106,0)'] as const,
    locations: [0, 0.42] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// SHADOWS — literal boxShadow strings (supported on View style, RN New Arch)
// ─────────────────────────────────────────────────────────────────────────────

export const flShadow = {
  card: `inset 0 1px 0 ${flColor.innerHighlight}, 0 2px 8px rgba(0, 0, 0, 0.35)`,
  elevated: `inset 0 1px 0 ${flColor.innerHighlightMd}, 0 4px 16px rgba(0, 0, 0, 0.5)`,
  ambient: '0 20px 60px rgba(0, 0, 0, 0.45)',
  glowSubtle: '0 0 20px rgba(186, 146, 92, 0.14)',
  /** Mission Card — bronze-edged hero container. */
  missionCard:
    'inset 0 1px 0 rgba(198,156,100,0.30), 0 18px 40px -24px rgba(0,0,0,0.82), 0 0 18px -6px rgba(186,146,92,0.11)',
  /** Train Together container — a step down from the Mission Card. */
  trainTogetherCard:
    'inset 0 1px 0 rgba(198,156,100,0.22), 0 12px 30px -24px rgba(0,0,0,0.72), 0 0 15px -6px rgba(186,146,92,0.09)',
  /** Primary (bronze) button — forged-metal rim + glow. */
  buttonPrimary:
    'inset 0 1px 0 rgba(222, 190, 148, 0.42), inset 0 -1px 1px rgba(176, 134, 80, 0.14), inset 10px 0 16px -12px rgba(0,0,0,0.50), inset -10px 0 16px -12px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.35), 0 0 2px rgba(186, 144, 90, 0.14)',
  avatarRingGlow: '0 0 16px rgba(186, 146, 92, 0.28), inset 0 1px 0 rgba(255,255,255,0.04)',
  presenceDotGlow: '0 0 6px rgba(76, 175, 110, 0.6)',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// RADII / BORDERS
// ─────────────────────────────────────────────────────────────────────────────

export const flRadius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
  round: 9999,
} as const

export const flBorder = {
  subtle: { borderWidth: 1, borderColor: flColor.charcoal600 },
  bronze: { borderWidth: 1, borderColor: flColor.bronzeBorder },
  bronzeSubtle: { borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  active: { borderWidth: 1.5, borderColor: flColor.bronze400 },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────────────────────────────────────────

/** Loaded via @expo-google-fonts/playfair-display in the root layout. */
export const flFont = {
  sans: undefined as string | undefined,
  display: 'PlayfairDisplay_600SemiBold',
  displayMedium: 'PlayfairDisplay_500Medium',
} as const

export const flType = {
  missionEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flText.bronzeLabel,
  } satisfies TextStyle,
  missionEyebrowMuted: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flText.bronzeLabel,
    opacity: 0.7,
  } satisfies TextStyle,
  displayTitle: {
    fontFamily: flFont.display,
    fontSize: 25,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 28,
    color: flText.primary,
  } satisfies TextStyle,
  displaySub: {
    fontFamily: flFont.display,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 22,
    color: flText.primary,
  } satisfies TextStyle,
  displaySubLg: {
    fontFamily: flFont.display,
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: flText.primary,
  } satisfies TextStyle,
  displayGoal: {
    fontFamily: flFont.display,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: flText.primary,
  } satisfies TextStyle,
  displayCardName: {
    fontFamily: flFont.display,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: flText.primary,
  } satisfies TextStyle,
  bodySecondary: {
    fontSize: 13,
    color: flText.secondary,
  } satisfies TextStyle,
  bodyTertiary: {
    fontSize: 13,
    color: flText.tertiary,
  } satisfies TextStyle,
  bodySmall: {
    fontSize: 12.5,
    color: flText.secondary,
  } satisfies TextStyle,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// MOTION
// ─────────────────────────────────────────────────────────────────────────────

export const flMotion = {
  duration: {
    toggle: 50,
    standard: 250,
    ceremony: 500,
  },
  easing: {
    // cubic-bezier(0.16, 1, 0.3, 1)
    easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  },
} as const
