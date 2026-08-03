import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourAnchor, useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { BG_RADIAL } from '@/constants/backgrounds';
import {
  EntryStrip,
  PickPreview,
  canPostPick,
  layoutFromPick,
  mediaFromPick,
  useTransformationPick,
} from '@/components/forge/compositions/TransformationPicker';
import {
  REACTIONS,
  acknowledgedLine,
  addPostComment,
  createFriendPost,
  fetchFriendsFeed,
  fetchPostComments,
  setPostReaction,
  shapeOf,
  uploadFeedMedia,
  type FeedPost,
  type PostAudience,
  type PostComment,
  type PostMedia,
  type Reaction,
} from '@/data/friends-feed-live';
import { fetchFriendLists } from '@/data/friends-live';
import { fetchTransformationEntries, type TransformationEntry } from '@/data/transformation-live';
import { fetchMySquads } from '@/data/squad-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { useToast } from '@/hooks/useCeremony';
import { useProfile } from '@/lib/profile';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';

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
 * ── FOUR ACKNOWLEDGEMENTS, NOT A LIKE ─────────────────────────────────────────────────────────────────
 *
 * Respect · Honor · Support · Strength in a floating pill above the row, tapping the same one again to clear
 * it. SOC-D11 calls these lightweight acknowledgements, so the summary names people ("Acknowledged by Priya
 * and Diego and 3 others") and no count is ever rendered as a score.
 *
 * ── PROGRESS POSTS COME FROM THE ARCHIVE ──────────────────────────────────────────────────────────────
 *
 * The design picks two loose photos and offers a per-pose alignment tool built on a web custom element — it
 * sets `data-editable` and synthesizes `dblclick` events to enter and leave reframe mode, which has no RN
 * equivalent. This selects from your Transformation entries instead, which is better rather than merely
 * portable: the archive holds the captures and their pose structure, so a comparison is against the same
 * pose. Same rule as the squad composer, and both share one implementation (`TransformationPicker`).
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
 * Faithful: the audience control with a live privacy note per option and no public choice, the four post
 * shapes, the drag-or-tap progress divider, the overlapping reactor avatars, and the pill picker's pop-in.
 */

const AUDIENCES: { key: PostAudience; label: string; note: string }[] = [
  { key: 'FRIENDS', label: 'Friends', note: 'Only your accepted friends will see this. Never public.' },
  { key: 'SQUAD', label: 'Squad', note: 'Only members of the squad you choose. Never public.' },
  { key: 'BOTH', label: 'Both', note: 'Your friends and that squad. Still never public.' },
];

export default function FriendsFeedScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { profile } = useProfile();
  const { data: posts, loading, error, refetch } = useQuery(() => fetchFriendsFeed(40), []);
  const { data: lists } = useQuery(() => fetchFriendLists().catch(() => null), []);

  const [composerOpen, setComposerOpen] = useState(false);
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const addRef = useTourAnchor('friends-add');
  const [commentsFor, setCommentsFor] = useState<FeedPost | null>(null);
  const [pickerId, setPickerId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const feed = posts ?? [];
  const pendingRequests = lists?.incoming.length ?? 0;

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

  return (
    <View style={styles.root}>
      <ScreenBackground atmospheric overlay={null} radials={[BG_RADIAL.friendsApex]} />
      <AppBar
        title="Friends"
        serif
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
          <Pressable onPress={() => setComposerOpen(true)} accessibilityRole="button" accessibilityLabel="Share a moment" style={styles.composerBar}>
            <Avatar name={profile?.name ?? ''} src={profile?.avatarUrl ?? undefined} size="listRow" />
            <Text style={styles.composerText}>What did you forge today?</Text>
          </Pressable>
          </TourAnchor>

          {feed.length === 0 ? (
            <EmptyFeed onFind={() => router.push('/add-friend')} hasFriends={(lists?.friends.length ?? 0) > 0} />
          ) : (
            feed.map((post, pi) => (
              <TourAnchor key={post.id} id={pi === 0 ? 'friends-post' : undefined}>
              <PostCard
                post={post}
                pickerOpen={pickerId === post.id}
                busy={busyId === post.id}
                onTogglePicker={() => setPickerId((cur) => (cur === post.id ? null : post.id))}
                onReact={(r) => react(post, r)}
                onAuthor={() => router.push({ pathname: '/athlete/[id]', params: { id: post.authorId } })}
                onComments={() => setCommentsFor(post)}
              />
              </TourAnchor>
            ))
          )}
        </ScrollView>
      )}

      {/* Authored in the first tour pass and never mounted until now — the walkthrough existed, the
          line rendering it did not. */}
      <ScreenTour screenKey="friends" />

      <Composer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPosted={() => {
          setComposerOpen(false);
          showToast('Shared');
          refetch();
        }}
      />

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

function PostCard({
  post,
  pickerOpen,
  busy,
  onTogglePicker,
  onReact,
  onAuthor,
  onComments,
}: {
  post: FeedPost;
  pickerOpen: boolean;
  busy: boolean;
  onTogglePicker: () => void;
  onReact: (r: Reaction) => void;
  onAuthor: () => void;
  onComments: () => void;
}) {
  const shape = shapeOf(post);
  const line = acknowledgedLine(post);

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Pressable onPress={onAuthor} accessibilityRole="button" accessibilityLabel={`View ${post.authorName}'s profile`} style={styles.author}>
          <Avatar src={post.authorAvatarUrl ?? undefined} name={post.authorName} size={38} />
          <View style={styles.authorText}>
            <Text style={styles.authorName} numberOfLines={1}>
              {post.isMine ? 'You' : post.authorName}
            </Text>
            <Text style={styles.authorMeta}>
              {shortAgo(post.createdAt)}
              {post.audience === 'BOTH' ? ' · Friends & Squad' : ''}
            </Text>
          </View>
        </Pressable>
      </View>

      {post.body ? <Text style={styles.caption}>{post.body}</Text> : null}

      {shape === 'progress' ? (
        <ProgressCompare post={post} />
      ) : shape === 'photo' ? (
        <Image source={{ uri: post.media[0].url }} style={styles.photo} contentFit="cover" />
      ) : shape === 'video' ? (
        <View style={styles.videoWrap}>
          <Image source={{ uri: post.media[0].url }} style={styles.photo} contentFit="cover" />
          <View style={styles.playBtn}>
            <PlayGlyph />
          </View>
        </View>
      ) : shape === 'milestone' ? (
        <View style={styles.milestone}>
          <LinearGradient colors={['rgba(186, 134, 84,0.14)', 'transparent'] as const} locations={[0, 0.7] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.milestoneHead}>
            <MedalGlyph />
            <Text style={styles.milestoneKind}>{post.prLabel ?? 'Milestone'}</Text>
          </View>
          <Text style={styles.milestoneTitle} numberOfLines={2}>
            {post.prExercise ?? post.body ?? 'A milestone'}
          </Text>
          {post.prValue ? <Text style={styles.milestoneSub}>{post.prValue}</Text> : null}
        </View>
      ) : null}

      {line ? (
        <View style={styles.ackRow}>
          <View style={styles.ackAvatars}>
            {post.reactors.slice(0, 3).map((r, i) => (
              <View key={r.id} style={[styles.ackAvatar, i > 0 ? styles.ackAvatarOverlap : null]}>
                <Avatar src={r.avatarUrl ?? undefined} name={r.name} size={20} />
              </View>
            ))}
          </View>
          <Text style={styles.ackText} numberOfLines={1}>
            {line}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <View style={styles.reactWrap}>
          {pickerOpen ? <ReactionPicker current={post.myReaction} onPick={onReact} /> : null}
          <Pressable
            onPress={onTogglePicker}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={post.myReaction ? `Acknowledged as ${post.myReaction}. Change it` : 'Acknowledge this'}
            style={({ pressed }) => [styles.action, post.myReaction ? styles.actionOn : null, pressed ? styles.pressed : null]}
          >
            {busy ? <ActivityIndicator size="small" color={flColor.bronze300} /> : <ReactionGlyph kind={post.myReaction ?? 'respect'} on={!!post.myReaction} />}
            <Text style={[styles.actionLabel, post.myReaction ? styles.actionLabelOn : null]}>
              {post.myReaction ? REACTIONS.find((r) => r.key === post.myReaction)?.label : 'Acknowledge'}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={onComments} accessibilityRole="button" accessibilityLabel={`${post.commentCount} comments`} style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}>
          <CommentGlyph />
          <Text style={styles.actionLabel}>{post.commentCount > 0 ? String(post.commentCount) : ''}</Text>
        </Pressable>
      </View>
    </View>
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
      <View style={styles.compareBadge}>
        <Text style={styles.compareBadgeText}>Progress</Text>
      </View>
    </View>
  );
}

function Composer({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: () => void }) {
  const { showToast } = useToast();
  const { pick: pickSource, mediaPickerSheet } = useMediaPicker();
  const [audience, setAudience] = useState<PostAudience>('FRIENDS');
  const [body, setBody] = useState('');
  const [media, setMedia] = useState<PostMedia | null>(null);
  const [mode, setMode] = useState<'none' | 'progress'>('none');
  const [entries, setEntries] = useState<TransformationEntry[] | null>(null);
  const [thenId, setThenId] = useState<string | null>(null);
  const [nowId, setNowId] = useState<string | null>(null);
  const [squads, setSquads] = useState<{ id: string; name: string }[] | null>(null);
  const [squadId, setSquadId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  const pick = useTransformationPick(entries, thenId, nowId);

  // Squads only when the audience needs one.
  useEffect(() => {
    if (!open || audience === 'FRIENDS' || squads) return undefined;
    let alive = true;
    fetchMySquads().then(
      (rows) => alive && setSquads(rows.map((r) => ({ id: r.id, name: r.name }))),
      () => alive && setSquads([]),
    );
    return () => {
      alive = false;
    };
  }, [open, audience, squads]);

  const loadEntries = useCallback(() => {
    if (entries) return;
    fetchTransformationEntries().then(
      (rows) => {
        setEntries(rows);
        // Widest span the athlete has: oldest as Then, newest as Now.
        if (rows.length >= 2) {
          setThenId(rows[rows.length - 1].id);
          setNowId(rows[0].id);
        }
      },
      () => setEntries([]),
    );
  }, [entries]);

  const attach = async (want: 'images' | 'videos') => {
    const asset = await pickSource({ kind: want, title: want === 'videos' ? 'Add a video' : 'Add a photo', quality: 0.7, videoMaxDuration: 60 });
    if (!asset?.uri) return;
    const kind = asset.type === 'video' ? 'video' : 'image';
    setUploading(true);
    try {
      const url = await uploadFeedMedia(asset.uri, kind);
      setMedia({ url, kind });
      setMode('none');
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const needsSquad = audience !== 'FRIENDS';
  const progressReady = mode === 'progress' && canPostPick(pick);
  const valid = !uploading && !posting && (!needsSquad || !!squadId) && (body.trim().length > 0 || !!media || progressReady);

  const submit = () => {
    if (!valid) return;
    setPosting(true);
    const layout = mode === 'progress' ? layoutFromPick(pick) : null;
    const progressMedia: PostMedia[] = layout
      ? mediaFromPick(pick).map((m, i) => ({ ...m, slot: i === 0 ? ('before' as const) : ('after' as const) }))
      : [];
    createFriendPost({
      body,
      audience,
      squadId: needsSquad ? squadId : null,
      media: layout ? progressMedia : media ? [media] : [],
      type: layout ? 'progress' : 'discussion',
    }).then(
      () => {
        setPosting(false);
        setBody('');
        setMedia(null);
        setMode('none');
        onPosted();
      },
      (e: unknown) => {
        setPosting(false);
        showToast(errorMessage(e));
      },
    );
  };

  const note = AUDIENCES.find((a) => a.key === audience)?.note ?? '';

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="New Post">
        <ScrollView contentContainerStyle={styles.composerBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Audience, with a live note per option. There is no public choice, and each note says so. */}
          <View style={styles.segments}>
            {AUDIENCES.map((a) => (
              <Pressable
                key={a.key}
                onPress={() => setAudience(a.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: audience === a.key }}
                accessibilityLabel={`${a.label}. ${a.note}`}
                style={({ pressed }) => [styles.segment, audience === a.key ? styles.segmentOn : null, pressed ? styles.pressed : null]}
              >
                <Text style={[styles.segmentLabel, audience === a.key ? styles.segmentLabelOn : null]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.note}>{note}</Text>

          {needsSquad ? (
            (squads ?? []).length === 0 ? (
              <Text style={styles.note}>You’re not in a squad yet, so only Friends is available.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.squadStrip}>
                {(squads ?? []).map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => setSquadId(s.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: squadId === s.id }}
                    accessibilityLabel={`Post to ${s.name}`}
                    style={({ pressed }) => [styles.squadChip, squadId === s.id ? styles.squadChipOn : null, pressed ? styles.pressed : null]}
                  >
                    <Text style={[styles.squadChipText, squadId === s.id ? styles.squadChipTextOn : null]} numberOfLines={1}>
                      {s.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )
          ) : null}

          {/* A real input. The design's is a static div that captures nothing. */}
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="What did you forge today?"
            placeholderTextColor={flColor.gray600}
            style={styles.textArea}
            accessibilityLabel="What did you forge today?"
            multiline
            textAlignVertical="top"
          />

          <View style={styles.mediaRow}>
            <MediaBtn label="Photo" active={media?.kind === 'image'} onPress={() => void attach('images')} />
            <MediaBtn label="Video" active={media?.kind === 'video'} onPress={() => void attach('videos')} />
            <MediaBtn
              label="Progress"
              active={mode === 'progress'}
              onPress={() => {
                setMode((m) => (m === 'progress' ? 'none' : 'progress'));
                setMedia(null);
                loadEntries();
              }}
            />
          </View>

          {uploading ? (
            <View style={styles.uploading}>
              <ActivityIndicator size="small" color={flColor.bronze400} />
              <Text style={styles.note}>Uploading…</Text>
            </View>
          ) : null}

          {media ? (
            <View style={styles.attached}>
              <Image source={{ uri: media.url }} style={styles.attachedImg} contentFit="cover" />
              <Pressable onPress={() => setMedia(null)} accessibilityRole="button" accessibilityLabel="Remove attachment" style={styles.attachedX}>
                <Text style={styles.attachedXText}>Remove</Text>
              </Pressable>
            </View>
          ) : null}

          {mode === 'progress' ? (
            entries === null ? (
              <ActivityIndicator color={flColor.bronze400} style={styles.uploading} />
            ) : entries.length < 2 ? (
              <Text style={styles.note}>
                A comparison needs two captures from your Transformation archive. Capture another and it’ll show up here.
              </Text>
            ) : (
              <View style={styles.progressPick}>
                <EntryStrip label="Then" entries={entries} selectedId={thenId} otherId={nowId} onSelect={setThenId} />
                <EntryStrip label="Now" entries={entries} selectedId={nowId} otherId={thenId} onSelect={setNowId} />
                <PickPreview pick={pick} />
              </View>
            )
          ) : null}

          <Pressable
            onPress={submit}
            disabled={!valid}
            accessibilityRole="button"
            accessibilityLabel="Post"
            accessibilityState={{ disabled: !valid }}
            style={({ pressed }) => [styles.postBtn, valid ? styles.postBtnOn : null, pressed && valid ? styles.pressed : null]}
          >
            {posting ? <ActivityIndicator size="small" color={flColor.bronze300} /> : <Text style={[styles.postBtnLabel, valid ? styles.postBtnLabelOn : null]}>Post</Text>}
          </Pressable>
        </ScrollView>
      </BottomSheet>
      {mediaPickerSheet}
    </>
  );
}

function MediaBtn({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.mediaBtn, active ? styles.mediaBtnOn : null, pressed ? styles.pressed : null]}
    >
      <Text style={[styles.mediaBtnLabel, active ? styles.mediaBtnLabelOn : null]}>{label}</Text>
    </Pressable>
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
function CommentGlyph({ color = flColor.gray600 }: { color?: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5.5h16v10H9l-5 4z" />
    </Svg>
  );
}
function PlayGlyph({ color = flColor.cream100 }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5l12 7-12 7z" />
    </Svg>
  );
}
function MedalGlyph({ color = flColor.bronze300 }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8.8 10.4L6 4h4l2 3.2L14 4h4l-2.8 6.4" />
      <Circle cx={12} cy={15} r={4.8} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.85 },
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 4 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round },
  badge: { position: 'absolute', top: 4, right: 3, minWidth: 15, paddingHorizontal: 3, alignItems: 'center', borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal900, backgroundColor: flColor.bronze400 },
  badgeText: { fontSize: 8.5, fontWeight: '700', color: '#1A1206' },

  composerBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.charcoal900, boxShadow: flShadow.card },
  composerText: { flex: 1, minWidth: 0, fontSize: 13.5, color: flColor.gray600 },

  card: { borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.charcoal900, boxShadow: flShadow.card, overflow: 'hidden' },
  cardHead: { paddingHorizontal: 14, paddingTop: 13 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  authorText: { flex: 1, minWidth: 0 },
  authorName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  authorMeta: { marginTop: 1, fontSize: 10.5, color: flColor.gray600 },
  caption: { paddingHorizontal: 14, paddingTop: 10, fontSize: 13.5, lineHeight: 20, color: flColor.gray400 },

  photo: { width: '100%', height: 210, marginTop: 12, backgroundColor: flColor.charcoal800 },
  videoWrap: { position: 'relative' },
  playBtn: { position: 'absolute', top: '50%', left: '50%', width: 46, height: 46, marginTop: -23, marginLeft: -23, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },

  compare: { position: 'relative', marginTop: 12, width: '100%', aspectRatio: 4 / 5, overflow: 'hidden', backgroundColor: flColor.charcoal800 },
  compareImg: { width: '100%', height: '100%' },
  compareClip: { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' },
  divider: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: flColor.bronze300 },
  compareBadge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: 'rgba(0,0,0,0.55)' },
  compareBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze300 },

  milestone: { position: 'relative', overflow: 'hidden', margin: 14, padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800 },
  milestoneHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  milestoneKind: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.bronze400 },
  milestoneTitle: { marginTop: 8, fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  milestoneSub: { marginTop: 4, fontSize: 12.5, color: flColor.gray400 },

  ackRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, paddingTop: 12 },
  ackAvatars: { flexDirection: 'row' },
  ackAvatar: { borderRadius: flRadius.round, borderWidth: 1.5, borderColor: flColor.charcoal900 },
  ackAvatarOverlap: { marginLeft: -7 },
  ackText: { flex: 1, minWidth: 0, fontSize: 11.5, color: flColor.gray600 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: flColor.charcoal800 },
  reactWrap: { position: 'relative' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 44, minHeight: 34, paddingHorizontal: 10, borderRadius: flRadius.pill },
  actionOn: { backgroundColor: flColor.bronzeTint },
  actionLabel: { fontSize: 11.5, fontWeight: '600', color: flColor.gray600 },
  actionLabelOn: { color: flColor.bronze300 },

  picker: { position: 'absolute', bottom: 38, left: 0, flexDirection: 'row', gap: 2, padding: 4, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, boxShadow: flShadow.card, zIndex: 10 },
  pickerItem: { alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 5, borderRadius: flRadius.pill },
  pickerItemOn: { backgroundColor: flColor.bronzeTint },
  pickerLabel: { fontSize: 8.5, fontWeight: '600', color: flColor.gray600 },
  pickerLabelOn: { color: flColor.bronze300 },

  composerBody: { gap: 12, paddingBottom: 10 },
  segments: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600 },
  segmentOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  segmentLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
  segmentLabelOn: { color: flColor.bronze300 },
  note: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },
  squadStrip: { gap: 7, paddingRight: 4 },
  squadChip: { maxWidth: 150, paddingHorizontal: 12, paddingVertical: 7, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600 },
  squadChipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  squadChipText: { fontSize: 11.5, fontWeight: '600', color: flColor.gray600 },
  squadChipTextOn: { color: flColor.bronze300 },

  textArea: { minHeight: 84, padding: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, fontSize: 14, lineHeight: 20, color: flColor.cream100 },
  mediaRow: { flexDirection: 'row', gap: 7 },
  mediaBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600 },
  mediaBtnOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  mediaBtnLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
  mediaBtnLabelOn: { color: flColor.bronze300 },
  uploading: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 },
  attached: { gap: 8 },
  attachedImg: { width: '100%', height: 170, borderRadius: flRadius.md, backgroundColor: flColor.charcoal800 },
  attachedX: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600 },
  attachedXText: { fontSize: 11.5, fontWeight: '600', color: flColor.gray600 },
  progressPick: { gap: 12 },

  postBtn: { marginTop: 4, alignItems: 'center', paddingVertical: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600 },
  postBtnOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  postBtnLabel: { fontSize: 14.5, fontWeight: '700', color: flColor.gray600 },
  postBtnLabelOn: { color: flColor.bronze300 },

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
