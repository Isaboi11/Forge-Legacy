import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { Pill } from '@/components/forge/composites/Pill';
import { FlameIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { useShareSheet } from '@/hooks/useShareSheet';
import { getPost, type FeedPost, type PostComment, type PostContent, type PostReply, type PostRole } from '@/data/post-placeholder';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Post Detail — the shared, READ-ONLY feed-post viewer (Post Detail.dc.html). Source-context
 * bar → author header → body → one typed content block (achievement/PR, honor, program, media,
 * event, poll) → engagement bar → comments (with replies). No sticky composer, no reply/respect
 * mutations — this is the read-only shell (compose/edit mounts via `PostDetailActions` later).
 *
 * ALL social content is PLACEHOLDER (`getPost` fixture) — no feed backend. Author/commenter
 * avatars are `Avatar` initials (real component). Media is a pending-asset placeholder band
 * (no real media). The engagement "Share" reuses SH-1 via `useShareSheet` for milestone posts.
 *
 * ⚠ Not a true full-screen takeover: the app is expo-router/ui Tabs-only (no root Stack), so
 * this renders edge-to-edge but the tab bar stays. Also NOT copied: the dc's preview-runtime
 * `ready`/`_poll` DS-bundle mount gate (preview-only).
 */

/** Typed seam so compose/edit affordances (composer, edit, delete) can mount later. Empty in the shell. */
export interface PostDetailActions {
  headerAction?: React.ReactNode;
  footerExtra?: React.ReactNode;
}

export default function PostDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const post = getPost(String(id ?? ''));
  if (!post) return <PostNotFound onBack={() => router.back()} />;
  return <PostDetail post={post} onBack={() => router.back()} />;
}

function PostDetail({ post, onBack, actions = {} }: { post: FeedPost; onBack: () => void; actions?: PostDetailActions }) {
  const { openShare } = useShareSheet();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={flGradient.bgAtmospheric.colors}
        locations={flGradient.bgAtmospheric.locations}
        start={flGradient.bgAtmospheric.start}
        end={flGradient.bgAtmospheric.end}
        style={StyleSheet.absoluteFill}
      />
      <AppBar
        title={<Text style={styles.barTitle}>Post</Text>}
        onBack={onBack}
        actions={
          <>
            {actions.headerAction}
            <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Post options" style={styles.iconBtn} hitSlop={8}>
              <OverflowIcon />
            </Pressable>
          </>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SourceBar post={post} />

        <View style={styles.body}>
          {/* author header */}
          <View style={styles.headerRow}>
            <Avatar name={post.author} size="listRow" />
            <View style={styles.headerText}>
              <View style={styles.nameRow}>
                <Text style={styles.author} numberOfLines={1}>
                  {post.author}
                </Text>
                {post.role ? <RoleBadge role={post.role} /> : null}
              </View>
              <Text style={styles.time}>{post.timestamp}</Text>
            </View>
            {post.typeLabel ? (
              <Pill tone="muted" size="sm">
                {post.typeLabel}
              </Pill>
            ) : null}
          </View>

          {post.challenge ? (
            <View style={styles.challenge}>
              <Text style={styles.challengeText}>{post.challenge}</Text>
            </View>
          ) : null}

          {post.body ? <Text style={styles.bodyText}>{post.body}</Text> : null}

          <ContentBlock content={post.content} />

          <EngagementBar
            respect={post.respect}
            commentCount={post.commentCount}
            onShare={post.shareType ? () => openShare({ shareType: post.shareType!, overrides: { athlete: post.author } }) : undefined}
          />
        </View>

        {/* comments */}
        <View style={styles.comments}>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsCount}>{post.commentCount} Comments</Text>
            <View style={styles.sortTabs}>
              <Text style={[styles.sortTab, styles.sortTabOn]}>Top</Text>
              <Text style={styles.sortTab}>Newest</Text>
            </View>
          </View>
          {post.comments.length > 0 ? (
            post.comments.map((c) => <CommentItem key={c.id} comment={c} />)
          ) : (
            <Text style={styles.noComments}>No comments yet.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ── source-context bar ──
function SourceBar({ post }: { post: FeedPost }) {
  return (
    <View style={styles.sourceBar}>
      <View style={styles.sourceIcon}>
        <SourceGlyph kind={post.source.kind} />
      </View>
      <View style={styles.sourceText}>
        <Text style={styles.sourceName} numberOfLines={1}>
          {post.source.name}
        </Text>
        <Text style={styles.sourceSub} numberOfLines={1}>
          {post.source.sub}
        </Text>
      </View>
      <View style={styles.sourceTag}>
        <Text style={styles.sourceTagText}>{post.source.tag}</Text>
      </View>
    </View>
  );
}

// ── typed content blocks ──
function ContentBlock({ content }: { content: PostContent }) {
  switch (content.type) {
    case 'text':
      return null;
    case 'achievement':
      return (
        <View style={styles.achievement}>
          <Text style={styles.achValue}>{content.value}</Text>
          <Text style={styles.achExercise}>{content.exercise}</Text>
          <Text style={styles.achLabel}>{content.label}</Text>
        </View>
      );
    case 'honor':
      return (
        <View style={styles.plate}>
          <View style={styles.plateIcon}>
            <HonorGlyph />
          </View>
          <View style={styles.plateText}>
            <Text style={styles.plateLabel}>{content.label}</Text>
            <Text style={styles.plateTitle}>{content.title}</Text>
            {content.sub ? <Text style={styles.plateSub}>{content.sub}</Text> : null}
          </View>
        </View>
      );
    case 'program':
      return (
        <View style={styles.program}>
          <View style={styles.programHead}>
            <Text style={styles.programKind}>Program</Text>
            {content.price ? (
              <View style={styles.pricePill}>
                <Text style={styles.pricePillText}>{content.price}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.programBody}>
            <View style={styles.plateIcon}>
              <DumbbellGlyph />
            </View>
            <View style={styles.plateText}>
              <Text style={styles.plateTitle}>{content.programName}</Text>
              <Text style={styles.plateSub}>{`${content.durationWeeks} weeks · ${content.frequencyPerWeek} days/week`}</Text>
            </View>
          </View>
        </View>
      );
    case 'media':
      return (
        <View style={styles.media}>
          {/* pending-asset — no real media; a toned band + (for video) a play glyph */}
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Rect x="0" y="0" width="100%" height="100%" fill={flColor.charcoal800} />
          </Svg>
          {content.mediaKind === 'video' ? (
            <>
              <View style={styles.playBtn}>
                <PlayGlyph />
              </View>
              <View style={styles.videoTag}>
                <Text style={styles.videoTagText}>Video{content.duration ? ` · ${content.duration}` : ''}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.mediaHint}>Photo</Text>
          )}
        </View>
      );
    case 'event':
      return (
        <View style={styles.event}>
          <View style={styles.eventRow}>
            <View style={styles.eventDate}>
              <Text style={styles.eventMonth}>{content.month}</Text>
              <Text style={styles.eventDay}>{content.day}</Text>
            </View>
            <View style={styles.eventText}>
              <Text style={styles.eventTitle}>{content.title}</Text>
              <View style={styles.eventWhenRow}>
                <ClockGlyph />
                <Text style={styles.eventWhen}>{content.when}</Text>
              </View>
              <Text style={styles.eventGoing}>{content.going} going</Text>
            </View>
          </View>
          <Pressable onPress={() => {}} accessibilityRole="button" style={styles.rsvpBtn}>
            <Text style={styles.rsvpText}>Interested</Text>
          </Pressable>
        </View>
      );
    case 'poll':
      return (
        <View style={styles.poll}>
          {content.options.map((o, i) => (
            <View key={i} style={styles.pollOption}>
              <View style={[styles.pollFill, { width: `${o.pct}%` }]} />
              <View style={styles.pollOptionInner}>
                {o.chosen ? <CheckGlyph /> : null}
                <Text style={styles.pollText}>{o.text}</Text>
              </View>
              <Text style={styles.pollPct}>{o.pct}%</Text>
            </View>
          ))}
          <Text style={styles.pollFooter}>{content.footer}</Text>
        </View>
      );
  }
}

// ── engagement bar (read-only: counts shown, respect/save inert; share → SH-1) ──
function EngagementBar({ respect, commentCount, onShare }: { respect: number; commentCount: number; onShare?: () => void }) {
  return (
    <View style={styles.engagement}>
      <View style={styles.engItem}>
        <FlameIcon size={16} color={flColor.bronze400} />
        <Text style={styles.engText}>{respect}</Text>
      </View>
      <View style={styles.engItem}>
        <CommentGlyph />
        <Text style={styles.engText}>{commentCount}</Text>
      </View>
      <View style={styles.engSpacer} />
      <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Save" style={styles.engIconBtn} hitSlop={8}>
        <BookmarkGlyph />
      </Pressable>
      {onShare ? (
        <Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel="Share" style={styles.engIconBtn} hitSlop={8}>
          <ShareGlyph />
        </Pressable>
      ) : null}
    </View>
  );
}

// ── comments (read-only) ──
function CommentItem({ comment }: { comment: PostComment }) {
  return (
    <View style={styles.comment}>
      <Avatar name={comment.author} size="listRow" />
      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text style={styles.commentAuthor}>{comment.author}</Text>
          {comment.role ? <RoleBadge role={comment.role} /> : null}
          <Text style={styles.commentTime}>{comment.time}</Text>
        </View>
        <Text style={styles.commentText}>{comment.body}</Text>
        <View style={styles.commentActions}>
          <View style={styles.commentRespect}>
            <FlameIcon size={13} color={flColor.gray600} />
            <Text style={styles.commentRespectText}>{comment.respect}</Text>
          </View>
          <Text style={styles.commentReply}>Reply</Text>
        </View>
        {comment.replies && comment.replies.length > 0 ? (
          <View style={styles.replies}>
            {comment.replies.map((r) => (
              <ReplyItem key={r.id} reply={r} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ReplyItem({ reply }: { reply: PostReply }) {
  return (
    <View style={styles.reply}>
      <Avatar name={reply.author} size="squadStack" />
      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text style={styles.replyAuthor}>{reply.author}</Text>
          {reply.role ? <RoleBadge role={reply.role} /> : null}
          <Text style={styles.commentTime}>{reply.time}</Text>
        </View>
        <Text style={styles.commentText}>{reply.body}</Text>
      </View>
    </View>
  );
}

function RoleBadge({ role }: { role: PostRole }) {
  return (
    <View style={styles.roleBadge}>
      <Text style={styles.roleBadgeText}>{role === 'owner' ? 'Owner' : 'Mod'}</Text>
    </View>
  );
}

function PostNotFound({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={flGradient.bgAtmospheric.colors}
        locations={flGradient.bgAtmospheric.locations}
        start={flGradient.bgAtmospheric.start}
        end={flGradient.bgAtmospheric.end}
        style={StyleSheet.absoluteFill}
      />
      <AppBar onBack={onBack} />
      <View style={styles.notFound}>
        <Text style={styles.notFoundTitle}>Post not found</Text>
        <Text style={styles.notFoundBody}>This post isn’t available.</Text>
      </View>
    </View>
  );
}

// ── inline glyphs ──
function OverflowIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={flColor.cream100}>
      <Circle cx={12} cy={5} r={1.7} />
      <Circle cx={12} cy={12} r={1.7} />
      <Circle cx={12} cy={19} r={1.7} />
    </Svg>
  );
}
function SourceGlyph({ kind }: { kind: 'community' | 'squad' | 'friend' }) {
  const p = { stroke: flColor.bronze300, strokeWidth: 1.7, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      {kind === 'community' ? (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" {...p} />
        </>
      ) : kind === 'squad' ? (
        <>
          <Circle cx={9} cy={8} r={3} {...p} />
          <Path d="M3.5 19a5.5 5.5 0 0 1 11 0M16.5 5.6a3 3 0 0 1 0 5.3" {...p} />
        </>
      ) : (
        <>
          <Circle cx={12} cy={8} r={3.4} {...p} />
          <Path d="M5 20a7 7 0 0 1 14 0" {...p} />
        </>
      )}
    </Svg>
  );
}
function HonorGlyph() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l7 3v5c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9V6z" />
      <Path d="M9 11l2 2 4-4" />
    </Svg>
  );
}
function DumbbellGlyph() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
    </Svg>
  );
}
function PlayGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill={flColor.cream100}>
      <Path d="M8 6.5l10 5.5-10 5.5z" />
    </Svg>
  );
}
function ClockGlyph() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}
function CheckGlyph() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}
function CommentGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5h16v11H8l-4 4z" />
    </Svg>
  );
}
function BookmarkGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 3h12v18l-6-4-6 4z" />
    </Svg>
  );
}
function ShareGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={6} cy={12} r={2.4} />
      <Circle cx={17} cy={6} r={2.4} />
      <Circle cx={17} cy={18} r={2.4} />
      <Path d="M8.1 10.9l6.8-3.8M8.1 13.1l6.8 3.8" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  barTitle: { fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round },
  scroll: { paddingBottom: 48 },

  // source bar
  sourceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal800,
  },
  sourceIcon: {
    width: 34,
    height: 34,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceText: { flex: 1, minWidth: 0 },
  sourceName: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  sourceSub: { fontSize: 11, color: flColor.gray600 },
  sourceTag: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
  },
  sourceTagText: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze400 },

  // post body
  body: { paddingHorizontal: 18, paddingTop: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  author: { flexShrink: 1, fontSize: 15, fontWeight: '500', color: flColor.cream100 },
  time: { fontSize: 12, color: flColor.gray600 },
  roleBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: flRadius.sm,
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  roleBadgeText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.bronze400 },

  challenge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: flRadius.pill,
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  challengeText: { fontSize: 11, fontWeight: '600', color: flColor.bronze300 },

  bodyText: { fontSize: 15.5, lineHeight: 24, color: flColor.cream100, marginTop: 13 },

  // achievement / PR
  achievement: {
    marginTop: 14,
    height: 200,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.glowSubtle,
  },
  achValue: {
    fontFamily: flFont.display,
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: 1,
    lineHeight: 66,
    color: flColor.bronze300,
  },
  achExercise: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100, marginTop: 8 },
  achLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 2.5, textTransform: 'uppercase', color: flColor.bronze400, marginTop: 9 },

  // honor / program plate
  plate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 14,
    padding: 16,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
  },
  plateIcon: {
    width: 52,
    height: 52,
    flexShrink: 0,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.glowSubtle,
  },
  plateText: { flex: 1, minWidth: 0, gap: 3 },
  plateLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  plateTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  plateSub: { fontSize: 12, color: flColor.gray400 },

  // program
  program: {
    marginTop: 14,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    overflow: 'hidden',
  },
  programHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  programKind: { flex: 1, fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  pricePill: {
    paddingVertical: 2,
    paddingHorizontal: 9,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  pricePillText: { fontSize: 10.5, fontWeight: '700', color: flColor.bronze300 },
  programBody: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },

  // media
  media: {
    marginTop: 14,
    height: 220,
    borderRadius: flRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaHint: { fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: flRadius.round,
    backgroundColor: 'rgba(10,10,10,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTag: {
    position: 'absolute',
    top: 11,
    left: 11,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: flRadius.pill,
    backgroundColor: 'rgba(10,10,10,0.6)',
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  videoTagText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', color: flColor.bronze300 },

  // event
  event: {
    marginTop: 14,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    overflow: 'hidden',
  },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },
  eventDate: {
    width: 52,
    height: 56,
    flexShrink: 0,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMonth: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze300 },
  eventDay: { fontFamily: flFont.display, fontSize: 23, fontWeight: '700', lineHeight: 24, color: flColor.cream100 },
  eventText: { flex: 1, minWidth: 0, gap: 3 },
  eventTitle: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  eventWhenRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventWhen: { fontSize: 12, color: flColor.gray400 },
  eventGoing: { fontSize: 11.5, color: flColor.gray600 },
  rsvpBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  rsvpText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300 },

  // poll
  poll: { marginTop: 14, gap: 9 },
  pollOption: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  pollFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: flColor.bronzeTint },
  pollOptionInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pollText: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  pollPct: { fontSize: 12.5, fontWeight: '700', color: flColor.bronze300 },
  pollFooter: { fontSize: 11.5, color: flColor.gray600, marginTop: 2 },

  // engagement
  engagement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 15,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
  },
  engItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  engText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  engSpacer: { flex: 1 },
  engIconBtn: { padding: 2 },

  // comments
  comments: { paddingHorizontal: 18, paddingTop: 16, borderTopWidth: 8, borderTopColor: flColor.charcoal900, marginTop: 8 },
  commentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  commentsCount: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  sortTabs: { flexDirection: 'row', gap: 3, padding: 3, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal800 },
  sortTab: { fontSize: 11.5, fontWeight: '600', color: flColor.gray600, paddingVertical: 4, paddingHorizontal: 11, borderRadius: flRadius.pill },
  sortTabOn: { color: flColor.cream100, backgroundColor: flColor.charcoal600 },
  noComments: { fontSize: 13, color: flColor.gray600, paddingVertical: 8 },
  comment: { flexDirection: 'row', gap: 11, marginBottom: 16 },
  commentBody: { flex: 1, minWidth: 0 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  commentAuthor: { fontSize: 13.5, fontWeight: '500', color: flColor.cream100 },
  commentTime: { fontSize: 11, color: flColor.gray600 },
  commentText: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, marginTop: 4 },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 7 },
  commentRespect: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentRespectText: { fontSize: 12, fontWeight: '600', color: flColor.gray600 },
  commentReply: { fontSize: 12, fontWeight: '600', color: flColor.gray600 },
  replies: { marginTop: 12, paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: flColor.charcoal700, gap: 12 },
  reply: { flexDirection: 'row', gap: 10 },
  replyAuthor: { fontSize: 13, fontWeight: '500', color: flColor.cream100 },

  // not found
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  notFoundTitle: { fontFamily: flFont.display, fontSize: 24, fontWeight: '600', color: flColor.cream100 },
  notFoundBody: { fontSize: 13, color: flColor.gray400 },
});
