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

import React from 'react'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Avatar } from '../../composites/Avatar'
import { FlameIcon } from '../../primitives/icons/HomeIcons'
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation'
import { formatProgramMeta, type FeedPost, type PostContent, type PostRole } from '@/data/post-placeholder'
import { formatRecordValue } from '@/domain/records/format'
import { feedOriginConfig, type FeedOrigin, type FeedOriginConfig } from './origin-config'

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
        <FeedContent content={post.content} cfg={cfg} />
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
            <BookmarkGlyph />
          </Pressable>
        ) : null}
        <View style={styles.reactSpacer} />
        {showShare ? (
          <Pressable onPress={onShare ?? (() => {})} accessibilityRole="button" accessibilityLabel="Share" style={styles.shareBtn} hitSlop={6}>
            <ShareGlyph />
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

/** The single content renderer — one treatment per type; the origin config toggles affordances. */
function FeedContent({ content, cfg }: { content: PostContent; cfg: FeedOriginConfig }) {
  switch (content.type) {
    case 'text':
    case 'poll':
      return null // caption carries text; polls open in Post Detail
    case 'achievement':
      return (
        <View style={styles.achPlate}>
          <LinearGradient
            colors={['rgba(191,143,79,0.24)', 'rgba(23,17,11,0.96)'] as const}
            locations={[0, 0.7] as const}
            start={{ x: 0.5, y: 0.2 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.achValue}>{formatRecordValue(content.record.measure)}</Text>
          <Text style={styles.achExercise}>{content.record.exercise}</Text>
          <Text style={styles.achLabel}>{content.label}</Text>
        </View>
      )
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
      )
    case 'program': {
      const meta = formatProgramMeta(content)
      const footNote = content.footNote ?? content.savedNote
      return (
        <View style={styles.programCard}>
          <View style={styles.programHeader}>
            <ProgramKindGlyph />
            <Text style={styles.programKind}>{content.kindLabel ?? 'Program'}</Text>
            {content.price ? (
              <View style={styles.pricePill}>
                <Text style={styles.priceText}>{content.price}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.programMain}>
            <View style={styles.programIcon}>
              <DumbbellGlyph />
            </View>
            <View style={styles.programTextCol}>
              <Text style={styles.programTitle} numberOfLines={1}>
                {content.programName}
              </Text>
              {meta ? (
                <Text style={styles.programMeta} numberOfLines={1}>
                  {meta}
                </Text>
              ) : null}
            </View>
          </View>
          {cfg.programCTA ? (
            <View style={styles.programFooter}>
              <View style={styles.programSaveBtn}>
                <BookmarkGlyph />
                <Text style={styles.programSaveText}>{content.saveLabel ?? 'Save to Upcoming'}</Text>
              </View>
              {footNote ? <Text style={styles.programFootNote}>{footNote}</Text> : null}
            </View>
          ) : null}
        </View>
      )
    }
    case 'media':
      return (
        <View style={styles.media}>
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
      )
    case 'event':
      return (
        <View style={styles.eventCard}>
          <View style={styles.eventDate}>
            <Text style={styles.eventMonth}>{content.month}</Text>
            <Text style={styles.eventDay}>{content.day}</Text>
          </View>
          <View style={styles.eventBody}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {content.title}
            </Text>
            <View style={styles.eventWhenRow}>
              <ClockGlyph />
              <Text style={styles.eventWhen}>{content.when}</Text>
            </View>
            <Text style={styles.eventGoing}>{content.going} going</Text>
          </View>
          {cfg.eventRSVP ? (
            <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="RSVP" style={styles.rsvpBtn}>
              <Text style={styles.rsvpText}>RSVP</Text>
            </Pressable>
          ) : null}
        </View>
      )
    case 'checkin':
      return (
        <View style={styles.checkin}>
          <View style={styles.checkinIcon}>
            <CheckGlyph />
          </View>
          <Text style={styles.checkinText}>Checked in · trained today</Text>
          {content.streak != null ? (
            <View style={styles.streakBadge}>
              <FlameIcon size={13} color={flColor.bronze300} />
              <Text style={styles.streakText}>{content.streak}-day streak</Text>
            </View>
          ) : null}
        </View>
      )
    case 'challengeUpdate':
      return (
        <View style={styles.challengeUpd}>
          <View style={styles.challengeUpdHead}>
            <SwordsGlyph />
            <Text style={styles.challengeUpdName} numberOfLines={1}>
              {content.name}
            </Text>
          </View>
          <View style={styles.challengeUpdStats}>
            <View style={styles.cuStat}>
              <Text style={styles.cuPlace}>{content.place}</Text>
              <Text style={styles.cuStatLabel}>of {content.of}</Text>
            </View>
            <View style={styles.cuDivider} />
            <View style={styles.cuStat}>
              <Text style={styles.cuMetric}>{content.metric}</Text>
              <Text style={styles.cuStatLabel}>to close</Text>
            </View>
          </View>
        </View>
      )
    case 'traintogether':
      return (
        <View style={styles.trainTog}>
          <View style={styles.trainTogHead}>
            <TrainGlyph />
            <Text style={styles.trainTogText}>Train Together</Text>
          </View>
          <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Join" style={styles.joinBtn} hitSlop={6}>
            <Text style={styles.joinText}>Join</Text>
          </Pressable>
        </View>
      )
  }
}

const ROLE_LABEL: Record<PostRole, string> = { owner: 'Owner', captain: 'Captain', mod: 'Mod' }
function RoleBadge({ role }: { role: PostRole }) {
  return (
    <View style={styles.roleBadge}>
      <Text style={styles.roleBadgeText}>{ROLE_LABEL[role]}</Text>
    </View>
  )
}

// ── glyphs ──
function OverflowIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={flColor.gray600}>
      <Circle cx={5} cy={12} r={1.7} />
      <Circle cx={12} cy={12} r={1.7} />
      <Circle cx={19} cy={12} r={1.7} />
    </Svg>
  )
}
function HonorGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l7 3v5c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9V6z" />
      <Path d="M9 11l2 2 4-4" />
    </Svg>
  )
}
function DumbbellGlyph() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
    </Svg>
  )
}
function ProgramKindGlyph() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5.5h13a1.5 1.5 0 0 1 1.5 1.5v11.5H6a2 2 0 0 0-2 2zM4 5.5v14M8 9.5h7M8 13h7" />
    </Svg>
  )
}
function PlayGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill={flColor.cream100}>
      <Path d="M8 6.5l10 5.5-10 5.5z" />
    </Svg>
  )
}
function ClockGlyph() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </Svg>
  )
}
function CommentGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4A7.5 7.5 0 1 1 20 11.5z" />
    </Svg>
  )
}
function BookmarkGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 4h12v16l-6-4-6 4z" />
    </Svg>
  )
}
function ShareGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={6} cy={12} r={2.4} />
      <Circle cx={17} cy={6} r={2.4} />
      <Circle cx={17} cy={18} r={2.4} />
      <Path d="M8.1 10.9l6.8-3.8M8.1 13.1l6.8 3.8" />
    </Svg>
  )
}
function CheckGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4.5 4.5L19 7" />
    </Svg>
  )
}
function SwordsGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 4v6a6 6 0 0 0 12 0V4M12 16v4M8.5 20h7" />
    </Svg>
  )
}
function TrainGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={7.5} cy={8} r={2.4} />
      <Circle cx={16.5} cy={8} r={2.4} />
      <Path d="M3 19a4.5 4.5 0 0 1 9 0M12 19a4.5 4.5 0 0 1 9 0" />
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
  roleBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: flRadius.sm,
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  roleBadgeText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.bronze400 },

  caption: { fontSize: 14, lineHeight: 21, color: flColor.cream100, marginTop: 11 },

  // achievement / PR plate (gradient hero)
  achPlate: {
    marginTop: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    overflow: 'hidden',
    paddingVertical: 22,
    alignItems: 'center',
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.glowSubtle,
  },
  achValue: { fontFamily: flFont.display, fontSize: 44, fontWeight: '700', letterSpacing: 0.5, color: flColor.bronze300 },
  achExercise: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100, marginTop: 6 },
  achLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.bronze400, marginTop: 8 },

  // honor plate
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
  mileSub: { fontSize: 12, color: flColor.gray400, marginTop: 4 },

  // program card
  programCard: {
    marginTop: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    overflow: 'hidden',
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 13,
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
  priceText: { fontSize: 10.5, fontWeight: '700', color: flColor.bronze300 },
  programMain: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  programIcon: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programTextCol: { flex: 1, minWidth: 0, gap: 3 },
  programTitle: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  programMeta: { fontSize: 12, color: flColor.gray400 },
  programFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
  },
  programSaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  programSaveText: { fontSize: 12, fontWeight: '600', color: flColor.bronze300 },
  programFootNote: { flexShrink: 1, textAlign: 'right', fontSize: 11, color: flColor.gray600 },

  // media band
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

  // event card
  eventCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    padding: 12,
  },
  eventDate: {
    width: 48,
    height: 52,
    flexShrink: 0,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMonth: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze300 },
  eventDay: { fontFamily: flFont.display, fontSize: 21, fontWeight: '700', lineHeight: 22, color: flColor.cream100 },
  eventBody: { flex: 1, minWidth: 0, gap: 3 },
  eventTitle: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  eventWhenRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventWhen: { fontSize: 12, color: flColor.gray400 },
  eventGoing: { fontSize: 11, color: flColor.gray600 },
  rsvpBtn: {
    flexShrink: 0,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  rsvpText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300 },

  // squad check-in
  checkin: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  checkinIcon: {
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinText: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '600', color: flColor.cream100 },
  streakBadge: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  streakText: { fontSize: 11, fontWeight: '700', color: flColor.bronze300 },

  // squad challenge update
  challengeUpd: {
    marginTop: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    overflow: 'hidden',
  },
  challengeUpdHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  challengeUpdName: { flex: 1, fontFamily: flFont.display, fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  challengeUpdStats: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 13 },
  cuStat: { flex: 1, alignItems: 'center', gap: 2 },
  cuDivider: { width: 1, alignSelf: 'stretch', backgroundColor: flColor.charcoal700 },
  cuPlace: { fontFamily: flFont.display, fontSize: 22, fontWeight: '700', letterSpacing: -0.3, color: flColor.bronze300 },
  cuMetric: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  cuStatLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },

  // squad train-together
  trainTog: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  trainTogHead: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  trainTogText: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400 },
  joinBtn: {
    flexShrink: 0,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  joinText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300 },

  reactions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 13 },
  reactItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  reactIconBtn: { padding: 2 },
  reactText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  reactSpacer: { flex: 1 },
  shareBtn: { padding: 2 },
})
