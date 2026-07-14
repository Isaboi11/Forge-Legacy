/**
 * ⚠️ LEGACY (2026-07-14) — NO LONGER USED ON HOME. Superseded this session (STEP C)
 * by `ChapterTitleBlock`, which integrates the rotating principle into the ornate
 * chapter title-block per the handoff `Forge Home.dc.html`. An earlier-session
 * component, retained (not deleted) as reference; safe to remove once nothing else
 * references it.
 *
 * CLA-C37 — HomepagePrinciple
 * Tier: 3 (Composition)
 * Spec: Forge Home.dc.html · Homepage-Principles-Architecture-v1.0.md (HP-D1–HP-D11)
 *
 * The quiet, rotating "digital inscription" that opens H-1 — reflection, not
 * motivation. A fixed, non-tiered element between the AppBar and the Mission
 * Card; never omitted, never tappable, no empty/error state (HP-D3).
 */

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeIn } from 'react-native-reanimated'
import { flColor } from '@/constants/foundation'

export interface HomepagePrincipleProps {
  text: string
}

function Divider({ delay }: { delay: number }) {
  return (
    <Animated.View entering={FadeIn.delay(delay).duration(900)} style={styles.dividerWrap}>
      <LinearGradient
        colors={['transparent', flColor.bronzeBorder, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.divider}
      />
    </Animated.View>
  )
}

export function HomepagePrinciple({ text }: HomepagePrincipleProps) {
  return (
    <View style={styles.container} accessibilityLabel={text}>
      <Divider delay={100} />
      <Animated.View entering={FadeIn.delay(300).duration(1100)}>
        <Text style={styles.text}>{text}</Text>
      </Animated.View>
      <Divider delay={500} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 34,
    paddingTop: 44,
    paddingBottom: 30,
    alignItems: 'center',
    gap: 38,
  },
  dividerWrap: {
    width: 230,
    height: 1,
  },
  divider: {
    flex: 1,
  },
  text: {
    fontFamily: 'PlayfairDisplay_500Medium',
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '500',
    color: flColor.bronze400,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
})
