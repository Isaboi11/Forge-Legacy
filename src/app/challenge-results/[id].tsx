import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { CrownArt } from '@/components/forge/compositions/CrownArt';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import {
  CHALLENGE_TYPES,
  fetchChallengeResults,
  finishLabel,
  formatScore,
  metricLabel,
  ordinal,
  seasonDays,
  type ChallengeBadge,
  type ChallengeResultsDetail,
  type ChallengeType,
  type FinalStanding,
} from '@/data/challenges-live';
import { useQuery } from '@/lib/useQuery';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';

/**
 * Challenge Results (C-4) — the permanent record of a finished season. Built to
 * `Forge Challenge Results.dc.html` under `Challenge-Results-Wireframe-Spec-C4` v1.1.
 *
 * The design's cinematics are all here: the settled crown, the breathing bronze halo on the champion
 * card, the rising hero, the seal pop on a badge. What is not here is the design's data, because
 * essentially none of it was real — `FINAL` is a hardcoded five-athlete array, and the "logic layer" is
 * a seeded PRNG that invents scores, hours, PR counts and narrative sub-lines from a hash of the
 * challenge name. Everything on this screen is now read from `challenge_results`.
 *
 * READ FROM THE FROZEN TABLE, NOT RECOMPUTED. C-3 scores live; C-4 must not. CS-D17 and spec §8 make
 * the result immutable — a workout backfilled into a closed season next month cannot move these
 * standings. That is why this screen calls `challenge_results_detail` rather than reusing C-3's read.
 *
 * FIVE THINGS THE SPEC REQUIRED AND THE DESIGN DID NOT DO:
 *   · Co-winners (CS-D15 / §4). The design renders `FINAL[0]` — exactly one champion, always. A tie at
 *     the top would have quietly erased a co-champion from their own win. The spotlight takes an array.
 *   · Full standings (§5). The design shows the top 5, and if you placed lower it swaps in your row —
 *     so a 12th-of-38 finish renders in the 5th slot with no visual break. Its own notes flag this as
 *     misleading. Every athlete is listed.
 *   · No manufactured loser (CC-D3 / §5). The design's two-athlete case labels your row "Lost the duel".
 *     Placements are stated as placements: "2nd of 2".
 *   · (Longest Streak was withheld under §6.3's Firewall bar, then RESTORED by a PD-7 ruling — see
 *     `Challenge-Architecture-Amendment-007`. It is computed from the season's own window: the longest run
 *     of consecutive days with at least one session, in the challenge's timezone. An earlier note claimed
 *     streaks were untrackable; that holds for an ALL-TIME squad record, not for a bounded season.)
 *   · No fabricated statistics. "PRs set" was `3 + hash(name) % 16`; "Honors earned" was `min(3, field)`.
 *     PRs are counted for real. The honors tile is replaced with athlete-days, which can be counted.
 *
 * THE HONOR ROW IS DELIBERATELY ABSENT. The design renders "HONOR EARNED · Forge League — Silver ·
 * Added to your Legacy · tap to view" and navigates to Honor Engraved. Our Honors backend does not
 * exist — no HonorInstance, no ChallengeEvaluator (`Honor-Catalog-Amendment-001`), and the Honors screen
 * is a stub — so that row would promise a record the app cannot show. Spec §9.7 anticipates exactly
 * this state and calls for a generic note instead of blocking. What ships is the one claim that is true
 * today: the result is permanent and stays in your competition history.
 *
 * ALSO DEFERRED: the "Hall of Champions ›" link (§7) — C-5 isn't built.
 */

/** What the field's aggregate is called, per metric. The design hardcoded "Workouts logged". */
const TOTAL_LABEL: Record<ChallengeType, string> = {
  MOST_WORKOUTS: 'Workouts logged',
  MOST_VOLUME: 'Lbs moved',
  MAX_LIFT: 'Lbs, best lift',
  MOST_DURATION: 'Hours trained',
  MOST_PRS: 'PRs counted',
  DISTANCE_TOTAL: 'Miles covered',
  MOST_DAYS: 'Days trained',
  MOST_REPS: 'Reps performed',
  EARLY_BIRD: 'Dawn sessions',
  MOST_VARIETY: 'Exercises used',
  GAIN_MAX_LIFT: 'Lbs, best gain',
  GAIN_VOLUME: 'Lbs gained',
  GAIN_REPS: 'Reps gained',
  GAIN_DISTANCE: 'Miles gained',
};

export default function ChallengeResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challengeId = String(id ?? '');
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery(() => fetchChallengeResults(challengeId), [challengeId]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/competitions'));

  if (loading && !data) {
    return (
      <Shell onBack={goBack}>
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell onBack={goBack}>
        <View style={styles.center}>
          <Text style={styles.missingTitle}>{error ? 'Couldn’t load these results.' : 'This season hasn’t closed yet.'}</Text>
          {error ? <Text style={styles.missingBody}>{error}</Text> : null}
          <Pressable onPress={error ? refetch : goBack} accessibilityRole="button" accessibilityLabel={error ? 'Try again' : 'Back'} style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>{error ? 'Try Again' : 'Back'}</Text>
          </Pressable>
        </View>
      </Shell>
    );
  }

  return (
    <Shell onBack={goBack}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Hero result={data} />
        <ChampionSpotlight result={data} />
        <YourResult result={data} />
        <SeasonSummary result={data} />
        <FinalStandings result={data} onAthlete={(userId) => router.push({ pathname: '/athlete/[id]', params: { id: userId } })} />
        <Recognition result={data} />
        <Closing result={data} onBack={goBack} />
      </ScrollView>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Hero({ result: r }: { result: ChallengeResultsDetail }) {
  const [rise] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = Animated.timing(rise, { toValue: 1, duration: 460, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [rise]);

  const closed = new Date(r.endAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View style={styles.hero}>
      <LinearGradient colors={['rgba(6,7,9,0.97)', 'rgba(6,7,9,0.72)', 'transparent'] as const} locations={[0, 0.54, 0.84] as const} start={{ x: 0.5, y: 0.1 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />

      <View style={styles.crownWrap}>
        <CrownArt opacity={1} duration={1000} shimmer={false} />
      </View>

      <Animated.View
        style={[
          styles.heroContent,
          { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
        ]}
      >
        <View style={styles.closedPill}>
          <Text style={styles.closedPillText}>Season Closed</Text>
        </View>
        <Text style={styles.heroName} numberOfLines={3}>
          {r.name}
        </Text>
        <Text style={styles.heroSeason}>
          {seasonDays(r.startAt, r.endAt)}-day season · Closed {closed}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * The winner, or all of them. CS-D15 gives co-winners "shared victory ... each co-winner receives full
 * credit — never fractional", so a tie renders every champion at equal size rather than picking one.
 */
function ChampionSpotlight({ result: r }: { result: ChallengeResultsDetail }) {
  const [glow] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [glow]);

  if (r.winners.length === 0) return null;
  const many = r.winners.length > 1;
  const meta = CHALLENGE_TYPES[r.type];
  const runnerUp = r.standings.find((s) => !s.isWinner);
  const top = r.winners[0];

  return (
    <View style={styles.champCard}>
      <LinearGradient colors={['rgba(186, 134, 84,0.16)', 'rgba(186, 134, 84,0.03)'] as const} locations={[0, 0.62] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* The design's crGlow breathes a box-shadow; RN can't drive that natively, so an overlay does. */}
      <Animated.View pointerEvents="none" style={[styles.champGlow, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] }) }]} />

      <Text style={styles.champLabel}>{many ? `Co-Champions · ${r.winners.length}` : 'Season Champion'}</Text>

      <View style={[styles.champAvatars, many ? styles.champAvatarsMany : null]}>
        {r.winners.map((w) => (
          <View key={w.userId} style={styles.champAvatarWrap}>
            <View style={styles.champCrown}>
              <CrownGlyph size={many ? 28 : 40} />
            </View>
            <View style={[styles.champRing, many ? styles.champRingSmall : null]}>
              <Avatar src={w.avatarUrl ?? undefined} name={w.name} size={many ? 68 : 92} />
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.champName} numberOfLines={2}>
        {r.winners.map((w) => w.name).join(' & ')}
      </Text>

      <View style={styles.champScoreRow}>
        <Text style={styles.champScore}>{formatScore(r.type, top.score)}</Text>
        <Text style={styles.champUnit}>{meta.unit}</Text>
      </View>

      {/* Stated as a margin over the next finisher — never as anyone's shortfall. */}
      {!many && runnerUp && top.score > runnerUp.score ? (
        <Text style={styles.champMargin}>
          Finished {formatScore(r.type, top.score - runnerUp.score)} {meta.unit} ahead of {runnerUp.name}
        </Text>
      ) : many ? (
        <Text style={styles.champMargin}>Level at the close — the season is shared.</Text>
      ) : null}
    </View>
  );
}

function YourResult({ result: r }: { result: ChallengeResultsDetail }) {
  const self = r.standings.find((s) => s.isSelf);
  // §9.5: a squadmate who didn't join sees the standings and no "you didn't join" note.
  if (!self) return null;

  const meta = CHALLENGE_TYPES[r.type];
  const label = finishLabel(self.place, self.isWinner, r.winners.length);
  const behindMe = r.standings.filter((s) => s.score < self.score).length;

  return (
    <View style={styles.yourCard}>
      <View style={styles.markWell}>
        <View style={styles.markDisc} />
        <PlaceMark place={self.place} isWinner={self.isWinner} />
      </View>

      <View style={styles.markRule} />

      <View style={styles.yourBody}>
        <View style={styles.yourHead}>
          <Text style={styles.yourLabel}>{label}</Text>
          <Text style={styles.yourPlace}>
            {ordinal(self.place, self.tied)} of {r.field}
          </Text>
        </View>
        <Text style={styles.yourDetail}>
          You logged {formatScore(r.type, self.score)} {meta.unit} across the season
          {behindMe > 0 ? `, finishing ahead of ${behindMe} ${behindMe === 1 ? 'athlete' : 'athletes'}.` : '.'}
        </Text>
      </View>
    </View>
  );
}

function SeasonSummary({ result: r }: { result: ChallengeResultsDetail }) {
  const tiles = [
    { key: 'total', glyph: <DumbbellGlyph size={20} />, value: formatScore(r.type, r.summary.total), label: TOTAL_LABEL[r.type] },
    { key: 'field', glyph: <SquadGlyph size={20} />, value: String(r.summary.athletes), label: r.summary.athletes === 1 ? 'Athlete competed' : 'Athletes competed' },
    { key: 'prs', glyph: <SparkGlyph size={20} />, value: String(r.summary.prs), label: r.summary.prs === 1 ? 'PR set' : 'PRs set' },
    { key: 'days', glyph: <CalendarGlyph size={20} />, value: String(r.summary.athleteDays), label: 'Days trained' },
  ];

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHead}>
        <Text style={styles.sectionLabelInline}>Season Summary</Text>
      </View>
      <View style={styles.summaryGrid}>
        {tiles.map((t) => (
          <View key={t.key} style={styles.summaryTile}>
            <View style={styles.summaryIcon}>{t.glyph}</View>
            <View style={styles.summaryText}>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {t.value}
              </Text>
              <Text style={styles.summaryLabel} numberOfLines={2}>
                {t.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.summaryFoot}>
        <CalendarGlyph size={15} color={flColor.gray600} />
        <Text style={styles.summaryFootText} numberOfLines={2}>
          {seasonDays(r.startAt, r.endAt)}-day season · {metricLabel(r.type, r.metricKey)}
          {r.squadName ? ` · ${r.squadName}` : ''}
        </Text>
      </View>
    </View>
  );
}

/** §5: every non-withdrawn participant, ranked. No truncation — the design's top-5 cut misleads. */
function FinalStandings({ result: r, onAthlete }: { result: ChallengeResultsDetail; onAthlete: (userId: string) => void }) {
  const meta = CHALLENGE_TYPES[r.type];

  return (
    <>
      <View style={styles.standHead}>
        <Text style={styles.sectionLabelInline}>Final Standings</Text>
        <Text style={styles.standMeta}>
          {r.field} {r.field === 1 ? 'Competitor' : 'Competitors'}
        </Text>
      </View>

      {r.standings.length === 0 ? (
        <View style={styles.dashedEmpty}>
          <Text style={styles.dashedText}>This season closed without a recorded field.</Text>
        </View>
      ) : (
        <View style={styles.standList}>
          {r.standings.map((s) => (
            <StandingRow key={s.userId} standing={s} type={r.type} unit={meta.unit} onPress={() => onAthlete(s.userId)} />
          ))}
        </View>
      )}
    </>
  );
}

function StandingRow({ standing: s, type, unit, onPress }: { standing: FinalStanding; type: ChallengeType; unit: string; onPress: () => void }) {
  const podium = s.place <= 3;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${ordinal(s.place, s.tied)}, ${s.name}, ${formatScore(type, s.score)} ${unit}. Double-tap for profile.`}
      style={({ pressed }) => [
        styles.standRow,
        s.isWinner ? styles.standRowWinner : podium ? styles.standRowPodium : null,
        s.isSelf ? styles.standRowSelf : null,
        pressed ? styles.standRowPressed : null,
      ]}
    >
      {podium ? (
        <LinearGradient
          colors={s.isWinner ? (['rgba(186, 134, 84,0.10)', 'rgba(186, 134, 84,0.02)'] as const) : (['rgba(186, 134, 84,0.05)', 'transparent'] as const)}
          locations={[0, s.isWinner ? 1 : 0.6] as const}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <View style={styles.rankSlot}>
        {s.isWinner ? (
          <CrownGlyph size={17} />
        ) : s.place === 2 ? (
          <MedalGlyph size={20} color={MEDAL_SILVER} />
        ) : s.place === 3 ? (
          <MedalGlyph size={20} color={MEDAL_COPPER} />
        ) : (
          <Text style={styles.rankNum}>{s.place}</Text>
        )}
      </View>

      <Avatar src={s.avatarUrl ?? undefined} name={s.name} size={40} />

      <View style={styles.standBody}>
        <View style={styles.standNameRow}>
          <Text style={[styles.standName, s.isWinner || s.isSelf ? styles.standNameStrong : null, s.isSelf ? styles.standNameSelf : null]} numberOfLines={1}>
            {s.name}
          </Text>
          {s.isSelf ? (
            <View style={styles.youPill}>
              <Text style={styles.youPillText}>You</Text>
            </View>
          ) : null}
        </View>
        {/* A shared place is stated, not silently ordered. Nothing else annotates a row. */}
        {s.tied ? <Text style={styles.standSub}>Shared {ordinal(s.place)}</Text> : null}
      </View>

      <View style={styles.standScore}>
        <Text style={[styles.standScoreValue, s.isWinner ? styles.standScoreWinner : null]}>{formatScore(type, s.score)}</Text>
        <Text style={styles.standScoreUnit}>{unit}</Text>
      </View>
    </Pressable>
  );
}

/**
 * Derived badges (§6.1 / CC-D4) — computed at read time, positive only, and absent when unearned. All
 * three of the design's Season Moments, Longest Streak included (CA7-D2, PD-7).
 */
function Recognition({ result: r }: { result: ChallengeResultsDetail }) {
  if (r.badges.length === 0) return null;

  return (
    <>
      <Text style={styles.sectionLabel}>Recognition</Text>
      <View style={styles.standList}>
        {r.badges.map((b) => (
          <BadgeRow key={b.kind} badge={b} />
        ))}
      </View>
    </>
  );
}

function BadgeRow({ badge: b }: { badge: ChallengeBadge }) {
  const [seal] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.sequence([Animated.delay(300), Animated.timing(seal, { toValue: 1, duration: 500, useNativeDriver: true })]);
    anim.start();
    return () => anim.stop();
  }, [seal]);

  const title = b.kind === 'MOST_CONSISTENT' ? 'Most Consistent' : b.kind === 'LONGEST_STREAK' ? 'Longest Streak' : 'Biggest Climb';
  const detail =
    b.kind === 'MOST_CONSISTENT'
      ? `${b.value} days trained`
      : b.kind === 'LONGEST_STREAK'
        ? `${b.value} consecutive days`
        : `Up ${b.value} ${b.value === 1 ? 'place' : 'places'} from halfway`;
  return (
    <View style={styles.badgeRow}>
      <Animated.View style={[styles.badgeIcon, { opacity: seal, transform: [{ scale: seal.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
        {b.kind === 'MOST_CONSISTENT' ? <ShieldGlyph size={18} /> : b.kind === 'LONGEST_STREAK' ? <FlameGlyph size={18} /> : <ArrowUpGlyph size={18} />}
      </Animated.View>
      <View style={styles.badgeBody}>
        <Text style={styles.badgeTitle}>{title}</Text>
        <Text style={styles.badgeWho} numberOfLines={1}>
          {b.name}
        </Text>
      </View>
      <Text style={styles.badgeDetail} numberOfLines={2}>
        {detail}
      </Text>
    </View>
  );
}

function FlameGlyph({ size = 18, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z" />
    </Svg>
  );
}

function Closing({ result: r, onBack }: { result: ChallengeResultsDetail; onBack: () => void }) {
  const router = useRouter();

  return (
    <View style={styles.closing}>
      {/* The one permanence claim the app can actually honour today. */}
      <View style={styles.legacyStrip}>
        <BookGlyph size={16} />
        <Text style={styles.legacyText}>
          This result is permanent. It stays in your <Text style={styles.legacyEm}>competition history</Text>.
        </Text>
      </View>

      {r.squadId ? (
        <Pressable
          onPress={() => router.push({ pathname: '/create-challenge', params: { id: r.squadId as string } })}
          accessibilityRole="button"
          accessibilityLabel="Start a new season"
          style={({ pressed }) => [styles.primaryBtn, pressed ? styles.pressed : null]}
        >
          <SwordsGlyph size={17} />
          <Text style={styles.primaryBtnLabel}>Start New Season</Text>
        </Pressable>
      ) : null}

      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={({ pressed }) => [styles.ghostBtn, pressed ? styles.pressed : null]}>
        <Text style={styles.ghostBtnLabel}>{r.squadName ? 'Back to Squad' : 'Back to Competitions'}</Text>
      </Pressable>
    </View>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Final Results" serif onBack={onBack} />
      {children}
    </View>
  );
}

/** 1st gets the crown, 2nd/3rd a medal in steel and copper, everyone else their numeral. */
function PlaceMark({ place, isWinner }: { place: number; isWinner: boolean }) {
  if (isWinner) return <CrownGlyph size={26} />;
  if (place === 2) return <MedalGlyph size={26} color={MEDAL_SILVER} />;
  if (place === 3) return <MedalGlyph size={26} color={MEDAL_COPPER} />;
  return <Text style={styles.markNum}>{place}</Text>;
}

const MEDAL_SILVER = '#C7CAD0';
const MEDAL_COPPER = '#B07C4E';

// ── glyphs ──
function CrownGlyph({ size = 15, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function MedalGlyph({ size = 20, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={14.5} r={4.8} />
      <Circle cx={12} cy={14.5} r={1.8} />
      <Path d="M8.8 10.4L6 4h4l2 3.2L14 4h4l-2.8 6.4" />
    </Svg>
  );
}
function DumbbellGlyph({ size = 20, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
    </Svg>
  );
}
function SquadGlyph({ size = 20, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <Path d="M16 6.5a3 3 0 0 1 0 5.6M17.5 19c0-2.2-.8-3.8-2-4.8" />
    </Svg>
  );
}
function SparkGlyph({ size = 20, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
    </Svg>
  );
}
function CalendarGlyph({ size = 15, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 6.5h16v14H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4" />
    </Svg>
  );
}
function ShieldGlyph({ size = 18, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l7.5 3v6c0 4.4-3.1 8.1-7.5 9.4C7.6 20.1 4.5 16.4 4.5 12V6L12 3z" />
    </Svg>
  );
}
function ArrowUpGlyph({ size = 18, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  );
}
function BookGlyph({ size = 16, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 4.5h6a2.5 2.5 0 0 1 2.5 2.5v13a2 2 0 0 0-2-2H4zM20 4.5h-6A2.5 2.5 0 0 0 11.5 7v13a2 2 0 0 1 2-2H20z" />
    </Svg>
  );
}
function SwordsGlyph({ size = 17, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.5 14.5L21 21M19 3l-9 9M5 3l9 9M9.5 14.5L3 21" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 30 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },
  pressed: { opacity: 0.9 },

  // hero
  hero: { position: 'relative', marginHorizontal: -16, paddingTop: 14, paddingHorizontal: 24, paddingBottom: 28, overflow: 'hidden' },
  crownWrap: { position: 'absolute', top: 6, left: 0, right: 0, alignItems: 'center' },
  heroContent: { paddingTop: 120, alignItems: 'center' },
  closedPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  closedPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze300 },
  heroName: { marginTop: 16, fontFamily: flFont.display, fontSize: 31, fontWeight: '700', letterSpacing: -0.4, lineHeight: 34, textAlign: 'center', color: flColor.cream100 },
  heroSeason: { marginTop: 8, fontSize: 11.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center', color: flColor.gray600 },

  // champion
  champCard: {
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronze400,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  champGlow: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronze300 },
  champLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.bronze300 },
  champAvatars: { marginTop: 18, alignItems: 'center' },
  champAvatarsMany: { flexDirection: 'row', gap: 18, flexWrap: 'wrap', justifyContent: 'center' },
  champAvatarWrap: { position: 'relative', alignItems: 'center' },
  champCrown: { position: 'absolute', top: -21, zIndex: 2 },
  champRing: { borderRadius: flRadius.round, borderWidth: 2, borderColor: flColor.bronze400, padding: 2, boxShadow: '0 0 20px rgba(186, 134, 84,0.34)' },
  champRingSmall: { borderWidth: 1.5 },
  champName: { marginTop: 14, fontFamily: flFont.display, fontSize: 25, fontWeight: '600', letterSpacing: -0.3, lineHeight: 29, textAlign: 'center', color: flColor.cream100 },
  champScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 8 },
  champScore: { fontFamily: flFont.display, fontSize: 28, fontWeight: '700', letterSpacing: -0.5, color: flColor.bronze300 },
  champUnit: { fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
  champMargin: { marginTop: 12, fontSize: 12.5, lineHeight: 18, textAlign: 'center', color: flColor.gray400 },

  // your result
  yourCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 14,
    padding: 18,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    boxShadow: `0 0 9px rgba(186, 134, 84,0.09), ${flShadow.card}`,
  },
  markWell: { position: 'relative', width: 56, height: 56, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  markDisc: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: flRadius.round, borderWidth: 1, borderColor: 'rgba(185,188,194,0.5)', backgroundColor: 'rgba(150,154,162,0.08)' },
  markNum: { fontFamily: flFont.display, fontSize: 24, fontWeight: '700', color: flColor.cream100 },
  markRule: { width: 1, alignSelf: 'stretch', backgroundColor: flColor.bronzeBorderSubtle },
  yourBody: { flex: 1, minWidth: 0, gap: 5 },
  yourHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  yourLabel: { fontFamily: flFont.display, fontSize: 22, fontWeight: '700', letterSpacing: -0.3, color: flColor.cream100 },
  yourPlace: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  yourDetail: { fontSize: 12.5, lineHeight: 19, color: flColor.gray400 },

  // summary
  summaryCard: { marginTop: 26, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, overflow: 'hidden', boxShadow: flShadow.card },
  summaryHead: { paddingHorizontal: 16, paddingTop: 13, paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: flColor.charcoal700, gap: 1 },
  summaryTile: { flexBasis: '49.7%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: flColor.charcoal800 },
  summaryIcon: { flexShrink: 0 },
  summaryText: { flex: 1, minWidth: 0 },
  summaryValue: { fontFamily: flFont.display, fontSize: 28, fontWeight: '700', letterSpacing: -0.8, color: flColor.cream100 },
  summaryLabel: { marginTop: 5, fontSize: 10.5, fontWeight: '600', letterSpacing: 0.4, color: flColor.gray600 },
  summaryFoot: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  summaryFootText: { flex: 1, fontSize: 12, lineHeight: 17, color: flColor.gray400 },

  // standings
  standHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26, marginBottom: 12, marginHorizontal: 4 },
  standMeta: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  standList: { gap: 8 },
  standRow: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  standRowWinner: { borderColor: flColor.bronzeBorder, paddingVertical: 17 },
  standRowPodium: { borderColor: flColor.bronzeBorderSubtle },
  standRowSelf: { borderColor: flColor.bronze400, boxShadow: `0 0 0 1px ${flColor.bronzeBorder}, 0 0 18px rgba(186, 134, 84,0.22), ${flShadow.card}` },
  standRowPressed: { opacity: 0.9 },
  rankSlot: { width: 26, flexShrink: 0, alignItems: 'center' },
  rankNum: { fontFamily: flFont.display, fontSize: 17, fontWeight: '700', color: flColor.gray600 },
  standBody: { flex: 1, minWidth: 0, gap: 2 },
  standNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
  standName: { flexShrink: 1, fontSize: 15, fontWeight: '500', color: flColor.cream100 },
  standNameStrong: { fontWeight: '700' },
  standNameSelf: { color: flColor.bronze300 },
  standSub: { fontSize: 11.5, color: flColor.gray600 },
  youPill: { flexShrink: 0, paddingHorizontal: 7, paddingVertical: 2, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  youPillText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.bronze300 },
  standScore: { flexShrink: 0, alignItems: 'flex-end' },
  standScoreValue: { fontFamily: flFont.display, fontSize: 19, fontWeight: '700', color: flColor.cream100 },
  standScoreWinner: { color: flColor.bronze300 },
  standScoreUnit: { marginTop: 1, fontSize: 9, fontWeight: '600', letterSpacing: 0.9, textTransform: 'uppercase', color: flColor.gray600 },

  // recognition
  sectionLabel: { marginTop: 26, marginBottom: 12, marginHorizontal: 4, fontSize: 12, fontWeight: '700', letterSpacing: 1.7, textTransform: 'uppercase', color: flColor.bronze400 },
  sectionLabelInline: { fontSize: 12, fontWeight: '700', letterSpacing: 1.7, textTransform: 'uppercase', color: flColor.bronze400 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, paddingVertical: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, boxShadow: flShadow.card },
  badgeIcon: { width: 38, height: 38, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  badgeBody: { flex: 1, minWidth: 0, gap: 2 },
  badgeTitle: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.bronze400 },
  badgeWho: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  badgeDetail: { flexShrink: 0, maxWidth: 118, fontSize: 11.5, lineHeight: 16, textAlign: 'right', color: flColor.gray600 },

  // closing
  closing: { marginTop: 26, gap: 14 },
  legacyStrip: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 15, paddingVertical: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  legacyText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },
  legacyEm: { fontWeight: '600', color: flColor.bronze300 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint, boxShadow: flShadow.card },
  primaryBtnLabel: { fontSize: 14.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze300 },
  ghostBtn: { alignItems: 'center', justifyContent: 'center', padding: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600 },
  ghostBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },

  dashedEmpty: { paddingVertical: 22, paddingHorizontal: 16, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.charcoal600 },
  dashedText: { fontSize: 12.5, textAlign: 'center', color: flColor.gray600 },

  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
