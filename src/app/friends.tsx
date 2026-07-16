import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { BG_RADIAL } from '@/constants/backgrounds';
import { Avatar } from '@/components/forge/composites/Avatar';
import { FeedPostCard } from '@/components/forge/compositions/FeedPostCard';
import { getFriendsFeed } from '@/data/post-placeholder';
import { useProfile } from '@/lib/profile';
import { useShareSheet } from '@/hooks/useShareSheet';
import { flColor, flRadius, flShadow } from '@/constants/foundation';

/**
 * Friends Feed — the scrollable feed of friends' shared moments. Each post card taps through
 * to the full Post Detail (`/post/[id]`, presented full-screen by the root Stack). Reached from
 * Home's "Your Circle → See your circle"; a back-chevron returns.
 *
 * The card itself is the shared `FeedPostCard` (one config-driven card across Friends / Community
 * / Squad — see its module doc); Friends shows the per-post audience tag (`showAudience` default).
 *
 * READ-ONLY viewing surface: the composer prompt, friends-hub button, and per-post react are
 * inert; the card's Share reuses SH-1 for milestone posts. ALL feed content is PLACEHOLDER
 * (`getFriendsFeed` — no feed backend); the same posts open in Post Detail, so they stay
 * consistent. "Nothing posts automatically" (dc) — the Firewall is respected: this shows only
 * what a friend chose to share.
 */
export default function FriendsFeedRoute() {
  const router = useRouter();
  const { openShare } = useShareSheet();
  const { profile } = useProfile();
  const posts = getFriendsFeed();

  const openPost = (id: string) => router.push({ pathname: '/post/[id]', params: { id } });
  const openAthlete = (name: string) => router.push({ pathname: '/athlete/[id]', params: { id: name } });

  return (
    <View style={styles.root}>
      <ScreenBackground atmospheric overlay={null} radials={[BG_RADIAL.friendsApex]} />
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
          <Avatar name={profile?.name ?? ''} src={profile?.avatarUrl ?? undefined} size="listRow" />
          <Text style={styles.composerText}>What’s worth remembering today?</Text>
        </Pressable>

        {posts.map((post) => (
          <FeedPostCard
            key={post.id}
            post={post}
            origin="friend"
            onOpen={() => openPost(post.id)}
            onAuthorPress={() => openAthlete(post.author)}
            onShare={post.shareType ? () => openShare({ shareType: post.shareType!, overrides: { athlete: post.author } }) : undefined}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function FriendsGlyph() {
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Circle cx={7.5} cy={8} r={2.7} />
      <Circle cx={16.5} cy={8} r={2.7} />
      <Path d="M3 19a4.5 4.5 0 0 1 9 0M12 19a4.5 4.5 0 0 1 9 0" />
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
});
