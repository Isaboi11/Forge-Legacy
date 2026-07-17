/**
 * CLA-C02 — Icon (Home v2 subset)
 * Tier: 1 (Primitive)
 * Spec: Forge Home.dc.html — hand-authored line-glyph set, ported 1:1 (same
 * path data) from the Claude Design source into react-native-svg.
 *
 * These are the specific glyphs Home v2 consumes. Phosphor Icons is the
 * eventual sanctioned icon library (Component-Library-Architecture-v1.0.md
 * §11.3) but is not yet integrated into the codebase — this local set keeps
 * Home pixel-faithful to the approved design without inventing a bespoke
 * one-off per screen. Fold into a full Phosphor integration when that lands.
 */

import React from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg'
import { flColor } from '@/constants/foundation'

export interface HomeIconProps {
  size?: number
  color?: string
}

export function ChevronRightIcon({ size = 20, color = flColor.gray600 }: HomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8} />
    </Svg>
  )
}

export function BarbellIcon({ size = 21, color = flColor.bronze400 }: HomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="square"
        strokeLinejoin="miter" strokeMiterlimit={8}
      />
    </Svg>
  )
}

export function CalendarIcon({ size = 21, color = flColor.bronze400 }: HomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={5} width={16} height={15} rx={2.5} stroke={color} strokeWidth={2} />
      <Path
        d="M4 9.5h16M8.5 3v4M15.5 3v4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="square"
        strokeLinejoin="miter" strokeMiterlimit={8}
      />
    </Svg>
  )
}

export function SquadIcon({ size = 27, color = flColor.bronze400 }: HomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.6c-2.3.3-3.1 2-3.1 3.6M12 3.6c2.3.3 3.1 2 3.1 3.6M6 13a6 6 0 0 1 12 0M6 13v2.4a4 4 0 0 0 2.6 3.7M18 13v2.4a4 4 0 0 1-2.6 3.7M12 7.2v9.3M9 12.6h6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="square"
        strokeLinejoin="miter" strokeMiterlimit={8}
      />
    </Svg>
  )
}

export function FriendsIcon({ size = 25, color = flColor.gray600 }: HomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={3} stroke={color} strokeWidth={2} />
      <Path
        d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M17.5 20a6 6 0 0 0-2-4.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="square"
        strokeLinejoin="miter" strokeMiterlimit={8}
      />
    </Svg>
  )
}

export function FlameIcon({ size = 18, color = '#E0913F' }: HomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="square"
        strokeLinejoin="miter" strokeMiterlimit={8}
      />
    </Svg>
  )
}

/**
 * The Forge Legacy pillar mark. Default: the AppBar wordmark glyph (compact 3-stop bronze fill).
 * `rich`: the Welcome/entry hero variant — the design's 5-stop `obLogoA` gradient (a hotter, deeper
 * forged-metal ramp). The AppBar keeps the default; only the Welcome lockup passes `rich`.
 */
export function ForgeMarkIcon({ width = 19, height = 28, rich = false }: { width?: number; height?: number; rich?: boolean }) {
  const gradId = rich ? 'forgeMarkGradRich' : 'forgeMarkGrad'
  return (
    <Svg width={width} height={height} viewBox="16 0 68 102">
      <Defs>
        {rich ? (
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FBE7B8" />
            <Stop offset="18%" stopColor="#EAC585" />
            <Stop offset="44%" stopColor="#C79A5A" />
            <Stop offset="72%" stopColor="#9E7440" />
            <Stop offset="100%" stopColor="#6A4620" />
          </LinearGradient>
        ) : (
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#DCB57A" />
            <Stop offset="52%" stopColor="#BF8F4F" />
            <Stop offset="100%" stopColor="#835F32" />
          </LinearGradient>
        )}
      </Defs>
      <Polygon points="43,6 57,6 57,96 43,96" fill={`url(#${gradId})`} />
      <Polygon points="23,42 37,27 37,96 23,96" fill={`url(#${gradId})`} />
      <Polygon points="63,27 77,42 77,96 63,96" fill={`url(#${gradId})`} />
    </Svg>
  )
}

/**
 * The Forge mark inside its warm radial glow — the Welcome/entry hero lockup (matches the
 * approved onboarding first-screen design: the pillar mark haloed in bronze light over the
 * slate ground). `glow` sizes the halo box; the mark is centered and scaled within it.
 */
export function ForgeBrandMark({ glow = 260, mark = 113 }: { glow?: number; mark?: number }) {
  const markWidth = Math.round(mark * (77 / 113)) // design mark aspect 77×113
  return (
    <View style={[brandMarkStyles.wrap, { width: glow, height: glow }]}>
      <Svg width={glow} height={glow} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="forgeBrandGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#F0C079" stopOpacity={0.5} />
            <Stop offset="42%" stopColor="#C8853E" stopOpacity={0.16} />
            <Stop offset="100%" stopColor="#C8853E" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={glow} height={glow} fill="url(#forgeBrandGlow)" />
      </Svg>
      <ForgeMarkIcon rich width={markWidth} height={mark} />
    </View>
  )
}

const brandMarkStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
})
