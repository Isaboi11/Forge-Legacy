import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { CHALLENGE_TYPES, fetchSquadHall, formatScore, metricLabel, type ChallengeType, type HallEntry, type SquadHall } from '@/data/challenges-live';
import { useQuery } from '@/lib/useQuery';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Hall of Champions (C-5) — every competition this squad has ever finished, newest first.
 * Built to `Forge Hall of Champions.dc.html` under `Hall-of-Champions-Wireframe-Spec-C5`.
 *
 * A terminal read (spec §11: "feeds nothing new") over the frozen `challenge_results`. Read-only for
 * everyone including the owner — §10 forbids editing, deleting or re-opening a historical result, so
 * there is deliberately no action on this screen beyond opening a season's full standings.
 *
 * RUNNERS-UP ARE NAMED — a PD-7 ruling. C-5 sections 6 and 12 said "Only winners are named. No
 * 'runner-up,' no per-challenge loser", and the design's card ends with a podium strip naming 2nd and
 * 3rd. This shipped the spec's version first (a "5 athletes competed" line) and raised the conflict; the
 * product owner ruled for the design.
 * `Challenge-Architecture-Amendment-007-Runners-Up-And-Streak.md` amends the spec, so it no longer
 * contradicts the build.
 *
 * The strip stays bounded at the top three: it names who was close, not the whole field, so no row is
 * ever the last one. CC-D3 is untouched — places are places, no deficit, no "never won" copy.
 *
 * WHAT IS FAITHFUL: the tracked-caps header over the squad identity block with its bronze-metallic
 * crest, the sticky year headers, the entry cards with type eyebrow + serif name, the 46px champion disc
 * with the crown floating above it, the co-champion handling, the right-aligned serif score with its
 * unit, the closing note, and the 420ms rise on the body.
 *
 * STREAK TAGS ARE COMPUTED, not typed — consecutive titles walked from the real history, and only ever
 * shown on a champion who has one (CC-D4 badges are positive-only).
 *
 * EMPTY IS INVITATIONAL (§9). No "your squad has never competed", and no create CTA — creation lives on
 * C-1. Squad Detail simply doesn't offer this row until there is history to show.
 */

export default function HallOfChampionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const squadId = String(id ?? '');
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery(() => fetchSquadHall(squadId), [squadId]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/squads'));

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.32)' }} />

      <View style={styles.header}>
        <LinearGradient colors={['#0a0b0c', 'rgba(10,11,12,0.86)'] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        <AppBar title={<Text style={styles.barTitle}>Hall of Champions</Text>} onBack={goBack} />
        {data ? (
          <View style={styles.identity}>
            <View style={styles.crest}>
              <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} />
              <CrownGlyph size={24} color="#1A1206" />
            </View>
            <View style={styles.identityText}>
              <Text style={styles.squadName} numberOfLines={1}>
                {data.squadName ?? 'This squad'}
              </Text>
              <Text style={styles.subLine}>{subLineFor(data)}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Text style={styles.missingTitle}>{error ? 'Couldn’t load the hall.' : 'This squad isn’t available.'}</Text>
          {error ? <Text style={styles.missingBody}>{error}</Text> : null}
          <Pressable onPress={error ? refetch : goBack} accessibilityRole="button" accessibilityLabel={error ? 'Try again' : 'Back'} style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>{error ? 'Try Again' : 'Back'}</Text>
          </Pressable>
        </View>
      ) : (
        <Body hall={data} onOpen={(entryId) => router.push({ pathname: '/challenge-results/[id]', params: { id: entryId } })} />
      )}
    </View>
  );
}

function subLineFor(hall: SquadHall): string {
  const titles = hall.entries.length;
  const year = hall.foundedAt ? new Date(hall.foundedAt).getFullYear() : null;
  const t = `${titles} ${titles === 1 ? 'title' : 'titles'} won`;
  return year ? `${t} · since ${year}` : t;
}

function Body({ hall, onOpen }: { hall: SquadHall; onOpen: (id: string) => void }) {
  const [rise] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(rise, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [rise]);

  if (hall.entries.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyCrest}>
          <CrownGlyph size={30} />
        </View>
        <Text style={styles.emptyTitle}>No titles yet</Text>
        {/* §9: invitational, never "your squad has never competed". No CTA — creation lives on C-1. */}
        <Text style={styles.emptyBody}>When a competition finishes, its champion is recorded here for good.</Text>
      </View>
    );
  }

  // Year groups, newest first — the entries already arrive in that order.
  const groups: { year: number; rows: HallEntry[] }[] = [];
  for (const e of hall.entries) {
    const year = new Date(e.endAt).getFullYear();
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.rows.push(e);
    else groups.push({ year, rows: [e] });
  }

  return (
    <Animated.View style={[styles.bodyWrap, { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} stickyHeaderIndices={groups.map((_, i) => i * 2)}>
        {groups.flatMap((g) => [
          <View key={`y${g.year}`} style={styles.yearHead}>
            <Text style={styles.yearLabel}>{g.year}</Text>
            <Text style={styles.yearCount}>
              {g.rows.length} {g.rows.length === 1 ? 'title' : 'titles'}
            </Text>
          </View>,
          <View key={`r${g.year}`} style={styles.yearRows}>
            {g.rows.map((e) => (
              <EntryCard key={e.id} entry={e} onPress={() => onOpen(e.id)} />
            ))}
          </View>,
        ])}

        <Text style={styles.closing}>Every finished squad competition is recorded here for good. Tap any to see the full final standings.</Text>
      </ScrollView>
    </Animated.View>
  );
}

function EntryCard({ entry: e, onPress }: { entry: HallEntry; onPress: () => void }) {
  const meta = CHALLENGE_TYPES[e.type];
  const many = e.champions.length > 1;
  const mine = e.champions.some((c) => c.isSelf);
  const date = new Date(e.endAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${e.name}, won by ${e.champions.map((c) => c.name).join(' and ')}, ${formatScore(e.type, e.score)} ${meta.unit}`}
      style={({ pressed }) => [styles.card, mine ? styles.cardMine : null, pressed ? styles.cardPressed : null]}
    >
      {mine ? (
        <LinearGradient colors={['rgba(191,143,79,0.10)', 'rgba(191,143,79,0.02)'] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}

      <View style={styles.cardHead}>
        <TypeGlyph type={e.type} />
        <Text style={styles.cardType} numberOfLines={1}>
          {metricLabel(e.type, e.metricKey)}
        </Text>
        <Text style={styles.cardDate}>{date}</Text>
      </View>

      <Text style={styles.cardName} numberOfLines={2}>
        {e.name}
      </Text>

      <View style={styles.champRow}>
        <View style={styles.champDiscWrap}>
          <View style={styles.champCrown}>
            <CrownGlyph size={20} />
          </View>
          <View style={styles.champRing}>
            <Avatar src={e.champions[0]?.avatarUrl ?? undefined} name={e.champions[0]?.name ?? 'Athlete'} size={44} />
          </View>
        </View>

        <View style={styles.champBody}>
          <View style={styles.champNameRow}>
            <Text style={styles.champName} numberOfLines={1}>
              {e.champions.map((c) => c.name).join(' & ')}
            </Text>
            {mine ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>You</Text>
              </View>
            ) : null}
            {/* Positive-only: a run of titles, never anybody's gap between them. */}
            {e.streak > 1 ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>×{e.streak}</Text>
              </View>
            ) : null}
          </View>
            <Text style={styles.champLabel}>{many ? `Co-Champions · ${e.champions.length}` : 'Champion'}</Text>
          <Text style={styles.fieldLine}>
            {e.field} {e.field === 1 ? 'athlete' : 'athletes'} competed
          </Text>
        </View>

        <View style={styles.scoreCol}>
          <Text style={styles.score}>{formatScore(e.type, e.score)}</Text>
          <Text style={styles.scoreUnit} numberOfLines={1}>
            {meta.unit}
          </Text>
        </View>

        <ChevronGlyph />
      </View>

      {/* The design's podium strip — 2nd and 3rd, named (CA7-D1, PD-7). */}
      {e.runners.length > 0 ? (
        <View style={styles.podium}>
          {e.runners.map((r) => (
            <View key={r.userId} style={styles.podiumEntry}>
              <View style={[styles.podiumPlace, r.place === 2 ? styles.podiumSilver : styles.podiumCopper]}>
                <Text style={[styles.podiumPlaceText, { color: r.place === 2 ? MEDAL_SILVER : MEDAL_COPPER }]}>{r.place}</Text>
              </View>
              <Text style={[styles.podiumName, r.isSelf ? styles.podiumNameSelf : null]} numberOfLines={1}>
                {r.name}
                {r.isSelf ? ' (You)' : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const MEDAL_SILVER = '#B9BCC2';
const MEDAL_COPPER = '#B07C4E';

// ── glyphs ──
function CrownGlyph({ size = 20, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function ChevronGlyph({ size = 16, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

/** The design's per-type icon set, keyed off the metric rather than a typed label string. */
const TYPE_PATH: Record<ChallengeType, string> = {
  MOST_WORKOUTS: 'M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11',
  MOST_VOLUME: 'M4 20V10M9 20V4M14 20v-8M19 20v-5',
  MAX_LIFT: 'M12 19V5M6 11l6-6 6 6',
  MOST_DURATION: 'M12 7v5l3.5 2M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z',
  MOST_PRS: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18',
  DISTANCE_TOTAL: 'M4 18s2-9 8-9 8 9 8 9',
  MOST_DAYS: 'M4 6.5h16v14H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4',
  MOST_REPS: 'M5 12h14M5 7h14M5 17h9',
  EARLY_BIRD: 'M12 4v3M12 17v3M4 12h3M17 12h3M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z',
  MOST_VARIETY: 'M5 6h6v6H5zM13 6h6v6h-6zM5 14h6v6H5zM13 14h6v6h-6z',
  GAIN_MAX_LIFT: 'M4 18l5-6 4 3 7-8',
  GAIN_VOLUME: 'M4 18l5-6 4 3 7-8',
  GAIN_REPS: 'M4 18l5-6 4 3 7-8',
  GAIN_DISTANCE: 'M4 18l5-6 4 3 7-8',
};

function TypeGlyph({ type }: { type: ChallengeType }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d={TYPE_PATH[type]} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexShrink: 0, position: 'relative', borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  barTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.cream100 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 22, paddingTop: 2, paddingBottom: 18 },
  crest: { width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: flRadius.md, boxShadow: '0 0 10px rgba(191,143,79,0.20)' },
  identityText: { flex: 1, minWidth: 0 },
  squadName: { fontFamily: flFont.display, fontSize: 21, fontWeight: '600', letterSpacing: -0.3, color: flColor.cream100 },
  subLine: { marginTop: 3, fontSize: 11.5, color: flColor.gray600 },

  bodyWrap: { flex: 1, minHeight: 0 },
  scroll: { paddingBottom: 26 },
  yearHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, paddingHorizontal: 24, paddingTop: 15, paddingBottom: 9, backgroundColor: '#070808' },
  yearLabel: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  yearCount: { fontSize: 10.5, letterSpacing: 0.3, color: flColor.gray600 },
  yearRows: { gap: 10, paddingHorizontal: 20, paddingTop: 2, paddingBottom: 8 },

  card: { position: 'relative', overflow: 'hidden', borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, boxShadow: flShadow.card },
  cardMine: { borderColor: flColor.bronzeBorder },
  cardPressed: { opacity: 0.92 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 15, paddingTop: 13 },
  cardType: { flex: 1, minWidth: 0, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  cardDate: { flexShrink: 0, fontSize: 10.5, fontWeight: '600', letterSpacing: 0.4, color: flColor.gray600 },
  cardName: { paddingHorizontal: 15, paddingTop: 7, fontFamily: flFont.display, fontSize: 17, fontWeight: '600', letterSpacing: -0.2, lineHeight: 20, color: flColor.cream100 },

  champRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 13 },
  champDiscWrap: { position: 'relative', width: 46, height: 46, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  champCrown: { position: 'absolute', top: -10, zIndex: 2 },
  champRing: { borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.bronze400, boxShadow: '0 0 11px rgba(191,143,79,0.26)' },
  champBody: { flex: 1, minWidth: 0 },
  champNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
  champName: { flexShrink: 1, fontFamily: flFont.display, fontSize: 18, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  champLabel: { marginTop: 5, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze300 },
  fieldLine: { marginTop: 3, fontSize: 10, fontWeight: '500', letterSpacing: 0.2, color: flColor.gray600 },
  tag: { flexShrink: 0, paddingHorizontal: 6, paddingVertical: 2, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  tagText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze300 },
  scoreCol: { flexShrink: 0, alignItems: 'flex-end', maxWidth: 70 },
  score: { fontFamily: flFont.display, fontSize: 21, fontWeight: '700', letterSpacing: -0.4, color: flColor.bronze300 },
  scoreUnit: { marginTop: 3, fontSize: 8.5, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },

  closing: { marginTop: 12, marginHorizontal: 24, fontSize: 11, lineHeight: 17, color: flColor.gray600 },
  podium: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 16, paddingVertical: 9, borderTopWidth: 1, borderTopColor: flColor.charcoal700, backgroundColor: 'rgba(0,0,0,0.16)' },
  podiumEntry: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  podiumPlace: { width: 15, height: 15, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1 },
  podiumSilver: { borderColor: 'rgba(185,188,194,0.6)' },
  podiumCopper: { borderColor: 'rgba(176,124,78,0.6)' },
  podiumPlaceText: { fontSize: 8, fontWeight: '700' },
  podiumName: { flexShrink: 1, fontSize: 11, color: flColor.gray400 },
  podiumNameSelf: { color: flColor.bronze300, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 4 },
  emptyCrest: { width: 76, height: 76, marginBottom: 14, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  emptyTitle: { fontFamily: flFont.display, fontSize: 21, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { marginTop: 4, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray600 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },
  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
