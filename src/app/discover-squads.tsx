import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SquadCrest } from '@/components/forge/SquadCrest';
import {
  SQUAD_CATEGORIES,
  fetchDiscoverSquads,
  requestSquadJoin,
  withdrawSquadJoinRequest,
  type DiscoverSquad,
  type SquadMembership,
} from '@/data/squad-discover-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Discover Squads — public squad browse. Built to `Discover Squads.dc.html`, wired to real data
 * (`discover_squads()`, migration 0050).
 *
 * Faithful to the design: the search field, the horizontal category chip row, the "PUBLIC SQUADS ·
 * N squads" results header, the three-card skeleton, the squad card (bronze crest disc · name · motto ·
 * "Most active this week" · capacity tag · members + training-today stats · the action button), the two
 * empty states, and the Create-a-Squad escape hatch.
 *
 * Real where the design was seeded: membership is server state, not in-memory — "Request to Join"
 * queues a real `squad_join_requests` row the owner reviews, and "Request Sent" withdraws it. Capacity
 * comes from `member_cap` (50), so "3 left" / "Full" are real states, not seed data.
 *
 * The design's instant-join "Open" branch is GONE (0053, Squad-Architecture-Amendment-003): every public
 * squad is request-to-join. The green Open pill and the bronze-fill "Join Squad" CTA went with it, and
 * "Request to Join" inherited the primary weight.
 *
 * Card tap follows the design into Squad Preview; a squad you've already JOINED skips the preview and
 * opens the real Squad Detail (the design routed both to Preview, and its "joined" branch was named
 * `openDetail` — this is what that name meant).
 */

const CATS = ['All', ...SQUAD_CATEGORIES] as const;
type Cat = (typeof CATS)[number];

export default function DiscoverSquadsScreen() {
  const router = useRouter();
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const { showToast } = useToast();
  const { data, loading, error, refetch } = useQuery(fetchDiscoverSquads, []);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Cat>('All');
  const [searchFocused, setSearchFocused] = useState(false);
  /** Optimistic membership, applied over the fetched row until the refetch reconciles counts. */
  const [overrides, setOverrides] = useState<Record<string, SquadMembership>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const all = useMemo(() => data ?? [], [data]);

  // "Most active this week" is a superlative over the whole public set, not the current filter — filter
  // to Running and the badge only shows if the most active squad happens to be a Running squad.
  const mostActiveId = useMemo(() => {
    let best: DiscoverSquad | null = null;
    for (const s of all) if (s.trainedToday > 0 && (!best || s.trainedToday > best.trainedToday)) best = s;
    return best?.id ?? null;
  }, [all]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      all.filter(
        (s) =>
          (category === 'All' || s.category === category) &&
          (!q ||
            s.name.toLowerCase().includes(q) ||
            (s.motto ?? '').toLowerCase().includes(q) ||
            (s.description ?? '').toLowerCase().includes(q) ||
            (s.category ?? '').toLowerCase().includes(q)),
      ),
    [all, category, q],
  );

  const stateOf = (s: DiscoverSquad): SquadMembership => (overrides[s.id] !== undefined ? overrides[s.id] : s.membership);

  const setState = (id: string, next: SquadMembership) => setOverrides((o) => ({ ...o, [id]: next }));

  const runAction = (s: DiscoverSquad, action: () => Promise<SquadMembership>, done: (next: SquadMembership) => void) => {
    if (busyId) return;
    setBusyId(s.id);
    action().then(
      (next) => {
        setBusyId(null);
        setState(s.id, next);
        done(next);
        refetch();
      },
      (e: unknown) => {
        setBusyId(null);
        showToast(errorMessage(e));
      },
    );
  };

  const onRequest = (s: DiscoverSquad) =>
    runAction(
      s,
      async () => {
        await requestSquadJoin(s.id);
        return 'requested';
      },
      () => showToast(`Request sent to ${s.name}`),
    );

  const onWithdraw = (s: DiscoverSquad) =>
    runAction(
      s,
      async () => {
        await withdrawSquadJoinRequest(s.id);
        return null;
      },
      () => showToast(`Request to ${s.name} withdrawn`),
    );

  const n = filtered.length;
  const searching = q.length > 0;
  const showSkeleton = loading && !data;
  const showResults = !showSkeleton && !error && n > 0;
  const isEmpty = !showSkeleton && !error && n === 0;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Discover Squads" serif onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/squads'))} />

      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Search ── */}
        <Rise duration={360}>
          <View style={styles.searchWrap}>
            <View style={styles.searchIcon}>
              <SearchGlyph />
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search squads..."
              placeholderTextColor={flColor.gray600}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search squads"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={[styles.searchInput, searchFocused && styles.searchInputFocused]}
            />
          </View>
        </Rise>

        {/* ── Category filters ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
          {CATS.map((c) => {
            const on = category === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={c === 'All' ? 'All categories' : c}
                style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
              >
                {on ? (
                  <LinearGradient
                    colors={flGradient.bronzeMetallic.colors}
                    locations={flGradient.bronzeMetallic.locations}
                    start={flGradient.bronzeMetallic.start}
                    end={flGradient.bronzeMetallic.end}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Results header ── */}
        <TourAnchor id="discover-list" style={styles.resultsHeader}>
          <Text style={styles.resultsLabel}>{category === 'All' ? 'Public Squads' : category}</Text>
          <Text style={styles.resultsCount}>{showSkeleton ? '' : `${n} ${n === 1 ? 'squad' : 'squads'}`}</Text>
        </TourAnchor>

        {showSkeleton ? (
          <View style={styles.stack}>
            <DiscoverSkeleton />
            <DiscoverSkeleton />
            <DiscoverSkeleton />
          </View>
        ) : null}

        {error ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyDisc}>
              <PeopleGlyph size={30} color={flColor.bronze300} />
            </View>
            <Text style={styles.emptyTitle}>Couldn’t load squads</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Try again" style={styles.outlineBtn}>
              <Text style={styles.outlineBtnLabel}>Try Again</Text>
            </Pressable>
          </View>
        ) : null}

        {showResults ? (
          <View style={styles.stack}>
            {filtered.map((s) => (
              <SquadResultCard
                key={s.id}
                squad={s}
                membership={stateOf(s)}
                mostActive={s.id === mostActiveId}
                busy={busyId === s.id}
                onOpen={() => router.push({ pathname: '/squad/[id]', params: { id: s.id } })}
                onPreview={() => router.push({ pathname: '/squad-preview', params: { id: s.id } })}
                onRequest={() => onRequest(s)}
                onWithdraw={() => onWithdraw(s)}
              />
            ))}
          </View>
        ) : null}

        {/* ── Empty ── */}
        {isEmpty ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyDisc}>
              <PeopleGlyph size={30} color={flColor.bronze300} />
            </View>
            <Text style={styles.emptyTitle}>{searching ? 'No squads found' : 'No squads in this category'}</Text>
            <Text style={styles.emptyText}>{searching ? 'Try another search or category.' : 'Check back later, or forge one yourself.'}</Text>
            <TourAnchor id="discover-create">
              <Pressable onPress={() => router.push('/create-squad')} accessibilityRole="button" accessibilityLabel="Create a squad" style={styles.outlineBtn}>
                <PlusGlyph size={15} color={flColor.bronze300} />
                <Text style={styles.outlineBtnLabel}>Create a Squad</Text>
              </Pressable>
            </TourAnchor>
          </View>
        ) : null}
      </ScrollView>

      <ScreenTour screenKey="discover-squads" ready={!showSkeleton} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SquadResultCard({
  squad,
  membership,
  mostActive,
  busy,
  onOpen,
  onPreview,
  onRequest,
  onWithdraw,
}: {
  squad: DiscoverSquad;
  membership: SquadMembership;
  mostActive: boolean;
  busy: boolean;
  onOpen: () => void;
  onPreview: () => void;
  onRequest: () => void;
  onWithdraw: () => void;
}) {
  // The size ceiling now applies to every squad (0053 retired open joining), so the tag reports
  // capacity first and falls back to the approval marker.
  const spotsLeft = Math.max(0, squad.memberCap - squad.memberCount);
  const isFull = squad.memberCount >= squad.memberCap;
  const nearlyFull = !isFull && spotsLeft <= 5;

  const tagStyle = isFull ? styles.tagCap : nearlyFull ? styles.tagNear : styles.tagApproval;
  const tagTextStyle = isFull ? styles.tagCapText : nearlyFull ? styles.tagNearText : styles.tagApprovalText;
  const tagLabel = isFull ? 'Full' : nearlyFull ? `${spotsLeft} left` : 'Approval';
  const tagColor = isFull ? flColor.gray600 : flColor.bronze300;
  const tagIcon = isFull || nearlyFull ? <PeopleGlyph size={12} color={tagColor} /> : <LockGlyph size={12} color={tagColor} />;

  const joined = membership === 'joined';
  const requested = membership === 'requested';

  const action = joined ? onOpen : requested ? onWithdraw : onRequest;
  const label = joined ? 'Joined' : requested ? 'Request Sent' : 'Request to Join';
  // Request to Join is now the card's only action, so it carries the primary weight the design gave
  // "Join Squad" (and that Squad Preview already gives the request CTA).
  const filled = !joined && !requested;
  const done = joined || requested;

  return (
    <Rise duration={420}>
      <Pressable
        onPress={joined ? onOpen : onPreview}
        accessibilityRole="button"
        accessibilityLabel={joined ? `Open ${squad.name}` : `Preview ${squad.name}`}
        style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      >
        <LinearGradient colors={flGradient.surfaceCard.colors} start={flGradient.surfaceCard.start} end={flGradient.surfaceCard.end} style={StyleSheet.absoluteFill} />

        {/* identity */}
        <View style={styles.cardHead}>
          <View style={styles.crest}>
            <LinearGradient colors={['rgba(186, 134, 84,0.24)', 'rgba(186, 134, 84,0)']} locations={[0, 0.72]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
            {squad.photoUrl ? <Image source={{ uri: squad.photoUrl }} style={styles.crestPhoto} contentFit="cover" /> : <SquadCrest crest={squad.crest} size={26} color={flColor.bronze300} strokeWidth={1.6} />}
          </View>

          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {squad.name}
            </Text>
            {squad.motto ? (
              <Text style={styles.motto} numberOfLines={1}>
                {squad.motto}
              </Text>
            ) : null}
            {mostActive ? (
              <TourAnchor id="discover-active" style={styles.activeRow}>
                <FlameGlyph size={12} color={flColor.bronze400} />
                <Text style={styles.activeText}>Most active this week</Text>
              </TourAnchor>
            ) : null}
          </View>

          <View style={[styles.tag, tagStyle]}>
            {tagIcon}
            <Text style={[styles.tagText, tagTextStyle]}>{tagLabel}</Text>
          </View>
        </View>

        {/* stats */}
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <PeopleGlyph size={14} color={flColor.gray600} />
            <Text style={styles.statText}>
              {squad.memberCount} {squad.memberCount === 1 ? 'member' : 'members'}
            </Text>
          </View>
          <View style={styles.stat}>
            <FlameGlyph size={13} color={flColor.gray600} />
            <Text style={styles.statText}>{squad.trainedToday} training today</Text>
          </View>
        </View>

        {/* action */}
        <View style={styles.actionWrap}>
          <Pressable
            onPress={action}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`${label} — ${squad.name}`}
            style={({ pressed }) => [styles.actionBtn, done ? styles.actionBtnDone : styles.actionBtnBronze, pressed ? styles.actionBtnPressed : null, busy ? styles.actionBtnBusy : null]}
          >
            {filled ? (
              <LinearGradient colors={flGradient.bronzeFill.colors} locations={flGradient.bronzeFill.locations} start={flGradient.bronzeFill.start} end={flGradient.bronzeFill.end} style={StyleSheet.absoluteFill} />
            ) : null}
            {done ? <CheckGlyph size={15} color={flColor.gray400} /> : <PlusGlyph size={15} color={flColor.bronze300} />}
            <Text style={[styles.actionLabel, done ? styles.actionLabelDone : null]}>{label}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Rise>
  );
}

/** The design's `dsRise` — 10px up + fade, on mount. */
function Rise({ children, duration = 400 }: { children: React.ReactNode; duration?: number }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(v, { toValue: 1, duration, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [v, duration]);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>{children}</Animated.View>;
}

function Bone({ w, h, r = flRadius.sm, opacity }: { w: number | `${number}%`; h: number; r?: number; opacity: Animated.Value }) {
  return <Animated.View style={[styles.bone, { width: w, height: h, borderRadius: r, opacity }]} />;
}

/** Mirrors the result card's geometry exactly, so nothing shifts when real cards replace it. */
function DiscoverSkeleton() {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.42, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <View style={styles.skelCard}>
      <View style={styles.cardHeadSkel}>
        <Bone w={52} h={52} r={flRadius.md} opacity={opacity} />
        <View style={styles.skelIdentity}>
          <Bone w="58%" h={15} opacity={opacity} />
          <Bone w="82%" h={12} opacity={opacity} />
        </View>
        <Bone w={70} h={22} r={flRadius.pill} opacity={opacity} />
      </View>
      <View style={styles.skelStats}>
        <Bone w={88} h={12} opacity={opacity} />
        <Bone w={104} h={12} opacity={opacity} />
      </View>
      <View style={styles.skelAction}>
        <Bone w="100%" h={42} r={flRadius.md} opacity={opacity} />
      </View>
    </View>
  );
}

// ── glyphs (verbatim from the design's inline SVGs) ──
function SearchGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={10.5} cy={10.5} r={6} />
      <Path d="M15 15l5 5" />
    </Svg>
  );
}
function CheckGlyph({ size = 15, color = flColor.gray400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4 4 10-10" />
    </Svg>
  );
}
function PlusGlyph({ size = 15, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function LockGlyph({ size = 12, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={5} y={10.5} width={14} height={9} rx={2} />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </Svg>
  );
}
function PeopleGlyph({ size = 12, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3.4 19a5.6 5.6 0 0 1 11.2 0" />
      <Path d="M16 5.3a3.2 3.2 0 0 1 0 5.4" />
      <Path d="M18.2 19a5.6 5.6 0 0 0-3-4.9" />
    </Svg>
  );
}
function FlameGlyph({ size = 13, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34 },
  stack: { gap: 14 },

  // search
  searchWrap: { position: 'relative', justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 13, zIndex: 1, pointerEvents: 'none' },
  searchInput: {
    paddingLeft: 40,
    paddingRight: 13,
    paddingVertical: 12,
    fontSize: 14.5,
    color: flColor.cream100,
    backgroundColor: flColor.charcoal900,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.md,
  },
  searchInputFocused: {
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    boxShadow: '0 0 0 3px rgba(186, 134, 84,0.12), 0 4px 16px rgba(0,0,0,0.4)',
  },

  // category chips
  filterRow: { marginHorizontal: -6 },
  filterRowContent: { gap: 8, paddingHorizontal: 6, paddingTop: 14, paddingBottom: 2 },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: flRadius.pill, borderWidth: 1, overflow: 'hidden' },
  chipOn: { borderColor: flColor.bronzeBorder },
  chipOff: { borderColor: flColor.charcoal500, backgroundColor: flColor.charcoal800 },
  chipLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.cream100 },
  chipLabelOn: { color: '#1A1206' },

  // results header
  resultsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 12, marginHorizontal: 4 },
  resultsLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  resultsCount: { fontSize: 11.5, color: flColor.gray600 },

  // card
  card: { position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, boxShadow: flShadow.card },
  cardPressed: { transform: [{ scale: 0.992 }], borderColor: flColor.bronzeBorder },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, paddingHorizontal: 15, paddingTop: 15 },
  crest: {
    width: 52,
    height: 52,
    flexShrink: 0,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.surfaceRecessed,
    boxShadow: `0 0 0 2px ${flColor.bronze400}, ${flShadow.glowSubtle}`,
  },
  crestPhoto: { width: '100%', height: '100%', borderRadius: flRadius.round },
  identity: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontFamily: flFont.display, fontSize: 16.5, fontWeight: '600', letterSpacing: -0.1, color: flColor.cream100 },
  motto: { fontSize: 12.5, lineHeight: 17.5, color: flColor.gray400 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  activeText: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.4, color: flColor.bronze400 },

  // capacity / join tag
  tag: { flexShrink: 0, minWidth: 94, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: flRadius.pill, borderWidth: 1 },
  tagText: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.3 },
  tagApproval: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorderSubtle },
  tagApprovalText: { color: flColor.bronze300 },
  tagNear: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorderSubtle },
  tagNearText: { color: flColor.bronze300 },
  tagCap: { backgroundColor: flColor.charcoal800, borderColor: flColor.charcoal600 },
  tagCapText: { color: flColor.gray600 },

  // stats
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 22, paddingHorizontal: 15, paddingTop: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 11.5, color: flColor.gray600 },

  // action button
  actionWrap: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 15 },
  actionBtn: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1 },
  actionBtnBronze: { borderColor: flColor.bronzeBorder, boxShadow: flShadow.glowSubtle },
  actionBtnDone: { borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  actionBtnPressed: { transform: [{ scale: 0.99 }], opacity: 0.9 },
  actionBtnBusy: { opacity: 0.6 },
  actionLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
  actionLabelDone: { color: flColor.gray400 },

  // skeleton
  skelCard: { backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, boxShadow: flShadow.card, padding: 15 },
  cardHeadSkel: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  skelIdentity: { flex: 1, minWidth: 0, gap: 8, paddingTop: 3 },
  skelStats: { flexDirection: 'row', gap: 16, marginTop: 14 },
  skelAction: { marginTop: 14 },
  bone: { backgroundColor: flColor.charcoal700 },

  // empty / error
  emptyWrap: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 26 },
  emptyDisc: {
    width: 70,
    height: 70,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: 'rgba(186, 134, 84,0.06)',
    boxShadow: flShadow.glowSubtle,
  },
  emptyTitle: { marginTop: 18, fontFamily: flFont.display, fontSize: 20, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  emptyText: { marginTop: 8, fontSize: 13.5, lineHeight: 20, textAlign: 'center', color: flColor.gray400, maxWidth: 250 },
  outlineBtn: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
  },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
