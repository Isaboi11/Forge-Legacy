import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { EndOfLedger, LedgerPost, recapMarker, workoutStats, type LedgerMarker } from '@/components/forge/compositions/LedgerPost';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourAnchor, useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { BG_RADIAL } from '@/constants/backgrounds';
import {
  REACTIONS,
  addPostComment,
  fetchFriendsFeed,
  fetchPostComments,
  setPostReaction,
  shapeOf,
  type FeedPost,
  type PostComment,
  type Reaction,
} from '@/data/friends-feed-live';
import { fetchFriendLists } from '@/data/friends-live';
import { openPlaylist } from '@/components/forge/composites/Playlist';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { useProfile } from '@/lib/profile';
import { useUnits } from '@/lib/settings';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Friends Feed — built to `Forge Friends Feed.dc.html`, on real posts (migration 0074).
 *
 * SOC-D9's intentional-sharing feed: nothing arrives here automatically. Reverse-chronological, which is the
 * whole ordering rule — SOC-D10 permits temporary milestone surfacing and nothing else, so there is no
 * ranking, no engagement weighting and no algorithmic distribution anywhere in this file.
 *
 * ── THE TWO THINGS THAT WEREN'T REAL ──────────────────────────────────────────────────────────────────
 *
 * The design's composer text area is a static `<div>`, not an input: nothing you type is captured, and
 * `submitPost` writes either an empty caption or the hardcoded string "Grateful for this crew. Onward." Its
 * comment field is also a static div, and Send only toasts — its own store has an `addComment()` the screen
 * never calls. So in the design **no athlete-authored text can enter the system at all**, on the screen
 * whose entire purpose is sharing what you chose to say. Both are real inputs here, and both write.
 *
 * ── A LEDGER, NOT A STACK OF CARDS ────────────────────────────────────────────────────────────────────
 *
 * Every post used to be a bordered, shadowed card with a second bronze-tinted container nested inside it
 * for the workout numbers. Posts are now hairline-separated rows drawn by `LedgerPost`, which the Squad
 * feed mounts too — the two feeds keep their own screens, their own queries and their own tables, and
 * share exactly one thing: how a post looks. See that component's header for the rules.
 *
 * ── FOUR ACKNOWLEDGEMENTS, NOT A LIKE ─────────────────────────────────────────────────────────────────
 *
 * Respect · Honor · Support · Strength, in a floating pill; tapping the same one again clears it. SOC-D11
 * calls these lightweight acknowledgements.
 *
 * ⚠ TWO THINGS CHANGED HERE AND THE SECOND ONE CONTRADICTS SOC-D11. The pill is now reached by a PRESS
 * AND HOLD rather than a tap, because the redesigned action row is a single Acknowledge control whose
 * only state change is its colour — a tap that opened a chooser instead of acknowledging would not be
 * that row. And the row shows a COUNT, which SOC-D11 rules out ("no count is ever rendered as a score",
 * hence `acknowledgedLine`, which named people instead and is now unrendered). The design handoff is
 * explicit about the count and PD-7 makes the design govern, so it is built as drawn — but this is a
 * decision the Social architecture has not been amended for, and it should be.
 *
 * ── COMPOSING MOVED OUT, AND THE COMPOSER BAR IS NOW A DOOR ───────────────────────────────────────────
 *
 * This file used to hold its own `Composer` in a `BottomSheet`. It was the only capture surface in the
 * app that opened a media picker from INSIDE a modal, and it was the only one that did not work: the
 * picker presents its own sheet and then a system picker, neither of which can be presented over a modal
 * still on screen. The PO reported it as "it won't let me add a video or a picture, and now I'm frozen".
 *
 * `/squad-composer` is the one composer for both feeds now, and the audience decides where the post
 * lands. Deleting the duplicate was the second reason: two composers writing one table is how the recap
 * stats strip drifted before `RecapStrip` was extracted. What that screen kept from here — the
 * Transformation-archive comparison, the audience control with a live privacy note and no public choice
 * — is described in its own header.
 *
 * ── DELIBERATELY NOT BUILT ────────────────────────────────────────────────────────────────────────────
 *
 * · The Reel layout — ~60 lines behind `isLedger: true` / `isReel: false` literals, with the toggle computed
 *   and never returned. Permanently unreachable in the design; porting it would only make it dead here too.
 * · The Friends overlay — its Accept/Decline are state-only and never reach its own store, so an accepted
 *   request never joins its friends list. `/add-friend` does this against the real graph, so the icon goes
 *   there rather than to a second, disagreeing copy.
 * · The Sharing-settings sheet — its toggles gate milestone auto-posts (SOC-D12), and nothing emits an
 *   Honor-earned or Program-completed event yet, so they would govern nothing.
 * · Post options / Share — toasts in the design, omitted rather than reproduced as toasts.
 *
 * Faithful: the four post shapes, the drag-or-tap progress divider, the overlapping reactor avatars, and
 * the pill picker's pop-in. (The audience control moved to the composer with the rest of composing.)
 */

export default function FriendsFeedScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { profile } = useProfile();
  const { data: posts, loading, error, refetch } = useQuery(() => fetchFriendsFeed(40), []);
  const { data: lists } = useQuery(() => fetchFriendLists().catch(() => null), []);

  /*
   * The composer is a SCREEN now, so posting happens off this one and the feed has to re-read when it
   * comes back. The retired sheet called `refetch()` in its own `onPosted`; the same job, moved to the
   * event that now stands for "you finished composing" — same convention as Squad Detail.
   */
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const addRef = useTourAnchor('friends-add');
  const [commentsFor, setCommentsFor] = useState<FeedPost | null>(null);
  const [pickerId, setPickerId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const feed = posts ?? [];
  const pendingRequests = lists?.incoming.length ?? 0;
  const { units } = useUnits();

  const react = (post: FeedPost, reaction: Reaction) => {
    setPickerId(null);
    if (busyId) return;
    setBusyId(post.id);
    setPostReaction(post.id, post.myReaction === reaction ? null : reaction).then(
      () => {
        setBusyId(null);
        refetch();
      },
      (e: unknown) => {
        setBusyId(null);
        showToast(errorMessage(e));
      },
    );
  };

  /*
   * ⚠ ONE TAP ACKNOWLEDGES; THE FOUR KINDS MOVED TO A LONG PRESS.
   *
   * The action row is now a single Acknowledge control whose only state change is its colour — so a tap
   * can no longer open a picker and ask which kind first. That is the right row, and deleting the four
   * kinds with it would have been wrong: Respect · Honor · Support · Strength are SOC-D11, they are
   * distinct values in `post_reactions`, and a UI that can only ever write one of them strands the other
   * three in a table nothing can reach. So the tap writes the default and the press-and-hold changes it.
   */
  const toggle = (post: FeedPost) => react(post, post.myReaction ?? 'respect');

  return (
    <View style={styles.root}>
      <ScreenBackground atmospheric overlay={null} radials={[BG_RADIAL.friendsApex]} />
      <AppBar
        title="Friends"
        onBack={() => router.back()}
        actions={
          <Pressable
            ref={addRef}
            onPress={() => router.push('/add-friend')}
            accessibilityRole="button"
            accessibilityLabel={pendingRequests > 0 ? `Friends, ${pendingRequests} pending requests` : 'Friends and requests'}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <FriendsGlyph />
            {pendingRequests > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests > 9 ? '9+' : pendingRequests}</Text>
              </View>
            ) : null}
          </Pressable>
        }
      />

      {loading && !posts ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.missingTitle}>Couldn’t load the feed.</Text>
          <Text style={styles.missingBody}>{error}</Text>
          <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Try again" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          ref={tourScroller}
          onScroll={onTourScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setPickerId(null)}
        >
          <TourAnchor id="friends-feed">
          {/*
            ⚠ A SCREEN, NOT A SHEET, AND THAT IS THE WHOLE FIX.

            This used to open an in-file `Composer` inside a `BottomSheet`. `useMediaPicker` presents its
            own sheet and then a system picker, and a picker cannot be presented from inside a modal that
            is still on screen — so "Photo" and "Video" did nothing and an invisible overlay went on
            swallowing taps. Reported by the PO as "it won't let me add a video or a picture, and now I'm
            frozen on the friends feed page".

            The composer now lives at `/squad-composer` for BOTH feeds; the audience decides where the
            post lands. See that file's header.
          */}
          {/* ONE FLAT ROW, NOT A CARD — the feed has no cards left for it to match. */}
          <Pressable
            onPress={() => router.push({ pathname: '/squad-composer', params: { audience: 'FRIENDS' } })}
            accessibilityRole="button"
            accessibilityLabel="Share a moment"
            style={styles.composerBar}
          >
            <LinearGradient colors={['rgba(191,143,79,0.035)', 'transparent']} style={StyleSheet.absoluteFill} />
            <Avatar name={profile?.name ?? ''} src={profile?.avatarUrl ?? undefined} size={38} />
            <Text style={styles.composerText}>What did you forge today?</Text>
            <View style={styles.composerPlus}>
              <PlusGlyph />
            </View>
          </Pressable>
          </TourAnchor>

          {feed.length === 0 ? (
            <EmptyFeed onFind={() => router.push('/add-friend')} hasFriends={(lists?.friends.length ?? 0) > 0} />
          ) : (
            <>
              {feed.map((post, pi) => (
                <TourAnchor key={post.id} id={pi === 0 ? 'friends-post' : undefined}>
                  <View style={styles.postWrap}>
                    {/* The four-way picker floats above the row it belongs to — see `toggle`. */}
                    {pickerId === post.id ? (
                      <View style={styles.pickerWrap}>
                        <ReactionPicker current={post.myReaction} onPick={(r) => react(post, r)} />
                      </View>
                    ) : null}
                    <FeedLedgerPost
                      post={post}
                      units={units}
                      alt={pi % 2 === 1}
                      busy={busyId === post.id}
                      onAcknowledge={() => toggle(post)}
                      onLongAcknowledge={() => setPickerId((cur) => (cur === post.id ? null : post.id))}
                      onAuthor={() => router.push({ pathname: '/athlete/[id]', params: { id: post.authorId } })}
                      onComments={() => setCommentsFor(post)}
                      onWorkout={() => post.workoutId && router.push({ pathname: '/activity/[id]', params: { id: post.workoutId } })}
                    />
                  </View>
                </TourAnchor>
              ))}
              {/* The whole feed is one read of 40 with no pagination, so everything on screen IS
                  everything there is. A feed that simply stops reads as one that failed to load. */}
              <EndOfLedger />
            </>
          )}
        </ScrollView>
      )}

      {/* Authored in the first tour pass and never mounted until now — the walkthrough existed, the
          line rendering it did not. */}
      <ScreenTour screenKey="friends" />

      <CommentsSheet post={commentsFor} onClose={() => setCommentsFor(null)} onChanged={refetch} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function EmptyFeed({ onFind, hasFriends }: { onFind: () => void; hasFriends: boolean }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyCrest}>
        <FriendsGlyph size={26} />
      </View>
      {/* Two situations, two answers — the design shows one panel for both. */}
      <Text style={styles.emptyTitle}>{hasFriends ? 'Nothing shared yet' : 'No friends yet'}</Text>
      <Text style={styles.emptyBody}>
        {hasFriends
          ? 'When you or a friend shares a moment, it appears here. Nothing posts automatically.'
          : 'Add someone by their handle and what they choose to share will appear here.'}
      </Text>
      <Pressable onPress={onFind} accessibilityRole="button" accessibilityLabel="Add a friend" style={({ pressed }) => [styles.emptyBtn, pressed ? styles.pressed : null]}>
        <Text style={styles.emptyBtnLabel}>{hasFriends ? 'Add Another Friend' : 'Add a Friend'}</Text>
      </Pressable>
    </View>
  );
}

/**
 * One friends-feed row, mapped onto the shared ledger renderer.
 *
 * ⚠ THE LAYOUT IS NOT DECIDED HERE. This function's whole job is turning a `FeedPost` into the props
 * `LedgerPost` takes; the gutters, the hairline, the media rules and the suppression of the marker /
 * title / stats on a photo post all live in that component so the Squad feed gets the identical answer
 * from a completely different row shape.
 */
function FeedLedgerPost({
  post,
  units,
  alt,
  busy,
  onAcknowledge,
  onLongAcknowledge,
  onAuthor,
  onComments,
  onWorkout,
}: {
  post: FeedPost;
  units: ReturnType<typeof useUnits>['units'];
  alt: boolean;
  busy: boolean;
  onAcknowledge: () => void;
  onLongAcknowledge: () => void;
  onAuthor: () => void;
  onComments: () => void;
  onWorkout: () => void;
}) {
  const shape = shapeOf(post);
  const summary = shape === 'recap' ? post.workoutSummary : null;

  /* PR and milestone posts keep their own marker; a plain note has no type worth announcing, and a
     label reading DISCUSSION over somebody's sentence is the decoration this redesign removes. */
  const marker: { kind: LedgerMarker; label: string } | null = summary
    ? recapMarker(summary)
    : shape === 'milestone'
      ? post.type === 'pr'
        ? { kind: 'pr', label: post.prLabel ?? 'PR' }
        : { kind: 'milestone', label: post.prLabel ?? 'Milestone' }
      : null;

  return (
    <LedgerPost
      authorName={post.isMine ? 'You' : post.authorName}
      authorAvatarUrl={post.authorAvatarUrl}
      audience={post.audience === 'BOTH' ? 'Friends & Squad' : 'Friends'}
      time={shortAgo(post.createdAt)}
      marker={marker}
      /* `summary.name` is absent on every recap shared before the snapshot carried one, so the type
         stands in rather than a heading reading "null". No backfill, no version check. */
      title={summary ? summary.name ?? recapMarker(summary).label : shape === 'milestone' ? post.prExercise ?? post.body ?? 'A milestone' : null}
      context={summary ? summary.context ?? null : shape === 'milestone' ? post.prValue : null}
      stats={summary ? workoutStats(summary, units) : []}
      playlist={summary?.playlist ?? null}
      onPlaylist={summary?.playlist ? () => void openPlaylist(summary.playlist!) : undefined}
      caption={post.body}
      /*
       * ⚠ `recap` IS IN THIS LIST NOW, AND NOTHING ELSE WAS ADDED WITH IT.
       *
       * `shapeOf` returns `recap` the moment a post carries a summary — before it ever looks at media —
       * so a session shared WITH a photo had its media silently dropped here: the row held it, the card
       * never asked for it. The squad feed has no such hole (it maps `post.media` for every type), so one
       * post showed a photo in one feed and not the other.
       *
       * Deliberately NOT written as "everything except progress". That would also start rendering media
       * on `milestone` — PR and weekly posts, which fall through the same early return — and nothing has
       * asked for that. `progress` stays out regardless: its media are the before/after pair that
       * `customMedia` draws with a draggable divider, and passing them here too would render both.
       */
      media={shape === 'photo' || shape === 'gallery' || shape === 'video' || shape === 'recap' ? post.media.map((m) => ({ url: m.url, kind: m.kind })) : []}
      /* The before/after comparison keeps its draggable divider — the art is the exception, the rules
         around it are not: it still suppresses the marker, the title and the stats. */
      customMedia={shape === 'progress' ? <ProgressCompare post={post} /> : undefined}
      alt={alt}
      busy={busy}
      acknowledged={!!post.myReaction}
      acknowledgeCount={post.reactionCount}
      commentCount={post.commentCount}
      onAuthor={onAuthor}
      onOpen={summary && post.workoutId ? onWorkout : undefined}
      onAcknowledge={onAcknowledge}
      onLongAcknowledge={onLongAcknowledge}
      onComments={onComments}
    />
  );
}

function ReactionPicker({ current, onPick }: { current: Reaction | null; onPick: (r: Reaction) => void }) {
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(pop, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [pop]);

  return (
    <Animated.View
      style={[
        styles.picker,
        { opacity: pop, transform: [{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }, { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] },
      ]}
    >
      {REACTIONS.map((r) => (
        <Pressable
          key={r.key}
          onPress={() => onPick(r.key)}
          accessibilityRole="button"
          accessibilityState={{ selected: current === r.key }}
          accessibilityLabel={r.label}
          style={({ pressed }) => [styles.pickerItem, current === r.key ? styles.pickerItemOn : null, pressed ? styles.pressed : null]}
        >
          <ReactionGlyph kind={r.key} on={current === r.key} />
          <Text style={[styles.pickerLabel, current === r.key ? styles.pickerLabelOn : null]}>{r.label}</Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

/** Before/after with a draggable divider — position tracked as a fraction of the laid-out width. */
function ProgressCompare({ post }: { post: FeedPost }) {
  const before = post.media.find((m) => m.slot === 'before') ?? post.media[0];
  const after = post.media.find((m) => m.slot === 'after') ?? post.media[1];
  const [pct, setPct] = useState(50);
  const [width, setWidth] = useState(0);

  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e) => {
        setWidth((w) => {
          if (w > 0) {
            const x = e.nativeEvent.locationX;
            setPct(Math.max(2, Math.min(98, (x / w) * 100)));
          }
          return w;
        });
      },
    }),
  );

  if (!before || !after) return null;

  return (
    <View style={styles.compare} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} {...responder.panHandlers}>
      <Image source={{ uri: after.url }} style={styles.compareImg} contentFit="cover" />
      {/* The before-image is clipped to the left of the divider, so dragging reveals the after. */}
      <View style={[styles.compareClip, { width: `${pct}%` }]}>
        <Image source={{ uri: before.url }} style={[styles.compareImg, width > 0 ? { width } : null]} contentFit="cover" />
      </View>
      <View style={[styles.divider, { left: `${pct}%` }]} />
      {/* The same grading every other media band gets — the comparison is full-bleed now, so it has to
          be seated in the surface the same way or it reads as a photo pasted onto the feed. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.compareGrade]} />
      <View style={styles.compareBadge}>
        <Text style={styles.compareBadgeText}>Progress</Text>
      </View>
    </View>
  );
}

function PlusGlyph() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}


/** Comments, with a real field that writes. The design's Send only toasts. */
function CommentsSheet({ post, onClose, onChanged }: { post: FeedPost | null; onClose: () => void; onChanged: () => void }) {
  const { showToast } = useToast();
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const postId = post?.id ?? null;

  useEffect(() => {
    if (!postId) return undefined;
    let alive = true;
    fetchPostComments(postId).then(
      (rows) => alive && setComments(rows),
      () => alive && setComments([]),
    );
    return () => {
      alive = false;
    };
  }, [postId]);

  const send = () => {
    if (!postId || !draft.trim() || sending) return;
    setSending(true);
    addPostComment(postId, draft).then(
      () => {
        setSending(false);
        setDraft('');
        fetchPostComments(postId).then(setComments, () => undefined);
        onChanged();
      },
      (e: unknown) => {
        setSending(false);
        showToast(errorMessage(e));
      },
    );
  };

  return (
    <BottomSheet open={post != null} onClose={onClose} title="Comments">
      <View style={styles.comments}>
        {comments === null ? (
          <ActivityIndicator color={flColor.bronze400} style={styles.uploading} />
        ) : comments.length === 0 ? (
          <Text style={styles.note}>No comments yet.</Text>
        ) : (
          comments.map((c) => (
            <View key={c.id} style={styles.comment}>
              <Avatar src={c.authorAvatarUrl ?? undefined} name={c.authorName} size={28} />
              <View style={styles.commentBody}>
                <Text style={styles.commentName}>{c.isMine ? 'You' : c.authorName}</Text>
                <Text style={styles.commentText}>{c.body}</Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.commentInputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Say something…"
            placeholderTextColor={flColor.gray600}
            style={styles.commentInput}
            accessibilityLabel="Write a comment"
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send comment"
            style={({ pressed }) => [styles.sendBtn, draft.trim() ? styles.sendBtnOn : null, pressed ? styles.pressed : null]}
          >
            <Text style={[styles.sendLabel, draft.trim() ? styles.sendLabelOn : null]}>Send</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

function shortAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── glyphs ──
function FriendsGlyph({ size = 20, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.4} />
      <Path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 6.6a3 3 0 0 1 0 5.8M18.5 20c0-2.3-.9-4-2.2-5" />
    </Svg>
  );
}
function ReactionGlyph({ kind, on }: { kind: Reaction; on: boolean }) {
  const color = on ? flColor.bronze300 : flColor.gray600;
  const d =
    kind === 'respect'
      ? 'M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z'
      : kind === 'honor'
        ? 'M12 20c-4-1-6-4-6-8 3 0 5 1 6 3 1-2 3-3 6-3 0 4-2 7-6 8z'
        : kind === 'support'
          ? 'M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z'
          : 'M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11';
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}
/* ⚠ `CommentGlyph`, `PlayGlyph` and `MedalGlyph` are gone with the card. The comment bubble and the
   play disc live in `LedgerPost` now, drawn once for both feeds; the medal belonged to the bronze
   milestone frame this redesign deletes, and there is no bronze frame left to put it on. */

const styles = StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.85 },
  /* ⚠ NO HORIZONTAL PADDING, and that is what lets a photo reach the screen edge. The 18px gutter
     lives inside `LedgerPost`, applied per block, so media can opt out of it and nothing else can. */
  scroll: { paddingBottom: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 4 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round },
  badge: { position: 'absolute', top: 4, right: 3, minWidth: 15, paddingHorizontal: 3, alignItems: 'center', borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal900, backgroundColor: flColor.bronzeSolid },
  badgeText: { fontSize: 8.5, fontWeight: '700', color: flColor.onBronze },

  composerBar: { height: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  composerText: { flex: 1, minWidth: 0, fontSize: 15, color: flColor.gray600 },
  composerPlus: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.bronzeBorder },

  postWrap: { position: 'relative' },
  /* The picker floats over the action row it belongs to, which sits ~52px off the bottom of the post. */
  pickerWrap: { position: 'absolute', left: 10, bottom: 52, zIndex: 10 },

  compare: { position: 'relative', width: '100%', aspectRatio: 4 / 5, overflow: 'hidden', backgroundColor: flColor.charcoal800 },
  compareImg: { width: '100%', height: '100%' },
  compareClip: { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' },
  compareGrade: { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 -70px 70px -50px rgba(6,7,9,0.85)' },
  divider: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: flColor.bronze300 },
  compareBadge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: 'rgba(0,0,0,0.55)' },
  compareBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze300 },

  picker: { flexDirection: 'row', gap: 2, padding: 4, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800 },
  pickerItem: { alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 5, borderRadius: flRadius.pill },
  pickerItemOn: { backgroundColor: flColor.bronzeTint },
  pickerLabel: { fontSize: 8.5, fontWeight: '600', color: flColor.gray600 },
  pickerLabelOn: { color: flColor.bronze300 },

  note: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },

  uploading: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 },


  comments: { gap: 12, paddingBottom: 6 },
  comment: { flexDirection: 'row', gap: 10 },
  commentBody: { flex: 1, minWidth: 0 },
  commentName: { fontSize: 12, fontWeight: '600', color: flColor.cream100 },
  commentText: { marginTop: 2, fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  commentInput: { flex: 1, minWidth: 0, height: 42, paddingHorizontal: 13, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, fontSize: 13.5, color: flColor.cream100 },
  sendBtn: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600 },
  sendBtnOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  sendLabel: { fontSize: 12.5, fontWeight: '700', color: flColor.gray600 },
  sendLabelOn: { color: flColor.bronze300 },

  empty: { marginTop: 30, alignItems: 'center', gap: 5, paddingHorizontal: 22 },
  emptyCrest: { width: 72, height: 72, marginBottom: 12, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  emptyTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray600 },
  emptyBtn: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  emptyBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },

  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },
  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
