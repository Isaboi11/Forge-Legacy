import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ForgeSymbol } from '@/components/forge/ForgeSymbol';
import { RankSeal } from '@/components/forge/RankSeal';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { resolveRankBadge } from '@/domain/rank-artwork/badge-art';
import type { RankFamily, RankLevel } from '@/domain/rank-artwork/resolver';
import { fetchProgressHub, type MetricSeries } from '@/data/progress-hub-live';
import { useMetricSelection } from '@/lib/metric-selection';
import { useProfile } from '@/lib/profile';
import { useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { MetricDetail } from '@/components/forge/MetricDetail';
import { EditMetricsSheet } from '@/components/forge/EditMetricsSheet';
import { BodySection } from '@/components/forge/BodySection';

/**
 * P-2 Progress Hub (`Forge Progress Hub.dc.html`) — the full picture reached from the Legacy rank badge:
 * rank journey (centerpiece), identity, strength PBs, consistency, body metrics, and what's next — all
 * wired to live data. (Honors live on the Legacy page, so they're not duplicated here.) Strength cards
 * open the Metric Detail overlay + Edit Metrics sheet; the body
 * section (BodySection) owns the weigh-in log + chart, and its "Progress photos" row opens the L-17
 * Transformation gallery (`/transformation`).
 */

const LADDER: { key: RankFamily; name: string; statement: string }[] = [
  { key: 'foundation', name: 'Foundation', statement: "I've started." },
  { key: 'builder', name: 'Builder', statement: "I'm building habits." },
  { key: 'craftsman', name: 'Craftsman', statement: 'I know how to train.' },
  { key: 'architect', name: 'Architect', statement: "I'm intentionally shaping my development." },
  { key: 'established', name: 'Established', statement: 'What I built outlives me.' },
  { key: 'legend', name: 'Legend', statement: 'My journey has become a meaningful story.' },
  { key: 'legacy', name: 'Legacy', statement: 'I repeatedly become the person I intend to become.' },
];
const ORDER = LADDER.map((l) => l.key);

export default function ProgressHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { showToast } = useToast();
  const { data, loading } = useQuery(fetchProgressHub, []);
  const { selected, persist } = useMetricSelection();
  const [openId, setOpenId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  if (loading || !data) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.3} overlay={{ flat: 'rgba(5,5,5,0.4)' }} />
        <AppBar title="Progress" serif onBack={() => router.back()} />
        <View style={styles.center}>{loading ? <ActivityIndicator color={flColor.bronze400} /> : <Text style={styles.err}>Couldn’t load progress.</Text>}</View>
      </View>
    );
  }

  const cur = ORDER.indexOf(data.rankFamily);
  const curDef = LADDER[cur];
  const sex = profile?.sex;

  // Which lifts show as cards: the saved selection, else the athlete's most-recent lifts (default).
  const metrics = data.metrics;
  const shownIds = selected.length ? selected : metrics.slice(0, 4).map((m) => m.id);
  const shown = shownIds.map((id) => metrics.find((m) => m.id === id)).filter((m): m is MetricSeries => m != null).slice(0, 4);
  const openMetric = openId ? metrics.find((m) => m.id === openId) ?? null : null;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.28} overlay={{ flat: 'rgba(5,5,5,0.5)' }} />
      <AppBar title="Progress" serif onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {/* ── HERO ── */}
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <Badge family={data.rankFamily} level={data.rankSubTier as RankLevel} sex={sex} size={74} />
            <View style={styles.heroText}>
              <Text style={styles.eyebrow}>Current Rank</Text>
              <Text style={styles.heroRank}>
                {curDef.name} · {ROMAN[data.rankSubTier]}
              </Text>
              <Text style={styles.heroStatement}>{curDef.statement}</Text>
            </View>
          </View>

          <View style={styles.facts}>
            <Fact label="Chapter" value={data.chapter ?? '—'} />
            <Fact label="Forging Since" value={data.forgingSince} />
            <Fact label="Lifetime" value={String(data.lifetime)} />
          </View>

          {data.pinned ? (
            <Pressable onPress={() => router.push('/honors')} accessibilityRole="button" accessibilityLabel="Pinned achievement" style={styles.pinned}>
              <ForgeSymbol name="trophy" size={18} color={flColor.bronze300} />
              <View style={styles.pinnedText}>
                <Text style={styles.pinnedLabel}>Pinned</Text>
                <Text style={styles.pinnedValue} numberOfLines={1}>
                  {data.pinned}
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        {/* ── RANK JOURNEY ── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>Rank Journey</Text>
            <Text style={styles.sectionCaption}>{cur} of the path walked</Text>
          </View>
          <View style={styles.journey}>
            <View style={[styles.spine, { top: 24, bottom: 24 }]} pointerEvents="none">
              <View style={[styles.spineFill, { height: `${Math.round(((cur + 0.5) / 7) * 100)}%` }]} />
            </View>
            {LADDER.map((f, i) => (
              <Rung key={f.key} def={f} state={i < cur ? 'earned' : i === cur ? 'current' : 'locked'} subTier={data.rankSubTier as RankLevel} sex={sex} />
            ))}
            <View style={styles.closer}>
              <View style={styles.closerIcon}>
                <Chevron />
              </View>
              <Text style={styles.closerText}>The path continues. What comes next is earned, not previewed.</Text>
            </View>
          </View>
        </View>

        {/* ── STRENGTH & PERFORMANCE ── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>Strength &amp; Performance</Text>
            <Pressable onPress={() => setEditOpen(true)} accessibilityRole="button" accessibilityLabel="Edit metrics" style={styles.editLink}>
              <Glyph d={PATHS.pencil} size={13} color={flColor.bronze400} />
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          </View>
          {shown.length ? (
            <View style={styles.strengthGrid}>
              {shown.map((m) => (
                <StrengthTile key={m.id} metric={m} onPress={() => setOpenId(m.id)} />
              ))}
            </View>
          ) : metrics.length ? (
            <Pressable onPress={() => setEditOpen(true)} accessibilityRole="button" accessibilityLabel="Choose lifts" style={styles.strengthEmpty}>
              <Text style={styles.strengthEmptyText}>Choose the lifts that matter to you</Text>
            </Pressable>
          ) : (
            <View style={styles.strengthEmpty}>
              <Text style={styles.strengthEmptyText}>Log a lift and your PRs appear here</Text>
            </View>
          )}
        </View>

        {/* ── CONSISTENCY ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Consistency &amp; Training</Text>
          <View style={styles.bigStatRow}>
            <Text style={styles.bigStat}>{data.consistency.lifetime}</Text>
            <Text style={styles.bigStatSub}>workouts,{'\n'}and counting</Text>
          </View>
          <View style={styles.statGrid}>
            <StatCell value={`${data.consistency.hoursForged}`} label="Hours Forged" />
            <StatCell value={`${data.consistency.thisMonth}`} label="This Month" />
            <StatCell value={`${data.consistency.hoursPerMonth}`} label="Hours / Month" />
            <StatCell value={`${data.consistency.avgPerWeek}`} label="Avg / Week" />
          </View>
          <View style={styles.streakRow}>
            <Glyph d={PATHS.flame} size={14} color={flColor.gray600} width={1.7} />
            <Text style={styles.streakText}>
              Best streak · <Text style={styles.streakVal}>{data.consistency.bestStreakWeeks} weeks</Text>
            </Text>
          </View>
        </View>

        {/* ── BODY METRICS (Slice C — live; its "Progress photos" row opens the L-17 Transformation gallery) ── */}
        <BodySection />

        {/* ── WHAT'S NEXT ── */}
        {data.next ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>What&apos;s Next</Text>
            <Pressable onPress={() => router.push({ pathname: '/program/[id]', params: { id: data.next!.id } })} accessibilityRole="button" accessibilityLabel={data.next.title} style={styles.nextCard}>
              <LinearGradient colors={['rgba(186, 134, 84,0.10)', 'rgba(186, 134, 84,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.75 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
              <View style={styles.nextIcon}>
                <ForgeSymbol name="dumbbell" size={20} color={flColor.bronze300} />
              </View>
              <View style={styles.nextText}>
                <Text style={styles.nextKicker}>Continue Your Program</Text>
                <Text style={styles.nextTitle}>{data.next.title}</Text>
                <Text style={styles.nextSub}>{data.next.sub}</Text>
              </View>
              <Chevron right />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {openMetric ? <MetricDetail metric={openMetric} onClose={() => setOpenId(null)} /> : null}
      <EditMetricsSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        metrics={metrics}
        selectedIds={shownIds}
        onPersist={persist}
        onCap={() => showToast(`Up to 4 metrics — turn one off to add another`)}
      />
    </View>
  );
}

// ── pieces ──
const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;

const PATHS = {
  pencil: 'M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17.2z M13.5 6.5l4 4',
  flame: 'M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z',
  pulse: 'M3 12h4l3 8 4-16 3 8h4',
  plus: 'M12 5v14M5 12h14',
  trendUp: 'M7 17L17 7M9 7h8v8',
  lock: 'M7 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z M8 11V8a4 4 0 0 1 8 0v3',
} as const;

function Glyph({ d, size, color, width = 1.9 }: { d: string; size: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

function Badge({ family, level, sex, size }: { family: RankFamily; level: RankLevel; sex?: 'male' | 'female' | 'unspecified'; size: number }) {
  const art = resolveRankBadge({ family, level, sex });
  if (art != null) return <Image source={art} style={{ width: size, height: size * 1.37 }} resizeMode="contain" />;
  return <RankSeal family={family} level={level} size={size} />;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Rung({ def, state, subTier, sex }: { def: { key: RankFamily; name: string; statement: string }; state: 'earned' | 'current' | 'locked'; subTier: RankLevel; sex?: 'male' | 'female' | 'unspecified' }) {
  return (
    <View style={[styles.rung, state === 'current' && styles.rungCurrent, state === 'locked' && styles.rungLocked]}>
      <View style={styles.rungNode}>
        {state === 'locked' ? (
          <View style={styles.lockHex}>
            <Glyph d={PATHS.lock} size={15} color="rgba(150,130,100,0.5)" width={1.8} />
          </View>
        ) : (
          <Badge family={def.key} level={state === 'current' ? subTier : 4} sex={sex} size={state === 'current' ? 48 : 41} />
        )}
      </View>
      <View style={styles.rungLabel}>
        <View style={styles.rungNameRow}>
          <Text style={[state === 'current' ? styles.rungNameCurrent : state === 'earned' ? styles.rungNameEarned : styles.rungNameLocked]} numberOfLines={1}>
            {state === 'locked' ? '————' : def.name}
          </Text>
          {state === 'current' ? (
            <View style={styles.hereChip}>
              <Text style={styles.hereChipText}>You are here</Text>
            </View>
          ) : null}
        </View>
        <Text style={[state === 'current' ? styles.rungStmtCurrent : styles.rungStmt]} numberOfLines={2}>
          {state === 'locked' ? 'Sealed until earned' : def.statement}
        </Text>
      </View>
    </View>
  );
}

function StrengthTile({ metric, onPress }: { metric: MetricSeries; onPress: () => void }) {
  const s = spark(metric.points.map((p) => p.value));
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={metric.name} style={styles.strengthTile}>
      <Text style={styles.tileCat}>{metric.category}</Text>
      <Text style={styles.tileName} numberOfLines={1}>
        {metric.name}
      </Text>
      <View style={styles.tileValueRow}>
        <Text style={styles.tileValue}>{metric.current} lb</Text>
        {metric.improving ? <Glyph d={PATHS.trendUp} size={13} color={flColor.bronze300} width={2} /> : <Text style={styles.tileFlat}>—</Text>}
      </View>
      {s ? (
        <Svg viewBox="0 0 82 30" width="100%" height={26} preserveAspectRatio="none" style={styles.spark}>
          <Path d={s.area} fill="rgba(186, 134, 84,0.10)" />
          <Path d={s.line} fill="none" stroke={flColor.bronze400} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <Circle cx={s.lastX} cy={s.lastY} r={2.2} fill={flColor.bronze300} />
        </Svg>
      ) : (
        <View style={{ height: 26 }} />
      )}
    </Pressable>
  );
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Chevron({ right }: { right?: boolean }) {
  return (
    <Svg width={right ? 18 : 16} height={right ? 18 : 16} viewBox="0 0 24 24" fill="none" stroke={right ? flColor.bronze400 : flColor.gray600} strokeWidth={right ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d={right ? 'M9 6l6 6-6 6' : 'M6 9l6 6 6-6'} />
    </Svg>
  );
}

/** Normalized polyline for an 82×30 sparkline: line path, area fill, and the last point. */
function spark(series: number[]): { line: string; area: string; lastX: number; lastY: number } | null {
  if (series.length < 2) return null;
  const w = 82, h = 26, min = Math.min(...series), max = Math.max(...series), range = max - min || 1;
  const pts = series.map((v, i) => ({ x: (i / (series.length - 1)) * w, y: h - ((v - min) / range) * h }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return { line, area: `${line} L${w} ${h} L0 ${h} Z`, lastX: last.x, lastY: last.y };
}

const HAIRLINE = flColor.charcoal700;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  err: { fontSize: 14, color: flColor.gray400 },
  body: { paddingTop: 4 },

  eyebrow: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray600 },

  // hero
  hero: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroText: { flex: 1, minWidth: 0, gap: 6 },
  heroRank: { fontFamily: flFont.display, fontSize: 26, fontWeight: '600', letterSpacing: -0.3, color: flColor.cream100 },
  heroStatement: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 14, lineHeight: 20, color: flColor.bronze300 },
  facts: { flexDirection: 'row', gap: 10, marginTop: 20 },
  fact: { flex: 1, gap: 4, paddingVertical: 12, paddingHorizontal: 14, borderRadius: flRadius.lg, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: HAIRLINE },
  factLabel: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600 },
  factValue: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  pinned: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: flRadius.lg, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  pinnedText: { flex: 1, minWidth: 0, gap: 1 },
  pinnedLabel: { fontFamily: flFont.sans, fontSize: 9, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  pinnedValue: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.cream100 },

  section: { paddingHorizontal: 22, paddingTop: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2, paddingBottom: 8 },
  sectionLabel: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.bronze400 },
  sectionCaption: { fontFamily: flFont.sans, fontSize: 10.5, color: flColor.gray600 },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  editText: { fontFamily: flFont.sans, fontSize: 11.5, fontWeight: '600', color: flColor.bronze400 },

  // journey
  journey: { position: 'relative', paddingTop: 14, paddingBottom: 4 },
  spine: { position: 'absolute', left: 34, width: 2, backgroundColor: flColor.charcoal700, borderRadius: 1 },
  spineFill: { width: 2, backgroundColor: flColor.bronzeBorder, borderRadius: 1 },
  rung: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderRadius: flRadius.xl, paddingRight: 8 },
  rungCurrent: { borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint, paddingLeft: 0 },
  rungLocked: { opacity: 0.7 },
  rungNode: { width: 70, alignItems: 'center', justifyContent: 'center' },
  lockHex: { width: 50, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.md, borderWidth: 1, borderColor: 'rgba(120,96,60,0.14)', backgroundColor: '#0f0d0a' },
  rungLabel: { flex: 1, minWidth: 0, gap: 4, paddingVertical: 2 },
  rungNameRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  rungNameEarned: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.gray400 },
  rungNameCurrent: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  rungNameLocked: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', letterSpacing: 3, color: flColor.gray600 },
  rungStmt: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600, lineHeight: 16 },
  rungStmtCurrent: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 13, color: flColor.bronze300, lineHeight: 18 },
  hereChip: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: flRadius.pill, backgroundColor: flColor.bronze400 },
  hereChipText: { fontFamily: flFont.sans, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#1A1206' },
  closer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingTop: 16, paddingBottom: 2 },
  closerIcon: { width: 70, alignItems: 'center' },
  closerText: { flex: 1, fontFamily: flFont.display, fontStyle: 'italic', fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },

  // strength
  strengthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  strengthTile: { width: '48%', flexGrow: 1, gap: 7, padding: 14, borderRadius: flRadius.lg, backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: HAIRLINE },
  tileCat: { fontFamily: flFont.sans, fontSize: 8.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  tileName: { fontFamily: flFont.sans, fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  tileValueRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  tileValue: { fontFamily: flFont.display, fontSize: 22, fontWeight: '700', letterSpacing: -0.4, color: flColor.cream100 },
  tileFlat: { fontSize: 14, color: flColor.gray600 },
  spark: { marginTop: 2 },
  strengthEmpty: { alignItems: 'center', justifyContent: 'center', padding: 22, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  strengthEmptyText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.bronze400 },

  // consistency
  bigStatRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingHorizontal: 2, paddingTop: 4, paddingBottom: 16 },
  bigStat: { fontFamily: flFont.display, fontSize: 52, fontWeight: '700', letterSpacing: -1, color: flColor.cream100 },
  bigStatSub: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '600', color: flColor.gray600, paddingBottom: 8 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, overflow: 'hidden' },
  statCell: { width: '50%', gap: 3, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: flColor.surfaceRecessed, borderWidth: 0.5, borderColor: flColor.charcoal700 },
  statValue: { fontFamily: flFont.display, fontSize: 20, fontWeight: '700', letterSpacing: -0.3, color: flColor.cream100 },
  statLabel: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingTop: 12 },
  streakText: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600 },
  streakVal: { color: flColor.gray400, fontWeight: '600' },

  // body cta

  // what's next
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12, padding: 18, borderRadius: flRadius.xl, backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.bronzeBorder, overflow: 'hidden', boxShadow: `${flShadow.borderInset}, 0 12px 30px rgba(0,0,0,0.42)` },
  nextIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, boxShadow: flShadow.glowSubtle },
  nextText: { flex: 1, minWidth: 0, gap: 3 },
  nextKicker: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600 },
  nextTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  nextSub: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray400 },
});
