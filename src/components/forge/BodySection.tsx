import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { LogWeightSheet } from '@/components/forge/LogWeightSheet';
import { SettingsToggle } from '@/components/forge/SettingsToggle';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { fetchBodyEntries } from '@/data/body-metrics-live';
import { displayWeight } from '@/domain/settings/units';
import { useBodyPrefs } from '@/lib/body-metrics';
import { useUnits } from '@/lib/settings';
import { useQuery } from '@/lib/useQuery';

/**
 * P-2 Body Metrics section (`Forge Progress Hub.dc.html` §8) — the three-way branch: off (opt-in CTA),
 * on-but-empty (log-your-first prompt, the .dc's silent gap fixed per §15), and on-with-data (latest
 * weight + delta chip + chart with tap-to-read points + latest measurements + progress photos + turn off).
 * Weight displays in the athlete's unit; measurements are inches.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthOf = (iso: string) => {
  const m = Number(iso.slice(5, 7));
  return m >= 1 && m <= 12 ? MONTHS[m - 1] : '';
};
const MINUS = '−';
const W = 300, H = 120, PADX = 10, PADTOP = 12, PADBOT = 24;

export function BodySection() {
  const router = useRouter();
  const { data: entries, refetch } = useQuery(fetchBodyEntries, []);
  const { enabled, showTrend, loaded, setEnabled, setShowTrend } = useBodyPrefs();
  const { units, load } = useUnits();
  const [logOpen, setLogOpen] = useState(false);
  const [sel, setSel] = useState<number | null>(null);

  if (!loaded) return null;

  // ── off: opt-in CTA ──
  if (!enabled) {
    return (
      <View style={styles.section}>
        <Pressable onPress={() => setEnabled(true)} accessibilityRole="button" accessibilityLabel="Track body metrics" style={styles.cta}>
          <View style={styles.ctaIcon}>
            <Glyph d="M3 12h4l3 8 4-16 3 8h4" size={17} color={flColor.gray400} width={1.8} />
          </View>
          <View style={styles.ctaText}>
            <Text style={styles.ctaTitle}>Track body metrics</Text>
            <Text style={styles.ctaSub}>Optional — bodyweight &amp; measurements, only if you want them.</Text>
          </View>
          <Glyph d="M12 5v14M5 12h14" size={16} color={flColor.bronze400} width={2} />
        </Pressable>
      </View>
    );
  }

  const list = entries ?? [];
  const logSheet = <LogWeightSheet key={logOpen ? 'log-open' : 'log-closed'} open={logOpen} onClose={() => setLogOpen(false)} onSaved={refetch} units={units} />;

  // ── on but empty ──
  if (list.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.head}>
          <Text style={styles.label}>Body Metrics</Text>
          <TurnOff onPress={() => setEnabled(false)} />
        </View>
        <Pressable onPress={() => setLogOpen(true)} accessibilityRole="button" accessibilityLabel="Log first weigh-in" style={styles.emptyLog}>
          <Glyph d="M12 5v14M5 12h14" size={16} color={flColor.bronze400} width={2} />
          <Text style={styles.emptyLogText}>Log your first weigh-in</Text>
        </Pressable>
        {logSheet}
      </View>
    );
  }

  // ── on with data ──
  const last = list[list.length - 1];
  const first = list[0];
  const changeVal = displayWeight(last.weightLb, units).value - displayWeight(first.weightLb, units).value;
  const changeUnit = displayWeight(last.weightLb, units).unit;
  const measures = [
    { label: 'Waist', v: last.waist },
    { label: 'Chest', v: last.chest },
    { label: 'Arms', v: last.arm },
  ].filter((m) => m.v != null);

  const vals = list.map((e) => e.weightLb);
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const xAt = (i: number) => (list.length <= 1 ? W / 2 : PADX + (i / (list.length - 1)) * (W - 2 * PADX));
  const yAt = (v: number) => H - PADBOT - ((v - min) / range) * (H - PADTOP - PADBOT);
  const coords = list.map((e, i) => ({ x: xAt(i), y: yAt(e.weightLb) }));
  const line = coords.map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)} ${H - PADBOT} L${coords[0].x.toFixed(1)} ${H - PADBOT} Z`;
  const ticks = tickIndices(list.length).map((i) => ({ x: xAt(i), label: monthOf(list[i].loggedOn) }));
  const selEntry = sel != null ? list[sel] : null;

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text style={styles.label}>Body Metrics</Text>
        <View style={styles.controls}>
          <View style={styles.changeCtl}>
            <Text style={styles.changeLabel}>Change</Text>
            <SettingsToggle value={showTrend} onChange={setShowTrend} accessibilityLabel="Show change" />
          </View>
          <Pressable onPress={() => setLogOpen(true)} accessibilityRole="button" accessibilityLabel="Log weigh-in" style={styles.logBtn}>
            <Glyph d="M12 5v14M5 12h14" size={13} color={flColor.bronze400} width={2} />
            <Text style={styles.logText}>Log</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.latestRow}>
          <Text style={styles.latest}>{load(last.weightLb)}</Text>
          {showTrend ? (
            <Text style={styles.delta}>
              {changeVal < 0 ? MINUS : '+'}
              {Math.abs(changeVal)} {changeUnit} since {monthOf(first.loggedOn)}
            </Text>
          ) : null}
        </View>

        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={120} style={styles.chart}>
          <Line x1={8} y1={H - PADBOT} x2={W - 8} y2={H - PADBOT} stroke={flColor.charcoal600} strokeWidth={1} />
          <Path d={area} fill="rgba(191,143,79,0.16)" />
          <Path d={line} fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {coords.map((c, i) => (
            <Circle key={`h${i}`} cx={c.x} cy={c.y} r={11} fill="transparent" onPress={() => setSel(sel === i ? null : i)} />
          ))}
          {coords.map((c, i) => (
            <Circle key={`d${i}`} cx={c.x} cy={c.y} r={2.5} fill="rgba(191,143,79,0.5)" />
          ))}
          {sel != null && coords[sel] ? <Circle cx={coords[sel].x} cy={coords[sel].y} r={4} fill={flColor.bronze300} stroke="#070707" strokeWidth={1.4} /> : null}
          <Circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={3.4} fill={flColor.bronze300} stroke="#070707" strokeWidth={1.5} />
        </Svg>
        <View style={styles.ticks}>
          {ticks.map((t, i) => (
            <Text key={i} style={styles.tick}>
              {t.label}
            </Text>
          ))}
        </View>

        {selEntry ? (
          <View style={styles.selPanel}>
            <View style={styles.selHead}>
              <Text style={styles.selWeight}>{load(selEntry.weightLb)}</Text>
              <Text style={styles.selDate}>{monthOf(selEntry.loggedOn)}</Text>
            </View>
            {selEntry.waist == null && selEntry.chest == null && selEntry.arm == null ? (
              <Text style={styles.noMeasure}>No measurements logged this entry.</Text>
            ) : (
              <View style={styles.pills}>
                {selEntry.waist != null ? <Pill label="Waist" value={`${selEntry.waist}″`} /> : null}
                {selEntry.chest != null ? <Pill label="Chest" value={`${selEntry.chest}″`} /> : null}
                {selEntry.arm != null ? <Pill label="Arms" value={`${selEntry.arm}″`} /> : null}
              </View>
            )}
          </View>
        ) : measures.length ? (
          <View style={styles.pills}>
            {measures.map((m) => (
              <Pill key={m.label} label={m.label} value={`${m.v}″`} />
            ))}
          </View>
        ) : null}

        <Pressable onPress={() => router.push('/transformation')} accessibilityRole="button" accessibilityLabel="Progress photos" style={styles.photos}>
          <View style={styles.photosIcon}>
            <Glyph d="M4 7h3l1.5-2h7L17 7h3v12H4z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" size={16} color={flColor.bronze300} width={1.7} />
          </View>
          <View style={styles.photosText}>
            <Text style={styles.photosTitle}>Progress photos</Text>
            <Text style={styles.photosSub}>Take new progress pics</Text>
          </View>
          <Glyph d="M9 5l7 7-7 7" size={16} color={flColor.bronze400} width={1.9} />
        </Pressable>
      </View>

      <View style={styles.turnOffRow}>
        <TurnOff onPress={() => setEnabled(false)} />
      </View>

      {logSheet}
    </View>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

function TurnOff({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Turn off body metrics">
      <Text style={styles.turnOff}>Turn off body metrics</Text>
    </Pressable>
  );
}

function Glyph({ d, size, color, width = 1.9 }: { d: string; size: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

/** Up to 4 tick indices: all if ≤4 points, else 0/⅓/⅔/last. */
function tickIndices(n: number): number[] {
  if (n <= 4) return Array.from({ length: n }, (_, i) => i);
  return [0, Math.round(n / 3), Math.round((2 * n) / 3), n - 1];
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 22, paddingTop: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, paddingBottom: 12 },
  label: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.bronze400 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  changeCtl: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  changeLabel: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logText: { fontFamily: flFont.sans, fontSize: 11.5, fontWeight: '600', color: flColor.bronze400 },

  cta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.charcoal500 },
  ctaIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: flColor.charcoal600 },
  ctaText: { flex: 1, minWidth: 0, gap: 2 },
  ctaTitle: { fontFamily: flFont.sans, fontSize: 14, fontWeight: '600', color: flColor.gray400 },
  ctaSub: { fontFamily: flFont.sans, fontSize: 11.5, color: flColor.gray600 },

  emptyLog: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  emptyLogText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.bronze400 },

  card: { padding: 16, borderRadius: flRadius.lg, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal700 },
  latestRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingHorizontal: 2, paddingBottom: 4 },
  latest: { fontFamily: flFont.display, fontSize: 32, fontWeight: '700', letterSpacing: -0.6, color: flColor.cream100 },
  delta: { fontFamily: flFont.sans, fontSize: 12.5, fontWeight: '600', color: flColor.bronze300 },
  chart: { marginTop: 4 },
  ticks: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: -4 },
  tick: { fontFamily: flFont.sans, fontSize: 9, color: flColor.gray600 },

  selPanel: { marginTop: 12, padding: 12, borderRadius: flRadius.md, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  selHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  selWeight: { fontFamily: flFont.display, fontSize: 19, fontWeight: '700', color: flColor.cream100 },
  selDate: { fontFamily: flFont.sans, fontSize: 11, color: flColor.gray600 },
  noMeasure: { fontFamily: flFont.sans, fontSize: 11, color: flColor.gray600, marginTop: 7 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingHorizontal: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 11, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  pillLabel: { fontFamily: flFont.sans, fontSize: 11.5, color: flColor.gray600 },
  pillValue: { fontFamily: flFont.sans, fontSize: 11.5, fontWeight: '600', color: flColor.cream100 },

  photos: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  photosIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal800 },
  photosText: { flex: 1, minWidth: 0, gap: 1 },
  photosTitle: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.cream100 },
  photosSub: { fontFamily: flFont.sans, fontSize: 11, color: flColor.gray600 },

  turnOffRow: { alignItems: 'flex-end', paddingTop: 8, paddingHorizontal: 2 },
  turnOff: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '600', color: flColor.gray600 },
});
