/**
 * PostContent — the ONE per-type post-content renderer + shared post glyphs/RoleBadge, used by BOTH
 * the feed card (FeedPostCard) and the full Post Detail. Kills the FeedPostCard↔Post-Detail fork:
 * one taxonomy, one place a content type lands, no duplicated glyphs or RoleBadge.
 *
 * `variant` selects the surface lean: 'feed' (compact list card) vs 'detail' (full-screen). The two
 * surfaces differ in nearly every dimension — not just scale — so their styles live in two verbatim
 * maps lifted straight from the originals: `sf` (feed) and `sd` (detail). The shared JSX picks the
 * surface-appropriate map per element, so each surface renders byte-for-byte what it rendered before
 * the fork was merged. Poll lives here too (feed → null/teaser, detail → full).
 *
 * SANCTIONED consolidation changes (the ONLY non-identical output vs the two originals): the
 * achievement + honor plates now carry the source-faithful radial glow + text-shadow on BOTH surfaces
 * (defined once here; the feed achievement's old flat LinearGradient is replaced by this radial glow),
 * and the drift glyphs CommentGlyph/BookmarkGlyph are canonicalized to one version (the design set is
 * silent on them; the detail version chosen). Everything else is render-identical to its origin.
 *
 * READ-ONLY: affordances (save / RSVP / join) are inert; media is a pending-asset band.
 */

import React from 'react';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlameIcon } from '../../primitives/icons/HomeIcons';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
// `formatProgramMeta` now comes from the domain, NOT from the fixture module. It was the only value
// this production component pulled out of `post-placeholder`, and that one edge compiled every
// invented athlete in there into the shipped bundle. The remaining imports are types, which erase.
import { formatProgramMeta } from '@/domain/training/program-meta';
import type { PostContent, PostRole } from '@/data/post-placeholder';
import { formatRecordValue } from '@/domain/records/format';
import type { FeedOriginConfig } from '../FeedPostCard/origin-config';

export type PostContentVariant = 'feed' | 'detail';

// ── role badge (byte-identical in both originals) ──
const ROLE_LABEL: Record<PostRole, string> = { owner: 'Owner', captain: 'Captain', mod: 'Mod' };
export function RoleBadge({ role }: { role: PostRole }) {
  return (
    <View style={chrome.roleBadge}>
      <Text style={chrome.roleBadgeText}>{ROLE_LABEL[role]}</Text>
    </View>
  );
}

// ── shared glyphs (path-identical across both originals unless noted) ──
type GlyphProps = { size?: number; color?: string };
/** CANONICALIZED to the detail version (design set is silent on it). */
export function CommentGlyph({ size = 16, color = flColor.gray400 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M4 5h16v11H8l-4 4z" />
    </Svg>
  );
}
/** CANONICALIZED to the detail version (design set is silent on it). */
export function BookmarkGlyph({ size = 17, color = flColor.gray400 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M6 3h12v18l-6-4-6 4z" />
    </Svg>
  );
}
export function ShareGlyph({ size = 17, color = flColor.gray400 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Circle cx={6} cy={12} r={2.4} />
      <Circle cx={17} cy={6} r={2.4} />
      <Circle cx={17} cy={18} r={2.4} />
      <Path d="M8.1 10.9l6.8-3.8M8.1 13.1l6.8 3.8" />
    </Svg>
  );
}
function HonorGlyph({ size = 26, color = flColor.bronze300 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M12 3l7 3v5c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9V6z" />
      <Path d="M9 11l2 2 4-4" />
    </Svg>
  );
}
function DumbbellGlyph({ size = 22, color = flColor.bronze300 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
    </Svg>
  );
}
function PlayGlyph({ size = 20, color = flColor.cream100 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 6.5l10 5.5-10 5.5z" />
    </Svg>
  );
}
function ClockGlyph({ size = 13, color = flColor.bronze400 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}
function TrainGlyph({ size = 17, color = flColor.bronze300 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Circle cx={7.5} cy={8} r={2.4} />
      <Circle cx={16.5} cy={8} r={2.4} />
      <Path d="M3 19a4.5 4.5 0 0 1 9 0M12 19a4.5 4.5 0 0 1 9 0" />
    </Svg>
  );
}
function ProgramKindGlyph({ size = 13, color = flColor.bronze300 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M4 5.5h13a1.5 1.5 0 0 1 1.5 1.5v11.5H6a2 2 0 0 0-2 2zM4 5.5v14M8 9.5h7M8 13h7" />
    </Svg>
  );
}
function SwordsGlyph({ size = 16, color = flColor.bronze300 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M5 4.5L18 17.5M19 4.5L6 17.5M12.7 15.8L16.3 12.2M7.7 12.2L11.3 15.8" />
    </Svg>
  );
}
/** The check-in confirm mark (feed CheckGlyph == detail BigCheckGlyph — same path, not drift). */
function CheckinCheckGlyph({ size = 24, color = flColor.bronze300 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M5 12.5l4.5 4.5L19 7" />
    </Svg>
  );
}
/** The poll-choice tick (detail-only; feed never renders polls). */
function PollTickGlyph({ size = 14, color = flColor.bronze300 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

/** Source-faithful radial glow behind the achievement / honor plate (defined ONCE — sanctioned change). */
function PlateGlow({ cx = '50%', cy = '42%', r = '62%', inner = 0.4 }: { cx?: string; cy?: string; r?: string; inner?: number }) {
  const gid = React.useId();
  // Wrap the SVG in an absoluteFill View so it sizes against a definite box on both surfaces —
  // a bare <Svg absoluteFill width="100%"> fails to fill a fixed-height flex parent (the detail plate).
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={gid} cx={cx} cy={cy} r={r}>
            <Stop offset="0" stopColor={flColor.bronze400} stopOpacity={inner} />
            <Stop offset="0.7" stopColor="#17110B" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
      </Svg>
    </View>
  );
}

/**
 * The one per-type content renderer. Each element pulls its style from the surface-appropriate map
 * (`sf` feed / `sd` detail) so the output matches the pre-merge originals exactly, save the sanctioned
 * glow. Layout-divergent types (honor, event, check-in, challenge) branch on `variant`; the rest share
 * one JSX shape with per-surface style + glyph-size picks.
 */
export function PostContentBlock({ content, variant, cfg }: { content: PostContent; variant: PostContentVariant; cfg?: FeedOriginConfig }) {
  const feed = variant === 'feed';

  switch (content.type) {
    case 'text':
      return null;

    case 'poll':
      // Feed defers polls to the detail view (teaser only → caption carries it); detail renders full.
      if (feed) return null;
      return (
        <View style={sd.poll}>
          {content.options.map((o, i) => (
            <View key={i} style={sd.pollOption}>
              <View style={[sd.pollFill, { width: `${o.pct}%` }]} />
              <View style={sd.pollOptionInner}>
                {o.chosen ? <PollTickGlyph /> : null}
                <Text style={sd.pollText}>{o.text}</Text>
              </View>
              <Text style={sd.pollPct}>{o.pct}%</Text>
            </View>
          ))}
          <Text style={sd.pollFooter}>{content.footer}</Text>
        </View>
      );

    case 'achievement':
      // Shared shape; source-faithful radial glow replaces the feed's old flat gradient (sanctioned).
      return (
        <View style={[feed ? sf.achPlate : sd.achievement, chrome.glowClip]}>
          <PlateGlow />
          <Text style={[feed ? sf.achValue : sd.achValue, chrome.glowText]}>{formatRecordValue(content.record.measure)}</Text>
          <Text style={feed ? sf.achExercise : sd.achExercise}>{content.record.exercise}</Text>
          <Text style={feed ? sf.achLabel : sd.achLabel}>{content.label}</Text>
        </View>
      );

    case 'honor':
      // Layout branches (feed vertical milestone vs detail horizontal plate); both gain the glow.
      return feed ? (
        <View style={[sf.milestone, chrome.glowClip]}>
          <PlateGlow cx="15%" cy="0%" r="130%" inner={0.14} />
          <View style={sf.mileHead}>
            <HonorGlyph size={16} />
            <Text style={sf.mileKind}>{content.label}</Text>
          </View>
          <Text style={sf.mileTitle}>{content.title}</Text>
          {content.sub ? <Text style={sf.mileSub}>{content.sub}</Text> : null}
        </View>
      ) : (
        <View style={[sd.plate, chrome.glowClip]}>
          <PlateGlow cx="12%" cy="0%" r="130%" inner={0.14} />
          <View style={sd.plateIcon}>
            <HonorGlyph size={26} />
          </View>
          <View style={sd.plateText}>
            <Text style={sd.plateLabel}>{content.label}</Text>
            <Text style={sd.plateTitle}>{content.title}</Text>
            {content.sub ? <Text style={sd.plateSub}>{content.sub}</Text> : null}
          </View>
        </View>
      );

    case 'program': {
      const meta = formatProgramMeta(content);
      const footNote = content.footNote ?? content.savedNote;
      const showFoot = feed ? Boolean(cfg?.programCTA) : Boolean(content.saveLabel);
      return (
        <View style={feed ? sf.programCard : sd.program}>
          <View style={feed ? sf.programHeader : sd.programHead}>
            {feed ? <ProgramKindGlyph /> : null}
            <Text style={feed ? sf.programKind : sd.programKind}>{content.kindLabel ?? 'Program'}</Text>
            {content.price ? (
              <View style={feed ? sf.pricePill : sd.pricePill}>
                <Text style={feed ? sf.priceText : sd.pricePillText}>{content.price}</Text>
              </View>
            ) : null}
          </View>
          <View style={feed ? sf.programMain : sd.programBody}>
            <View style={feed ? sf.programIcon : sd.plateIcon}>
              <DumbbellGlyph />
            </View>
            <View style={feed ? sf.programTextCol : sd.plateText}>
              <Text style={feed ? sf.programTitle : sd.plateTitle} numberOfLines={feed ? 1 : undefined}>
                {content.programName}
              </Text>
              {meta ? (
                <Text style={feed ? sf.programMeta : sd.plateSub} numberOfLines={feed ? 1 : undefined}>
                  {meta}
                </Text>
              ) : null}
            </View>
          </View>
          {showFoot ? (
            <View style={feed ? sf.programFooter : sd.programFoot}>
              <View style={feed ? sf.programSaveBtn : sd.programSaveBtn}>
                <BookmarkGlyph size={feed ? 16 : 17} />
                <Text style={feed ? sf.programSaveText : sd.programSaveText}>{content.saveLabel ?? 'Save to Upcoming'}</Text>
              </View>
              {footNote ? <Text style={feed ? sf.programFootNote : sd.programFootNote}>{footNote}</Text> : null}
            </View>
          ) : null}
        </View>
      );
    }

    case 'media':
      return (
        <View style={feed ? sf.media : sd.media}>
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Rect x="0" y="0" width="100%" height="100%" fill={flColor.charcoal800} />
          </Svg>
          {content.mediaKind === 'video' ? (
            <>
              <View style={feed ? sf.playBtn : sd.playBtn}>
                <PlayGlyph />
              </View>
              <View style={feed ? sf.videoTag : sd.videoTag}>
                <Text style={feed ? sf.videoTagText : sd.videoTagText}>Video{content.duration ? ` · ${content.duration}` : ''}</Text>
              </View>
            </>
          ) : (
            <Text style={feed ? sf.mediaHint : sd.mediaHint}>Photo</Text>
          )}
        </View>
      );

    case 'event':
      return feed ? (
        <View style={sf.eventCard}>
          <View style={sf.eventDate}>
            <Text style={sf.eventMonth}>{content.month}</Text>
            <Text style={sf.eventDay}>{content.day}</Text>
          </View>
          <View style={sf.eventBody}>
            <Text style={sf.eventTitle} numberOfLines={1}>
              {content.title}
            </Text>
            <View style={sf.eventWhenRow}>
              <ClockGlyph />
              <Text style={sf.eventWhen}>{content.when}</Text>
            </View>
            <Text style={sf.eventGoing}>{content.going} going</Text>
          </View>
          {cfg?.eventRSVP ? (
            <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="RSVP" style={sf.rsvpBtn}>
              <Text style={sf.rsvpText}>RSVP</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={sd.event}>
          <View style={sd.eventRow}>
            <View style={sd.eventDate}>
              <Text style={sd.eventMonth}>{content.month}</Text>
              <Text style={sd.eventDay}>{content.day}</Text>
            </View>
            <View style={sd.eventText}>
              <Text style={sd.eventTitle}>{content.title}</Text>
              <View style={sd.eventWhenRow}>
                <ClockGlyph />
                <Text style={sd.eventWhen}>{content.when}</Text>
              </View>
              <Text style={sd.eventGoing}>{content.going} going</Text>
            </View>
          </View>
          <Pressable onPress={() => {}} accessibilityRole="button" style={sd.rsvpBtn}>
            <Text style={sd.rsvpText}>Interested</Text>
          </Pressable>
        </View>
      );

    case 'checkin':
      return feed ? (
        <View style={sf.checkin}>
          <View style={sf.checkinIcon}>
            <CheckinCheckGlyph size={16} />
          </View>
          <Text style={sf.checkinText}>Checked in · trained today</Text>
          {content.streak != null ? (
            <View style={sf.streakBadge}>
              <FlameIcon size={13} color={flColor.bronze300} />
              <Text style={sf.streakText}>{content.streak}-day streak</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={sd.checkin}>
          <View style={sd.checkinIcon}>
            <CheckinCheckGlyph size={24} />
          </View>
          <View style={sd.plateText}>
            <Text style={sd.plateLabel}>Check-in</Text>
            <Text style={sd.plateTitle}>Trained today</Text>
          </View>
          {content.streak != null ? (
            <View style={sd.streakBadge}>
              <FlameIcon size={14} color={flColor.bronze300} />
              <Text style={sd.streakText}>{content.streak}-day streak</Text>
            </View>
          ) : null}
        </View>
      );

    case 'challengeUpdate':
      return feed ? (
        <View style={sf.challengeUpd}>
          <View style={sf.challengeUpdHead}>
            <SwordsGlyph />
            <Text style={sf.challengeUpdName} numberOfLines={1}>
              {content.name}
            </Text>
          </View>
          <View style={sf.challengeUpdStats}>
            <View style={sf.cuStat}>
              <Text style={sf.cuPlace}>{content.place}</Text>
              <Text style={sf.cuStatLabel}>of {content.of}</Text>
            </View>
            <View style={sf.cuDivider} />
            <View style={sf.cuStat}>
              <Text style={sf.cuMetric}>{content.metric}</Text>
              <Text style={sf.cuStatLabel}>to close</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={sd.program}>
          <View style={sd.programHead}>
            <Text style={sd.programKind}>{content.name}</Text>
          </View>
          <View style={sd.cuStatsRow}>
            <View style={sd.cuStat}>
              <Text style={sd.cuPlace}>{content.place}</Text>
              <Text style={sd.cuStatLabel}>of {content.of}</Text>
            </View>
            <View style={sd.cuDivider} />
            <View style={sd.cuStat}>
              <Text style={sd.cuMetric}>{content.metric}</Text>
              <Text style={sd.cuStatLabel}>to close</Text>
            </View>
          </View>
        </View>
      );

    case 'traintogether':
      return (
        <View style={feed ? sf.trainTog : sd.trainTog}>
          <View style={feed ? sf.trainTogHead : sd.trainTogHead}>
            <TrainGlyph size={feed ? 16 : 17} />
            <Text style={feed ? sf.trainTogText : sd.trainTogText}>Train Together</Text>
          </View>
          <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Join" style={feed ? sf.joinBtn : sd.joinBtn} hitSlop={6}>
            <Text style={feed ? sf.joinText : sd.joinText}>Join</Text>
          </Pressable>
        </View>
      );
  }
}

// ── shared chrome + sanctioned glow overlay (the only additive styles) ──
const chrome = StyleSheet.create({
  roleBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: flRadius.sm,
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  roleBadgeText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.bronze400 },
  // sanctioned: clip the radial glow to the plate's rounded corners + the value text-shadow.
  glowClip: { overflow: 'hidden' },
  glowText: { textShadowColor: 'rgba(186, 134, 84,0.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 22 },
});

// ── FEED styles — lifted verbatim from the original FeedPostCard content styles ──
const sf = StyleSheet.create({
  // achievement
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

  // honor plate (vertical milestone)
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

  // event card (inline RSVP)
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
});

// ── DETAIL styles — lifted verbatim from the original Post Detail content styles ──
const sd = StyleSheet.create({
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

  // honor / program plate (horizontal)
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
  programFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
  },
  programSaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  programSaveText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze300 },
  programFootNote: { flexShrink: 1, textAlign: 'right', fontSize: 11.5, color: flColor.gray600 },

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

  // event (footer RSVP)
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

  // squad check-in
  checkin: {
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
  checkinIcon: {
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
  streakBadge: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  streakText: { fontSize: 12, fontWeight: '700', color: flColor.bronze300 },

  // squad challenge update (reuses the program shell + head)
  cuStatsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 14 },
  cuStat: { flex: 1, alignItems: 'center', gap: 3 },
  cuDivider: { width: 1, alignSelf: 'stretch', backgroundColor: flColor.charcoal700 },
  cuPlace: { fontFamily: flFont.display, fontSize: 28, fontWeight: '700', letterSpacing: -0.4, color: flColor.bronze300 },
  cuMetric: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  cuStatLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },

  // squad train-together
  trainTog: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
  },
  trainTogHead: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  trainTogText: { fontSize: 11.5, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400 },
  joinBtn: {
    flexShrink: 0,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  joinText: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300 },

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
});
