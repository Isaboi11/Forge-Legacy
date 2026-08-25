/**
 * Forge — the dark palette. THE VALUES HERE ARE UNCHANGED from the original `foundation.ts`; this file
 * is that file's colour half, lifted out so a second palette can sit beside it. Every value was moved
 * verbatim, and the gate for the move is that a web export with `activeTheme() === 'forge'` is
 * byte-identical to the one before it.
 *
 * Source: Claude Design project "Forge Legacy Blueprint" (5368b220-9e78-4104-bd8b-969c39e84346)
 * tokens/foundation.css.
 *
 * Two deliberate divergences from `@/constants/tokens`' palette, carried over from the design source:
 * the bronze accent is warmer (#BA8654 vs #C8A97E) and the charcoal ramp is neutralized.
 *
 * ⚠ ADDING A TOKEN HERE MEANS ADDING IT TO `foundation.paper.ts` TOO — `foundation.ts` type-checks the
 *   two against each other, so a one-sided addition is a compile error rather than a screen that is
 *   quietly wrong in one theme.
 */

import type { TextStyle } from 'react-native';
import { flFont } from './foundation.shared.ts';

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

  bronze300: '#C99767',
  bronze400: '#BA8654',
  bronze600: '#765B44',
  bronzeDark: '#543D2C',

  greenMuted: '#5A9E68',
  redMuted: '#BE5A4C',
  blueMuted: '#568AAE',

  overlayDark: 'rgba(0, 0, 0, 0.75)',
  innerHighlight: 'rgba(255, 255, 255, 0.04)',
  innerHighlightMd: 'rgba(255, 255, 255, 0.07)',

  bronzeBorder: 'rgba(181, 138, 97, 0.40)',
  bronzeBorderSubtle: 'rgba(181, 138, 97, 0.19)',
  bronzeTint: 'rgba(181, 138, 97, 0.05)',

  // Forged-metal button + engraved-medallion tokens (from foundation.css)
  emberFlame: '#E0913F', //           --fl-ember-flame (heat/flame icon stroke)
  bronzeMetalBorder: 'rgba(169, 129, 91, 0.55)', // --fl-bronze-metal-border
  surfaceRecessed: '#09090B', //      --fl-surface-recessed (solid stand-in for the base→#0C0C0E gradient)

  // ── Added with the Paper amendment (DSA1) ──────────────────────────────────
  /** Icon-chip container fill. Was `charcoal800` inline in `flIcon`; named so Paper can move it. */
  iconContainerBg: '#131517',
  /** `--fl-surface-nav` — the tab bar's own fill. Was an inline literal in `TabBar`, twice. */
  surfaceNav: 'rgba(13, 13, 15, 0.92)',
  /**
   * Text and glyphs sitting ON a bronze fill — badge counts, the wordmark chip, pill labels.
   *
   * ⚠ THE SAME VALUE IN BOTH THEMES, AND THAT IS THE POINT. It is not "the dark colour", it is the
   *   colour that is legible on bronze — and bronze stays bronze in Paper. `Forge Home - Paper.dc.html`
   *   still renders `#1A1206` on its badges. This was a raw literal in 28 places precisely because it
   *   never had a name to be found by.
   */
  onBronze: '#1A1206',
  /**
   * A LIGHT dimming backdrop — the popover/menu scrim, not the modal one.
   *
   * ⚠ Distinct from `overlayDark` on purpose and the difference is not cosmetic: `overlayDark` is 0.75
   *   and buries the screen, which is right behind a ceremony and wrong behind a 190pt menu you are
   *   meant to still see around. Home's account menu was carrying 0.45 as a raw literal for exactly
   *   this reason; naming it stops the next author reaching for the heavier one because it was the
   *   only one with a name.
   */
  overlayScrim: 'rgba(5,5,5,0.45)',
  /** Row/card press + hover wash. Paper needs a DARKENING wash where this one lightens. */
  hoverWash: 'rgba(255, 255, 255, 0.04)',
  /** "Live now" presence dot. Was `greenMuted` at every call site; Paper needs a darker green. */
  statusOnline: '#5A9E68',
  /**
   * Tint applied to the 72 home/workout artwork PNGs.
   *
   * ⚠ `null` IN FORGE IS THE CORRECT VALUE, not an omission — the art is pre-processed to a
   *   transparent background by a luminance→alpha pass, and its remaining RGB is a dark warm neutral
   *   (measured mean `#423A32`). On near-black that IS the intended figure and tinting it would be a
   *   regression. On cream it is a grey smudge inside a faintly visible rectangle, because ~87% of
   *   each PNG carries *some* alpha. Paper therefore repaints the figure from its alpha, which is
   *   where the shape actually lives; `#B08F5F` was chosen by compositing the real assets over the
   *   real hero surface, not derived.
   */
  artworkTint: null as string | null,
  /**
   * The paper-grain and vignette washes have no dark counterpart — Forge gets its texture from the
   * photographic plates. `null` is the honest value, and `ScreenBackground` skips the layer entirely.
   */
  paperGrain: null as string | null,
  paperVignette: null as string | null,
} as const;

export const flText = {
  primary: flColor.cream100,
  secondary: flColor.gray400,
  tertiary: flColor.gray600,
  bronzeLabel: flColor.bronze400,
} as const;

export const flIcon = {
  bronze: flColor.bronze400,
  inactive: flColor.gray600,
  containerBg: flColor.iconContainerBg,
  containerBorder: flColor.bronzeBorderSubtle,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENTS — expo-linear-gradient friendly stop lists
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `colors` is a 2-or-more tuple because that is what `expo-linear-gradient` requires, and `locations`
 * is optional because the dark `surfaceCard` has always relied on even spacing. Both palettes are
 * checked against this shape.
 */
export interface FlGradientStops {
  readonly colors: readonly [string, string, ...string[]];
  readonly locations?: readonly [number, number, ...number[]];
  readonly start: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
}

const VERTICAL = { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } } as const;

export const flGradient = {
  /** Atmospheric app background — cold-iron dark, faint cool apex. */
  bgAtmospheric: {
    colors: ['#0B0F13', flColor.charcoal900, flColor.base],
    locations: [0, 0.44, 1],
    ...VERTICAL,
  },
  /** Standard card surface — faint top-to-bottom lift. */
  surfaceCard: {
    colors: ['#181A1C', flColor.charcoal800],
    ...VERTICAL,
  },
  /**
   * The single most prominent card on a screen (Today's Workout, the current exercise).
   *
   * ⚠ IN FORGE THIS IS DELIBERATELY IDENTICAL TO `surfaceCard`. The dark theme never needed the tier —
   * elevation reads through shadow and a bronze edge on black. Paper needs it because cream-on-cream
   * has almost no contrast to spend, so the hero has to be lighter to be a hero at all. Aliasing here
   * rather than branching at every call site means the hero/supporting split is expressed ONCE, in the
   * markup, and is simply a no-op in the theme that does not need it.
   */
  surfaceHero: {
    colors: ['#181A1C', flColor.charcoal800],
    // Locations only for type parity with the Paper twin — `HeroSurface` renders null in Forge, so
    // nothing in the dark theme ever paints this gradient.
    locations: [0, 1],
    ...VERTICAL,
  },
  /** Sheet / modal surface — a step above card level. */
  surfaceElevated: {
    colors: ['#1E1E24', flColor.charcoal700],
    locations: [0, 1],
    ...VERTICAL,
  },
  /** Ceremony + modal ground. */
  surfaceModal: {
    colors: ['#1F1F28', '#18181F'],
    ...VERTICAL,
  },
  /** Bronze machined-metal sweep — thin highlight bar only, never a full fill. */
  bronzeMetallic: {
    colors: [flColor.bronze600, flColor.bronze400, flColor.bronze300, flColor.bronze400, flColor.bronzeDark],
    locations: [0, 0.38, 0.5, 0.62, 1],
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
  /** Sanctioned forged-bronze button fill (default). */
  bronzeFill: {
    colors: ['#8A6A3E', '#573F24', '#3D2F1A', '#2E2314', '#342817', '#42321C', '#4A3822', '#382A18'],
    locations: [0, 0.06, 0.26, 0.5, 0.72, 0.92, 0.97, 1],
    ...VERTICAL,
  },
  /** Sanctioned forged-bronze button fill (hover/pressed). */
  bronzeFillPressed: {
    colors: ['#A17E4A', '#63492A', '#43331C', '#322616', '#382B19', '#493720', '#52402A', '#3D2E1A'],
    locations: [0, 0.06, 0.26, 0.5, 0.72, 0.92, 0.97, 1],
    ...VERTICAL,
  },
  /** Faint warm wash inside the Mission Card, fading out by ~42% down the card. */
  missionCardWash: {
    colors: ['rgba(198,154,110,0.07)', 'rgba(198,154,110,0)'],
    locations: [0, 0.42],
    ...VERTICAL,
  },
} as const satisfies Record<string, FlGradientStops>;

// ─────────────────────────────────────────────────────────────────────────────
// SHADOWS — literal boxShadow strings (supported on View style, RN New Arch)
// ─────────────────────────────────────────────────────────────────────────────

export const flShadow = {
  card: `inset 0 1px 0 ${flColor.innerHighlight}, 0 2px 8px rgba(0, 0, 0, 0.35)`,
  elevated: `inset 0 1px 0 ${flColor.innerHighlightMd}, 0 4px 16px rgba(0, 0, 0, 0.5)`,
  ambient: '0 20px 60px rgba(0, 0, 0, 0.45)',
  glowSubtle: '0 0 20px rgba(181, 138, 97, 0.14)',
  // Engraved-medallion + metal-button atomic tokens (from foundation.css)
  borderInset: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)', // --fl-border-inset
  shadowImage: '0 6px 20px rgba(0, 0, 0, 0.55)', //          --fl-shadow-image
  glowBadge: '0 0 16px rgba(181, 138, 97, 0.28)', //         --fl-glow-badge
  bronzeMetalTopRim: 'inset 0 1px 0 rgba(219, 184, 151, 0.42)', // --fl-bronze-metal-top-rim
  /** Mission Card — bronze-edged hero container. */
  missionCard:
    'inset 0 1px 0 rgba(194,148,104,0.30), 0 18px 40px -24px rgba(0,0,0,0.82), 0 0 18px -6px rgba(181,138,97,0.11)',
  /** Train Together container — a step down from the Mission Card. */
  trainTogetherCard:
    'inset 0 1px 0 rgba(194,148,104,0.22), 0 12px 30px -24px rgba(0,0,0,0.72), 0 0 15px -6px rgba(181,138,97,0.09)',
  /** Primary (bronze) button — forged-metal rim + glow. */
  buttonPrimary:
    'inset 0 1px 0 rgba(219, 184, 151, 0.42), inset 0 -1px 1px rgba(171, 126, 85, 0.14), inset 10px 0 16px -12px rgba(0,0,0,0.50), inset -10px 0 16px -12px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.35), 0 0 2px rgba(181, 136, 95, 0.14)',
  avatarRingGlow: '0 0 16px rgba(181, 138, 97, 0.28), inset 0 1px 0 rgba(255,255,255,0.04)',
  presenceDotGlow: '0 0 6px rgba(76, 175, 110, 0.6)',

  // ── Added with the Paper amendment (DSA1) ──────────────────────────────────
  /** Hero card. Forge aliases `missionCard`; Paper gives it its own softer lift. */
  cardHero:
    'inset 0 1px 0 rgba(194,148,104,0.30), 0 18px 40px -24px rgba(0,0,0,0.82), 0 0 18px -6px rgba(181,138,97,0.11)',
  /** Supporting card. Forge aliases `trainTogetherCard`. */
  cardSoft:
    'inset 0 1px 0 rgba(194,148,104,0.22), 0 12px 30px -24px rgba(0,0,0,0.72), 0 0 15px -6px rgba(181,138,97,0.09)',
  /** Home's RECOMMENDED path card — a bronze edge and a low glow that lifts it off the stone. */
  cardLead: '0 0 22px -8px rgba(181,138,97,0.34), inset 0 1px 0 rgba(219,184,151,0.16)',
  /** `--fl-shadow-float` — popovers and menus that hover over the page rather than sitting in it. */
  float: '0 12px 30px rgba(0,0,0,0.5)',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// BORDERS
// ─────────────────────────────────────────────────────────────────────────────

export const flBorder = {
  subtle: { borderWidth: 1, borderColor: flColor.charcoal600 },
  bronze: { borderWidth: 1, borderColor: flColor.bronzeBorder },
  bronzeSubtle: { borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  active: { borderWidth: 1.5, borderColor: flColor.bronze400 },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY — the coloured ramp
// ─────────────────────────────────────────────────────────────────────────────

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
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SHAPE CONTRACT — what `foundation.paper.ts` must match
// ─────────────────────────────────────────────────────────────────────────────

export type FlColor = Record<keyof typeof flColor, string | null>;
export type FlText = Record<keyof typeof flText, string>;
export type FlIcon = Record<keyof typeof flIcon, string>;
export type FlGradient = Record<keyof typeof flGradient, FlGradientStops>;
export type FlShadow = Record<keyof typeof flShadow, string>;
export type FlBorder = Record<keyof typeof flBorder, { borderWidth: number; borderColor: string }>;
export type FlType = Record<keyof typeof flType, TextStyle>;
