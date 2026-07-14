/**
 * CLA-C02 — Icon (bottom-nav tab glyphs)
 * Tier: 1 (Primitive)
 * Spec: Forge Home.dc.html `tabItems` (line 371) → `ForgeSymbols.SYMBOLS`
 * (design_reference `forge-symbols.js`, "Navigation" category). All five glyphs
 * are ported 1:1 (same `path` data + the Forged-DNA render: stroke-width 2,
 * SQUARE linecaps, MITER joins, miterlimit 8) — not redrawn. The Community tab
 * uses the `explore` compass glyph, per the dc (`navIcon('explore')`).
 */

import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'
import { flColor } from '@/constants/foundation'

export interface NavIconProps {
  size?: number
  color?: string
}

/** Shared Forged-DNA wrapper (matches ForgeSymbols.create). */
function Glyph({ size = 22, color = flColor.gray600, children }: NavIconProps & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeMiterlimit={8}
    >
      {children}
    </Svg>
  )
}

// home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/>'
export function HomeTabIcon(props: NavIconProps) {
  return (
    <Glyph {...props}>
      <Path d="M4 11l8-7 8 7" />
      <Path d="M6 10v9h12v-9" />
    </Glyph>
  )
}

// workouts: barbell — '<path d="M6.5 9v6"/><path d="M17.5 9v6"/><path d="M4 10.5v3"/><path d="M20 10.5v3"/><path d="M6.5 12h11"/>'
export function WorkoutsTabIcon(props: NavIconProps) {
  return (
    <Glyph {...props}>
      <Path d="M6.5 9v6" />
      <Path d="M17.5 9v6" />
      <Path d="M4 10.5v3" />
      <Path d="M20 10.5v3" />
      <Path d="M6.5 12h11" />
    </Glyph>
  )
}

// legacy: open book — '<path d="M12 6.5C10 5 7 4.5 4 5v12c3-.5 6 0 8 1.5"/><path d="M12 6.5C14 5 17 4.5 20 5v12c-3-.5-6 0-8 1.5z"/>'
export function LegacyTabIcon(props: NavIconProps) {
  return (
    <Glyph {...props}>
      <Path d="M12 6.5C10 5 7 4.5 4 5v12c3-.5 6 0 8 1.5" />
      <Path d="M12 6.5C14 5 17 4.5 20 5v12c-3-.5-6 0-8 1.5z" />
    </Glyph>
  )
}

// squads: '<circle cx="7.5" cy="8" r="2.7"/><circle cx="16.5" cy="8" r="2.7"/><path d="M3 19.5a4.5 4.5 0 0 1 9 0"/><path d="M12 19.5a4.5 4.5 0 0 1 9 0"/>'
export function SquadsTabIcon(props: NavIconProps) {
  return (
    <Glyph {...props}>
      <Circle cx={7.5} cy={8} r={2.7} />
      <Circle cx={16.5} cy={8} r={2.7} />
      <Path d="M3 19.5a4.5 4.5 0 0 1 9 0" />
      <Path d="M12 19.5a4.5 4.5 0 0 1 9 0" />
    </Glyph>
  )
}

// community: explore compass — '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'
export function CommunityTabIcon(props: NavIconProps) {
  return (
    <Glyph {...props}>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </Glyph>
  )
}
