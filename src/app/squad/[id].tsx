import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG, BG_RADIAL } from '@/constants/backgrounds';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { SquadCrest } from '@/components/forge/SquadCrest';
import { fetchSquadInvite, GOAL_UNITS, fetchSquad, fetchSquadCheckins, uploadCheckinVideo, postCheckin, markCheckinViewed, setSquadGoal, clearSquadGoal, deleteSquad, removeSquadMember, type SquadCheckin, type SquadMemberView, type SquadGoalMetric } from '@/data/squad-live';
import { detailFor, ensureWeeklyRecap, fetchSquadFeed, fmtDuration, fmtVolume, leadFor, recapSummaryLine, timeAgo, toggleSquadReaction, type SquadFeedPost, type SquadPostType } from '@/data/squad-feed-live';
import { FlameIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { useQuery } from '@/lib/useQuery';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Squad Detail (S-2) — built to `Squad Detail.dc.html`, scoped to what Squad Core can back with real data.
 *
 * Real, design-faithful sections: the monumental hero (name · tagline · 92px crest/photo · member count →
 * Members · "N training today"), the Current Goal (title · progress bar · % — set/edit via the Edit-Goal
 * sheet), the full-screen Members page, and the owner Options sheet (Settings · Invite · Delete → confirm).
 * The design's check-ins / mission / competitions / hall / feed / honors / analytics sections need their own
 * Social backends and are intentionally omitted (later parts) — not stubbed with fake data.
 */
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const squadId = String(id ?? '');
  const { data, loading, error, refetch } = useQuery(() => fetchSquad(squadId), [squadId]);
  const { showToast } = useToast();
  const { pick, mediaPickerSheet } = useMediaPicker();

  const [feedLimit, setFeedLimit] = useState(5);
  const [reactMap, setReactMap] = useState<Record<string, { on: boolean; n: number }>>({});
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
  const canInvite = inviteInfo?.canInvite ?? false;

  const [checkinViewer, setCheckinViewer] = useState<SquadCheckin | null>(null);
  const [uploadingCheckin, setUploadingCheckin] = useState(false);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());

  const [view, setView] = useState<'detail' | 'members'>('detail');
  const [memberAction, setMemberAction] = useState<SquadMemberView | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<SquadMemberView | null>(null);
  const [removing, setRemoving] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetText, setGoalTargetText] = useState('');
  const [goalMetricKind, setGoalMetricKind] = useState<SquadGoalMetric>('workout_count');
  const [goalMetricKey, setGoalMetricKey] = useState<string | null>(null);
  const [savingGoal, setSavingGoal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchFeed();
      refetchCheckins();
      setReactMap({}); // let fresh server truth win each time the screen regains focus
    }, [refetch, refetchFeed, refetchCheckins]),
  );

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
        <AppBar title="Members" serif onBack={() => setView('detail')} />
        <ScrollView contentContainerStyle={styles.membersScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.membersHead}>
            <Text style={styles.membersSquad}>{squad.name}</Text>
            <Text style={styles.membersCount}>{members.length === 1 ? '1 member' : `${members.length} members`}</Text>
          </View>
          <View style={styles.membersCard}>
            {members.map((m, i) => (
              <MemberRow key={m.id} member={m} last={i === members.length - 1} onPress={squad.isOwner && !m.isSelf ? () => setMemberAction(m) : undefined} />
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
  const goalValid = Number(goalTargetText) >= 1;
  const feedPosts = feedData ?? [];
  const canLoadMore = feedPosts.length === feedLimit;
  const checkinPeople = checkinsData?.members ?? [];
  const iHaveActive = checkinsData?.iHaveActive ?? false;

  const openGoalEditor = () => {
    setGoalTitle(squad.goal ?? '');
    setGoalTargetText(squad.goalTarget != null ? String(squad.goalTarget) : '');
    setGoalMetricKind(squad.goalMetricKind);
    setGoalMetricKey(squad.goalMetricKey);
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
    }).then(
      () => {
        setSavingGoal(false);
        setGoalOpen(false);
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
        refetch();
      },
      () => setSavingGoal(false),
    );
  };
  const startCheckin = async () => {
    if (uploadingCheckin) return;
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
    setUploadingCheckin(true);
    try {
      const url = await uploadCheckinVideo(squad.id, asset.uri);
      await postCheckin(squad.id, url);
      refetchCheckins();
      refetch();
      showToast('Checked in');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Couldn’t post your check-in.');
    } finally {
      setUploadingCheckin(false);
    }
  };
  const openCheckin = (c: SquadCheckin) => {
    setCheckinViewer(c);
    if (!c.watched && !watchedIds.has(c.id)) {
      setWatchedIds((s) => new Set(s).add(c.id));
      void markCheckinViewed(c.id);
    }
  };

  const goCompose = () => router.push({ pathname: '/squad-composer', params: { id: squad.id, owner: squad.isOwner ? '1' : '0' } });
  const openPost = (pid: string) => router.push({ pathname: '/squad-post/[id]', params: { id: pid } });
  const onReactCard = (p: SquadFeedPost) => {
    const reacted = reactMap[p.id]?.on ?? p.iReacted;
    const count = reactMap[p.id]?.n ?? p.respectCount;
    const next = !reacted;
    setReactMap((m) => ({ ...m, [p.id]: { on: next, n: Math.max(0, count + (next ? 1 : -1)) } }));
    toggleSquadReaction(p.id, reacted).catch(() => setReactMap((m) => ({ ...m, [p.id]: { on: reacted, n: count } })));
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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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

          <View style={styles.metaRow}>
            <Pressable onPress={() => setView('members')} accessibilityRole="button" accessibilityLabel={`${members.length} members, view roster`} hitSlop={6} style={styles.metaBtn}>
              <PeopleIcon size={14} color={flColor.gray400} />
              <Text style={styles.metaText}>{members.length === 1 ? '1 member' : `${members.length} members`}</Text>
            </Pressable>
            <View style={styles.metaDot} />
            <View style={styles.metaBtn}>
              <View style={styles.greenDot} />
              <Text style={styles.metaText}>{squad.trainedToday} training today</Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          {/* CURRENT GOAL */}
          {squad.goalTarget != null ? (
            <View>
              <View style={styles.goalHead}>
                <Text style={styles.sectionLabel}>Current Goal</Text>
                {squad.isOwner ? (
                  <Pressable onPress={openGoalEditor} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit goal">
                    <PencilIcon />
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.goalTitle}>{squad.goal || `Reach ${squad.goalTarget} ${goalUnit(squad.goalMetricKind)}`}</Text>
              <View style={styles.progressTrack}>
                <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={[styles.progressFill, { width: `${goalPct}%` }]} />
              </View>
              <Text style={styles.progressCaption}>
                {fmtProgress(Math.min(squad.goalProgress, squad.goalTarget))} / {squad.goalTarget} {goalUnit(squad.goalMetricKind)} · {goalPct}% complete
              </Text>
            </View>
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

        {/* CHECK-INS — ephemeral video stories (latest per member, <24h) */}
        <View style={styles.checkinsSection}>
          <View style={styles.checkinHead}>
            <Text style={styles.feedLabel}>Check-ins</Text>
            <Text style={styles.checkinDate}>Video · disappears in 24h</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.checkinStrip}>
            {iHaveActive ? null : <CheckinCta onPress={() => void startCheckin()} uploading={uploadingCheckin} />}
            {checkinPeople.map((m) => (
              <CheckinDisc key={m.id} member={m} watched={m.watched || watchedIds.has(m.id)} onPress={() => openCheckin(m)} />
            ))}
          </ScrollView>
          {iHaveActive || checkinPeople.length ? null : <Text style={styles.checkinEmpty}>Be the first — post a quick video and let the squad see your effort.</Text>}
        </View>

        {/* SQUAD FEED */}
        <View style={styles.feedSection}>
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
              {feedPosts.map((p) => (
                <FeedCard
                  key={p.id}
                  post={p}
                  reacted={reactMap[p.id]?.on ?? p.iReacted}
                  respect={reactMap[p.id]?.n ?? p.respectCount}
                  onOpen={() => (p.type === 'weekly' ? router.push({ pathname: '/squad-recap/[id]', params: { id: p.id } }) : openPost(p.id))}
                  onReact={() => onReactCard(p)}
                />
              ))}
              {canLoadMore ? (
                <Pressable onPress={() => setFeedLimit((n) => n + 5)} accessibilityRole="button" accessibilityLabel="Load more posts" style={styles.loadMore}>
                  <Text style={styles.loadMoreText}>Load More</Text>
                  <ChevronDownGlyph />
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      {/* OPTIONS SHEET */}
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
          onReplace={
            checkinViewer.isSelf
              ? () => {
                  setCheckinViewer(null);
                  void startCheckin();
                }
              : undefined
          }
        />
      ) : null}

      {mediaPickerSheet}

      {/* EDIT GOAL SHEET */}
      <BottomSheet open={goalOpen} onClose={() => setGoalOpen(false)} title="Edit Squad Goal">
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
          <Text style={styles.goalAutoNote}>Progress updates automatically from your squad’s logged workouts.</Text>
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
  // `imageOpacity` rather than a heavier top overlay: this artwork is near-black everywhere except its
  // golden mountain band, so dimming the whole image toward the base lands almost entirely on the
  // mountains — the slate texture below has almost no luminance to lose. Taken down 25% twice
  // (1 → 0.75 → 0.5625) on review; the peaks should read as atmosphere, not as a photograph.
  return (
    <ScreenBackground
      image={SCREEN_BG.squadDetail}
      imagePosition="top"
      imageOpacity={0.5625}
      atmospheric
      overlay={{ colors: ['rgba(5,5,5,0.12)', 'rgba(5,5,5,0.26)', 'rgba(5,5,5,0.38)'], locations: [0, 0.38, 1] }}
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

function CheckinCta({ onPress, uploading }: { onPress: () => void; uploading: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={uploading} accessibilityRole="button" accessibilityLabel="Post a video check-in" style={styles.ciItem}>
      <View style={styles.ciCtaDisc}>{uploading ? <ActivityIndicator color={flColor.bronze300} /> : <VideoPlusGlyph />}</View>
      <Text style={[styles.ciFirst, styles.ciCtaText]} numberOfLines={1}>
        {uploading ? 'Posting…' : 'Check in'}
      </Text>
    </Pressable>
  );
}

function CheckinViewer({ checkin, onClose, onReplace }: { checkin: SquadCheckin; onClose: () => void; onReplace?: () => void }) {
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
        <View style={styles.viewerTop} pointerEvents="box-none">
          <View style={styles.viewerWho}>
            <Text style={styles.viewerName} numberOfLines={1}>
              {checkin.isSelf ? 'Your check-in' : checkin.name}
            </Text>
            <Text style={styles.viewerTime}>{timeAgo(checkin.createdAt)}</Text>
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={styles.viewerClose}>
            <CloseX />
          </Pressable>
        </View>
        {onReplace ? (
          <View style={styles.viewerBottom} pointerEvents="box-none">
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

function RecapStatSmall({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.recapStatSmall}>
      <Text style={styles.recapStatSmallN}>{n}</Text>
      <Text style={styles.recapStatSmallLabel}>{label}</Text>
    </View>
  );
}

function FeedCard({ post, reacted, respect, onOpen, onReact }: { post: SquadFeedPost; reacted: boolean; respect: number; onOpen: () => void; onReact: () => void }) {
  const isDiscussion = post.type === 'discussion';
  const lead = isDiscussion ? post.body ?? '' : leadFor(post);
  const detail = isDiscussion ? '' : detailFor(post);
  const summary = post.type === 'recap' ? post.workoutSummary : null;

  // The generated Weekly Summary — no author, its own bronze-washed treatment, and the one card that
  // reads as the squad talking rather than a member. The design draws it untappable; it opens its
  // breakdown here (see squad-recap/[id]).
  if (post.type === 'weekly' && post.recap) {
    return (
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel="Open weekly summary" style={[styles.feedCard, styles.weeklyCard]}>
        <LinearGradient colors={['rgba(191,143,79,0.06)', 'transparent'] as const} locations={[0, 0.46] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
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

  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open post by ${post.authorName}`} style={styles.feedCard}>
      <View style={styles.feedCardRow}>
        <View style={styles.feedIcon}>
          <FeedTypeGlyph type={post.type} />
        </View>
        <View style={styles.feedCardBody}>
          <Text style={styles.feedLine}>
            <Text style={styles.feedWho}>{post.authorName}</Text>
            {` ${lead}`}
          </Text>
          {summary ? (
            <View style={styles.recapStrip}>
              <RecapStatSmall n={fmtVolume(summary.volume)} label="Vol" />
              <RecapStatSmall n={fmtDuration(summary.durationSec)} label="Time" />
              <RecapStatSmall n={String(summary.exercises.length)} label="Lifts" />
              {summary.prCount > 0 ? <RecapStatSmall n={String(summary.prCount)} label={summary.prCount === 1 ? 'PR' : 'PRs'} /> : null}
            </View>
          ) : detail ? (
            <Text style={styles.feedDetail} numberOfLines={2}>
              {detail}
            </Text>
          ) : null}
          {post.media[0] ? (
            post.media[0].kind === 'image' ? (
              <Image source={{ uri: post.media[0].url }} style={styles.feedMediaImage} contentFit="cover" />
            ) : (
              <View style={styles.feedVideoTile}>
                <View style={styles.feedPlayDisc}>
                  <PlayGlyph />
                </View>
              </View>
            )
          ) : null}
          <View style={styles.feedActions}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onReact();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: reacted }}
              accessibilityLabel="Respect"
              style={styles.feedAction}
              hitSlop={6}
            >
              <FlameIcon size={15} color={reacted ? flColor.bronze300 : flColor.gray600} />
              <Text style={[styles.feedActionText, reacted ? styles.feedActionTextOn : null]}>{respect}</Text>
            </Pressable>
            <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel="Comments" style={styles.feedAction} hitSlop={6}>
              <FeedCommentGlyph />
              <Text style={styles.feedActionText}>{post.commentCount}</Text>
            </Pressable>
            <Text style={styles.feedTime}>{timeAgo(post.createdAt)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function MemberRow({ member, last, onPress }: { member: SquadMemberView; last: boolean; onPress?: () => void }) {
  const content = (
    <>
      <Avatar src={member.avatarUrl ?? undefined} name={member.name} size="listRow" />
      <View style={styles.memberText}>
        <Text style={styles.memberName} numberOfLines={1}>
          {member.name}
          {member.isSelf ? <Text style={styles.memberYou}> (You)</Text> : null}
        </Text>
        <Text style={styles.memberRole}>{member.role === 'owner' ? 'Owner' : 'Member'}</Text>
      </View>
      {onPress ? <ChevronIcon color={flColor.bronze400} /> : <ChevronIcon color={flColor.gray600} />}
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Manage ${member.name}`} style={[styles.memberRow, last ? null : styles.memberRowDivided]}>
        {content}
      </Pressable>
    );
  }
  return <View style={[styles.memberRow, last ? null : styles.memberRowDivided]}>{content}</View>;
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
function FeedCommentGlyph() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5.5h16v11H9l-4 3z" />
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
function PlayGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={flColor.bronze300}>
      <Path d="M8 5v14l11-7z" />
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
function CloseX() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.cream100} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function FeedTypeGlyph({ type }: { type: SquadPostType }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: flColor.bronze300, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'checkin':
      return (
        <Svg {...p}>
          <Path d="M5 12.5l4 4 10-10" />
        </Svg>
      );
    case 'recap':
      return (
        <Svg {...p}>
          <Path d="M6.5 8v8M17.5 8v8M4 10v4M20 10v4M6.5 12h11" />
        </Svg>
      );
    case 'pr':
      return (
        <Svg {...p}>
          <Path d="M7 5h10v3a5 5 0 0 1-10 0z" />
          <Path d="M7 6H4v1.5a3.5 3.5 0 0 0 3.5 3.5M17 6h3v1.5A3.5 3.5 0 0 1 16.5 11M9.5 14h5M12 11v3M8.5 18.5h7" />
        </Svg>
      );
    case 'announcement':
      return (
        <Svg {...p}>
          <Path d="M4 9v6h3l8 4V5L7 9z" />
          <Path d="M18 9a4 4 0 0 1 0 6" />
        </Svg>
      );
    case 'formcheck':
      return (
        <Svg {...p}>
          <Path d="M3.5 7h11v10h-11z" />
          <Path d="M14.5 10.2l6-3.2v10l-6-3.2z" />
        </Svg>
      );
    case 'transformation':
      return (
        <Svg {...p}>
          <Path d="M4 7h3.4l1.2-2h6.8L16.6 7H20v12H4z" />
          <Circle cx={12} cy={13} r={3.1} />
        </Svg>
      );
    default: // discussion
      return (
        <Svg {...p}>
          <Path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4A7.5 7.5 0 1 1 20 11.5z" />
        </Svg>
      );
  }
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
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  tagline: { fontSize: 14, lineHeight: 20, color: flColor.gray400, marginTop: 8, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  crest: {
    width: 92,
    height: 92,
    flexShrink: 0,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    backgroundColor: flColor.charcoal900,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 0 2.5px ${flColor.bronze400}, 0 8px 22px rgba(0,0,0,0.7), 0 0 18px rgba(191,143,79,0.3)`,
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
  removeGoalBtn: { alignSelf: 'center', paddingVertical: 4 },
  removeGoalText: { fontSize: 13, fontWeight: '600', color: flColor.redMuted },

  // confirm modal
  confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: flColor.overlayDark },
  confirmCard: { width: '100%', maxWidth: 320, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal500, borderRadius: flRadius.xl, padding: 24, boxShadow: flShadow.ambient },
  confirmTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  confirmBody: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center', marginTop: 10 },
  confirmActions: { gap: 10, marginTop: 22 },

  // today's check-ins
  checkinsSection: { paddingHorizontal: 20, marginTop: 12 },
  checkinHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  checkinDate: { fontSize: 11.5, color: flColor.gray600 },
  checkinStrip: { gap: 6, paddingBottom: 4, paddingRight: 8 },
  checkinEmpty: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600, marginTop: 2, paddingRight: 20 },
  ciItem: { width: 72, alignItems: 'center', gap: 8, paddingVertical: 2 },
  ciRing: { width: 58, height: 58, borderRadius: flRadius.round, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  ciRingNew: { borderColor: flColor.bronze300, boxShadow: `0 0 10px rgba(191,143,79,0.5)` },
  ciRingWatched: { borderColor: flColor.charcoal500 },
  ciAvatarWrap: { width: 48, height: 48, borderRadius: flRadius.round, overflow: 'hidden' },
  ciDim: { opacity: 0.45 },
  ciImg: { width: '100%', height: '100%' },
  ciInitials: { width: '100%', height: '100%', backgroundColor: '#2c2118', alignItems: 'center', justifyContent: 'center' },
  ciInitialsText: { fontSize: 15, fontWeight: '700', color: flColor.bronze300 },
  ciPlayBadge: { position: 'absolute', bottom: -1, right: -1, width: 19, height: 19, borderRadius: 9.5, backgroundColor: flColor.bronze400, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: flColor.charcoal900, paddingLeft: 1 },
  ciFirst: { maxWidth: 72, fontSize: 12.5, color: flColor.gray400 },
  ciCtaDisc: { width: 58, height: 58, borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.bronzeBorder, borderStyle: 'dashed', backgroundColor: flColor.bronzeTint, alignItems: 'center', justifyContent: 'center' },
  ciCtaText: { color: flColor.bronze300, fontWeight: '600' },

  // check-in video viewer (full-screen)
  viewerRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' },
  viewerBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  viewerStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewerVideo: { width: '100%', height: '100%' },
  viewerTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 54, paddingBottom: 16, paddingHorizontal: 18 },
  viewerWho: { flex: 1, minWidth: 0 },
  viewerName: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  viewerTime: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  viewerClose: { width: 38, height: 38, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  viewerBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: 40, paddingHorizontal: 20 },
  viewerReplace: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12, paddingHorizontal: 22, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: 'rgba(23,16,9,0.85)' },
  viewerReplaceText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3, color: flColor.bronze300 },

  // squad feed
  feedSection: { paddingHorizontal: 20, marginTop: 10 },
  feedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  feedLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  newPostBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: '#3D2F1A', boxShadow: flShadow.glowSubtle },
  newPostText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.3, color: flColor.bronze300 },
  feedList: { gap: 10 },
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
  recapStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 8 },
  recapStatSmall: { gap: 2 },
  recapStatSmallN: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.bronze300 },
  recapStatSmallLabel: { fontSize: 8.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
  feedMediaImage: { width: '100%', height: 180, borderRadius: flRadius.md, marginTop: 10, backgroundColor: flColor.charcoal900 },
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
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  memberRowDivided: { borderBottomWidth: 1, borderBottomColor: flColor.charcoal800 },
  memberText: { flex: 1, minWidth: 0, gap: 3 },
  memberName: { fontSize: 15.5, color: flColor.cream100 },
  memberYou: { fontSize: 13, color: flColor.gray400 },
  memberRole: { fontSize: 12, color: flColor.gray400 },
});
