/**
 * Button-specific visual constants.
 * Values transcribed verbatim from Button.dc.html (claude.ai/design project
 * 7b89a003-0323-4193-af8a-686b1cd65d7d, "Forge Legacy Button Component Library").
 * Global tokens live in @/constants/tokens — these are button-layer additions only.
 *
 * `boxShadow` / `filter` values are literal CSS strings — supported directly as
 * View style props on RN 0.85 (New Architecture), so they're transcribed as-is
 * rather than approximated with legacy shadow* props.
 */

import { color } from '@/constants/tokens'

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
  // Default: linear-gradient(180deg, #D4A257 0%, #C68A3D 50%, #7B4B1A 100%)
  GRAD_COLORS:    ['#D4A257', '#C68A3D', '#7B4B1A'] as const,
  GRAD_START:     { x: 0.5, y: 0 },
  GRAD_END:       { x: 0.5, y: 1 },
  GRAD_LOCATIONS: [0, 0.5, 1] as const,

  // Selected / success keep the design's 150deg diagonal
  GRAD_START_ANGLED: { x: 0.15, y: 1 },
  GRAD_END_ANGLED:    { x: 0.85, y: 0 },

  // Selected state — linear-gradient(150deg, #C08947 0%, #A9722C 52%, #6E4518 100%)
  GRAD_COLORS_SELECTED: ['#C08947', '#A9722C', '#6E4518'] as const,

  // Success state — linear-gradient(150deg, #7FBF8D 0%, #5A9E68 52%, #3E7A4C 100%)
  GRAD_COLORS_SUCCESS: ['#7FBF8D', '#5A9E68', '#3E7A4C'] as const,

  // Top-highlight overlay layer (approximates the design's radial-gradient
  // sheen: `radial-gradient(135% 92% at 50% -14%, rgba(255,247,232,0.22) 0%, rgba(255,247,232,0) 44%)`)
  HIGHLIGHT_OVERLAY_COLORS: ['rgba(255,247,232,0.22)', 'rgba(255,247,232,0)'] as const,

  // Destructive default fill — linear-gradient(180deg, #1F1310 0%, #170F0D 100%)
  DESTRUCTIVE_GRAD_COLORS: ['#1F1310', '#170F0D'] as const,

  // Icon button default fill — approximates
  // radial-gradient(130% 130% at 50% 0%, rgba(200,138,61,0.18) 0%, rgba(200,138,61,0.045) 60%, rgba(200,138,61,0) 100%)
  ICON_GLOW_COLORS: ['rgba(200,138,61,0.18)', 'rgba(200,138,61,0.045)', 'rgba(200,138,61,0)'] as const,
  ICON_GLOW_LOCATIONS: [0, 0.6, 1] as const,

  // Secondary default fill — linear-gradient(180deg, rgba(214,164,91,0.06) 0%, rgba(214,164,91,0) 100%)
  SECONDARY_GRAD_COLORS: ['rgba(214,164,91,0.06)', 'rgba(214,164,91,0)'] as const,

  // ── Typography ──────────────────────────────────────────────────────────
  FONT_WEIGHT:      '600' as const,
  LETTER_SPACING:   0.2,
  LABEL_LINE_HEIGHT: 16,  // design uses line-height:1 (== 16px font size); tight, flex-centered

  // ── Text shadow (bronze fill only) ──────────────────────────────────────
  TEXT_SHADOW_BRONZE:  'rgba(58,34,9,0.5)',   // 0 1px 1px — default/selected/error
  TEXT_SHADOW_SUCCESS: 'rgba(18,48,26,0.5)',  // 0 1px 1px — success

  // ── Box shadows — Primary (non-FAB, bronze fill) ────────────────────────
  BOX_SHADOW_PRIMARY_DEFAULT:
    'inset 0 1px 0 rgba(255,244,222,0.32), inset 1px 1px 0 rgba(255,238,210,0.36), inset -1px -1px 0 rgba(48,27,6,0.5), inset 0 -1.5px 1px rgba(56,31,7,0.5), inset 0 0 0 1px rgba(182,122,58,0.42), 0 0 12px rgba(214,164,91,0.26), 0px 5px 14px rgba(0,0,0,0.5), 0px 9px 22px rgba(0,0,0,0.34)',
  BOX_SHADOW_PRIMARY_PRESSED:
    'inset 0 2px 6px rgba(44,24,4,0.6), inset 0 1px 0 rgba(255,238,214,0.24), inset 0 0 0 1px rgba(158,104,47,0.6), 0 0 14px rgba(222,172,96,0.5), 0px 2px 8px rgba(0,0,0,0.5)',
  BOX_SHADOW_PRIMARY_SELECTED:
    '0px 4px 14px rgba(0,0,0,0.5), 0 0 24px rgba(200,138,61,0.55), inset 0 0 0 1px rgba(255,236,210,0.34), inset 0 1px 0 rgba(255,255,255,0.20)',
  BOX_SHADOW_PRIMARY_SUCCESS:
    '0px 4px 14px rgba(0,0,0,0.5), 0 0 22px rgba(90,158,104,0.55), inset 0 1px 0 rgba(255,255,255,0.30)',
  BOX_SHADOW_PRIMARY_ERROR:
    '0px 4px 14px rgba(0,0,0,0.5), 0 0 24px rgba(168,82,82,0.6), inset 0 0 0 1px rgba(168,82,82,0.55), inset 0 1px 0 rgba(255,255,255,0.20)',

  // ── Box shadows — FAB (bronze fill, stronger elevation) ─────────────────
  BOX_SHADOW_FAB_DEFAULT:
    'inset 0 1px 0 rgba(255,244,222,0.36), inset 1px 1px 0 rgba(255,238,210,0.38), inset -1px -1px 0 rgba(48,27,6,0.55), inset 0 -2px 2px rgba(56,31,7,0.5), inset 0 0 0 1px rgba(182,122,58,0.42), 0 0 12px rgba(214,164,91,0.28), 0px 12px 28px rgba(0,0,0,0.62), 0px 4px 10px rgba(0,0,0,0.4)',
  BOX_SHADOW_FAB_PRESSED:
    'inset 0 3px 8px rgba(44,24,4,0.62), inset 0 1px 0 rgba(255,238,214,0.28), inset 0 0 0 1px rgba(158,104,47,0.62), 0 0 20px rgba(222,172,96,0.55), 0px 4px 12px rgba(0,0,0,0.5)',
  BOX_SHADOW_FAB_SELECTED:
    '0px 10px 24px rgba(0,0,0,0.58), 0 0 24px rgba(200,138,61,0.55), inset 0 0 0 1px rgba(255,236,210,0.34), inset 0 1px 0 rgba(255,255,255,0.20)',
  BOX_SHADOW_FAB_SUCCESS:
    '0px 10px 24px rgba(0,0,0,0.55), 0 0 22px rgba(90,158,104,0.55), inset 0 1px 0 rgba(255,255,255,0.30)',
  BOX_SHADOW_FAB_ERROR:
    '0px 10px 24px rgba(0,0,0,0.55), 0 0 24px rgba(168,82,82,0.6), inset 0 0 0 1px rgba(168,82,82,0.55), inset 0 1px 0 rgba(255,255,255,0.20)',

  // ── Box shadows — Secondary / Icon (outline, shared "pressed" treatment) ─
  BOX_SHADOW_OUTLINE_DEFAULT: 'inset 0 1px 0 rgba(255,242,218,0.22), 0 0 14px rgba(214,164,91,0.2)',
  BOX_SHADOW_OUTLINE_PRESSED: 'inset 0 0 0 1px rgba(214,164,91,0.6), inset 0 2px 5px rgba(44,24,4,0.4), 0 0 16px rgba(214,164,91,0.34)',
  BOX_SHADOW_OUTLINE_SELECTED: '0 0 18px rgba(200,138,61,0.34), inset 0 0 0 1px rgba(200,138,61,0.42)',

  BOX_SHADOW_ICON_DEFAULT: 'inset 0 1px 0 rgba(255,240,215,0.3), inset 0 -1px 0 rgba(45,26,6,0.4), 0 0 10px rgba(214,164,91,0.28), 0px 2px 8px rgba(0,0,0,0.4)',

  // ── Box shadows — Ghost ──────────────────────────────────────────────────
  BOX_SHADOW_GHOST_SELECTED: 'inset 0 0 0 1px rgba(200,138,61,0.3)',

  // ── Box shadows — Destructive ────────────────────────────────────────────
  BOX_SHADOW_DESTRUCTIVE_DEFAULT: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 12px rgba(192,86,60,0.22), 0px 2px 8px rgba(0,0,0,0.42)',
  BOX_SHADOW_DESTRUCTIVE_PRESSED: 'inset 0 2px 5px rgba(20,8,6,0.55), 0 0 20px rgba(214,94,64,0.48)',
  BOX_SHADOW_DESTRUCTIVE_SELECTED: '0 0 14px rgba(168,82,82,0.3), inset 0 0 0 1px rgba(196,106,106,0.45)',

  // ── Box shadows — non-fill success/error (Secondary/Ghost/Destructive/Icon) ─
  BOX_SHADOW_SUCCESS_NON_FILL: '0 0 16px rgba(90,158,104,0.35)',
  BOX_SHADOW_ERROR_NON_FILL:   '0 0 18px rgba(168,82,82,0.4)',

  // ── Focus ring (halo) — appended to whatever box-shadow is already active ─
  // (mirrors Button.dc.html's `existing ? existing + ', ' + ring : ring` logic
  // so variants with no base box-shadow — e.g. Ghost — don't get a stray leading comma)
  appendFocusRing(boxShadow: string, bg: string = color.background.primary): string {
    const ring = `0 0 0 1.5px ${bg}, 0 0 0 3px ${color.accent.primary}, 0 0 13px rgba(200,138,61,0.26)`
    return boxShadow && boxShadow !== 'none' ? `${boxShadow}, ${ring}` : ring
  },

  // ── Filters ──────────────────────────────────────────────────────────────
  PRESSED_FILTER_BRONZE: 'brightness(0.97) saturate(1.05)',
  DISABLED_FILTER:       'saturate(0.7) brightness(0.84)',

  // ── Disabled (uniform across all variants) ──────────────────────────────
  DISABLED_OPACITY:    0.42,
  DISABLED_BOX_SHADOW: 'inset 0 0 0 1px rgba(150,104,54,0.32)',

  // ── State colors ─────────────────────────────────────────────────────────
  WHITE: '#FFFFFF',
  /** Default text/icon color for outline variants (Secondary/Ghost/Icon) — the
   *  design uses the *highlight* bronze here, not the primary accent bronze. */
  DEFAULT_TEXT_OUTLINE: color.accent.highlight,

  BORDER_BRONZE_SECONDARY: 'rgba(214,164,91,0.92)',
  BORDER_BRONZE_ICON:      'rgba(206,154,88,0.9)',

  DESTRUCTIVE_PRESSED_BG: '#241411',
  DESTRUCTIVE_PRESSED_BORDER: 'rgba(214,94,64,0.95)',

  SECONDARY_PRESSED_BG: 'rgba(214,164,91,0.16)',
  GHOST_PRESSED_BG:     'rgba(214,164,91,0.11)',
  GHOST_PRESSED_OPACITY: 0.74,
  ICON_PRESSED_BG:      'rgba(214,164,91,0.16)',

  SELECTED_BRONZE_BG:   'rgba(200,138,61,0.20)',
  SELECTED_GHOST_BG:    'rgba(200,138,61,0.15)',
  SELECTED_DESTR_BG:    'rgba(168,82,82,0.22)',
  SELECTED_DESTR_BORDER: '#C46A6A',

  SUCCESS_NON_FILL_BG:  'rgba(90,158,104,0.16)',
  ERROR_NON_FILL_BG:    'rgba(168,82,82,0.16)',
  ERROR_TEXT:           '#E19292',
} as const
