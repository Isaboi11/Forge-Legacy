import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
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

function Glyph({ children, size = 22, color }: { children: ReactNode; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

/** One glyph per logged modality. Design symbols where they map; `rowing` is ours (the design has none). */
function TypeIcon({ type, size = 22, color }: { type: Modality; size?: number; color: string }) {
  const paths: Record<Modality, ReactNode> = {
    strength: <><Path d="M7 8.5v7" /><Path d="M17 8.5v7" /><Path d="M4.5 10v4" /><Path d="M19.5 10v4" /><Path d="M7 12h10" /></>,
    running: <><Circle cx={13.5} cy={4.5} r={1.8} /><Path d="M9 20l2.5-5 3-2-1-4-3.5 2-1.5 3" /><Path d="M14.5 9l3 2 1.5-1" /></>,
    walking: <><Circle cx={12.5} cy={4.5} r={1.8} /><Path d="M10 20l1.5-6 3-2M11.5 14l3 6M11 10l-2 3" /></>,
    cycling: <><Circle cx={5.5} cy={17} r={3.2} /><Circle cx={18.5} cy={17} r={3.2} /><Path d="M5.5 17l4-8h5l4 8M9.5 9h5" /></>,
    swimming: <><Circle cx={17} cy={7} r={1.7} /><Path d="M3 15c1.6 0 1.6 1.4 3.2 1.4S7.8 15 9.4 15s1.6 1.4 3.2 1.4S14.2 15 15.8 15s1.6 1.4 3.2 1.4" /><Path d="M7 12l4-2 3 2" /></>,
    rowing: <><Circle cx={7} cy={6.5} r={1.8} /><Path d="M4 20l5-5 4 2 6-6" /><Path d="M9 15l-1-4 4-1" /></>,
    mobility: <><Path d="M12 4c1.8 2.4 3.2 3.8 3.2 6.4a3.2 3.2 0 0 1-6.4 0C8.8 7.8 10.2 6.4 12 4z" /><Path d="M4 17c3 2.6 5.4 3.4 8 3.4S17 19.6 20 17" /></>,
    other: <><Path d="M3 19l6-9 4 5.5 2.5-3.5L21 19z" /><Circle cx={16.5} cy={6} r={2} /></>,
  };
  return <Glyph size={size} color={color}>{paths[type]}</Glyph>;
}

export default function ActivityHistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const { data, loading, error } = useQuery(() => fetchActivityHistory(), []);

  const records = data ?? [];
  const groups = groupByMonth(records, filter);
  const sections = groups.map((g) => ({ title: g.month, data: g.rows }));

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} overlay={{ flat: 'rgba(0,0,0,0.5)' }} />

      <AppBar title="Activity History" onBack={() => router.back()} />

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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error ? (
        // A failed read is NOT an empty history. Showing "your workouts will appear here" over a broken
        // query is the kind of quiet lie that costs an afternoon to track down.
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Glyph size={22} color={flColor.redMuted}>
              <Circle cx={12} cy={12} r={9} />
              <Path d="M12 7v6M12 16v.5" />
            </Glyph>
          </View>
          <Text style={styles.errorTitle}>Couldn’t load your history</Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Glyph size={22} color={flColor.gray600}>
              <Rect x={3} y={4} width={18} height={17} rx={2} />
              <Path d="M3 9h18M8 2v4M16 2v4" />
            </Glyph>
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
  const stat = statLine(record);
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
              <Glyph size={10} color={flColor.bronze300}>
                <Path d="M7 4h10v3a5 5 0 0 1-10 0zM7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M9 15h6M12 12v3M8 21h8" />
              </Glyph>
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
                <Glyph size={10} color={flColor.bronze300}>
                  <Path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
                  <Circle cx={10} cy={8} r={3} />
                  <Path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4" />
                </Glyph>
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
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },

  chipStrip: { borderBottomWidth: 1, borderBottomColor: flColor.charcoal700, backgroundColor: 'rgba(7,8,8,0.92)' },
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
  monthHeader: { backgroundColor: '#060708', paddingTop: 40, paddingBottom: 14, paddingHorizontal: 24 },
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
