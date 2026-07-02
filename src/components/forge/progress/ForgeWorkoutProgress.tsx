import React, { useEffect, useState } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { PROG } from './_progressTokens'
import type { ForgeWorkoutProgressProps } from './types'

export function ForgeWorkoutProgress({
  totalSets,
  completedSets,
  activeSet = -1,
  style,
  accessibilityLabel,
}: ForgeWorkoutProgressProps) {
  return (
    <View
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? `${completedSets} of ${totalSets} sets complete`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: totalSets, now: completedSets }}
    >
      {Array.from({ length: totalSets }, (_, i) => {
        const isCompleted = i < completedSets
        const isActive    = i === activeSet
        return (
          <Pip
            key={i}
            isCompleted={isCompleted}
            isActive={isActive}
            flex={1}
          />
        )
      })}
    </View>
  )
}

function Pip({
  isCompleted,
  isActive,
  flex,
}: {
  isCompleted: boolean
  isActive: boolean
  flex: number
}) {
  const opacity = useState(() => new Animated.Value(1))[0]

  useEffect(() => {
    if (!isActive) {
      opacity.setValue(1)
      return
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [isActive, opacity])

  if (isCompleted) {
    return (
      <LinearGradient
        colors={[PROG.FILL_DARK_FROM, PROG.FILL_DARK_TO]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.pip, { flex }]}
      />
    )
  }

  if (isActive) {
    return (
      <Animated.View
        style={[
          styles.pip,
          styles.pipActive,
          { flex, opacity },
        ]}
      />
    )
  }

  return <View style={[styles.pip, styles.pipInactive, { flex }]} />
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: PROG.PIP_GAP,
    height: PROG.HEIGHT_THICK,
  },
  pip: {
    height: PROG.HEIGHT_THICK,
    borderRadius: 99,
  },
  pipActive: {
    backgroundColor: PROG.CAP_COLOR,
  },
  pipInactive: {
    backgroundColor: PROG.TRACK_BG,
  },
})
