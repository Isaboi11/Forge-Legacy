/**
 * ⚠️ LEGACY (2026-07-14) — old `legacy-theme` component, NO LONGER USED BY THE
 * Legacy tab. Superseded this session (STEP D) by the foundation-based
 * `src/app/legacy.tsx`, rebuilt to the handoff `Forge Legacy.dc.html`. Retained
 * (not deleted) as reference — still consumed by the non-tab `/legacy-design-test`
 * dev route.
 */
import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { LC } from '@/constants/legacy-theme'

type Props = {
  rankName: string
  subTier: string
}

export function IdentityStrip({ rankName, subTier }: Props) {
  return (
    <Text
      style={styles.text}
      accessibilityRole="text"
      accessibilityLabel={`Legacy rank: ${rankName}, sub-tier ${subTier}`}
    >
      {rankName} · {subTier}
    </Text>
  )
}

const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: LC.text,
  },
})
