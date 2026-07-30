/**
 * Forge Legacy Design System — Canonical Token Implementation
 *
 * This file is the authoritative "Branding Assets" layer referenced in
 * Component-Library-Architecture-v1.0.md §10 (Decision CLA-D11).
 * It binds hex values to the semantic token names defined in that document.
 *
 * RULES (per CLA-D10 / CLA-D11):
 * - All component and screen styling flows through these tokens.
 * - Raw hex values, raw pixel sizes, and magic numbers are prohibited in
 *   component code. Reference only named exports from this file.
 * - The token names here match the CLA §10 semantic contract exactly.
 *
 * Architecture: Component-Library-Architecture-v1.0.md §10–12
 * Visual spec:  Docs/Forge-Legacy-Design-System-v1.0.md
 * Dark-only V1: CLA-D12 — no light/dark pairs; single values only.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE (internal source values — do NOT import these in component code)
// These raw values exist here only to build the semantic token layer below.
// ─────────────────────────────────────────────────────────────────────────────

const _palette = {
  // Neutral dark system — warm-tinted (very subtle blue-black base reads as
  // dark charcoal under warm amber lighting, not cold tech blue)
  base:         '#09090C',   // absolute canvas base
  charcoal900:  '#0E0E12',   // primary app background
  charcoal800:  '#111118',   // card surface
  charcoal700:  '#18181F',   // elevated surface (sheets, modals)
  charcoal600:  '#222229',   // border / divider / progress track
  charcoal500:  '#2C2C36',   // skeleton shimmer base; slightly lighter hover

  // Text — warm white-to-gray ramp
  cream100:     '#F0EDE8',   // primary text: near-white, slightly warm (not sterile)
  gray400:      '#9E9890',   // secondary text: muted warm gray
  gray600:      '#666060',   // tertiary text: very muted; section labels, placeholders

  // Accent — bronze / warm gold system
  // Anchor: #C8A97E — matches existing legacy-theme.ts LC.accent
  bronze300:    '#DFC49A',   // highlight / pressed state on accent surfaces
  bronze400:    '#C8A97E',   // PRIMARY accent: earned, active, progress, legacy
  bronze600:    '#765B44',   // MUTED accent: progress track tint, ambient background
  bronzeGlow:   'rgba(200, 169, 126, 0.10)',  // ambient amber wash (use sparingly)

  // Semantic feedback palette
  greenMuted:   '#5A9E68',   // success, beginner difficulty
  redMuted:     '#A85252',   // destructive, advanced difficulty, error
  blueMuted:    '#4A7CA0',   // info (rare use)

  // Overlay
  overlayDark:      'rgba(0, 0, 0, 0.75)',
  innerHighlight:   'rgba(255, 255, 255, 0.04)',  // subtle top-edge card highlight
  innerHighlightMd: 'rgba(255, 255, 255, 0.07)',  // stronger highlight for modals
} as const


// ─────────────────────────────────────────────────────────────────────────────
// COLOR TOKENS  (CLA §10.1)
// These are the canonical semantic names. Use these everywhere.
// ─────────────────────────────────────────────────────────────────────────────

export const color = {
  background: {
    /** Main canvas — near-black, very dark charcoal */
    primary:  _palette.charcoal900,
    /** Card surface — one step above canvas */
    surface:  _palette.charcoal800,
    /** Modal / sheet surface — noticeably above card level */
    elevated: _palette.charcoal700,
    /** Semi-transparent dimming backdrop behind Modals */
    overlay:  _palette.overlayDark,
  },

  text: {
    /** High-contrast body text — warm near-white on dark */
    primary:   _palette.cream100,
    /** Supporting text — muted warm gray */
    secondary: _palette.gray400,
    /** Very muted — section labels, placeholders, chevrons */
    tertiary:  _palette.gray600,
    /** Dark text for use on accent / light surfaces */
    inverse:   _palette.base,
  },

  accent: {
    /** Bronze / warm gold — earned states, active tab, progress fill, tappable links.
     *  Every use must pass the CLA-P1 test: does this surface communicate something the athlete built? */
    primary:   _palette.bronze400,
    /** Subtler warm tone — progress bar track tint, ambient glow background */
    muted:     _palette.bronze600,
    /** Lighter bronze — hover / pressed state on accent surfaces */
    highlight: _palette.bronze300,
    /** Ambient amber wash — used for background glow effects only, never as fill */
    glow:      _palette.bronzeGlow,
  },

  difficulty: {
    /** Green — Beginner */
    beginner:     _palette.greenMuted,
    /** Amber — Intermediate (same hue family as accent) */
    intermediate: _palette.bronze400,
    /** Muted crimson — Advanced */
    advanced:     _palette.redMuted,
  },

  /** RESERVED: M-6 Destructive Confirm CTA + L-13 Delete action ONLY.
   *  Per CLA-D8: destructive intent is communicated through copy + the M-6
   *  confirmation pattern, not through button color on other surfaces. */
  destructive: _palette.redMuted,

  presence: {
    /** "Trained today" — squad surfaces only (Performance Firewall: CLA-P3) */
    active:   _palette.bronze400,
    /** "Trained this week" */
    recent:   _palette.gray400,
    /** "Not yet this week" — never red, never orange (CLA-P2 Accountability Without Shame) */
    inactive: _palette.gray600,
  },

  border: {
    /** Divider lines, input borders — very subtle */
    subtle: _palette.charcoal600,
  },

  /** Unfilled ProgressBar track */
  progressTrack: _palette.charcoal600,

  /** Skeleton shimmer base color */
  skeleton: _palette.charcoal700,

  // Semantic feedback tokens
  success: _palette.greenMuted,
  warning: _palette.bronze400,   // amber — same family as accent
  danger:  _palette.redMuted,
  info:    _palette.blueMuted,

  // Depth / lighting tokens
  /** Subtle top-edge inner highlight on elevated card surfaces */
  innerHighlight:   _palette.innerHighlight,
  /** Stronger top-edge highlight for modal / sheet surfaces */
  innerHighlightMd: _palette.innerHighlightMd,
} as const


// ─────────────────────────────────────────────────────────────────────────────
// SPACING TOKENS  (CLA §10.2 / §5.1)
// ─────────────────────────────────────────────────────────────────────────────

export const space = {
  /** 4dp — element gap within dense contexts */
  xs:   4,
  /** 8dp — internal element gap within cards */
  sm:   8,
  /** 12dp — card-to-card gap in scroll lists */
  md:   12,
  /** 16dp — screen horizontal margin; card inner padding (all sides) */
  lg:   16,
  /** 24dp — section gap: SectionHeader → content below it */
  xl:   24,
  /** 32dp — major section breaks */
  '2xl': 32,
} as const


// ─────────────────────────────────────────────────────────────────────────────
// RADIUS TOKENS  (CLA §10.3 / §5.1)
// ─────────────────────────────────────────────────────────────────────────────

export const radius = {
  /** 8dp — Card containers, Surface containers */
  card:   8,
  /** 99dp — Chips, ProgressBar ends, Badge pill (pill / capsule shape) */
  chip:   99,
  /** 4dp — Exercise thumbnails, photo thumbnails */
  image:  4,
  /** 9999 — Full circle; use with width/height equal values for Avatars */
  avatar: 9999,
} as const


// ─────────────────────────────────────────────────────────────────────────────
// ELEVATION TOKENS  (CLA §10.4)
// On a dark-first palette, elevation is expressed through surface color
// lightness steps, not drop shadows. Each level = a specific background color.
// ─────────────────────────────────────────────────────────────────────────────

export const elevation = {
  /** Flat content — same as canvas; used for section backgrounds */
  none:  _palette.charcoal900,
  /** Card surface — slightly lighter than canvas */
  card:  _palette.charcoal800,
  /** BottomSheet / profile modal — noticeably lighter than card */
  sheet: _palette.charcoal700,
  /** Ceremony modals (M1–M9) — distinctly set above sheet level */
  modal: '#1F1F28',
} as const


// ─────────────────────────────────────────────────────────────────────────────
// SIZE / MEASUREMENT TOKENS  (CLA §5.1 — Locked Measurement Table)
// ─────────────────────────────────────────────────────────────────────────────

export const size = {
  // Touch targets
  /** 44dp — minimum for all interactive elements */
  tapTargetMin:           44,
  /** 48dp — standard list rows */
  tapTargetRow:           48,
  /** 56dp — tall list rows (primary + secondary line) */
  tapTargetRowTall:       56,
  /** 72dp — exercise rows (thumbnail + chips + detail affordance) */
  tapTargetRowExercise:   72,

  // Component measurements
  /** 6dp — ProgressBar single canonical height */
  progressBarHeight:       6,

  // Avatar sizes
  /** 28dp — squad card member cluster / AvatarStack */
  avatarSquadStack:       28,
  /** 36dp — AppBar trailing avatar */
  avatarAppBar:           36,
  /** 40dp — member list rows, partner rows */
  avatarListRow:          40,
  /** 88dp — profile header (P-1) */
  avatarProfile:          88,
  /** 96dp — limited athlete profile modal */
  avatarModalProfile:     96,
  /** 8dp — overlap between adjacent avatars in AvatarStack */
  avatarStackOverlap:      8,

  // Icon sizes (CLA §5.2 / §11.3)
  /** 16dp — inline affordances (chevrons in dense contexts) */
  iconInline:             16,
  /** 20dp — decorative icons embedded in card content */
  iconCard:               20,
  /** 24dp — standard interactive icons (AppBar, row affordances) */
  iconStandard:           24,
  /** 32dp — prominent action icons (28–40dp range; 32 is the canonical default) */
  iconFeatured:           32,
  /** 48dp — EmptyState section glyph */
  iconEmptyState:         48,
  /** 72dp — Honor badge ceremonial display (L-11) */
  iconBadge:              72,

  // Layout measurements
  /** 12dp — gap between sibling Cards in a scroll list */
  cardGap:                12,
  /** 16dp — horizontal screen margin from edge */
  screenPaddingH:         16,
  /** 340dp — ceremony modal maximum width */
  modalMaxWidth:         340,
  /** 800dp — max content width on larger screens */
  maxContentWidth:       800,
} as const


// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY TOKENS  (CLA §12)
// Typeface: Platform system font — SF Pro (iOS), Roboto (Android).
// Zero licensing cost, zero load time, full Dynamic Type support.
// All scale steps used via CLA-C01 Text component; never raw values in screen code.
// ─────────────────────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    /** Maps to platform default at runtime (SF Pro / Roboto) */
    system: undefined as string | undefined,
  },

  /**
   * 12-step locked type scale (CLA-D13: no intermediate sizes without amendment).
   * Fields: fontSize, fontWeight, lineHeight, letterSpacing, textTransform?
   */
  scale: {
    /** 28sp Semibold — exercise names in active workout card; ceremony modal headlines */
    exerciseTitle: {
      fontSize: 28, fontWeight: '600' as const,
      lineHeight: 34, letterSpacing: -0.3,
    },
    /** 24sp Semibold — section headings within a screen */
    screenSectionHeading: {
      fontSize: 24, fontWeight: '600' as const,
      lineHeight: 30, letterSpacing: -0.2,
    },
    /** 22sp Semibold — profile display name (P-1 Tier 1), large onboarding headings */
    largeHeading: {
      fontSize: 22, fontWeight: '600' as const,
      lineHeight: 28, letterSpacing: -0.2,
    },
    /** 20sp Semibold — AppBar titles, screen-level titles */
    screenTitle: {
      fontSize: 20, fontWeight: '600' as const,
      lineHeight: 26, letterSpacing: -0.2,
    },
    /** 18sp Semibold — chapter / goal / squad names inside Cards */
    primaryCardContent: {
      fontSize: 18, fontWeight: '600' as const,
      lineHeight: 24, letterSpacing: -0.1,
    },
    /** 17sp Medium — app wordmark, invitation headlines */
    wordmark: {
      fontSize: 17, fontWeight: '500' as const,
      lineHeight: 22, letterSpacing: 0,
    },
    /** 16sp Medium — standard card names, list row primary text, honor names */
    standardCardName: {
      fontSize: 16, fontWeight: '500' as const,
      lineHeight: 22, letterSpacing: 0,
    },
    /** 15sp Regular — descriptions, secondary card body, search bar input text */
    secondaryContent: {
      fontSize: 15, fontWeight: '400' as const,
      lineHeight: 21, letterSpacing: 0,
    },
    /** 14sp Regular — athlete type, rank display, metadata in cards */
    supportingMeta: {
      fontSize: 14, fontWeight: '400' as const,
      lineHeight: 20, letterSpacing: 0,
    },
    /** 13sp Regular — dates, time-ago, presence state labels, secondary metadata */
    mutedSecondary: {
      fontSize: 13, fontWeight: '400' as const,
      lineHeight: 18, letterSpacing: 0,
    },
    /** 12sp Regular — small labels, program association, character count */
    smallLabel: {
      fontSize: 12, fontWeight: '400' as const,
      lineHeight: 16, letterSpacing: 0,
    },
    /** 11sp Regular ALL-CAPS — section headers ONLY (CLA-D14: ALL-CAPS restricted to this token).
     *  textTransform enforced internally by SectionHeader (CLA-C17); do not apply elsewhere. */
    sectionHeader: {
      fontSize: 11, fontWeight: '400' as const,
      lineHeight: 14, letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
    },
  },
} as const


// ─────────────────────────────────────────────────────────────────────────────
// MOTION TOKENS  (CLA §9.2–9.3)
// Duration in milliseconds. Easing descriptors map to React Native Animated
// or Reanimated easing functions at implementation time.
// ─────────────────────────────────────────────────────────────────────────────

export const motion = {
  duration: {
    /** 50ms — spring interactions: toggles, tap feedback, favorite heart */
    toggle:            50,
    /** 150ms — section expand/collapse (ease-out) */
    sectionCollapse:  150,
    /** 150ms — skeleton → content cross-dissolve (suppressed if content loads <200ms) */
    skeletonResolve:  150,
    /** 200ms — image crossfade on media load; modal fade-in overlay */
    imageCrossfade:   200,
    /** 250ms — BottomSheet slide-up (ease-out) */
    sheetSlideUp:     250,
    /** 300ms — Toast fade-out (begins at 2700ms after display; ease-in) */
    toastFadeOut:     300,
    /** 500ms — M-1 Rank Up ceremony reveal (maximum; most significant moment) */
    ceremonyReveal:   500,
  },

  easing: {
    /** For interactive responses: toggles, tap feedback — spring physics */
    spring:  'spring',
    /** For element entrances: modals appearing, sheets sliding up, content loading */
    easeOut: 'ease-out',
    /** For element exits: toasts fading, modals dismissing */
    easeIn:  'ease-in',
    // 'linear' is never used (CLA §9.3)
  },

  /** Skeleton is suppressed if content resolves in under this threshold (ms) */
  skeletonSuppressionThreshold: 200,
  /** Toast total display time before auto-dismiss */
  toastAutoDismissMs:           3000,
  /** Toast fade begins this many ms after display */
  toastFadeBeginsMs:            2700,
} as const


// ─────────────────────────────────────────────────────────────────────────────
// SHADOW TOKENS
// Supplementary to elevation-based surface color. Subtle shadow adds physical
// depth without harsh outlines. All values use React Native shadow props.
// ─────────────────────────────────────────────────────────────────────────────

export const shadow = {
  /** Standard card depth */
  card: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius:  8,
    elevation:     3,   // Android equivalent
  },
  /** Elevated surface (sheets, profile) */
  elevated: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius:  16,
    elevation:     8,
  },
  /** Ceremony modal — deepest shadow */
  modal: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius:  24,
    elevation:     12,
  },
} as const


// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT TOKENS
// Pre-composed from spacing + size tokens; use these for screen-level layout
// rather than raw space.* values when they have a layout-semantic name.
// ─────────────────────────────────────────────────────────────────────────────

export const layout = {
  /** 16dp — horizontal padding from screen edge to content */
  screenPaddingH:   space.lg,
  /** 16dp — internal card padding on all sides */
  cardPadding:      space.lg,
  /** 12dp — vertical gap between sibling Cards in scroll lists */
  cardGap:          space.md,
  /** 24dp — spacing above a SectionHeader */
  sectionGapAbove:  space.xl,
  /** 8dp — spacing below a SectionHeader before content starts */
  sectionGapBelow:  space.sm,
  /** 8dp — gap between elements within a card body */
  elementGap:       space.sm,
  /** 4dp — tight sub-element gap (timestamp + icon, etc.) */
  microGap:         space.xs,
  /** 800dp — maximum content width on tablet / desktop */
  maxContentWidth:  size.maxContentWidth,
  /** 340dp — ceremony modal max width */
  modalMaxWidth:    size.modalMaxWidth,
} as const


// ─────────────────────────────────────────────────────────────────────────────
// Z-LAYER ORDER  (CLA §7.4)
// No component may render above its assigned z-layer floor without amendment.
// ─────────────────────────────────────────────────────────────────────────────

export const zIndex = {
  /** Tier 3 components, ListItems, Cards */
  content:      0,
  /** AppBar — fixed top */
  appBar:       10,
  /** TabBar — fixed bottom */
  tabBar:       20,
  /** Toast — above TabBar */
  toast:        30,
  /** BottomSheet — utility surfaces */
  bottomSheet:  40,
  /** Modal — ceremony overlays; highest */
  modal:        50,
} as const


// ─────────────────────────────────────────────────────────────────────────────
// THEME — COMPOSED EXPORT
// Single import point: `import { Theme } from '@/constants/tokens'`
// Individual named exports above allow tree-shaking for component-level use.
// ─────────────────────────────────────────────────────────────────────────────

export const Theme = {
  color,
  space,
  radius,
  elevation,
  size,
  typography,
  motion,
  shadow,
  layout,
  zIndex,
} as const

export type ThemeType = typeof Theme
