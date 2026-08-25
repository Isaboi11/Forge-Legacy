/**
 * Paper — the light palette. Every value is transcribed from `forge-paper-theme.js` in the Claude
 * Design project (`b029488a`), which I read in full: it is exactly the token list in the PO's handoff
 * `Forge Legacy - Light Mode (Paper) - Claude Code Handoff.md`, with nothing extra and nothing omitted.
 * The two agreeing is why the spec is trusted here rather than re-derived.
 *
 * ══ THREE THINGS PAPER DELIBERATELY DOES NOT INVERT ══
 *
 * Read `Forge Home - Paper.dc.html` before "fixing" any of these — the artboard renders all three on a
 * cream ground on purpose, and each has been mistaken for an oversight already:
 *
 *   1. `bronzeMetallic` is UNCHANGED from Forge. The paper theme file overrides 60-odd variables and
 *      pointedly leaves this one alone. The machined sweep is an object in the world — a struck badge —
 *      not a surface of the UI, and it reads as metal on paper exactly as it does on black.
 *   2. `emberFlame` is UNCHANGED. The Start Workout flame is heat, and heat is not a theme colour.
 *   3. The tour scrim stays DARK (see `SpotlightStage`). A spotlight works by taking light away; a
 *      cream scrim over a cream app removes nothing.
 *
 * ⚠ `cream100` IS THE DARKEST VALUE IN THIS FILE AND THAT IS NOT A TYPO. The token names are Forge's
 *   and they are ROLES, not descriptions — `cream100` means "primary text", `charcoal900` means "app
 *   canvas". Renaming them would touch all 184 consumers to no benefit; `Component-Library-Architecture`
 *   CLA-D12 anticipated exactly this and says the names were left semantic-neutral so light values
 *   could be added later "without restructuring the token hierarchy".
 */

import type { TextStyle } from 'react-native';
import { flFont } from './foundation.shared.ts';
import type { FlBorder, FlColor, FlGradient, FlGradientStops, FlIcon, FlShadow, FlText, FlType } from './foundation.forge.ts';

// ─────────────────────────────────────────────────────────────────────────────
// CORE PALETTE
// ─────────────────────────────────────────────────────────────────────────────

export const flColor = {
  base: '#F4F0E6',
  charcoal900: '#F6F2E8', //  app canvas
  charcoal800: '#F9F6EF', //  card surface
  charcoal700: '#F1EBDD', //  elevated / sheet
  charcoal600: '#CDBD9F', //  border / divider
  charcoal500: '#B9A98A', //  hairline / hover edge

  cream100: '#28231D', //     primary TEXT (see the header — this is a role, not a colour name)
  gray400: '#6E6860', //      secondary text
  gray600: '#8B8377', //      tertiary text

  bronze300: '#BD9257',
  bronze400: '#A47A3D',
  bronze600: '#8C6B3C',
  bronzeDark: '#5C4726',

  greenMuted: '#3E7A4C',
  redMuted: '#A6402F',
  blueMuted: '#3C6D92',

  overlayDark: 'rgba(35,31,26,0.42)',
  innerHighlight: 'rgba(255,255,255,0.92)',
  innerHighlightMd: 'rgba(255,255,255,1)',

  bronzeBorder: 'rgba(164,122,61,0.52)',
  bronzeBorderSubtle: 'rgba(164,122,61,0.26)',
  bronzeTint: 'rgba(164,122,61,0.085)',

  /** ⚠ NOT inverted — see the file header. */
  emberFlame: '#E0913F',
  bronzeMetalBorder: 'rgba(107,86,52,0.48)',
  /**
   * `--fl-surface-recessed` is a 3-stop gradient in the design; this is the solid stand-in, and it
   * takes the DARKEST stop (`#E7E0D0`) exactly as Forge's takes its darkest. A recess has to sit below
   * the card it is cut into, and on paper that means darker, not lighter.
   */
  surfaceRecessed: '#E7E0D0',

  // ── Added with the Paper amendment (DSA1) ──────────────────────────────────
  iconContainerBg: '#EFEBE0',
  /** `--fl-surface-nav` — the cleanest, lightest step on the tonal ladder. */
  surfaceNav: 'rgba(250,247,240,0.97)',
  /** ⚠ NOT inverted — bronze stays bronze, so what reads on it stays the same. See the Forge twin. */
  onBronze: '#1A1206',
  /** The lighter menu/popover scrim. `--fl-overlay-dark` is the design's value and suits it exactly. */
  overlayScrim: 'rgba(35,31,26,0.42)',
  /**
   * Error text, darkened from `--fl-red-muted` (#A6402F).
   *
   * ⚠ #A6402F itself measures 5.98:1 on the card and would have passed — this goes further because
   *   error copy is the one place an athlete is being asked to act on bad news, and it also has to
   *   hold up on the RECESSED surface, which is a step darker than the card.
   */
  dangerText: '#8E3626',
  dangerBorder: 'rgba(166,64,47,0.45)',
  dangerBg: 'rgba(166,64,47,0.08)',
  /** ⚠ DARKENS. Forge's hover wash is white-on-black; the same gesture on paper must remove light. */
  hoverWash: 'rgba(35,31,26,0.035)',
  statusOnline: '#2F7D50',
  /** See the Forge twin — repaints the figure from its alpha so it reads as engraved, not smudged. */
  artworkTint: '#B08F5F',
  paperGrain:
    'repeating-linear-gradient(94deg, rgba(122,104,78,0.022) 0 1px, rgba(255,255,255,0) 1px 3px), repeating-linear-gradient(4deg, rgba(122,104,78,0.016) 0 1px, rgba(255,255,255,0) 1px 4px)',
  paperVignette:
    'radial-gradient(120% 78% at 50% -12%, rgba(255,252,246,0.95) 0%, rgba(255,252,246,0) 52%), radial-gradient(105% 82% at 50% 112%, rgba(122,100,66,0.10) 0%, rgba(122,100,66,0) 58%), radial-gradient(78% 100% at -8% 50%, rgba(122,100,66,0.07) 0%, rgba(122,100,66,0) 46%), radial-gradient(78% 100% at 108% 50%, rgba(122,100,66,0.07) 0%, rgba(122,100,66,0) 46%)',
} as const satisfies FlColor;

export const flText = {
  primary: flColor.cream100,
  secondary: flColor.gray400,
  tertiary: flColor.gray600,
  bronzeLabel: flColor.bronze400,
} as const satisfies FlText;

export const flIcon = {
  bronze: flColor.bronze400,
  inactive: '#8B8377', // --fl-icon-inactive
  containerBg: flColor.iconContainerBg,
  containerBorder: flColor.bronzeBorderSubtle,
} as const satisfies FlIcon;

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENTS
// ─────────────────────────────────────────────────────────────────────────────

const VERTICAL = { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } } as const;

export const flGradient = {
  /** `--fl-bg-atmospheric`, linear half. The white apex radial is drawn by `ScreenBackground`. */
  bgAtmospheric: {
    colors: ['#F8F5EC', '#F6F2E8', '#F4F0E6'],
    locations: [0, 0.44, 1],
    ...VERTICAL,
  },
  /** `--fl-surface-card` — supporting cards. Cream. */
  surfaceCard: {
    colors: ['#FDFBF5', '#F8F5ED', '#F2EEE2'],
    locations: [0, 0.4, 1],
    ...VERTICAL,
  },
  /**
   * `--fl-surface-hero` — the NEW tier, and the reason it exists. Warm ivory, NOT white. One step
   * lighter than `surfaceCard`, used for the single most prominent card on a screen. Without it the
   * whole page reads as flat beige-on-beige.
   */
  surfaceHero: {
    colors: ['#FEFCF7', '#F8F3EA', '#F3EDDD'],
    locations: [0, 0.45, 1],
    ...VERTICAL,
  },
  /** `--fl-surface-elevated` — sheets. */
  surfaceElevated: {
    colors: ['#FFFFFF', '#FBF9F3', '#F6F2E8'],
    locations: [0, 0.35, 1],
    ...VERTICAL,
  },
  /** Bottom-sheet ground — the cleanest white end of the ladder, since a sheet is the top layer. */
  surfaceSheet: {
    colors: ['#FFFFFF', '#F8F5ED'],
    locations: [0, 1],
    ...VERTICAL,
  },
  /** A raised panel INSIDE a sheet — a step DOWN from the sheet, or it would out-rank its own host. */
  surfaceSheetRaised: {
    colors: ['#FBF8F0', '#F4F0E6'],
    locations: [0, 1],
    ...VERTICAL,
  },
  /** `--fl-surface-modal`. */
  surfaceModal: {
    colors: ['#FFFFFF', '#F9F6EF'],
    ...VERTICAL,
  },
  /** ⚠ IDENTICAL TO FORGE, ON PURPOSE — see the file header. */
  bronzeMetallic: {
    colors: ['#765B44', '#BA8654', '#C99767', '#BA8654', '#543D2C'],
    locations: [0, 0.38, 0.5, 0.62, 1],
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
  /**
   * `--fl-bronze-fill` — dense, aged antique brass over a NARROW luminosity range.
   *
   * ⚠ THIS IS A CORRECTION, NOT A VARIATION, and the handoff says so in as many words: *"do not reuse
   * the dark theme's `--fl-bronze-fill` value here"*. Forge's fill is an 8-stop forged sweep that dives
   * to `#2E2314` in the middle — on paper that reads as a black bar. Three stops, 12 points of
   * luminance between them, no shine.
   */
  bronzeFill: {
    colors: ['#8C7245', '#836A3E', '#785F37'],
    locations: [0, 0.5, 1],
    ...VERTICAL,
  },
  bronzeFillPressed: {
    colors: ['#9A7F52', '#907548', '#846A3E'],
    locations: [0, 0.5, 1],
    ...VERTICAL,
  },
  /** `--fl-card-hero-wash` — the faint bronze wash over the hero card. */
  missionCardWash: {
    colors: ['rgba(164,122,61,0.05)', 'rgba(164,122,61,0)'],
    locations: [0, 0.42],
    ...VERTICAL,
  },
} as const satisfies Record<string, FlGradientStops> satisfies FlGradient;

// ─────────────────────────────────────────────────────────────────────────────
// SHADOWS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every Paper shadow is warm — `rgba(70,58,42,…)`, never black. A neutral-black shadow on a cream
 * ground reads as dirt rather than depth, which is the single most common way a light theme derived
 * from a dark one looks cheap.
 */
export const flShadow = {
  card: 'inset 0 1px 0 rgba(255,255,255,0.92), 0 1px 2px rgba(70,58,42,0.07), 0 5px 14px -8px rgba(70,58,42,0.20)',
  elevated: 'inset 0 1px 0 rgba(255,255,255,1), 0 2px 4px rgba(70,58,42,0.07), 0 12px 28px -12px rgba(70,58,42,0.28)',
  ambient: '0 30px 80px -30px rgba(70,58,42,0.34), 0 4px 12px rgba(70,58,42,0.06)',
  glowSubtle: '0 0 20px rgba(164,122,61,0.12)',
  borderInset:
    'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(122,104,78,0.07), 0 1px 2px rgba(70,58,42,0.05), 0 4px 12px -6px rgba(70,58,42,0.16)',
  shadowImage: '0 2px 5px rgba(70,58,42,0.10), 0 14px 32px -14px rgba(70,58,42,0.30)',
  glowBadge: '0 0 16px rgba(164,122,61,0.20)',
  bronzeMetalTopRim: 'inset 0 1px 0 rgba(255,250,240,0.28)',
  /** Hero container — `--fl-shadow-card-hero`. */
  missionCard: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 26px -20px rgba(70,58,42,0.35)',
  /** A step down — `--fl-shadow-card-soft`. */
  trainTogetherCard: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 20px -18px rgba(70,58,42,0.28)',
  /** Top rim + bottom rim + the card shadow, which is how the design composes the CTA. */
  buttonPrimary:
    'inset 0 1px 0 rgba(255,250,240,0.28), inset 0 -1px 1px rgba(60,46,26,0.18), 0 1px 2px rgba(70,58,42,0.07), 0 5px 14px -8px rgba(70,58,42,0.20)',
  avatarRingGlow: '0 0 16px rgba(164,122,61,0.20), inset 0 1px 0 rgba(255,255,255,0.92)',
  presenceDotGlow: '0 0 6px rgba(47,125,80,0.35)',

  cardHero: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 26px -20px rgba(70,58,42,0.35)',
  cardSoft: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 20px -18px rgba(70,58,42,0.28)',
  /** The recommended card's lift, warm rather than black — `--fl-glow-subtle` over the inner rim. */
  cardLead: '0 0 20px rgba(164,122,61,0.12), inset 0 1px 0 rgba(255,255,255,0.92)',
  /** `--fl-shadow-float`, verbatim. */
  float: '0 4px 10px rgba(70,58,42,0.08), 0 20px 44px -18px rgba(70,58,42,0.30)',
  /** `--fl-shadow-modal` plus a white top rim — a sheet edge on paper is a highlight, not a glow. */
  sheet: '0 -4px 8px rgba(70,58,42,0.08), 0 -28px 64px -20px rgba(70,58,42,0.38), inset 0 1px 0 rgba(255,255,255,0.9)',
  /** `--fl-status-online-glow`. */
  statusOnlineGlow: '0 0 6px rgba(47,125,80,0.35)',
} as const satisfies FlShadow;

// ─────────────────────────────────────────────────────────────────────────────
// BORDERS
// ─────────────────────────────────────────────────────────────────────────────

export const flBorder = {
  subtle: { borderWidth: 1, borderColor: flColor.charcoal600 },
  bronze: { borderWidth: 1, borderColor: flColor.bronzeBorder },
  bronzeSubtle: { borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  active: { borderWidth: 1.5, borderColor: flColor.bronze400 },
} as const satisfies FlBorder;

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY — metrics identical to Forge; only the colours move
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
} as const satisfies FlType;
