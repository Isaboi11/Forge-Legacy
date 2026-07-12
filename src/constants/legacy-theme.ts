/**
 * Design tokens for the Legacy screen prototype (dark-only).
 *
 * NOTE: This file is preserved for backward compatibility with the existing
 * Legacy prototype components in src/components/legacy/.
 *
 * NEW screens and components should import from '@/constants/tokens' instead,
 * which is the canonical design system aligned with
 * Component-Library-Architecture-v1.0.md and Forge-Legacy-Design-System-v1.0.md.
 *
 * Migration: replace LC.* with Theme.color.* and LS.* with Theme.space.* / Theme.size.*
 */

export const LC = {
  background:    '#0E0E12',  // → Theme.color.background.primary
  surface:       '#111118',  // → Theme.color.background.surface
  surfaceBorder: '#222229',  // → Theme.color.border.subtle
  text:          '#F0EDE8',  // → Theme.color.text.primary
  textMuted:     '#9E9890',  // → Theme.color.text.secondary
  textDim:       '#666060',  // → Theme.color.text.tertiary
  accent:        '#C8A97E',  // → Theme.color.accent.primary
  success:       '#5A9E68',  // → Theme.color.success
  divider:       '#222229',  // → Theme.color.border.subtle
} as const

/** Spacing / sizing constants. */
export const LS = {
  screenPadH:  16,   // → Theme.layout.screenPaddingH
  screenPadT:  16,   // top padding of scroll content
  sectionGap:  36,   // vertical gap between L-1 sections
  cardPad:     16,   // → Theme.layout.cardPadding
  labelGap:    10,   // gap between section label and card
  itemGap:     12,   // → Theme.space.md
  progressH:   6,    // → Theme.size.progressBarHeight
  photoSize:   88,   // → Theme.size.avatarProfile
  photoGap:    8,    // → Theme.space.sm
  cardRadius:  8,    // → Theme.radius.card
  minTap:      44,   // → Theme.size.tapTargetMin
} as const
