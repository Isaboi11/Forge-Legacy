import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { BeforeAfterSlider } from '@/components/forge/BeforeAfterSlider';
import { TransformationLayout } from '@/components/forge/TransformationLayout';
import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { Pill } from '@/components/forge/composites/Pill';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { FlameIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { addSquadComment, fetchSquadPost, fmtDuration, fmtVolume, squadPostTypeDef, timeAgo, toggleSquadReaction, type SquadPostComment, type WorkoutSummary } from '@/data/squad-feed-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Squad Post Detail — the real, squad-backed thread (built to `Post Detail.dc.html`'s squad chrome).
 * Author header · PR achievement block · body · a LIVE "respect" reaction (optimistic toggle) · a flat
 * comment thread · a sticky comment composer. Distinct from `post/[id]` (the read-only fixture placeholder
 * for the future Community/Friends feed) — this one reads/writes `squad_posts`/`squad_post_comments`/
 * `squad_post_reactions` (0041). MVP comments are flat (no nested replies yet).
 */

export default function SquadPostRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const postId = String(id ?? '');
  const { data, loading, error, refetch } = useQuery(() => fetchSquadPost(postId), [postId]);
  const { showToast } = useToast();

  // Optimistic reaction override (event-handler writes only — base values come from `data`).
  const [reactOverride, setReactOverride] = useState<{ on: boolean; n: number } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const post = data?.post;

  const onReact = () => {
    if (!post) return;
    const reacted = reactOverride?.on ?? post.iReacted;
    const count = reactOverride?.n ?? post.respectCount;
    const next = !reacted;
    setReactOverride({ on: next, n: Math.max(0, count + (next ? 1 : -1)) });
    toggleSquadReaction(post.id, reacted).catch((e: unknown) => {
      setReactOverride({ on: reacted, n: count }); // revert
      showToast(errorMessage(e));
    });
  };

  const onSend = () => {
    const body = commentText.trim();
    if (!post || !body || sending) return;
    setSending(true);
    addSquadComment(post.id, body).then(
      () => {
        setSending(false);
        setCommentText('');
        refetch();
      },
      (e: unknown) => {
        setSending(false);
        showToast(errorMessage(e));
      },
    );
  };

  if (loading && !data) {
    return (
      <View style={styles.root}>
        <PostBg />
        <AppBar title={<Text style={styles.barTitle}>Post</Text>} onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }
  if (!post) {
    return (
      <View style={styles.root}>
        <PostBg />
        <AppBar title={<Text style={styles.barTitle}>Post</Text>} onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.missingTitle}>Post not found</Text>
          <Text style={styles.missingBody}>{error ? 'Couldn’t load it — check your connection.' : 'It may have been deleted.'}</Text>
        </View>
      </View>
    );
  }

  const def = squadPostTypeDef(post.type);
  const comments = data?.comments ?? [];
  const reacted = reactOverride?.on ?? post.iReacted;
  const respect = reactOverride?.n ?? post.respectCount;

  return (
    <View style={styles.root}>
      <PostBg />
      <AppBar title={<Text style={styles.barTitle}>Post</Text>} onBack={() => router.back()} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.body}>
          {/* author */}
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.push({ pathname: '/athlete/[id]', params: { id: post.authorId } })} accessibilityRole="button" accessibilityLabel={`View ${post.authorName}'s profile`} style={styles.identity}>
              <Avatar src={post.authorAvatar ?? undefined} name={post.authorName} size="listRow" />
              <View style={styles.headerText}>
                <View style={styles.nameRow}>
                  <Text style={styles.author} numberOfLines={1}>
                    {post.authorName}
                  </Text>
                  {post.authorIsOwner ? <OwnerBadge /> : null}
                </View>
                <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
              </View>
            </Pressable>
            <Pill tone="muted" size="sm">
              {def.label}
            </Pill>
          </View>

          {/* PR achievement */}
          {post.type === 'pr' && post.prValue ? (
            <View style={styles.achievement}>
              <Text style={styles.achValue}>{post.prValue}</Text>
              {post.prExercise ? <Text style={styles.achExercise}>{post.prExercise}</Text> : null}
              <Text style={styles.achLabel}>{(post.prLabel || 'Squad PR').toUpperCase()}</Text>
            </View>
          ) : null}

          {post.body ? <Text style={styles.bodyText}>{post.body}</Text> : null}

          {post.type === 'recap' && post.workoutSummary ? <RecapBlock summary={post.workoutSummary} /> : null}

          {post.type === 'transformation' && post.layout ? (
            <View style={styles.sliderWrap}>
              <TransformationLayout data={post.layout} />
            </View>
          ) : post.type === 'transformation' && post.media.length >= 2 && post.media[0].kind === 'image' && post.media[1].kind === 'image' ? (
            <View style={styles.sliderWrap}>
              <BeforeAfterSlider before={post.media[1].url} after={post.media[0].url} beforeLabel="Before" afterLabel="After" beforeT={post.media[1].transform} afterT={post.media[0].transform} />
            </View>
          ) : post.media[0] ? (
            post.media[0].kind === 'image' ? (
              <Image source={{ uri: post.media[0].url }} style={styles.detailImage} contentFit="cover" />
            ) : (
              <VideoBlock uri={post.media[0].url} />
            )
          ) : null}

          {/* engagement */}
          <View style={styles.engagement}>
            <Pressable onPress={onReact} accessibilityRole="button" accessibilityState={{ selected: reacted }} accessibilityLabel="Respect" style={styles.engItem} hitSlop={8}>
              <FlameIcon size={17} color={reacted ? flColor.bronze300 : flColor.gray400} />
              <Text style={[styles.engText, reacted ? styles.engTextOn : null]}>{respect}</Text>
            </Pressable>
            <View style={styles.engItem}>
              <CommentGlyph />
              <Text style={styles.engText}>{comments.length}</Text>
            </View>
          </View>
        </View>

        {/* comments */}
        <View style={styles.comments}>
          <Text style={styles.commentsCount}>{comments.length === 1 ? '1 Comment' : `${comments.length} Comments`}</Text>
          {comments.length > 0 ? comments.map((c) => <CommentItem key={c.id} comment={c} />) : <Text style={styles.noComments}>No comments yet. Be the first to respond.</Text>}
        </View>
      </ScrollView>

      {/* sticky composer */}
      <View style={styles.composer}>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Add a comment…"
          placeholderTextColor={flColor.gray600}
          style={styles.composerInput}
          multiline
          maxLength={1000}
          accessibilityLabel="Add a comment"
          onSubmitEditing={onSend}
          returnKeyType="send"
          blurOnSubmit
        />
        <Pressable onPress={onSend} disabled={!commentText.trim() || sending} accessibilityRole="button" accessibilityLabel="Send comment" style={[styles.sendBtn, commentText.trim() && !sending ? styles.sendBtnOn : styles.sendBtnOff]}>
          <SendIcon active={!!commentText.trim() && !sending} />
        </Pressable>
      </View>
    </View>
  );
}

function PostBg() {
  return <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.32)' }} />;
}

function VideoBlock({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={styles.detailVideo} nativeControls contentFit="contain" />;
}

function RecapBlock({ summary }: { summary: WorkoutSummary }) {
  return (
    <View style={styles.recapBlock}>
      <View style={styles.recapStatRow}>
        <RecapStat n={fmtVolume(summary.volume)} label="Volume" />
        <View style={styles.recapStatDivider} />
        <RecapStat n={fmtDuration(summary.durationSec)} label="Under Iron" />
        <View style={styles.recapStatDivider} />
        <RecapStat n={String(summary.exercises.length)} label="Exercises" />
        {summary.prCount > 0 ? (
          <>
            <View style={styles.recapStatDivider} />
            <RecapStat n={String(summary.prCount)} label={summary.prCount === 1 ? 'PR' : 'PRs'} />
          </>
        ) : null}
      </View>
      {summary.exercises.length > 0 ? (
        <View style={styles.recapTable}>
          {summary.exercises.map((ex, i) => (
            <View key={`${ex.name}-${i}`} style={[styles.recapRow, i > 0 ? styles.recapRowDiv : null]}>
              <View style={styles.recapNameLine}>
                <Text style={styles.recapExName} numberOfLines={1}>
                  {ex.name}
                </Text>
                {ex.isPR ? (
                  <View style={styles.prBadge}>
                    <Text style={styles.prBadgeText}>PR</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.recapExSub}>
                {ex.sets} set{ex.sets === 1 ? '' : 's'}
                {ex.topSet ? ` · top ${ex.topSet}` : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RecapStat({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.recapStat}>
      <Text style={styles.recapStatN}>{n}</Text>
      <Text style={styles.recapStatLabel}>{label}</Text>
    </View>
  );
}

function CommentItem({ comment }: { comment: SquadPostComment }) {
  return (
    <View style={styles.comment}>
      <Avatar src={comment.authorAvatar ?? undefined} name={comment.authorName} size="listRow" />
      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text style={styles.commentAuthor}>{comment.authorName}</Text>
          {comment.authorIsOwner ? <OwnerBadge /> : null}
          <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.body}</Text>
      </View>
    </View>
  );
}

function OwnerBadge() {
  return (
    <View style={styles.ownerBadge}>
      <Text style={styles.ownerBadgeText}>Owner</Text>
    </View>
  );
}

function CommentGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5.5h16v11H9l-4 3z" />
    </Svg>
  );
}
function SendIcon({ active }: { active: boolean }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={active ? flColor.bronze300 : flColor.gray600} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 12l16-7-7 16-2.5-6.5z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  barTitle: { fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  scroll: { paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  missingTitle: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  missingBody: { fontSize: 13, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },

  body: { paddingHorizontal: 18, paddingTop: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  author: { flexShrink: 1, fontSize: 15, fontWeight: '500', color: flColor.cream100 },
  time: { fontSize: 12, color: flColor.gray600, marginTop: 1 },

  ownerBadge: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: flRadius.pill, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  ownerBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.bronze300 },

  achievement: {
    marginTop: 14,
    height: 150,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: '#171109',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  achValue: { fontFamily: flFont.display, fontSize: 44, fontWeight: '700', lineHeight: 46, color: flColor.bronze300, textShadowColor: 'rgba(191,143,79,0.45)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 18 },
  achExercise: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  achLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 2.5, color: flColor.bronze400 },

  bodyText: { fontSize: 15.5, lineHeight: 24, color: flColor.cream100, marginTop: 13 },
  detailImage: { width: '100%', height: 300, borderRadius: flRadius.lg, marginTop: 14, backgroundColor: flColor.charcoal900 },
  detailVideo: { width: '100%', height: 240, borderRadius: flRadius.lg, marginTop: 14, backgroundColor: '#000' },
  sliderWrap: { marginTop: 14 },

  // recap breakdown
  recapBlock: { marginTop: 16 },
  recapStatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  recapStat: { alignItems: 'center', gap: 3, paddingHorizontal: 16 },
  recapStatN: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.cream100 },
  recapStatLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  recapStatDivider: { width: 1, height: 30, backgroundColor: flColor.bronzeBorderSubtle },
  recapTable: { borderWidth: 1, borderColor: flColor.charcoal600, borderRadius: flRadius.lg, overflow: 'hidden', backgroundColor: flColor.charcoal900 },
  recapRow: { paddingVertical: 13, paddingHorizontal: 15, gap: 3 },
  recapRowDiv: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  recapNameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recapExName: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  recapExSub: { fontSize: 12.5, color: flColor.gray400 },
  prBadge: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: flRadius.sm, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronze400 },
  prBadgeText: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.8, color: flColor.bronze400 },

  engagement: { flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  engItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  engText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  engTextOn: { color: flColor.bronze300 },

  comments: { paddingHorizontal: 18, paddingTop: 16, marginTop: 10, borderTopWidth: 8, borderTopColor: flColor.charcoal900 },
  commentsCount: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 14 },
  noComments: { fontSize: 13, color: flColor.gray600, paddingVertical: 6 },
  comment: { flexDirection: 'row', gap: 11, marginBottom: 16 },
  commentBody: { flex: 1, minWidth: 0 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  commentAuthor: { fontSize: 13.5, fontWeight: '500', color: flColor.cream100 },
  commentTime: { fontSize: 11, color: flColor.gray600 },
  commentText: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, marginTop: 4 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: 'rgba(9,9,11,0.92)',
  },
  composerInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: flColor.charcoal900,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14.5,
    color: flColor.cream100,
  },
  sendBtn: { width: 42, height: 42, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sendBtnOn: { backgroundColor: '#3D2F1A', borderColor: flColor.bronzeBorder },
  sendBtnOff: { backgroundColor: flColor.charcoal800, borderColor: flColor.charcoal600 },
});
