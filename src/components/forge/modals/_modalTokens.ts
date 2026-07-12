/**
 * Modal Library — component-scoped visual constants
 * All pixel values are navigation/modal-layer specific.
 * Colours that duplicate global tokens are listed here for readability only;
 * they must exactly match src/constants/tokens.ts.
 */
export const MODAL = {
  // ── Icon containers ──────────────────────────────────────────────────────
  ICON_BOX:           40,   // Base modal header icon
  ICON_BOX_CONFIRM:   52,   // Confirmation tone circle
  ICON_BOX_STATUS:    44,   // Loading / success / failure indicator
  ICON_BOX_ERROR:     56,   // Error variant icon circle
  ICON_BOX_SUCCESS:   88,   // Ceremony success circle
  ICON_CHECK_PREMIUM: 20,   // Premium benefits check circle

  // ── Buttons ──────────────────────────────────────────────────────────────
  BTN_H:        48,   // Standard footer button height
  BTN_H_SM:     46,   // Compact confirmation button height
  CLOSE_BTN:    30,   // Header × circle diameter

  // ── Bottom sheet ─────────────────────────────────────────────────────────
  HANDLE_W:     34,
  HANDLE_H:      4,
  HANDLE_MT:     9,   // margin-top
  HANDLE_MB:    10,   // margin-bottom

  // ── Premium banner ───────────────────────────────────────────────────────
  PREMIUM_BANNER_H: 130,

  // ── Radii ────────────────────────────────────────────────────────────────
  RADIUS:        8,
  RADIUS_PILL:  99,
  RADIUS_SHEET: 12,   // bottom sheet top corners
  RADIUS_CLOSE:  6,   // close / dismiss buttons

  // ── Padding ──────────────────────────────────────────────────────────────
  PAD_MODAL:    24,   // fl-space-xl
  PAD_MODAL_SM: 20,
  PAD_SHEET_H:  12,

  // ── Motion (ms) — spec §14 motion table ──────────────────────────────────
  DUR_BACKDROP:   150,  // backdrop fade, ease-out — dims in before the modal moves
  DUR_ENTER:      220,  // modal entrance, spring·soft (translateY 8→0, scale 0.97→1)
  DUR_EXIT:       180,  // modal exit, ease-in — faster out than in
  DUR_SHEET:      240,  // bottom sheet slide, ease-out
  DUR_ACTION:     200,  // action sheet entrance, ease-out
  STAGGER_ACTION:  40,  // per-option stagger within the action sheet
  DUR_CEREMONY:   300,  // success ceremony, spring·gentle (scale 0.6→1)
  DUR_STATUS:     200,  // loading spinner ⇄ result crossfade, container fixed

  // ── Touch targets ────────────────────────────────────────────────────────
  TAP_MIN:         44,  // spec §13 — minimum actionable element size

  // ── Status-state colours (not in global tokens) ──────────────────────────
  DANGER_GLOW:  'rgba(168,82,82,0.12)',
  SUCCESS_GLOW: 'rgba(90,158,104,0.12)',

  // ── Sheet shadow ─────────────────────────────────────────────────────────
  SHEET_SHADOW_COLOR: '#000000',
} as const
