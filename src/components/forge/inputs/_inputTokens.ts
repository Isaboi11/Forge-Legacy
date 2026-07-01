/**
 * Input-specific visual constants.
 * Values locked to Forge Legacy Input Library.dc.html (claude.ai/design reference).
 * Global tokens live in @/constants/tokens — these are input-layer additions only.
 */

export const INP = {
  // ── Geometry ─────────────────────────────────────────────────────────────
  HEIGHT:              52,   // comfortable field height
  HEIGHT_COMPACT:      44,   // compact density
  RADIUS:               8,   // matches radius.card
  PADDING_H:           16,   // matches space.lg
  ICON_SIZE:           18,
  ICON_SIZE_EYE:       20,
  ICON_SIZE_CLEAR:     12,
  CLEAR_BTN_SIZE:      20,
  STEPPER_BTN_SIZE:    30,
  STEPPER_BTN_RADIUS:   6,
  CHECKBOX_SIZE:       22,
  CHECKBOX_RADIUS:      4,   // matches radius.image
  TOGGLE_W:            44,
  TOGGLE_H:            26,
  THUMB_SIZE:          20,
  THUMB_ON_X:          18,   // translateX for "on" thumb position

  // ── Typography ────────────────────────────────────────────────────────────
  LABEL_SIZE:          12,   // matches smallLabel
  LABEL_WEIGHT:        '500' as const,
  INPUT_SIZE:          16,   // matches standardCardName
  INPUT_WEIGHT:        '500' as const,
  HELPER_SIZE:         13,   // matches mutedSecondary
  HELPER_LH:           18,

  // ── Row gap (between icon slots and input) ────────────────────────────────
  ROW_GAP:              8,   // matches space.sm

  // ── Focus border ──────────────────────────────────────────────────────────
  // Design: color-mix(in oklch, #C8A97E 92%, white 8%) — approximated:
  FOCUS_BORDER:        '#CDAF88',

  // ── Glow source colors (used in shadow props) ─────────────────────────────
  FOCUS_GLOW_COLOR:    '#C8A97E',
  ERROR_GLOW_COLOR:    '#A85252',
} as const
