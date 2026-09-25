import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { EngravedIcon, engravedTint, type EngravedName } from '@/components/forge/primitives/icons/EngravedIcon';
import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { themeGround, themeScrim } from '@/constants/theme-scrim';
import { fetchActivityHistory } from '@/data/activity-live';
import {
  ACTIVITY_LABEL,
  ACTIVITY_ORDER,
  emptyMessage,
  fmtDuration,
  fmtRowDate,
  groupByMonth,
  partnersLabel,
  rowA11y,
  statLine,
  type ActivityFilter,
  type ActivityRecord,
  type Modality,
} from '@/domain/activity/history-core';
import { useQuery } from '@/lib/useQuery';
import { useUnits } from '@/lib/settings';

/**
 * W-18 Activity History (`Forge Activity History.dc.html`) — the read-only, reverse-chronological
 * training log: filter by activity type, grouped into months with sticky headers, newest first.
 *
 * Built against the athlete's REAL saved workouts (see `activity-live`), not the design's seeded demo
 * module. Consequences, all deliberate:
 *  · The type chips follow the database's 8-value `modality` enum, not the design's 9 — it has no
 *    `hiit`/`yoga` and does have `rowing`, and a chip that can never match anything is a dead control.
 *  · No "Partial" pill: nothing records that a session was cut short.
 *  · Distance renders in its stored unit rather than converting, so the `units` prop (mi/km) is absent
 *    until there's a unit preference to drive it. `iconTint` follows the design's default (bronze).
 *
 * Rows open Activity Detail (W-19), which reads the same `workouts` table — so a tapped row always
 * resolves to the session it described.
 */

/** One glyph per logged modality. A bronze colour becomes the engraved gradient; grey (an off chip) stays flat. */
const TYPE_ICON: Record<Modality, EngravedName> = {
  strength: 'dumbbell',
  running: 'runner',
  walking: 'footprints',
  cycling: 'bicycle',
  swimming: 'wave',
  rowing: 'cardio',
  mobility: 'bodyweight',
  other: 'mountain',
};
function TypeIcon({ type, size = 22, color }: { type: Modality; size?: number; color: string }) {
  return <EngravedIcon name={TYPE_ICON[type]} size={size} color={engravedTint(color)} />;
}

export default function ActivityHistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const { data, settled, error, refetch } = useQuery(() => fetchActivityHistory(), []);
  /* Refetched on focus: "Log" below opens `/log-activity` over this screen, and the bout it records has
     to be in the list the moment it closes — a `[]` query would show it next time the screen mounts. */
  useFocusEffect(useCallback(() => refetch(), [refetch]));

  const records = data ?? [];
  const groups = groupByMonth(records, filter);
  const sections = groups.map((g) => ({ title: g.month, data: g.rows }));

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} overlay={{ flat: 'rgba(0,0,0,0.5)' }} />

      {/* ⚠ "LOG" LIVES HERE NOW (Workouts restructure, 2026-09-22). Recording a run, walk, ride, row or
          swim you ALREADY did was a row in the Workouts `+` sheet — the only door to `/log-activity` in
          the app. That sheet became Create New, which is about making things, so the door moved to the
          screen that lists what you've logged rather than being dropped with the sheet. */}
      <AppBar
        title="Activity History"
        onBack={() => router.back()}
        actions={
          <Pressable
            onPress={() => router.push('/log-activity')}
            accessibilityRole="button"
            accessibilityLabel="Log an activity you already did"
            hitSlop={8}
            style={({ pressed }) => [styles.logBtn, pressed ? { opacity: 0.7 } : null]}
          >
            <EngravedIcon name="plus" size={16} color={flColor.bronze400} />
            <Text style={styles.logBtnText}>Log</Text>
          </Pressable>
        }
      />

      {/* type filter — All + every modality the app can actually log, single-select */}
      <View style={styles.chipStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All" on={filter === 'all'} onPress={() => setFilter('all')} />
          {ACTIVITY_ORDER.map((t) => (
            <Chip
              key={t}
              label={ACTIVITY_LABEL[t]}
              on={filter === t}
              onPress={() => setFilter(t)}
              icon={<TypeIcon type={t} size={13} color={filter === t ? flColor.bronze300 : flColor.gray600} />}
            />
          ))}
        </ScrollView>
      </View>

      {!settled ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error ? (
        // A failed read is NOT an empty history. Showing "your workouts will appear here" over a broken
        // query is the kind of quiet lie that costs an afternoon to track down.
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <EngravedIcon name="warning" size={22} color={flColor.redMuted} />
          </View>
          <Text style={styles.errorTitle}>Couldn’t load your history</Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <EngravedIcon name="calendar" size={22} />
          </View>
          <Text style={styles.emptyText}>{emptyMessage(filter)}</Text>
          {records.length > 0 ? (
            <Text style={styles.errorDetail}>
              {records.length} session{records.length === 1 ? '' : 's'} logged — clear the filter to see them.
            </Text>
          ) : null}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(r) => r.id}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listPad}
          renderSectionHeader={({ section }) => (
            <View style={styles.monthHeader}>
              <Text style={styles.monthLabel}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <SessionRow
              record={item}
              onPress={() => router.push({ pathname: '/activity/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </View>
  );
}

function Chip({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      style={[styles.chip, on && styles.chipOn]}
    >
      {icon}
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function SessionRow({ record, onPress }: { record: ActivityRecord; onPress: () => void }) {
  const { rowUnit } = useUnits();
  const stat = statLine(record, rowUnit);
  const partners = partnersLabel(record.partners);
  const hasAttr = Boolean(record.chapterName) || partners.length > 0;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={rowA11y(record)} style={styles.row}>
      <View style={styles.rowIcon}>
        <TypeIcon type={record.type} color={flColor.bronze400} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.titleLine}>
          <Text style={styles.title} numberOfLines={1}>
            {record.title}
          </Text>
          {record.pr ? (
            <View style={styles.prPill}>
              <EngravedIcon name="trophy" size={10} />
              <Text style={styles.prText}>PR</Text>
            </View>
          ) : null}
        </View>

        {stat ? (
          <Text style={styles.stat} numberOfLines={1}>
            {stat}
          </Text>
        ) : null}

        {hasAttr ? (
          <View style={styles.attrLine}>
            {record.chapterName ? (
              <Text style={styles.chapter} numberOfLines={1}>
                {record.chapterName}
              </Text>
            ) : null}
            {partners ? (
              <View style={styles.partnerPill}>
                <EngravedIcon name="partners" size={10} />
                <Text style={styles.partnerText} numberOfLines={1}>
                  {partners}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.rowMeta}>
        <Text style={styles.duration}>{fmtDuration(record.durationSec)}</Text>
        <Text style={styles.date}>{fmtRowDate(record.startedAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 6 },
  logBtnText: { fontSize: 14, fontWeight: '600', color: flColor.bronze400 },
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },

  chipStrip: { borderBottomWidth: 1, borderBottomColor: flColor.charcoal700, backgroundColor: themeScrim('rgba(7,8,8,0.92)') },
  chips: { flexDirection: 'row', gap: 7, paddingHorizontal: 16, paddingBottom: 13 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: 'transparent',
  },
  chipOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  chipText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
  chipTextOn: { color: flColor.bronze300, fontWeight: '700' },

  listPad: { paddingBottom: 22 },
  monthHeader: { backgroundColor: themeGround('#060708'), paddingTop: 40, paddingBottom: 14, paddingHorizontal: 24 },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: flColor.cream100,
    opacity: 0.82,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 80,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  rowIcon: { width: 30, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0, gap: 4 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  title: { flexShrink: 1, fontFamily: flFont.display, fontSize: 15.5, fontWeight: '600', letterSpacing: -0.1, color: flColor.cream100 },
  prPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: flRadius.pill,
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  prText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, color: flColor.bronze300 },
  stat: { fontSize: 12, color: flColor.gray600 },
  attrLine: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  chapter: { flexShrink: 1, fontSize: 11, color: flColor.gray600 },
  partnerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
    paddingHorizontal: 9,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  partnerText: { fontSize: 9.5, fontWeight: '600', letterSpacing: 0.2, color: flColor.bronze300 },

  rowMeta: { alignItems: 'flex-end', gap: 4 },
  duration: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400, fontVariant: ['tabular-nums'] },
  date: { fontSize: 11, color: flColor.gray600 },

  empty: { flex: 1, alignItems: 'center', paddingTop: 70, paddingHorizontal: 34, gap: 13 },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },
  errorTitle: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  errorDetail: { fontSize: 12, lineHeight: 18, color: flColor.gray600, textAlign: 'center' },
});
