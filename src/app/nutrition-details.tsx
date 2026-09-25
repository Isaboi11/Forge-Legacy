import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { NutritionCareLine, useCareLine } from '@/components/forge/NutritionCareLine';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { ProgressBar } from '@/components/forge/composites/ProgressBar';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { grouped, localToday } from '@/domain/nutrition/day';
import {
  barPercent,
  buildWeek,
  chartScale,
  dayCallout,
  dayShortLabel,
  macroHistory,
  macroSummaries,
  summarise,
  weekDays,
  weekGapLine,
  weekKicker,
  weekRangeLabel,
  WEEKS_BACK,
  type DayTotals,
  type MacroSummary,
} from '@/domain/nutrition/week';
import { fetchRangeTotals, fetchTargetHistory } from '@/data/nutrition-live';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';
import { useQuery } from '@/lib/useQuery';

/**
 * Nutrition Details — built to `Nutrition Details.dc.html`, wired to the diary (0205).
 *
 * ⚠ **THIS WAS THE ONE DEAD END IN THE TAB.** Nutrition Home's "See Details" had shipped as a toast
 * saying the analytics pass was coming. It is the last unblocked screen of Phase 1.
 *
 * Faithful to the `.dc`: the bronze kicker over the week's range with a ‹ › stepper seven weeks deep;
 * the 48px daily average beside "N of M days in range"; a seven-bar calorie chart drawn against a
 * target BAND, each bar selectable, with a leader line and a callout above it; three macro rows that
 * each open their own daily history; and one closing sentence naming the week's gap.
 *
 * ⚠ **NO NUMBER IS COMPUTED HERE** (NUT-D4) — `domain/nutrition/week.ts` holds all of it and is tested.
 * In particular that module, not this file, decides that **today is excluded from every average** (an
 * unfinished day is not a light day) and that **an unlogged day is not a zero**.
 *
 * ⚠ **IT WORKS WITH NO TARGET SET.** Targets are manual-only in Phase 1 and optional, so the band, the
 * "days in range" figure and the macro bars all have to degrade rather than divide by nothing: the bars
 * scale to the week's own biggest day and the screen offers to set a target instead of drawing a
 * comparison against zero.
 */
export default function NutritionDetailsScreen() {
  const router = useRouter();

  /* Minted once per mount, like the rest of nutrition: a session that crosses midnight keeps the week
     the athlete opened rather than silently re-labelling its last column. */
  const [todayIso] = useState(() => localToday());
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(6);
  const [macro, setMacro] = useState<MacroSummary | null>(null);

  const days = useMemo(() => weekDays(todayIso, offset), [todayIso, offset]);
  const from = days[0];
  const to = days[6];

  const { data: totals, loading } = useQuery(
    useCallback(() => fetchRangeTotals(from, to), [from, to]),
    [from, to],
  );
  const { data: history } = useQuery(useCallback(() => fetchTargetHistory(to), [to]), [to]);
  /* The care line speaks about THIS week, so it sits over this week's bars and not over a week seven back. */
  const care = useCareLine();

  const week = useMemo(() => {
    const byIso = new Map<string, DayTotals>((totals ?? []).map((d) => [d.iso, d]));
    return buildWeek(days, byIso, history ?? [], todayIso);
  }, [days, totals, history, todayIso]);

  const summary = useMemo(() => summarise(week), [week]);
  const macros = useMemo(() => macroSummaries(week, summary.average), [week, summary]);
  const scale = chartScale(week, summary.band);
  const gap = weekGapLine(macros, summary);

  const index = Math.min(Math.max(selected, 0), 6);
  const callout = dayCallout(week[index], todayIso);
  const history7 = macro ? macroHistory(week, macro, todayIso) : null;

  const atOldest = offset >= WEEKS_BACK;
  const atNewest = offset === 0;
  const step = (by: number) => {
    setOffset((o) => Math.min(WEEKS_BACK, Math.max(0, o + by)));
    setSelected(6);
  };

  /* The band, as a share of the chart, so it can be drawn as one inset block. */
  const bandLow = summary.band ? barPercent(summary.band.lo, scale) : 0;
  const bandHigh = summary.band ? barPercent(summary.band.hi, scale) : 0;

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />
      <AppBar title="" transparent onBack={() => router.back()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* week + stepper */}
        <View style={styles.headRow}>
          <View style={styles.headText}>
            <Text style={styles.kicker}>{weekKicker(offset)}</Text>
            <Text style={styles.range}>{weekRangeLabel(days)}</Text>
          </View>
          <View style={styles.stepper}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous week"
              disabled={atOldest}
              style={styles.stepButton}
              onPress={() => step(1)}
            >
              <Arrow direction="left" color={atOldest ? flColor.charcoal500 : flColor.gray400} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next week"
              disabled={atNewest}
              style={styles.stepButton}
              onPress={() => step(-1)}
            >
              <Arrow direction="right" color={atNewest ? flColor.charcoal500 : flColor.gray400} />
            </Pressable>
          </View>
        </View>

        {/* the week in two numbers */}
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.bigNumber}>{summary.counted ? grouped(summary.average.kcal) : '—'}</Text>
            <Text style={styles.bigLabel}>Avg calories / day</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryValue}>
              {summary.band ? `${summary.inRange} of ${summary.counted}` : '—'}
            </Text>
            <Text style={styles.summaryLabel}>Days in range</Text>
          </View>
        </View>

        {/* the care line, above the week bars */}
        {atNewest ? <NutritionCareLine care={care} style={styles.careLine} /> : null}

        {/* the chart */}
        <View style={styles.card}>
          <View style={styles.plot}>
            {summary.band ? (
              <View
                pointerEvents="none"
                style={[styles.band, { bottom: `${bandLow}%`, height: `${Math.max(0, bandHigh - bandLow)}%` }]}
              />
            ) : null}

            <View style={styles.bars}>
              {week.map((day, i) => {
                const on = i === index;
                const height = day.totals.logged ? barPercent(day.totals.kcal, scale) : 0;
                return (
                  <Pressable
                    key={day.iso}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${dayShortLabel(day.iso, todayIso)}: ${
                      day.totals.logged ? `${grouped(day.totals.kcal)} calories` : 'not logged'
                    }`}
                    style={styles.barSlot}
                    onPress={() => setSelected(i)}
                  >
                    <View
                      style={[
                        styles.bar,
                        { height: `${height}%`, minHeight: day.totals.logged ? 4 : 2 },
                        !day.totals.logged && styles.barEmpty,
                        day.isToday && styles.barToday,
                        day.inRange && styles.barHit,
                        on && day.totals.logged && styles.barSelected,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* the callout, over the selected column */}
            <View
              pointerEvents="none"
              style={[
                styles.callout,
                index <= 1 ? styles.calloutLeft : index >= 5 ? styles.calloutRight : styles.calloutCentre,
              ]}
            >
              <Text style={styles.calloutTitle}>{callout.title}</Text>
              <Text style={[styles.calloutDetail, callout.good && styles.calloutGood]}>{callout.detail}</Text>
            </View>
          </View>

          <View style={styles.dayLabels}>
            {week.map((day, i) => (
              <Text
                key={day.iso}
                style={[styles.dayLabel, i === index && styles.dayLabelOn]}
                numberOfLines={1}
              >
                {dayShortLabel(day.iso, todayIso)}
              </Text>
            ))}
          </View>

          <View style={styles.cardFoot}>
            <Text style={styles.footLabel}>Target range</Text>
            <Text style={styles.footValue}>
              {summary.band ? `${grouped(summary.band.lo)} – ${grouped(summary.band.hi)} cal` : 'No target set'}
            </Text>
          </View>
        </View>

        {/* ⚠ Not in the `.dc`, because its fixture has one fixed target. A real week can straddle a
            change, and one band cannot describe two targets — saying so is cheaper than a wrong chart. */}
        {summary.targetMoved ? (
          <Text style={styles.bandNote}>
            Your target changed during this week. Each day is judged against the target that was set at the
            time; the band shows the latest one.
          </Text>
        ) : null}

        {/* macros */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Macros · daily average</Text>
          <Text style={styles.sectionNote}>
            {offset === 0 ? `${summary.counted} full days · today excluded` : `${summary.counted} logged days`}
          </Text>
        </View>
        <View style={styles.macroList}>
          {macros.map((m) => (
            <Pressable
              key={m.key}
              accessibilityRole="button"
              accessibilityLabel={`${m.label}: ${m.average} of ${m.target ?? 0} grams daily average. Open daily history.`}
              style={styles.macroRow}
              onPress={() => setMacro(m)}
            >
              <View style={styles.macroHead}>
                <Text style={styles.macroLabel}>{m.label}</Text>
                <Text style={styles.macroAvg}>{`${m.average} g`}</Text>
                <Text style={styles.macroTarget}>{m.target ? `/ ${m.target} g` : ''}</Text>
                <Arrow direction="right" color={flColor.gray600} size={12} />
              </View>
              <ProgressBar value={m.target ? Math.min(m.average, m.target) : 0} max={m.target ?? 100} label={m.label} />
              <Text style={[styles.macroNote, m.clean && styles.macroNoteGood]}>{m.note}</Text>
            </Pressable>
          ))}
        </View>

        {/* the closing line */}
        {gap ? (
          <View style={styles.gapBlock}>
            <Text style={styles.gapText}>{gap}</Text>
          </View>
        ) : null}

        {!summary.band && !loading ? (
          <View style={styles.gapBlock}>
            <Text style={styles.gapText}>
              Set a daily target and this week gets a range to sit against.
            </Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/nutrition-targets')}>
              <Text style={styles.gapAction}>Set targets</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* one macro, day by day */}
      <BottomSheet open={macro != null} onClose={() => setMacro(null)} title={history7?.title ?? ''} scroll>
        {history7 ? (
          <View style={styles.sheetBody}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetSub}>{history7.subtitle}</Text>
              <Text style={styles.sheetSub}>{history7.range}</Text>
            </View>
            {history7.rows.map((row) => (
              <View key={row.iso} style={styles.histRow}>
                <Text style={styles.histDay}>{row.day}</Text>
                <View style={styles.histTrack}>
                  <View
                    style={[
                      styles.histFill,
                      { width: `${row.percent}%` },
                      row.isToday && styles.histFillToday,
                      row.onTarget && styles.histFillHit,
                      !row.logged && styles.histFillNone,
                    ]}
                  />
                  {history7.targetPercent > 0 ? (
                    <View style={[styles.histTick, { left: `${history7.targetPercent}%` }]} />
                  ) : null}
                </View>
                <Text style={[styles.histValue, row.onTarget && styles.histValueHit, !row.logged && styles.histValueNone]}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

function Arrow({ direction, color, size = 18 }: { direction: 'left' | 'right'; color: string; size?: number }) {
  return (
    <EngravedIcon name={direction === 'left' ? 'chevron-left' : 'chevron-right'} size={size} color={color} />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: SCREEN_BOTTOM_GAP },

  headRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingHorizontal: 2, paddingBottom: 24 },
  headText: { flex: 1, minWidth: 0, gap: 6 },
  kicker: { fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400 },
  range: { fontFamily: flFont.display, fontSize: 30, color: flColor.cream100, letterSpacing: -0.3, lineHeight: 34 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginRight: -10 },
  stepButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  summaryRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, paddingHorizontal: 2, paddingBottom: 26 },
  bigNumber: { fontFamily: flFont.display, fontSize: 48, color: flColor.cream100, letterSpacing: -0.8, lineHeight: 48 },
  bigLabel: { marginTop: 8, fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400 },
  summaryRight: { alignItems: 'flex-end', gap: 5, paddingBottom: 1 },
  summaryValue: { fontSize: 17, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  summaryLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600 },

  careLine: { marginBottom: 14 },
  card: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  plot: { position: 'relative', height: 150 },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(191,143,79,0.07)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    borderStyle: 'dashed',
  },
  bars: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: {
    width: '100%',
    maxWidth: 26,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: flColor.charcoal500,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  barEmpty: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: flColor.charcoal500 },
  barToday: { backgroundColor: 'rgba(191,143,79,0.22)', borderColor: flColor.bronzeBorder },
  barHit: { backgroundColor: flColor.bronze600 },
  barSelected: { borderColor: flColor.bronze300, boxShadow: '0 0 0 3px rgba(191,143,79,0.14)' },

  callout: {
    position: 'absolute',
    top: -46,
    gap: 3,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: flRadius.md,
    backgroundColor: flColor.charcoal700,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
  },
  calloutLeft: { left: 0 },
  calloutCentre: { alignSelf: 'center' },
  calloutRight: { right: 0 },
  calloutTitle: { fontSize: 12, fontWeight: '600', color: flColor.cream100 },
  calloutDetail: { fontSize: 11, color: flColor.gray600 },
  calloutGood: { color: flColor.bronze400 },

  dayLabels: { flexDirection: 'row', gap: 8, paddingTop: 10 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.gray600 },
  dayLabelOn: { color: flColor.bronze300 },

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
  },
  footLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  footValue: { fontSize: 11.5, color: flColor.gray400 },
  bandNote: { paddingTop: 12, paddingHorizontal: 2, fontSize: 12, lineHeight: 17, color: flColor.gray600 },

  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 34, paddingBottom: 14, paddingHorizontal: 2 },
  sectionLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray600 },
  sectionNote: { fontSize: 11.5, color: flColor.gray600 },

  macroList: { gap: 20, paddingHorizontal: 2 },
  macroRow: { gap: 9, marginHorizontal: -10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: flRadius.md },
  macroHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  macroLabel: { flex: 1, minWidth: 0, fontSize: 13, color: flColor.gray400 },
  macroAvg: { fontSize: 15, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  macroTarget: { fontSize: 13, color: flColor.gray600, fontVariant: ['tabular-nums'] },
  macroNote: { fontSize: 12, color: flColor.gray600 },
  macroNoteGood: { color: flColor.bronze400 },

  gapBlock: { marginTop: 30, paddingTop: 14, paddingHorizontal: 2, borderTopWidth: 1, borderTopColor: flColor.charcoal700, gap: 8 },
  gapText: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600 },
  gapAction: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze400 },

  sheetBody: { paddingBottom: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 12 },
  sheetSub: { fontSize: 12.5, color: flColor.gray600 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  histDay: { width: 52, fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  histTrack: { flex: 1, height: 5, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal600, overflow: 'visible' },
  histFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal500 },
  histFillHit: { backgroundColor: flColor.bronze600 },
  histFillToday: { backgroundColor: 'rgba(191,143,79,0.35)' },
  histFillNone: { backgroundColor: 'transparent' },
  histTick: { position: 'absolute', top: -4, bottom: -4, width: 1, backgroundColor: flColor.bronzeBorder },
  histValue: { width: 64, textAlign: 'right', fontSize: 13, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  histValueHit: { color: flColor.bronze400 },
  histValueNone: { color: flColor.gray600 },
});
