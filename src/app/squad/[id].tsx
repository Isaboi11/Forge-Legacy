import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { FeedPostCard } from '@/components/forge/compositions/FeedPostCard';
import { useShareSheet } from '@/hooks/useShareSheet';
import { SQUADS_PLACEHOLDER } from '@/data/squads-placeholder';
import { getSquadFeed, type FeedPost } from '@/data/post-placeholder';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Squad Detail (S-2) — feed-focused. Reached from a Squads Hub card; a root-Stack sibling so it
 * presents full-screen without the tab bar (back-chevron → Hub).
 *
 * This unit is the FEED: the squad identity header + the squad's internal training feed, rendered
 * through the ONE shared FeedPostCard (origin="squad"). The Performance Firewall is lifted for a
 * squad's own surface, so check-ins / PRs / form checks / challenge updates / train-together /
 * announcements all render through the same card (via additive PostContent variants — never a
 * squad-only renderer); save / RSVP / program affordances stay off (training-only). Each post
 * taps through to the shared Post Detail.
 *
 * PER-SQUAD ISOLATION: the feed comes from getSquadFeed(squadId) — squad-scoped, no cross-squad
 * leak (a tested contract). ALL content is PLACEHOLDER — no backend.
 *
 * Deferred to follow-up S-2 sub-units (noted, not faked): the member check-in strip, the active-
 * challenge standing banner, squad honors/stats, the member roster, squad records, settings, and
 * the composer. The crest is a pending-asset bronze geometric placeholder — never a fabricated
 * per-squad badge. The options action and taps to those unbuilt surfaces are inert.
 */
export default function SquadDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { openShare } = useShareSheet();

  const squadId = String(id ?? '');
  const squad = SQUADS_PLACEHOLDER.find((s) => s.id === squadId);
  const posts = getSquadFeed(squadId);

  const openPost = (pid: string) => router.push({ pathname: '/post/[id]', params: { id: pid } });
  const buildShare = (post: FeedPost) =>
    post.shareType ? () => openShare({ shareType: post.shareType!, overrides: { athlete: post.author } }) : undefined;

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
        title={squad?.name ?? 'Squad'}
        serif
        onBack={() => router.back()}
        actions={
          <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Squad options" style={styles.iconBtn} hitSlop={8}>
            <OverflowIcon />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* identity header — crest is a pending-asset bronze placeholder */}
        <View style={styles.identity}>
          <View style={styles.crest}>
            <CrestGlyph />
          </View>
          <Text style={styles.squadName}>{squad?.name ?? 'Squad'}</Text>
          {squad?.motto ? <Text style={styles.motto}>{squad.motto}</Text> : null}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{squad ? squad.members.length : 0} members</Text>
            {squad ? (
              <>
                <View style={styles.dot} />
                <Text style={styles.metaText}>{squad.trainedToday} trained today</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* the squad feed — shared FeedPostCard, squad origin */}
        {posts.length > 0 ? (
          <View style={styles.feed}>
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} origin="squad" onOpen={() => openPost(post.id)} onShare={buildShare(post)} />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyBody}>When the squad trains, their check-ins and milestones show up here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function OverflowIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={flColor.cream100}>
      <Circle cx={12} cy={5} r={1.7} />
      <Circle cx={12} cy={12} r={1.7} />
      <Circle cx={12} cy={19} r={1.7} />
    </Svg>
  );
}
function CrestGlyph() {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <Path d="M9 11l2 2 4-4" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round },
  scroll: { paddingBottom: 44 },

  identity: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 },
  crest: {
    width: 78,
    height: 78,
    borderRadius: flRadius.round,
    borderWidth: 2,
    borderColor: flColor.bronze400,
    backgroundColor: flColor.charcoal900,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.missionCard,
  },
  squadName: {
    fontFamily: flFont.display,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: flColor.cream100,
    marginTop: 14,
    textAlign: 'center',
  },
  motto: { fontSize: 13.5, color: flColor.gray400, marginTop: 6, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 },
  metaText: { fontSize: 12, color: flColor.gray600 },
  dot: { width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: flColor.charcoal500 },

  feed: { paddingHorizontal: 16, gap: 12 },

  empty: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 40, gap: 8 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },
});
