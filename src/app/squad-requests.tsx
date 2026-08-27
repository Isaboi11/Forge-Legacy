import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SquadCrest } from '@/components/forge/SquadCrest';
import { fetchSquad } from '@/data/squad-live';
import {
  approveSquadJoinRequest,
  athleteRoleLine,
  declineSquadJoinRequest,
  fetchSquadJoinRequests,
  type SquadJoinRequest,
} from '@/data/squad-discover-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Squad Join Requests — the owner's approval queue. Built to `Squad Join Requests.dc.html`, wired to
 * real data (`squad_pending_requests` / `approve` / `decline`, migration 0052). This is the far end of
 * the loop Discover and Preview open: an athlete requests, the owner decides here.
 *
 * Faithful to the design: squad header · "PENDING REQUESTS" with the bronze count badge · the request
 * card (46px avatar · name · rank·type line · trust chip · overflow menu · waiting-time pill · the
 * athlete's note as a clamped italic quote with Read more) · the Decline / Approve pair at the design's
 * 1 : 1.7 weighting · the `jrLeave` exit (fade + slide right + collapse) · the owner-only footer line ·
 * and the empty state with its Invite Athletes escape hatch.
 *
 * Real where the design was seeded: approving inserts a real membership (and refuses when the squad hit
 * its size cap — the request stays pending rather than overfilling); declining marks the row declined so
 * a re-request updates it instead of duplicating. The overflow menu, dead in the design ("More options
 * coming soon"), opens the athlete's profile or declines.
 *
 * Two trust signals from the design are not here: "N Mutual Athletes" and "Follows You" both need a
 * friends/follow graph, which doesn't exist yet. "N Mutual Squads" — squads you're both already in — is
 * real and computed server-side, so that's the chip that ships. The presence dot is dropped for the same
 * reason it was on Squad Preview: there is no presence subsystem, and a fabricated dot is worse than none.
 */

const NOTE_CLAMP = 68; // the design's threshold for showing Read more
const LEAVE_MS = 340;
const CARD_GAP = 19;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Waiting time at the design's granularity and casing: "2 Hours Ago" · "Yesterday" · "3 Days Ago". */
function waitedFor(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < MINUTE) return 'Just Now';
  if (ms < HOUR) {
    const n = Math.floor(ms / MINUTE);
    return `${n} ${n === 1 ? 'Minute' : 'Minutes'} Ago`;
  }
  if (ms < DAY) {
    const n = Math.floor(ms / HOUR);
    return `${n} ${n === 1 ? 'Hour' : 'Hours'} Ago`;
  }
  if (ms < 2 * DAY) return 'Yesterday';
  return `${Math.floor(ms / DAY)} Days Ago`;
}

export default function SquadRequestsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const squadId = String(id ?? '');
  const router = useRouter();
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const { showToast } = useToast();

  const { data: squadData, loading: squadLoading } = useQuery(() => fetchSquad(squadId), [squadId]);
  const { data, loading, error, refetch } = useQuery(() => fetchSquadJoinRequests(squadId), [squadId]);

  const [leaving, setLeaving] = useState<Record<string, true>>({});
  const [gone, setGone] = useState<Record<string, true>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<SquadJoinRequest | null>(null);

  const squad = squadData?.squad ?? null;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/squad-settings', params: { id: squadId } }));

  const requests = (data ?? []).filter((r) => !gone[r.userId]);

  const resolve = (r: SquadJoinRequest, kind: 'approve' | 'decline') => {
    if (busyId) return;
    setMenuFor(null);
    setBusyId(r.userId);
    const call: Promise<'approved' | 'full' | 'declined'> =
      kind === 'approve' ? approveSquadJoinRequest(squadId, r.userId) : declineSquadJoinRequest(squadId, r.userId).then(() => 'declined' as const);
    call.then(
      (result) => {
        setBusyId(null);
        // The cap can fill between opening this queue and tapping Approve — the request stays pending.
        if (result === 'full') {
          showToast(`${squad?.name ?? 'This squad'} is full — remove a member first`);
          return;
        }
        showToast(result === 'approved' ? `${r.name} joined ${squad?.name ?? 'the squad'}` : `${r.name}’s request declined`);
        setLeaving((l) => ({ ...l, [r.userId]: true }));
      },
      (e: unknown) => {
        setBusyId(null);
        showToast(errorMessage(e));
      },
    );
  };

  const onGone = (userId: string) => {
    setGone((g) => ({ ...g, [userId]: true }));
    refetch();
  };

  if ((loading && !data) || (squadLoading && !squadData)) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
        <AppBar title="Join Requests" onBack={goBack} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }

  // Owner-only, enforced server-side too — the RPC returns an empty queue to anyone else.
  if (squad && !squad.isOwner) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
        <AppBar title="Join Requests" onBack={goBack} />
        <View style={styles.center}>
          <Text style={styles.missingTitle}>Only the owner reviews join requests.</Text>
          <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
        <AppBar title="Join Requests" onBack={goBack} />
        <View style={styles.center}>
          <Text style={styles.missingTitle}>Couldn’t load join requests.</Text>
          <Text style={styles.missingBody}>{error}</Text>
          <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Try again" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const memberCount = squadData?.members.length ?? 0;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Join Requests" onBack={goBack} />

      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Squad header ── */}
        {squad ? (
          <Rise duration={380}>
            <View style={styles.header}>
              <View style={styles.headerCrest}>
                {squad.photoUrl ? <Image source={{ uri: squad.photoUrl }} style={styles.headerCrestPhoto} contentFit="cover" /> : <SquadCrest crest={squad.crest} size={22} color={flColor.bronze300} />}
              </View>
              <View style={styles.headerBody}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {squad.name}
                </Text>
                <Text style={styles.headerMeta}>
                  {squad.privacy === 'private' ? 'Private' : 'Public'} · {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
                </Text>
              </View>
            </View>
          </Rise>
        ) : null}

        {requests.length > 0 ? (
          <>
            <TourAnchor id="requests-list" style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>Pending Requests</Text>
              <View style={styles.countBadge}>
                <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} />
                <Text style={styles.countBadgeText}>{requests.length}</Text>
              </View>
            </TourAnchor>

            {requests.map((r, ri) => (
              <TourAnchor key={r.userId} id={ri === 0 ? 'requests-actions' : undefined}>
              <RequestCard
                request={r}
                busy={busyId === r.userId}
                leaving={!!leaving[r.userId]}
                onGone={() => onGone(r.userId)}
                onMore={() => setMenuFor(r)}
                onApprove={() => resolve(r, 'approve')}
                onDecline={() => resolve(r, 'decline')}
              />
              </TourAnchor>
            ))}

            <View style={styles.footerNote}>
              <Text style={styles.footerBrand}>Forge Legacy</Text>
              <Text style={styles.footerLine}>Only squad owners review join requests.</Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyDisc}>
              <SquadCrest crest="shield" size={32} color={flColor.bronze300} strokeWidth={1.6} />
            </View>
            <Text style={styles.emptyTitle}>No Pending Requests</Text>
            <Text style={styles.emptyText}>Your squad is up to date. New join requests will appear here for you to review.</Text>
            <Pressable
              onPress={() => router.push({ pathname: '/squad-invite', params: { id: squadId } })}
              accessibilityRole="button"
              accessibilityLabel="Invite athletes"
              style={styles.outlineBtn}
            >
              <ShareGlyph size={17} color={flColor.bronze300} />
              <Text style={styles.outlineBtnLabel}>Invite Athletes</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <ScreenTour screenKey="squad-requests" ready={requests.length > 0} />

      {/* ── Overflow menu (dead in the design; real here) ── */}
      <BottomSheet open={menuFor != null} onClose={() => setMenuFor(null)} title={menuFor?.name ?? ''}>
        <View style={styles.menu}>
          <Pressable
            onPress={() => {
              const target = menuFor;
              setMenuFor(null);
              if (target) router.push({ pathname: '/athlete/[id]', params: { id: target.userId } });
            }}
            accessibilityRole="button"
            accessibilityLabel="View profile"
            style={styles.menuRow}
          >
            <Text style={styles.menuLabel}>View Profile</Text>
          </Pressable>
          <Pressable onPress={() => menuFor && resolve(menuFor, 'decline')} accessibilityRole="button" accessibilityLabel="Decline request" style={[styles.menuRow, styles.menuRowDivided]}>
            <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Decline Request</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function RequestCard({
  request,
  busy,
  leaving,
  onGone,
  onMore,
  onApprove,
  onDecline,
}: {
  request: SquadJoinRequest;
  busy: boolean;
  leaving: boolean;
  onGone: () => void;
  onMore: () => void;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const [leave] = useState(() => new Animated.Value(1));

  // The design's `jrLeave`: fade + slide right + collapse, then the row is dropped from the list.
  useEffect(() => {
    if (!leaving || height == null) return;
    const anim = Animated.timing(leave, { toValue: 0, duration: LEAVE_MS, useNativeDriver: false });
    anim.start(({ finished }) => {
      if (finished) onGone();
    });
    return () => anim.stop();
    // onGone is a fresh closure each render; the animation should not restart for that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving, height, leave]);

  const note = request.note?.trim() ?? '';
  const clamped = note.length > NOTE_CLAMP;
  const waited = waitedFor(request.createdAt);

  const collapsing =
    leaving && height != null
      ? {
          opacity: leave,
          height: leave.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
          marginBottom: leave.interpolate({ inputRange: [0, 1], outputRange: [0, CARD_GAP] }),
          overflow: 'hidden' as const,
          transform: [{ translateX: leave.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        }
      : { marginBottom: CARD_GAP };

  return (
    <Animated.View style={collapsing}>
      <Rise duration={420}>
        <View style={styles.card} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
          {/* identity */}
          <View style={styles.identityRow}>
            <Avatar src={request.avatarUrl ?? undefined} name={request.name} size={46} />

            <View style={styles.identityBody}>
              <Text style={styles.name} numberOfLines={1}>
                {request.name}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {athleteRoleLine(request)}
              </Text>

              {request.mutualSquads > 0 ? (
                <View style={styles.trustRow}>
                  <View style={styles.trustChip}>
                    <PeopleGlyph size={13} color={flColor.bronze400} />
                    <Text style={styles.trustText}>
                      {request.mutualSquads} Mutual {request.mutualSquads === 1 ? 'Squad' : 'Squads'}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.identityRight}>
              <Pressable onPress={onMore} accessibilityRole="button" accessibilityLabel={`More options for ${request.name}`} style={styles.moreBtn} hitSlop={6}>
                <DotsGlyph />
              </Pressable>
              <View style={styles.agePill}>
                <ClockGlyph size={12} color={flColor.gray600} />
                <Text style={styles.ageText}>{waited}</Text>
              </View>
            </View>
          </View>

          {/* the athlete's note */}
          {note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteText} numberOfLines={clamped && !expanded ? 2 : undefined}>
                “{note}”
              </Text>
              {clamped ? (
                <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button" accessibilityLabel={expanded ? 'Read less' : 'Read more'} hitSlop={6} style={styles.readMore}>
                  <Text style={styles.readMoreText}>{expanded ? 'Read less' : 'Read more'}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* decide */}
          <View style={styles.actions}>
            <Pressable
              onPress={onDecline}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Decline ${request.name}`}
              style={({ pressed }) => [styles.declineBtn, pressed ? styles.declinePressed : null, busy ? styles.btnBusy : null]}
            >
              <XGlyph size={15} color={flColor.gray600} />
              <Text style={styles.declineLabel}>Decline</Text>
            </Pressable>

            <Pressable
              onPress={onApprove}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Approve ${request.name}`}
              style={({ pressed }) => [styles.approveBtn, pressed ? styles.approvePressed : null, busy ? styles.btnBusy : null]}
            >
              <LinearGradient colors={flGradient.bronzeFill.colors} locations={flGradient.bronzeFill.locations} start={flGradient.bronzeFill.start} end={flGradient.bronzeFill.end} style={StyleSheet.absoluteFill} />
              {busy ? <ActivityIndicator color={flColor.bronze300} size="small" /> : <CheckGlyph size={16} color={flColor.bronze300} />}
              <Text style={styles.approveLabel}>Approve</Text>
            </Pressable>
          </View>
        </View>
      </Rise>
    </Animated.View>
  );
}

/** The design's `jrRise` — 10px up + fade, on mount. */
function Rise({ children, duration = 420 }: { children: React.ReactNode; duration?: number }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(v, { toValue: 1, duration, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [v, duration]);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>{children}</Animated.View>;
}

// ── glyphs (verbatim from the design's inline SVGs) ──
function ClockGlyph({ size = 12, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7v5l3.5 2" />
    </Svg>
  );
}
function CheckGlyph({ size = 16, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4 4 10-10" />
    </Svg>
  );
}
function XGlyph({ size = 15, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12" />
      <Path d="M18 6L6 18" />
    </Svg>
  );
}
function PeopleGlyph({ size = 13, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={8} cy={8.5} r={2.7} />
      <Path d="M3.4 18a4.6 4.6 0 0 1 9.2 0" />
      <Circle cx={16.5} cy={8} r={2.4} />
      <Path d="M15 13.4a4.4 4.4 0 0 1 5.6 4.2" />
    </Svg>
  );
}
function DotsGlyph({ size = 18, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={5} cy={12} r={1.7} />
      <Circle cx={12} cy={12} r={1.7} />
      <Circle cx={19} cy={12} r={1.7} />
    </Svg>
  );
}
function ShareGlyph({ size = 17, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 16V4" />
      <Path d="M8 7.5L12 3.5l4 4" />
      <Path d="M5 13v6.5h14V13" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },

  // squad header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 2, paddingTop: 2 },
  headerCrest: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.surfaceRecessed,
    boxShadow: `0 0 0 2px ${flColor.bronze400}, 0 4px 12px rgba(0,0,0,0.55), 0 0 10px rgba(186, 134, 84,0.2)`,
  },
  headerCrestPhoto: { width: '100%', height: '100%', borderRadius: flRadius.round },
  headerBody: { flex: 1, minWidth: 0, gap: 1 },
  headerName: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  headerMeta: { fontSize: 11.5, letterSpacing: 0.3, color: flColor.gray600 },

  // section
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 14, marginHorizontal: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: flRadius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.glowSubtle,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: flColor.onBronze },

  // request card
  card: { overflow: 'hidden', backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, boxShadow: flShadow.card },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, paddingLeft: 15, paddingRight: 13, paddingTop: 15 },
  identityBody: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', letterSpacing: -0.1, color: flColor.cream100 },
  sub: { marginTop: 1, fontSize: 12, color: flColor.gray600 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  trustChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: flRadius.pill, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  trustText: { fontSize: 11, fontWeight: '600', color: flColor.bronze300 },
  identityRight: { flexShrink: 0, alignItems: 'flex-end', gap: 9 },
  moreBtn: { width: 30, height: 30, marginTop: -4, marginRight: -4, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round },
  agePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal700 },
  ageText: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.2, color: flColor.gray400 },

  // note
  noteBox: { marginTop: 13, marginHorizontal: 15, paddingHorizontal: 12, paddingVertical: 9, borderRadius: flRadius.md, backgroundColor: 'rgba(255,255,255,0.022)', borderWidth: 1, borderColor: flColor.charcoal700 },
  noteText: { fontSize: 13, lineHeight: 18.85, fontStyle: 'italic', color: flColor.gray400 },
  readMore: { marginTop: 5, alignSelf: 'flex-start' },
  readMoreText: { fontSize: 11.5, fontWeight: '600', color: flColor.bronze400 },

  // actions — the design's 1 : 1.7 weighting, so Approve reads as the primary
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 15, paddingTop: 14, paddingBottom: 15 },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal700 },
  declinePressed: { opacity: 0.8, backgroundColor: flColor.charcoal800 },
  declineLabel: { fontSize: 13, fontWeight: '600', color: flColor.gray600 },
  approveBtn: { flex: 1.7, position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, boxShadow: flShadow.glowSubtle },
  approvePressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  approveLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.onBronze },
  btnBusy: { opacity: 0.6 },

  // footer
  footerNote: { marginTop: 26, alignItems: 'center', gap: 3 },
  footerBrand: { fontFamily: flFont.display, fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.charcoal500 },
  footerLine: { fontSize: 10, letterSpacing: 0.8, color: flColor.charcoal500 },

  // empty
  emptyWrap: { alignItems: 'center', paddingTop: 104, paddingHorizontal: 26 },
  emptyDisc: {
    width: 76,
    height: 76,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: 'rgba(186, 134, 84,0.07)',
    boxShadow: flShadow.glowSubtle,
  },
  emptyTitle: { marginTop: 20, fontFamily: flFont.display, fontSize: 21, fontWeight: '600', letterSpacing: -0.2, textAlign: 'center', color: flColor.cream100 },
  emptyText: { marginTop: 9, fontSize: 13.5, lineHeight: 21, textAlign: 'center', color: flColor.gray400, maxWidth: 250 },

  outlineBtn: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },

  // overflow menu
  menu: { paddingBottom: 4 },
  menuRow: { paddingVertical: 15 },
  menuRowDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  menuLabel: { fontSize: 15, color: flColor.cream100 },
  menuLabelDanger: { color: flColor.redMuted },
});
