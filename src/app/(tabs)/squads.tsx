import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { Avatar } from '@/components/forge/composites/Avatar';
import { Button } from '@/components/forge/composites/Button';
import { SkeletonCard } from '@/components/forge/cards/SkeletonCard';
import { SquadCrest } from '@/components/forge/SquadCrest';
import { fetchMySquads, type SquadSummary } from '@/data/squad-live';
import { fetchOwnedPendingCounts } from '@/data/squad-discover-live';
import { useQuery } from '@/lib/useQuery';
import { getSquadFavorites, setSquadFavorites } from '@/lib/squad-favorites';
import { useToast } from '@/hooks/useCeremony';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourAnchor, useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { useEarnedMoments } from '@/hooks/useEarnedMoments';

/**
 * Squads tab root — S-1 Squads Hub. Built to `Squads Hub.dc.html`, wired to real data (`fetchMySquads`).
 *
 * Faithful to the design: header (title + search/create), the favorite-aware squad card (bronze crest disc /
 * photo · "YOUR SQUAD" · name · star+chevron · motto · member avatar stack · "N members" · divider · daily
 * "trained today" segment bar), Favorites / All Squads sections, the empty-state pitch, and the Create CTA.
 * Reconciled to the current backend: real squads (no seed demo); trained-today = whether YOU logged a workout
 * today (per-member check-ins land later); the search/Discover and card→Detail taps are honest stubs until
 * those screens are (re)built. Favorites are device-local (`lib/squad-favorites`).
 */

export default function SquadsScreen() {
  /* Rank-ups and honours announce themselves on whichever main tab the athlete reaches first, so a
     day that never touches Legacy is not a day the moment is lost. Throttled and idempotent — see
     the hook. The active workout is a pushed route, so it can never be interrupted by one. */
  useEarnedMoments();
  const router = useRouter();
  const { data, loading, refetch } = useQuery(fetchMySquads, []);
  // Athletes waiting on you, per squad you own — the badge on the card tells you WHICH squad.
  const { data: pendingCounts, refetch: refetchPending } = useQuery(fetchOwnedPendingCounts, []);
  const { showToast } = useToast();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const discoverRef = useTourAnchor('squads-discover');
  const createRef = useTourAnchor('squads-create');
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();

  useEffect(() => {
    let cancelled = false;
    // Parsing and validation live in the store now, so this is just "restore what was starred".
    void getSquadFavorites().then((ids) => {
      if (!cancelled && ids.length > 0) setFavoriteIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchPending();
    }, [refetch, refetchPending]),
  );

  const goCreate = () => router.push('/create-squad');
  const goJoin = () => router.push('/join-squad');
  const openSquad = (id: string) => router.push({ pathname: '/squad/[id]', params: { id } });
  const openDiscover = () => router.push('/discover-squads');

  const toggleFavorite = (id: string, name: string) => {
    const willFav = !favoriteIds.includes(id);
    setFavoriteIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      void setSquadFavorites(next);
      return next;
    });
    showToast(willFav ? `Added ${name} to Favorites` : `Removed ${name} from Favorites`);
  };

  const squads = data ?? [];
  const { favSquads, otherSquads } = useMemo(() => {
    const list = data ?? [];
    const favSet = new Set(favoriteIds);
    return { favSquads: list.filter((s) => favSet.has(s.id)), otherSquads: list.filter((s) => !favSet.has(s.id)) };
  }, [data, favoriteIds]);

  let cardIndex = 0;
  const renderCard = (s: SquadSummary) => (
    <TourAnchor key={s.id} id={cardIndex++ === 0 ? 'squads-card' : undefined}>
    <SquadCard
      squad={s}
      isFavorite={favoriteIds.includes(s.id)}
      pendingRequests={pendingCounts?.[s.id] ?? 0}
      onToggleFavorite={() => toggleFavorite(s.id, s.name)}
      onOpen={() => openSquad(s.id)}
      onReviewRequests={() => router.push({ pathname: '/squad-requests', params: { id: s.id } })}
    />
    </TourAnchor>
  );

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} />

      <AppBar
        title={<Text style={styles.barTitle}>Squads</Text>}
        actions={
          <>
            <Pressable ref={discoverRef} onPress={openDiscover} accessibilityRole="button" accessibilityLabel="Discover squads" style={styles.headerBtn} hitSlop={6}>
              <SearchIcon />
            </Pressable>
            <Pressable ref={createRef} onPress={goCreate} accessibilityRole="button" accessibilityLabel="Create a squad" style={styles.headerBtn} hitSlop={6}>
              <PlusIcon size={26} stroke={flColor.bronze300} />
            </Pressable>
          </>
        }
      />

      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {!data && loading ? (
          <View style={styles.cardStack}>
            <SkeletonCard variant="base" />
            <SkeletonCard variant="base" />
          </View>
        ) : squads.length === 0 ? (
          <SquadsEmptyState onCreate={goCreate} onJoin={goJoin} />
        ) : (
          <View style={styles.stack}>
            {favSquads.length > 0 ? (
              <>
                <TourAnchor id="squads-favorites" style={styles.sectionHeaderPad}>
                  <SquadHeader label="Favorites" star />
                </TourAnchor>
                <View style={styles.cardStack}>{favSquads.map(renderCard)}</View>
                {otherSquads.length > 0 ? (
                  <View style={styles.sectionHeaderPad}>
                    <SquadHeader label="All Squads" />
                  </View>
                ) : null}
              </>
            ) : null}
            {otherSquads.length > 0 ? <View style={styles.cardStack}>{otherSquads.map(renderCard)}</View> : null}

            <View style={styles.createFooter}>
              <Button variant="primary" fullWidth icon={<PlusIcon size={18} stroke="#F7F5F1" />} onPress={goCreate} accessibilityLabel="Create a squad">
                Create a Squad
              </Button>
              <TourAnchor id="squads-join">
                <JoinCodeLink onPress={goJoin} />
              </TourAnchor>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Needs at least one squad — four of the five steps ring things the empty state doesn't draw. */}
      <ScreenTour screenKey="squads" ready={squads.length > 0} restingBottom={108} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SquadCard({
  squad,
  isFavorite,
  pendingRequests,
  onToggleFavorite,
  onOpen,
  onReviewRequests,
}: {
  squad: SquadSummary;
  isFavorite: boolean;
  pendingRequests: number;
  onToggleFavorite: () => void;
  onOpen: () => void;
  onReviewRequests: () => void;
}) {
  const overflow = squad.memberCount - squad.avatars.length;

  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${squad.name}`} style={[styles.card, isFavorite ? styles.cardFav : null]}>
      {isFavorite ? <LinearGradient colors={['rgba(186, 134, 84,0.07)', 'rgba(186, 134, 84,0)'] as const} locations={[0, 0.42] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      <View style={styles.cardInner}>
        {/* identity */}
        <View style={styles.identityRow}>
          <View style={styles.crest}>
            {squad.photoUrl ? <Image source={{ uri: squad.photoUrl }} style={styles.crestPhoto} contentFit="cover" /> : <SquadCrest crest={squad.crest} size={32} color={flColor.bronze300} />}
          </View>

          <View style={styles.identityBody}>
            {squad.role === 'owner' ? <Text style={styles.ownedLabel}>Your Squad</Text> : null}

            <View style={styles.nameRow}>
              <Text style={styles.squadName} numberOfLines={2}>
                {squad.name}
              </Text>
              <View style={styles.nameActions}>
                <Pressable onPress={onToggleFavorite} accessibilityRole="button" accessibilityState={{ selected: isFavorite }} accessibilityLabel={isFavorite ? `Remove ${squad.name} from favorites` : `Add ${squad.name} to favorites`} style={styles.starBtn} hitSlop={8}>
                  <StarIcon filled={isFavorite} size={18} />
                </Pressable>
                <ChevronIcon />
              </View>
            </View>

            {squad.motto ? (
              <Text style={styles.motto} numberOfLines={1}>
                {squad.motto}
              </Text>
            ) : null}

            {/* member row */}
            <View style={styles.memberRow}>
              <View style={styles.avatarStack}>
                {squad.avatars.map((a, i) => (
                  <View key={i} style={styles.stackAvatar}>
                    <Avatar src={a.avatarUrl ?? undefined} name={a.name} size="squadStack" />
                  </View>
                ))}
                {overflow > 0 ? (
                  <View style={[styles.stackAvatar, styles.overflowChip]}>
                    <Text style={styles.overflowText}>+{overflow}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.memberCountRow}>
                <PeopleGlyph size={15} color={flColor.gray600} />
                <Text style={styles.memberCountText}>{squad.memberCount === 1 ? '1 member' : `${squad.memberCount} members`}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* divider */}
        <View style={styles.dividerWrap}>
          <LinearGradient colors={['rgba(181, 138, 97,0)', flColor.bronzeBorderSubtle, flColor.bronzeBorderSubtle, 'rgba(181, 138, 97,0)'] as const} locations={[0, 0.2, 0.8, 1] as const} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.divider} />
        </View>

        {/* daily progress */}
        <View style={styles.dailyRow}>
          <View style={styles.dailyNumWrap}>
            <Text style={styles.dailyNum}>
              <Text style={squad.trainedToday > 0 ? styles.dailyNumOn : styles.dailyNumOff}>{squad.trainedToday}</Text>
              <Text style={styles.dailyNumTotal}> / {squad.memberCount}</Text>
            </Text>
            <Text style={styles.dailyLabel}>trained today</Text>
          </View>
          <View style={styles.segments}>
            {Array.from({ length: squad.memberCount }).map((_, i) => (
              <View key={i} style={[styles.segment, i < squad.trainedToday ? styles.segmentOn : styles.segmentOff]} />
            ))}
          </View>
        </View>

        {/* Waiting on you — only an owner ever sees this, and only when someone is actually waiting. */}
        {pendingRequests > 0 ? (
          <Pressable
            onPress={onReviewRequests}
            accessibilityRole="button"
            accessibilityLabel={`Review ${pendingRequests} join ${pendingRequests === 1 ? 'request' : 'requests'} for ${squad.name}`}
            style={styles.requestStrip}
          >
            <View style={styles.requestCount}>
              <Text style={styles.requestCountText}>{pendingRequests}</Text>
            </View>
            <Text style={styles.requestLabel}>
              {pendingRequests === 1 ? 'athlete is asking to join' : 'athletes are asking to join'}
            </Text>
            <ChevronIcon />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function SquadsEmptyState({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyCrest}>
        <PeopleGlyph size={38} color={flColor.bronze300} />
      </View>
      <Text style={styles.emptyHeadline}>Training alongside someone changes how it feels to show up.</Text>
      <Text style={styles.emptyBody}>
        A squad is a small, private group that trains together. Follow each other’s progress, celebrate wins, and take on shared challenges. Build lasting friendships, stay accountable, and discover how much easier consistency becomes when you’re not training alone.
      </Text>
      <View style={styles.emptyCta}>
        <Button variant="primary" fullWidth icon={<PlusIcon size={18} stroke="#F7F5F1" />} onPress={onCreate} accessibilityLabel="Create a squad">
          Create a Squad
        </Button>
        <JoinCodeLink onPress={onJoin} />
      </View>
    </View>
  );
}

function JoinCodeLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Join a squad with an invite code" style={styles.joinLink} hitSlop={8}>
      <Text style={styles.joinLinkText}>
        Have an invite code? <Text style={styles.joinLinkEmph}>Join a squad</Text>
      </Text>
    </Pressable>
  );
}

function SquadHeader({ label, star = false }: { label: string; star?: boolean }) {
  return (
    <View style={styles.headerRow}>
      {star ? <StarIcon filled size={12} /> : null}
      <Text style={styles.headerLabel}>{label}</Text>
    </View>
  );
}

// ── glyphs ──
function PlusIcon({ size = 22, stroke = flColor.bronze300 }: { size?: number; stroke?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function SearchIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="M16 16l4.5 4.5" />
    </Svg>
  );
}
function ChevronIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}
function StarIcon({ filled = false, size = 18 }: { filled?: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? flColor.bronze300 : 'none'} stroke={filled ? flColor.bronze300 : flColor.gray600} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2.6l2.65 6.02 6.55.55-4.98 4.3 1.5 6.4L12 16.9l-5.72 3.47 1.5-6.4-4.98-4.3 6.55-.55z" />
    </Svg>
  );
}
function PeopleGlyph({ size = 15, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3.4 19a5.6 5.6 0 0 1 11.2 0" />
      <Path d="M16 5.3a3.2 3.2 0 0 1 0 5.4" />
      <Path d="M18.2 19a5.6 5.6 0 0 0-3-4.9" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  barTitle: { fontSize: 32, fontWeight: '700', letterSpacing: -0.4, color: flColor.cream100, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 14 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round },

  scroll: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 30 },
  stack: { gap: 16 },
  cardStack: { gap: 16 },
  sectionHeaderPad: { paddingHorizontal: 4, marginTop: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  headerLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  createFooter: { marginTop: 8 },
  joinLink: { marginTop: 14, alignItems: 'center', paddingVertical: 6 },
  joinLinkText: { fontSize: 13, color: flColor.gray400 },
  joinLinkEmph: { color: flColor.bronze300, fontWeight: '600' },

  // card
  card: { position: 'relative', overflow: 'hidden', borderRadius: flRadius.lg, borderWidth: 1, borderColor: 'rgba(186, 134, 84,0.30)', backgroundColor: flColor.charcoal900, boxShadow: flShadow.card },
  cardFav: { borderColor: 'rgba(186, 134, 84,0.62)', boxShadow: `${flShadow.card}, 0 0 22px rgba(186, 134, 84,0.15)` },
  cardInner: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 17, gap: 16 },

  // identity
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 15 },
  crest: {
    width: 66,
    height: 66,
    flexShrink: 0,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    backgroundColor: '#1b130b',
    borderWidth: 1.5,
    borderColor: flColor.bronze400,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 1px rgba(201, 151, 103,0.25), 0 0 14px rgba(186, 134, 84,0.35), inset 0 1px 0 rgba(201, 151, 103,0.14), inset 0 0 26px rgba(0,0,0,0.6)',
  },
  crestPhoto: { width: '100%', height: '100%', borderRadius: flRadius.round },
  identityBody: { flex: 1, minWidth: 0, gap: 5, paddingTop: 1 },
  ownedLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: flColor.bronze400 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  squadName: { flex: 1, fontSize: 21, fontWeight: '700', lineHeight: 24, letterSpacing: -0.3, color: flColor.cream100 },
  nameActions: { flexDirection: 'row', alignItems: 'center', gap: 1, flexShrink: 0, marginTop: 2 },
  starBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round },
  motto: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 14, lineHeight: 18, color: flColor.bronze300 },

  // member row
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 9 },
  avatarStack: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8 },
  stackAvatar: { marginLeft: -8, borderRadius: flRadius.round, boxShadow: `0 0 0 2px ${flColor.charcoal800}` },
  overflowChip: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.charcoal500, backgroundColor: flColor.charcoal700 },
  overflowText: { fontSize: 10.5, fontWeight: '700', color: flColor.gray400 },
  memberCountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  memberCountText: { fontSize: 12.5, color: flColor.gray400 },

  // divider
  dividerWrap: { height: 1 },
  divider: { flex: 1, height: 1 },

  // daily progress
  dailyRow: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingTop: 3, paddingBottom: 2 },
  dailyNumWrap: { flexShrink: 0, minWidth: 56, gap: 5 },
  dailyNum: { fontSize: 23, fontWeight: '700', letterSpacing: 0.2, lineHeight: 24 },
  dailyNumOn: { color: flColor.bronze300 },
  dailyNumOff: { color: flColor.gray600 },
  dailyNumTotal: { color: flColor.gray600, fontWeight: '600' },
  dailyLabel: { fontSize: 11.5, letterSpacing: 0.2, color: flColor.gray400 },
  segments: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  segmentOn: { backgroundColor: flColor.bronze400, boxShadow: '0 0 6px rgba(186, 134, 84,0.35)' },
  segmentOff: { backgroundColor: 'rgba(151,137,113,0.26)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)' },

  // pending join requests (owner only)
  requestStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  requestCount: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: flRadius.pill,
    backgroundColor: flColor.bronze400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestCountText: { fontSize: 12, fontWeight: '700', color: '#1A1206' },
  requestLabel: { flex: 1, fontSize: 12.5, color: flColor.bronze300 },

  // empty state
  emptyWrap: { paddingHorizontal: 10, paddingTop: 10, alignItems: 'center' },
  emptyCrest: {
    width: 78,
    height: 78,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    backgroundColor: '#1b130b',
    borderWidth: 1.5,
    borderColor: flColor.bronze400,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 1px rgba(201, 151, 103,0.25), 0 0 22px rgba(186, 134, 84,0.42), inset 0 1px 0 rgba(201, 151, 103,0.14), inset 0 0 28px rgba(0,0,0,0.6)',
  },
  emptyHeadline: { marginTop: 24, textAlign: 'center', fontFamily: flFont.display, fontSize: 22, fontWeight: '600', lineHeight: 28, letterSpacing: -0.2, color: flColor.cream100, maxWidth: 300 },
  emptyBody: { marginTop: 13, textAlign: 'center', fontSize: 13.5, lineHeight: 22, color: flColor.gray400, maxWidth: 270 },
  emptyCta: { marginTop: 28, width: '100%' },
});
