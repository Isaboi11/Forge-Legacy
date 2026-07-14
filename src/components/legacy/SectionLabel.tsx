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
