import type { ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import {
  AccomplishmentCard,
  CompactChapterRow,
  CurrentChapter,
  MyStandard,
  SealedChapterCard,
  TimelineRow,
} from '@/components/forge/profile-sections';
import { fetchAthleteProfile, rankLabel, type AthleteProfile } from '@/data/athlete-profile-live';
import { fetchAthleteTraining, minutesTraining } from '@/data/presence-live';
import { acceptFriendRequest, friendAction, removeFriendship, requestFriend, type FriendState } from '@/data/friends-live';
import type { Accomplishment, Chapter, Goal, TimelineEntry } from '@/types/legacy';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { ReportSheet } from '@/components/ReportSheet';
import { blockAthlete, isBlockedWith, unblockAthlete } from '@/data/moderation-live';
import {
  BLOCK_CONFIRM_TITLE,
  UNBLOCK_CONFIRM_BODY,
  UNBLOCK_CONFIRM_TITLE,
  blockConfirmBody,
} from '@/domain/moderation/moderation-core';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Athlete Profile (`/athlete/[id]`) — the specs' "Limited Athlete Profile", built to
 * `Forge Public Profile.dc.html`. One renderer for every subject, self included.
 *
 * WHAT CHANGED, AND WHY IT MATTERED. The screen and its section components already existed and were
 * already built to this design. What it said about itself was the problem:
 *
 *     "the app has a per-athlete dataset for exactly ONE subject — the signed-in athlete. So SELF renders
 *      rich; every OTHER athlete has no dataset and renders sparse (identity + inert actions only)"
 *
 * Which meant every avatar in the competition standings, the record book and the join-request queue
 * opened a near-empty page. Migration 0069 is that missing dataset.
 *
 * THE GATE MOVED TO THE SERVER, and that is the substantive change. The old version fetched what it could
 * and decided client-side whether to draw each section, with `?chapter=private`-style query overrides to
 * demonstrate it. That is not privacy — it ships an athlete's training stats to a stranger's device and
 * trusts the UI to look away, and anyone with a network tab has them. `athlete_profile()` evaluates the
 * subject's own visibility map against the viewer's clearance and does not SELECT a section the viewer
 * cannot see, so a hidden section is ABSENT from the payload.
 *
 * `null` MEANS "NOT CLEARED"; `[]` MEANS "NOTHING THERE". Never collapsed into one falsy check — an
 * athlete with no sealed chapters and an athlete who keeps them private are different facts, and only one
 * of them is the viewer's business.
 *
 * A HIDDEN SECTION IS SILENT. There is no "this athlete's stats are private" placeholder, because that
 * sentence is itself a disclosure: it reveals both what they have and that they chose to withhold it. A
 * gated section is indistinguishable from one that was never filled in.
 *
 * IDENTITY IS ALWAYS VISIBLE — rank, Standard and Athlete Type are core identity, deliberately absent
 * from `visibility.ts`'s controllable list. Rank is the subject's REAL stored family and level; the
 * design renders Foundation IV for every athlete from a literal.
 *
 * THE FIREWALL NEEDED NOTHING EXTRA. The specs ask for a "performance-free" profile, and `stats` defaults
 * to the `squads` audience — so a stranger never receives training numbers while a squad-mate does, which
 * is exactly what SQ-D2 lifts the Performance Firewall for inside a squad. The visibility ladder was
 * already the correct mechanism.
 *
 * ROUTED BY ID, NOT NAME. It used to take a display name and look the subject up by it, which cannot
 * identify anybody reliably — and `squad-post` was already passing a real uuid into that name lookup, so
 * the two callers disagreed. Every real caller passes an id now.
 *
 * NOT ON THIS SURFACE: Featured Legacy Moment (needs FLM event data this read doesn't carry) and Honors
 * (no HonorInstance backend). The Legacy tab remains the rich self surface for both.
 *
 * ADD FRIEND IS LIVE (migration 0073). The button reads the real relationship — Add Friend / Accept
 * Request / Request Sent / Friends — and acting on it writes the graph. Withdrawing a sent request and
 * unfriending both go through the same erasure, because a declined or withdrawn request must leave no
 * trace (there is no DECLINED row to find).
 *
 * FOLLOW IS NOT BUILT, AND WILL NOT BE. The design draws a Follow button beside Add Friend, and it is
 * barred outright — FR-D2 is titled "Why this is NOT a follower system", and FR-D3, Social-System §143 and
 * Product DNA §10 all prohibit asymmetric or unconsented relationships. The product-owner reasoning:
 * a follower would receive nothing, since posts carry Friends/Squad audiences and a public audience means
 * public performance data — the actually-barred item. Communities is the creator/audience surface if one
 * is ever wanted. This is a deliberate absence, not an unfinished feature.
 *
 * TRAIN WITH IS LIVE (0092) — it opens the invite composer against this athlete. Accepting starts them
 * an ordinary workout with you already tagged as a partner, which is what finally writes a real name into
 * `workouts.partners` (there since 0016, and counted by 0079's partnership honors).
 *
 * REPORT AND BLOCK ARE LIVE (migration 0171), in the ⋯ menu on the app bar.
 *
 * ⚠ THIS PARAGRAPH USED TO READ: *"STILL INERT, HONESTLY: Invite to Squad, Report and Block. Each needs a
 *   system that doesn't exist. They render visibly disabled with one line saying so, rather than as buttons
 *   that toast."* **Only the first sentence was true.** Report and Block were not rendered at all — not
 *   disabled, not present — so a header describing an honest disabled state was itself describing something
 *   the screen did not do. Recorded because it is the same failure the whole 0171 pass exists to correct:
 *   a control that claims more than the app delivers, in the one area where App Store review looks.
 *
 * The block is enforced ENTIRELY server-side (four RESTRICTIVE policies + four predicates in
 * `friends_feed`). Nothing on this screen filters anything — see `data/moderation-live.ts`'s header for why
 * client-side filtering would silently turn a block into a mute.
 *
 * INVITE TO SQUAD REMAINS UNBUILT, and is not rendered.
 */

const SCROLL_RANGE = 220;

export default function AthleteProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const athleteId = String(id ?? '').trim();
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery(() => fetchAthleteProfile(athleteId), [athleteId]);
  /* Presence is volatile where the profile is not, so it is its own read (0089) — and it is what makes
     the "Everyone" audience real, since `training_now()` is circle-scoped by design. */
  const { data: training } = useQuery(() => fetchAthleteTraining(athleteId), [athleteId]);
  const [scrollY] = useState(() => new Animated.Value(0));
  const { showToast } = useToast();
  // Optimistic, so the button responds on tap rather than after a round trip; the refetch reconciles.
  const [pending, setPending] = useState<FriendState | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmUnblock, setConfirmUnblock] = useState(false);
  /*
   * Whether a block already exists, in EITHER direction — `is_blocked()` is symmetric.
   *
   * ⚠ THIS CHOOSES WHICH CONTROL TO SHOW, AND NOTHING ELSE. It never decides what renders: the database
   * has already removed every blocked row before this screen sees it, via 0171's four RESTRICTIVE policies
   * and the four predicates in `friends_feed`. Filtering here as well would make the block feel client-side
   * — and a client-side block only hides content from the person who blocked, leaving the other half of the
   * pair reading everything.
   */
  const { data: blocked, refetch: refetchBlocked } = useQuery(() => isBlockedWith(athleteId), [athleteId]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/squads'));

  if (loading && !data) {
    return (
      <Shell onBack={goBack}>
        <ActivityIndicator color={flColor.bronze400} />
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell onBack={goBack}>
        <Text style={styles.missingTitle}>{error ? 'Couldn’t load this profile.' : 'This profile isn’t available.'}</Text>
        {error ? <Text style={styles.missingBody}>{error}</Text> : null}
        <Pressable onPress={error ? refetch : goBack} accessibilityRole="button" accessibilityLabel={error ? 'Try again' : 'Back'} style={styles.outlineBtn}>
          <Text style={styles.outlineBtnLabel}>{error ? 'Try Again' : 'Back'}</Text>
        </Pressable>
      </Shell>
    );
  }

  // p = 0…1 across the first 220px, exactly as the design drives its hero.
  const p = scrollY.interpolate({ inputRange: [0, SCROLL_RANGE], outputRange: [0, 1], extrapolate: 'clamp' });
  const rank = rankLabel(data.rankFamily, data.rankLevel);
  const state = pending ?? data.friendship;

  const run = (work: Promise<unknown>, next: FriendState, said: string) => {
    if (busy) return;
    setBusy(true);
    setPending(next);
    work.then(
      () => {
        setBusy(false);
        showToast(said);
        refetch();
      },
      (e: unknown) => {
        setBusy(false);
        setPending(null); // put the button back where it was
        showToast(errorMessage(e));
      },
    );
  };

  const onFriendAction = () => {
    switch (state) {
      case 'none':
        return run(requestFriend(athleteId).then((r) => setPending(r)), 'outgoing', `Request sent to ${data.firstName}`);
      case 'incoming':
        return run(acceptFriendRequest(athleteId), 'friends', `You and ${data.firstName} are friends`);
      case 'outgoing':
        // Withdrawing leaves no trace, same call as declining and unfriending.
        return run(removeFriendship(athleteId), 'none', 'Request withdrawn');
      case 'friends':
        return setConfirmRemove(true);
      default:
        return undefined;
    }
  };

  return (
    <View style={styles.root}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.legacy} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      {/* The plate that dissolves the artwork as you read — the design's `p · 0.52`. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.plate, { opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 0.52] }) }]} />

      {/*
        * ⚠ THE UGC CONTROLS APPLE REQUIRES (Guideline 1.2), AND THIS IS THE SCREEN THEY HAVE TO BE ON.
        *
        * An athlete profile is the surface a stranger reaches from Discover, friend search or a squad
        * roster — the one place a person can be seen with no relationship in place. Report and Block are
        * hidden for `isSelf`, because neither means anything about yourself and both would be noise on the
        * screen every athlete visits most.
        */}
      <AppBar
        title=""
        onBack={goBack}
        actions={data.isSelf ? null : <OverflowButton onPress={() => setActionsOpen(true)} />}
      />

      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        {/* ── Identity hero: fades, parallaxes, and shrinks its portrait toward the corner ── */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.1] }),
              transform: [{ translateY: scrollY.interpolate({ inputRange: [0, SCROLL_RANGE], outputRange: [0, -SCROLL_RANGE * 0.12], extrapolate: 'clamp' }) }],
            },
          ]}
        >
          <Animated.View style={[styles.portrait, { transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.76] }) }] }]}>
            <Avatar name={data.name} src={data.avatarUrl ?? undefined} size="profile" ring />
          </Animated.View>

          <View style={styles.heroText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {data.name}
              </Text>
              {data.isSelf ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>You</Text>
                </View>
              ) : null}
            </View>
            {data.handle ? <Text style={styles.handle}>@{data.handle}</Text> : null}

            {rank || data.athleteType ? (
              <View style={styles.markerRow}>
                {rank ? <Text style={styles.rank}>{rank}</Text> : null}
                {rank && data.athleteType ? <View style={styles.dot} /> : null}
                {data.athleteType ? <Text style={styles.athleteType}>{data.athleteType}</Text> : null}
              </View>
            ) : null}

            {/* Real shared squads. The design hardcodes "Iron Vigil". */}
            {data.sharedSquads.length > 0 ? (
              <View style={styles.chipRow}>
                {data.sharedSquads.slice(0, 2).map((s) => (
                  <View key={s} style={styles.chip}>
                    <Text style={styles.chipText} numberOfLines={1}>
                      {s}
                    </Text>
                  </View>
                ))}
                {data.sharedSquads.length > 2 ? <Text style={styles.chipMore}>+{data.sharedSquads.length - 2}</Text> : null}
              </View>
            ) : null}
          </View>
        </Animated.View>

        {!data.isSelf ? (
          <Actions
            state={state}
            busy={busy}
            onPress={onFriendAction}
            onChallenge={() => router.push({ pathname: '/create-challenge', params: { athlete: athleteId } })}
            /* Same button, honest verb (0121). Someone who is training right now cannot usefully be
               invited to start a workout — they are in one. Asking to JOIN it is the thing that was
               missing, and `training` is exactly the condition that says which of the two applies. */
            live={!!training}
            onTrainWith={() =>
              router.push(
                training
                  ? { pathname: '/workout-join', params: { athlete: athleteId } }
                  : { pathname: '/train-invite', params: { athlete: athleteId } },
              )
            }
          />
        ) : null}

        {/* My Standard — core identity, always visible (visibility.ts header). */}
        {data.standard ? (
          <View style={styles.standardPad}>
            <MyStandard standard={data.standard} />
          </View>
        ) : null}

        {/* Training stats — `squads` by default, so a stranger is never sent these at all. */}
        {data.stats ? (
          <View style={styles.statsRow}>
            <StatCell value={data.stats.workouts} label="Workouts" />
            <StatCell value={data.stats.prs} label={data.stats.prs === 1 ? 'PR' : 'PRs'} />
            <StatCell value={data.stats.chapters} label={data.stats.chapters === 1 ? 'Chapter' : 'Chapters'} />
          </View>
        ) : null}

        {/* Training right now (0086/0089). Absent means EITHER not training or not cleared — a viewer must
            not be able to tell a private athlete from a resting one. */}
        {training ? (
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>
              Training now{training.label ? ` · ${training.label}` : ''} · {minutesTraining(training.startedAt)} min
            </Text>
          </View>
        ) : null}

        {/* Trophy Case (0084). Gated on the same `stats` audience the row above is, because a competitive
            record is performance data — so if the stats block is here, the trophy case is readable too. */}
        {data.stats ? (
          <Pressable
            onPress={() => router.push({ pathname: '/trophy-case', params: { athlete: data.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${data.firstName}’s trophy case`}
            style={({ pressed }) => [styles.trophyRow, pressed ? styles.pressed : null]}
          >
            <CrownGlyph />
            <Text style={styles.trophyText}>Trophy Case</Text>
            <ChevronGlyph />
          </Pressable>
        ) : null}

        {/* Friend-clearance only. `null` still means not cleared, so a squad-mate sees nothing here. */}
        {data.transformation && data.transformation.entries > 0 ? (
          <View style={styles.transformRow}>
            <SparkGlyph />
            <Text style={styles.transformText}>
              {data.transformation.entries} transformation {data.transformation.entries === 1 ? 'entry' : 'entries'} shared with friends
            </Text>
          </View>
        ) : null}

        {data.chapter ? <CurrentChapter chapter={toChapter(data.chapter)} dayCount={daysSince(data.chapter.startDate)} /> : null}

        {data.history && data.history.length > 0 ? (
          <View style={[styles.sectionPad, styles.storyStack]}>
            <SealedChapterCard chapter={toSealed(data.history[0])} />
            {data.history.slice(1).map((c) => (
              <CompactChapterRow key={c.id} chapter={toSealed(c)} />
            ))}
          </View>
        ) : null}

        {data.timeline && data.timeline.length > 0 ? (
          <View style={styles.sectionPad}>
            <Text style={styles.overlineTight}>Recent</Text>
            <View>
              {data.timeline.slice(0, 6).map((t, i) => (
                <TimelineRow key={`${t.at}-${i}`} entry={toTimeline(t, i)} />
              ))}
            </View>
          </View>
        ) : null}

        {data.accomplishments && data.accomplishments.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderPad}>
              <SectionHeader label="Accomplishments" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripPad}>
              {data.accomplishments.map((a) => (
                <AccomplishmentCard key={a.id} item={toAccomplishment(a)} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.rule} />
          <View style={styles.diamond} />
          <View style={styles.rule} />
        </View>
        <Text style={styles.footerHandle}>{data.handle ? `@${data.handle}` : data.name}</Text>
      </Animated.ScrollView>

      <ConfirmSheet
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        headline={`Remove ${data.firstName} as a friend?`}
        body={`You'll both stop seeing what the other shares with friends. Nothing is recorded, and either of you can send a request again.`}
        confirmLabel="Remove Friend"
        onConfirm={() => {
          setConfirmRemove(false);
          run(removeFriendship(athleteId), 'none', `${data.firstName} removed`);
        }}
        tone="destructive"
        cancelLabel="Keep"
      />

      {/* ── Guideline 1.2 controls (0171) ────────────────────────────────────────────── */}

      <BottomSheet open={actionsOpen} onClose={() => setActionsOpen(false)} title={data.name}>
        <View style={styles.moderationSheet}>
          <Pressable
            onPress={() => {
              setActionsOpen(false);
              setReportOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Report ${data.name}`}
            style={styles.moderationRow}
          >
            <Text style={styles.moderationLabel}>Report {data.firstName}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setActionsOpen(false);
              if (blocked) setConfirmUnblock(true);
              else setConfirmBlock(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={blocked ? `Unblock ${data.name}` : `Block ${data.name}`}
            style={styles.moderationRow}
          >
            <Text style={[styles.moderationLabel, styles.moderationDanger]}>
              {blocked ? `Unblock ${data.firstName}` : `Block ${data.firstName}`}
            </Text>
          </Pressable>
        </View>
      </BottomSheet>

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetKind="athlete"
        targetId={athleteId}
        targetAthleteId={athleteId}
        targetName={data.firstName}
      />

      <ConfirmSheet
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        headline={BLOCK_CONFIRM_TITLE}
        body={blockConfirmBody(data.firstName)}
        confirmLabel="Block"
        onConfirm={() => {
          setConfirmBlock(false);
          /*
           * `refetchBlocked` on success, and the friend state is reset to 'none' in the same breath —
           * `block_athlete()` deletes the friendship server-side, so leaving the button reading "Friends"
           * would show a relationship the database no longer has.
           */
          run(blockAthlete(athleteId).then(() => refetchBlocked()), 'none', `${data.firstName} blocked`);
        }}
        tone="destructive"
        cancelLabel="Cancel"
      />

      <ConfirmSheet
        open={confirmUnblock}
        onClose={() => setConfirmUnblock(false)}
        headline={UNBLOCK_CONFIRM_TITLE}
        body={UNBLOCK_CONFIRM_BODY}
        confirmLabel="Unblock"
        onConfirm={() => {
          setConfirmUnblock(false);
          run(unblockAthlete(athleteId).then(() => refetchBlocked()), 'none', `${data.firstName} unblocked`);
        }}
        cancelLabel="Cancel"
      />
    </View>
  );
}

/** The ⋯ that carries Report and Block. Its own component so the AppBar `actions` slot stays one node. */
function OverflowButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="More options"
      hitSlop={10}
      style={styles.overflow}
    >
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.overflowDot} />
      ))}
    </Pressable>
  );
}

// ── mapping onto the shared Legacy view types, so this renders the SAME components as the hub ──

type ProfileChapterT = NonNullable<AthleteProfile['chapter']>;

function goalOf(g: ProfileChapterT['goal']): Goal {
  if (!g) return { kind: 'none' };
  if (g.target == null) return { kind: 'narrative', name: g.name, achieved: false };
  const progress = g.target > 0 ? Math.round(Math.min(1, g.current / g.target) * 100) : 0;
  return {
    kind: 'quantifiable',
    name: g.name,
    progress,
    achieved: progress >= 100,
    valueLabel: `${g.current.toLocaleString('en-US')} / ${g.target.toLocaleString('en-US')}${g.unit ? ` ${g.unit}` : ''}`,
  };
}

function toChapter(c: ProfileChapterT): Chapter {
  return {
    id: c.id,
    name: c.name,
    startDate: c.startDate,
    goal: goalOf(c.goal),
    workoutCount: c.workoutCount,
    honorCount: c.honorCount,
    isActive: true,
  };
}

function toSealed(c: NonNullable<AthleteProfile['history']>[number]): Chapter {
  const start = new Date(c.startDate);
  const end = c.sealedAt ? new Date(c.sealedAt) : null;
  const days = end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000)) : null;
  const mon = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  return {
    id: c.id,
    name: c.name,
    startDate: c.startDate,
    sealedAt: c.sealedAt ?? undefined,
    dateRangeFull: end ? `${mon(start)} ${start.getDate()} – ${mon(end)} ${end.getDate()}, ${end.getFullYear()}${days ? ` · ${days} days` : ''}` : undefined,
    dateRangeCompact: end ? `${mon(start)} – ${mon(end)} ${end.getFullYear()}${days ? ` · ${days}d` : ''}` : undefined,
    goal: { kind: 'none' },
    workoutCount: c.workoutCount,
    // Real since 0098. This was a literal 0 because the profile payload carried no honor count for a
    // sealed chapter — so every sealed chapter on every profile claimed the athlete earned nothing.
    honorCount: c.honorCount,
    isActive: false,
  };
}

function toTimeline(t: NonNullable<AthleteProfile['timeline']>[number], i: number): TimelineEntry {
  return {
    id: `${t.at}-${i}`,
    eventType: t.kind === 'chapter' ? 'CHAPTER_SEALED' : 'ACCOMPLISHMENT',
    objectName: t.label,
    dateLabel: new Date(t.at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  };
}

function toAccomplishment(a: NonNullable<AthleteProfile['accomplishments']>[number]): Accomplishment {
  return {
    id: a.id,
    text: a.name,
    monthYear: a.date ? new Date(a.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '',
    featured: a.featured,
  };
}

const daysSince = (iso: string): number => Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));

// ── pieces ──

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value.toLocaleString('en-US')}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * Add Friend, Challenge and Train With are all live between friends; Invite to Squad, Report and Block
 * remain honest inert shells.
 *
 * There is no Follow button. The design has one and it is barred (FR-D2/FR-D3/§143/DNA §10) — a deliberate
 * absence, so it is not rendered as "coming soon" either. Nothing here implies it is on the way.
 */
function Actions({
  state,
  busy,
  onPress,
  onChallenge,
  onTrainWith,
  live,
}: {
  state: FriendState;
  busy: boolean;
  onPress: () => void;
  onChallenge: () => void;
  onTrainWith: () => void;
  /** They are training RIGHT NOW, so the action is to join rather than to invite. */
  live?: boolean;
}) {
  const action = friendAction(state);
  const isPending = action.kind === 'pending';
  const isFriends = action.kind === 'friends';

  return (
    <View style={styles.actionsSection}>
      <View style={styles.actionRow}>
        <Pressable
          onPress={onPress}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{ busy }}
          style={({ pressed }) => [
            styles.action,
            styles.actionLive,
            isPending || isFriends ? styles.actionQuiet : null,
            pressed || busy ? styles.actionPressed : null,
          ]}
        >
          {action.kind === 'accept' ? <CheckGlyph /> : isFriends ? <FriendsGlyph /> : <AddFriendGlyph />}
          <Text style={[styles.actionLabel, styles.actionLabelLive]}>{action.label}</Text>
        </Pressable>

        {/* Both live now. Challenge opens a FRIENDS competition against them (0087); Train With sends a
            shared-workout invite (0092). Neither is offered to a stranger — the backend refuses either
            way, and an action that will be rejected is worse than one that isn't shown. */}
        {isFriends ? (
          <>
            <LiveAction glyph={<SwordsGlyph />} label="Challenge" onPress={onChallenge} />
            <LiveAction glyph={<PeopleGlyph />} label={live ? 'Join Workout' : 'Train With'} onPress={onTrainWith} />
          </>
        ) : (
          <InertAction glyph={<SwordsGlyph />} label="Challenge" />
        )}
      </View>
      {!isFriends ? (
        <Text style={styles.actionNote}>
          Competing and training together are for friends. Friends can also see what each other shares with friends.
        </Text>
      ) : null}
    </View>
  );
}

function LiveAction({ glyph, label, onPress }: { glyph: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, styles.actionLive, pressed ? styles.actionPressed : null]}
    >
      {glyph}
      <Text style={[styles.actionLabel, styles.actionLabelLive]}>{label}</Text>
    </Pressable>
  );
}

function PeopleGlyph({ size = 16, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <Circle cx={10} cy={8} r={3.2} />
      <Path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.4 5.2a3.2 3.2 0 0 1 0 6" />
    </Svg>
  );
}

function InertAction({ glyph, label }: { glyph: ReactNode; label: string }) {
  return (
    <View accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel={`${label} — not available yet`} style={styles.action}>
      {glyph}
      <Text style={styles.actionLabel}>{label}</Text>
    </View>
  );
}

function Shell({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <View style={styles.root}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.legacy} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="" onBack={onBack} />
      <View style={styles.center}>{children}</View>
    </View>
  );
}

function SparkGlyph({ size = 15, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18" />
    </Svg>
  );
}
function SwordsGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M5 4.5L18 17.5M19 4.5L6 17.5M12.7 15.8L16.3 12.2M7.7 12.2L11.3 15.8" />
    </Svg>
  );
}
function CrownGlyph({ size = 15, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function ChevronGlyph({ size = 15, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}
function AddFriendGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Circle cx={9} cy={8} r={3.4} />
      <Path d="M3.5 20a5.5 5.5 0 0 1 11 0M18 8v6M15 11h6" />
    </Svg>
  );
}
function CheckGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 13l4.5 4.5L19 7" />
    </Svg>
  );
}
function FriendsGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <Path d="M16 6.5a3 3 0 0 1 0 5.6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  plate: { backgroundColor: '#000' },
  // ── Guideline 1.2 controls (0171) ──
  overflow: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', gap: 3 },
  overflowDot: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: flColor.cream100 },
  // ⚠ `moderation*` and not `action*` — this screen already owns `actionRow`, `actionLabel` and four more
  // for the friend-state buttons, and `StyleSheet.create` takes the LAST duplicate key silently at runtime.
  // `tsc` caught it here (TS1117); a plain object would not have.
  moderationSheet: { gap: 2, paddingBottom: 8 },
  moderationRow: { paddingVertical: 15, paddingHorizontal: 4 },
  moderationLabel: { fontSize: 16, color: flColor.cream100 },
  moderationDanger: { color: flColor.redMuted },
  scroll: { paddingBottom: 44 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },
  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  portrait: { transformOrigin: 'left center' },
  heroText: { flex: 1, minWidth: 0, gap: 7 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  name: { flexShrink: 1, fontFamily: flFont.display, fontSize: 24, fontWeight: '700', letterSpacing: -0.3, color: flColor.cream100 },
  handle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, color: flColor.gray600 },
  markerRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 1 },
  rank: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze400 },
  athleteType: { fontSize: 11.5, fontWeight: '500', letterSpacing: 0.3, color: flColor.gray400 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: flColor.bronze400 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  chip: { flexShrink: 1, paddingVertical: 2, paddingHorizontal: 7, borderRadius: flRadius.sm, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  chipText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.bronze400 },
  chipMore: { fontSize: 10, color: flColor.gray600 },

  statsRow: { flexDirection: 'row', marginTop: 26, marginHorizontal: 24, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, overflow: 'hidden' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 15, gap: 4 },
  statValue: { fontFamily: flFont.display, fontSize: 22, fontWeight: '700', letterSpacing: -0.4, color: flColor.cream100 },
  statLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },

  actionsSection: { paddingHorizontal: 24, paddingTop: 26, gap: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, opacity: 0.55 },
  actionLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  actionNote: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },
  actionLive: { opacity: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  actionQuiet: { backgroundColor: flColor.charcoal800, borderColor: flColor.bronzeBorderSubtle },
  actionPressed: { opacity: 0.8 },
  actionLabelLive: { color: flColor.bronze300 },
  transformRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 22, marginHorizontal: 24, paddingHorizontal: 14, paddingVertical: 12, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  transformText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 22, marginHorizontal: 24, paddingHorizontal: 14, paddingVertical: 11, borderRadius: flRadius.lg, borderWidth: 1, borderColor: 'rgba(90, 158, 104, 0.34)', backgroundColor: 'rgba(90, 158, 104, 0.07)' },
  liveDot: { width: 7, height: 7, borderRadius: flRadius.round, backgroundColor: flColor.greenMuted, boxShadow: '0 0 6px rgba(90, 158, 104, 0.6)' },
  liveText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  trophyRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 22, marginHorizontal: 24, paddingHorizontal: 14, paddingVertical: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  trophyText: { flex: 1, fontSize: 13, fontWeight: '600', color: flColor.cream100 },
  pressed: { opacity: 0.88 },

  standardPad: { paddingTop: 20 },
  section: { marginTop: 40 },
  sectionPad: { marginTop: 40, paddingHorizontal: 24 },
  sectionHeaderPad: { paddingHorizontal: 24 },
  stripPad: { gap: 12, paddingHorizontal: 24, paddingTop: 8 },
  storyStack: { gap: 12 },
  overlineTight: { fontSize: 10, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.gray600, paddingHorizontal: 2, paddingBottom: 4 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 40 },
  rule: { flex: 1, maxWidth: 90, height: 1, backgroundColor: flColor.bronzeBorderSubtle },
  diamond: { width: 6, height: 6, transform: [{ rotate: '45deg' }], borderWidth: 1, borderColor: flColor.bronze400 },
  footerHandle: { textAlign: 'center', fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600, marginTop: 15 },
});
