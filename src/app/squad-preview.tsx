import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SquadCrest } from '@/components/forge/SquadCrest';
import { CommitmentPanel, AcceptCommitment } from '@/components/forge/compositions/Commitment';
import { GOAL_UNITS } from '@/data/squad-live';
import {
  athleteRoleLine,
  fetchSquadPreview,
  requestSquadJoin,
  withdrawSquadJoinRequest,
  type SquadMembership,
  type SquadPreviewMember,
} from '@/data/squad-discover-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Squad Preview — what a non-member sees before deciding to join. Built to `Squad Preview.dc.html`,
 * wired to real data (`squad_preview()`, migration 0051). This is where a Discover card lands.
 *
 * Faithful to the design: title-less AppBar (the hero carries identity) · shape-matched skeleton ·
 * hero (80px ringed crest · uppercase serif name · motto · join/category/capacity pills) · the
 * three-column stat strip (Members · Training Today · Founded) · Current Goal with the grow-in
 * progress bar · About under Smart Omission · the three-member roster peek with owner pill and
 * activity line · the privacy note · and the fixed commit bar with the same CTA branch as Discover.
 *
 * Three places the design's own record was broken, fixed here because the data is real:
 *   · "Open Squad" navigated to a HARDCODED squad id — it now opens the squad you're actually looking at.
 *   · The crest rendered an empty `image-slot` placeholder for every squad (the computed crest was
 *     never consumed). It now renders the squad's real photo, or its chosen crest glyph.
 *   · Roster avatars were arbitrary gradient tints. They're real photos with the design system's
 *     initials fallback, the same Avatar every other squad surface uses.
 *
 * Not carried over: the roster's green "online" dot — there is no presence subsystem, and a fabricated
 * dot is worse than none. The activity line covers what we genuinely know (a live check-in, or a
 * workout logged in the last day). The design's instant-join branch is gone too (0053,
 * Squad-Architecture-Amendment-003) — every public squad is request-to-join, so the join pill reads
 * Approval and the note lost its "open squad" variants.
 */

const FULL_NOTE = 'This squad has reached its size limit. New members are approved as spots open up — this keeps it small enough to train as one.';
const APPROVAL_NOTE = 'This squad reviews new members. Your request goes to the owner, who approves or declines it.';

/** Thousands compaction, and one decimal at most for a fractional metric (hours). 6180 → 6.2k. */
const fmt = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(Number(n.toFixed(1))));

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Squad age, at the design's granularity: "12 d" · "5 mo" · "2 yr". */
function founded(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const days = Math.floor(ms / DAY);
  if (days < 30) return `${Math.max(days, 0)} d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo`;
  return `${Math.floor(days / 365)} yr`;
}

/** The roster line's second half — only what we actually know. Null hides the separator too. */
function activityOf(m: SquadPreviewMember): string | null {
  if (m.checkedIn) return 'Active today';
  if (!m.lastWorkoutAt) return null;
  const ms = Date.now() - new Date(m.lastWorkoutAt).getTime();
  if (!Number.isFinite(ms) || ms < 0 || ms >= DAY) return null;
  if (ms < HOUR) return 'Trained just now';
  return `Trained ${Math.floor(ms / HOUR)}h ago`;
}


export default function SquadPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const squadId = String(id ?? '');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { data, loading, error, refetch } = useQuery(() => fetchSquadPreview(squadId), [squadId]);

  const [override, setOverride] = useState<SquadMembership | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  // Requesting carries an optional note — the message the owner reads in their Join Requests queue.
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  // SQ-D14 — a squad that states values doesn't take a request until they've been accepted.
  const [accepted, setAccepted] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/discover-squads'));

  const squad = data ?? null;
  const membership = override !== undefined ? override : squad?.membership ?? null;

  const run = (action: () => Promise<SquadMembership>, done: (next: SquadMembership) => void) => {
    if (busy) return;
    setBusy(true);
    action().then(
      (next) => {
        setBusy(false);
        setOverride(next);
        done(next);
        refetch();
      },
      (e: unknown) => {
        setBusy(false);
        showToast(errorMessage(e));
      },
    );
  };

  if (loading && !data) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
        <AppBar onBack={goBack} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <PreviewSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (error || !squad) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
        <AppBar onBack={goBack} />
        <View style={styles.center}>
          <Text style={styles.missingTitle}>{error ? 'Couldn’t load this squad.' : 'This squad isn’t available.'}</Text>
          {error ? <Text style={styles.missingBody}>{error}</Text> : <Text style={styles.missingBody}>It may be private, or it no longer exists.</Text>}
          <Pressable onPress={error ? refetch : goBack} accessibilityRole="button" accessibilityLabel={error ? 'Try again' : 'Back'} style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>{error ? 'Try Again' : 'Back'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // The size ceiling keeps a squad squad-sized rather than drifting into a community.
  const spotsLeft = Math.max(0, squad.memberCap - squad.memberCount);
  const isFull = squad.memberCount >= squad.memberCap;
  const nearlyFull = !isFull && spotsLeft <= 5;
  const hasCapacity = isFull || nearlyFull;

  const joined = membership === 'joined';
  const requested = membership === 'requested';

  const commit = joined
    ? { label: 'Open Squad', filled: false, onPress: () => router.replace({ pathname: '/squad/[id]', params: { id: squad.id } }) }
    : requested
      ? {
          label: 'Request Sent',
          filled: false,
          onPress: () =>
            run(
              async () => {
                await withdrawSquadJoinRequest(squad.id);
                return null;
              },
              () => showToast(`Request to ${squad.name} withdrawn`),
            ),
        }
      : {
          label: 'Request to Join',
          filled: true,
          onPress: () => {
            setNote('');
            setAccepted(false);
            setNoteOpen(true);
          },
        };

  const sendRequest = () => {
    setNoteOpen(false);
    run(
      async () => {
        await requestSquadJoin(squad.id, note, accepted);
        return 'requested';
      },
      () => showToast(`Request sent to ${squad.name}`),
    );
  };

  const joinNote = isFull
    ? FULL_NOTE
    : nearlyFull
      ? `Only ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left — send a request and the owner will review it.`
      : APPROVAL_NOTE;

  const hasGoal = squad.goalTarget != null && squad.goalTarget > 0;
  const goalPct = hasGoal ? Math.max(0, Math.min(100, Math.round((squad.goalProgress / squad.goalTarget!) * 100))) : 0;
  const goalUnit = GOAL_UNITS[squad.goalMetricKind];
  const overflowMembers = squad.memberCount - squad.roster.length;

  const stats = [
    { key: 'members', value: String(squad.memberCount), label: 'Members' },
    { key: 'today', value: String(squad.trainedToday), label: 'Training Today' },
    { key: 'founded', value: founded(squad.createdAt), label: 'Founded' },
  ];

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      {/* Title-less by design — the hero carries identity, so the bar doesn't repeat it. */}
      <AppBar onBack={goBack} />

      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <Rise duration={420}>
          <TourAnchor id="preview-identity" style={styles.hero}>
            <View style={styles.crest}>
              {squad.photoUrl ? <Image source={{ uri: squad.photoUrl }} style={styles.crestPhoto} contentFit="cover" /> : <SquadCrest crest={squad.crest} size={42} color={flColor.bronze300} strokeWidth={1.5} />}
            </View>
            <Text style={styles.name}>{squad.name}</Text>
            {squad.motto ? <Text style={styles.motto}>{squad.motto}</Text> : null}

            <View style={styles.pillRow}>
              <View style={[styles.pill, styles.pillApproval]}>
                <LockGlyph size={12} color={flColor.bronze300} />
                <Text style={[styles.pillText, styles.pillTextBronze]}>Approval</Text>
              </View>

              {squad.category ? (
                <View style={[styles.pill, styles.pillCategory]}>
                  <FlameGlyph size={12} color={flColor.bronze400} />
                  <Text style={[styles.pillText, styles.pillTextMuted]}>{squad.category}</Text>
                </View>
              ) : null}

              {hasCapacity ? (
                <View style={[styles.pill, isFull ? styles.pillFull : styles.pillNear]}>
                  <PeopleGlyph size={12} color={isFull ? flColor.gray600 : flColor.bronze300} />
                  <Text style={[styles.pillText, isFull ? styles.pillTextDim : styles.pillTextBronze]}>{isFull ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}</Text>
                </View>
              ) : null}
            </View>
          </TourAnchor>
        </Rise>

        {/* ── Stat strip ── */}
        <View style={styles.statStrip}>
          {stats.map((s, i) => (
            <View key={s.key} style={[styles.statCol, i > 0 ? styles.statColDivided : null]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Current Goal (omitted until the squad sets one) ── */}
        {hasGoal ? (
          <>
            <Text style={styles.sectionLabel}>Current Goal</Text>
            <View style={styles.card}>
              <Text style={styles.goalKicker}>Squad Goal</Text>
              <Text style={styles.goalTitle}>{squad.goal || `Reach ${squad.goalTarget} ${goalUnit}`}</Text>
              <GoalBar pct={goalPct} />
              <Text style={styles.goalCount}>
                {fmt(Math.min(squad.goalProgress, squad.goalTarget!))} / {fmt(squad.goalTarget!)} {goalUnit} · {goalPct}%
              </Text>
            </View>
          </>
        ) : null}

        {/* ── About (omitted when there's no description) ── */}
        {squad.description && squad.description.trim() ? (
          <>
            <Text style={styles.sectionLabel}>About</Text>
            <View style={styles.card}>
              <Text style={styles.aboutText}>{squad.description}</Text>
            </View>
          </>
        ) : null}

        {/* ── Commitment (SQ-D14) — what this squad asks of its members ── */}
        {squad.commitment ? (
          <>
            <Text style={styles.sectionLabel}>Commitment</Text>
            <CommitmentPanel text={squad.commitment} />
          </>
        ) : null}

        {/* ── Members peek ── */}
        <TourAnchor id="preview-roster" style={styles.membersHeader}>
          <Text style={styles.sectionLabelInline}>Members</Text>
          <Text style={styles.membersCount}>
            {squad.memberCount} {squad.memberCount === 1 ? 'Member' : 'Members'}
          </Text>
        </TourAnchor>
        <View style={styles.membersCard}>
          {squad.roster.map((m, i) => {
            const activity = activityOf(m);
            return (
              <View key={m.id} style={[styles.memberRow, i > 0 ? styles.memberRowDivided : null]}>
                <Avatar src={m.avatarUrl ?? undefined} name={m.name} size="listRow" />
                <View style={styles.memberBody}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <View style={styles.memberMeta}>
                    <Text style={styles.memberRole}>{athleteRoleLine(m)}</Text>
                    {activity ? (
                      <>
                        <Text style={styles.memberDot}>·</Text>
                        <Text style={[styles.memberRole, m.checkedIn ? styles.memberActive : null]}>{activity}</Text>
                      </>
                    ) : null}
                  </View>
                </View>
                {m.isOwner ? (
                  <View style={styles.ownerPill}>
                    <CrownGlyph size={11} color={flColor.bronze300} />
                    <Text style={styles.ownerPillText}>Owner</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
          {overflowMembers > 0 ? (
            <View style={styles.membersFooter}>
              <Text style={styles.membersFooterText}>
                and {overflowMembers} more {overflowMembers === 1 ? 'member' : 'members'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Privacy note ── */}
        <View style={styles.note}>
          <View style={styles.noteIcon}>
            <LockGlyph size={14} color={flColor.bronze400} />
          </View>
          <Text style={styles.noteText}>{joinNote}</Text>
        </View>
      </ScrollView>

      {/* ── Commit bar ── */}
      <TourAnchor id="preview-request">
      <LinearGradient colors={['rgba(9,9,9,0.55)', 'rgba(9,9,9,0.86)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[styles.commitBar, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          onPress={commit.onPress}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`${commit.label} — ${squad.name}`}
          style={({ pressed }) => [styles.commitBtn, commit.filled ? styles.commitBtnFilled : styles.commitBtnDone, pressed ? styles.commitBtnPressed : null, busy ? styles.commitBtnBusy : null]}
        >
          {commit.filled ? (
            <LinearGradient colors={flGradient.bronzeFill.colors} locations={flGradient.bronzeFill.locations} start={flGradient.bronzeFill.start} end={flGradient.bronzeFill.end} style={StyleSheet.absoluteFill} />
          ) : null}
          {busy ? (
            <ActivityIndicator color={commit.filled ? flColor.bronze300 : flColor.gray400} />
          ) : commit.filled ? (
            <PlusGlyph size={16} color={flColor.bronze300} />
          ) : (
            <CheckGlyph size={16} color={flColor.gray400} />
          )}
          <Text style={[styles.commitLabel, commit.filled ? null : styles.commitLabelDone]}>{commit.label}</Text>
        </Pressable>
      </LinearGradient>
      </TourAnchor>

      <ScreenTour screenKey="squad-preview" />

      {/* ── Request note — what the owner reads in their queue ── */}
      <BottomSheet
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title={`Request to Join ${squad.name}`}
        footer={
          <View style={styles.sheetFooter}>
            <View style={styles.footerCancel}>
              <Button variant="secondary" fullWidth onPress={() => setNoteOpen(false)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
            <View style={styles.footerSend}>
              <Button variant="primary" fullWidth disabled={!!squad.commitment && !accepted} onPress={sendRequest} accessibilityLabel="Send request">
                Send Request
              </Button>
            </View>
          </View>
        }
      >
        <View style={styles.sheetBody}>
          <Text style={styles.sheetLabel}>Message to the owner</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Tell them why you want to train with this squad. (Optional)"
            placeholderTextColor={flColor.gray600}
            maxLength={280}
            multiline
            autoCorrect
            textAlignVertical="top"
            accessibilityLabel="Message to the owner"
            style={styles.sheetInput}
          />
          <Text style={styles.sheetCount}>{note.length}/280</Text>

          {squad.commitment ? (
            <View style={styles.sheetCommitment}>
              <CommitmentPanel text={squad.commitment} intro="This squad asks its members to:" />
              <AcceptCommitment accepted={accepted} onToggle={() => setAccepted((v) => !v)} />
            </View>
          ) : null}
        </View>
      </BottomSheet>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/** The design's `pvBar` — the fill grows from zero on mount rather than snapping to its value. */
function GoalBar({ pct }: { pct: number }) {
  const [w] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(w, { toValue: pct, duration: 900, useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [w, pct]);
  return (
    <View style={styles.goalTrack}>
      <Animated.View style={[styles.goalFill, { width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}>
        <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

/** The design's `pvRise` — 10px up + fade, on mount. */
function Rise({ children, duration = 420 }: { children: React.ReactNode; duration?: number }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(v, { toValue: 1, duration, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [v, duration]);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>{children}</Animated.View>;
}

function Bone({ w, h, r = flRadius.sm, style, opacity }: { w: number | `${number}%`; h: number; r?: number; style?: object; opacity: Animated.Value }) {
  return <Animated.View style={[styles.bone, { width: w, height: h, borderRadius: r, opacity }, style]} />;
}

/** Shape-matched to the real screen — crest, name, motto, pills, then the three cards. */
function PreviewSkeleton() {
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
    <>
      <View style={styles.skelHero}>
        <Bone w={80} h={80} r={flRadius.round} opacity={opacity} />
        <Bone w="66%" h={22} style={{ marginTop: 16 }} opacity={opacity} />
        <Bone w="50%" h={13} style={{ marginTop: 11 }} opacity={opacity} />
        <Bone w={180} h={24} r={flRadius.pill} style={{ marginTop: 14 }} opacity={opacity} />
      </View>
      <Bone w="100%" h={64} r={flRadius.lg} style={{ marginTop: 22 }} opacity={opacity} />
      <Bone w="100%" h={104} r={flRadius.lg} style={{ marginTop: 26 }} opacity={opacity} />
      <Bone w="100%" h={150} r={flRadius.lg} style={{ marginTop: 26 }} opacity={opacity} />
    </>
  );
}

// ── glyphs (verbatim from the design's inline SVGs) ──
function LockGlyph({ size = 12, color = flColor.bronze400 }: { size?: number; color?: string }) {
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
function FlameGlyph({ size = 12, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z" />
    </Svg>
  );
}
function CrownGlyph({ size = 11, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function PlusGlyph({ size = 16, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function CheckGlyph({ size = 16, color = flColor.gray400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4 4 10-10" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 34 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },

  // hero
  hero: { alignItems: 'center' },
  crest: {
    width: 80,
    height: 80,
    flexShrink: 0,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.surfaceRecessed,
    boxShadow: `0 0 0 2.5px ${flColor.bronze400}, 0 8px 22px rgba(0,0,0,0.6), 0 0 18px rgba(186, 134, 84,0.3)`,
  },
  crestPhoto: { width: '100%', height: '100%', borderRadius: flRadius.round },
  name: { marginTop: 13, maxWidth: 300, fontFamily: flFont.display, fontSize: 26, fontWeight: '600', letterSpacing: 0.3, lineHeight: 28, textTransform: 'uppercase', textAlign: 'center', color: flColor.cream100 },
  motto: { marginTop: 7, maxWidth: 280, fontSize: 14, lineHeight: 19.6, textAlign: 'center', color: flColor.gray400 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: flRadius.pill, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  pillApproval: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorderSubtle },
  pillTextBronze: { color: flColor.bronze300 },
  pillCategory: { paddingHorizontal: 11, backgroundColor: flColor.charcoal800, borderColor: flColor.charcoal600 },
  pillTextMuted: { color: flColor.gray400 },
  pillFull: { backgroundColor: flColor.charcoal800, borderColor: flColor.charcoal600 },
  pillTextDim: { color: flColor.gray600 },
  pillNear: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorderSubtle },

  // stat strip
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

  // sections + cards
  sectionLabel: { marginTop: 22, marginBottom: 12, marginHorizontal: 4, fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  sectionLabelInline: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  card: { backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, boxShadow: flShadow.card, paddingHorizontal: 15, paddingVertical: 16 },

  // goal
  goalKicker: { marginBottom: 7, fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  goalTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', lineHeight: 23, color: flColor.cream100 },
  goalTrack: { marginTop: 14, height: 10, borderRadius: flRadius.pill, overflow: 'hidden', backgroundColor: flColor.charcoal700, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)' },
  goalFill: { height: '100%', borderRadius: flRadius.pill, overflow: 'hidden', boxShadow: flShadow.glowSubtle },
  goalCount: { marginTop: 9, fontSize: 12, fontWeight: '500', letterSpacing: 0.3, color: flColor.gray400 },

  // about
  aboutText: { fontSize: 13.5, lineHeight: 21, color: flColor.gray400 },

  // members
  membersHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 12, marginHorizontal: 4 },
  membersCount: { fontSize: 11.5, color: flColor.gray600 },
  membersCard: { overflow: 'hidden', backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, boxShadow: flShadow.card },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, paddingVertical: 12 },
  memberRowDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  memberBody: { flex: 1, minWidth: 0, gap: 2 },
  memberName: { fontSize: 14.5, color: flColor.cream100 },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberRole: { fontSize: 12, color: flColor.gray600 },
  memberDot: { fontSize: 12, color: flColor.charcoal500 },
  memberActive: { color: '#8FB295' },
  ownerPill: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: flRadius.pill, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  ownerPillText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.bronze300 },
  membersFooter: { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: flColor.charcoal700, alignItems: 'center' },
  membersFooterText: { fontSize: 12, color: flColor.gray600 },

  // privacy note
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginTop: 22, paddingHorizontal: 15, paddingVertical: 14, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal700, borderRadius: flRadius.lg },
  noteIcon: { flexShrink: 0, marginTop: 1 },
  noteText: { flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 18.75, color: flColor.gray400 },

  // commit bar
  commitBar: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700, boxShadow: '0 -10px 26px rgba(0,0,0,0.4)' },
  commitBtn: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15, borderRadius: flRadius.md, borderWidth: 1 },
  commitBtnFilled: { borderColor: flColor.bronzeBorder, boxShadow: flShadow.glowSubtle },
  commitBtnDone: { borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  commitBtnPressed: { transform: [{ scale: 0.99 }], opacity: 0.9 },
  commitBtnBusy: { opacity: 0.6 },
  commitLabel: { fontSize: 15, fontWeight: '600', color: flColor.onBronze },
  commitLabelDone: { color: flColor.gray400 },

  // request-note sheet
  sheetBody: { gap: 8 },
  sheetLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.bronze400 },
  sheetInput: {
    minHeight: 96,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14.5,
    lineHeight: 21,
    color: flColor.cream100,
    backgroundColor: flColor.charcoal900,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.md,
  },
  sheetCount: { alignSelf: 'flex-end', fontSize: 11, color: flColor.gray600 },
  sheetCommitment: { marginTop: 6 },
  sheetFooter: { flexDirection: 'row', gap: 10 },
  footerCancel: { flex: 1 },
  footerSend: { flex: 1.7 },

  // skeleton
  skelHero: { alignItems: 'center' },
  bone: { backgroundColor: flColor.charcoal700 },

  outlineBtn: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
