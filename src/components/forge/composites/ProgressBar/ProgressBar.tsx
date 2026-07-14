/**
 * CLA-C12 — ProgressBar
 * Tier: 2 (Composite)
 * Spec: components/Progress/ProgressBar.jsx (Claude Design)
 *
 * The single general-purpose progress indicator: goal progress, program
 * progress, rank sub-tier / family bars. 6dp track, fills left-to-right
 * ONLY — it never drains, never turns red, never shows "% remaining".
 */

import React from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, View } from 'react-native'
import { flColor, flGradient, flRadius } from '@/constants/foundation'

export interface ProgressBarProps {
  value?: number
  max?: number
  height?: number
  label?: string
}

export function ProgressBar({ value = 0, max = 100, height = 6, label }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0)) * 100

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[styles.track, { height, borderRadius: flRadius.pill }]}
    >
      {pct > 0 ? (
        <LinearGradient
          colors={flGradient.bronzeMetallic.colors}
          locations={flGradient.bronzeMetallic.locations}
          start={flGradient.bronzeMetallic.start}
          end={flGradient.bronzeMetallic.end}
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              borderRadius: flRadius.pill,
              boxShadow: '0 0 8px rgba(186,146,92,0.35)',
            },
          ]}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: flColor.charcoal600,
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
})
