import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ShareCard } from '@/components/forge/compositions/ShareCard';
import { buildShareContent, shareSnippet } from '@/domain/share/content';
import { getSelfProfile } from '@/domain/profile/placeholder-data';
import { getPost, type Post } from '@/data/post-placeholder';
import { useShareSheet } from '@/hooks/useShareSheet';
import { flColor, flFont, flGradient } from '@/constants/foundation';

/**
 * Post Detail — a read-only, full-screen presentation of a single shared keepsake.
 * SHELL ONLY: render + navigation. No compose/edit/delete affordances.
 *
 * Reuses the ③ Share Card renderer (`ShareCard`) at hero scale and re-opens SH-1 via
 * `useShareSheet` — nothing is re-implemented. Content is PLACEHOLDER: `getPost(id)` is a
 * demo fixture keyed to the 7 ShareKinds (feed fetch deferred); the athlete name is the
 * placeholder profile.
 *
 * ⚠ Presentation: the app routes through an expo-router/ui Tabs shell with no root Stack, so
 * this renders edge-to-edge inside the tab slot but the global tab bar stays visible. A true
 * no-tab-bar Full Screen takeover needs a root Stack presentation (a routing change beyond
 * this shell) — flagged, not done here.
 */

const NO_HIDDEN: ReadonlySet<string> = new Set();

/** Typed seam so compose/edit affordances can mount later without restructuring. Empty in the shell. */
export interface PostDetailActions {
  /** Extra AppBar action (e.g. an overflow menu). */
  headerAction?: React.ReactNode;
  /** Extra footer control (e.g. Edit). */
  footerExtra?: React.ReactNode;
}

export default function PostDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const post = getPost(String(id ?? ''));

  if (!post) {
    return <PostNotFound onBack={() => router.back()} />;
  }
  return <PostDetail post={post} onBack={() => router.back()} />;
}

function PostDetail({ post, onBack, actions = {} }: { post: Post; onBack: () => void; actions?: PostDetailActions }) {
  const insets = useSafeAreaInsets();
  const { openShare } = useShareSheet();
  const profile = getSelfProfile();

  const content = buildShareContent(post.shareType, { athlete: profile.name });
  const snippet = shareSnippet(content, NO_HIDDEN, true);

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
        onBack={onBack}
        actions={
          <>
            {actions.headerAction}
            <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="More options" style={styles.iconBtn} hitSlop={8}>
              <OverflowIcon />
            </Pressable>
          </>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <ShareCard content={content} hiddenKeys={NO_HIDDEN} includeName />
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaAthlete}>
            {content.athlete}
            {content.rankInFooter ? <Text style={styles.metaRank}>{`  ·  ${content.rank}`}</Text> : null}
          </Text>
          <Text style={styles.metaTime}>{post.timestamp}</Text>
        </View>

        <Text style={styles.snippet}>{snippet}</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {actions.footerExtra}
        <Button
          variant="primary"
          fullWidth
          icon={<ShareIcon />}
          onPress={() => openShare({ shareType: post.shareType, overrides: { athlete: profile.name } })}
          accessibilityLabel="Share this keepsake"
        >
          Share
        </Button>
      </View>
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
        <Text style={styles.notFoundBody}>This keepsake isn’t available.</Text>
      </View>
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
function ShareIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#F7F5F1" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={6} cy={12} r={2.4} />
      <Circle cx={17} cy={6} r={2.4} />
      <Circle cx={17} cy={18} r={2.4} />
      <Path d="M8.1 10.9l6.8-3.8M8.1 13.1l6.8 3.8" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 9999 },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  heroWrap: { alignItems: 'center', paddingVertical: 12 },
  meta: { alignItems: 'center', marginTop: 20, gap: 5 },
  metaAthlete: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  metaRank: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.bronze400 },
  metaTime: { fontSize: 12, color: flColor.gray600 },
  snippet: {
    marginTop: 22,
    fontSize: 13.5,
    lineHeight: 21,
    textAlign: 'center',
    color: flColor.gray400,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: 'rgba(13,13,15,0.92)',
    gap: 10,
  },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  notFoundTitle: { fontFamily: flFont.display, fontSize: 24, fontWeight: '600', color: flColor.cream100 },
  notFoundBody: { fontSize: 13, color: flColor.gray400 },
});
