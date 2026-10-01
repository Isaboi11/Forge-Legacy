import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useCallback, useState, type ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { EngravedIcon, engravedTint, type EngravedName } from '@/components/forge/primitives/icons/EngravedIcon';
import { AppBar } from '@/components/forge/composites/AppBar';
import { ChipScroller } from '@/components/forge/ChipScroller';
import { ScreenBackground } from '@/components/screen-background';
import { ActivityCalendar, CALENDAR_COLOR } from '@/components/workout/ActivityCalendar';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { forgeOr, themeScrim } from '@/constants/theme-scrim';
import { ACTIVITY_HISTORY_LIMIT, fetchActivityHistory, fetchChapterMarks } from '@/data/activity-live';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet';
import { removeImportedWorkouts } from '@/data/apple-health-sync-live';
import { removeImportCopy } from '@/domain/health/imported';
import { useToast } from '@/hooks/useCeremony';
import { invalidateEarnedMoments } from '@/hooks/useEarnedMoments';
import {
  buildMonthGrid,
  chapterRowFor,
  compareYM,
  dayTitle,
  monthRange,
  monthSummary,
  sessionsInMonth,
  sessionsOnDay,
  type YearMonth,
} from '@/domain/activity/calendar-core';
import {
  ACTIVITY_LABEL,
  ACTIVITY_ORDER,
  fmtDuration,
  fmtRowDate,
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
 *
 * ── THE CALENDAR (`Activity History Calendar.dc.html`, variant 1a, PO 10-01) ──
 *
 * A month calendar sits above the list and scrolls with it, and the list is now THAT MONTH's sessions
 * rather than the whole log under sticky month headers. Arrows or a sideways swipe change month — back
 * to the first session, never past this one. Tapping a trained day narrows the list to that day; tapping
 * it again (or Show all) clears it. The type chips filter both. Rules live in `calendar-core`.
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
  /** The month on show; `null` follows this month. */
  const [cursor, setCursor] = useState<YearMonth | null>(null);
  const [pickedDay, setPickedDay] = useState<number | null>(null);
  const [now] = useState(() => new Date());
  const { data, loading, settled, error, refetch } = useQuery(() => fetchActivityHistory(), []);
  const chapters = useQuery(() => fetchChapterMarks(), []);
  /* Refetched on focus: "Log" below opens `/log-activity` over this screen, and the bout it records has
     to be in the list the moment it closes — a `[]` query would show it next time the screen mounts. */
  useFocusEffect(useCallback(() => refetch(), [refetch]));

  /* REMOVE FROM FORGE, FROM THE LIST (Apple-Health-Build-Plan §10 step 5). An IMPORTED row answers a long
     press with the same M-6 confirm Activity Detail uses; a Forge-recorded row has no long press at all. */
  const { showToast } = useToast();
  const [removeTarget, setRemoveTarget] = useState<ActivityRecord | null>(null);
  const [removing, setRemoving] = useState(false);
  const removeCopy = removeTarget?.importedFrom ? removeImportCopy(removeTarget.title, removeTarget.importedFrom) : null;
  const commitRemove = async () => {
    if (!removeTarget || removing) return;
    setRemoving(true);
    try {
      const removed = await removeImportedWorkouts([removeTarget.id]);
      if (removed == null) {
        showToast('Couldn’t remove this workout. Try again in a moment.');
        return;
      }
      setRemoveTarget(null);
      invalidateEarnedMoments();
      showToast('Removed from Forge');
      refetch();
    } finally {
      setRemoving(false);
    }
  };

  const records = data ?? [];
  // A focus refetch keeps the month on screen; only a first read, or a retry after a failure, shows blocks.
  const isLoading = !settled || (loading && data == null && !error);
  const isError = !!error && !isLoading;

  const months = monthRange(records, now, records.length >= ACTIVITY_HISTORY_LIMIT);
  const found = cursor ? months.findIndex((m) => compareYM(m, cursor) === 0) : -1;
  const at = found >= 0 ? found : months.length - 1;
  const ym = months[at];

  const sessions = sessionsInMonth(records, filter, ym);
  // A chapter is not a Run — its diamond and its row belong to All only.
  const chapterMarks = filter === 'all' ? (chapters.data ?? []) : [];
  const cells = buildMonthGrid(sessions, ym, now, chapterMarks);
  const day = pickedDay != null && cells.some((c) => c?.day === pickedDay && c.tappable) ? pickedDay : null;
  const chapterRow = day != null ? chapterRowFor(chapterMarks, ym, day) : null;
  const rows = isLoading || isError ? [] : day != null ? sessionsOnDay(sessions, day) : sessions;

  const goMonth = (dir: -1 | 1) => {
    const next = months[at + dir];
    if (!next) return;
    setCursor(next);
    setPickedDay(null);
  };
  const pickFilter = (f: ActivityFilter) => {
    setFilter(f);
    setPickedDay(null);
  };
  const retry = () => {
    refetch();
    chapters.refetch();
  };

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
      {/* Seven types do not fit a phone: the strip now shows that it scrolls (visualA-12) — it hid Swim,
          Row, Mobility and Other behind the right edge with nothing to say they were there. */}
      <View style={styles.chipStrip}>
        <ChipScroller ground={STRIP_GROUND} contentContainerStyle={styles.chips}>
          <Chip label="All" on={filter === 'all'} onPress={() => pickFilter('all')} />
          {ACTIVITY_ORDER.map((t) => (
            <Chip
              key={t}
              label={ACTIVITY_LABEL[t]}
              on={filter === t}
              onPress={() => pickFilter(t)}
              icon={<TypeIcon type={t} size={13} color={filter === t ? flColor.bronze300 : flColor.gray600} />}
            />
          ))}
        </ChipScroller>
      </View>

      {/* The calendar is the list's header, so it scrolls away with the sessions under it. A failed read
          is NOT an empty history: it gets its own state, never "your first session will show up here". */}
      <FlatList
        keyboardDismissMode={KEYBOARD_DISMISS_MODE}
        automaticallyAdjustKeyboardInsets
        data={rows}
        keyExtractor={(r) => r.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listPad}
        ListHeaderComponent={
          <>
            <ActivityCalendar
              ym={ym}
              cells={cells}
              state={isLoading ? 'loading' : isError ? 'error' : 'ready'}
              summary={monthSummary(sessions, filter, records.length === 0)}
              selectedDay={day}
              canPrev={at > 0}
              canNext={at < months.length - 1}
              onMonth={goMonth}
              onDay={(d) => setPickedDay((cur) => (cur === d ? null : d))}
              onRetry={retry}
              chapterLine={(d) => chapterRowFor(chapterMarks, ym, d)?.title}
            />
            <View style={styles.rule} />

            {day != null && !isLoading && !isError ? (
              <View style={styles.dayHead}>
                <Text style={styles.dayLabel}>{dayTitle(ym, day)}</Text>
                <Pressable
                  onPress={() => setPickedDay(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Show all sessions this month"
                  style={({ pressed }) => [styles.showAll, pressed ? { opacity: 0.7 } : null]}
                >
                  <Text style={styles.showAllText}>Show all</Text>
                </Pressable>
              </View>
            ) : null}

            {chapterRow && !isLoading && !isError ? (
              <Pressable
                onPress={() => router.push({ pathname: '/chapter/[id]', params: { id: chapterRow.chapterId } })}
                accessibilityRole="button"
                accessibilityLabel={[chapterRow.title, chapterRow.sub].filter(Boolean).join(', ')}
                style={styles.chapterRow}
              >
                <View style={styles.rowIcon}>
                  <View style={styles.chapterDiamond} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.title} numberOfLines={1}>
                    {chapterRow.title}
                  </Text>
                  {chapterRow.sub ? <Text style={styles.stat}>{chapterRow.sub}</Text> : null}
                </View>
                <EngravedIcon name="chevron-right" size={16} color={flColor.gray600} />
              </Pressable>
            ) : null}

            {isLoading ? (
              <View style={styles.skelRows}>
                {[0, 1, 2].map((k) => (
                  <View key={k} style={styles.skelRow}>
                    <View style={[styles.skelIcon, { backgroundColor: CALENDAR_COLOR.skel }]} />
                    <View style={styles.skelLines}>
                      <View style={[styles.skelLine, { width: '55%', backgroundColor: CALENDAR_COLOR.skel }]} />
                      <View style={[styles.skelLine, styles.skelLineSm, { backgroundColor: CALENDAR_COLOR.skel }]} />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <SessionRow
            record={item}
            onPress={() => router.push({ pathname: '/activity/[id]', params: { id: item.id } })}
            onRemove={item.importedFrom ? () => setRemoveTarget(item) : undefined}
          />
        )}
      />

      <ConfirmSheet
        open={removeCopy != null}
        onClose={() => setRemoveTarget(null)}
        headline={removeCopy?.headline ?? ''}
        body={removeCopy?.body ?? ''}
        confirmLabel={removing ? 'Removing…' : (removeCopy?.confirm ?? '')}
        onConfirm={() => void commitRemove()}
      />
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

/** `onRemove` is passed for an IMPORTED row only; it is the long press and the screen-reader action. */
function SessionRow({ record, onPress, onRemove }: { record: ActivityRecord; onPress: () => void; onRemove?: () => void }) {
  const { rowUnit } = useUnits();
  const stat = statLine(record, rowUnit);
  const partners = partnersLabel(record.partners);
  const hasAttr = Boolean(record.chapterName) || partners.length > 0 || Boolean(record.importedFrom);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onRemove}
      accessibilityRole="button"
      accessibilityLabel={rowA11y(record)}
      accessibilityActions={onRemove ? [{ name: 'remove', label: 'Remove from Forge' }] : undefined}
      onAccessibilityAction={onRemove ? (e) => e.nativeEvent.actionName === 'remove' && onRemove() : undefined}
      style={styles.row}
    >
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
            {/* The small mark (plan §10 step 5) — informational, in the chapter's own quiet grey. */}
            {record.importedFrom ? (
              <Text style={styles.chapter} numberOfLines={1}>
                Imported · {record.importedFrom}
              </Text>
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

/** The filter strip's ground — also where its scroll hint fades to. */
const STRIP_GROUND = themeScrim('rgba(7,8,8,0.92)');

const styles = StyleSheet.create({
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 6 },
  logBtnText: { fontSize: 14, fontWeight: '600', color: flColor.bronzeInk },
  root: { flex: 1 },

  chipStrip: { paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: flColor.divider, backgroundColor: STRIP_GROUND },
  chips: { flexDirection: 'row', gap: 7, paddingHorizontal: 16 },
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
  chipOn: { borderColor: flColor.bronze400, backgroundColor: flColor.selectedFill },
  chipText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
  chipTextOn: { color: flColor.selectedInk, fontWeight: '700' },

  listPad: { paddingBottom: 22 },
  rule: { height: 1, backgroundColor: flColor.divider, marginHorizontal: 18 },

  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingRight: 18, paddingBottom: 2, paddingLeft: 22 },
  dayLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray400 },
  showAll: { height: 36, paddingHorizontal: 8, justifyContent: 'center' },
  showAllText: { fontSize: 12.5, fontWeight: '600', color: forgeOr(flColor.bronze300, flColor.bronzeInk) },

  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
    marginHorizontal: 18,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: flColor.divider,
  },
  chapterDiamond: { width: 9, height: 9, transform: [{ rotate: '45deg' }], backgroundColor: CALENDAR_COLOR.brzHi },

  skelRows: { paddingHorizontal: 22 },
  skelRow: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 80, borderBottomWidth: 1, borderBottomColor: flColor.divider },
  skelIcon: { width: 26, height: 26, borderRadius: 8 },
  skelLines: { flex: 1, gap: 8 },
  skelLine: { height: 12, borderRadius: 6 },
  skelLineSm: { height: 10, width: '35%', borderRadius: 5 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 80,
    marginHorizontal: 18,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: flColor.divider,
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
    borderColor: flColor.accentBorderSubtle,
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
});
