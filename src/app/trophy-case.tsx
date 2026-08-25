import { useMemo, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';
import {
  chipMeta,
  eventLabel,
  fetchTrophyCase,
  fieldLine,
  marginLine,
  monthYear,
  scoreLine,
  tierLabel,
  tierOf,
  yearSpan,
  type TrophyFinish,
  type TrophyTier,
} from '@/data/trophy-case-live';
import { metricLabel } from '@/data/challenges-live';
import { useQuery } from '@/lib/useQuery';

/**
 * Trophy Case — one athlete's championships and podium finishes.
 * Built to `Forge Trophy Case.dc.html`.
 *
 * MIGRATION 0084 (`athlete_trophy_case`). The screen needs three things `challenge_hub()` cannot give:
 * the winning margin on a championship tile (which requires reading other athletes' final scores), the
 * record of an athlete who is not you, and the consecutive-title streak. See the migration header.
 *
 * ── DELTAS VS THE `.dc` ──────────────────────────────────────────────────────
 *
 * DROPPED-FREE (the design's own bugs, fixed here at no cost):
 *
 *  1. NINE TROPHIES, ONE DESTINATION. Every tile and chip called the same `goResults()`, which hard-
 *     navigates to Challenge Results without writing a payload — so tapping "Winter Volume War" and
 *     tapping "Iron Open" both showed whatever the last screen happened to leave in the store. The
 *     footnote promises "tap any trophy to revisit the final standings"; here each one routes by its own
 *     challenge id, so the promise is kept.
 *
 *  2. "4 SEASONS" vs "5 SEASONS". The subline said four, the streak said five, 200px apart, both
 *     hardcoded. The subline is now the years the athlete has actually competed, and the streak is a run
 *     of consecutive titles counted from the ordered result history.
 *
 *  3. `totalEntered = 12` WAS INVENTED. Nine results existed, so Competitions and Win Rate were both
 *     built on a number with no source. Every figure here is counted.
 *
 *  4. `NaN%`. `Math.round(0 / 0 * 100)` is what a new athlete's Win Rate cell rendered. Win Rate only
 *     appears once there is a title to rate.
 *
 *  5. `bestEvent` AND `streak` WERE STRING LITERALS. Both are derived — best event is the metric they
 *     have won most, then placed most.
 *
 *  6. FOCUSABLE BUT NOT ACTIVATABLE. Every tile and chip carried `role="button" tabindex="0"` with no
 *     key handler, so a keyboard user could focus nine cards and activate none. `Pressable` with a role
 *     and a label is activatable on every platform.
 *
 * DEFERRED-HONEST (deliberately not built):
 *
 *  7. NO ENTRANCE ANIMATION, matching the design — this is the one screen in the set that has none, and
 *     a trophy case that assembles itself on every visit would undercut the permanence.
 *
 *  8. NO SHARE. Nothing else in the app shares a screenshot of a record yet; adding the first one here
 *     would be inventing a sharing model rather than following one.
 *
 * ADDED (the design has no answer and the app needs one):
 *
 *  9. AN EMPTY STATE. A new athlete got a 0/0/0 tally, a `NaN%` career grid and two empty grids under
 *     live headers. Zeros are not a neutral read of "you haven't started" (CC-D3), so nothing that
 *     counts down from an achievement is drawn until there is something to count: the tally appears with
 *     the first podium, Championships and Win Rate with the first title.
 *
 * 10. WITHHELD FINISHES. The design is single-athlete and never asks what a visitor may see. Totals here
 *     are true, detail is gated per competition, and the difference is stated rather than silently
 *     shortening the record. See the migration header.
 *
 * 11. A LINK TO COMPETITION HISTORY. The two screens overlap heavily and the design acknowledges neither.
 *     History holds every finish, podium or not, and already has the filtering this screen doesn't need.
 *
 * Faithful: the non-scrolling header carrying identity, engraved "Competitive Legacy" rule and medal
 * tally; the hairline-gap career grid; the bronze-lit championship tiles with their recessed emblem and
 * restrained glow; the lighter ring-only podium chips; and the legend footnote.
 */

/**
 * Medal semantics. Gold is the brand bronze — a Forge championship is lit in the app's own metal. Silver
 * and 3rd-place bronze have no token because the foundation has no such colours; they are named here
 * rather than inlined so the two places each is used cannot drift apart.
 */
const TIER: Record<TrophyTier, { accent: string; ring: string; emblem: readonly [string, string]; glyph: string; glow: string }> = {
  gold: {
    accent: flColor.bronze300,
    ring: flColor.bronze400,
    emblem: ['#453322', '#1a140e'],
    glyph: flColor.onBronze,
    glow: 'rgba(186, 134, 84,0.24)',
  },
  silver: {
    accent: '#C7CAD0',
    ring: 'rgba(199,202,208,0.5)',
    emblem: ['#3e434a', '#1e2125'],
    glyph: '#C7CAD0',
    glow: 'rgba(199,202,208,0.10)',
  },
  bronze: {
    accent: '#C08354',
    ring: 'rgba(176,124,78,0.55)',
    emblem: ['#4a3524', '#211913'],
    glyph: '#C08354',
    glow: 'rgba(176,124,78,0.12)',
  },
};

export default function TrophyCaseScreen() {
  const router = useRouter();
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const { athlete } = useLocalSearchParams<{ athlete?: string }>();
  const athleteId = typeof athlete === 'string' && athlete.length > 0 ? athlete : null;

  const { data, loading, error, refetch } = useQuery(() => fetchTrophyCase(athleteId), [athleteId]);

  const goBack = () => {
    if (router.canGoBack()) return router.back();
    return athleteId ? router.replace({ pathname: '/athlete/[id]', params: { id: athleteId } }) : router.replace('/(tabs)/legacy');
  };

  const champions = useMemo(() => (data?.finishes ?? []).filter((f) => f.isWinner), [data]);
  const podiums = useMemo(() => (data?.finishes ?? []).filter((f) => !f.isWinner), [data]);

  /**
   * Cells are built rather than fixed at four, so the grid can never contain a figure that only reads as
   * an absence. Championships and Win Rate arrive together with the first title; both are omitted before
   * it, which also means the grid is always 1 or 2 per row and never leaves a hole.
   */
  const career = useMemo(() => {
    if (!data) return [];
    const cells: { key: string; value: string; label: string }[] = [
      { key: 'entered', value: String(data.entered), label: data.entered === 1 ? 'Competition' : 'Competitions' },
    ];
    if (data.championships > 0) {
      cells.push({ key: 'titles', value: String(data.championships), label: data.championships === 1 ? 'Championship' : 'Championships' });
    }
    if (data.podiums > 0) {
      cells.push({ key: 'podiums', value: String(data.podiums), label: data.podiums === 1 ? 'Podium' : 'Podiums' });
    }
    if (data.championships > 0 && data.entered > 0) {
      cells.push({ key: 'rate', value: `${Math.round((data.championships / data.entered) * 100)}%`, label: 'Win Rate' });
    }
    return cells;
  }, [data]);

  const open = (f: TrophyFinish) => router.push({ pathname: '/challenge-results/[id]', params: { id: f.challengeId } });

  if (loading && !data) {
    return (
      <Shell onBack={goBack}>
        <ActivityIndicator color={flColor.bronze400} />
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell onBack={goBack}>
        <Text style={styles.missingTitle}>Couldn’t load the trophy case.</Text>
        <Text style={styles.missingBody}>{error}</Text>
        <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Try again" style={styles.outlineBtn}>
          <Text style={styles.outlineBtnLabel}>Try Again</Text>
        </Pressable>
      </Shell>
    );
  }

  /* Null means the athlete's record isn't this viewer's to read (their Training Stats audience). There is
     no "this is private" placeholder — a hidden section is silent, the same as on the profile. */
  if (!data) {
    return (
      <Shell onBack={goBack}>
        <Text style={styles.missingTitle}>Not available</Text>
        <Text style={styles.missingBody}>This athlete’s competitive record isn’t shared with you.</Text>
      </Shell>
    );
  }

  const span = yearSpan(data.firstYear, data.lastYear);
  const subline = [
    data.podiums > 0 ? `${data.podiums} ${data.podiums === 1 ? 'podium' : 'podiums'}` : null,
    span,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.34)' }} />

      {/* Identity and the tally never scroll away — the case is titled by whose it is. */}
      <View style={styles.header}>
        {/* Opaque at the top, translucent at the bottom — scrolled content dissolves under the tally
            rather than stopping at a hard edge. */}
        <LinearGradient colors={['#0a0b0c', 'rgba(10,11,12,0.85)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <AppBar title={<Text style={styles.barTitle}>Trophy Case</Text>} onBack={goBack} transparent />

        <View style={styles.identity}>
          <Avatar src={data.avatarUrl ?? undefined} name={data.name} size={46} ring />
          <View style={styles.identityText}>
            <Text style={styles.identityName} numberOfLines={1}>
              {data.name}
            </Text>
            {data.handle ? <Text style={styles.identityHandle}>@{data.handle}</Text> : null}
          </View>
        </View>

        <View style={styles.sublineRow}>
          <Text style={styles.sublineLabel}>Competitive Legacy</Text>
          <View style={styles.sublineRule} />
          {subline ? <Text style={styles.sublineValue}>{subline}</Text> : null}
        </View>

        {/* Only once there is something to tally — three zeroes are not a neutral read (CC-D3). */}
        {data.podiums > 0 ? (
          <TourAnchor id="trophy-medals" style={styles.tally}>
            <TallyCell tier="gold" count={data.championships} label="Gold" divided />
            <TallyCell tier="silver" count={data.silvers} label="Silver" divided />
            <TallyCell tier="bronze" count={data.bronzes} label="Bronze" />
          </TourAnchor>
        ) : null}
      </View>

      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Career Record ── */}
        <TourAnchor id="trophy-record">
          <Text style={styles.sectionLabel}>Career Record</Text>
        </TourAnchor>
        {data.entered === 0 ? (
          <View style={styles.emptyBlock}>
            <View style={styles.emptyCrest}>
              <SwordsGlyph size={26} />
            </View>
            <Text style={styles.emptyTitle}>{data.isSelf ? 'No competitions yet' : 'Nothing here yet'}</Text>
            <Text style={styles.emptyBody}>
              {data.isSelf
                ? 'Every championship and podium finish you earn is kept here for good.'
                : 'They haven’t finished a competition yet.'}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.careerGrid}>
              {career.map((c) => (
                <View key={c.key} style={[styles.careerCell, career.length === 1 ? styles.careerCellWide : null]}>
                  <Text style={styles.careerValue}>{c.value}</Text>
                  <Text style={styles.careerLabel}>{c.label}</Text>
                </View>
              ))}
            </View>

            {data.bestType || data.titleStreak >= 2 ? (
              <View style={styles.footnoteRow}>
                {data.bestType ? (
                  <Text style={styles.footnote}>
                    Best event <Text style={styles.footnoteValue}>{eventLabel(data.bestType)}</Text>
                  </Text>
                ) : null}
                {/* A run of one title is not a streak, and "0" would be a taunt. */}
                {data.titleStreak >= 2 ? (
                  <Text style={styles.footnote}>
                    Longest streak <Text style={styles.footnoteValue}>{data.titleStreak} titles</Text>
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        )}

        {/* ── Championships ── */}
        {champions.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>Championships</Text>
            <View style={styles.tileGrid}>
              {champions.map((f) => (
                <ChampionTile key={f.challengeId} finish={f} onPress={() => open(f)} />
              ))}
            </View>
          </>
        ) : null}

        {/* ── Podium Finishes ── */}
        {podiums.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>Podium Finishes</Text>
            <View style={styles.chipStack}>
              {podiums.map((f) => (
                <PodiumChip key={f.challengeId} finish={f} onPress={() => open(f)} />
              ))}
            </View>
          </>
        ) : null}

        {/* Cleared for the record but not for every competition in it. The counts above are still true. */}
        {data.withheld > 0 ? (
          <Text style={styles.withheld}>
            {data.withheld} {data.withheld === 1 ? 'finish is' : 'finishes are'} in competitions you can’t see.
          </Text>
        ) : null}

        {data.finishes.length > 0 ? (
          <Text style={styles.legend}>
            Gold crowns are championships. Silver and bronze mark podium finishes. Tap any trophy to revisit the final standings.
          </Text>
        ) : null}

        {/* Every finish, podium or not — the screen this one deliberately doesn't duplicate. */}
        {data.isSelf && data.entered > 0 ? (
          <Pressable
            onPress={() => router.push('/competition-history')}
            accessibilityRole="button"
            accessibilityLabel="View full competition history"
            style={({ pressed }) => [styles.historyRow, pressed ? styles.pressed : null]}
          >
            <Text style={styles.historyLabel}>Full Competition History</Text>
            <ChevronGlyph />
          </Pressable>
        ) : null}
      </ScrollView>

      <ScreenTour screenKey="trophy-case" />
    </View>
  );
}

function TallyCell({ tier, count, label, divided = false }: { tier: TrophyTier; count: number; label: string; divided?: boolean }) {
  const t = TIER[tier];
  return (
    <View style={[styles.tallyCell, divided ? styles.tallyDivided : null]}>
      {tier === 'gold' ? <CrownGlyph size={15} color={flColor.bronze300} /> : <MedalGlyph size={16} color={t.glyph} />}
      <Text style={[styles.tallyCount, { color: t.accent }]}>{count}</Text>
      <Text style={styles.tallyLabel}>{label}</Text>
    </View>
  );
}

function ChampionTile({ finish: f, onPress }: { finish: TrophyFinish; onPress: () => void }) {
  const margin = marginLine(f);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${f.name}, ${tierLabel(f)}, ${fieldLine(f)}, ${monthYear(f.endAt)}`}
      style={({ pressed }) => [styles.tile, pressed ? styles.tilePressed : null]}
    >
      {/* Bronze light pooling at the top edge, the way it falls on every other forged surface. */}
      <LinearGradient
        colors={['rgba(186, 134, 84,0.14)', 'rgba(186, 134, 84,0.02)']}
        locations={[0, 0.6]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.emblem, { borderColor: TIER.gold.ring, boxShadow: `inset 0 1px 4px rgba(0,0,0,0.5), 0 0 12px ${TIER.gold.glow}` }]}>
        <LinearGradient
          colors={flGradient.bronzeMetallic.colors}
          locations={flGradient.bronzeMetallic.locations}
          start={flGradient.bronzeMetallic.start}
          end={flGradient.bronzeMetallic.end}
          style={StyleSheet.absoluteFill}
        />
        <CrownGlyph size={24} color={TIER.gold.glyph} />
      </View>

      <Text style={styles.tileName} numberOfLines={2}>
        {f.name}
      </Text>
      <Text style={[styles.tileTier, { color: TIER.gold.accent }]} numberOfLines={1}>
        {tierLabel(f).toUpperCase()} · {fieldLine(f).toUpperCase()}
      </Text>
      <Text style={styles.tileStat} numberOfLines={1}>
        {scoreLine(f)}
        {margin ? ` · ${margin}` : ''}
      </Text>
      <Text style={styles.tileDate}>{monthYear(f.endAt)}</Text>
    </Pressable>
  );
}

function PodiumChip({ finish: f, onPress }: { finish: TrophyFinish; onPress: () => void }) {
  const t = TIER[tierOf(f)];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${f.name}, ${tierLabel(f)}, ${metricLabel(f.type, f.metricKey)}, ${monthYear(f.endAt)}`}
      style={({ pressed }) => [styles.chip, pressed ? styles.pressed : null]}
    >
      <View style={[styles.chipDisc, { borderColor: t.ring }]}>
        <MedalGlyph size={20} color={t.glyph} />
      </View>
      <View style={styles.chipBody}>
        <Text style={styles.chipName} numberOfLines={1}>
          {f.name}
        </Text>
        <Text style={styles.chipMeta} numberOfLines={1}>
          {chipMeta(f)}
        </Text>
      </View>
      <Text style={[styles.chipPlace, { color: t.accent }]}>{tierLabel(f).toUpperCase()}</Text>
    </Pressable>
  );
}

function Shell({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.34)' }} />
      <AppBar title={<Text style={styles.barTitle}>Trophy Case</Text>} onBack={onBack} />
      <View style={styles.center}>{children}</View>
    </View>
  );
}

// ── glyphs ──
function CrownGlyph({ size = 16, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function MedalGlyph({ size = 16, color = flColor.gray400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={14.5} r={4.8} />
      <Circle cx={12} cy={14.5} r={1.8} />
      <Path d="M8.8 10.4L6 4h4l2 3.2L14 4h4l-2.8 6.4" />
    </Svg>
  );
}
function SwordsGlyph({ size = 26, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.5 14.5L21 21M19 3l-9 9M5 3l9 9M9.5 14.5L3 21" />
    </Svg>
  );
}
function ChevronGlyph({ size = 15, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.88 },

  header: { flexShrink: 0, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700, paddingBottom: 4, zIndex: 6 },
  barTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.cream100 },

  identity: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 22, paddingTop: 2, paddingBottom: 13 },
  identityText: { flex: 1, minWidth: 0 },
  identityName: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', letterSpacing: -0.3, color: flColor.cream100 },
  identityHandle: { marginTop: 2, fontSize: 11.5, color: flColor.gray600 },

  /* Label · engraved rule · value — the rule fills whatever the two ends leave. */
  sublineRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 22, paddingBottom: 15 },
  sublineLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.7, textTransform: 'uppercase', color: flColor.bronze400 },
  sublineRule: { flex: 1, height: 1, backgroundColor: flColor.charcoal700 },
  sublineValue: { fontSize: 10.5, color: flColor.gray600 },

  tally: { flexDirection: 'row', marginHorizontal: 22, marginBottom: 16, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, overflow: 'hidden' },
  tallyCell: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 12, paddingHorizontal: 6 },
  tallyDivided: { borderRightWidth: 1, borderRightColor: flColor.charcoal700 },
  tallyCount: { fontFamily: flFont.display, fontSize: 21, fontWeight: '700', lineHeight: 22, fontVariant: ['tabular-nums'] },
  tallyLabel: { fontSize: 8.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },

  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 40 },
  sectionLabel: { paddingHorizontal: 2, paddingBottom: 12, fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  sectionLabelGap: { paddingTop: 24 },

  /* 1px gaps over a charcoal ground read as engraved hairlines between the cells. */
  careerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal700, overflow: 'hidden' },
  careerCell: { flexGrow: 1, flexBasis: '46%', flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 15, paddingVertical: 13, backgroundColor: flColor.charcoal800 },
  careerCellWide: { flexBasis: '100%' },
  careerValue: { fontFamily: flFont.display, fontSize: 23, fontWeight: '700', letterSpacing: -0.5, lineHeight: 24, color: flColor.cream100, fontVariant: ['tabular-nums'] },
  careerLabel: { fontSize: 11, fontWeight: '600', color: flColor.gray600 },

  footnoteRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18, marginTop: 9, paddingHorizontal: 4 },
  footnote: { fontSize: 11, color: flColor.gray600 },
  footnoteValue: { fontWeight: '600', color: flColor.gray400 },

  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  tile: { flexBasis: '48%', maxWidth: '48%', minWidth: 0, alignItems: 'center', overflow: 'hidden', borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, boxShadow: `${flShadow.borderInset}, ${flShadow.card}`, paddingTop: 18, paddingHorizontal: 12, paddingBottom: 15 },
  tilePressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  emblem: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: flRadius.round, borderWidth: 1 },
  tileName: { marginTop: 12, fontFamily: flFont.display, fontSize: 14.5, fontWeight: '600', letterSpacing: -0.1, lineHeight: 17.4, textAlign: 'center', color: flColor.cream100 },
  tileTier: { marginTop: 7, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textAlign: 'center' },
  tileStat: { marginTop: 6, fontSize: 11, fontWeight: '600', textAlign: 'center', color: flColor.gray400 },
  tileDate: { marginTop: 3, fontSize: 10, color: flColor.gray600 },

  chipStack: { gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 11, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  /* Ring only — no fill, no glow. A podium finish is lit less than a title on purpose. */
  chipDisc: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1 },
  chipBody: { flex: 1, minWidth: 0 },
  chipName: { fontSize: 13, fontWeight: '600', color: flColor.cream100 },
  chipMeta: { marginTop: 2, fontSize: 10.5, color: flColor.gray600 },
  chipPlace: { flexShrink: 0, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },

  withheld: { marginTop: 18, marginHorizontal: 4, fontSize: 11, lineHeight: 17, color: flColor.gray600 },
  legend: { marginTop: 18, marginHorizontal: 4, fontSize: 11, lineHeight: 17, color: flColor.gray600 },

  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 22, paddingHorizontal: 15, paddingVertical: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal800 },
  historyLabel: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },

  emptyBlock: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 20 },
  emptyCrest: { width: 66, height: 66, marginBottom: 14, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  emptyTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { marginTop: 6, fontSize: 12.5, lineHeight: 19, textAlign: 'center', color: flColor.gray600 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 4 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },
  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
