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
