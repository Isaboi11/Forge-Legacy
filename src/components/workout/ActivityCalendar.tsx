import { useMemo } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { forgeOr } from '@/constants/theme-scrim';
import {
  dayA11y,
  monthTitle,
  weeksOf,
  type CalendarCell,
  type CalendarDay,
  type MarkKind,
  type YearMonth,
} from '@/domain/activity/calendar-core';

/**
 * The month calendar at the top of Activity History (W-18 · `Activity History Calendar.dc.html`, variant
 * **1a "Dot under the date"**, chosen by the PO 10-01). Presentational: the screen owns the month, the
 * filter and the selected day; this draws them and reports taps and swipes.
 *
 * ⛔ AN EMPTY DAY IS EMPTY. It is not a control, it carries no mark, and it never says "missed" — see
 *   `calendar-core`. That is what keeps the film's missed-week shot honest.
 *
 * Colours: the calendar's own fills are named per theme below (`forgeOr`) from the design's two palettes.
 * Text and rules use the shared tokens, so the calendar reads as one surface with the list under it.
 */

const C = {
  /** Lifting dot, cardio ring, record ring. */
  brz: forgeOr(flColor.bronze400, '#8A5C2C'),
  /** Record date, chapter diamond. */
  brzHi: forgeOr(flColor.bronze300, '#8A5C2C'),
  glow: forgeOr('0 0 10px rgba(205,160,99,0.35)', '0 0 8px rgba(176,122,64,0.35)'),
  today: forgeOr('rgba(255,255,255,0.09)', '#E6E0D6'),
  sel: forgeOr('rgba(255,255,255,0.06)', '#EDE8E0'),
  selBd: forgeOr(flColor.charcoal500, '#C9BFB1'),
  skel: forgeOr('rgba(255,255,255,0.05)', '#E9E3DA'),
  sec: forgeOr('rgba(255,255,255,0.04)', '#FFFDFA'),
  secBd: forgeOr(flColor.charcoal500, '#D3CABD'),
};

export type CalendarState = 'ready' | 'loading' | 'error';

const DOWS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SKELETON_WEEKS = [0, 1, 2, 3, 4];

export function ActivityCalendar({
  ym,
  cells,
  state,
  summary,
  selectedDay,
  canPrev,
  canNext,
  onMonth,
  onDay,
  onRetry,
  chapterLine,
}: {
  ym: YearMonth;
  cells: CalendarCell[];
  state: CalendarState;
  summary: string;
  selectedDay: number | null;
  canPrev: boolean;
  canNext: boolean;
  /** -1 = the month before, +1 = the month after. Only called when that month is reachable. */
  onMonth: (dir: -1 | 1) => void;
  onDay: (day: number) => void;
  onRetry: () => void;
  /** The chapter event on a day, for its spoken label. */
  chapterLine: (day: number) => string | undefined;
}) {
  const ready = state === 'ready';
  const prev = ready && canPrev;
  const next = ready && canNext;

  /* Swipe to change month. Claimed only for a clearly sideways drag, so the list's vertical scroll and a
     tap on a day both pass straight through. Rebuilt when the reachable months change, which is never
     mid-gesture — a month changes on release. */
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) < 50) return;
          if (g.dx < 0 && next) onMonth(1);
          else if (g.dx > 0 && prev) onMonth(-1);
        },
      }),
    [prev, next, onMonth],
  );

  return (
    <View {...pan.panHandlers} style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {monthTitle(ym)}
        </Text>
        <View style={styles.arrows}>
          <Arrow dir={-1} enabled={prev} onPress={() => onMonth(-1)} />
          <Arrow dir={1} enabled={next} onPress={() => onMonth(1)} />
        </View>
      </View>

      <View style={styles.week}>
        {DOWS.map((d, i) => (
          <Text key={i} style={styles.dow}>
            {d}
          </Text>
        ))}
      </View>

      {state === 'loading' ? (
        <View accessibilityLabel="Loading your history">
          <View style={styles.grid}>
            {SKELETON_WEEKS.map((w) => (
              <View key={w} style={styles.week}>
                {DOWS.map((_, i) => (
                  <View key={i} style={[styles.skelCell, { backgroundColor: C.skel }]} />
                ))}
              </View>
            ))}
          </View>
          <View style={[styles.skelSummary, { backgroundColor: C.skel }]} />
        </View>
      ) : state === 'error' ? (
        // The grid's outline stays so the page keeps its shape; Try again reloads the list too.
        <View>
          <View style={[styles.grid, styles.ghost]}>
            {SKELETON_WEEKS.map((w) => (
              <View key={w} style={styles.week}>
                {DOWS.map((_, i) => (
                  <View key={i} style={[styles.skelCell, styles.outlineCell]} />
                ))}
              </View>
            ))}
          </View>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Couldn’t load your history.</Text>
            <Pressable
              onPress={onRetry}
              accessibilityRole="button"
              style={({ pressed }) => [styles.retry, pressed ? { opacity: 0.7 } : null]}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View>
          <View style={styles.grid}>
            {weeksOf(cells).map((week, w) => (
              <View key={w} style={styles.week}>
                {week.map((cell, i) =>
                  cell ? (
                    <Day
                      key={i}
                      cell={cell}
                      selected={cell.day === selectedDay}
                      label={dayA11y(ym, cell, chapterLine(cell.day))}
                      onPress={() => onDay(cell.day)}
                    />
                  ) : (
                    <View key={i} style={styles.cell} />
                  ),
                )}
              </View>
            ))}
          </View>
          <Text style={styles.summary}>{summary}</Text>
        </View>
      )}
    </View>
  );
}

function Arrow({ dir, enabled, onPress }: { dir: -1 | 1; enabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={dir < 0 ? 'Previous month' : 'Next month'}
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => [styles.arrow, { opacity: enabled ? (pressed ? 0.6 : 1) : 0.3 }]}
    >
      <EngravedIcon name={dir < 0 ? 'chevron-left' : 'chevron-right'} size={20} color={flColor.gray400} />
    </Pressable>
  );
}

const MARK_STYLE: Record<MarkKind, { backgroundColor: string; borderColor: string }> = {
  lift: { backgroundColor: C.brz, borderColor: C.brz },
  cardio: { backgroundColor: 'transparent', borderColor: C.brz },
  other: { backgroundColor: flColor.gray600, borderColor: flColor.gray600 },
};

function Day({ cell, selected, label, onPress }: { cell: CalendarDay; selected: boolean; label: string; onPress: () => void }) {
  const trained = cell.sessions > 0;
  const body = (
    <>
      {cell.chapter ? <View style={[styles.diamond, { backgroundColor: C.brzHi }]} /> : null}
      <View
        style={[
          styles.disc,
          cell.today ? { backgroundColor: C.today } : null,
          cell.pr ? { borderColor: C.brz, boxShadow: C.glow } : null,
        ]}
      >
        <Text
          style={[
            styles.num,
            trained || cell.today ? styles.numStrong : null,
            trained ? styles.numTrained : null,
            cell.pr ? { color: C.brzHi } : null,
          ]}
        >
          {cell.day}
        </Text>
      </View>
      {cell.marks.length ? (
        <View style={styles.marks}>
          {cell.marks.map((k, i) => (
            <View key={i} style={[styles.dot, MARK_STYLE[k]]} />
          ))}
        </View>
      ) : null}
    </>
  );

  // A day with nothing on it is not a control — no role, no press, nothing to land on.
  if (!cell.tappable) {
    return (
      <View style={styles.cell} accessible accessibilityLabel={label}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      accessibilityHint={selected ? 'Shows every session this month' : 'Shows only this day’s sessions'}
      style={[styles.cell, selected ? { backgroundColor: C.sel, borderColor: C.selBd } : null]}
    >
      {body}
    </Pressable>
  );
}

export { C as CALENDAR_COLOR };

const styles = StyleSheet.create({
  wrap: { paddingTop: 14, paddingHorizontal: 14 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 10, paddingRight: 2, paddingBottom: 6 },
  title: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  arrows: { flexDirection: 'row', gap: 2 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  week: { flexDirection: 'row', gap: 4 },
  dow: { flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: '600', letterSpacing: 0.8, color: flColor.gray600, paddingBottom: 4 },
  grid: { gap: 4 },

  cell: {
    flex: 1,
    minWidth: 0,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  disc: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { fontSize: 13.5, fontWeight: '400', color: flColor.gray600, fontVariant: ['tabular-nums'] },
  numStrong: { fontWeight: '600' },
  numTrained: { color: flColor.cream100 },
  marks: { flexDirection: 'row', gap: 3, height: 5, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5, borderWidth: 1.3 },
  diamond: { position: 'absolute', top: 5, right: 6, width: 5, height: 5, transform: [{ rotate: '45deg' }] },

  summary: {
    paddingTop: 14,
    paddingHorizontal: 4,
    paddingBottom: 16,
    textAlign: 'center',
    fontSize: 13,
    color: flColor.gray400,
    fontVariant: ['tabular-nums'],
  },

  skelCell: { flex: 1, height: 44, borderRadius: 10 },
  skelSummary: { height: 14, width: '58%', alignSelf: 'center', marginTop: 16, marginBottom: 18, borderRadius: 7 },
  ghost: { opacity: 0.35 },
  outlineCell: { borderWidth: 1, borderColor: flColor.divider },
  errorBox: { paddingTop: 22, paddingHorizontal: 20, paddingBottom: 18, alignItems: 'center', gap: 12 },
  errorText: { fontSize: 14, color: flColor.gray400, textAlign: 'center' },
  retry: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: C.secBd,
    backgroundColor: C.sec,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontSize: 13, fontWeight: '600', color: flColor.cream100 },
});
