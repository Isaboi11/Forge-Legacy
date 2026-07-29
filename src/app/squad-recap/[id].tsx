import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { GOAL_UNITS, type SquadGoalMetric } from '@/data/squad-live';
import { fetchSquadPost, type WeeklyRecap } from '@/data/squad-feed-live';
import { useQuery } from '@/lib/useQuery';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';

/**
 * Weekly Summary — the breakdown behind the feed card (SQ-D8).
 *
 * NO `.dc` EXISTS. The design draws the Weekly Summary as a single untappable line inside the Squad
 * Detail feed; SQ-D8 locks five things it should report (workouts · PRs named by member · participation
 * · goal progress · honors), which one line cannot hold. This screen is the sanctioned expansion, built
 * from the app's own language rather than invented: the slate ground and serif AppBar of every pushed
 * screen, the bronze uppercase section labels from Discover / Preview / Join Requests, their divided
 * list card, and Squad Preview's three-column stat strip — reused here because it already means
 * "aggregate facts about this squad".
 *
 * SQ-D8 §4 governs what it must NOT do: content is squad-aggregate, and "no member is ranked within the
 * summary". PRs and honors are named — consistent with the Feed's individual-attribution model — but
 * they are listed alphabetically, never ordered by size, never scored, and there is no top performer.
 * That constraint is the reason this screen has no leaderboard, and it should stay that way.
 *
 * The numbers are read from the snapshot taken when the recap was generated, not recomputed. A week's
 * summary is a record of what that week was, and must not shift because someone later deleted a workout.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "21 – 27 Jul" — the week the summary covers, in the app's terse register. */
function weekRange(startISO: string, endISO: string): string {
  const a = new Date(startISO);
  const b = new Date(new Date(endISO).getTime() - 24 * 60 * 60 * 1000); // end is exclusive
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '';
  const sameMonth = a.getMonth() === b.getMonth();
  return sameMonth
    ? `${a.getDate()} – ${b.getDate()} ${MONTHS[b.getMonth()]}`
    : `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`;
}

const pct = (active: number, total: number): number => (total > 0 ? Math.round((active / total) * 100) : 0);

export default function SquadRecapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = String(id ?? '');
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery(() => fetchSquadPost(postId), [postId]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/squads'));
  const recap: WeeklyRecap | null = data?.post.recap ?? null;

  if (loading && !data) {
    return (
      <Shell onBack={goBack}>
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </Shell>
    );
  }

  if (error || !recap) {
    return (
      <Shell onBack={goBack}>
        <View style={styles.center}>
          <Text style={styles.missingTitle}>{error ? 'Couldn’t load this summary.' : 'This summary isn’t available.'}</Text>
          {error ? <Text style={styles.missingBody}>{error}</Text> : null}
          <Pressable onPress={error ? refetch : goBack} accessibilityRole="button" accessibilityLabel={error ? 'Try again' : 'Back'} style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>{error ? 'Try Again' : 'Back'}</Text>
          </Pressable>
        </View>
      </Shell>
    );
  }

  const { active, total } = recap.participation;
  const goalUnit = recap.goal ? GOAL_UNITS[recap.goal.kind as SquadGoalMetric] ?? '' : '';

  return (
    <Shell onBack={goBack}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={styles.hero}>
          <View style={styles.heroDisc}>
            <BannerGlyph size={26} />
          </View>
          <Text style={styles.heroTitle}>Weekly Summary</Text>
          <Text style={styles.heroRange}>{weekRange(recap.weekStart, recap.weekEnd)}</Text>
          <Text style={styles.heroSquad}>{data?.post.authorName ? '' : data?.squadName ?? ''}</Text>
        </View>

        {/* ── The three aggregate facts ── */}
        <View style={styles.statStrip}>
          <Stat value={String(recap.workouts)} label="Sessions" />
          <Stat value={`${active}/${total}`} label="Showed Up" divided />
          <Stat value={`${pct(active, total)}%`} label="Participation" divided />
        </View>

        {/* ── Goal progress for the week ── */}
        {recap.goal ? (
          <>
            <Text style={styles.sectionLabel}>Goal Progress</Text>
            <View style={styles.card}>
              {recap.goal.title ? <Text style={styles.goalTitle}>{recap.goal.title}</Text> : null}
              <Text style={styles.goalDelta}>
                +{recap.goal.delta} {goalUnit}
                <Text style={styles.goalDeltaSub}> this week</Text>
              </Text>
              <Text style={styles.goalTarget}>
                Target {recap.goal.target} {goalUnit}
              </Text>
            </View>
          </>
        ) : null}

        {/* ── PRs, named but never ranked (SQ-D8 §4) ── */}
        {recap.prs.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Personal Records</Text>
            <View style={styles.listCard}>
              {recap.prs.map((pr, i) => (
                <View key={`${pr.name}-${pr.exercise}-${i}`} style={[styles.row, i > 0 ? styles.rowDivided : null]}>
                  <View style={styles.rowIcon}>
                    <TrophyGlyph />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {pr.name}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {pr.exercise}
                    </Text>
                  </View>
                  <Text style={styles.rowValue}>{pr.value}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* ── Honors earned ── */}
        {recap.honors.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Honors Earned</Text>
            <View style={styles.listCard}>
              {recap.honors.map((h, i) => (
                <View key={`${h.name}-${h.honor}-${i}`} style={[styles.row, i > 0 ? styles.rowDivided : null]}>
                  <View style={styles.rowIcon}>
                    <MedalGlyph />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {h.honor}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {h.name}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.footer}>Squad totals. No one is ranked here.</Text>
      </ScrollView>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Weekly Summary" serif onBack={onBack} />
      {children}
    </View>
  );
}

function Stat({ value, label, divided = false }: { value: string; label: string; divided?: boolean }) {
  return (
    <View style={[styles.statCol, divided ? styles.statColDivided : null]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BannerGlyph({ size = 17, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 3h12v16l-6-4-6 4z" />
      <Path d="M9 8h6" />
    </Svg>
  );
}
function TrophyGlyph({ size = 16, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <Path d="M8 4H5.5a2 2 0 0 0 0 4H8" />
      <Path d="M16 4h2.5a2 2 0 0 1 0 4H16" />
      <Path d="M12 13v3M9 20h6M10 20l.6-4M14 20l-.6-4" />
    </Svg>
  );
}
function MedalGlyph({ size = 16, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8.5 3 L12 9" />
      <Path d="M15.5 3 L12 9" />
      <Circle cx={12} cy={15} r={5.4} />
      <Circle cx={12} cy={15} r={2.1} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },

  hero: { alignItems: 'center', paddingTop: 6, paddingBottom: 4 },
  heroDisc: {
    width: 62,
    height: 62,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: 'rgba(191,143,79,0.07)',
    boxShadow: flShadow.glowSubtle,
  },
  heroTitle: { marginTop: 15, fontFamily: flFont.display, fontSize: 24, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  heroRange: { marginTop: 5, fontSize: 12.5, letterSpacing: 0.4, color: flColor.bronze400 },
  heroSquad: { fontSize: 12, color: flColor.gray600 },

  statStrip: {
    flexDirection: 'row',
    marginTop: 20,
    overflow: 'hidden',
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    borderRadius: flRadius.lg,
    boxShadow: flShadow.card,
  },
  statCol: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 15, paddingHorizontal: 6 },
  statColDivided: { borderLeftWidth: 1, borderLeftColor: flColor.charcoal700 },
  statValue: { fontFamily: flFont.display, fontSize: 21, fontWeight: '700', lineHeight: 22, color: flColor.cream100 },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.bronze400 },

  sectionLabel: { marginTop: 22, marginBottom: 12, marginHorizontal: 4, fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  card: { backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, boxShadow: flShadow.card, paddingHorizontal: 15, paddingVertical: 16 },
  listCard: { overflow: 'hidden', backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, boxShadow: flShadow.card },

  goalTitle: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', lineHeight: 21, color: flColor.cream100 },
  goalDelta: { marginTop: 9, fontFamily: flFont.display, fontSize: 26, fontWeight: '700', color: flColor.bronze300 },
  goalDeltaSub: { fontFamily: undefined, fontSize: 13, fontWeight: '500', color: flColor.gray400 },
  goalTarget: { marginTop: 4, fontSize: 11.5, color: flColor.gray600 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, paddingVertical: 13 },
  rowDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowName: { fontSize: 14.5, color: flColor.cream100 },
  rowSub: { fontSize: 12, color: flColor.gray600 },
  rowValue: { flexShrink: 0, fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.bronze300 },

  footer: { marginTop: 26, textAlign: 'center', fontSize: 11, letterSpacing: 0.6, color: flColor.charcoal500 },

  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
