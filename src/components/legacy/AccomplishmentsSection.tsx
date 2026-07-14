import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LC, LS } from '@/constants/legacy-theme'
import { SectionLabel } from './SectionLabel'
import { ViewAllLink } from './ViewAllLink'
import type { Accomplishment } from '@/types/legacy'

type Props = {
  accomplishments: Accomplishment[]
  totalCount: number
  onViewAll?: () => void
}

export function AccomplishmentsSection({ accomplishments, totalCount, onViewAll }: Props) {
  if (accomplishments.length === 0) return null

  return (
    <View>
      <SectionLabel label="Accomplishments" count={totalCount} />
      <View style={styles.list}>
        {accomplishments.map(a => (
          <View
            key={a.id}
            style={styles.row}
            accessibilityLabel={`${a.text}, added ${a.monthYear}`}
          >
            <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
              {a.text}
            </Text>
            <Text style={styles.date}>{a.monthYear}</Text>
          </View>
        ))}
      </View>
      <ViewAllLink
        label={`View All ${totalCount} Accomplishments`}
        onPress={onViewAll}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    marginTop: LS.labelGap,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: LS.minTap,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LC.divider,
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: LC.text,
    marginRight: 16,
  },
  date: {
    fontSize: 12,
    color: LC.textMuted,
    flexShrink: 0,
  },
})
