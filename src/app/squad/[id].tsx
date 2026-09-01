import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { AckGlyph } from '@/components/forge/AckGlyph';
import { ScreenBackground } from '@/components/screen-background';
import { CalendarField } from '@/components/forge/composites/CalendarField';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG, BG_RADIAL } from '@/constants/backgrounds';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { SquadCrest } from '@/components/forge/SquadCrest';
import { UploadError } from '@/lib/storage-upload';
import { fetchSquadInvite, GOAL_UNITS, fetchSquad, fetchSquadCheckins, uploadCheckinVideo, postCheckin, markCheckinViewed, setSquadGoal, clearSquadGoal, deleteSquad, removeSquadMember, type SquadCheckin, type SquadMemberView, type SquadGoalMetric } from '@/data/squad-live';
import { CHALLENGE_TYPES, daysLeft, fetchSquadActiveChallenge, fetchSquadHall, formatScore, placeLabel } from '@/data/challenges-live';
import {
  detailFor,
  ensureWeeklyRecap,
  fetchSquadFeed,
  fetchMyReactionKinds,
  setSquadReactionKind,
  ACK_KINDS,
  ACK_LABEL,
  type AckKind,
  asTransformationLayout,
  isProgressCard,
  leadFor,
  recapSummaryLine,
  timeAgo,
  toggleSquadReaction,
  type ProgressPostCard as ProgressCardData,
  type SquadFeedPost,
  type SquadPostType,
} from '@/data/squad-feed-live';
import { ProgressPostCard } from '@/components/forge/ProgressPostCard';
import { TransformationLayout } from '@/components/forge/TransformationLayout';
import { EndOfLedger, LedgerPost, recapMarker, workoutStats, type LedgerMarker } from '@/components/forge/compositions/LedgerPost';
import { openPlaylist } from '@/components/forge/composites/Playlist';
import { useQuery } from '@/lib/useQuery';
import { useUnits } from '@/lib/settings';
import { callerModalGone, useMediaPicker } from '@/lib/useMediaPicker';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';
import { textHalo } from '@/constants/washes';

/**
 * Squad Detail (S-2) — built to `Squad Detail.dc.html`, scoped to what Squad Core can back with real data.
 *
 * Real, design-faithful sections: the monumental hero (name · tagline · 92px crest/photo · member count →
 * Members · "N training today"), the Current Goal (title · progress bar · % — set/edit via the Edit-Goal
 * sheet), the full-screen Members page, and the owner Options sheet (Settings · Invite · Delete → confirm).
 * The design's check-ins / mission / competitions / hall / feed / honors / analytics sections need their own
 * Social backends and are intentionally omitted (later parts) — not stubbed with fake data.
 */
/**
 * Goal-window date helpers. Deliberately LOCAL-DATE, not UTC: `new Date('2026-03-01')` parses as UTC
 * midnight, which is the previous evening for anyone west of Greenwich — a squad in Denver setting a goal
 * to start on the 1st would have it start on Feb 28th. Building from parts keeps the date the athlete typed.
 */
function parseYmd(text: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const [y, mo, da] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(y, mo - 1, da);
  // Rejects 2026-02-31 and friends, which `new Date` would silently roll forward into March.
  return d.getFullYear() === y && d.getMonth() === mo - 1 && d.getDate() === da ? d : null;
}

const ymdToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A deadline of "the 31st" has to include the 31st. */
const endOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const SQUAD_METRICS: [SquadGoalMetric, string][] = [
  ['workout_count', 'Workouts'],
  ['distance_total', 'Distance'],
  ['volume_total', 'Volume'],
  ['time_total', 'Time'],
  ['pr_count', 'PRs'],
];
const SQUAD_DIST_ACTS: [string, string][] = [
  ['running', 'Run'],
  ['walking', 'Walk'],
  ['cycling', 'Bike'],
  ['rowing', 'Row'],
  ['swimming', 'Swim'],
];
const GOAL_TARGET_LABEL: Record<SquadGoalMetric, string> = {
  workout_count: 'Target (workouts)',
  distance_total: 'Target (miles)',
  volume_total: 'Target (lbs)',
  time_total: 'Target (hours)',
  pr_count: 'Target (PRs)',
};
const GOAL_TARGET_PLACEHOLDER: Record<SquadGoalMetric, string> = {
  workout_count: '500',
  distance_total: '200',
  volume_total: '1000000',
  time_total: '100',
  pr_count: '25',
};
const goalUnit = (kind: SquadGoalMetric): string => GOAL_UNITS[kind];
const fmtProgress = (n: number): string => String(Number(n.toFixed(1)));

export default function SquadDetailRoute() {
  const { id, editGoal } = useLocalSearchParams<{ id: string; editGoal?: string }>();
  const router = useRouter();
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const squadId = String(id ?? '');
  const { data, loading, error, refetch } = useQuery(() => fetchSquad(squadId), [squadId]);
  const { showToast } = useToast();
  const { pick, mediaPickerSheet } = useMediaPicker();
  /* Volume on a squadmate's shared workout is stored in pounds and shown in YOUR unit — the feed had
     been printing the canonical figure unconverted and unlabelled. */
  const { units } = useUnits();

  const [feedLimit, setFeedLimit] = useState(5);
  const [reactMap, setReactMap] = useState<Record<string, { on: boolean; n: number }>>({});
  /** Which acknowledgement I left on each post — read for the whole feed in one query. */
  const [kindMap, setKindMap] = useState<Record<string, AckKind>>({});
  /** The post whose kind chooser is open. PO: the four kinds must be reachable ON THE FEED. */
  const [ackFor, setAckFor] = useState<string | null>(null);
  // SQ-D8: no scheduler exists, so the first athlete to open the feed in a new week generates that
  // week's recap. Awaited before the read so it lands in this page rather than the next one.
  const { data: feedData, refetch: refetchFeed } = useQuery(async () => {
    await ensureWeeklyRecap(squadId);
    return fetchSquadFeed(squadId, feedLimit);
  }, [squadId, feedLimit]);
  const { data: checkinsData, refetch: refetchCheckins } = useQuery(() => fetchSquadCheckins(squadId), [squadId]);
  // Whether YOU may hand out this squad's code — owner always, members only if the owner opened it
  // up (0056). Resolved server-side; the Options row follows it rather than assuming.
  const { data: inviteInfo } = useQuery(() => fetchSquadInvite(squadId), [squadId]);
  // Its own tolerant read: a squad with no competition — or an unapplied migration — must not take the
  // whole screen down, so the section is simply absent rather than the page erroring.
  const { data: liveChallenge } = useQuery(() => fetchSquadActiveChallenge(squadId).catch(() => null), [squadId]);
  const { data: hall } = useQuery(() => fetchSquadHall(squadId).catch(() => null), [squadId]);
  const titles = hall?.entries.length ?? 0;
  const canInvite = inviteInfo?.canInvite ?? false;

  const [checkinViewer, setCheckinViewer] = useState<SquadCheckin | null>(null);
  const [uploadingCheckin, setUploadingCheckin] = useState(false);
  const [checkinPct, setCheckinPct] = useState(0);
  const checkinAbortRef = useRef<AbortController | null>(null);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());

  const [view, setView] = useState<'detail' | 'members'>('detail');
  const [memberAction, setMemberAction] = useState<SquadMemberView | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<SquadMemberView | null>(null);
  const [removing, setRemoving] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  /*
   * The goal editor opens EITHER from the pencil here or from `?editGoal=1`, which is how Squad Goal
   * Detail hands the athlete back for an edit. Derived rather than opened from an effect: this repo's
   * react-compiler rules make a synchronous `setState` in an effect body an ERROR, and a pure `||` says
   * the same thing without one. `goalDismissed` is what lets Close actually close it while the param
   * is still on the URL.
   */
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDismissed, setGoalDismissed] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetText, setGoalTargetText] = useState('');
  const [goalMetricKind, setGoalMetricKind] = useState<SquadGoalMetric>('workout_count');
  const [goalMetricKey, setGoalMetricKey] = useState<string | null>(null);
  const [goalStartText, setGoalStartText] = useState('');
  const [goalEndText, setGoalEndText] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchFeed();
      refetchCheckins();
      setReactMap({}); // let fresh server truth win each time the screen regains focus
      setKindMap({});
    }, [refetch, refetchFeed, refetchCheckins]),
  );

  /*
   * Which acknowledgement I left on each visible post — one query for the page.
   *
   * ⚠ IT SITS HERE, WITH THE OTHER HOOKS, AND NOT BESIDE `feedPosts` WHERE IT READS MORE NATURALLY.
   * There is an early return between the two, so declaring it down there made this a CONDITIONAL hook —
   * React would have thrown "rendered fewer hooks than expected" the first time the screen went from
   * loading to loaded. Derived from `feedData` directly for the same reason.
   *
   * Absent from the map reads as `respect`, so a feed whose kinds fail to load still draws correctly.
   */
  const feedIds = (feedData ?? []).map((p) => p.id).join(',');
  useEffect(() => {
    if (!feedIds) return;
    let alive = true;
    void fetchMyReactionKinds(feedIds.split(',')).then((m) => {
      if (alive) setKindMap((prev) => ({ ...m, ...prev }));
    });
    return () => {
      alive = false;
    };
  }, [feedIds]);

  const squad = data?.squad;
  const members = data?.members ?? [];

  if (loading && !data) {
    return (
      <View style={styles.root}>
        <DetailBg />
        <AppBar title="" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }
  if (!squad) {
    return (
      <View style={styles.root}>
        <DetailBg />
        <AppBar title="" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.missingTitle}>This squad isn’t available.</Text>
          <Text style={styles.missingBody}>{error ? 'Couldn’t load it — check your connection.' : 'It may have been deleted.'}</Text>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to squads" style={styles.backBtn}>
            <Text style={styles.backText}>Back to Squads</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Members page (full-screen) ──
  if (view === 'members') {
    return (
      <View style={styles.root}>
        <DetailBg />
        <AppBar title="Members" onBack={() => setView('detail')} />
        <ScrollView contentContainerStyle={styles.membersScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.membersHead}>
            <Text style={styles.membersSquad}>{squad.name}</Text>
            <Text style={styles.membersCount}>{members.length === 1 ? '1 member' : `${members.length} members`}</Text>
          </View>
          <View style={styles.membersCard}>
            {members.map((m, i) => (
              <MemberRow
                key={m.id}
                member={m}
                last={i === members.length - 1}
                onOpen={() => router.push({ pathname: '/athlete/[id]', params: { id: m.id } })}
                onManage={squad.isOwner && !m.isSelf ? () => setMemberAction(m) : undefined}
              />
            ))}
          </View>
          {squad.isOwner && members.length > 1 ? <Text style={styles.membersHint}>Tap a member to transfer ownership or remove them.</Text> : null}
        </ScrollView>

        {/* member action sheet (owner) */}
        <BottomSheet open={!!memberAction} onClose={() => setMemberAction(null)} title={memberAction?.name}>
          <View style={styles.optionsList}>
            <OptionRow
              icon={<CrownIcon />}
              label={`Make ${memberAction ? memberAction.name.split(' ')[0] : ''} owner`}
              onPress={() => {
                const mid = memberAction?.id;
                setMemberAction(null);
                if (mid) router.push({ pathname: '/squad-transfer', params: { id: squad.id, member: mid } });
              }}
            />
            <OptionRow
              icon={<TrashIcon />}
              label="Remove from squad"
              divided
              danger
              onPress={() => {
                const m = memberAction;
                setMemberAction(null);
                setConfirmRemove(m);
              }}
            />
          </View>
        </BottomSheet>

        {/* remove confirm */}
        <Modal visible={!!confirmRemove} transparent animationType="fade" onRequestClose={() => setConfirmRemove(null)}>
          <View style={styles.confirmBackdrop}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Remove {confirmRemove?.name}?</Text>
              <Text style={styles.confirmBody}>They’ll lose access to {squad.name} and stop sharing progress here. You can invite them back later.</Text>
              <View style={styles.confirmActions}>
                <Button
                  variant="destructive"
                  fullWidth
                  disabled={removing}
                  onPress={() => {
                    if (!confirmRemove || removing) return;
                    setRemoving(true);
                    removeSquadMember(squad.id, confirmRemove.id).then(
                      () => {
                        setRemoving(false);
                        setConfirmRemove(null);
                        refetch();
                        showToast('Member removed');
                      },
                      (e: unknown) => {
                        setRemoving(false);
                        showToast(e instanceof Error ? e.message : 'Couldn’t remove the member.');
                      },
                    );
                  }}
                  accessibilityLabel="Remove member"
                >
                  {removing ? 'Removing…' : 'Remove'}
                </Button>
                <Button variant="secondary" fullWidth onPress={() => setConfirmRemove(null)} accessibilityLabel="Cancel">
                  Cancel
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ── Detail ──
  const goalPct = squad.goalTarget ? Math.min(100, Math.round((squad.goalProgress / squad.goalTarget) * 100)) : 0;
  /**
   * The window. A calendar grid picks both, so the only thing left to check is their ORDER — the picker
   * cannot produce a malformed date, which is most of why it replaced the two text fields.
   *
   * A blank START means "from today". A blank END means no deadline at all — the pre-0103 behaviour, still
   * entirely valid, and plenty of squad goals are "until we get there".
   */
  const parsedStart = parseYmd(goalStartText);
  const parsedEnd = parseYmd(goalEndText);
  // The DB enforces this too (`squads_goal_window_check`); catching it here turns a 400 into a sentence.
  const windowOk = !(parsedStart && parsedEnd) || parsedEnd > parsedStart;
  const goalValid = Number(goalTargetText) >= 1 && windowOk;
  const windowError = windowOk ? null : 'The end date has to come after the start.';
  const feedPosts = feedData ?? [];

  const canLoadMore = feedPosts.length === feedLimit;
  const checkinPeople = checkinsData?.members ?? [];
  const iHaveActive = checkinsData?.iHaveActive ?? false;

  const openGoalEditor = () => {
    setGoalTitle(squad.goal ?? '');
    setGoalTargetText(squad.goalTarget != null ? String(squad.goalTarget) : '');
    setGoalMetricKind(squad.goalMetricKind);
    setGoalMetricKey(squad.goalMetricKey);
    setGoalStartText(squad.goalStartedAt ? squad.goalStartedAt.slice(0, 10) : ymdToday());
    setGoalEndText(squad.goalEndsAt ? squad.goalEndsAt.slice(0, 10) : '');
    setOptionsOpen(false);
    setGoalOpen(true);
  };
  const saveGoal = () => {
    if (!goalValid || savingGoal) return;
    setSavingGoal(true);
    setSquadGoal(squad.id, {
      title: goalTitle,
      target: Number(goalTargetText),
      metricKind: goalMetricKind,
      metricKey: goalMetricKind === 'distance_total' ? goalMetricKey ?? 'running' : null,
      // Blank start = today. The end is stored at the END of its day, so "ends 2026-03-31" includes the
      // 31st — a deadline that silently excluded its own date would be a quiet lie.
      startsAt: (parsedStart ?? new Date()).toISOString(),
      endsAt: parsedEnd ? endOfDay(parsedEnd).toISOString() : null,
    }).then(
      () => {
        setSavingGoal(false);
        setGoalOpen(false);
        setGoalDismissed(true); // …or the `?editGoal=1` on the URL would reopen it the moment it closed
        refetch();
        showToast('Goal updated');
      },
      (e: unknown) => {
        setSavingGoal(false);
        showToast(e instanceof Error ? e.message : 'Couldn’t save the goal.');
      },
    );
  };
  const removeGoal = () => {
    if (savingGoal) return;
    setSavingGoal(true);
    clearSquadGoal(squad.id).then(
      () => {
        setSavingGoal(false);
        setGoalOpen(false);
        setGoalDismissed(true);
        refetch();
      },
      () => setSavingGoal(false),
    );
  };
  /**
   * Record and post a check-in.
   *
   * The upload reports real bytes now (see `storage-upload.ts`), so the CTA shows a percentage and a
   * second tap cancels. Before this it was a bare spinner over a heap-blob upload with no timeout —
   * which is to say "uploading", "stalled" and "the app is about to die" were the same picture, and the
   * athlete's only move was to wait.
   */
  const startCheckin = async () => {
    if (uploadingCheckin) {
      checkinAbortRef.current?.abort();
      return;
    }
    const asset = await pick({
      kind: 'videos',
      directCamera: true, // a check-in is a record-now moment — straight to the front camera, no library
      videoMaxDuration: 30,
      quality: 0.7,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!asset?.uri) return;
    if (asset.duration != null && asset.duration > 31000) {
      showToast('Keep your check-in to 30 seconds or less.');
      return;
    }
    const controller = new AbortController();
    checkinAbortRef.current = controller;
    setCheckinPct(0);
    setUploadingCheckin(true);
    try {
      const url = await uploadCheckinVideo(squad.id, asset.uri, {
        contentType: asset.mimeType,
        onProgress: setCheckinPct,
        signal: controller.signal,
      });
      await postCheckin(squad.id, url);
      refetchCheckins();
      refetch();
      showToast('Checked in');
    } catch (e: unknown) {
      // `UploadError.message` is already a sentence with the real numbers in it — don't paraphrase it.
      if (e instanceof UploadError && e.kind === 'cancelled') showToast('Check-in cancelled.');
      else showToast(e instanceof Error ? e.message : 'Couldn’t post your check-in.');
    } finally {
      checkinAbortRef.current = null;
      setUploadingCheckin(false);
      setCheckinPct(0);
    }
  };
  const openCheckin = (c: SquadCheckin) => {
    setCheckinViewer(c);
    if (!c.watched && !watchedIds.has(c.id)) {
      setWatchedIds((s) => new Set(s).add(c.id));
      void markCheckinViewed(c.id);
    }
  };

  // The name rides along so the composer — and Progress Photo Post beyond it — can say "Post to Iron
  // Vigil" without a second round trip for a string this screen already has.
  const goCompose = () => router.push({ pathname: '/squad-composer', params: { id: squad.id, owner: squad.isOwner ? '1' : '0', name: squad.name } });
  const openPost = (pid: string) => router.push({ pathname: '/squad-post/[id]', params: { id: pid } });
  const onReactCard = (p: SquadFeedPost) => {
    const reacted = reactMap[p.id]?.on ?? p.iReacted;
    const count = reactMap[p.id]?.n ?? p.respectCount;
    const next = !reacted;
    setReactMap((m) => ({ ...m, [p.id]: { on: next, n: Math.max(0, count + (next ? 1 : -1)) } }));
    toggleSquadReaction(p.id, reacted).catch(() => setReactMap((m) => ({ ...m, [p.id]: { on: reacted, n: count } })));
  };

  /**
   * Pick a kind straight from the feed row.
   *
   * PO: *"When trying to acknowledge in different ways on the squad feed I can only click and hold for
   * the different options after clicking on the post. I should be able to do it right on the feed page."*
   * The row has accepted an `onLongAcknowledge` since it was written; the feed simply never passed one,
   * so the gesture was dead here and worked one screen deeper.
   *
   * Acknowledges if they had not yet — choosing "Support" on a post you have not acknowledged is
   * obviously an acknowledgement, and making them tap first would be a riddle.
   */
  const onPickKind = (postId: string, kind: AckKind) => {
    setAckFor(null);
    const p = feedPosts.find((x) => x.id === postId);
    if (!p) return;
    const wasReacted = reactMap[postId]?.on ?? p.iReacted;
    const count = reactMap[postId]?.n ?? p.respectCount;
    const prev = kindMap[postId];
    setKindMap((m) => ({ ...m, [postId]: kind }));
    if (!wasReacted) setReactMap((m) => ({ ...m, [postId]: { on: true, n: count + 1 } }));
    setSquadReactionKind(postId, kind).catch(() => {
      setKindMap((m) => ({ ...m, [postId]: prev ?? 'respect' }));
      if (!wasReacted) setReactMap((m) => ({ ...m, [postId]: { on: wasReacted, n: count } }));
      showToast('Couldn’t save that.');
    });
  };

  const doDelete = () => {
    if (deleting) return;
    setDeleting(true);
    deleteSquad(squad.id).then(
      () => router.replace('/(tabs)/squads'),
      (e: unknown) => {
        setDeleting(false);
        showToast(e instanceof Error ? e.message : 'Couldn’t delete the squad.');
      },
    );
  };

  return (
    <View style={styles.root}>
      <DetailBg />
      <AppBar
        title=""
        onBack={() => router.back()}
        actions={
          <Pressable onPress={() => setOptionsOpen(true)} accessibilityRole="button" accessibilityLabel="Squad options" style={styles.iconBtn} hitSlop={8}>
            <OverflowIcon />
          </Pressable>
        }
      />

      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroHead}>
            <View style={styles.heroText}>
              <Text style={styles.squadName}>{squad.name}</Text>
              {squad.motto ? (
                <Text style={styles.tagline} numberOfLines={2}>
                  {squad.motto}
                </Text>
              ) : null}
            </View>
            <View style={styles.crest}>
              {squad.photoUrl ? <Image source={{ uri: squad.photoUrl }} style={styles.crestPhoto} contentFit="cover" /> : <SquadCrest crest={squad.crest} size={42} />}
            </View>
          </View>

          <TourAnchor id="squad-hero" style={styles.metaRow}>
            <Pressable onPress={() => setView('members')} accessibilityRole="button" accessibilityLabel={`${members.length} members, view roster`} hitSlop={6} style={styles.metaBtn}>
              <PeopleIcon size={14} color={flColor.gray400} />
              <Text style={styles.metaText}>{members.length === 1 ? '1 member' : `${members.length} members`}</Text>
            </Pressable>
            <View style={styles.metaDot} />
            <View style={styles.metaBtn}>
              <View style={styles.greenDot} />
              <Text style={styles.metaText}>{squad.trainedToday} training today</Text>
            </View>
          </TourAnchor>

          <View style={styles.heroDivider} />

          {/* CHECK-INS — ephemeral video stories (latest per member, <24h) */}
          <TourAnchor id="squad-checkins" style={styles.checkinsSection}>
            <View style={styles.checkinHead}>
              <Text style={styles.feedLabel}>Check-ins</Text>
              <Text style={styles.checkinDate}>Video · disappears in 24h</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.checkinStrip}>
              {iHaveActive ? null : <CheckinCta onPress={() => void startCheckin()} uploading={uploadingCheckin} pct={checkinPct} />}
              {checkinPeople.map((m) => (
                <CheckinDisc key={m.id} member={m} watched={m.watched || watchedIds.has(m.id)} onPress={() => openCheckin(m)} />
              ))}
            </ScrollView>
            {iHaveActive || checkinPeople.length ? null : <Text style={styles.checkinEmpty}>Be the first — post a quick video and let the squad see your effort.</Text>}
          </TourAnchor>

          {/* CURRENT GOAL */}
          {squad.goalTarget != null ? (
            <TourAnchor id="squad-goal">
              <View style={styles.goalHead}>
                <Text style={styles.sectionLabel}>Current Goal</Text>
                {squad.isOwner ? (
                  <Pressable onPress={openGoalEditor} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit goal">
                    <PencilIcon />
                  </Pressable>
                ) : null}
              </View>
              {/* THE CARD IS NOW A DOOR. S-2 §15.3 gives the goal card exactly one tap target — editing —
                  which meant the number could move and nobody could ask why. It opens Squad Goal Detail;
                  the pencil above keeps editing, so the two actions stay distinct. */}
              <Pressable
                onPress={() => router.push({ pathname: '/squad/[id]/goal', params: { id } })}
                accessibilityRole="button"
                accessibilityLabel="See this goal's progress"
                style={({ pressed }) => (pressed ? styles.goalPressed : null)}
              >
              <Text style={styles.goalTitle}>{squad.goal || `Reach ${squad.goalTarget} ${goalUnit(squad.goalMetricKind)}`}</Text>
              <View style={styles.progressTrack}>
                <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={[styles.progressFill, { width: `${goalPct}%` }]} />
              </View>
              <Text style={styles.progressCaption}>
                {fmtProgress(Math.min(squad.goalProgress, squad.goalTarget))} / {squad.goalTarget} {goalUnit(squad.goalMetricKind)} · {goalPct}% complete
              </Text>
              {/*
                THE DEADLINE, AND WHAT HAPPENS WHEN IT PASSES.

                SQ-D3.5 and the anti-shame guardrails (CC-D3, SA-D4 — "non-participation is never shown as
                failure") rule out "you missed it". So an expired goal reports what the squad DID, with no
                target and no percentage beside it: "Goal ended · 312 workouts logged". The figure is stable
                because 0103's `squad_metric_sum` stops accumulating at the deadline — without that freeze
                this line would quietly keep counting the following month.
              */}
              {squad.goalEnded ? (
                <Text style={styles.goalEnded}>
                  Goal ended · {fmtProgress(squad.goalProgress)} {goalUnit(squad.goalMetricKind)} logged
                </Text>
              ) : squad.goalDaysLeft != null ? (
                <Text style={styles.goalWindow}>
                  {squad.goalDaysLeft === 1 ? 'Final day' : `${squad.goalDaysLeft} days left`}
                </Text>
              ) : null}
              <Text style={styles.goalMore}>See the progress ›</Text>
              </Pressable>
            </TourAnchor>
          ) : squad.isOwner ? (
            <View>
              <Text style={styles.sectionLabel}>Current Goal</Text>
              <Pressable onPress={openGoalEditor} accessibilityRole="button" accessibilityLabel="Set a squad goal" style={styles.setGoalRow}>
                <View style={styles.setGoalIcon}>
                  <TargetIcon />
                </View>
                <View style={styles.setGoalText}>
                  <Text style={styles.setGoalTitle}>Set a squad goal</Text>
                  <Text style={styles.setGoalSub}>One long-term objective the whole squad pushes toward.</Text>
                </View>
                <ChevronIcon color={flColor.bronze400} />
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* ACTIVE COMPETITION — the design's inline standings row (S-2 v1.6 / CS-D2 narrowed by v1.5). */}
        {liveChallenge ? (
          <>
            <View style={styles.compHead}>
              <Text style={styles.feedLabel}>Active Competition</Text>
              <Pressable
                onPress={() => router.push({ pathname: '/competitions', params: { id: squad.id } })}
                accessibilityRole="button"
                accessibilityLabel="View all competitions"
                hitSlop={8}
                style={styles.viewAll}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <ChevronRight color={flColor.bronze400} size={13} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: liveChallenge.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${liveChallenge.name}, ranked ${placeLabel(liveChallenge.myPlace)} of ${liveChallenge.roster}`}
              style={({ pressed }) => [styles.compCard, pressed ? styles.recordsRowPressed : null]}
            >
              <LinearGradient colors={['rgba(32,26,19,0.5)', 'rgba(15,13,10,0.45)'] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />

              <View style={styles.compTop}>
                <View style={styles.compEmblem}>
                  <SwordsIcon />
                </View>
                <View style={styles.compIdentity}>
                  <Text style={styles.compEyebrow}>Current Competition</Text>
                  <Text style={styles.compName} numberOfLines={1}>
                    {liveChallenge.name}
                  </Text>
                </View>

                <View style={styles.compStat}>
                  <Text style={styles.compStatLabel}>Rank</Text>
                  <Text style={styles.compRank}>{liveChallenge.myPlace}</Text>
                  <Text style={styles.compStatLabel}>of {liveChallenge.roster}</Text>
                </View>

                {/* The design hardcodes "WORKOUTS" here; the unit comes from the metric. */}
                <View style={styles.compStat}>
                  <Text style={styles.compScore}>{formatScore(liveChallenge.type, liveChallenge.myScore)}</Text>
                  <Text style={styles.compStatLabel} numberOfLines={1}>
                    {CHALLENGE_TYPES[liveChallenge.type].unit}
                  </Text>
                </View>

                <ChevronRight color={flColor.bronze400} />
              </View>

              <View style={styles.compFoot}>
                {/* Positive-framed (CS-D3): a margin held, or ground to make up — never a deficit. */}
                <View style={styles.compGap}>
                  <ArrowUpIcon />
                  <Text style={styles.compGapText} numberOfLines={1}>
                    {liveChallenge.myPlace === 1
                      ? 'Holding the lead'
                      : `${formatScore(liveChallenge.type, Math.max(0, liveChallenge.leaderScore - liveChallenge.myScore))} ${CHALLENGE_TYPES[liveChallenge.type].unit} to the lead`}
                  </Text>
                </View>
                <Text style={styles.compEnds}>
                  {daysLeft(liveChallenge.endAt) === 0 ? 'Final day' : `${daysLeft(liveChallenge.endAt)} days left`}
                </Text>
              </View>
            </Pressable>
          </>
        ) : null}

        {/* HALL OF CHAMPIONS (C-5) — sits under the active competition, exactly as the design orders it.
            Absent until there is history: a row reading "0 titles" is the shame copy spec §9 forbids. */}
        {titles > 0 ? (
          <Pressable
            onPress={() => router.push({ pathname: '/hall-of-champions', params: { id: squad.id } })}
            accessibilityRole="button"
            accessibilityLabel="Hall of Champions"
            style={({ pressed }) => [styles.hallRow, pressed ? styles.recordsRowPressed : null]}
          >
            <LinearGradient colors={['rgba(186, 134, 84,0.07)', 'transparent'] as const} locations={[0, 0.58] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.hallCrest}>
              <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} />
              <HallCrownIcon />
            </View>
            <View style={styles.recordsBody}>
              <Text style={styles.recordsTitle}>Hall of Champions</Text>
              <Text style={styles.recordsSub}>
                {titles} {titles === 1 ? 'title' : 'titles'} won
                {hall?.foundedAt ? ` · since ${new Date(hall.foundedAt).getFullYear()}` : ''}
              </Text>
            </View>
            <ChevronRight />
          </Pressable>
        ) : null}




        {/* SQUAD FEED */}
        <TourAnchor id="squad-feed" style={styles.feedSection}>
          <View style={styles.feedHead}>
            <Text style={styles.feedLabel}>Squad Feed</Text>
            <Pressable onPress={goCompose} accessibilityRole="button" accessibilityLabel="New post" style={styles.newPostBtn} hitSlop={6}>
              <PlusGlyph />
              <Text style={styles.newPostText}>New Post</Text>
            </Pressable>
          </View>

          {feedPosts.length === 0 ? (
            <View style={styles.feedEmpty}>
              <Text style={styles.feedEmptyText}>No posts yet. Check in, share a PR, or drop a note to get the squad talking.</Text>
            </View>
          ) : (
            <View style={styles.feedList}>
              {feedPosts.map((p, i) => (
                <FeedCard
                  key={p.id}
                  post={p}
                  units={units}
                  squadName={squad.name}
                  alt={i % 2 === 1}
                  reacted={reactMap[p.id]?.on ?? p.iReacted}
                  respect={reactMap[p.id]?.n ?? p.respectCount}
                  /* A shared workout opens THE SESSION, not a post about it — the destination
                     `Social-Architecture-Amendment-002` §3 names, and the one the Friends feed has
                     always used. Falls back to the post page when the row carries no workout id, which
                     is every recap on a database without 0117 and every other post type. */
                  onOpen={() =>
                    p.type === 'weekly'
                      ? router.push({ pathname: '/squad-recap/[id]', params: { id: p.id } })
                      : p.type === 'recap' && p.workoutId
                        ? router.push({ pathname: '/activity/[id]', params: { id: p.workoutId } })
                        : openPost(p.id)
                  }
                  onComments={() => openPost(p.id)}
                  /* The clip PLAYS. The card's one handler above sent a tap on the video to the workout
                     summary — what the PO reported — and the band now opens the same full-screen player a
                     pinned video uses. Photos keep the card's own destination. */
                  onMedia={
                    p.media[0]?.kind === 'video'
                      ? () => router.push({ pathname: '/pin-video', params: { url: p.media[0].url } })
                      : undefined
                  }
                  onAuthor={() => router.push({ pathname: '/athlete/[id]', params: { id: p.authorId } })}
                  onReact={() => onReactCard(p)}
                  ackKind={kindMap[p.id]}
                  onLongReact={() => setAckFor(p.id)}
                />
              ))}
              {canLoadMore ? (
                <Pressable onPress={() => setFeedLimit((n) => n + 5)} accessibilityRole="button" accessibilityLabel="Load more posts" style={styles.loadMore}>
                  <Text style={styles.loadMoreText}>Load More</Text>
                  <ChevronDownGlyph />
                </Pressable>
              ) : (
                /* Only once there is genuinely nothing left. Load More stays the control while there is;
                   showing both would say "that's everything" over a button offering more. */
                <EndOfLedger />
              )}
            </View>
          )}
        </TourAnchor>

        {/*
          SECONDARY DESTINATIONS — Competitions and Squad Records, side by side and below the feed.

          ⚠ PO, 2026-08-25: they *"currently have almost the same visual weight as Current Goal. That's
          too much."* Both were full-width rows with an icon, a title AND a subtitle, stacked directly
          under the goal — so a squad's two most STATIC surfaces outranked everything happening in it,
          and pushed the feed off the first screen. They are doors to history; they get a pair of tiles.

          The Competitions tile still hides itself when a competition is live: the live card above owns
          that entry, which is the branch the original comment here describes.
        */}
        <View style={styles.secondaryRow}>
          {liveChallenge ? null : (
            <TourAnchor id="squad-competitions" style={styles.secondaryFlex}>
              <Pressable
                onPress={() => router.push({ pathname: '/competitions', params: { id: squad.id } })}
                accessibilityRole="button"
                accessibilityLabel="Competitions"
                style={({ pressed }) => [styles.secondaryTile, pressed ? styles.recordsRowPressed : null]}
              >
                <View style={styles.recordsIcon}>
                  <SwordsIcon />
                </View>
                <Text style={styles.secondaryTitle}>Competitions</Text>
                <ChevronRight />
              </Pressable>
            </TourAnchor>
          )}
          <TourAnchor id="squad-records" style={styles.secondaryFlex}>
            <Pressable
              onPress={() => router.push({ pathname: '/squad-records', params: { id: squad.id } })}
              accessibilityRole="button"
              accessibilityLabel="Squad records"
              style={({ pressed }) => [styles.secondaryTile, pressed ? styles.recordsRowPressed : null]}
            >
              <View style={styles.recordsIcon}>
                <BookIcon />
              </View>
              <Text style={styles.secondaryTitle}>Squad Records</Text>
              <ChevronRight />
            </Pressable>
          </TourAnchor>
        </View>
      </ScrollView>

      <ScreenTour screenKey="squad-detail" ready={view === 'detail'} />

      {/* OPTIONS SHEET */}
      {/*
        ══ THE FOUR KINDS, ON THE FEED ══

        PO: *"I should be able to do it right on the feed page."* Hold the Acknowledge control on any row
        and this opens; a plain tap still writes `respect` (SOC-A4-D3: *"a tap acknowledges rather than
        opening a chooser"*).

        Each kind carries its own mark rather than four flames in four colours — at 17pt an icon is a
        silhouette, and bronze-on-bronze is not a distinction. See `AckGlyph`.
      */}
      <BottomSheet open={ackFor != null} onClose={() => setAckFor(null)} title="Acknowledge">
        <View style={{ gap: 8 }}>
          {ACK_KINDS.map((k) => {
            const on = ackFor != null && kindMap[ackFor] === k && (reactMap[ackFor]?.on ?? feedPosts.find((p) => p.id === ackFor)?.iReacted);
            return (
              <Pressable
                key={k}
                onPress={() => ackFor && onPickKind(ackFor, k)}
                accessibilityRole="button"
                accessibilityState={{ selected: !!on }}
                accessibilityLabel={ACK_LABEL[k]}
                style={({ pressed }) => [styles.ackRow, on ? styles.ackRowOn : null, pressed ? styles.ackRowPressed : null]}
              >
                <AckGlyph kind={k} on={!!on} size={19} />
                <Text style={[styles.ackRowText, on ? styles.ackRowTextOn : null]}>{ACK_LABEL[k]}</Text>
                {on ? <Text style={styles.ackRowMark}>Yours</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      <BottomSheet open={optionsOpen} onClose={() => setOptionsOpen(false)}>
        <View style={styles.optionsList}>
          <OptionRow icon={<GearIcon />} label="Squad Settings" onPress={() => { setOptionsOpen(false); router.push({ pathname: '/squad-settings', params: { id: squad.id } }); }} />
          {canInvite ? (
            <OptionRow icon={<InviteIcon />} label="Invite to Squad" divided onPress={() => { setOptionsOpen(false); router.push({ pathname: '/squad-invite', params: { id: squad.id } }); }} />
          ) : null}
          {squad.isOwner ? <OptionRow icon={<TrashIcon />} label="Delete Squad" divided danger onPress={() => { setOptionsOpen(false); setConfirmDelete(true); }} /> : null}
        </View>
      </BottomSheet>

      {/* CHECK-IN VIDEO VIEWER (full-screen) */}
      {checkinViewer ? (
        <CheckinViewer
          checkin={checkinViewer}
          onClose={() => setCheckinViewer(null)}
          /* ⚠ THE VIEWER IS A `Modal`, AND `setCheckinViewer(null)` ONLY SCHEDULES ITS DISMISSAL.
             Calling `startCheckin()` in the same tick presented the camera over a modal still on
             screen, which iOS drops silently — so Replace did nothing and the screen read as frozen.
             Same defect as the squad photo inside Edit Identity; see `callerModalGone`. */
          onReplace={
            checkinViewer.isSelf
              ? () => {
                  setCheckinViewer(null);
                  void (async () => {
                    await callerModalGone();
                    await startCheckin();
                  })();
                }
              : undefined
          }
        />
      ) : null}

      {mediaPickerSheet}

      {/* EDIT GOAL SHEET */}
      <BottomSheet
        open={goalOpen || (editGoal === '1' && !goalDismissed)}
        onClose={() => {
          setGoalOpen(false);
          setGoalDismissed(true);
        }}
        title="Edit Squad Goal"
      >
        <View style={styles.goalSheetBody}>
          <Text style={styles.goalSheetSub}>One shared objective the whole squad pushes toward together.</Text>
          <InputField label="Goal" value={goalTitle} onChange={setGoalTitle} maxLength={60} showCount placeholder="e.g. Run 200 miles together" />
          <View>
            <Text style={styles.goalFieldLabel}>Track</Text>
            <View style={styles.goalChipRow}>
              {SQUAD_METRICS.map(([k, lbl]) => (
                <Pressable
                  key={k}
                  onPress={() => {
                    setGoalMetricKind(k);
                    if (k === 'distance_total' && !goalMetricKey) setGoalMetricKey('running');
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: goalMetricKind === k }}
                  style={[styles.goalChip, goalMetricKind === k ? styles.goalChipOn : null]}
                >
                  <Text style={[styles.goalChipText, goalMetricKind === k ? styles.goalChipTextOn : null]}>{lbl}</Text>
                </Pressable>
              ))}
            </View>
            {goalMetricKind === 'distance_total' ? (
              <View style={[styles.goalChipRow, styles.goalSubChips]}>
                {SQUAD_DIST_ACTS.map(([k, lbl]) => (
                  <Pressable key={k} onPress={() => setGoalMetricKey(k)} accessibilityRole="button" accessibilityState={{ selected: goalMetricKey === k }} style={[styles.goalChip, goalMetricKey === k ? styles.goalChipOn : null]}>
                    <Text style={[styles.goalChipText, goalMetricKey === k ? styles.goalChipTextOn : null]}>{lbl}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          <InputField
            label={GOAL_TARGET_LABEL[goalMetricKind]}
            value={goalTargetText}
            onChange={(v) => setGoalTargetText(v.replace(/[^0-9.]/g, '').slice(0, 9))}
            keyboardType="decimal-pad"
            placeholder={GOAL_TARGET_PLACEHOLDER[goalMetricKind]}
          />
          <CalendarField label="Starts" value={goalStartText || null} onChange={(v) => setGoalStartText(v ?? '')} placeholder="Today" />
          <CalendarField
            label="Ends"
            value={goalEndText || null}
            onChange={(v) => setGoalEndText(v ?? '')}
            placeholder="No deadline"
            clearable
          />
          {windowError ? <Text style={styles.goalDateErr}>{windowError}</Text> : null}
          <Text style={styles.goalAutoNote}>
            Progress updates automatically from your squad’s logged workouts. A start date in the past counts
            work already done; leave the end blank and the goal runs until you reach it.
          </Text>
          <Button variant="primary" fullWidth disabled={!goalValid || savingGoal} onPress={saveGoal} accessibilityLabel="Save goal">
            {savingGoal ? 'Saving…' : 'Save Goal'}
          </Button>
          {squad.goalTarget != null ? (
            <Pressable onPress={removeGoal} accessibilityRole="button" accessibilityLabel="Remove goal" style={styles.removeGoalBtn} hitSlop={6}>
              <Text style={styles.removeGoalText}>Remove goal</Text>
            </Pressable>
          ) : null}
        </View>
      </BottomSheet>

      {/* CONFIRM DELETE (centered ceremony modal) */}
      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete {squad.name}?</Text>
            <Text style={styles.confirmBody}>This permanently removes {squad.name} and everything in it. This can’t be undone.</Text>
            <View style={styles.confirmActions}>
              <Button variant="destructive" fullWidth disabled={deleting} onPress={doDelete} accessibilityLabel="Delete squad">
                {deleting ? 'Deleting…' : 'Delete Squad'}
              </Button>
              <Button variant="secondary" fullWidth onPress={() => setConfirmDelete(false)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailBg() {
  /*
   * `imageOpacity` rather than a heavier top overlay: this artwork is near-black everywhere except its
   * golden mountain band, so dimming the whole image toward the base lands almost entirely on the
   * mountains — the slate texture below has almost no luminance to lose.
   *
   * ⚠ IT WAS TAKEN DOWN 25% TWICE ON AN EARLIER REVIEW (1 → 0.75 → 0.5625), AND THAT WENT TOO FAR.
   * PO, 2026-08-25: *"you should be able to see the mountains."* The old note said the peaks should
   * read as atmosphere rather than as a photograph — right in principle, and at 0.5625 under a scrim
   * that also darkens to 38% they stopped reading at all. Atmosphere you cannot see is just a dark
   * screen. Reversing one of the two cuts and easing the scrim; the second cut stays reversed
   * deliberately rather than going back to the full-strength plate.
   *
   * ⚠ AND `paperTexture="atmospheric"` IS LOAD-BEARING HERE — IT IS FIXING A REGRESSION I INTRODUCED.
   * The texture pass earlier today defaults every screen to `functional`, which multiplies Alabaster's
   * artwork to 62%. That is right for a list or a form and wrong for this: a squad's crest header is an
   * identity moment, the same class of thing as Legacy. Left on the default, Paper would have rendered
   * these mountains at 0.78 × 0.62 ≈ 0.48 — dimmer than the value the PO is already calling too dark.
   *
   * The opacity lift is not theme-conditional, so it lands on BOTH themes (Design System §2.0); the
   * `paperTexture` level is the colour half and only Alabaster reads it.
   */
  return (
    <ScreenBackground
      image={SCREEN_BG.squadDetail}
      imagePosition="top"
      imageOpacity={0.78}
      paperTexture="atmospheric"
      atmospheric
      overlay={{ colors: ['rgba(5,5,5,0.06)', 'rgba(5,5,5,0.18)', 'rgba(5,5,5,0.30)'], locations: [0, 0.38, 1] }}
      radials={[BG_RADIAL.squadTop, BG_RADIAL.squadBottom]}
    />
  );
}

function OptionRow({ icon, label, onPress, divided = false, danger = false }: { icon: React.ReactNode; label: string; onPress: () => void; divided?: boolean; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.optionRow, divided ? styles.optionRowDivided : null]}>
      <View style={styles.optionIcon}>{icon}</View>
      <Text style={[styles.optionLabel, danger ? styles.optionLabelDanger : null]}>{label}</Text>
    </Pressable>
  );
}

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

function CheckinDisc({ member, watched, onPress }: { member: SquadCheckin; watched: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Watch ${member.isSelf ? 'your' : `${member.name}’s`} check-in${watched ? ', watched' : ', new'}`} style={styles.ciItem}>
      <View style={[styles.ciRing, watched ? styles.ciRingWatched : styles.ciRingNew]}>
        <View style={[styles.ciAvatarWrap, watched ? styles.ciDim : null]}>
          {member.avatarUrl ? (
            <Image source={{ uri: member.avatarUrl }} style={styles.ciImg} contentFit="cover" />
          ) : (
            <View style={styles.ciInitials}>
              <Text style={styles.ciInitialsText}>{initialsOf(member.name)}</Text>
            </View>
          )}
        </View>
        <View style={styles.ciPlayBadge}>
          <PlayMini />
        </View>
      </View>
      <Text style={styles.ciFirst} numberOfLines={1}>
        {member.isSelf ? 'You' : member.name.split(' ')[0]}
      </Text>
    </Pressable>
  );
}

/**
 * The check-in tile — and, while a clip is going up, the progress readout and the cancel.
 *
 * It stays enabled during the upload on purpose: a stuck upload used to leave the athlete with a
 * disabled spinner and no way out short of killing the app. Tapping now aborts.
 */
function CheckinCta({ onPress, uploading, pct }: { onPress: () => void; uploading: boolean; pct: number }) {
  const percent = Math.round(pct * 100);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={uploading ? `Cancel check-in upload, ${percent} percent done` : 'Post a video check-in'}
      style={styles.ciItem}
    >
      <View style={styles.ciCtaDisc}>
        {uploading ? (
          <>
            {/* Fills bottom-up as bytes land — readable across the room, where a spinner is not. */}
            <View style={[styles.ciProgressFill, { height: `${Math.max(6, percent)}%` }]} pointerEvents="none" />
            <ActivityIndicator color={flColor.bronze300} />
          </>
        ) : (
          <VideoPlusGlyph />
        )}
      </View>
      {/* The tile is 72pt wide, so the label is the number; "tap to cancel" lives in the a11y label. */}
      <Text style={[styles.ciFirst, styles.ciCtaText]} numberOfLines={1}>
        {uploading ? `${percent}%` : 'Check in'}
      </Text>
    </Pressable>
  );
}

/**
 * ══ THE WAY OUT OF A CHECK-IN WAS A GHOST ══
 *
 * PO: *"It's not obvious how to leave a check-in on a squad check-in. There isn't an obvious x to get
 * out of it."* There WAS an ✕ — and three separate things conspired to make it unfindable:
 *
 * **1. It was drawn in the notch.** `paddingTop` was a hardcoded `54`, and this is the only overlay in
 * the app that does not read `useSafeAreaInsets`. On a Dynamic Island phone the island occupies down to
 * ~59pt, so the top of a 38pt disc starting at 54 sat *behind* it. The same class of defect as the
 * Transformation TopBar three screens over — see the note there — and the same fix.
 *
 * **2. It was a white glyph on 12% white, over video.** Over a bright clip that is a contrast ratio of
 * roughly nothing. A control that has to survive arbitrary footage underneath it needs its OWN ground,
 * not a tint of whatever is behind.
 *
 * **3. There was no backdrop left to tap.** `viewerVideo` is `100% × 100%`, so the "tap outside to
 * close" Pressable was covered edge to edge by the video — and the video carries `nativeControls`, so a
 * tap on it toggles AVPlayer's chrome instead of dismissing. Every escape the component offered was
 * either hidden, invisible, or unreachable.
 *
 * So: real safe-area padding, a scrim behind the top bar so the chrome is legible over any frame, and
 * the close is now a LABELLED PILL — the same shape as "Post a new check-in" at the foot, which nobody
 * has ever failed to find. A word beats a glyph when the glyph has to compete with a video.
 */
function CheckinViewer({ checkin, onClose, onReplace }: { checkin: SquadCheckin; onClose: () => void; onReplace?: () => void }) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(checkin.videoUrl, (p) => {
    p.loop = false;
    p.play();
  });
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewerRoot}>
        <Pressable style={styles.viewerBackdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={styles.viewerStage} pointerEvents="box-none">
          <VideoView player={player} style={styles.viewerVideo} contentFit="contain" nativeControls />
        </View>
        {/* The scrim is its own layer and takes no touches — the chrome above it stays tappable, and the
            video below it stays scrubbable. Without it the name and the time vanish over pale footage
            exactly as the close did. */}
        <LinearGradient
          colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0)']}
          style={[styles.viewerScrim, { height: 132 + insets.top }]}
          pointerEvents="none"
        />
        <View style={[styles.viewerTop, { paddingTop: 10 + insets.top }]} pointerEvents="box-none">
          <View style={styles.viewerWho}>
            <Text style={styles.viewerName} numberOfLines={1}>
              {checkin.isSelf ? 'Your check-in' : checkin.name}
            </Text>
            <Text style={styles.viewerTime}>{timeAgo(checkin.createdAt)}</Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close check-in"
            hitSlop={12}
            style={({ pressed }) => [styles.viewerClose, pressed ? styles.viewerClosePressed : null]}
          >
            <CloseX size={16} />
            <Text style={styles.viewerCloseText}>Close</Text>
          </Pressable>
        </View>
        {/* ⚠ NO SECOND CLOSE DOWN HERE, AND THAT IS A DECISION. The foot of this screen already belongs
            to the video: `nativeControls` draws AVPlayer's scrubber across it, and "Post a new check-in"
            is the one thing worth putting on top of that. A second Close stacked in the same band would
            be a third control fighting for the same 60pt — the fix for "I can't find the way out" is one
            unmissable exit, not two competing ones. */}
        {onReplace ? (
          <View style={[styles.viewerBottom, { paddingBottom: 26 + insets.bottom }]} pointerEvents="box-none">
            <Pressable onPress={onReplace} accessibilityRole="button" accessibilityLabel="Post a new check-in" style={styles.viewerReplace}>
              <VideoPlusGlyph />
              <Text style={styles.viewerReplaceText}>Post a new check-in</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

/**
 * A post's photos in the feed. One fills the card as it always has; several become a thumbnail row with
 * the remainder counted, because a card showing only the first photo of a six-pose capture reads as a
 * post that HAS one photo. The full set is one tap away in the post itself.
 */
/**
 * The progress card inside a feed row. Measured rather than computed from the ancestors' padding: the
 * card scales to whatever width it is given, and a hardcoded `screenWidth - 116` would silently go
 * wrong the first time one of the four paddings above it changes.
 */
function FeedProgressCard({ card }: { card: ProgressCardData }) {
  const [w, setW] = useState(0);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>{w > 0 ? <ProgressPostCard card={card} width={w} /> : null}</View>
  );
}

/** Which type marker a squad post carries, or null where the type is not worth announcing. */
const SQUAD_MARKER: Partial<Record<SquadPostType, { kind: LedgerMarker; label: string }>> = {
  recap: { kind: 'workout', label: 'Workout' },
  pr: { kind: 'pr', label: 'PR' },
  formcheck: { kind: 'formcheck', label: 'Form Check' },
  transformation: { kind: 'transformation', label: 'Transformation' },
  announcement: { kind: 'announcement', label: 'Announcement' },
  checkin: { kind: 'milestone', label: 'Check-in' },
};

/**
 * One squad-feed row, on the SAME renderer the Friends feed uses.
 *
 * ⚠ THE BUG THIS FIXES IS VISIBLE FROM ACROSS THE ROOM: a progress post rendered as the sentence
 * *"Marcus Vale posted progress photos."* with **no photo underneath it** whenever the post carried
 * loose media rather than a composed card, and as a strip of three cropped thumbnails when it did. The
 * sentence was never meant to be the post — it is attribution, and it now sits above a real image with
 * the member's own words below it.
 *
 * The old icon column went with the card. It said the same thing the type marker says, one row higher
 * and in a bronze-tinted box, on a screen that has just been stripped of every other bronze container.
 */
function FeedCard({
  post,
  units,
  squadName,
  alt,
  reacted,
  respect,
  ackKind,
  onOpen,
  onMedia,
  onComments,
  onAuthor,
  onReact,
  onLongReact,
}: {
  post: SquadFeedPost;
  units: ReturnType<typeof useUnits>['units'];
  squadName: string;
  alt: boolean;
  reacted: boolean;
  respect: number;
  ackKind?: AckKind;
  onOpen: () => void;
  onComments: () => void;
  onAuthor: () => void;
  onReact: () => void;
  /** Press and hold the acknowledge control — opens the four kinds (SOC-A4-D3). */
  onLongReact: () => void;
  /** A tap on the media band — a video plays instead of opening the card's destination. */
  onMedia?: () => void;
}) {
  const summary = post.type === 'recap' ? post.workoutSummary : null;

  // The generated Weekly Summary KEEPS ITS CARD. It is a system artifact rather than a member post —
  // the squad talking, not a person — and against a feed of hairline-separated rows the contrast is
  // now doing real work instead of competing with twenty other bordered boxes.
  if (post.type === 'weekly' && post.recap) {
    return (
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel="Open weekly summary" style={[styles.feedCard, styles.weeklyCard]}>
        <LinearGradient colors={['rgba(186, 134, 84,0.06)', 'transparent'] as const} locations={[0, 0.46] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.feedCardRow}>
          <View style={styles.weeklyIcon}>
            <BannerGlyph />
          </View>
          <View style={styles.feedCardBody}>
            <Text style={styles.weeklyTitle}>Weekly Summary</Text>
            <Text style={styles.weeklyLine}>{recapSummaryLine(post.recap)}</Text>
            <View style={styles.weeklyFoot}>
              <Text style={styles.weeklyTime}>{timeAgo(post.createdAt)}</Text>
              <Text style={styles.weeklyMore}>View breakdown →</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  const card = isProgressCard(post.layout) ? post.layout : null;
  /*
   * ══ THE COMPARISON DRAWS ITSELF ON THE FEED, NOT ONLY INSIDE THE POST ══
   *
   * PO, 2026-08-31: *"I posted on the squad and the slider was not on the post unless I clicked into
   * it."* True, and the cause was one missing branch. `squad_posts.layout` holds two different things —
   * a Progress Photo card and a transformation composition — and this line only ever asked about the
   * first. A transformation therefore fell through to the plain media band and rendered as flat photos,
   * while `/squad-post/[id]` read the same column through `asTransformationLayout` and drew the real
   * thing. One post, two answers, depending on how far you had tapped.
   *
   * `customMedia` already existed for exactly this — its own doc names "the before/after comparison with
   * its draggable divider" — so nothing new is drawn here, the feed just finally asks.
   */
  const shaped = card ? null : asTransformationLayout(post.layout);
  /* Both custom bands replace the standard one. Passing `post.media` as well would render the raw photos
     underneath the composition — the same double-render the friends feed avoids for its own comparison. */
  const media = card || shaped ? [] : post.media.map((m) => ({ url: m.url, kind: m.kind }));
  const hasMedia = !!card || !!shaped || media.length > 0;
  /* §3.7: a progress post gets the photo treatment and a form check the video treatment — which they
     already do, because the media itself says which it is. What changes is that the stand-in sentence
     stops being the post: above an image it is attribution, and it is not rendered at all without one. */
  const attribution = post.type === 'discussion' ? null : `${post.authorName} ${leadFor(post)}`;
  const detail = post.type === 'discussion' ? null : detailFor(post);

  return (
    <LedgerPost
      authorName={post.authorName}
      authorAvatarUrl={post.authorAvatar}
      audience={squadName}
      time={timeAgo(post.createdAt)}
      /* ⚠ `&& !summary`: a recap keeps its WORKOUT marker even when it carries a photo, for the same
         reason it keeps its stats — see `LedgerPost`'s `showBody`. Without this the screen nulls the
         marker before the component ever gets to decide, and the body comes back headless. */
      /* A recap derives its marker from the snapshot — shoe for a cardio lead, barbell otherwise —
         through the same helper the friends feed uses, so the two cards cannot drift over which sport
         a post is. Non-recap types keep the static map. */
      marker={summary ? recapMarker(summary) : hasMedia ? null : SQUAD_MARKER[post.type] ?? null}
      title={summary ? summary.name ?? recapMarker(summary).label : post.type === 'pr' ? post.prExercise ?? 'A new best' : null}
      context={summary ? summary.context ?? null : post.type === 'pr' ? [post.prValue, post.prLabel].filter(Boolean).join(' · ') || null : null}
      stats={summary ? workoutStats(summary, units) : []}
      playlist={summary?.playlist ?? null}
      onPlaylist={summary?.playlist ? () => void openPlaylist(summary.playlist!) : undefined}
      /* The member's own words. On a media post they move BELOW the image — `LedgerPost` places them,
         which is the whole reason the detail slot above the media is now left empty.

         ⚠ A RECAP TAKES `post.body` WHOLE, like a discussion does. `detailFor` truncates at 90 characters
         because it was written for a one-line EXCERPT under a lead sentence; in the ledger this slot is
         the caption itself. Now that a shared session actually carries the athlete's reflection, that
         cutoff would end it mid-sentence — and the friends feed, which passes `post.body` straight
         through, would show the same post in full. Other types keep `detailFor`: their bodies are
         stand-ins it exists to suppress. */
      caption={post.type === 'discussion' || summary ? post.body : detail || null}
      media={media}
      customMedia={card ? <FeedProgressCard card={card} /> : shaped ? <TransformationLayout data={shaped} compact /> : undefined}
      attribution={attribution}
      /* Past the section's own 20px inset, so an image reaches the card edge like the handoff asks. */
      bleed={20}
      alt={alt}
      acknowledged={reacted}
      ackKind={ackKind}
      acknowledgeCount={respect}
      commentCount={post.commentCount}
      onAuthor={onAuthor}
      onOpen={onOpen}
      onMedia={onMedia}
      onAcknowledge={onReact}
      onLongAcknowledge={onLongReact}
      onComments={onComments}
    />
  );
}

/**
 * A member row. TAPPING IT OPENS THEIR PROFILE — for every member, which is what S-2 intends ("row tap →
 * Limited Athlete Profile") and what anyone would expect from a roster.
 *
 * It didn't, until now. `onPress` was wired only for the owner's manage action, so for every other viewer
 * — and for the owner looking at their own row — the row rendered as a plain View with a grey chevron
 * suggesting otherwise. Tapping a squadmate did nothing, which made the roster the least useful route to
 * the one screen that now carries Add Friend.
 *
 * Management is its own affordance rather than sharing the tap. Two different destinations behind one
 * target meant the owner could never reach a member's profile at all, and everyone else could never reach
 * anything.
 */
function MemberRow({
  member,
  last,
  onOpen,
  onManage,
}: {
  member: SquadMemberView;
  last: boolean;
  onOpen: () => void;
  onManage?: () => void;
}) {
  return (
    <View style={[styles.memberRow, last ? null : styles.memberRowDivided]}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`View ${member.name}${member.isSelf ? ', you' : ''}'s profile`}
        style={({ pressed }) => [styles.memberMain, pressed ? styles.memberMainPressed : null]}
      >
        <Avatar src={member.avatarUrl ?? undefined} name={member.name} size="listRow" />
        <View style={styles.memberText}>
          <Text style={styles.memberName} numberOfLines={1}>
            {member.name}
            {member.isSelf ? <Text style={styles.memberYou}> (You)</Text> : null}
          </Text>
          <Text style={styles.memberRole}>{member.role === 'owner' ? 'Owner' : 'Member'}</Text>
        </View>
        <ChevronIcon color={flColor.gray600} />
      </Pressable>

      {onManage ? (
        <Pressable
          onPress={onManage}
          accessibilityRole="button"
          accessibilityLabel={`Manage ${member.name}`}
          hitSlop={8}
          style={({ pressed }) => [styles.memberManage, pressed ? styles.memberMainPressed : null]}
        >
          <DotsIcon />
        </Pressable>
      ) : null}
    </View>
  );
}

function DotsIcon({ color = flColor.bronze400 }: { color?: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill={color}>
      <Circle cx={12} cy={5} r={1.7} />
      <Circle cx={12} cy={12} r={1.7} />
      <Circle cx={12} cy={19} r={1.7} />
    </Svg>
  );
}

// ── glyphs ──
function OverflowIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={flColor.cream100}>
      <Circle cx={12} cy={5} r={1.7} />
      <Circle cx={12} cy={12} r={1.7} />
      <Circle cx={12} cy={19} r={1.7} />
    </Svg>
  );
}
function PeopleIcon({ size = 15, color = flColor.gray400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3.4 19a5.6 5.6 0 0 1 11.2 0" />
      <Path d="M16 5.3a3.2 3.2 0 0 1 0 5.4" />
      <Path d="M18.2 19a5.6 5.6 0 0 0-3-4.9" />
    </Svg>
  );
}
function PencilIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  );
}
function ChevronIcon({ color = flColor.bronze400 }: { color?: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}
function TargetIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={8} />
      <Circle cx={12} cy={12} r={4.6} />
      <Circle cx={12} cy={12} r={1.3} />
    </Svg>
  );
}
function GearIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}
function ChevronRight({ color = flColor.gray600, size = 17 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}
function HallCrownIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill={flColor.onBronze}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function ArrowUpIcon({ color = flColor.bronze400, size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  );
}
function SwordsIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.5 17.5 L3 6 L3 3 L6 3 L17.5 14.5" />
      <Path d="M13 19 L19 13" />
      <Path d="M14.5 6.5 L18 3 L21 3 L21 6 L17.5 9.5" />
      <Path d="M5 14 L9 18" />
    </Svg>
  );
}
function BookIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 6.5C10.5 5 8.5 4.5 4 4.5v13c4.5 0 6.5.5 8 2 1.5-1.5 3.5-2 8-2v-13c-4.5 0-6.5.5-8 2z" />
      <Path d="M12 6.5v13" />
    </Svg>
  );
}
function InviteIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.4} />
      <Path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <Path d="M18 7v6M15 10h6" />
    </Svg>
  );
}
function CrownIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill={flColor.bronze300}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function TrashIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.redMuted} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 7h16" />
      <Path d="M9 7V5h6v2" />
      <Path d="M6.5 7l1 13h9l1-13" />
      <Path d="M10 11v6M14 11v6" />
    </Svg>
  );
}

function PlusGlyph({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function ChevronDownGlyph() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
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
function PlayMini() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill={flColor.cream100}>
      <Path d="M8 5v14l11-7z" />
    </Svg>
  );
}
function VideoPlusGlyph() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3.5 7.5h9v9h-9z" />
      <Path d="M12.5 10.5l5-2.6v8.2l-5-2.6" />
      <Path d="M6 9.5v5M8.5 12h-5" />
    </Svg>
  );
}
function CloseX({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.cream100} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round },
  scroll: { paddingBottom: 44 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },

  missingTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  missingBody: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },
  backBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 22, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronze400 },
  backText: { fontSize: 14, fontWeight: '600', color: flColor.bronze400 },

  // hero
  hero: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  heroHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  heroText: { flex: 1, minWidth: 0, paddingTop: 4 },
  squadName: {
    fontFamily: flFont.display,
    fontSize: 34,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    lineHeight: 35,
    color: flColor.cream100,
    textShadowColor: textHalo(0.75),
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  tagline: { fontSize: 14, lineHeight: 20, color: flColor.gray400, marginTop: 8, textShadowColor: textHalo(0.6), textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  crest: {
    width: 92,
    height: 92,
    flexShrink: 0,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    backgroundColor: flColor.charcoal900,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 0 2.5px ${flColor.bronze400}, 0 8px 22px rgba(0,0,0,0.7), 0 0 18px rgba(186, 134, 84,0.3)`,
  },
  crestPhoto: { width: '100%', height: '100%', borderRadius: flRadius.round },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 18 },
  metaBtn: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaText: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray400 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: flColor.bronze400 },
  greenDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#5B7A61' },
  heroDivider: { height: 1, backgroundColor: flColor.bronzeBorderSubtle, marginTop: 20, marginBottom: 16 },

  // current goal
  goalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 10 },
  goalTitle: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', lineHeight: 28, color: flColor.cream100, marginBottom: 14 },
  progressTrack: { height: 10, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal700, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)' },
  progressFill: { height: '100%', borderRadius: flRadius.pill, boxShadow: flShadow.glowSubtle },
  progressCaption: { fontSize: 12, fontWeight: '500', letterSpacing: 0.3, color: flColor.gray400, marginTop: 9 },

  // set-goal CTA
  setGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal900, boxShadow: flShadow.card },
  setGoalIcon: { width: 40, height: 40, flexShrink: 0, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  setGoalText: { flex: 1, minWidth: 0, gap: 2 },
  setGoalTitle: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  setGoalSub: { fontSize: 12, lineHeight: 16, color: flColor.gray600 },

  // options sheet
  optionsList: { marginHorizontal: -6 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 8 },
  optionRowDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  optionIcon: { flexShrink: 0 },
  optionLabel: { fontSize: 15, color: flColor.cream100 },
  optionLabelDanger: { color: flColor.redMuted },

  // edit goal sheet
  goalSheetBody: { gap: 16 },
  goalSheetSub: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },
  goalFieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 9 },
  goalChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalSubChips: { marginTop: 8 },
  goalChip: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  goalChipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  goalChipText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  goalChipTextOn: { color: flColor.bronze300 },
  goalAutoNote: { fontSize: 12, lineHeight: 17, color: flColor.gray600 },
  goalDateRow: { flexDirection: 'row', gap: 12 },
  goalDateCol: { flex: 1, minWidth: 0 },
  goalDateErr: { fontSize: 12, color: flColor.redMuted },
  goalWindow: { marginTop: 6, fontSize: 11.5, color: flColor.gray600 },
  goalMore: { marginTop: 8, fontSize: 11.5, fontWeight: '600', color: flColor.bronze400 },
  goalPressed: { opacity: 0.82 },
  goalEnded: { marginTop: 6, fontSize: 12, color: flColor.bronze400, fontWeight: '600' },
  removeGoalBtn: { alignSelf: 'center', paddingVertical: 4 },
  removeGoalText: { fontSize: 13, fontWeight: '600', color: flColor.redMuted },

  // confirm modal
  confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: flColor.overlayDark },
  confirmCard: { width: '100%', maxWidth: 320, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal500, borderRadius: flRadius.xl, padding: 24, boxShadow: flShadow.ambient },
  confirmTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  confirmBody: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center', marginTop: 10 },
  confirmActions: { gap: 10, marginTop: 22 },

  // today's check-ins
  /**
   * The two secondary destinations, side by side under the feed.
   *
   * ⚠ SMALLER ON PURPOSE, not merely moved. As full-width rows with a title AND a subtitle they read at
   * the same weight as Current Goal — two static surfaces outranking everything live in the squad. The
   * subtitle is dropped and the pair shares one line, which is what buys the feed its place on the
   * first screen.
   */
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  /** Each tile takes an equal half — and the whole width when a live competition hides the other. */
  secondaryFlex: { flex: 1 },
  secondaryTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  secondaryTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: flColor.cream100,
  },
  recordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 22,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  recordsRowPressed: { transform: [{ scale: 0.96 }], borderColor: flColor.bronzeBorder },
  recordsIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  recordsBody: { flex: 1, minWidth: 0, gap: 3 },
  recordsTitle: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  recordsSub: { fontSize: 11.5, color: flColor.gray600 },

  /**
   * ⚠ NO HORIZONTAL PADDING OF ITS OWN ANY MORE — the rail moved INSIDE the hero card, which already
   * pads 20. It carried its own 20 as a page-level section and would now be inset 40, half a check-in
   * disc narrower than everything above it.
   */
  checkinsSection: { marginTop: 14, marginBottom: 2 },
  checkinHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  checkinDate: { fontSize: 11.5, color: flColor.gray600 },
  checkinStrip: { gap: 6, paddingBottom: 4, paddingRight: 8 },
  checkinEmpty: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600, marginTop: 2, paddingRight: 20 },
  ciItem: { width: 72, alignItems: 'center', gap: 8, paddingVertical: 2 },
  ciRing: { width: 58, height: 58, borderRadius: flRadius.round, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  ciRingNew: { borderColor: flColor.bronze300, boxShadow: `0 0 10px rgba(186, 134, 84,0.5)` },
  ciRingWatched: { borderColor: flColor.charcoal500 },
  ciAvatarWrap: { width: 48, height: 48, borderRadius: flRadius.round, overflow: 'hidden' },
  ciDim: { opacity: 0.45 },
  ciImg: { width: '100%', height: '100%' },
  ciInitials: { width: '100%', height: '100%', backgroundColor: '#2c2118', alignItems: 'center', justifyContent: 'center' },
  ciInitialsText: { fontSize: 15, fontWeight: '700', color: flColor.bronze300 },
  ciPlayBadge: { position: 'absolute', bottom: -1, right: -1, width: 19, height: 19, borderRadius: 9.5, backgroundColor: flColor.bronzeSolid, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: flColor.charcoal900, paddingLeft: 1 },
  ciFirst: { maxWidth: 72, fontSize: 12.5, color: flColor.gray400 },
  ciCtaDisc: { width: 58, height: 58, borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.bronzeBorder, borderStyle: 'dashed', backgroundColor: flColor.bronzeTint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ciCtaText: { color: flColor.bronze300, fontWeight: '600' },
  ciProgressFill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: flColor.bronzeBorder },

  // check-in video viewer (full-screen)
  viewerRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' },
  viewerBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  viewerStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewerVideo: { width: '100%', height: '100%' },
  viewerScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  /* `paddingTop` is supplied by the component from `insets.top` — see the note on `CheckinViewer`. */
  viewerTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16, paddingHorizontal: 18 },
  viewerWho: { flex: 1, minWidth: 0 },
  viewerName: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  viewerTime: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  /* ⚠ ITS OWN GROUND, NOT A TINT. `rgba(255,255,255,0.12)` over video is whatever the video is; this is
     opaque enough to read on a white gym wall and bronze-edged so it belongs to the app. */
  viewerClose: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: 'rgba(12,10,8,0.92)' },
  viewerClosePressed: { opacity: 0.7 },
  viewerCloseText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4, color: flColor.cream100 },
  viewerBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 20 },
  viewerReplace: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12, paddingHorizontal: 22, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: 'rgba(23,16,9,0.85)' },
  viewerReplaceText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3, color: flColor.bronze300 },

  // squad feed
  feedSection: { paddingHorizontal: 20, marginTop: 10 },
  feedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  feedLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  compHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 28, marginBottom: 12, marginHorizontal: 2 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontSize: 12, fontWeight: '500', color: flColor.bronze400 },
  compCard: { position: 'relative', overflow: 'hidden', borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.surfaceRecessed, boxShadow: flShadow.card },
  compTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  compEmblem: { width: 46, height: 46, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.surfaceRecessed, boxShadow: flShadow.glowSubtle },
  compIdentity: { flex: 1, minWidth: 0, gap: 4 },
  compEyebrow: { fontSize: 9, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.bronze400 },
  compName: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  compStat: { flexShrink: 0, alignItems: 'center', gap: 2, paddingLeft: 13, borderLeftWidth: 1, borderLeftColor: flColor.charcoal600 },
  compStatLabel: { fontSize: 8, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },
  compRank: { fontFamily: flFont.display, fontSize: 20, fontWeight: '700', letterSpacing: -0.3, color: flColor.bronze300 },
  compScore: { fontFamily: flFont.display, fontSize: 20, fontWeight: '700', letterSpacing: -0.3, color: flColor.cream100 },
  compFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 15, paddingVertical: 9, borderTopWidth: 1, borderTopColor: flColor.bronzeBorderSubtle, backgroundColor: 'rgba(0,0,0,0.18)' },
  compGap: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  compGapText: { flexShrink: 1, fontSize: 10.5, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.bronze400 },
  compEnds: { flexShrink: 0, fontSize: 10.5, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },
  hallRow: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 12, paddingHorizontal: 15, paddingVertical: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal800, boxShadow: flShadow.card },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  ackRowOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  ackRowPressed: { opacity: 0.75 },
  ackRowText: { flex: 1, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  ackRowTextOn: { color: flColor.bronze300 },
  ackRowMark: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400 },

  hallCrest: { width: 40, height: 40, flexShrink: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: flRadius.md },
  newPostBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: '#3D2F1A', boxShadow: flShadow.glowSubtle },
  newPostText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.3, color: flColor.bronze300 },
  /* No gap. Posts are separated by the hairline each one carries at its foot — a gap on top of that
     would put a gutter between rows and the ledger would read as cards again. */
  feedList: { gap: 0 },
  weeklyCard: { borderColor: flColor.bronzeBorder },
  weeklyIcon: {
    width: 34,
    height: 34,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
  },
  weeklyTitle: { fontFamily: flFont.display, fontSize: 15.5, fontWeight: '600', letterSpacing: 0.2, color: flColor.cream100 },
  weeklyLine: { marginTop: 4, fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  weeklyFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 },
  weeklyTime: { fontSize: 11.5, color: flColor.gray600 },
  weeklyMore: { fontSize: 11.5, fontWeight: '600', color: flColor.bronze400 },

  feedCard: { borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal800, boxShadow: `${flShadow.borderInset}, ${flShadow.card}`, padding: 15 },
  feedCardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  feedIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: flRadius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  feedCardBody: { flex: 1, minWidth: 0 },
  feedLine: { fontSize: 14, lineHeight: 19, color: flColor.cream100 },
  feedWho: { fontWeight: '600' },
  feedDetail: { fontSize: 12.5, lineHeight: 17, color: flColor.gray400, marginTop: 3 },
  // (the recap stats strip moved to `components/forge/compositions/RecapStrip` — the Friends feed
  //  renders the identical four numbers since 0113, and two copies would drift)
  feedMediaImage: { width: '100%', height: 180, borderRadius: flRadius.md, marginTop: 10, backgroundColor: flColor.charcoal900 },
  feedProgressWrap: { marginTop: 10 },
  feedMediaStrip: { flexDirection: 'row', gap: 4, marginTop: 10 },
  feedMediaThumb: { flex: 1, minWidth: 0, height: 118, borderRadius: flRadius.md, backgroundColor: flColor.charcoal900 },
  feedMediaMoreWrap: { flex: 1, minWidth: 0, position: 'relative' },
  feedMediaMore: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: flRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,7,8,0.62)' },
  feedMediaMoreText: { fontSize: 15, fontWeight: '700', color: flColor.cream100 },
  feedVideoTile: { height: 96, borderRadius: flRadius.md, marginTop: 10, backgroundColor: '#171009', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, alignItems: 'center', justifyContent: 'center' },
  feedPlayDisc: { width: 40, height: 40, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: flColor.bronzeBorder },
  feedActions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 11 },
  feedAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  feedActionText: { fontSize: 12.5, color: flColor.gray600 },
  feedActionTextOn: { color: flColor.bronze300 },
  feedTime: { marginLeft: 'auto', fontSize: 11.5, color: flColor.gray600 },
  loadMore: { marginTop: 2, paddingVertical: 13, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal500, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  loadMoreText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, color: flColor.gray400 },
  feedEmpty: { padding: 20, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal900 },
  feedEmptyText: { fontSize: 13, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },

  // members page
  membersScroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  membersHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginHorizontal: 4, marginBottom: 12 },
  membersSquad: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  membersCount: { fontSize: 11.5, color: flColor.gray600 },
  membersHint: { fontSize: 11.5, lineHeight: 16, color: flColor.gray600, textAlign: 'center', marginTop: 14, paddingHorizontal: 20 },
  membersCard: { backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, paddingHorizontal: 16, boxShadow: flShadow.card },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  memberMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  memberMainPressed: { opacity: 0.7 },
  memberManage: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  memberRowDivided: { borderBottomWidth: 1, borderBottomColor: flColor.charcoal800 },
  memberText: { flex: 1, minWidth: 0, gap: 3 },
  memberName: { fontSize: 15.5, color: flColor.cream100 },
  memberYou: { fontSize: 13, color: flColor.gray400 },
  memberRole: { fontSize: 12, color: flColor.gray400 },
});
