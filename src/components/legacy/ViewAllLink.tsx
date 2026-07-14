/**
 * ⚠️ LEGACY (2026-07-14) — old `legacy-theme` component, NO LONGER USED BY THE
 * Legacy tab. Superseded this session (STEP D) by the foundation-based
 * `src/app/legacy.tsx`, rebuilt to the handoff `Forge Legacy.dc.html`. Retained
 * (not deleted) as reference — still consumed by the non-tab `/legacy-design-test`
 * dev route.
 */
import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { LC, LS } from '@/constants/legacy-theme'

type Props = {
  label: string
  onPress?: () => void
}

export function ViewAllLink({ label, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.touch}
      activeOpacity={0.55}
    >
      <Text style={styles.text}>{label} ›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  touch: {
    minHeight: LS.minTap,
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    color: LC.text,
  },
})
