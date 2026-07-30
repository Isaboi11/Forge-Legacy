import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import {
  CHALLENGE_TYPES,
  daysLeft,
  fetchChallengeHub,
  formatScore,
  joinChallenge,
  metricLabel,
  pastPlaceLabel,
  placeLabel,
  shareOfLeader,
  type ActiveChallenge,
  type ChallengeType,
  type OpenChallenge,
  type PastChallenge,
} from '@/data/challenges-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { getSeenPodiums, podiumIsFresh } from '@/lib/podium-seen';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Competitions (C-1) — the Challenge Hub. Built to `Forge Competitions.dc.html`.
 *
 * Faithful: the letterspaced-uppercase AppBar, the metal-rim Create button (the design's one white-inked
 * bronze button, kept as drawn), the horizontal filter rail, the open-to-join rows, the bronze-washed
 * ACTIVE cards with their metallic progress bar and live dot, the achievement-led history rows with
 * place discs, and the 2×2 stat grid built from 1px gaps as hairlines.
 *
 * SQUAD CONTEXT ONLY. The design's rail has four filters — All · Squads · Friends · Communities — and
 * CA3-D10 makes C-1 participant-scoped across contexts. Two of those contexts have no backend: FRIENDS
 * needs a friends graph, COMMUNITY needs communities. Shipping chips that can only ever be empty would
 * be worse than shipping the two that work, so the rail is All · Squads until those pillars exist. The
 * Groups section is squad rows for the same reason; the design's Friends row was already a dead end
 * that toasted rather than navigating.
 *
 * COMPETITION HONORS IS NOT BUILT. The design shows nine, and CS-D24 defines challenge honors — but the
 * Honor Catalog expansion is on hold, so there is no authored catalog to back them. A medal rail with
 * invented honors would put achievements on screen that the Honors Hub couldn't corroborate.
 *
 * Everything here is real: standings are computed live from each participant's training data over the
 * challenge's own window, and the stats are aggregates over actual results — not the design's per-filter
 * literals, which can't be reconciled with the rows above them.
 *
 * CS-D3 anti-shame holds throughout: standings are a place and never a deficit, nobody is marked as
 * losing or last, and a challenge you ignore simply never mentions you.
 */

const FILTERS = ['All', 'Squads'] as const;
type Filter = (typeof FILTERS)[number];

export default function CompetitionsScreen() {
  const router = useRouter();
  // The squad we arrived from. CA3-D10's participant-scoped entry has no squad, and creating needs one
  // — so Create only offers itself when the hub was opened from a squad surface.
  const { id } = useLocalSearchParams<{ id?: string }>();
  const squadId = id ? String(id) : null;
  const { showToast } = useToast();
  const { data, loading, error, refetch } = useQuery(fetchChallengeHub, []);
  const [filter, setFilter] = useState<Filter>('All');
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Dismissed device-locally: CS-D3 forbids recording that someone declined. */
  const [dismissed, setDismissed] = useState<Record<string, true>>({});

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/squads'));

  const hub = data ?? { open: [], active: [], history: [], stats: { entered: 0, wins: 0, podiums: 0, favType: null } };

  /**
   * The podium's entry point. `fetchChallengeHub` advances the lifecycle first, so opening this screen
   * is the moment a finished season actually completes — which makes it the moment to crown it. A
   * season that closed within the week and hasn't been played on this device runs its ceremony once,
   * then lands on the results it belongs to.
   *
   * The seen-set is read on the same pass rather than at module scope, so it can't go stale after the
   * ceremony marks itself played.
   */
  const revealed = useRef(false);
  useEffect(() => {
    if (revealed.current || !data) return;
    const fresh = data.history.filter((p) => podiumIsFresh(p.endAt));
    if (fresh.length === 0) {
      revealed.current = true;
      return;
    }
    let alive = true;
    getSeenPodiums().then((seen) => {
      if (!alive || revealed.current) return;
      const next = fresh.find((p) => !seen.includes(p.id));
      revealed.current = true;
      if (next) router.push({ pathname: '/podium/[id]', params: { id: next.id } });
    }, () => undefined);
    return () => {
      alive = false;
    };
  }, [data, router]);
  const inScope = (context: string) => filter === 'All' || context === 'SQUAD';

  const open = hub.open.filter((c) => inScope(c.context) && !dismissed[c.id]);
  const active = hub.active.filter((c) => inScope(c.context));
  const history = hub.history.filter((c) => inScope(c.context));

  const onJoin = (c: OpenChallenge) => {
    if (busyId) return;
    setBusyId(c.id);
    joinChallenge(c.id).then(
      () => {
        setBusyId(null);
        showToast(`You joined ${c.name}`);
        refetch();
      },
      (e: unknown) => {
        setBusyId(null);
        showToast(errorMessage(e));
      },
    );
  };

  const rate = hub.stats.entered > 0 ? Math.round((hub.stats.wins / hub.stats.entered) * 100) : 0;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} base="#060708" overlay={{ flat: 'rgba(6,7,8,0.30)' }} />
      <AppBar title={<Text style={styles.barTitle}>Competitions</Text>} onBack={goBack} />

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.missingTitle}>Couldn’t load competitions.</Text>
          <Text style={styles.missingBody}>{error}</Text>
          <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Try again" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* ── Create ── the design's one metal-rim, white-inked button. Kept as drawn. */}
          <View style={styles.createWrap}>
            <Pressable
              onPress={() => (squadId ? router.push({ pathname: '/create-challenge', params: { id: squadId } }) : showToast('Open Competitions from a squad to create one.'))}
              accessibilityRole="button"
              accessibilityLabel="Create competition"
              style={({ pressed }) => [styles.createBtn, pressed ? styles.createBtnPressed : null]}
            >
              <LinearGradient colors={flGradient.bronzeFill.colors} locations={flGradient.bronzeFill.locations} start={flGradient.bronzeFill.start} end={flGradient.bronzeFill.end} style={StyleSheet.absoluteFill} />
              <SwordsGlyph size={17} color="#F7F5F1" />
              <Text style={styles.createLabel}>Create Competition</Text>
            </Pressable>
          </View>

          {/* ── Filters ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRail} contentContainerStyle={styles.chipRailContent}>
            {FILTERS.map((f) => {
              const on = filter === f;
              return (
                <Pressable key={f} onPress={() => setFilter(f)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
                  <Text style={[styles.chipLabel, on ? styles.chipLabelOn : null]}>{f}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── Open to join ── */}
          {open.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Open to Join ({open.length})</Text>
              <View style={styles.section}>
                {open.map((c) => (
                  <View key={c.id} style={styles.openRow}>
                    <View style={styles.openIcon}>
                      <TypeGlyph type={c.type} size={15} />
                    </View>
                    <View style={styles.openBody}>
                      <Text style={styles.openName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={styles.openMeta} numberOfLines={1}>
                        {c.squadName} · from {c.creatorName}
                      </Text>
                    </View>
                    <Pressable onPress={() => setDismissed((d) => ({ ...d, [c.id]: true }))} accessibilityRole="button" accessibilityLabel={`Dismiss ${c.name}`} style={styles.declineBtn}>
                      <Text style={styles.declineLabel}>Not now</Text>
                    </Pressable>
                    <Pressable onPress={() => onJoin(c)} disabled={busyId === c.id} accessibilityRole="button" accessibilityLabel={`Join ${c.name}`} style={[styles.joinBtn, busyId === c.id ? styles.btnBusy : null]}>
                      <LinearGradient colors={flGradient.bronzeFill.colors} locations={flGradient.bronzeFill.locations} start={flGradient.bronzeFill.start} end={flGradient.bronzeFill.end} style={StyleSheet.absoluteFill} />
                      <Text style={styles.joinLabel}>Join</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* ── Active ── */}
          <View style={styles.headRow}>
            <Text style={styles.sectionLabelInline}>Active</Text>
            {active.length > 0 ? (
              <View style={styles.liveWrap}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{active.length} live</Text>
              </View>
            ) : null}
          </View>

          {active.length === 0 ? (
            <View style={styles.dashedEmpty}>
              <Text style={styles.dashedText}>No live competitions right now.</Text>
            </View>
          ) : (
            <View style={styles.stack}>
              {active.map((c) => (
                <ActiveCard key={c.id} challenge={c} onOpen={() => router.push({ pathname: '/challenge/[id]', params: { id: c.id } })} />
              ))}
            </View>
          )}

          {/* ── History ── */}
          <View style={styles.headRow}>
            <Text style={styles.sectionLabelInline}>History</Text>
            {/* Only five fit here; the full, filterable record is its own screen. */}
            {history.length > 0 ? (
              <Pressable
                onPress={() => router.push('/competition-history')}
                accessibilityRole="button"
                accessibilityLabel="View all competition history"
                hitSlop={8}
                style={styles.viewAllRow}
              >
                <Text style={styles.viewAllText}>View All{history.length > 5 ? ` (${history.length})` : ''}</Text>
                <ChevronRowGlyph />
              </Pressable>
            ) : null}
          </View>
          {history.length === 0 ? (
            <View style={styles.dashedEmpty}>
              <Text style={styles.dashedText}>No completed competitions yet.</Text>
            </View>
          ) : (
            <View style={styles.historyCard}>
              {history.slice(0, 5).map((p, i) => (
                <HistoryRow key={p.id} past={p} divided={i > 0} onOpen={() => router.push({ pathname: '/challenge-results/[id]', params: { id: p.id } })} />
              ))}
            </View>
          )}

          {/* ── CURRENT CHAMPIONS (C-7) ── entered from here per spec §7. Only with a squad in context:
              the titles are squad-scoped, and the participant-scoped hub (CA3-D10) has no squad. */}
          {squadId ? (
            <Pressable
              onPress={() => router.push({ pathname: '/current-champions', params: { id: squadId } })}
              accessibilityRole="button"
              accessibilityLabel="Current champions"
              style={({ pressed }) => [styles.championsRow, pressed ? styles.championsRowPressed : null]}
            >
              <View style={styles.championsIcon}>
                <CrownRowGlyph />
              </View>
              <View style={styles.championsBody}>
                <Text style={styles.championsTitle}>Current Champions</Text>
                <Text style={styles.championsSub}>Who holds each title right now.</Text>
              </View>
              <ChevronRowGlyph />
            </Pressable>
          ) : null}

          {/* ── Stats ── real aggregates, not per-filter literals. */}
          <Text style={styles.sectionLabel}>Competition Stats</Text>
          <View style={styles.statGrid}>
            <StatCell value={String(hub.stats.entered)} label="Entered" />
            <StatCell value={String(hub.stats.wins)} label="Wins" />
            <StatCell value={String(hub.stats.podiums)} label="Podiums" />
            <StatCell value={`${rate}%`} label="Win Rate" />
          </View>

          {hub.stats.favType ? (
            <View style={styles.favCard}>
              <View style={styles.favIcon}>
                <TypeGlyph type={hub.stats.favType} size={20} />
              </View>
              <View style={styles.favBody}>
                <Text style={styles.favEyebrow}>Most Entered</Text>
                <Text style={styles.favType}>{CHALLENGE_TYPES[hub.stats.favType].label}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ActiveCard({ challenge: c, onOpen }: { challenge: ActiveChallenge; onOpen: () => void }) {
  const meta = CHALLENGE_TYPES[c.type];
  const share = shareOfLeader(c.myScore, c.leaderScore);
  const left = daysLeft(c.endAt);

  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${c.name}`} style={({ pressed }) => [styles.activeCard, pressed ? styles.activeCardPressed : null]}>
      <LinearGradient colors={['rgba(191,143,79,0.07)', 'transparent'] as const} locations={[0, 0.62] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />

      <View style={styles.typeRow}>
        <TypeGlyph type={c.type} size={15} />
        <Text style={styles.typeName}>{metricLabel(c.type, c.metricKey)}</Text>
        <View style={styles.liveWrapRight}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTag}>LIVE</Text>
        </View>
      </View>

      <Text style={styles.activeName} numberOfLines={2}>
        {c.name}
      </Text>

      <View style={styles.oppRow}>
        <Text style={styles.oppText} numberOfLines={1}>
          {c.roster} {c.roster === 1 ? 'athlete' : 'athletes'}
        </Text>
        {c.squadName ? (
          <View style={styles.scopePill}>
            <Text style={styles.scopePillText}>{c.squadName}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(share * 100)}%` }]}>
          <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} />
        </View>
      </View>

      <View style={styles.activeFoot}>
        <Text style={styles.standing}>
          {placeLabel(c.myPlace)} · {formatScore(c.type, c.myScore)} {meta.unit}
        </Text>
        <Text style={styles.days}>{left === 0 ? 'Ends today' : `${left} ${left === 1 ? 'day' : 'days'} left`}</Text>
      </View>
    </Pressable>
  );
}

function HistoryRow({ past: p, divided, onOpen }: { past: PastChallenge; divided: boolean; onOpen: () => void }) {
  const meta = CHALLENGE_TYPES[p.type];
  const label = pastPlaceLabel(p);

  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${p.name}`} style={({ pressed }) => [styles.historyRow, divided ? styles.historyRowDivided : null, pressed ? styles.activeCardPressed : null]}>
      {p.isWinner ? (
        <View style={styles.champDisc}>
          <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} />
          <TrophyGlyph size={16} color="#1A1206" />
        </View>
      ) : (
        <View style={styles.placeDisc}>
          <Text style={styles.placeNum}>{p.place}</Text>
        </View>
      )}

      <View style={styles.historyBody}>
        <Text style={styles.historyName} numberOfLines={1}>
          {p.name}
        </Text>
        <View style={styles.historyMetaRow}>
          <TypeGlyph type={p.type} size={12} color={flColor.gray600} />
          <Text style={styles.historyMeta} numberOfLines={1}>
            {metricLabel(p.type, p.metricKey)}
            {p.squadName ? ` · ${p.squadName}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.historyTrail}>
        <Text style={[styles.historyPlace, p.isWinner ? styles.historyPlaceChamp : null]}>{label}</Text>
        <Text style={styles.historyScore}>
          {formatScore(p.type, p.score)} {meta.unit}
        </Text>
      </View>
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

// ── glyphs (the design's own type paths) ──
function TypeGlyph({ type, size = 15, color = flColor.bronze400 }: { type: ChallengeType; size?: number; color?: string }) {
  const paths: Record<ChallengeType, string[]> = {
    MOST_WORKOUTS: ['M6.5 9v6', 'M17.5 9v6', 'M4 10.5v3', 'M20 10.5v3', 'M6.5 12h11'],
    MOST_VOLUME: ['M4 20V10', 'M9 20V4', 'M14 20v-8', 'M19 20v-5'],
    MOST_DURATION: ['M12 7v5l3.5 2'],
    MAX_LIFT: ['M12 20V6', 'M6 12l6-6 6 6'],
    MOST_PRS: ['M12 3.4l2.1 4.7 5.1.5-3.8 3.4 1.1 5L12 14l-4.6 2.4 1.1-5-3.8-3.4 5.1-.5z'],
    DISTANCE_TOTAL: ['M3 15.6v-3c0-.5.4-.8.9-.6l3.3.8 2.6-2.9c.4-.5 1.2-.4 1.5.2l.7 1.5 6 1.7c1.2.3 2 1.1 2 2.4v.7c0 .4-.3.7-.7.7H4c-.6 0-1-.5-1-1z'],
    MOST_DAYS: ['M4 6.5h16v14H4zM4 10.5h16M8 3.5v3M16 3.5v3', 'M8.5 15l2 2 4-4'],
    MOST_REPS: ['M4 12h3M17 12h3', 'M9 8.5v7M15 8.5v7', 'M9 12h6'],
    EARLY_BIRD: ['M12 17.5a5.5 5.5 0 0 1 0-11', 'M3.5 20h17', 'M12 3.5v1.5M5 6.5l1 1M19 6.5l-1 1'],
    MOST_VARIETY: ['M5 5.5h5v5H5zM14 5.5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z'],
    GAIN_MAX_LIFT: ['M4 18l5-5 3.5 3.5L20 8', 'M15 8h5v5'],
    GAIN_VOLUME: ['M4 18l5-5 3.5 3.5L20 8', 'M15 8h5v5'],
    GAIN_REPS: ['M4 18l5-5 3.5 3.5L20 8', 'M15 8h5v5'],
    GAIN_DISTANCE: ['M4 18l5-5 3.5 3.5L20 8', 'M15 8h5v5'],
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {type === 'MOST_DURATION' ? <Circle cx={12} cy={12} r={8.5} /> : null}
      {paths[type].map((d, i) => (
        <Path key={i} d={d} />
      ))}
    </Svg>
  );
}
function SwordsGlyph({ size = 17, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.5 17.5 L3 6 L3 3 L6 3 L17.5 14.5" />
      <Path d="M13 19 L19 13" />
      <Path d="M14.5 6.5 L18 3 L21 3 L21 6 L17.5 9.5" />
      <Path d="M5 14 L9 18" />
    </Svg>
  );
}
function TrophyGlyph({ size = 16, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <Path d="M8 4H5.5a2 2 0 0 0 0 4H8M16 4h2.5a2 2 0 0 1 0 4H16" />
      <Path d="M12 13v3M9 20h6" />
    </Svg>
  );
}

function CrownRowGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill={flColor.bronze300}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function ChevronRowGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  barTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 2.6, textTransform: 'uppercase', color: flColor.cream100 },
  scroll: { paddingBottom: 34 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },

  // create
  createWrap: { paddingHorizontal: 22, paddingTop: 18 },
  createBtn: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeMetalBorder,
    boxShadow: `${flShadow.bronzeMetalTopRim}, ${flShadow.card}`,
  },
  createBtnPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  createLabel: { fontSize: 15, fontWeight: '700', color: '#F7F5F1', textShadowColor: 'rgba(8,5,2,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },

  // chips
  chipRail: { marginTop: 14 },
  chipRailContent: { gap: 8, paddingHorizontal: 22, paddingBottom: 6 },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: flRadius.pill, borderWidth: 1 },
  chipOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder },
  chipOff: { backgroundColor: 'transparent', borderColor: flColor.charcoal600 },
  chipLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
  chipLabelOn: { color: flColor.bronze300 },

  // sections
  sectionLabel: { marginTop: 24, marginBottom: 12, marginHorizontal: 22, fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  sectionLabelInline: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12, marginHorizontal: 22 },
  section: { marginHorizontal: 22, gap: 10 },
  stack: { marginHorizontal: 22, gap: 12 },

  liveWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveWrapRight: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 'auto' },
  liveDot: { width: 6, height: 6, borderRadius: flRadius.round, backgroundColor: flColor.greenMuted, boxShadow: '0 0 6px rgba(90,158,104,0.7)' },
  liveText: { fontSize: 11, fontWeight: '600', color: flColor.gray400 },
  liveTag: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, color: flColor.greenMuted },

  // open to join
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  openIcon: {
    width: 32,
    height: 32,
    flexShrink: 0,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  openBody: { flex: 1, minWidth: 0, gap: 2 },
  openName: { fontFamily: flFont.display, fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  openMeta: { fontSize: 11, color: flColor.gray600 },
  declineBtn: { flexShrink: 0, paddingHorizontal: 11, paddingVertical: 8, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal500 },
  declineLabel: { fontSize: 12, fontWeight: '600', color: flColor.gray400 },
  joinBtn: {
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeMetalBorder,
    boxShadow: flShadow.bronzeMetalTopRim,
  },
  joinLabel: { fontSize: 12, fontWeight: '700', color: '#F7F5F1' },
  btnBusy: { opacity: 0.6 },

  // active
  activeCardPressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  activeCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 16,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    boxShadow: `${flShadow.card}, ${flShadow.glowSubtle}`,
  },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  typeName: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.bronze400 },
  activeName: { marginTop: 9, fontFamily: flFont.display, fontSize: 20, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  oppRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 6 },
  oppText: { flexShrink: 1, fontSize: 12.5, color: flColor.gray400 },
  scopePill: { flexShrink: 0, paddingHorizontal: 9, paddingVertical: 3, borderRadius: flRadius.pill, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  scopePillText: { fontSize: 10, fontWeight: '600', color: flColor.bronze300 },
  barTrack: { marginTop: 14, height: 8, borderRadius: flRadius.pill, overflow: 'hidden', backgroundColor: flColor.charcoal700 },
  barFill: { height: '100%', borderRadius: flRadius.pill, overflow: 'hidden', boxShadow: flShadow.glowSubtle },
  activeFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  standing: { fontSize: 12, fontWeight: '600', color: flColor.bronze400 },
  days: { fontSize: 11.5, color: flColor.gray600 },

  // history
  historyCard: { marginHorizontal: 22, overflow: 'hidden', borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, paddingVertical: 13 },
  historyRowDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  champDisc: { position: 'relative', overflow: 'hidden', width: 36, height: 36, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', boxShadow: flShadow.glowSubtle },
  placeDisc: {
    width: 36,
    height: 36,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  placeNum: { fontFamily: flFont.display, fontSize: 14, fontWeight: '600', color: flColor.gray400 },
  historyBody: { flex: 1, minWidth: 0, gap: 3 },
  historyName: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  historyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyMeta: { flex: 1, fontSize: 11, color: flColor.gray600 },
  historyTrail: { flexShrink: 0, alignItems: 'flex-end', gap: 3 },
  historyPlace: { fontSize: 11.5, fontWeight: '600', color: flColor.gray400 },
  historyPlaceChamp: { color: flColor.bronze300 },
  historyScore: { fontSize: 10, color: flColor.gray600, opacity: 0.85 },

  // stats — 1px gaps over a hairline-coloured ground, as the design does it
  statGrid: { marginHorizontal: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 1, backgroundColor: flColor.charcoal700, borderRadius: flRadius.lg, overflow: 'hidden' },
  championsRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 24, marginHorizontal: 22, paddingHorizontal: 15, paddingVertical: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal800, boxShadow: flShadow.card },
  championsRowPressed: { opacity: 0.92 },
  championsIcon: { width: 40, height: 40, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  championsBody: { flex: 1, minWidth: 0 },
  championsTitle: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  championsSub: { marginTop: 2, fontSize: 11.5, color: flColor.gray600 },
  viewAllRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewAllText: { fontSize: 12, fontWeight: '500', color: flColor.bronze400 },
  statCell: { flexGrow: 1, flexBasis: '48%', alignItems: 'center', gap: 5, paddingVertical: 18, backgroundColor: flColor.surfaceRecessed },
  statValue: { fontFamily: flFont.display, fontSize: 24, fontWeight: '700', color: flColor.cream100 },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },

  favCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 12,
    marginHorizontal: 22,
    padding: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  favIcon: {
    width: 42,
    height: 42,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.charcoal900,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    boxShadow: flShadow.glowSubtle,
  },
  favBody: { flex: 1, minWidth: 0, gap: 2 },
  favEyebrow: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400 },
  favType: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100 },

  // empties
  dashedEmpty: { marginHorizontal: 22, paddingVertical: 22, paddingHorizontal: 16, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.charcoal600 },
  dashedText: { fontSize: 12.5, textAlign: 'center', color: flColor.gray600 },

  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
