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
