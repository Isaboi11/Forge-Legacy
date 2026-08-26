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
  /**
   * The bronze for small TEXT. Design System §2.0: the token exists in both themes (structure), the
   * VALUE differs per theme (colour).
   *
   * ⚠ IDENTICAL TO `bronze400` HERE, AND THAT IS THE CORRECT VALUE RATHER THAN A PLACEHOLDER. Forge
   * writes bronze on near-black, where #BA8654 measures far above the bar; the legibility problem this
   * token solves is Alabaster's alone. Forge's rendering is unchanged to the byte — see the paper
   * palette for the measurements.
   */
  bronzeInk: '#BA8654',
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
   * Text and glyphs sitting ON a bronze fill — selected chips, badge counts, button labels.
   *
   * ⚠ PO CALL, 2026-08-25: *"white lettering if there is the bronze button around it."* It used to be
   *   `#1A1206`, a near-black brown, in 40 files.
   *
   * ⚠ WHITE ONLY WORKS BECAUSE `bronzeSolid` MOVED WITH IT, and that is the whole point of these two
   *   tokens being introduced together. White on the OLD selected-chip fill (`bronze400`) measures
   *   3.17:1 in Forge and 3.87:1 in Paper — below AA for the 8–12px bold labels these actually are,
   *   and WCAG "large text" starts at 18.7px bold, so none of them qualify. On `bronzeSolid` it is
   *   6.27:1 and 4.90:1. Changing the letters without darkening the chip would have looked like the
   *   request and quietly failed it.
   */
  onBronze: '#FFFFFF',
  /**
   * Text and glyphs laid over MEDIA — a photo or a video frame, under a dark scrim.
   *
   * ⚠ THE SAME VALUE IN BOTH THEMES, and for the same reason as `onBronze`: the ground does not change
   *   with the theme. A photo is a photo, and the scrim over it stays dark in Paper precisely BECAUSE
   *   the photo is not a theme surface — so anything written on it has to stay light in Paper too.
   *
   * ⚠ THIS IS THE ROLE-TOKEN FLIP FOR THE THIRD TIME, and it is the most damaging of the three. These
   *   titles were `cream100`, which is near-white in Forge and DARK INK in Paper. Dark ink on a 0.92
   *   black scrim is invisible: the Accomplishment and Pinned Legacy cards rendered as blank dark
   *   rectangles, which the PO reported as *"not showing any picture"* — the picture was there, its
   *   caption had simply disappeared into the scrim above it.
   */
  onMedia: '#F7F5F1',
  /**
   * The SOLID bronze fill under white lettering — selected segments, chips, badges, count pills.
   *
   * Distinct from `bronze400`, which stays the accent for borders, icons and text ON a dark or cream
   * surface. This is the "bronze button" surface, and it is deliberately a step darker so the white
   * on it is legible rather than merely present.
   */
  bronzeSolid: '#765B44',
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
  /** Error/destructive text on a surface. Was `#E4A099` inline in the coach sheet. */
  dangerText: '#E4A099',
  dangerBorder: 'rgba(196,86,72,0.45)',
  dangerBg: 'rgba(196,86,72,0.08)',
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

  // ── A CONTROL THAT CANNOT BE PRESSED ───────────────────────────────────────────
  /**
   * The rim and the label of a DISABLED filled button.
   *
   * ⚠ TRANSCRIBED FROM `Button.tsx`, NOT CHOSEN. They were hard-coded literals inside the composite —
   *   the only hard-coded colours left in it — which made the disabled primary the one button in the
   *   app that did not switch themes. Forge's half is byte-identical to what shipped; the whole change
   *   is that Paper now has an answer. See `flGradient.bronzeFillDisabled` for the fill.
   */
  disabledBorder: 'rgba(150, 140, 122, 0.22)',
  disabledLabel: 'rgba(240,237,232,0.42)',

  // ── THE DESTRUCTIVE PLATE ──────────────────────────────────────────────────────────
  /**
   * Delete forever, leave squad, discard the draft — `Button`'s `destructive` variant, across 16 call
   * sites.
   *
   * ⚠ TRANSCRIBED FROM `Button.tsx`, NOT CHOSEN, exactly like the disabled pair above. These were the
   *   last four hard-coded colours in the composite library: a near-black maroon fill with two red rims
   *   and a faint red label, which is a cold dangerous plate on Forge and a black slab on Alabaster.
   *   Forge's half is byte-identical to what shipped.
   *
   * The ENABLED label is not here on purpose — it already reads `flColor.redMuted`, which is a token
   * and was already correct in both palettes.
   */
  destructiveFill: '#171111',
  destructiveBorder: 'rgba(150, 74, 66, 0.72)',
  destructiveBorderDisabled: 'rgba(120, 74, 70, 0.30)',
  destructiveLabelDisabled: 'rgba(190, 90, 76, 0.34)',

  /**
   * The other two disabled labels — `Button`'s `secondary` and `text` roles. Same transcription, same
   * reason: both were pale-on-dark literals, and both are the wrong way round on cream.
   */
  secondaryLabelDisabled: 'rgba(240,237,232,0.34)',
  textLabelDisabled: 'rgba(219, 170, 104, 0.4)',

  // ── THE CARDIO BLOCK ─────────────────────────────────────────────────────────────
  /**
   * `CardioBlockCard`'s own grounds — the card, the instrument band across its top, and the plate the
   * hand-drawn route placeholder is painted on.
   *
   * ⚠ TRANSCRIBED FROM `CardioBlockCard.tsx`, NOT CHOSEN. Every one was a literal, and the card was the
   *   clearest case in the app of the failure the two-theme rule exists to catch: the GROUND was frozen
   *   near-black while every colour ON it — `cream100`, `gray600`, `surfaceRecessed`, `bronze400` — is a
   *   role token that flipped correctly. On Alabaster that painted Paper's dark ink title onto a black
   *   card, so “Outdoor Run” was invisible while the segmented control beside it was cream.
   *
   * ⚠ THE BLUE CAST IS REAL AND IS KEPT. These are cooler than `charcoal800`/`charcoal900` — #0D1116
   *   against #131517 — because the band reads as an instrument panel rather than as a card surface.
   *   Reusing the charcoal ramp would have been tidier and would have changed the dark theme.
   */
  cardioCard: '#0D1116',
  cardioBandOutdoor: '#080C10',
  cardioBandIndoor: '#0A0E13',
  /** The route placeholder's radial: bright core, dark edge. Also the colour of its bottom scrim. */
  cardioBandCore: '#131A20',
  cardioBandEdge: '#080C10',
  /** The drawn map grid under the placeholder trace — no tiles, no imagery. */
  cardioGrid: 'rgba(191,143,79,0.045)',
  /** An unfilled progress track — the groove `goalFill` runs along. */
  progressTrack: 'rgba(255,255,255,0.06)',
} as const;

export const flText = {
  primary: flColor.cream100,
  secondary: flColor.gray400,
  tertiary: flColor.gray600,
  bronzeLabel: flColor.bronzeInk,
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
  /** Bottom-sheet ground — a step above a modal, because a sheet sits over a live screen. */
  surfaceSheet: {
    colors: ['#232329', '#1E1E23'],
    locations: [0, 1],
    ...VERTICAL,
  },
  /** A raised panel INSIDE a sheet (the coach's cards, the option rows). */
  surfaceSheetRaised: {
    colors: ['#1F2024', flColor.charcoal700],
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
  /**
   * The same button with nothing behind it — a dead plate: no bronze, no sheen, no glow.
   *
   * ⚠ THE VALUES ARE `Button.tsx`'S OLD `DISABLED_FILL_COLORS` VERBATIM, so Forge renders exactly what
   *   it rendered before. It is a gradient rather than a flat fill only because the component feeds one
   *   `LinearGradient` for all three states; two near-identical stops are the honest way to say “flat”
   *   without branching the element.
   */
  bronzeFillDisabled: {
    colors: ['#1C1E22', '#15171B'],
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
  /** A bottom sheet's lift off the screen behind it, plus its top rim. */
  sheet: '0 -18px 44px rgba(0,0,0,0.7), inset 0 1px 0 rgba(198,156,100,0.22)',
  /** The live/online dot's halo. Distinct from `presenceDotGlow` — a different green, historically. */
  statusOnlineGlow: '0 0 6px rgba(90,158,104,0.55)',
  /**
   * Coach Holt's floating medallion — the rim that separates the coin from whatever it hovers over,
   * its badge glow, and the float shadow, in that order.
   *
   * ⚠ TRANSCRIBED FROM `HoltMark.tsx`'S OLD `BUBBLE_SHADOW`, so Forge is unchanged to the byte. It was
   *   a template literal in that file with two black `rgba(0,0,0,…)` terms baked in, which is fine over
   *   near-black and is dirt on cream. Paper states its own.
   */
  coachMarkFloat: '0 0 0 1px rgba(0,0,0,0.5), 0 0 16px rgba(181, 138, 97, 0.28), 0 12px 28px rgba(0,0,0,0.4)',
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
