import React from 'react'
import { StyleSheet, View } from 'react-native'
import { color } from '@/constants/tokens'
import { PROG } from './_progressTokens'
import type { ForgeCircularProgressProps, CircularSize } from './types'

const SIZE_MAP: Record<CircularSize, { diameter: number; stroke: number }> = {
  small:  { diameter: PROG.CIRC_SM,  stroke: PROG.STROKE_SM },
  medium: { diameter: PROG.CIRC_MD,  stroke: PROG.STROKE_MD },
  large:  { diameter: PROG.CIRC_LG,  stroke: PROG.STROKE_LG },
}

export function ForgeCircularProgress({
  percentage,
  size = 'medium',
  centerContent,
  centerBg = 'transparent',
  style,
  accessibilityLabel,
}: ForgeCircularProgressProps) {
  const pct = Math.max(0, Math.min(100, percentage))
  const { diameter, stroke } = SIZE_MAP[size]

  return (
    <View
      style={[{ width: diameter, height: diameter }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <CircularRing
        diameter={diameter}
        stroke={stroke}
        percentage={pct}
        fillColor={color.accent.primary}
        trackColor={PROG.TRACK_BG}
        centerBg={centerBg}
      />
      {centerContent ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>{centerContent}</View>
      ) : null}
    </View>
  )
}

function CircularRing({
  diameter,
  stroke,
  percentage,
  fillColor,
  trackColor,
  centerBg,
}: {
  diameter: number
  stroke: number
  percentage: number
  fillColor: string
  trackColor: string
  centerBg: string
}) {
  const r = diameter / 2
  const innerSize = diameter - stroke * 2

  // Rotation angles using the two-half-circle technique.
  // Each half clip reveals its arc as its circle rotates from 180deg -> 0deg.
  const rightAngle = (1 - Math.min(percentage, 50) / 50) * 180
  const leftAngle  = (1 - Math.max(0, percentage - 50) / 50) * 180
  const showLeft   = percentage > 50

  return (
    <View style={[StyleSheet.absoluteFill]}>
      {/* Track ring */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: r, borderWidth: stroke, borderColor: trackColor, backgroundColor: 'transparent' },
        ]}
      />

      {/* Right half clip — reveals 0%→50% */}
      {percentage > 0 ? (
        <View style={[styles.halfClip, { right: 0, width: r, height: diameter }]}>
          <View
            style={{
              position: 'absolute',
              left: -r,
              width: diameter,
              height: diameter,
              borderRadius: r,
              borderWidth: stroke,
              borderColor: fillColor,
              backgroundColor: 'transparent',
              transform: [{ rotate: `${rightAngle}deg` }],
            }}
          />
        </View>
      ) : null}

      {/* Left half clip — reveals 50%→100% */}
      {showLeft ? (
        <View style={[styles.halfClip, { left: 0, width: r, height: diameter }]}>
          <View
            style={{
              position: 'absolute',
              right: -r,
              width: diameter,
              height: diameter,
              borderRadius: r,
              borderWidth: stroke,
              borderColor: fillColor,
              backgroundColor: 'transparent',
              transform: [{ rotate: `${leftAngle}deg` }],
            }}
          />
        </View>
      ) : null}

      {/* Inner hole */}
      <View
        style={{
          position: 'absolute',
          top: stroke,
          left: stroke,
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: centerBg,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfClip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
})
