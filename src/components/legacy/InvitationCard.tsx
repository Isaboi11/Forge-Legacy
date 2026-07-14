/**
 * ⚠️ LEGACY (2026-07-14) — old `legacy-theme` component, NO LONGER USED BY THE
 * Legacy tab. Superseded this session (STEP D) by the foundation-based
 * `src/app/legacy.tsx`, rebuilt to the handoff `Forge Legacy.dc.html`. Retained
 * (not deleted) as reference — still consumed by the non-tab `/legacy-design-test`
 * dev route.
 */
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { LC, LS } from '@/constants/legacy-theme'

type Props = {
  onStart?: () => void
}

export function InvitationCard({ onStart }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.headline}>Your training builds your legacy.</Text>
      <Text style={styles.sub}>Start a chapter to give it a name.</Text>
      <TouchableOpacity
        style={styles.cta}
        onPress={onStart}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Start a new chapter"
      >
        <Text style={styles.ctaText}>Start a Chapter</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: LC.surface,
    borderRadius: LS.cardRadius,
    borderWidth: 1,
    borderColor: LC.surfaceBorder,
    padding: LS.cardPad,
  },
  headline: {
    fontSize: 15,
    fontWeight: '600',
    color: LC.text,
  },
  sub: {
    fontSize: 14,
    color: LC.textMuted,
    marginTop: 6,
  },
  cta: {
    marginTop: 18,
    alignSelf: 'flex-start',
    borderRadius: LS.cardRadius,
    borderWidth: 1,
    borderColor: LC.textMuted,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minHeight: LS.minTap,
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '500',
    color: LC.text,
  },
})
