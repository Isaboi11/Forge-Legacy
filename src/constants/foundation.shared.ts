/**
 * The parts of the Visual Foundation that do NOT change between Forge (dark) and Paper (light).
 *
 * Radii, the type ramp's metrics, the font stack and motion are theme-independent by decision — the
 * Paper amendment is a COLOUR amendment. Keeping them here rather than duplicating them into both
 * palette files means a radius can never drift between themes, which is the exact failure the two
 * pre-existing token systems already demonstrate (`foundation.ts` and `tokens.ts` carry two different
 * bronzes because nothing held them together).
 */

// ─────────────────────────────────────────────────────────────────────────────
// RADII
// ─────────────────────────────────────────────────────────────────────────────

export const flRadius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
  round: 9999,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY — family only; the coloured type ramp lives per-theme in `flType`
// ─────────────────────────────────────────────────────────────────────────────

/** Loaded via @expo-google-fonts/playfair-display in the root layout. */
export const flFont = {
  sans: undefined as string | undefined,
  display: 'PlayfairDisplay_600SemiBold',
  displayMedium: 'PlayfairDisplay_500Medium',
} as const;

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
} as const;
