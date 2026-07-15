import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { FlameIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { getFriendsFeed, type FeedPost, type PostContent } from '@/data/post-placeholder';
import { getSelfProfile } from '@/domain/profile/placeholder-data';
import { useShareSheet } from '@/hooks/useShareSheet';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Friends Feed — the scrollable feed of friends' shared moments. Each post card taps through
 * to the full Post Detail (`/post/[id]`, presented full-screen by the root Stack). Reached from
 * Home's "Your Circle → See your circle"; a back-chevron returns.
 *
 * READ-ONLY viewing surface: the composer prompt, friends-hub button, and per-post react are
 * inert; the card's Share reuses SH-1 for milestone posts. ALL feed content is PLACEHOLDER
 * (`getFriendsFeed` — no feed backend); the same posts open in Post Detail, so they stay
 * consistent. Media is a pending-asset band. "Nothing posts automatically" (dc) — the Firewall
 * is respected: this shows only what a friend chose to share.
 */
export default function FriendsFeedRoute() {
  const router = useRouter();
  const { openShare } = useShareSheet();
  const profile = getSelfProfile();
  const posts = getFriendsFeed();

  const openPost = (id: string) => router.push({ pathname: '/post/[id]', params: { id } });

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
        title="Friends"
        serif
        onBack={() => router.back()}
        actions={
          <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Friends" style={styles.iconBtn} hitSlop={8}>
            <FriendsGlyph />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* composer prompt — inert (compose is not part of this read-only viewer) */}
        <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Share a moment" style={styles.composer}>
          <Avatar name={profile.name} size="listRow" />
          <Text style={styles.composerText}>What’s worth remembering today?</Text>
        </Pressable>

        {posts.map((post) => (
          <FriendPostCard
            key={post.id}
            post={post}
            onOpen={() => openPost(post.id)}
            onShare={post.shareType ? () => openShare({ shareType: post.shareType!, overrides: { athlete: post.author } }) : undefined}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function FriendPostCard({ post, onOpen, onShare }: { post: FeedPost; onOpen: () => void; onShare?: () => void }) {
  return (
    <View style={styles.card}>
      {/* author */}
      <View style={styles.authorRow}>
        <Avatar name={post.author} size="listRow" />
        <View style={styles.authorText}>
          <Text style={styles.authorName} numberOfLines={1}>
            {post.author}
          </Text>
          <View style={styles.authorMeta}>
            <Text style={styles.time}>{post.timestamp}</Text>
            <View style={styles.dot} />
            <Text style={styles.audience}>{post.source.tag}</Text>
          </View>
        </View>
        <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Post options" style={styles.optionsBtn} hitSlop={6}>
          <OverflowIcon />
        </Pressable>
      </View>

      {post.body ? (
        <Pressable onPress={onOpen} accessibilityRole="button">
          <Text style={styles.caption}>{post.body}</Text>
        </Pressable>
      ) : null}

      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${post.author}'s post`}>
        <FeedContent content={post.content} />
      </Pressable>

      {/* reactions */}
      <View style={styles.reactions}>
        <View style={styles.reactItem}>
          <FlameIcon size={16} color={flColor.bronze400} />
          <Text style={styles.reactText}>{post.respect}</Text>
        </View>
        <Pressable onPress={onOpen} accessibilityRole="button" style={styles.reactItem} hitSlop={6}>
          <CommentGlyph />
          <Text style={styles.reactText}>{post.commentCount}</Text>
        </Pressable>
        <View style={styles.reactSpacer} />
        {onShare ? (
          <Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel="Share" style={styles.shareBtn} hitSlop={6}>
            <ShareGlyph />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Condensed content preview for the feed card (the full block renders in Post Detail). */
function FeedContent({ content }: { content: PostContent }) {
  switch (content.type) {
    case 'text':
    case 'poll':
    case 'event':
      return null; // caption + reactions carry these in the condensed card
    case 'achievement':
      return (
        <View style={styles.milestone}>
          <View style={styles.mileHead}>
            <DumbbellGlyph />
            <Text style={styles.mileKind}>Personal Record</Text>
          </View>
          <Text style={styles.mileTitle}>
            <Text style={styles.mileValue}>{content.value}</Text> {content.exercise}
          </Text>
          <Text style={styles.mileSub}>{content.label}</Text>
        </View>
      );
    case 'honor':
      return (
        <View style={styles.milestone}>
          <View style={styles.mileHead}>
            <HonorGlyph />
            <Text style={styles.mileKind}>{content.label}</Text>
          </View>
          <Text style={styles.mileTitle}>{content.title}</Text>
          {content.sub ? <Text style={styles.mileSub}>{content.sub}</Text> : null}
        </View>
      );
    case 'program':
      return (
        <View style={styles.milestone}>
          <View style={styles.mileHead}>
            <DumbbellGlyph />
            <Text style={styles.mileKind}>Program</Text>
          </View>
          <Text style={styles.mileTitle}>{content.programName}</Text>
          <Text style={styles.mileSub}>{`${content.durationWeeks} weeks · ${content.frequencyPerWeek} days/week`}</Text>
        </View>
      );
    case 'media':
      return (
        <View style={styles.media}>
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Rect x="0" y="0" width="100%" height="100%" fill={flColor.charcoal800} />
          </Svg>
          {content.mediaKind === 'video' ? (
            <View style={styles.playBtn}>
              <PlayGlyph />
            </View>
          ) : (
            <Text style={styles.mediaHint}>Photo</Text>
          )}
        </View>
      );
  }
}

// ── glyphs ──
function FriendsGlyph() {
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={7.5} cy={8} r={2.7} />
      <Circle cx={16.5} cy={8} r={2.7} />
      <Path d="M3 19a4.5 4.5 0 0 1 9 0M12 19a4.5 4.5 0 0 1 9 0" />
    </Svg>
  );
}
function OverflowIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={flColor.gray600}>
      <Circle cx={5} cy={12} r={1.7} />
      <Circle cx={12} cy={12} r={1.7} />
      <Circle cx={19} cy={12} r={1.7} />
    </Svg>
  );
}
function HonorGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l7 3v5c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9V6z" />
      <Path d="M9 11l2 2 4-4" />
    </Svg>
  );
}
function DumbbellGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
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
function CommentGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4A7.5 7.5 0 1 1 20 11.5z" />
    </Svg>
  );
}
function ShareGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={6} cy={12} r={2.4} />
      <Circle cx={17} cy={6} r={2.4} />
      <Circle cx={17} cy={18} r={2.4} />
      <Path d="M8.1 10.9l6.8-3.8M8.1 13.1l6.8 3.8" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round },
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 12 },

  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
  },
  composerText: { flex: 1, minWidth: 0, fontSize: 13.5, color: flColor.gray600 },

  card: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    padding: 14,
    boxShadow: flShadow.card,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  authorText: { flex: 1, minWidth: 0 },
  authorName: { fontSize: 14.5, fontWeight: '500', color: flColor.cream100 },
  authorMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  time: { fontSize: 11.5, color: flColor.gray600 },
  dot: { width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: flColor.charcoal500 },
  audience: { fontSize: 11, color: flColor.gray600 },
  optionsBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  caption: { fontSize: 14, lineHeight: 21, color: flColor.cream100, marginTop: 11 },

  // condensed milestone plate
  milestone: {
    marginTop: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    padding: 14,
    boxShadow: flShadow.glowSubtle,
  },
  mileHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  mileKind: { fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  mileTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  mileValue: { color: flColor.bronze300 },
  mileSub: { fontSize: 12, color: flColor.gray400, marginTop: 4 },

  // condensed media band
  media: {
    marginTop: 12,
    height: 190,
    borderRadius: flRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaHint: { fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
  playBtn: {
    width: 54,
    height: 54,
    borderRadius: flRadius.round,
    backgroundColor: 'rgba(10,10,10,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  reactions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 13 },
  reactItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  reactText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  reactSpacer: { flex: 1 },
  shareBtn: { padding: 2 },
});
