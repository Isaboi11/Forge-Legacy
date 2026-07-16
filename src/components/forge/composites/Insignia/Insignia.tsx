/**
 * Insignia — the ceremony/legacy artwork slot (Modal Library: the celebration mark is
 * an Insignia artwork slot, never a generic icon).
 *
 * When a real badge module is passed (`source`), it renders that image (the imported
 * RANK art flows through here). Otherwise it renders a graceful bronze placeholder —
 * a ringed seal with an optional short label — for art that does not exist yet (HONOR
 * badges were never imported). It never fabricates a badge design.
 */

import React from 'react'
import { Image } from 'expo-image'
import Svg, { Circle, Path } from 'react-native-svg'
import { StyleSheet, Text, View } from 'react-native'
import { flColor, flFont, flShadow } from '@/constants/foundation'

export interface InsigniaProps {
  /** A bundled image module for the insignia art (e.g. an honor badge). Omit → initials/placeholder. */
  source?: number
  /** Square edge in px. */
  size?: number
  /** Short label shown inside the placeholder (e.g. honor initials). */
  placeholderLabel?: string
}

export function Insignia({ source, size = 96, placeholderLabel }: InsigniaProps) {
  if (source != null) {
    return <Image source={source} style={{ width: size, height: size }} contentFit="contain" />
  }
  // pending-asset placeholder — a faint bronze seal, never a fabricated badge.
  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size} height={size} viewBox="0 0 96 96" style={StyleSheet.absoluteFill}>
        <Circle cx={48} cy={48} r={44} stroke={flColor.bronze400} strokeWidth={1.4} opacity={0.5} fill="none" />
        <Circle cx={48} cy={48} r={35} stroke={flColor.bronze400} strokeWidth={1} opacity={0.28} fill="none" />
        <Path
          d="M48 22 L54 40 L72 40 L57 52 L63 70 L48 59 L33 70 L39 52 L24 40 L42 40 Z"
          stroke={flColor.bronze300}
          strokeWidth={1.2}
          opacity={0.5}
          fill="none"
          strokeLinejoin="round"
        />
      </Svg>
      {placeholderLabel ? <Text style={styles.label}>{placeholderLabel}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  placeholder: {
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.glowSubtle,
  },
  label: {
    fontFamily: flFont.display,
    fontSize: 20,
    fontWeight: '600',
    color: flColor.bronze300,
  },
})
