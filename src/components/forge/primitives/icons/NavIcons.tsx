/**
 * CLA-C02 — Icon (bottom-nav tab glyphs)
 *
 * ⭐ 2026-09-25: drawn from the PO's engraved set (`EngravedIcon`). The active tab (bronze) wears the
 * engraved gradient; inactive tabs stay flat grey. Same five meanings as before — only the drawing moved.
 * The history below is the pre-engraved port.
 *
 * Tier: 1 (Primitive)
 * Spec: Forge Home.dc.html `tabItems` (line 371) → `ForgeSymbols.SYMBOLS`
 * (design_reference `forge-symbols.js`, "Navigation" category). All five glyphs
 * are ported 1:1 (same `path` data + the Forged-DNA render: stroke-width 2,
 * SQUARE linecaps, MITER joins, miterlimit 8) — not redrawn. The Community tab
 * uses the `explore` compass glyph, per the dc (`navIcon('explore')`).
 */

import React from 'react'
import { flColor } from '@/constants/foundation'
import { EngravedIcon, engravedTint, type EngravedName } from './EngravedIcon'

export interface NavIconProps {
  size?: number
  color?: string
}

function tab(name: EngravedName) {
  return function TabIcon({ size = 22, color = flColor.gray600 }: NavIconProps) {
    return <EngravedIcon name={name} size={size} color={engravedTint(color)} />
  }
}

export const HomeTabIcon = tab('home')
export const WorkoutsTabIcon = tab('barbell')
export const LegacyTabIcon = tab('book')
export const SquadsTabIcon = tab('people')
/** NUT-D1 put Nutrition in the fifth, right-most slot; the flame is the calorie ring's glyph. */
export const NutritionTabIcon = tab('flame')
export const CommunityTabIcon = tab('compass')
