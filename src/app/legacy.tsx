import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import { ProgressBar } from '@/components/forge/composites/ProgressBar';
import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';
import { getSelfProfile } from '@/domain/profile/placeholder-data';
import { PLACEHOLDER_RANK, resolveRankArtwork } from '@/domain/rank-artwork/resolver';
import { resolveRankArtworkSource } from '@/domain/rank-artwork/rank-source';
import { LEGACY_DATA } from '@/data/legacy-placeholder';
import type { Accomplishment, Chapter, FeaturedMoment, Goal, Honor, TimelineEntry } from '@/types/legacy';

/**
 * Legacy tab root — L-1 Legacy Hub.
 * Source of truth: the design handoff "Forge Legacy.dc.html" (new foundation system).
 *
 * Rebuilt on the foundation tokens + committed composites to match Home/Workouts
 * (the pre-existing `components/legacy/*` are old `legacy-theme` and now bannered
 * legacy). Sections, top to bottom: the hero (identity + "My Standard" creed +
 * current chapter & primary goal), Pinned Legacy (empty museum), Featured Legacy
 * Moment, My Story (chapter history + timeline preview), What Endures
 * (Transformation/Photos/Trophy preview rows + Accomplishments + Honors), and the
 * closing inscription.
 *
 * ALL Legacy content is PLACEHOLDER (`LEGACY_DATA`) — there is no Chapters/Legacy
 * backend yet; nothing here is labeled real. The athlete name comes from the
 * placeholder profile (`getSelfProfile`).
 *
 * The hero seal now shows the REAL imported rank badge art (`rankArtwork`, resolved via
 * `src/domain/rank-artwork`); the TIER is still a placeholder (`PLACEHOLDER_RANK` — no
 * rank backend yet), and it falls back to the graceful bronze seal when unresolved.
 *
 * Still pending-asset (NOT fabricated — graceful bronze placeholders): the Progress /
 * Foundation badge, and the Honors insignia (Honors is legitimately shown HERE — an
 * achievement context, unlike the workout card where it is reserved — but the honor art
 * was never imported).
 *
 * Deferred to a follow-up sub-phase (noted at the gate): the three bottom sheets
 * (L-11 Honor Detail, L-12 My Standard editor, L-13 Pin manager), the Toast, the
 * scroll-driven artwork fade, and Transformation/Trophy counts (no data). Taps to
 * unbuilt destinations are inert, consistent with Home/Workouts.
 */

function humanizeEvent(t: string): string {
  return t
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
function goalValue(g: Goal): string | null {
  return g.kind === 'quantifiable' ? `${g.progress}%` : null;
}

export default function LegacyScreen() {
  const profile = getSelfProfile();
  const data = LEGACY_DATA;
  const chapter = data.activeChapter;
  const [recentSeal, ...olderSeals] = data.sealedChapters;
  // Rank badge for the hero seal. TIER is placeholder (no rank backend); sex only
  // matters for the sex-specific Established family. undefined → placeholder seal.
  const rankArtwork = resolveRankArtworkSource(
    resolveRankArtwork({ ...PLACEHOLDER_RANK, sex: profile.sex }).assetPath,
  );

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
        title="Legacy"
        serif
        avatar={<Avatar name={profile.name} size="appBar" />}
        onAvatar={() => {
          // P-1 Profile / Account — not yet implemented.
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── HERO · identity ── */}
        <View style={styles.identityRow}>
          <SealPortrait name={profile.name} rankArtwork={rankArtwork} />
          <View style={styles.identityText}>
            <Text style={styles.athleteName} numberOfLines={1}>
              {profile.name}
            </Text>
            <RankLabel label={data.rankName} sub={data.rankSubTier} />
            <Text style={styles.identitySub}>Forging a permanent record, one chapter at a time.</Text>
          </View>
          <ProgressBadge
            onPress={() => {
              // P-2 Progress Hub — not yet implemented.
            }}
          />
        </View>

        {/* My Standard — the creed */}
        <Pressable
          onPress={() => {
            // L-12 My Standard editor — not yet implemented.
          }}
          accessibilityRole="button"
          accessibilityLabel="Edit my standard"
          style={styles.standardBlock}
        >
          <Text style={styles.standardLabel}>My Standard</Text>
          <Text style={styles.standardText}>{data.standard}</Text>
        </Pressable>

        {/* What I'm Building — current chapter + primary goal */}
        {chapter ? (
          <View style={styles.buildingBlock}>
            <View style={styles.hairline} />
            <View style={styles.chapterEyebrowRow}>
              <Text style={styles.eyebrow}>Current Chapter</Text>
              <View style={styles.activePill}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>Active</Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                // Chapter Detail — not yet implemented.
              }}
              accessibilityRole="button"
              accessibilityLabel={`Open chapter ${chapter.name}`}
              style={styles.chapterNameRow}
            >
              <Text style={styles.chapterName}>{chapter.name}</Text>
              <ChevronRightIcon size={18} color={flColor.bronze400} />
            </Pressable>

            {chapter.goal.kind !== 'none' ? (
              <View style={styles.goalBlock}>
                <Text style={styles.eyebrow}>Primary Goal</Text>
                <View style={styles.goalRow}>
                  <Text style={styles.goalLabel}>{chapter.goal.name}</Text>
                  {goalValue(chapter.goal) ? <Text style={styles.goalValue}>{goalValue(chapter.goal)}</Text> : null}
                </View>
                {chapter.goal.kind === 'quantifiable' ? (
                  <ProgressBar value={chapter.goal.progress} max={100} height={8} label={`${chapter.goal.progress}% to goal`} />
                ) : null}
                <View style={styles.beganRow}>
                  <CalendarIcon />
                  <Text style={styles.beganText}>
                    Began {chapter.startDate} · Day {data.dayCount}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── PINNED LEGACY · empty museum ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderPad}>
            <SectionHeader label="Pinned Legacy" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripPad}>
            <Pressable
              onPress={() => {
                // L-13 Pin manager — not yet implemented.
              }}
              accessibilityRole="button"
              accessibilityLabel="Pin an item to your Legacy"
              style={styles.pinTile}
            >
              <View style={styles.pinPlus}>
                <PlusIcon color={flColor.bronze400} />
              </View>
              <Text style={styles.pinText}>Pin an item</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* ── FEATURED LEGACY MOMENT ── */}
        {data.featuredMoment ? (
          <View style={styles.sectionPad}>
            <Text style={styles.overline}>Featured Legacy Moment</Text>
            <FeaturedMomentCard moment={data.featuredMoment} />
          </View>
        ) : null}

        {/* ── MY STORY · chapter history + timeline ── */}
        {recentSeal ? (
          <View style={[styles.sectionPad, styles.storyStack]}>
            <SealedChapterCard chapter={recentSeal} />
            {olderSeals.map((c) => (
              <CompactChapterRow key={c.id} chapter={c} />
            ))}

            {data.timelineEntries.length > 0 ? (
              <View style={styles.timelineBlock}>
                <Text style={styles.overlineTight}>Recent</Text>
                <View>
                  {data.timelineEntries.map((it) => (
                    <TimelineRow key={it.id} entry={it} />
                  ))}
                </View>
                <Pressable
                  onPress={() => {
                    // L-2 Legacy Timeline — not yet implemented (old-theme dev route retained separately).
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="View full timeline"
                  style={styles.viewTimeline}
                >
                  <Text style={styles.viewTimelineText}>View Full Timeline</Text>
                  <ChevronRightIcon size={15} color={flColor.bronze400} />
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── WHAT ENDURES ── */}
        <View style={styles.enduresStack}>
          <View style={styles.previewGroup}>
            <PreviewRow title="Transformation" sub="Physique & progress footage" onPress={() => {}} />
            <View style={styles.previewDivider} />
            <PreviewRow title="Photos" sub="Every chapter, one archive" count={`${data.totalPhotoCount} photos`} onPress={() => {}} />
            <View style={styles.previewDivider} />
            <PreviewRow title="Trophy Case" sub="Championships & podium finishes" onPress={() => {}} />
          </View>

          {/* Accomplishments */}
          {data.accomplishments.length > 0 ? (
            <View>
              <View style={styles.sectionHeaderPad}>
                <SectionHeader label="Accomplishments" action="View all" onAction={() => {}} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripPad}>
                {data.accomplishments.map((a) => (
                  <AccomplishmentCard key={a.id} item={a} />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Honors — reserved from the workout card, legitimate here; art is pending-asset */}
          {data.honors.length > 0 ? (
            <View>
              <View style={styles.sectionHeaderPad}>
                <SectionHeader label="Honors" action="View all" onAction={() => {}} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.honorStripPad}>
                {data.honors.map((h) => (
                  <HonorInsignia key={h.id} honor={h} />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {/* Closing inscription */}
        <View style={styles.closing}>
          <View style={styles.closingRule}>
            <View style={styles.closingLine} />
            <View style={styles.closingDiamond} />
            <View style={styles.closingLine} />
          </View>
          <Text style={styles.closingText}>Memories can be added. History cannot be rewritten.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local presentational pieces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hero rank seal. When the rank badge art resolves it renders the REAL badge (tier is a
 * placeholder — no rank backend). Fallback: the athlete's initials inside a faint bronze
 * rank-seal placeholder ring (never a fabricated badge).
 */
function SealPortrait({ name, rankArtwork }: { name: string; rankArtwork?: number }) {
  if (rankArtwork != null) {
    return (
      <View style={styles.portraitWrap} accessibilityElementsHidden importantForAccessibility="no">
        <Image source={rankArtwork} style={styles.rankBadgeArt} contentFit="contain" />
      </View>
    );
  }
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={styles.portraitWrap}>
      {/* pending-asset rank seal — faint geometric placeholder, not a fabricated badge */}
      <Svg width={90} height={90} viewBox="0 0 90 90" style={StyleSheet.absoluteFill}>
        <Circle cx={45} cy={45} r={43} stroke={flColor.bronze400} strokeWidth={1} opacity={0.16} fill="none" />
        <Circle cx={45} cy={45} r={37} stroke={flColor.bronze400} strokeWidth={1} opacity={0.1} fill="none" />
        <Rect x={31} y={31} width={28} height={28} stroke={flColor.bronze400} strokeWidth={1} opacity={0.12} fill="none" transform="rotate(45 45 45)" />
      </Svg>
      <View style={styles.portrait}>
        <Text style={styles.portraitInitials}>{initials}</Text>
      </View>
    </View>
  );
}

/** RankMarker — the rank name as a bronze marker label. */
function RankLabel({ label, sub }: { label: string; sub: string }) {
  return (
    <View style={styles.rankMarker}>
      <View style={styles.rankDiamond} />
      <Text style={styles.rankText}>
        {label}
        {sub ? ` · ${sub}` : ''}
      </Text>
    </View>
  );
}

/** FoundationBadge placeholder (pending-asset) + "Progress" pill. */
function ProgressBadge({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="View your progress" style={styles.progressBadge}>
      <View style={styles.badgeShield}>
        <Svg width={38} height={52} viewBox="0 0 38 52">
          <Path d="M4 6 L34 6 L34 30 Q34 44 19 50 Q4 44 4 30 Z" stroke={flColor.bronze400} strokeWidth={1.2} opacity={0.4} fill="none" />
          <Path d="M11 3 L13 9 L19 3 L25 9 L27 3" stroke={flColor.bronze400} strokeWidth={1} opacity={0.3} fill="none" strokeLinejoin="miter" />
        </Svg>
      </View>
      <View style={styles.progressPill}>
        <Text style={styles.progressPillText}>Progress</Text>
        <ChevronRightIcon size={9} color={flColor.bronze300} />
      </View>
    </Pressable>
  );
}

function FeaturedMomentCard({ moment }: { moment: FeaturedMoment }) {
  return (
    <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel={`Open ${moment.primaryText}`} style={styles.flmCard}>
      <LinearGradient
        colors={['rgba(191,143,79,0.12)', 'rgba(191,143,79,0)'] as const}
        locations={[0, 0.55] as const}
        start={{ x: 0.85, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.flmHeader}>
        <View style={styles.flmGlyph}>
          <SealIcon />
        </View>
        <View style={styles.flmHeaderText}>
          <Text style={styles.flmKind}>{humanizeEvent(moment.eventType)}</Text>
          <Text style={styles.flmTitle}>{moment.primaryText}</Text>
        </View>
      </View>
      {moment.secondaryText ? (
        <View style={styles.flmExcerptRow}>
          <View style={styles.excerptRule} />
          <Text style={styles.flmExcerpt}>{moment.secondaryText}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function SealedChapterCard({ chapter }: { chapter: Chapter }) {
  return (
    <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel={`Open sealed chapter ${chapter.name}`} style={styles.sealedCard}>
      <View style={styles.sealedTitleRow}>
        <Text style={styles.sealedName}>{chapter.name}</Text>
        <View style={styles.sealedTag}>
          <SealIcon size={12} />
          <Text style={styles.sealedTagText}>Sealed</Text>
        </View>
      </View>
      {chapter.dateRangeFull || chapter.dateRangeCompact ? (
        <Text style={styles.sealedRange}>{chapter.dateRangeFull ?? chapter.dateRangeCompact}</Text>
      ) : null}
      <View style={styles.sealedGoalRow}>
        <CheckIcon />
        <Text style={styles.sealedGoal}>{chapter.goal.kind !== 'none' ? chapter.goal.name : 'Chapter complete'}</Text>
      </View>
      {chapter.reflection ? (
        <View style={styles.flmExcerptRow}>
          <View style={styles.excerptRule} />
          <Text style={styles.sealedExcerpt}>{chapter.reflection}</Text>
        </View>
      ) : null}
      <View style={styles.hairline} />
      <Text style={styles.sealedFooter}>
        {chapter.workoutCount} workouts · {chapter.honorCount} honors{chapter.sealedAt ? ` · Sealed ${chapter.sealedAt}` : ''}
      </Text>
    </Pressable>
  );
}

function CompactChapterRow({ chapter }: { chapter: Chapter }) {
  return (
    <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel={`Open chapter ${chapter.name}`} style={styles.compactChapter}>
      <View style={styles.compactDiamond} />
      <View style={styles.compactChapterBody}>
        <Text style={styles.compactChapterName} numberOfLines={1}>
          {chapter.name}
        </Text>
        <Text style={styles.compactChapterMeta} numberOfLines={1}>
          {chapter.dateRangeCompact ?? chapter.dateRangeFull ?? ''}
          {chapter.goal.kind !== 'none' ? ` · ${chapter.goal.name}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineGlyph}>
        <View style={styles.timelineDot} />
      </View>
      <Text style={styles.timelineTitle} numberOfLines={1}>
        {entry.objectName}
      </Text>
      <Text style={styles.timelineDate}>{entry.dateLabel}</Text>
    </View>
  );
}

function PreviewRow({ title, sub, count, onPress }: { title: string; sub: string; count?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={styles.previewRow}>
      <View style={styles.previewBody}>
        <Text style={styles.previewTitle}>{title}</Text>
        <Text style={styles.previewSub}>{sub}</Text>
      </View>
      {count ? <Text style={styles.previewCount}>{count}</Text> : null}
      <ChevronRightIcon size={17} color={flColor.bronze400} />
    </Pressable>
  );
}

function AccomplishmentCard({ item }: { item: Accomplishment }) {
  return (
    <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel={item.text} style={styles.accCard}>
      <View style={styles.accStar}>
        <StarIcon />
      </View>
      <View style={styles.accBody}>
        <Text style={styles.accTitle}>{item.text}</Text>
        <Text style={styles.accSub}>{item.monthYear}</Text>
      </View>
    </Pressable>
  );
}

/** Honor badge — graceful bronze insignia placeholder (artwork is pending-asset). */
function HonorInsignia({ honor }: { honor: Honor }) {
  return (
    <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel={`${honor.name}, earned ${honor.dateEarned}`} style={styles.honor}>
      <View style={styles.honorBadge}>
        <Svg width={64} height={64} viewBox="0 0 64 64">
          <Circle cx={32} cy={32} r={30} stroke={flColor.bronze400} strokeWidth={1.4} opacity={0.5} fill="none" />
          <Circle cx={32} cy={32} r={23} stroke={flColor.bronze400} strokeWidth={1} opacity={0.3} fill="none" />
          <Path d="M32 16 L36 28 L48 28 L38 36 L42 48 L32 40 L22 48 L26 36 L16 28 L28 28 Z" stroke={flColor.bronze300} strokeWidth={1.2} opacity={0.55} fill="none" strokeLinejoin="round" />
        </Svg>
      </View>
      <Text style={styles.honorLabel} numberOfLines={2}>
        {honor.name}
      </Text>
      <Text style={styles.honorDate}>{honor.dateEarned}</Text>
    </Pressable>
  );
}

// ── inline glyphs ──
function PlusIcon({ color = flColor.bronze400 }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function SealIcon({ size = 17 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={9} r={6} />
      <Path d="M8.5 14l-1.5 7 5-3 5 3-1.5-7" />
    </Svg>
  );
}
function CheckIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}
function CalendarIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 9h18M8 3v4M16 3v4" />
    </Svg>
  );
}
function StarIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l2.6 5.6 6 .5-4.6 4 1.4 6-5.4-3.2-5.4 3.2 1.4-6-4.6-4 6-.5z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 44 },

  // hero identity
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 2,
  },
  portraitWrap: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  rankBadgeArt: { width: 90, height: 90 },
  portrait: {
    width: 72,
    height: 72,
    borderRadius: flRadius.round,
    borderWidth: 1.5,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.glowSubtle,
  },
  portraitInitials: {
    fontFamily: flFont.display,
    fontSize: 24,
    fontWeight: '600',
    color: flColor.bronze300,
  },
  identityText: { flex: 1, minWidth: 0, gap: 7 },
  athleteName: {
    fontFamily: flFont.display,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: flColor.cream100,
  },
  identitySub: { fontSize: 11.5, fontWeight: '500', letterSpacing: 0.3, color: flColor.gray400 },
  rankMarker: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rankDiamond: { width: 6, height: 6, transform: [{ rotate: '45deg' }], backgroundColor: flColor.bronze400 },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.bronze300,
  },
  progressBadge: { width: 76, alignItems: 'center', gap: 6 },
  badgeShield: { width: 38, height: 52, alignItems: 'center', justifyContent: 'center' },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  progressPillText: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: flColor.bronze300,
  },

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

  // sections
  section: { marginTop: 46 },
  sectionPad: { marginTop: 46, paddingHorizontal: 24 },
  sectionHeaderPad: { paddingHorizontal: 24 },
  stripPad: { gap: 12, paddingHorizontal: 24, paddingTop: 8 },
  honorStripPad: { gap: 18, paddingHorizontal: 24, paddingTop: 10 },
  overline: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: flColor.gray600,
    paddingBottom: 12,
    paddingHorizontal: 2,
  },
  overlineTight: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: flColor.gray600,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },

  // pinned
  pinTile: {
    width: 150,
    height: 196,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pinPlus: {
    width: 38,
    height: 38,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: flColor.bronze400 },

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
  storyStack: { gap: 12 },
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

  timelineBlock: { paddingTop: 16 },
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
  viewTimeline: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 12, paddingHorizontal: 6 },
  viewTimelineText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.bronze400 },

  // what endures
  enduresStack: { marginTop: 46, gap: 26 },
  previewGroup: { paddingHorizontal: 18 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 8, borderRadius: flRadius.lg },
  previewBody: { flex: 1, minWidth: 0, gap: 2 },
  previewTitle: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  previewSub: { fontSize: 11.5, color: flColor.gray600 },
  previewCount: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze400 },
  previewDivider: { height: 1, marginHorizontal: 8, backgroundColor: flColor.bronzeBorderSubtle },

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

  // closing
  closing: { marginTop: 46, paddingHorizontal: 24, paddingBottom: 12, alignItems: 'center', gap: 15 },
  closingRule: { flexDirection: 'row', alignItems: 'center', gap: 14, width: 220 },
  closingLine: { flex: 1, height: 1, backgroundColor: flColor.bronzeBorder },
  closingDiamond: { width: 6, height: 6, transform: [{ rotate: '45deg' }], borderWidth: 1, borderColor: flColor.bronze400 },
  closingText: {
    fontFamily: flFont.display,
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    color: flColor.bronze300,
    maxWidth: 264,
  },
});
