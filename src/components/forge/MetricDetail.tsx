import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { ForgeSymbol } from '@/components/forge/ForgeSymbol';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import type { MetricSeries } from '@/data/progress-hub-live';

/**
 * P-2 Metric Detail overlay (`Forge Progress Hub.dc.html` §10) — a full-screen drill-down of one lift's
 * personal-best progression: latest value + gain line, the dated chart (tap a point to read it), a
 * Best/Start/Entries/Change strip, plate-club milestones, and recent PRs. Weight-unit metric; values are
 * best-e1RM (lb).
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthOf = (iso: string) => {
  const m = Number(iso.slice(5, 7));
  return m >= 1 && m <= 12 ? MONTHS[m - 1] : '';
};
const CLUBS = [135, 225, 315, 405, 495, 585, 675, 765];

const W = 320, H = 200, PADX = 16, PADTOP = 18, PADBOT = 30;

export function MetricDetail({ metric, onClose }: { metric: MetricSeries; onClose: () => void }) {
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

  // plate-club milestones the lift has surpassed, at the date first reached
  const milestones = CLUBS.filter((c) => max >= c).map((c) => {
    const i = values.findIndex((v) => v >= c);
    return { club: c, date: pts[i]?.date ?? '', x: xAt(i), y: yAt(c) };
  });
  const recent = [...pts].reverse().slice(0, 5);

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
        <Text style={styles.big}>{metric.current} lb</Text>
        {pts.length > 1 ? (
          <Text style={styles.gain}>
            {change >= 0 ? '+' : ''}
            {change} lb since {monthOf(pts[0].date)}
          </Text>
        ) : null}

        {/* chart */}
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={200} style={styles.chart}>
          <Path d={area} fill="rgba(191,143,79,0.14)" />
          <Path d={line} fill="none" stroke={flColor.bronze400} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {milestones.map((m) => (
            <Path key={m.club} d={`M${m.x.toFixed(1)} ${(m.y - 4).toFixed(1)} L${(m.x + 4).toFixed(1)} ${m.y.toFixed(1)} L${m.x.toFixed(1)} ${(m.y + 4).toFixed(1)} L${(m.x - 4).toFixed(1)} ${m.y.toFixed(1)} Z`} fill="none" stroke={flColor.bronze300} strokeWidth={1.4} />
          ))}
          {coords.map((c, i) => (
            <Circle key={i} cx={c.x} cy={c.y} r={11} fill="transparent" onPress={() => setSel(sel === i ? null : i)} />
          ))}
          {coords.map((c, i) => (
            <Circle key={`d${i}`} cx={c.x} cy={c.y} r={2.5} fill="rgba(191,143,79,0.5)" />
          ))}
          {sel != null && coords[sel] ? <Circle cx={coords[sel].x} cy={coords[sel].y} r={4.5} fill={flColor.bronze300} stroke="#070707" strokeWidth={1.4} /> : null}
          {last ? <Circle cx={last.x} cy={last.y} r={4.6} fill={flColor.bronze300} stroke="#070707" strokeWidth={1.5} /> : null}
        </Svg>
        {sel != null && pts[sel] ? (
          <View style={styles.selReadout}>
            <View style={styles.selDot} />
            <Text style={styles.selText}>
              {pts[sel].value} lb · {monthOf(pts[sel].date)}
            </Text>
          </View>
        ) : null}

        {/* stat strip */}
        <View style={styles.strip}>
          <Stat label="Best" value={`${max}`} />
          <Stat label="Start" value={`${start}`} />
          <Stat label="Entries" value={`${pts.length}`} />
          <Stat label="Change" value={`${change >= 0 ? '+' : ''}${change}`} />
        </View>

        {/* milestones */}
        {milestones.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Milestones</Text>
            {milestones.map((m) => (
              <View key={m.club} style={styles.mRow}>
                <ForgeSymbol name="trophy" size={16} color={flColor.bronze300} />
                <Text style={styles.mName}>{m.club} lb Club</Text>
                <Text style={styles.mDate}>{monthOf(m.date)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* recent PRs */}
        {recent.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Recent PRs</Text>
            {recent.map((p, i) => (
              <View key={`${p.date}-${i}`} style={styles.rRow}>
                <Text style={styles.rTitle}>{p.value} lb</Text>
                <Text style={styles.rDate}>{monthOf(p.date)}</Text>
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
  gain: { fontFamily: flFont.sans, fontSize: 13, color: flColor.bronze300, marginTop: 6 },
  chart: { marginTop: 18 },
  selReadout: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  selDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: flColor.bronze300 },
  selText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.cream100 },

  strip: { flexDirection: 'row', marginTop: 22, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, overflow: 'hidden' },
  statCell: { flex: 1, gap: 3, paddingVertical: 14, paddingHorizontal: 10, backgroundColor: flColor.surfaceRecessed, borderRightWidth: 0.5, borderColor: flColor.charcoal700 },
  statVal: { fontFamily: flFont.display, fontSize: 18, fontWeight: '700', color: flColor.cream100 },
  statLbl: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },

  section: { marginTop: 28 },
  sectionLabel: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 10 },
  mRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  mName: { flex: 1, fontFamily: flFont.sans, fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  mDate: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600 },
  rRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 14, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.charcoal900, marginBottom: 8 },
  rTitle: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  rDate: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600 },
});
