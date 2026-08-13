import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { ForgeSymbol } from '@/components/forge/ForgeSymbol';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { changeLabel, currentLabel, monthYear, pointLabel, tickIndices, type MetricSeries } from '@/domain/progress/lift-series';
import { useUnits } from '@/lib/settings';
import { unitLabel } from '@/domain/settings/units';

/**
 * P-2 Metric Detail overlay (`Forge Progress Hub.dc.html` §10) — one lift's progression in full: the
 * latest figure and what it has done since you started, the dated chart (tap a point to read it), a
 * Best / Start / Sessions / Change strip, plate-club milestones, and the recent sessions listed.
 *
 * ══ WHAT THE LINE IS ══
 *
 * One point per DAY TRAINED, valued at the heaviest weight actually moved that day — not the estimated
 * 1RM this screen used to plot, and not only the days a record fell. `domain/progress/lift-series.ts`
 * owns that decision and the reasoning; this screen draws it. A bodyweight lift is charted in reps.
 *
 * ══ THREE THINGS THE `.dc` HAD THAT THE BUILT CHART DID NOT ══
 *
 *   · GRIDLINES. Without them a line has no scale, and every lift's chart looks identical whether it
 *     climbed 40 lb or 4 — the shape is normalised to the box either way.
 *   · X-AXIS TICKS. A progression with no dates under it cannot answer "over what period?", which is
 *     half the question. `tickIndices` is the design's own four-tick rule.
 *   · RECORD MARKS. The design draws milestone diamonds off a fixed plate ladder; those stay, and the
 *     days that actually SET a personal record are now marked too — the one thing the old PR-only
 *     chart did say, kept rather than lost in the change to plotting every session.
 *
 * DEFERRED vs the `.dc`: its Catmull-Rom smoothing. A curve through training data invents values between
 * sessions — it draws a Tuesday you did not train — and on a chart whose whole job is "what did I
 * actually lift", a straight segment between two facts is the more honest line.
 */

const CLUBS = [135, 225, 315, 405, 495, 585, 675, 765];

const W = 320, H = 200, PADX = 20, PADTOP = 18, PADBOT = 34;

export function MetricDetail({ metric, onClose }: { metric: MetricSeries; onClose: () => void }) {
  const { units } = useUnits();
  const insets = useSafeAreaInsets();
  const [sel, setSel] = useState<number | null>(null);

  const pts = metric.points;
  const values = pts.map((p) => p.value);
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const start = values[0] ?? 0;
  const change = metric.current - start;

  const xAt = (i: number) => (pts.length <= 1 ? W / 2 : PADX + (i / (pts.length - 1)) * (W - 2 * PADX));
  const yAt = (v: number) => H - PADBOT - ((v - min) / range) * (H - PADTOP - PADBOT);
  const coords = pts.map((p, i) => ({ x: xAt(i), y: yAt(p.value) }));
  const line = coords.map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const area = coords.length ? `${line} L${coords[coords.length - 1].x.toFixed(1)} ${H - PADBOT} L${coords[0].x.toFixed(1)} ${H - PADBOT} Z` : '';
  const last = coords[coords.length - 1];

  // Three gridlines across the plot, labelled at the extremes only — a value on every line would
  // crowd a 320-wide chart, and the top and bottom are the two that give the line its scale.
  const grid = [0, 0.5, 1].map((f) => ({ f, y: PADTOP + f * (H - PADTOP - PADBOT), value: Math.round(max - f * range) }));
  const ticks = tickIndices(pts.length).map((i) => ({ i, x: xAt(i), label: monthYear(pts[i].date) }));

  // Plate clubs this lift has passed, at the session it first got there. Weight metrics only: there is
  // no 225 lb club for a set of pull-ups.
  const milestones =
    metric.unit === 'weight'
      ? CLUBS.filter((c) => max >= c).map((c) => {
          const i = values.findIndex((v) => v >= c);
          return { club: c, date: pts[i]?.date ?? '', x: xAt(i), y: yAt(c) };
        })
      : [];
  const prIdx = pts.map((p, i) => (p.isPR ? i : -1)).filter((i) => i >= 0);
  const recent = [...pts].reverse().slice(0, 5);
  const changeText = changeLabel(metric, units);
  // Labels the Best / Start / Change strip directly above it — those figures are now converted, so this
  // caption has to move with them or it names the wrong unit for its own numbers.
  const unitWord = metric.unit === 'reps' ? 'reps' : unitLabel(units);

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.24} overlay={{ flat: 'rgba(5,5,5,0.62)' }} />

      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Back" style={styles.barBtn} hitSlop={8}>
          <Glyph d="M15 5l-7 7 7 7" size={22} color={flColor.gray400} />
        </Pressable>
        <Text style={styles.barTitle} numberOfLines={1}>
          {metric.name}
        </Text>
        <View style={styles.barBtn} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{metric.category} · Latest</Text>
        <Text style={styles.big}>{currentLabel(metric, units)}</Text>
        {/* The reps the top set was moved for. Without it "245 lb" is half a fact, and the line would
            read as progress on a day the athlete went heavier for fewer. */}
        {metric.unit === 'weight' && pts[pts.length - 1]?.reps != null ? (
          <Text style={styles.sub}>top set · {pts[pts.length - 1].reps} reps</Text>
        ) : null}
        {changeText ? <Text style={styles.gain}>{changeText}</Text> : null}

        {/* chart */}
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={200} style={styles.chart}>
          {grid.map((g) => (
            <Line key={g.f} x1={PADX - 8} y1={g.y} x2={W - PADX + 8} y2={g.y} stroke="rgba(255,255,255,0.055)" strokeWidth={1} />
          ))}
          {/* Only the top and bottom carry a number — the scale, stated twice, is enough to read by. */}
          {[grid[0], grid[2]].map((g) => (
            <SvgText key={`gl${g.f}`} x={PADX - 10} y={g.y + 3} fill={flColor.gray600} fontSize={8.5} textAnchor="end">
              {g.value}
            </SvgText>
          ))}
          <Path d={area} fill="rgba(186, 134, 84,0.14)" />
          <Path d={line} fill="none" stroke={flColor.bronze400} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {milestones.map((m) => (
            <Path key={m.club} d={`M${m.x.toFixed(1)} ${(m.y - 4).toFixed(1)} L${(m.x + 4).toFixed(1)} ${m.y.toFixed(1)} L${m.x.toFixed(1)} ${(m.y + 4).toFixed(1)} L${(m.x - 4).toFixed(1)} ${m.y.toFixed(1)} Z`} fill="none" stroke={flColor.bronze300} strokeWidth={1.4} />
          ))}
          {/* A record day gets a ring, so the one thing the old PR-only chart could say is still said. */}
          {prIdx.map((i) => (
            <Circle key={`pr${i}`} cx={coords[i].x} cy={coords[i].y} r={6.5} fill="none" stroke={flColor.bronze300} strokeWidth={1.2} opacity={0.75} />
          ))}
          {coords.map((c, i) => (
            <Circle key={i} cx={c.x} cy={c.y} r={11} fill="transparent" onPress={() => setSel(sel === i ? null : i)} />
          ))}
          {coords.map((c, i) => (
            <Circle key={`d${i}`} cx={c.x} cy={c.y} r={2.5} fill="rgba(186, 134, 84,0.5)" />
          ))}
          {ticks.map((t) => (
            <SvgText key={t.i} x={t.x} y={H - PADBOT + 16} fill={flColor.gray600} fontSize={9} textAnchor="middle">
              {t.label}
            </SvgText>
          ))}
          {sel != null && coords[sel] ? <Circle cx={coords[sel].x} cy={coords[sel].y} r={4.5} fill={flColor.bronze300} stroke="#070707" strokeWidth={1.4} /> : null}
          {last ? <Circle cx={last.x} cy={last.y} r={4.6} fill={flColor.bronze300} stroke="#070707" strokeWidth={1.5} /> : null}
        </Svg>
        {sel != null && pts[sel] ? (
          <View style={styles.selReadout}>
            <View style={styles.selDot} />
            <Text style={styles.selText}>
              {pointLabel(metric, pts[sel], units)} · {monthYear(pts[sel].date)}
              {pts[sel].isPR ? ' · PR' : ''}
            </Text>
          </View>
        ) : (
          <Text style={styles.chartHint}>
            {pts.length === 1
              ? 'One session so far — the line starts with the next one.'
              : `${pts.length} sessions · tap a point to read it`}
          </Text>
        )}

        {/* stat strip */}
        <View style={styles.strip}>
          <Stat label="Best" value={`${max}`} />
          <Stat label="Start" value={`${start}`} />
          <Stat label="Sessions" value={`${metric.sessions}`} />
          <Stat label="Change" value={`${change >= 0 ? '+' : '−'}${Math.abs(change)}`} />
        </View>
        <Text style={styles.stripUnit}>in {unitWord}</Text>

        {/* milestones */}
        {milestones.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Milestones</Text>
            {milestones.map((m) => (
              <View key={m.club} style={styles.mRow}>
                <ForgeSymbol name="trophy" size={16} color={flColor.bronze300} />
                {/* ⚠ DELIBERATELY NOT CONVERTED — flagged for the PO rather than decided here.
                    "225 lb Club" is a proper noun in lifting, not a measurement: the metric equivalents
                    are 100/140/180 kg, which are different milestones, not conversions of these. Turning
                    it into "102 kg Club" would name a number no lifter recognises. Left explicit so a
                    metric athlete reads a self-labelled imperial milestone rather than a mislabelled
                    figure — every OTHER number on this screen is now in their own units. */}
                <Text style={styles.mName}>{m.club} lb Club</Text>
                <Text style={styles.mDate}>{monthYear(m.date)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* recent sessions — was "Recent PRs", which was true only while the series was PR rows */}
        {recent.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Recent sessions</Text>
            {recent.map((p, i) => (
              <View key={`${p.date}-${i}`} style={styles.rRow}>
                <Text style={styles.rTitle}>{pointLabel(metric, p, units)}</Text>
                <View style={styles.rRight}>
                  {p.isPR ? (
                    <View style={styles.prPill}>
                      <Text style={styles.prPillText}>PR</Text>
                    </View>
                  ) : null}
                  <Text style={styles.rDate}>{monthYear(p.date)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

function Glyph({ d, size, color, width = 1.9 }: { d: string; size: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#050505', zIndex: 70 },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 8, paddingBottom: 6 },
  barBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, fontFamily: flFont.sans, fontSize: 14, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },

  body: { paddingHorizontal: 22, paddingTop: 8 },
  eyebrow: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  big: { fontFamily: flFont.display, fontSize: 44, fontWeight: '700', letterSpacing: -1, color: flColor.cream100, marginTop: 6 },
  sub: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray600, marginTop: 2 },
  gain: { fontFamily: flFont.sans, fontSize: 13, color: flColor.bronze300, marginTop: 6 },
  chart: { marginTop: 18 },
  chartHint: { fontFamily: flFont.sans, fontSize: 11.5, color: flColor.gray600, marginTop: 6 },
  selReadout: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  selDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: flColor.bronze300 },
  selText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.cream100 },

  strip: { flexDirection: 'row', marginTop: 22, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, overflow: 'hidden' },
  statCell: { flex: 1, gap: 3, paddingVertical: 14, paddingHorizontal: 10, backgroundColor: flColor.surfaceRecessed, borderRightWidth: 0.5, borderColor: flColor.charcoal700 },
  statVal: { fontFamily: flFont.display, fontSize: 18, fontWeight: '700', color: flColor.cream100 },
  statLbl: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  // The strip's four figures share one unit, said once beneath them rather than four times inside them.
  stripUnit: { fontFamily: flFont.sans, fontSize: 10.5, color: flColor.gray600, marginTop: 7, textAlign: 'right' },

  section: { marginTop: 28 },
  sectionLabel: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 10 },
  mRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  mName: { flex: 1, fontFamily: flFont.sans, fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  mDate: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600 },
  rRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 14, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.charcoal900, marginBottom: 8 },
  rTitle: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  rRight: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  rDate: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600 },
  prPill: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: flRadius.sm, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  prPillText: { fontFamily: flFont.sans, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.8, color: flColor.bronze300 },
});
