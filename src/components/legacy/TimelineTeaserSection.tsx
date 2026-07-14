/**
 * ⚠️ LEGACY (2026-07-14) — old `legacy-theme` component, NO LONGER USED BY THE
 * Legacy tab. Superseded this session (STEP D) by the foundation-based
 * `src/app/legacy.tsx`, rebuilt to the handoff `Forge Legacy.dc.html`. Retained
 * (not deleted) as reference — still consumed by the non-tab `/legacy-design-test`
 * dev route.
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LC, LS } from '@/constants/legacy-theme'
import { SectionLabel } from './SectionLabel'
import { ViewAllLink } from './ViewAllLink'
import type { TimelineEntry } from '@/types/legacy'

type Props = {
  entries: TimelineEntry[]
  onViewAll?: () => void
}

export function TimelineTeaserSection({ entries, onViewAll }: Props) {
  if (entries.length === 0) return null

  return (
    <View>
      <SectionLabel label="Timeline" />
      <View style={styles.list}>
        {entries.map(entry => (
          <View
            key={entry.id}
            style={styles.row}
            accessibilityLabel={`${entry.eventType}: ${entry.objectName}. ${entry.dateLabel}.`}
          >
            <Text style={styles.text} numberOfLines={1}>
              <Text style={styles.eventType}>{entry.eventType}</Text>
              <Text style={styles.dot}> · </Text>
              <Text>{entry.objectName}</Text>
            </Text>
            <Text style={styles.date}>{entry.dateLabel}</Text>
          </View>
        ))}
      </View>
      <ViewAllLink label="View Full Timeline" onPress={onViewAll} />
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
    marginRight: 12,
  },
  eventType: {
    color: LC.textMuted,
  },
  dot: {
    color: LC.textDim,
  },
  date: {
    fontSize: 12,
    color: LC.textMuted,
    flexShrink: 0,
  },
})
