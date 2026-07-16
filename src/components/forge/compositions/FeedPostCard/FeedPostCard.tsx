/**
 * FeedPostCard — the ONE feed post card, shared by every feed surface (Friends, Community,
 * Squad). It is config-driven off the post's own fields — `source.kind` selects a
 * `feedOriginConfig` (which affordances light up), plus `role`, exactly the way Post Detail keys
 * its chrome off origin. No forked per-surface cards.
 *
 * Content is rendered ONE way per type (a single renderer, not condensed-vs-rich forks):
 * achievement → PR plate, honor → honor plate, program → program card, media → band, event →
 * event card, text/poll → caption only. The origin config then toggles affordances: the audience
 * tag, the type label, author presence, a save control, the event RSVP, and the program CTA.
 * Tapping the card/caption/content calls `onOpen` (→ Post Detail); `onShare` (keepsake posts)
 * reuses SH-1.
 *
 * READ-ONLY: options / save / RSVP / react are inert; media is a pending-asset band. All content
 * is placeholder (no feed backend).
 */

import Svg, { Circle } from 'react-native-svg'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Avatar } from '../../composites/Avatar'
import { FlameIcon } from '../../primitives/icons/HomeIcons'
import { BookmarkGlyph, CommentGlyph, PostContentBlock, RoleBadge, ShareGlyph } from '../PostContent'
import { flColor, flRadius, flShadow } from '@/constants/foundation'
import { type FeedPost } from '@/data/post-placeholder'
import { feedOriginConfig, type FeedOrigin } from './origin-config'

export interface FeedPostCardProps {
  post: FeedPost
  /**
   * The FEED SURFACE this card is displayed in — which drives the affordance config. This is the
   * screen, NOT the post's source: a community-sourced post re-shared into the Friends feed still
   * renders lean (origin="friend"). `post.source` only supplies the audience-tag text + the Post
   * Detail source bar.
   */
  origin: FeedOrigin
  onOpen: () => void
  onShare?: () => void
  /** Tap the author identity (avatar + name) → their public profile. Omit to leave it non-tappable. */
  onAuthorPress?: () => void
  /** Override the audience-tag visibility; defaults to the surface config. */
  showAudience?: boolean
}

export function FeedPostCard({ post, origin, onOpen, onShare, onAuthorPress, showAudience }: FeedPostCardProps) {
  const cfg = feedOriginConfig(origin)
  const showTag = showAudience ?? cfg.audienceTag
  const presence = cfg.presenceOnAchievement && post.content.type === 'achievement'
  const showShare = Boolean(onShare) || cfg.shareAlways

  return (
    <View style={styles.card}>
      <View style={styles.authorRow}>
        {onAuthorPress ? (
          <Pressable onPress={onAuthorPress} accessibilityRole="button" accessibilityLabel={`View ${post.author}'s profile`} style={styles.identity}>
            {authorIdentity(post, presence, showTag)}
          </Pressable>
        ) : (
          <View style={styles.identity}>{authorIdentity(post, presence, showTag)}</View>
        )}
        {cfg.showTypeLabel && post.typeLabel ? <Text style={styles.typeLabel}>{post.typeLabel}</Text> : null}
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
        <PostContentBlock content={post.content} variant="feed" cfg={cfg} />
      </Pressable>

      <View style={styles.reactions}>
        <View style={styles.reactItem}>
          <FlameIcon size={16} color={flColor.bronze400} />
          <Text style={styles.reactText}>{post.respect}</Text>
        </View>
        <Pressable onPress={onOpen} accessibilityRole="button" style={styles.reactItem} hitSlop={6}>
          <CommentGlyph />
          <Text style={styles.reactText}>{post.commentCount}</Text>
        </Pressable>
        {cfg.save ? (
          <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Save" style={styles.reactIconBtn} hitSlop={6}>
            <BookmarkGlyph size={16} />
          </Pressable>
        ) : null}
        <View style={styles.reactSpacer} />
        {showShare ? (
          <Pressable onPress={onShare ?? (() => {})} accessibilityRole="button" accessibilityLabel="Share" style={styles.shareBtn} hitSlop={6}>
            <ShareGlyph size={16} />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

/** The author avatar + name/meta block — shared by the tappable and non-tappable author render. */
function authorIdentity(post: FeedPost, presence: boolean, showTag: boolean) {
  return (
    <>
      <Avatar name={post.author} size="listRow" presence={presence} />
      <View style={styles.authorText}>
        <View style={styles.nameRow}>
          <Text style={styles.authorName} numberOfLines={1}>
            {post.author}
          </Text>
          {post.role ? <RoleBadge role={post.role} /> : null}
        </View>
        <View style={styles.authorMeta}>
          <Text style={styles.time}>{post.timestamp}</Text>
          {showTag ? (
            <>
              <View style={styles.dot} />
              <Text style={styles.audience}>{post.source.tag}</Text>
            </>
          ) : null}
        </View>
      </View>
    </>
  )
}

// ── local glyph (feed-specific: horizontal options dots) ──
function OverflowIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={flColor.gray600}>
      <Circle cx={5} cy={12} r={1.7} />
      <Circle cx={12} cy={12} r={1.7} />
      <Circle cx={19} cy={12} r={1.7} />
    </Svg>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    padding: 14,
    boxShadow: flShadow.card,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11 },
  authorText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  authorName: { flexShrink: 1, fontSize: 14.5, fontWeight: '500', color: flColor.cream100 },
  authorMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  time: { fontSize: 11.5, color: flColor.gray600 },
  dot: { width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: flColor.charcoal500 },
  audience: { fontSize: 11, color: flColor.gray600 },
  typeLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.gray600 },
  optionsBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  caption: { fontSize: 14, lineHeight: 21, color: flColor.cream100, marginTop: 11 },

  reactions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 13 },
  reactItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  reactIconBtn: { padding: 2 },
  reactText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  reactSpacer: { flex: 1 },
  shareBtn: { padding: 2 },
})
