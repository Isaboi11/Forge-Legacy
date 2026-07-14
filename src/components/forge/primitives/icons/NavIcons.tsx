/**
 * CLA-C02 — Icon (app-shell nav subset)
 * Tier: 1 (Primitive)
 * Spec: Forge Home.dc.html `renderVals()` `tabItems` — ported 1:1 (same path
 * data) for Home and Legacy. Workout and Squads have no Claude Design source
 * yet (both tabs route to placeholder screens) — their glyphs are new marks
 * authored in the same stroke style (round-cap, currentColor, 1.8 stroke) so
 * they don't stand out. ExploreTabIcon is kept for the still-existing
 * `/explore` route even though it's no longer wired into the bottom nav.
 */

import React from 'react'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { flColor } from '@/constants/foundation'

export interface NavIconProps {
  size?: number
  color?: string
}

export function HomeTabIcon({ size = 22, color = flColor.gray600 }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 11l8-7 8 7M6 10v9h12v-9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function ExploreTabIcon({ size = 22, color = flColor.gray600 }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={1.8} />
      <Path
        d="M14.5 9.5l-1.8 4.2-4.2 1.8 1.8-4.2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function WorkoutTabIcon({ size = 22, color = flColor.gray600 }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 12h10" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M6 10.5v3M18 10.5v3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Rect x={2.5} y={9} width={3.5} height={6} rx={1} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Rect x={18} y={9} width={3.5} height={6} rx={1} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  )
}

export function SquadsTabIcon({ size = 22, color = flColor.gray600 }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={2.5} stroke={color} strokeWidth={1.8} />
      <Circle cx={16.5} cy={9} r={2} stroke={color} strokeWidth={1.8} />
      <Path d="M4.5 18c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M14.5 18c0-1.9 1.4-3.3 3-3.3s3 1.4 3 3.3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

export function LegacyTabIcon({ size = 22, color = flColor.gray600 }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 5.5h6a2 2 0 012 2V19a2 2 0 00-2-2H5zM19 5.5h-6a2 2 0 00-2 2V19a2 2 0 012-2h6z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
