import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { CHALLENGE_TYPES, fetchCurrentChampions, formatScore, metricLabel, type ChallengeType, type ChampionTitle, type CurrentChampions, type FinalStanding } from '@/data/challenges-live';
import { useQuery } from '@/lib/useQuery';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';

/**
 * Current Champions (C-7, CS-D20) — who holds each title right now.
 * Built to `Forge Current Champions.dc.html` under `Current-Champions-Wireframe-Spec-C7`.
 *
 * BUILT TO THE DESIGN, INCLUDING SCORES AND THE STANDINGS SHEET — a PD-7 ruling.
 * `Current-Champions-Wireframe-Spec-C7` sections 7/9/12 said "recognition only — no scores, no ranks, no
 * leaderboard rendered here". The design does the opposite: every tile prints the champion's value and
 * unit, and tapping one opens a sheet with the whole field. The spec version was built first and the
 * conflict raised; the product owner ruled for the design, which is what PD-7 exists to settle — the
 * design governs and the docs are corrected.
 * `Challenge-Architecture-Amendment-006-Current-Champions-Standings.md` amends C-7 accordingly, so the
 * spec no longer contradicts the build.
 *
 * Why it holds up on the data side: none of these numbers are new disclosures. The same viewer can
 * already read every one of them on C-3 (live) and C-4 (frozen), behind the same `can_read_challenge`
 * roster gate. This changes WHERE a squad member sees standings they could already reach, not WHO may
 * see them.
 *
 * The anti-shame floor is untouched, because it was never the line being amended: places are places, no
 * row is labelled last, there is no deficit framing and no dethroned-former-champion copy. What moved is
 * a placement rule about which surface may show standings — not CC-D3.
 *
 * WHAT IS FAITHFUL: the tracked-caps AppBar over the squad identity line, the featured title card with
 * its 4.5s breathing bronze glow, the two-column grid of remaining titles, the per-category icon set, the
 * 440ms rise on the body, and the freshness line — which is real here, derived from the most recent
 * crowning, rather than the design's hardcoded "Updated 3m ago" that never moves.
 *
 * SIX HARDCODED TITLES BECOME AS MANY AS THE SQUAD HAS EARNED. The design's `DATA` is a literal of six,
 * one of which — "Longest Streak" — is not a challenge type that exists: nothing in this app tracks
 * streaks, which is the same reason it was left out of Squad Records and forbidden on C-4 by §6.3. Titles
 * are now whichever types this squad has actually finished a challenge in, and a category with no
 * completed challenge has no tile at all (§12: "Empty category tiles absent") rather than a vacant one
 * inviting you to notice the gap.
 *
 * DEPARTED CHAMPIONS ARE RETAINED until superseded (§12) — you held it when you won it, and only the next
 * winner of that type takes it. Co-champions share a title (CS-D15).
 *
 * ENTRY IS FROM C-1. `Squad-Architecture-Amendment-002` SA2-D1 bars champion recognition from always-on
 * squad surfaces entirely — a champion title is challenge-derived comparison data even without scores —
 * so Squad Detail gets no inline holder names. SA2-D2 permits only a person-agnostic affordance, which is
 * what the existing "Hall of Champions" row already is.
 */

const TYPE_PATH: Record<ChallengeType, string> = {
  MOST_WORKOUTS: 'M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11',
  MOST_VOLUME: 'M4 20V10M9 20V4M14 20v-8M19 20v-5',
  MAX_LIFT: 'M12 19V5M6 11l6-6 6 6',
  MOST_DURATION: 'M12 7v5l3.5 2',
  MOST_PRS: 'M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8z',
  DISTANCE_TOTAL: 'M4 18s2-9 8-9 8 9 8 9',
  MOST_DAYS: 'M4 6.5h16v14H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4',
  MOST_REPS: 'M5 12h14M5 7h14M5 17h9',
  EARLY_BIRD: 'M12 4v3M12 17v3M4 12h3M17 12h3',
  MOST_VARIETY: 'M5 6h6v6H5zM13 6h6v6h-6zM5 14h6v6H5zM13 14h6v6h-6z',
  GAIN_MAX_LIFT: 'M4 18l5-6 4 3 7-8',
  GAIN_VOLUME: 'M4 18l5-6 4 3 7-8',
  GAIN_REPS: 'M4 18l5-6 4 3 7-8',
  GAIN_DISTANCE: 'M4 18l5-6 4 3 7-8',
};

export default function CurrentChampionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const squadId = String(id ?? '');
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery(() => fetchCurrentChampions(squadId), [squadId]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/squads'));
  // The design's own interaction: a tile opens that title's standings sheet, matched by type.
  const [openType, setOpenType] = useState<ChallengeType | null>(null);
  const openTitle = (t: ChampionTitle) => setOpenType(t.type);
  const openSheet = data?.titles.find((t) => t.type === openType) ?? null;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.32)' }} />

      <View style={styles.header}>
        <LinearGradient colors={['#0a0b0c', 'rgba(10,11,12,0.86)'] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        <AppBar title={<Text style={styles.barTitle}>Current Champions</Text>} onBack={goBack} />
        {data ? (
          <View style={styles.identity}>
            <Text style={styles.squadName} numberOfLines={1}>
              {data.squadName ?? 'This squad'}
            </Text>
            <Text style={styles.seasonLine}>{seasonLine(data)}</Text>
          </View>
        ) : null}
      </View>

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Text style={styles.missingTitle}>{error ? 'Couldn’t load champions.' : 'This squad isn’t available.'}</Text>
          {error ? <Text style={styles.missingBody}>{error}</Text> : null}
          <Pressable onPress={error ? refetch : goBack} accessibilityRole="button" accessibilityLabel={error ? 'Try again' : 'Back'} style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>{error ? 'Try Again' : 'Back'}</Text>
          </Pressable>
        </View>
      ) : (
        <Body champions={data} onOpen={openTitle} />
      )}

      <BottomSheet open={openSheet != null} onClose={() => setOpenType(null)} title={openSheet ? metricLabel(openSheet.type, openSheet.metricKey) : ''}>
        {openSheet ? (
          <View style={styles.sheet}>
            <Text style={styles.sheetMeta} numberOfLines={2}>
              {openSheet.challengeName} - {new Date(openSheet.wonAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            <View style={styles.sheetList}>
              {openSheet.standings.map((r) => (
                <StandingRow key={r.userId} row={r} type={openSheet.type} unit={CHALLENGE_TYPES[openSheet.type].unit} />
              ))}
            </View>
            <Pressable
              onPress={() => {
                const target = openSheet.challengeId;
                setOpenType(null);
                router.push({ pathname: '/challenge-results/[id]', params: { id: target } });
              }}
              accessibilityRole="button"
              accessibilityLabel="See the full result"
              style={({ pressed }) => [styles.sheetBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.sheetBtnLabel}>See Full Result</Text>
            </Pressable>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

/** The design's row treatment: rank 1 takes the crown and a bronze wash; your row overrides it. */
function StandingRow({ row: r, type, unit }: { row: FinalStanding; type: ChallengeType; unit: string }) {
  return (
    <View style={[styles.sheetRow, r.isWinner ? styles.sheetRowLeader : null, r.isSelf ? styles.sheetRowSelf : null]}>
      <View style={styles.sheetRank}>
        {r.isWinner ? <CrownGlyph size={15} /> : <Text style={styles.sheetRankNum}>{r.tied ? `T${r.place}` : r.place}</Text>}
      </View>
      <Avatar src={r.avatarUrl ?? undefined} name={r.name} size={28} />
      <Text style={[styles.sheetName, r.isWinner || r.isSelf ? styles.sheetNameStrong : null]} numberOfLines={1}>
        {r.name}
        {r.isSelf ? ' (You)' : ''}
      </Text>
      <Text style={[styles.sheetScore, r.isWinner ? styles.sheetScoreLeader : null]}>{formatScore(type, r.score)}</Text>
      <Text style={styles.sheetUnit} numberOfLines={1}>
        {unit}
      </Text>
    </View>
  );
}

/** Real, unlike the design's frozen "6 active titles · March season". */
function seasonLine(d: CurrentChampions): string {
  const n = d.titles.length;
  if (n === 0) return 'No titles held yet';
  const latest = d.titles[0]?.wonAt;
  const when = latest ? new Date(latest).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
  return `${n} ${n === 1 ? 'title' : 'titles'} held${when ? ` · newest ${when}` : ''}`;
}

function Body({ champions: d, onOpen }: { champions: CurrentChampions; onOpen: (t: ChampionTitle) => void }) {
  const [rise] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(rise, { toValue: 1, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [rise]);

  if (d.titles.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyCrest}>
          <CrownGlyph size={30} />
        </View>
        <Text style={styles.emptyTitle}>No titles held yet</Text>
        {/* §9: invitational, never a note about what the squad hasn't done. */}
        <Text style={styles.emptyBody}>Finish a competition and its winner takes the title.</Text>
      </View>
    );
  }

  // Newest crowning is the featured card; the rest fill the grid. The design picks its featured entry
  // from a `featured: true` literal.
  const [featured, ...rest] = d.titles;

  return (
    <Animated.View style={[styles.bodyWrap, { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FeaturedTitle title={featured} onPress={() => onOpen(featured)} />

        {rest.length > 0 ? (
          <View style={styles.grid}>
            {rest.map((t) => (
              <TitleTile key={t.type} title={t} onPress={() => onOpen(t)} />
            ))}
          </View>
        ) : null}

        <Text style={styles.closing}>A title is held by the winner of the most recent competition in that category. Tap one for its standings.</Text>
      </ScrollView>
    </Animated.View>
  );
}

function FeaturedTitle({ title: t, onPress }: { title: ChampionTitle; onPress: () => void }) {
  const [glow] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2250, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 2250, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [glow]);

  const many = t.champions.length > 1;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${metricLabel(t.type, t.metricKey)}, held by ${t.champions.map((c) => c.name).join(' and ')}. Double-tap for standings.`}
      style={({ pressed }) => [styles.featured, pressed ? styles.pressed : null]}
    >
      <LinearGradient colors={['rgba(191,143,79,0.16)', 'rgba(191,143,79,0.03)'] as const} locations={[0, 0.62] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* The design's ccGlow breathes a box-shadow; RN can't drive that natively, so an overlay does. */}
      <Animated.View pointerEvents="none" style={[styles.featuredGlow, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] }) }]} />

      <View style={styles.featuredHead}>
        <View style={styles.featuredIcon}>
          <TypeGlyph type={t.type} size={19} />
        </View>
        <Text style={styles.featuredCategory} numberOfLines={1}>
          {metricLabel(t.type, t.metricKey)}
        </Text>
        <View style={styles.newestPill}>
          <Text style={styles.newestPillText}>Newest</Text>
        </View>
      </View>

      <View style={styles.featuredChamp}>
        <View style={styles.champCrown}>
          <CrownGlyph size={22} />
        </View>
        <View style={styles.champRing}>
          <Avatar src={t.champions[0]?.avatarUrl ?? undefined} name={t.champions[0]?.name ?? 'Athlete'} size={64} />
        </View>
      </View>

      <Text style={styles.featuredName} numberOfLines={2}>
        {t.champions.map((c) => c.name).join(' & ')}
      </Text>
      <Text style={styles.featuredRole}>{many ? `Co-Champions · ${t.champions.length}` : 'Champion'}</Text>

      <View style={styles.featuredScoreRow}>
        <Text style={styles.featuredScore}>{formatScore(t.type, t.score)}</Text>
        <Text style={styles.featuredUnit}>{CHALLENGE_TYPES[t.type].unit}</Text>
      </View>

      <Text style={styles.featuredWon} numberOfLines={2}>
        {t.challengeName} · {new Date(t.wonAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </Text>
    </Pressable>
  );
}

function TitleTile({ title: t, onPress }: { title: ChampionTitle; onPress: () => void }) {
  const many = t.champions.length > 1;
  const mine = t.champions.some((c) => c.isSelf);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${metricLabel(t.type, t.metricKey)}, held by ${t.champions.map((c) => c.name).join(' and ')}. Double-tap for standings.`}
      style={({ pressed }) => [styles.tile, mine ? styles.tileMine : null, pressed ? styles.pressed : null]}
    >
      <View style={styles.tileHead}>
        <TypeGlyph type={t.type} size={15} />
        <Text style={styles.tileCategory} numberOfLines={2}>
          {metricLabel(t.type, t.metricKey)}
        </Text>
      </View>

      <View style={styles.tileChamp}>
        <Avatar src={t.champions[0]?.avatarUrl ?? undefined} name={t.champions[0]?.name ?? 'Athlete'} size={34} />
        <View style={styles.tileNames}>
          <Text style={styles.tileName} numberOfLines={1}>
            {t.champions.map((c) => c.name).join(' & ')}
          </Text>
          <Text style={styles.tileRole}>{many ? 'Co-Champions' : mine ? 'You hold this' : 'Champion'}</Text>
        </View>
      </View>

      <View style={styles.tileFoot}>
        <View style={styles.tileScoreRow}>
          <Text style={styles.tileScore}>{formatScore(t.type, t.score)}</Text>
          <Text style={styles.tileUnit} numberOfLines={1}>
            {CHALLENGE_TYPES[t.type].unit}
          </Text>
        </View>
        <Text style={styles.tileWon} numberOfLines={1}>
          {t.field} in - {new Date(t.wonAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </Pressable>
  );
}

// ── glyphs ──
function CrownGlyph({ size = 22, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}

function TypeGlyph({ type, size = 15 }: { type: ChallengeType; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {type === 'MOST_DURATION' || type === 'EARLY_BIRD' ? <Circle cx={12} cy={12} r={8.5} /> : null}
      <Path d={TYPE_PATH[type]} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.93 },
  header: { flexShrink: 0, position: 'relative', borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  barTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.cream100 },
  identity: { paddingHorizontal: 22, paddingTop: 2, paddingBottom: 18 },
  squadName: { fontFamily: flFont.display, fontSize: 21, fontWeight: '600', letterSpacing: -0.3, color: flColor.cream100 },
  seasonLine: { marginTop: 3, fontSize: 11.5, color: flColor.gray600 },

  bodyWrap: { flex: 1, minHeight: 0 },
  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 26 },

  featured: {
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronze400,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  featuredGlow: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.bronze300 },
  featuredHead: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  featuredIcon: { width: 34, height: 34, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  featuredCategory: { flex: 1, minWidth: 0, fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze300 },
  newestPill: { flexShrink: 0, paddingHorizontal: 8, paddingVertical: 3, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  newestPillText: { fontSize: 8, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze300 },
  featuredChamp: { position: 'relative', marginTop: 20, alignItems: 'center' },
  champCrown: { position: 'absolute', top: -14, zIndex: 2 },
  champRing: { borderRadius: flRadius.round, borderWidth: 2, borderColor: flColor.bronze400, padding: 2, boxShadow: '0 0 18px rgba(191,143,79,0.32)' },
  featuredName: { marginTop: 12, fontFamily: flFont.display, fontSize: 22, fontWeight: '600', letterSpacing: -0.3, lineHeight: 26, textAlign: 'center', color: flColor.cream100 },
  featuredRole: { marginTop: 5, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.bronze300 },
  featuredWon: { marginTop: 10, fontSize: 11.5, lineHeight: 17, textAlign: 'center', color: flColor.gray600 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 150,
    gap: 12,
    padding: 13,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  tileMine: { borderColor: flColor.bronzeBorder },
  tileHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tileCategory: { flex: 1, minWidth: 0, fontSize: 9, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', lineHeight: 13, color: flColor.bronze400 },
  tileChamp: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  tileNames: { flex: 1, minWidth: 0 },
  tileName: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  tileRole: { marginTop: 2, fontSize: 9, fontWeight: '600', letterSpacing: 0.7, textTransform: 'uppercase', color: flColor.gray600 },
  tileWon: { fontSize: 10.5, color: flColor.gray600 },

  closing: { marginTop: 18, fontSize: 11, lineHeight: 17, color: flColor.gray600 },
  featuredScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 },
  featuredScore: { fontFamily: flFont.display, fontSize: 26, fontWeight: '700', letterSpacing: -0.5, color: flColor.bronze300 },
  featuredUnit: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
  tileFoot: { gap: 3 },
  tileScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  tileScore: { fontFamily: flFont.display, fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: flColor.bronze300 },
  tileUnit: { flexShrink: 1, fontSize: 8.5, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },

  sheet: { gap: 12, paddingBottom: 6 },
  sheetMeta: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },
  sheetList: { gap: 6 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, paddingVertical: 9, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.surfaceRecessed },
  sheetRowLeader: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800 },
  sheetRowSelf: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  sheetRank: { width: 20, flexShrink: 0, alignItems: 'center' },
  sheetRankNum: { fontFamily: flFont.display, fontSize: 14, fontWeight: '700', color: flColor.gray600 },
  sheetName: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '500', color: flColor.cream100 },
  sheetNameStrong: { fontWeight: '700' },
  sheetScore: { flexShrink: 0, fontFamily: flFont.display, fontSize: 15, fontWeight: '700', color: flColor.cream100 },
  sheetScoreLeader: { color: flColor.bronze300 },
  sheetUnit: { flexShrink: 0, maxWidth: 52, fontSize: 8, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  sheetBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  sheetBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 4 },
  emptyCrest: { width: 76, height: 76, marginBottom: 14, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  emptyTitle: { fontFamily: flFont.display, fontSize: 21, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { marginTop: 4, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray600 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },
  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
