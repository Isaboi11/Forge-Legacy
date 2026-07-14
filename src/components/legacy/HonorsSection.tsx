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
import type { Honor } from '@/types/legacy'

type Props = {
  honors: Honor[]
  totalCount: number
  onViewAll?: () => void
}

export function HonorsSection({ honors, totalCount, onViewAll }: Props) {
  if (honors.length === 0) return null

  return (
    <View>
      <SectionLabel label="Honors" count={totalCount} />
      <View style={styles.list}>
        {honors.map(h => (
          <View
            key={h.id}
            style={styles.row}
            accessibilityLabel={`Honor: ${h.name}, earned ${h.dateEarned}`}
          >
            <Text style={styles.name} numberOfLines={1}>{h.name}</Text>
            <Text style={styles.date}>{h.dateEarned}</Text>
          </View>
        ))}
      </View>
      <ViewAllLink
        label={`View All ${totalCount} Honors`}
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
  name: {
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
