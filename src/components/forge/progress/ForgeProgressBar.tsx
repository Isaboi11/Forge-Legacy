import React from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { PROG } from './_progressTokens'
import type { ForgeProgressBarProps } from './types'

const HEIGHT_MAP = {
  thin:    PROG.HEIGHT_THIN,
  default: PROG.HEIGHT_DEFAULT,
  thick:   PROG.HEIGHT_THICK,
} as const

export function ForgeProgressBar({
  percentage,
  height = 'default',
  style,
  accessibilityLabel,
}: ForgeProgressBarProps) {
  const pct = Math.max(0, Math.min(100, percentage))
  const h   = HEIGHT_MAP[height]
  const r   = h / 2 + 1  // pill radius

  return (
    <View
      style={[{ height: h }, styles.track, { borderRadius: r }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      {pct > 0 ? (
        <View style={[StyleSheet.absoluteFill, styles.fillWrapper]}>
          <LinearGradient
            colors={[PROG.FILL_FROM, PROG.FILL_MID, PROG.FILL_TO]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${pct}%`, borderRadius: r }]}
          >
            {/* Leading glow cap */}
            <View style={[styles.cap, { width: h + 3, borderRadius: h / 2 }]} />
          </LinearGradient>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: PROG.TRACK_BG,
    overflow: 'hidden',
    position: 'relative',
  },
  fillWrapper: {
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  cap: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: PROG.CAP_COLOR,
    shadowColor: PROG.GLOW_CAP,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
})
