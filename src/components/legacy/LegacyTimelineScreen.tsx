/**
 * L-2 Legacy Timeline screen — rendered as a component so legacy-design-test.tsx
 * can swap it in via local state (no router changes needed for the prototype).
 */
import React from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LC, LS } from '@/constants/legacy-theme'
import { TIMELINE_GROUPS } from '@/data/legacy-placeholder'
import type { TimelineGroup } from '@/types/legacy'

// ─── Header bar ──────────────────────────────────────────────────────────────

function HeaderBar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.headerBar}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Text style={styles.backChevron}>‹</Text>
        <Text style={styles.backLabel}>Legacy</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Timeline</Text>
      <View style={styles.backBtn} />
    </View>
  )
}

// ─── Chapter group header ─────────────────────────────────────────────────────

function ChapterHeader({
  name,
  isActive,
  onPress,
}: {
  name: string
  isActive: boolean
  onPress?: () => void
}) {
  return (
    <TouchableOpacity
      style={styles.chapterHeader}
      onPress={onPress}
      activeOpacity={0.65}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint="Opens chapter detail"
    >
      <Text style={styles.chapterName}>{name}</Text>
      <Text style={styles.chapterChevron}>›</Text>
    </TouchableOpacity>
  )
}

// ─── Event entry row ──────────────────────────────────────────────────────────

function EntryRow({
  eventType,
  objectName,
  dateLabel,
}: {
  eventType: string
  objectName: string
  dateLabel: string
}) {
  return (
    <View
      style={styles.entryRow}
      accessibilityLabel={`${eventType}, ${objectName}, ${dateLabel}`}
    >
      <Text style={styles.entryText} numberOfLines={1}>
        <Text style={styles.entryType}>{eventType}</Text>
        <Text style={styles.entryDot}> · </Text>
        <Text style={styles.entryObject}>{objectName}</Text>
      </Text>
      <Text style={styles.entryDate}>{dateLabel}</Text>
    </View>
  )
}

// ─── Standalone row ───────────────────────────────────────────────────────────

function StandaloneRow({
  eventType,
  objectName,
  dateLabel,
}: {
  eventType: string
  objectName: string
  dateLabel: string
}) {
  return (
    <View style={styles.standaloneRow}>
      <View
        style={styles.standaloneEntry}
        accessibilityLabel={`${eventType}, ${objectName}, ${dateLabel}`}
      >
        <Text style={styles.entryText} numberOfLines={1}>
          <Text style={styles.entryType}>{eventType}</Text>
          <Text style={styles.entryDot}> · </Text>
          <Text style={styles.standalonePrimary}>{objectName}</Text>
        </Text>
        <Text style={styles.entryDate}>{dateLabel}</Text>
      </View>
    </View>
  )
}

// ─── Chapter section ──────────────────────────────────────────────────────────

function ChapterSection({
  group,
}: {
  group: Extract<TimelineGroup, { kind: 'chapter' }>
}) {
  if (group.events.length === 0) return null

  return (
    <View style={styles.chapterSection}>
      <ChapterHeader name={group.chapterName} isActive={group.isActive} />
      <View style={styles.eventList}>
        {group.events.map(evt => (
          <EntryRow
            key={evt.id}
            eventType={evt.eventType}
            objectName={evt.objectName}
            dateLabel={evt.dateLabel}
          />
        ))}
      </View>
    </View>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyTimeline() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>
        Your legacy timeline will appear here as you build.
      </Text>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Props = {
  onBack: () => void
}

export function LegacyTimelineScreen({ onBack }: Props) {
  const groups = TIMELINE_GROUPS
  const isEmpty = groups.length === 0

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <HeaderBar onBack={onBack} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <EmptyTimeline />
        ) : (
          groups.map((group, idx) => {
            if (group.kind === 'standalone') {
              return (
                <StandaloneRow
                  key={group.entry.id}
                  eventType={group.entry.eventType}
                  objectName={group.entry.objectName}
                  dateLabel={group.entry.dateLabel}
                />
              )
            }
            return <ChapterSection key={group.chapterId} group={group} />
          })
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: LC.background,
  },

  // Header bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LS.screenPadH,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LC.surfaceBorder,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    minHeight: LS.minTap,
  },
  backChevron: {
    fontSize: 22,
    color: LC.accent,
    marginRight: 4,
    lineHeight: 26,
  },
  backLabel: {
    fontSize: 16,
    color: LC.accent,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: LC.text,
  },

  scroll: { flex: 1 },
  content: {
    paddingHorizontal: LS.screenPadH,
    paddingTop: 8,
  },

  // Chapter section
  chapterSection: {
    marginTop: 20,
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LC.surfaceBorder,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LC.surfaceBorder,
    minHeight: LS.minTap,
  },
  chapterName: {
    fontSize: 15,
    fontWeight: '600',
    color: LC.text,
  },
  chapterChevron: {
    fontSize: 16,
    color: LC.textMuted,
  },
  eventList: {
    paddingLeft: 0,
  },

  // Entry row
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: LS.minTap,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LC.divider,
  },
  entryText: {
    flex: 1,
    fontSize: 13,
    color: LC.text,
    marginRight: 12,
  },
  entryType: {
    color: LC.textMuted,
  },
  entryDot: {
    color: LC.textDim,
  },
  entryObject: {
    color: LC.text,
  },
  entryDate: {
    fontSize: 12,
    color: LC.textMuted,
    flexShrink: 0,
  },

  // Standalone row
  standaloneRow: {
    marginTop: 20,
    marginBottom: 4,
  },
  standaloneEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: LS.minTap,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LC.divider,
  },
  standalonePrimary: {
    color: LC.text,
    fontWeight: '500',
  },

  // Empty
  empty: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: LC.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
})
