/**
 * Navigation Library — component-scoped visual constants
 * All values are specific to the navigation layer and not yet in global tokens.
 * Global token aliases (e.g. BORDER = color.border.subtle) are declared here
 * for readability; they must match the global token value exactly.
 */
export const NAV = {
  // ── Heights ──────────────────────────────────────────────────────────────
  HEIGHT_TOP:          56,   // Default TopBar content row height
  HEIGHT_COLLAPSED:    48,   // Scrolled / collapsed TopBar
  HEIGHT_BOTTOM_ITEM:  64,   // Bottom nav tab min-height (icon + label + padding)
  HEIGHT_SEGMENT:      38,   // Segmented control inner button height
  HEIGHT_MENU_ITEM:    44,   // Dropdown menu item
  HEIGHT_SHEET_ITEM:   48,   // Bottom sheet menu item

  // ── Icon sizes ───────────────────────────────────────────────────────────
  ICON_TOP:    22,   // TopBar icon (search, bell, overflow)
  ICON_BACK:   24,   // Back button chevron
  ICON_NAV:    24,   // Bottom nav item icon
  ICON_MENU:   20,   // Overflow / sheet menu item icon
  ICON_SEARCH: 18,   // Search field magnifier
  ICON_CLEAR:  14,   // Search clear button X

  // ── Component sizes ──────────────────────────────────────────────────────
  AVATAR_SIZE:           36,   // TopBar right-side avatar circle
  BADGE_DOT:              8,   // TopBar notification dot
  BADGE_SIZE:            16,   // Bottom nav count badge
  INDICATOR_W:           26,   // Bottom nav active bar indicator width
  INDICATOR_H:            2,   // Bottom nav active bar indicator height
  GLOW_W:                46,   // Bottom nav glow circle width
  GLOW_H:                46,   // Bottom nav glow circle height
  STEP_SIZE:             32,   // Horizontal step circle diameter
  STEP_SIZE_SM:          28,   // Vertical step circle diameter
  STEP_LINE_H:            2,   // Step connector line height
  STEP_DOT:               9,   // Dot-variant step indicator diameter
  STEP_DOT_ACTIVE_W:     22,   // Active dot expanded pill width
  PAG_DOT:                8,   // Pagination dot diameter
  PAG_BAR_W:             28,   // Pagination bar width
  PAG_BAR_H:              4,   // Pagination bar height
  PAG_NUM_SIZE:          36,   // Pagination number button size
  SEP_ICON:              13,   // Breadcrumb separator icon size
  HANDLE_W:              36,   // Modal / sheet drag handle width
  HANDLE_H:               4,   // Modal / sheet drag handle height
  SEARCH_FIELD_H:        44,   // Search header field height
  SEARCH_FIELD_H_SM:     40,   // Search header field height (default/resting)
  CLEAR_BTN:             24,   // Search clear button size

  // ── Radii ────────────────────────────────────────────────────────────────
  RADIUS:          8,   // General nav button / menu radius
  RADIUS_PILL:    99,   // Pills, badges, indicators
  RADIUS_BOTTOM:  16,   // Bottom nav bar outer radius
  RADIUS_SEARCH:  12,   // Search header outer container radius
  RADIUS_SEGMENT:  8,   // Segmented control container radius
  RADIUS_SEG_BTN:  6,   // Segmented control active pill radius

  // ── Spacing ──────────────────────────────────────────────────────────────
  PAD_H:     16,   // Standard horizontal padding for TopBar
  PAD_H_SM:   8,   // Reduced horizontal padding for back navigation variant
  SEG_PAD:    3,   // Segmented control inner container padding

  // ── Colors (navigation-specific derivations / design decisions) ──────────
  // These must NOT duplicate or diverge from values in color.* tokens.
  BOTTOM_SURFACE:          '#18181F',              // Bottom nav bar background
  COLLAPSED_SURFACE:       'rgba(24,24,31,0.92)',  // Frosted collapsed TopBar
  SCRIM_BG:                'rgba(0,0,0,0.45)',     // Circular back button bg
  SCRIM_BG_PRESSED:        'rgba(0,0,0,0.70)',     // Circular back pressed
  GLOW_BG:                 'rgba(200,169,126,0.24)', // Bottom nav active glow
  GLOW_SHADOW:             'rgba(200,169,126,0.75)', // Bottom nav indicator shadow
  SEG_ACTIVE_BG:           '#2C2C36',              // Segment active pill (no bronze — CLA-P1)
  SEGMENT_SHADOW:          '0 1px 3px rgba(0,0,0,0.4)', // Placeholder — not used in RN StyleSheet
  STEP_RING:               'rgba(200,169,126,0.12)', // Current step glow ring
  STEP_ACTIVE_DOT_SHADOW:  'rgba(200,169,126,0.50)', // Dot active glow
  MENU_BG:                 '#18181F',              // Dropdown / sheet panel bg
  MENU_SHADOW_COLOR:       '#000000',
  MENU_SEPARATOR:          '#222229',
  FLOATING_BTN_BG:         '#18181F',              // Floating back button bg
  ACTIVE_INDICATOR_BORDER: '#7A6040',              // Floating back button pressed border
} as const
