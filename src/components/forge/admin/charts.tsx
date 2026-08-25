import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { flColor, flFont, flRadius, flText } from '@/constants/foundation';
import {
  ADMIN_RAMP,
  areaPath,
  barFractions,
  cellState,
  chartPoints,
  compactNumber,
  deltaLabel,
  gridLines,
  groupedNumber,
  linePath,
  pctOf,
  rampStep,
  tickIndices,
  type ChartBox,
  type Delta,
} from '@/domain/admin/chart-core';
import type { Cohort, Bucket } from '@/data/admin-live';
import { shortDay, weekLabel } from '@/domain/admin/series';

/**
 * The operator dashboard's chart primitives.
 *
 * Hand-rolled `react-native-svg`, modelled on `MetricDetail.tsx` — this project has no chart library
 * and this change does not add one. All the maths lives in `domain/admin/chart-core` (pure, tested);
 * these components only draw.
 *
 * ══ THE PALETTE CANNOT CARRY A CATEGORICAL CHART, AND THAT SHAPED EVERY COMPONENT HERE ══
 *
 * Validated against the card surface (`charcoal800` #131517): `bronze400` has chroma 0.092, under the
 * 0.10 floor for a categorical series, and `greenMuted` vs `redMuted` is deuteranopic ΔE 5.1, under
 * the 6.0 floor. Three consequences, all load-bearing:
 *
 *   1. EVERY CHART IS SINGLE-SERIES or emphasis (one bronze line, gray context). DAU/WAU/MAU is three
 *      stacked small multiples, never three lines on one plot — and never a dual axis.
 *   2. NOMINAL BARS ARE ALL ONE COLOUR. Ramping the top-exercises list darker-where-bigger would
 *      double-encode bar length as hue, which is a named anti-pattern and reads as a second variable
 *      that does not exist.
 *   3. DELTA DIRECTION IS NEVER COLOUR-ALONE. Every delta ships an ▲/▼ glyph and a signed number;
 *      colour reinforces and never carries the meaning by itself.
 *
 * `ADMIN_RAMP` is a SEQUENTIAL ramp and appears in exactly two places — the cohort grid and the
 * funnel — because both encode magnitude along one ordered dimension.
 */

const GRID_STROKE = 'rgba(255,255,255,0.055)';
const AREA_FILL = 'rgba(186,134,84,0.14)';

// ─────────────────────────────────────────────────────────────────────────────
// Stat tile
// ─────────────────────────────────────────────────────────────────────────────

function DeltaText({ delta, note }: { delta: Delta | null; note?: string }) {
  if (!delta) return null;
  const color =
    delta.dir === 'up' ? flColor.greenMuted : delta.dir === 'down' ? flColor.redMuted : flColor.gray600;
  // The glyph, not the colour, is what makes this readable. See the header.
  const glyph = delta.dir === 'up' ? '▲' : delta.dir === 'down' ? '▼' : '·';
  return (
    <Text style={[styles.tileDelta, { color }]} numberOfLines={1}>
      {glyph} {delta.text}
      {note ? <Text style={styles.tileDeltaNote}> {note}</Text> : null}
    </Text>
  );
}

/**
 * One headline number.
 *
 * Deliberately NOT `components/cards/StatCard.tsx`: that one is on the legacy `@/constants/tokens`
 * palette with Feather icons, and has no anatomy for a sparkline or a delta. Two tiles that look
 * similar are cheaper than one tile bent to serve two screens.
 */
export function AdminStatTile({
  label,
  value,
  prev,
  series,
  suffix,
  deltaNote,
  exact,
}: {
  label: string;
  value: number | null | undefined;
  prev?: number | null;
  series?: number[];
  suffix?: string;
  deltaNote?: string;
  /** Show the full figure with separators rather than the compact form. */
  exact?: boolean;
}) {
  const delta = prev == null ? null : deltaLabel(value ?? null, prev);
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.tileValue} numberOfLines={1}>
        {exact ? groupedNumber(value) : compactNumber(value)}
        {suffix && value != null ? <Text style={styles.tileSuffix}>{suffix}</Text> : null}
      </Text>
      <DeltaText delta={delta} note={deltaNote} />
      {series && series.length > 1 ? <Sparkline values={series} /> : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sparkline
// ─────────────────────────────────────────────────────────────────────────────

const SPARK_BOX: ChartBox = { w: 120, h: 30, padX: 2, padTop: 4, padBot: 4 };

export function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return null;
  const pts = chartPoints(values, SPARK_BOX);
  const last = pts[pts.length - 1];
  return (
    <Svg viewBox={`0 0 ${SPARK_BOX.w} ${SPARK_BOX.h}`} width="100%" height={30} style={styles.spark}>
      <Path d={areaPath(values, SPARK_BOX)} fill={AREA_FILL} />
      <Path
        d={linePath(values, SPARK_BOX)}
        fill="none"
        stroke={flColor.bronze400}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* The end dot gets a surface-coloured ring so it stays legible where the line doubles back. */}
      {last ? <Circle cx={last.x} cy={last.y} r={2.6} fill={flColor.bronze300} stroke={flColor.charcoal800} strokeWidth={1.2} /> : null}
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Line chart
// ─────────────────────────────────────────────────────────────────────────────

const LINE_BOX: ChartBox = { w: 320, h: 148, padX: 22, padTop: 12, padBot: 22 };

export function AdminLineChart({
  values,
  days,
  title,
  caption,
}: {
  values: number[];
  /** Day keys parallel to `values`, for the x-axis ticks. */
  days: string[];
  title?: string;
  caption?: string;
}) {
  if (!values.length) return <EmptyChart title={title} />;

  const grid = gridLines(values, LINE_BOX);
  const pts = chartPoints(values, LINE_BOX);
  const ticks = tickIndices(values.length).map((i) => ({ i, x: pts[i]?.x ?? 0, label: shortDay(days[i]) }));
  const last = pts[pts.length - 1];

  return (
    <View style={styles.chartBlock}>
      {title ? <Text style={styles.chartTitle}>{title}</Text> : null}
      <Svg viewBox={`0 0 ${LINE_BOX.w} ${LINE_BOX.h}`} width="100%" height={148}>
        {/* Solid hairlines, never dashed — a dashed gridline competes with the data line at this size. */}
        {grid.map((g) => (
          <Line key={g.f} x1={LINE_BOX.padX - 8} y1={g.y} x2={LINE_BOX.w - LINE_BOX.padX + 8} y2={g.y} stroke={GRID_STROKE} strokeWidth={1} />
        ))}
        {[grid[0], grid[2]].map((g) => (
          <SvgText key={`v${g.f}`} x={LINE_BOX.padX - 10} y={g.y + 3} fill={flColor.gray600} fontSize={8.5} textAnchor="end">
            {compactNumber(g.value)}
          </SvgText>
        ))}
        <Path d={areaPath(values, LINE_BOX)} fill={AREA_FILL} />
        <Path
          d={linePath(values, LINE_BOX)}
          fill="none"
          stroke={flColor.bronze400}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* The endpoint only. A number on every point is unreadable at 320 wide and adds nothing. */}
        {last ? <Circle cx={last.x} cy={last.y} r={3.6} fill={flColor.bronze300} stroke={flColor.charcoal800} strokeWidth={1.4} /> : null}
        {ticks.map((t) => (
          <SvgText key={t.i} x={t.x} y={LINE_BOX.h - LINE_BOX.padBot + 14} fill={flColor.gray600} fontSize={8.5} textAnchor="middle">
            {t.label}
          </SvgText>
        ))}
      </Svg>
      {caption ? <Text style={styles.chartCaption}>{caption}</Text> : null}
    </View>
  );
}

function EmptyChart({ title }: { title?: string }) {
  return (
    <View style={styles.chartBlock}>
      {title ? <Text style={styles.chartTitle}>{title}</Text> : null}
      <Text style={styles.empty}>Nothing logged in this window yet.</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bar chart
// ─────────────────────────────────────────────────────────────────────────────

export interface BarRow {
  label: string;
  value: number;
  /** Secondary figure shown after the value, e.g. "· 41 workouts". */
  note?: string;
}

/**
 * Horizontal bars for nominal categories — top exercises, the churn histogram, the activity mix.
 *
 * ⚠ ONE COLOUR FOR EVERY BAR. See the module header: ramping these would double-encode length as hue.
 */
export function AdminBarChart({ rows, max }: { rows: BarRow[]; max?: number }) {
  if (!rows.length) return <Text style={styles.empty}>Nothing here yet.</Text>;
  const values = rows.map((r) => r.value);
  const fractions = max && max > 0 ? values.map((v) => Math.max(0, v) / max) : barFractions(values);

  return (
    <View style={styles.bars}>
      {rows.map((r, i) => (
        <View key={`${r.label}-${i}`} style={styles.barRow}>
          <View style={styles.barHead}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {r.label}
            </Text>
            <Text style={styles.barValue}>
              {groupedNumber(r.value)}
              {r.note ? <Text style={styles.barNote}> {r.note}</Text> : null}
            </Text>
          </View>
          <View style={styles.barTrack}>
            {/* Square at the baseline, rounded at the data end — the end is where the value is read. */}
            <View style={[styles.barFill, { width: `${Math.max(fractions[i] * 100, r.value > 0 ? 1.5 : 0)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** The churn-risk histogram and friends — a `Bucket[]` straight from the RPC. */
export function BucketBars({ buckets }: { buckets: Bucket[] }) {
  return <AdminBarChart rows={buckets.map((b) => ({ label: b.label, value: b.n }))} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Funnel
// ─────────────────────────────────────────────────────────────────────────────

export interface FunnelStage {
  label: string;
  value: number;
  /** Stages with their own denominator carry it. The week-2 stage is the reason this exists. */
  ofLabel?: string;
  denominator?: number;
}

export function AdminFunnelBars({ stages }: { stages: FunnelStage[] }) {
  const top = stages[0]?.value ?? 0;
  return (
    <View style={styles.bars}>
      {stages.map((s, i) => {
        const denom = s.denominator ?? top;
        const share = pctOf(s.value, denom);
        const prev = i > 0 ? stages[i - 1] : null;
        // A stage with its own denominator is not comparable to the one above it, so it does not
        // claim a step-conversion. Reporting one would be arithmetic on two different populations.
        const stepPct = prev && s.denominator == null ? pctOf(s.value, prev.value) : null;
        const step = ADMIN_RAMP[Math.min(i, ADMIN_RAMP.length - 1)];
        return (
          <View key={s.label} style={styles.barRow}>
            <View style={styles.barHead}>
              <Text style={styles.barLabel} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={styles.barValue}>
                {groupedNumber(s.value)}
                {share != null ? <Text style={styles.barNote}> · {share}%</Text> : null}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.max((share ?? 0), s.value > 0 ? 1.5 : 0)}%`, backgroundColor: step }]} />
            </View>
            <Text style={styles.funnelNote}>
              {s.ofLabel ? s.ofLabel : stepPct != null ? `${stepPct}% of the step above` : 'of everyone who signed up'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cohort grid
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Weekly signup cohorts × weeks-since.
 *
 * Two rules here are the whole reason this component is not a plain table:
 *
 *   · A cell beyond a cohort's `maxK` is UNKNOWN — bare surface, no number. It has not happened yet.
 *     Drawing it as 0% draws a retention cliff that is really just the calendar.
 *   · A 0% cell IS known and prints its zero on bare surface, so "nobody came back" and "we do not
 *     know yet" never look the same.
 */
export function CohortGrid({ cohorts, weeks }: { cohorts: Cohort[]; weeks: number }) {
  if (!cohorts.length) return <Text style={styles.empty}>No cohorts yet.</Text>;
  const cols = Math.min(weeks, Math.max(1, ...cohorts.map((c) => c.maxK + 1)), 9);

  return (
    <View>
      <View style={styles.cohortHead}>
        <Text style={[styles.cohortLabelCell, styles.cohortHeadText]}>Cohort</Text>
        <Text style={[styles.cohortSizeCell, styles.cohortHeadText]}>n</Text>
        {Array.from({ length: cols }, (_, k) => (
          <Text key={k} style={[styles.cohortCell, styles.cohortHeadText]}>
            W{k}
          </Text>
        ))}
      </View>

      {cohorts.map((c) => (
        <View key={c.week} style={styles.cohortRow}>
          <Text style={styles.cohortLabelCell} numberOfLines={1}>
            {weekLabel(c.week)}
          </Text>
          <Text style={styles.cohortSizeCell}>{c.size}</Text>
          {Array.from({ length: cols }, (_, k) => {
            const unknown = cellState(k, c.maxK) === 'unknown';
            const cell = c.cells.find((x) => x.k === k);
            const pct = cell?.pct ?? 0;
            const step = rampStep(pct);
            return (
              <View
                key={k}
                style={[
                  styles.cohortCellBox,
                  step >= 0 ? { backgroundColor: ADMIN_RAMP[step] } : styles.cohortCellBare,
                  unknown && styles.cohortCellUnknown,
                ]}
              >
                {/* Unknown prints nothing at all. Zero prints its zero. */}
                <Text style={[styles.cohortCellText, step >= 2 && styles.cohortCellTextDark]}>
                  {unknown ? '' : `${Math.round(pct)}`}
                </Text>
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.legend}>
        <Text style={styles.legendLabel}>0%</Text>
        {ADMIN_RAMP.map((c) => (
          <View key={c} style={[styles.legendSwatch, { backgroundColor: c }]} />
        ))}
        <Text style={styles.legendLabel}>100%</Text>
        <View style={styles.legendSpacer} />
        <View style={[styles.legendSwatch, styles.cohortCellBare, styles.cohortCellUnknown]} />
        <Text style={styles.legendLabel}>not yet</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Range control
// ─────────────────────────────────────────────────────────────────────────────

export function RangeControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Text
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[styles.segmentItem, on && styles.segmentItemOn]}
          >
            {o.label}
          </Text>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

/** A label/value line for the figures that do not deserve a chart. */
export function StatLine({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statLine}>
      <Text style={styles.statLineLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.statLineValue}>{typeof value === 'number' ? groupedNumber(value) : value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: flColor.charcoal800,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 2,
  },
  tileLabel: { color: flText.tertiary, fontSize: 10.5, letterSpacing: 0.4, textTransform: 'uppercase' },
  tileValue: { color: flText.primary, fontSize: 26, fontFamily: flFont.display, letterSpacing: 0.2 },
  tileSuffix: { color: flText.secondary, fontSize: 13 },
  tileDelta: { fontSize: 11, marginTop: 1 },
  tileDeltaNote: { color: flColor.gray600, fontSize: 10 },
  spark: { marginTop: 6 },

  chartBlock: { gap: 6 },
  chartTitle: { color: flText.secondary, fontSize: 12, letterSpacing: 0.3 },
  chartCaption: { color: flColor.gray600, fontSize: 10.5, lineHeight: 15 },
  empty: { color: flColor.gray600, fontSize: 12, paddingVertical: 10 },

  bars: { gap: 10 },
  barRow: { gap: 4 },
  barHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  barLabel: { color: flText.secondary, fontSize: 12.5, flexShrink: 1 },
  barValue: { color: flText.primary, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  barNote: { color: flColor.gray600, fontSize: 11 },
  barTrack: { height: 8, borderRadius: 2, backgroundColor: flColor.charcoal700, overflow: 'hidden' },
  // Square at the baseline, rounded at the data end.
  barFill: { height: 8, backgroundColor: flColor.bronze400, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  funnelNote: { color: flColor.gray600, fontSize: 10.5 },

  cohortHead: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  cohortRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 2 },
  cohortHeadText: { color: flColor.gray600, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.3 },
  cohortLabelCell: { width: 52, color: flText.secondary, fontSize: 11, fontVariant: ['tabular-nums'] },
  cohortSizeCell: { width: 24, color: flColor.gray600, fontSize: 10.5, textAlign: 'right', fontVariant: ['tabular-nums'] },
  cohortCell: { flex: 1, textAlign: 'center' },
  cohortCellBox: { flex: 1, height: 22, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  cohortCellBare: { backgroundColor: flColor.charcoal700 },
  cohortCellUnknown: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: flColor.charcoal600 },
  cohortCellText: { color: flColor.cream100, fontSize: 10, fontVariant: ['tabular-nums'] },
  // The top of the ramp is light enough that cream text on it fails contrast.
  cohortCellTextDark: { color: flColor.onBronze },

  legend: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 10, flexWrap: 'wrap' },
  legendSwatch: { width: 16, height: 9, borderRadius: 1.5 },
  legendLabel: { color: flColor.gray600, fontSize: 9.5, marginHorizontal: 3 },
  legendSpacer: { width: 14 },

  segment: {
    flexDirection: 'row',
    backgroundColor: flColor.charcoal800,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    padding: 2,
    gap: 2,
  },
  segmentItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    color: flText.tertiary,
    fontSize: 12,
    letterSpacing: 0.4,
    borderRadius: flRadius.sm - 2,
    overflow: 'hidden',
  },
  segmentItemOn: { backgroundColor: flColor.charcoal600, color: flText.primary },

  card: {
    backgroundColor: flColor.charcoal800,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    padding: 14,
    gap: 10,
  },
  cardTitle: { color: flText.primary, fontSize: 14.5, fontFamily: flFont.display, letterSpacing: 0.3 },
  cardSubtitle: { color: flColor.gray600, fontSize: 11, lineHeight: 16, marginTop: -6 },

  statLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingVertical: 3 },
  statLineLabel: { color: flText.secondary, fontSize: 12.5, flexShrink: 1 },
  statLineValue: { color: flText.primary, fontSize: 12.5, fontVariant: ['tabular-nums'] },
});
