/**
 * Shared Legacy/Profile section components — the presentational pieces that render an athlete's
 * Legacy story. MOVED verbatim out of `src/app/(tabs)/legacy.tsx` (no rewrite) so the Legacy hub and
 * the visibility-gated Public Profile (`athlete/[id].tsx`) render the SAME components — one source,
 * never forked. Legacy owns the hero (SealPortrait/RankLabel/ProgressBadge), Pinned strip, "What
 * Endures" preview rows and closing; those stay local to legacy.tsx.
 *
 * Data-backed sections only (gate (b) of the visibility model): Current Chapter · My Standard ·
 * Featured Moment · Chapter History (sealed + compact) · Timeline · Accomplishments · Honors.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { ProgressBar } from '@/components/forge/composites/ProgressBar';
import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import type { Accomplishment, Chapter, FeaturedMoment, Goal, Honor, TimelineEntry } from '@/types/legacy';

export function humanizeEvent(t: string): string {
  return t
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
export function goalValue(g: Goal): string | null {
  return g.kind === 'quantifiable' ? `${g.progress}%` : null;
}

/** My Standard — the athlete's creed. Editable-inert on Legacy (onEdit), read-only on the Public Profile. */
export function MyStandard({ standard, onEdit }: { standard: string; onEdit?: () => void }) {
  const body = (
    <>
      <Text style={s.standardLabel}>My Standard</Text>
      <Text style={s.standardText}>{standard}</Text>
    </>
  );
  return onEdit ? (
    <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit my standard" style={s.standardBlock}>
      {body}
    </Pressable>
  ) : (
    <View style={s.standardBlock}>{body}</View>
  );
}

/** Current Chapter + Primary Goal ("What I'm Building"). Includes the leading hairline divider. */
export function CurrentChapter({ chapter, dayCount, onOpen }: { chapter: Chapter; dayCount: number; onOpen?: () => void }) {
  return (
    <View style={s.buildingBlock}>
      <View style={s.hairline} />
      <View style={s.chapterEyebrowRow}>
        <Text style={s.eyebrow}>Current Chapter</Text>
        <View style={s.activePill}>
          <View style={s.activeDot} />
          <Text style={s.activeText}>Active</Text>
        </View>
      </View>
      <Pressable
        onPress={onOpen ?? (() => {})}
        accessibilityRole="button"
        accessibilityLabel={`Open chapter ${chapter.name}`}
        style={s.chapterNameRow}
      >
        <Text style={s.chapterName}>{chapter.name}</Text>
        <ChevronRightIcon size={18} color={flColor.bronze400} />
      </Pressable>

      {chapter.goal.kind !== 'none' ? (
        <View style={s.goalBlock}>
          <Text style={s.eyebrow}>Primary Goal</Text>
          <View style={s.goalRow}>
            <Text style={s.goalLabel}>{chapter.goal.name}</Text>
            {goalValue(chapter.goal) ? <Text style={s.goalValue}>{goalValue(chapter.goal)}</Text> : null}
          </View>
          {chapter.goal.kind === 'quantifiable' ? (
            <ProgressBar value={chapter.goal.progress} max={100} height={8} label={`${chapter.goal.progress}% to goal`} />
          ) : null}
          <View style={s.beganRow}>
            <CalendarIcon />
            <Text style={s.beganText}>
              Began {chapter.startDate} · Day {dayCount}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function FeaturedMomentCard({ moment }: { moment: FeaturedMoment }) {
  return (
    <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel={`Open ${moment.primaryText}`} style={s.flmCard}>
      <LinearGradient
        colors={['rgba(191,143,79,0.12)', 'rgba(191,143,79,0)'] as const}
        locations={[0, 0.55] as const}
        start={{ x: 0.85, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.flmHeader}>
        <View style={s.flmGlyph}>
          <SealIcon />
        </View>
        <View style={s.flmHeaderText}>
          <Text style={s.flmKind}>{humanizeEvent(moment.eventType)}</Text>
          <Text style={s.flmTitle}>{moment.primaryText}</Text>
        </View>
      </View>
      {moment.secondaryText ? (
        <View style={s.flmExcerptRow}>
          <View style={s.excerptRule} />
          <Text style={s.flmExcerpt}>{moment.secondaryText}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function SealedChapterCard({ chapter }: { chapter: Chapter }) {
  return (
    <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel={`Open sealed chapter ${chapter.name}`} style={s.sealedCard}>
      <View style={s.sealedTitleRow}>
        <Text style={s.sealedName}>{chapter.name}</Text>
        <View style={s.sealedTag}>
          <SealIcon size={12} />
          <Text style={s.sealedTagText}>Sealed</Text>
        </View>
      </View>
      {chapter.dateRangeFull || chapter.dateRangeCompact ? (
        <Text style={s.sealedRange}>{chapter.dateRangeFull ?? chapter.dateRangeCompact}</Text>
      ) : null}
      <View style={s.sealedGoalRow}>
        <CheckIcon />
        <Text style={s.sealedGoal}>{chapter.goal.kind !== 'none' ? chapter.goal.name : 'Chapter complete'}</Text>
      </View>
      {chapter.reflection ? (
        <View style={s.flmExcerptRow}>
          <View style={s.excerptRule} />
          <Text style={s.sealedExcerpt}>{chapter.reflection}</Text>
        </View>
      ) : null}
      <View style={s.hairline} />
      <Text style={s.sealedFooter}>
        {chapter.workoutCount} workouts · {chapter.honorCount} honors{chapter.sealedAt ? ` · Sealed ${chapter.sealedAt}` : ''}
      </Text>
    </Pressable>
  );
}

export function CompactChapterRow({ chapter }: { chapter: Chapter }) {
  return (
    <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel={`Open chapter ${chapter.name}`} style={s.compactChapter}>
      <View style={s.compactDiamond} />
      <View style={s.compactChapterBody}>
        <Text style={s.compactChapterName} numberOfLines={1}>
          {chapter.name}
        </Text>
        <Text style={s.compactChapterMeta} numberOfLines={1}>
          {chapter.dateRangeCompact ?? chapter.dateRangeFull ?? ''}
          {chapter.goal.kind !== 'none' ? ` · ${chapter.goal.name}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

export function TimelineRow({ entry }: { entry: TimelineEntry }) {
  return (
    <View style={s.timelineRow}>
      <View style={s.timelineGlyph}>
        <View style={s.timelineDot} />
      </View>
      <Text style={s.timelineTitle} numberOfLines={1}>
        {entry.objectName}
      </Text>
      <Text style={s.timelineDate}>{entry.dateLabel}</Text>
    </View>
  );
}

export function AccomplishmentCard({ item }: { item: Accomplishment }) {
  return (
    <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel={item.text} style={s.accCard}>
      <View style={s.accStar}>
        <StarIcon />
      </View>
      <View style={s.accBody}>
        <Text style={s.accTitle}>{item.text}</Text>
        <Text style={s.accSub}>{item.monthYear}</Text>
      </View>
    </Pressable>
  );
}

/** Honor badge — graceful bronze insignia placeholder (artwork is pending-asset). */
export function HonorInsignia({ honor }: { honor: Honor }) {
  return (
    <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel={`${honor.name}, earned ${honor.dateEarned}`} style={s.honor}>
      <View style={s.honorBadge}>
        <Svg width={64} height={64} viewBox="0 0 64 64">
          <Circle cx={32} cy={32} r={30} stroke={flColor.bronze400} strokeWidth={1.4} opacity={0.5} fill="none" />
          <Circle cx={32} cy={32} r={23} stroke={flColor.bronze400} strokeWidth={1} opacity={0.3} fill="none" />
          <Path d="M32 16 L36 28 L48 28 L38 36 L42 48 L32 40 L22 48 L26 36 L16 28 L28 28 Z" stroke={flColor.bronze300} strokeWidth={1.2} opacity={0.55} fill="none" strokeLinejoin="round" />
        </Svg>
      </View>
      <Text style={s.honorLabel} numberOfLines={2}>
        {honor.name}
      </Text>
      <Text style={s.honorDate}>{honor.dateEarned}</Text>
    </Pressable>
  );
}

// ── inline glyphs (moved verbatim) ──
export function SealIcon({ size = 17 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Circle cx={12} cy={9} r={6} />
      <Path d="M8.5 14l-1.5 7 5-3 5 3-1.5-7" />
    </Svg>
  );
}
export function CheckIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}
export function CalendarIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 9h18M8 3v4M16 3v4" />
    </Svg>
  );
}
export function StarIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M12 3l2.6 5.6 6 .5-4.6 4 1.4 6-5.4-3.2-5.4 3.2 1.4-6-4.6-4 6-.5z" />
    </Svg>
  );
}

// Styles moved verbatim from legacy.tsx (same values ⇒ render-identical).
const s = StyleSheet.create({
  // my standard
  standardBlock: { marginHorizontal: 20, marginTop: 12, paddingHorizontal: 4, borderRadius: flRadius.lg },
  standardLabel: {
    fontFamily: flFont.display,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: flColor.bronze400,
    marginBottom: 10,
  },
  standardText: {
    fontFamily: flFont.display,
    fontStyle: 'italic',
    fontSize: 19,
    fontWeight: '500',
    lineHeight: 28,
    color: flColor.cream100,
  },

  // what i'm building
  buildingBlock: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 4 },
  hairline: { height: 1, backgroundColor: flColor.bronzeBorderSubtle },
  chapterEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 24 },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.gray600,
  },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: flColor.greenMuted, boxShadow: flShadow.presenceDotGlow },
  activeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze300 },
  chapterNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingBottom: 16 },
  chapterName: {
    flexShrink: 1,
    fontFamily: flFont.display,
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.4,
    lineHeight: 30,
    color: flColor.cream100,
  },
  goalBlock: { gap: 9 },
  goalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  goalLabel: { flex: 1, fontFamily: flFont.display, fontSize: 19, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  goalValue: { fontSize: 13, fontWeight: '600', color: flColor.bronze400 },
  beganRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 3 },
  beganText: { fontSize: 11.5, color: flColor.gray600 },

  // featured moment
  flmCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    padding: 24,
    gap: 15,
    boxShadow: flShadow.elevated,
  },
  flmHeader: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  flmGlyph: {
    width: 46,
    height: 46,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.glowSubtle,
  },
  flmHeaderText: { flex: 1, minWidth: 0 },
  flmKind: { fontSize: 10, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },
  flmTitle: {
    fontFamily: flFont.display,
    fontSize: 21,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 23,
    color: flColor.cream100,
    marginTop: 3,
  },
  flmExcerptRow: { flexDirection: 'row', gap: 14 },
  excerptRule: { width: 2, borderRadius: 1, backgroundColor: flColor.bronze400 },
  flmExcerpt: {
    flex: 1,
    fontFamily: flFont.display,
    fontStyle: 'italic',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    color: flColor.bronze300,
  },

  // my story
  sealedCard: {
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    padding: 20,
    gap: 12,
    boxShadow: flShadow.card,
  },
  sealedTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  sealedName: { flex: 1, fontFamily: flFont.display, fontSize: 20, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  sealedTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sealedTagText: { fontSize: 10, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.bronze400 },
  sealedRange: { fontSize: 12, fontWeight: '500', letterSpacing: 0.5, color: flColor.gray400 },
  sealedGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sealedGoal: { flex: 1, fontSize: 13, fontWeight: '600', color: flColor.cream100 },
  sealedExcerpt: {
    flex: 1,
    fontFamily: flFont.display,
    fontStyle: 'italic',
    fontSize: 14.5,
    lineHeight: 22,
    color: flColor.bronze300,
  },
  sealedFooter: { fontSize: 11, fontWeight: '500', letterSpacing: 0.6, color: flColor.gray600 },

  compactChapter: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 6, borderRadius: flRadius.lg },
  compactDiamond: {
    width: 9,
    height: 9,
    transform: [{ rotate: '45deg' }],
    borderWidth: 1,
    borderColor: flColor.bronze400,
    backgroundColor: flColor.bronzeTint,
  },
  compactChapterBody: { flex: 1, minWidth: 0, gap: 3 },
  compactChapterName: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', letterSpacing: -0.1, color: flColor.cream100 },
  compactChapterMeta: { fontSize: 11.5, color: flColor.gray600 },

  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 6 },
  timelineGlyph: {
    width: 30,
    height: 30,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDot: { width: 5, height: 5, transform: [{ rotate: '45deg' }], backgroundColor: flColor.bronze400 },
  timelineTitle: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  timelineDate: { fontSize: 11.5, color: flColor.gray600 },

  // accomplishments
  accCard: {
    width: 184,
    height: 200,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    padding: 16,
    justifyContent: 'space-between',
    boxShadow: flShadow.card,
  },
  accStar: {
    width: 34,
    height: 34,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accBody: { gap: 6 },
  accTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', letterSpacing: -0.2, lineHeight: 21, color: flColor.cream100 },
  accSub: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze300 },

  // honors
  honor: { width: 96, alignItems: 'center', gap: 8 },
  honorBadge: {
    width: 72,
    height: 72,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  honorLabel: { fontSize: 11, fontWeight: '600', letterSpacing: -0.1, textAlign: 'center', color: flColor.cream100 },
  honorDate: { fontSize: 10, color: flColor.gray600 },
});
