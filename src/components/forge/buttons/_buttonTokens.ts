/**
 * Button-specific visual constants.
 * Values locked to ButtonLibrary.dc.html (claude.ai/design reference).
 * Global tokens live in @/constants/tokens — these are button-layer additions only.
 */

export const BTN = {
  // ── Geometry ────────────────────────────────────────────────────────────
  HEIGHT:       52,
  HEIGHT_ICON:  44,
  HEIGHT_FAB:   60,
  RADIUS:       12,
  RADIUS_FAB:   9999,
  PADDING_H:    24,

  ICON_SIZE:      18,  // icons inside text buttons
  ICON_SIZE_ICON: 22,  // square icon button
  ICON_SIZE_FAB:  26,  // FAB

  // ── Bronze gradient (Primary + FAB) ─────────────────────────────────────
  // Three-stop diagonal: BronzeBright → BronzePrimary → BronzeDark
  // Source: ButtonLibrary.dc.html gradient(150deg, #D8A45B 0%, #C68A3D 50%, #8A5A22 100%)
  GRAD_COLORS:    ['#D8A45B', '#C68A3D', '#8A5A22'] as const,
  GRAD_START:     { x: 0.15, y: 1 },   // approximates 150° diagonal
  GRAD_END:       { x: 0.85, y: 0 },
  GRAD_LOCATIONS: [0, 0.5, 1] as const,

  // Selected state — darker forged fill
  GRAD_COLORS_SELECTED: ['#C08947', '#A9722C', '#6E4518'] as const,

  // Success state — green gradient
  GRAD_COLORS_SUCCESS: ['#7FBF8D', '#5A9E68', '#3E7A4C'] as const,

  // ── Typography ──────────────────────────────────────────────────────────
  FONT_WEIGHT:    '600' as const,
  LETTER_SPACING: 0.2,

  // ── Shadows ─────────────────────────────────────────────────────────────
  // iOS shadow props approximate the CSS box-shadows in the design reference.
  // Android uses elevation. These are defined per button state.
  SHADOW_PRIMARY: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.52,
    shadowRadius: 8,
    elevation: 10,
  },
  SHADOW_FAB: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.62,
    shadowRadius: 14,
    elevation: 20,
  },
  SHADOW_CARD: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  // Pressed glow — approximates 0 0 16px rgba(200,138,61,0.8)
  SHADOW_GLOW_PRESSED: {
    shadowColor: '#C68A3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.72,
    shadowRadius: 10,
    elevation: 14,
  },
  // FAB pressed glow
  SHADOW_FAB_PRESSED: {
    shadowColor: '#C68A3D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 14,
    elevation: 18,
  },
  // Destructive pressed
  SHADOW_DESTRUCTIVE_PRESSED: {
    shadowColor: '#A85252',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.52,
    shadowRadius: 12,
    elevation: 8,
  },
  // Success glow
  SHADOW_SUCCESS: {
    shadowColor: '#5A9E68',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 11,
    elevation: 8,
  },
  // Error glow
  SHADOW_ERROR: {
    shadowColor: '#A85252',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },

  // ── State colors not in global tokens ───────────────────────────────────
  WHITE:                '#FFFFFF',
  TEXT_SHADOW_BRONZE:   'rgba(70,45,15,0.48)',   // text-shadow on bronze fill
  DESTRUCTIVE_PRESSED:  '#221319',               // pressed bg for Destructive
  SECONDARY_PRESSED_BG: 'rgba(200,169,126,0.14)',
  GHOST_PRESSED_BG:     'rgba(200,169,126,0.10)',
  ICON_PRESSED_BG:      'rgba(200,169,126,0.14)',
  SELECTED_BRONZE_BG:   'rgba(200,138,61,0.20)',
  SELECTED_GHOST_BG:    'rgba(200,138,61,0.15)',
  SELECTED_DESTR_BG:    'rgba(168,82,82,0.22)',
  SUCCESS_NON_FILL_BG:  'rgba(90,158,104,0.16)',
  ERROR_NON_FILL_BG:    'rgba(168,82,82,0.16)',
  ERROR_TEXT:           '#E19292',
} as const
