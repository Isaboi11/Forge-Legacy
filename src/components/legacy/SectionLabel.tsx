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
  label: string
  count?: number
}

export function SectionLabel({ label, count }: Props) {
  const text = count !== undefined ? `${label}  ${count}` : label
  return <Text style={styles.text}>{text}</Text>
}

const styles = StyleSheet.create({
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: LC.textMuted,
    textTransform: 'uppercase',
  },
})
