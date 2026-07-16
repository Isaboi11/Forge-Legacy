import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { Image } from 'expo-image';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { useProfile } from '@/lib/profile';
import type { Sex } from '@/domain/profile/schema';
import { PLACEHOLDER_RANK, type RankFamily, type RankLevel } from '@/domain/rank-artwork/resolver';
import { resolveRankBadge } from '@/domain/rank-artwork/badge-art';
import { RankSeal } from '@/components/forge/RankSeal';
import { fetchLegacyData } from '@/data/legacy-live';
import { useQuery } from '@/lib/useQuery';
import {
  AccomplishmentCard,
  CompactChapterRow,
  CurrentChapter,
  FeaturedMomentCard,
  HonorInsignia,
  MyStandard,
  SealedChapterCard,
  TimelineRow,
} from '@/components/forge/profile-sections';

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
 * Data (Phase 2): the spine sections — rank · standard · active + sealed chapters · timeline ·
 * featured moment — read LIVE from Supabase via `fetchLegacyData` (`useQuery`). The athlete identity
 * comes from the live `useProfile`. Only four sections remain seeded — photos · accomplishments ·
 * honors · chapter goals — marked in one place (`LEGACY_FIXTURE_PENDING`) because their tables aren't
 * applied yet. So it's always known which half is real.
 *
 * Hero identity (corrected — see FORGE_DELTAS §15): the LEFT slot is the athlete's PROFILE
 * PORTRAIT (a photo, framed by a faint rank-seal ring). No profile-photo system exists yet, so it
 * shows the initials placeholder inside the seal ring — a real photo drops into the same slot when
 * that system lands. The RIGHT slot is the rank badge → Progress Hub: it renders the REAL per-rank
 * badge ARTWORK when a guard-verified clean cutout exists (`resolveRankBadge` — the placeholder rank is
 * `PLACEHOLDER_RANK` = Established III, sex-unspecified → served the clean established-m badge), and
 * falls back to the vector `RankSeal` for any family whose art is a black-box matte (foundation,
 * craftsman, architect, builder) or missing (legend) — so the retired black box can never return.
 *
 * Still pending-asset (NOT fabricated — graceful placeholders): the Honors insignia (Honors is
 * legitimately shown HERE — an achievement context, unlike the workout card where it is reserved —
 * but the honor art was never imported).
 *
 * Deferred to a follow-up sub-phase (noted at the gate): the three bottom sheets
 * (L-11 Honor Detail, L-12 My Standard editor, L-13 Pin manager), the Toast, the
 * scroll-driven artwork fade, and Transformation/Trophy counts (no data). Taps to
 * unbuilt destinations are inert, consistent with Home/Workouts.
 */

export default function LegacyScreen() {
  const { profile } = useProfile();
  const { data, error, refetch } = useQuery(fetchLegacyData, []);
  // Scroll-driven hero choreography (the .dc "premium scroll choreography"): the background scrim
  // fades in (ScreenBackground `scrimFade`), the hero parallaxes up + fades, and the portrait scales
  // down from its left edge. All native-driver transform/opacity.
  const [scrollY] = useState(() => new Animated.Value(0));
  const heroTranslateY = scrollY.interpolate({ inputRange: [0, 100], outputRange: [0, -12], extrapolate: 'extend' }); // -y*0.12
  const heroOpacity = scrollY.interpolate({ inputRange: [0, 220], outputRange: [1, 0.1], extrapolate: 'clamp' }); // 1 - p*0.9
  const portraitScale = scrollY.interpolate({ inputRange: [0, 220], outputRange: [1, 0.76], extrapolate: 'clamp' }); // 1 - p*0.24

  // Refetch when the tab regains focus (e.g. returning from a just-logged workout) — the current data
  // stays on screen during the reload, so a background refresh never flashes the spinner.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false; // mount already fetched
        return;
      }
      refetch();
    }, [refetch]),
  );

  // First load only: wait for the live Legacy read + the shared profile, with a retryable error. Once
  // data is in hand it stays rendered through any background refetch.
  if (!data || !profile) {
    return (
      <LegacyShell scrollY={scrollY} avatarName={profile?.name ?? ''}>
        {error ? <LegacyError onRetry={refetch} /> : <ActivityIndicator color={flColor.bronze400} />}
      </LegacyShell>
    );
  }

  const chapter = data.activeChapter;
  const [recentSeal, ...olderSeals] = data.sealedChapters;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacyMountains} overlay={{ flat: 'rgba(5,5,5,0.30)' }} scrimFade scrollY={scrollY} />

      <AppBar
        title="Legacy"
        serif
        avatar={<Avatar name={profile.name} size="appBar" />}
        onAvatar={() => {
          // P-1 Profile / Account — not yet implemented.
        }}
      />

      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        {/* ── HERO · identity ── parallaxes up + fades; portrait scales from its left edge (.dc) */}
        <Animated.View style={[styles.identityRow, { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] }]}>
          <Animated.View style={{ transformOrigin: 'left center', transform: [{ scale: portraitScale }] }}>
            <SealPortrait name={profile.name} />
          </Animated.View>
          <View style={styles.identityText}>
            <Text style={styles.athleteName} numberOfLines={1}>
              {profile.name}
            </Text>
            <RankLabel label={data.rankName} sub={data.rankSubTier} />
            <Text style={styles.identitySub}>Forging a permanent record, one chapter at a time.</Text>
          </View>
          <ProgressBadge
            rankFamily={PLACEHOLDER_RANK.family}
            rankLevel={PLACEHOLDER_RANK.level}
            sex={profile.sex}
            onPress={() => {
              // P-2 Progress Hub — not yet implemented.
            }}
          />
        </Animated.View>

        {/* My Standard — the creed (editable-inert: L-12 editor not yet implemented) */}
        <MyStandard standard={data.standard} onEdit={() => {}} />

        {/* What I'm Building — current chapter + primary goal */}
        {chapter ? <CurrentChapter chapter={chapter} dayCount={data.dayCount} onOpen={() => {}} /> : null}

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
      </Animated.ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local presentational pieces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The Legacy chrome (background + AppBar) with a centered status slot — reused for the loading and
 * error states so a slow/failed fetch still shows the framed screen, not a blank flash.
 */
function LegacyShell({
  scrollY,
  avatarName,
  children,
}: {
  scrollY: Animated.Value;
  avatarName: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacyMountains} overlay={{ flat: 'rgba(5,5,5,0.30)' }} scrimFade scrollY={scrollY} />
      <AppBar title="Legacy" serif avatar={<Avatar name={avatarName} size="appBar" />} onAvatar={() => {}} />
      <View style={styles.statusWrap}>{children}</View>
    </View>
  );
}

function LegacyError({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <Text style={styles.statusText}>Couldn&apos;t load your Legacy.</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry" style={styles.retryBtn}>
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </>
  );
}

/**
 * Hero PROFILE PORTRAIT — the athlete's photo, framed by a faint rank-seal ring. No profile-photo
 * system exists yet, so it shows the initials placeholder (the sanctioned identity mark, per
 * FORGE_DELTAS §10) inside the seal ring; a real photo drops into this same slot when that system
 * lands. The rank BADGE lives in the right FoundationBadge slot (ProgressBadge) — never here.
 */
function SealPortrait({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={styles.portraitWrap}>
      {/* decorative rank-seal ring framing the portrait (faint geometric, not a fabricated badge) */}
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

/**
 * The rank badge — the FoundationBadge slot — with the "Progress" pill → Progress Hub.
 *
 * Renders the REAL per-rank badge ARTWORK when a guard-verified clean cutout exists for the tier
 * (`resolveRankBadge` — currently the Established + Legacy families), else falls back to the vector
 * `RankSeal`. Foundation/craftsman/architect/builder art is an alpha-flattened black box and legend art
 * is missing, so those families are absent from the registry and take the vector fallback — which makes
 * the retired black box structurally impossible to reach. No rank ⇒ faint pending-asset shield.
 */
function ProgressBadge({ rankFamily, rankLevel, sex, onPress }: { rankFamily?: RankFamily; rankLevel?: RankLevel; sex?: Sex; onPress: () => void }) {
  const level = rankLevel ?? 1;
  const badge = rankFamily ? resolveRankBadge({ family: rankFamily, level, sex }) : null;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="View your rank and progress" style={styles.progressBadge}>
      <View style={styles.badgeShield}>
        {badge != null ? (
          <Image source={badge} style={styles.badgeArt} contentFit="contain" />
        ) : rankFamily ? (
          <RankSeal family={rankFamily} level={level} size={68} />
        ) : (
          <Svg width={38} height={52} viewBox="0 0 38 52">
            <Path d="M4 6 L34 6 L34 30 Q34 44 19 50 Q4 44 4 30 Z" stroke={flColor.bronze400} strokeWidth={1.2} opacity={0.4} fill="none" />
            <Path d="M11 3 L13 9 L19 3 L25 9 L27 3" stroke={flColor.bronze400} strokeWidth={1} opacity={0.3} fill="none" strokeLinejoin="miter" />
          </Svg>
        )}
      </View>
      <View style={styles.progressPill}>
        <Text style={styles.progressPillText}>Progress</Text>
        <ChevronRightIcon size={9} color={flColor.bronze300} />
      </View>
    </Pressable>
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

// ── inline glyphs ──
function PlusIcon({ color = flColor.bronze400 }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 44 },

  // loading / error status slot
  statusWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  statusText: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 15, textAlign: 'center' },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronze400 },
  retryText: { color: flColor.bronze400, fontFamily: flFont.sans, fontSize: 14, fontWeight: '600' },

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
  badgeShield: { width: 66, height: 92, alignItems: 'center', justifyContent: 'center' },
  badgeArt: { width: 66, height: 92 },
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

  // my story
  storyStack: { gap: 12 },
  timelineBlock: { paddingTop: 16 },
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
