import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { CrownArt } from '@/components/forge/compositions/CrownArt';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import {
  CHALLENGE_TYPES,
  cancelChallenge,
  fetchChallengeDetail,
  formatScore,
  isGainType,
  joinChallenge,
  metricLabel,
  ordinal,
  type ChallengeDetail,
  type Standing,
} from '@/data/challenges-live';
import { seasonClock } from '@/domain/challenges/season';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { getSeenPodiums } from '@/lib/podium-seen';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Challenge (C-3) — the standings screen. Built to `Forge Challenge.dc.html`.
 *
 * The design calls itself the most cinematic screen in the project and it is: a crown emerging from the
 * stone, an ember drifting up over 7.5s, a shimmer that glints for 21% of a 10s cycle, and a season
 * timeline of week segments. All of that is here.
 *
 * ⚠ THE CROWN IS AT 0.60, NOT THE DESIGN'S 0.34 (PO, 2026-08-17: "I can't see it at all"). The design
 * sets 34% against a flat page; here it sits under the vignette below and over `SCREEN_BG`, and the two
 * together ate it entirely on a phone. Any figure copied from a `.dc` that describes opacity against a
 * background this screen does not have is a starting point, not a value.
 *
 * It is also, in the design, entirely fictional — `yourRank: '2nd'`, `raceLine: 'Marcus leads by 2
 * workouts'` and `yourScore: '5'` are typed strings that merely happen to agree with the seed roster.
 * Every number on this screen is now computed from the same scoring the challenge itself runs on.
 *
 * FOUR DESIGN DEFECTS FIXED, each because real data exposes them:
 *   · "WKTS" was hardcoded into the markup three times, so the screen physically could not display a
 *     volume, distance, PR or gain challenge — thirteen of our fourteen metrics. The unit comes from
 *     the challenge now.
 *   · A tie at 4 workouts was given ranks 3 and 4 by array order, and the podium treatment went to
 *     whichever sorted first. Ties share a place and are marked "T-3".
 *   · The roster rendered five blank gradient discs on the one screen whose entire job is telling five
 *     competitors apart. Real avatars with the design system's initials fallback.
 *   · Standings rows were inert; they open the athlete's profile.
 *
 * CS-D3 shows up in one visible way: the design flags athletes who have gone quiet with a `stale`
 * treatment, which is a soft failure marker on a leaderboard. Momentum here is positive-only — "+3 this
 * week" when there's something to say, and nothing at all otherwise. Absence is never annotated.
 *
 * THE CROWN AND ITS LIGHT SWEEP live in `CrownArt`, which is where the two competition assets and the
 * reason for choosing between them are documented. The short version: the first pass drew the alpha-less
 * art PNG (an opaque rectangle) and swept an UNMASKED bar across the whole box, which is not what the
 * design does at all — its band is clipped to the crown's linework by a second asset. Fixed there.
 */

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challengeId = String(id ?? '');
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery(() => fetchChallengeDetail(challengeId), [challengeId]);
  const { showToast } = useToast();
  const [confirmOff, setConfirmOff] = useState(false);
  const [callingOff, setCallingOff] = useState(false);
  const [joining, setJoining] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/competitions'));

  /**
   * THE CORONATION, FROM HERE TOO.
   *
   * `fetchChallengeDetail` advances the lifecycle before it reads, so this screen is very often the one
   * that actually closes the season — an invited friend arrives from the inbox, and the competition
   * finishes on the way in. Until this pass the only ceremony trigger was the hub's, so the athlete who
   * caused the completion was handed a static "View Final Standings" button and the coronation waited
   * for a screen they had no reason to open.
   *
   * ⚠ NO FRESHNESS GATE HERE, UNLIKE THE HUB, AND THAT DIFFERENCE IS DELIBERATE. `podiumIsFresh` exists
   *   so a LIST cannot ambush you with a season that closed last month; C-1 is a screen you pass through
   *   and the ceremony there is unrequested. Opening a competition is not passing through — it is asking
   *   about that competition specifically, and its result is the answer. `markPodiumSeen` still holds it
   *   to once per device, so nobody watches the same six seconds twice.
   */
  const crowned = useRef(false);
  const finished = data?.state === 'COMPLETED' || data?.state === 'ARCHIVED';
  useEffect(() => {
    if (crowned.current || !finished || !challengeId) return;
    let alive = true;
    getSeenPodiums().then((seen) => {
      if (!alive || crowned.current || seen.includes(challengeId)) return;
      crowned.current = true;
      router.push({ pathname: '/podium/[id]', params: { id: challengeId } });
    }, () => undefined);
    return () => {
      alive = false;
    };
  }, [finished, challengeId, router]);

  /* Both the invite notification and its push route here, and the inbox row's own call to action reads
     "Opt in to compete" — so this screen has to be somewhere you can. It wasn't: `i_joined` came back from
     0064 on day one and nothing on C-3 ever read it, which left an invited athlete on a leaderboard they
     could look at and not enter. CS-D1 is untouched — this is still only ever you adding yourself. */
  const onJoin = () => {
    if (joining) return;
    setJoining(true);
    joinChallenge(challengeId).then(
      () => {
        setJoining(false);
        showToast('You’re in. Every session from here counts.');
        refetch();
      },
      (e: unknown) => {
        setJoining(false);
        showToast(errorMessage(e));
        // Same race as the hub's Join row: refetch so the button goes with the reason it failed.
        refetch();
      },
    );
  };

  const callOff = () => {
    if (callingOff) return;
    setCallingOff(true);
    cancelChallenge(challengeId).then(
      () => {
        setCallingOff(false);
        setConfirmOff(false);
        showToast('Competition called off');
        router.replace('/competitions');
      },
      (e: unknown) => {
        setCallingOff(false);
        setConfirmOff(false);
        showToast(errorMessage(e));
      },
    );
  };

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
          <Text style={styles.missingTitle}>{error ? 'Couldn’t load this competition.' : 'This competition isn’t available.'}</Text>
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
        <Hero challenge={data} />

        {/* A lifecycle transition that was REFUSED. Never fatal — the standings above are real and worth
            reading — but never silent either: discarding this exact result is what let a competition sit
            at its start date for days while every screen looked healthy. See `advanceChallenges`. */}
        {data.advanceError ? (
          <View style={styles.advanceWarn}>
            <Text style={styles.advanceWarnTitle}>This competition’s clock isn’t updating.</Text>
            <Text style={styles.advanceWarnBody}>{data.advanceError}</Text>
          </View>
        ) : null}

        {/* OPT IN (CS-D1) — above the standings, because for an invited athlete this screen is a question
            before it is a leaderboard. A competition is joinable for as long as the insert policy says it
            is, which is ENROLLMENT *or* ACTIVE (0087) — and since 0163 that is also exactly when the
            invite still exists. */}
        {!data.iJoined && (data.state === 'ENROLLMENT' || data.state === 'ACTIVE') ? (
          <>
            <Pressable
              onPress={onJoin}
              disabled={joining}
              accessibilityRole="button"
              accessibilityState={{ disabled: joining }}
              accessibilityLabel={`Join ${data.name}`}
              style={({ pressed }) => [styles.joinBtn, pressed ? styles.standRowPressed : null]}
            >
              <LinearGradient colors={flGradient.bronzeFill.colors} locations={flGradient.bronzeFill.locations} start={flGradient.bronzeFill.start} end={flGradient.bronzeFill.end} style={StyleSheet.absoluteFill} />
              <Text style={styles.joinLabel}>{joining ? 'Joining…' : 'Join This Competition'}</Text>
            </Pressable>
            {/* Said plainly rather than discovered from the standings: everyone is scored from the start
                date, so a late entry is a standing start and not a handicap. */}
            <Text style={styles.joinNote}>
              {data.state === 'ACTIVE'
                ? 'Already underway — you’ll be scored from the start date, the same as everyone else.'
                : 'Nobody is entered until they opt in.'}
            </Text>
          </>
        ) : null}

        {/* The design's own flagged gap: a closed season had no way through to its final standings. */}
        {data.state === 'COMPLETED' || data.state === 'ARCHIVED' ? (
          <Pressable
            onPress={() => router.push({ pathname: '/challenge-results/[id]', params: { id: challengeId } })}
            accessibilityRole="button"
            accessibilityLabel="View final standings"
            style={({ pressed }) => [styles.finalBtn, pressed ? styles.standRowPressed : null]}
          >
            <CrownGlyph size={16} />
            <Text style={styles.finalBtnLabel}>View Final Standings</Text>
          </Pressable>
        ) : null}
        <YourStanding challenge={data} />
        <Standings challenge={data} onAthlete={(userId) => router.push({ pathname: '/athlete/[id]', params: { id: userId } })} />
        <HowItWorks challenge={data} />

        {/* CALL OFF (CS-D5) — the commissioner's only early exit. Deliberately not "end now and crown
            the leader": a cancelled season produces no winner and no result, so nobody can stop the
            clock the moment they happen to be ahead. */}
        {data.isCreator && (data.state === 'ENROLLMENT' || data.state === 'ACTIVE') ? (
          <Pressable
            onPress={() => setConfirmOff(true)}
            accessibilityRole="button"
            accessibilityLabel="Call off this competition"
            style={({ pressed }) => [styles.callOffBtn, pressed ? styles.standRowPressed : null]}
          >
            <Text style={styles.callOffLabel}>Call Off Competition</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <ConfirmSheet
        open={confirmOff}
        onClose={() => setConfirmOff(false)}
        headline="Call off this competition?"
        body={`${data.name} ends now with no winner and no result — for anyone. It disappears from the squad rather than being recorded as finished, and nobody's placement is kept. This can't be undone.`}
        confirmLabel={callingOff ? 'Calling off…' : 'Call It Off'}
        onConfirm={callOff}
        tone="destructive"
        cancelLabel="Keep Competing"
      />
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Hero({ challenge: c }: { challenge: ChallengeDetail }) {
  const [rise] = useState(() => new Animated.Value(0));
  const [ember] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const entrance = Animated.timing(rise, { toValue: 1, duration: 900, useNativeDriver: true });
    entrance.start();
    // 7.5s drift, 2.2s in — the design's ember, on its own unhurried loop.
    const drift = Animated.loop(Animated.sequence([Animated.delay(2200), Animated.timing(ember, { toValue: 1, duration: 7500, useNativeDriver: true }), Animated.timing(ember, { toValue: 0, duration: 0, useNativeDriver: true })]));
    drift.start();
    return () => {
      entrance.stop();
      drift.stop();
    };
  }, [rise, ember]);

  // Pinned at mount: the season maths must not shift between re-renders, and Date.now() in a render
  // body is impure (react-compiler flags it).
  const [now] = useState(() => Date.now());
  /* All of it — segment count, fill, day index, the line — lives in `domain/challenges/season.ts`, and
     is unit-tested there against this competition's real dates. It was inline here, and it was wrong in
     three ways at once: a 3-day duel drawn on a week grid as one segment that could never pass 43% and a
     caption reading "Week 1 of 1" for its whole life, a "final day" branch that could never run, and
     "1 days remaining". See that file's header for the report it came from. */
  const season = seasonClock(c.startAt, c.endAt, c.state, now);
  const { totalUnits, currentUnit, unitFill } = season;

  const leader = c.standings[0];
  const self = c.standings.find((s) => s.isSelf);
  const meta = CHALLENGE_TYPES[c.type];

  // The race line, computed. The design typed it.
  const raceLine = (() => {
    if (!leader) return 'No one has scored yet.';
    if (self && leader.userId === self.userId) {
      const next = c.standings.find((s) => !s.isSelf);
      if (!next) return 'You’re the only one in so far.';
      const lead = self.score - next.score;
      return lead > 0 ? `You lead by ${formatScore(c.type, lead)} ${meta.unit}` : `You and ${next.name} are level`;
    }
    if (!self) return `${leader.name} leads with ${formatScore(c.type, leader.score)} ${meta.unit}`;
    const gap = leader.score - self.score;
    return gap > 0 ? `${leader.name} leads by ${formatScore(c.type, gap)} ${meta.unit}` : `You and ${leader.name} are level`;
  })();

  return (
    <View style={styles.hero}>
      {/* the vignette the crown reads against — layered rather than radial, RN has no radial-gradient */}
      <LinearGradient colors={['rgba(6,7,9,0.97)', 'rgba(6,7,9,0.72)', 'transparent'] as const} locations={[0, 0.54, 0.84] as const} start={{ x: 0.5, y: 0.2 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />

      <View style={styles.crownWrap}>
        {/* 0.34 → 0.60 (PO 2026-08-17: "I can't see it at all"). The design's 34% is measured against a
            flat page; this hero also carries the vignette above and a textured screen background under
            it, and on a phone in daylight the crown simply was not there. 75% brighter, as asked. */}
        <CrownArt opacity={0.9} duration={900} shimmer />
      </View>

      <Animated.View
        style={[
          styles.ember,
          {
            opacity: ember.interpolate({ inputRange: [0, 0.08, 0.7, 1], outputRange: [0, 0.7, 0.4, 0] }),
            transform: [{ translateY: ember.interpolate({ inputRange: [0, 1], outputRange: [0, -96] }) }, { translateX: ember.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) }],
          },
        ]}
      />

      <View style={styles.heroContent}>
        <Text style={styles.heroName} numberOfLines={3}>
          {c.name}
        </Text>

        {/* One segment per DAY on a run of 14 days or fewer, per week beyond that — see `byDay` above.
            The design's week grid is right for the 4- and 8-week presets it was drawn against and wrong
            for a 3-day duel, which it drew as a single bar stuck below half. */}
        <View style={styles.timeline}>
          {Array.from({ length: totalUnits }).map((_, i) => {
            const unit = i + 1;
            const fill = unit < currentUnit ? 1 : unit === currentUnit ? unitFill : 0;
            return (
              <View key={i} style={styles.weekTrack}>
                {fill > 0 ? (
                  <View style={[styles.weekFill, { width: `${Math.round(fill * 100)}%` }, unit === currentUnit ? styles.weekFillCurrent : null]}>
                    <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
        <Text style={styles.seasonLabel}>{season.label}</Text>

        <View style={styles.raceRow}>
          <CrownGlyph size={15} />
          <Text style={styles.raceLine} numberOfLines={2}>
            {raceLine}
          </Text>
        </View>

        <Text style={styles.heroMeta}>
          {metricLabel(c.type, c.metricKey)}
          {c.squadName ? ` · ${c.squadName}` : ''}
        </Text>
      </View>
    </View>
  );
}

function YourStanding({ challenge: c }: { challenge: ChallengeDetail }) {
  const self = c.standings.find((s) => s.isSelf);
  if (!self) return null;

  const meta = CHALLENGE_TYPES[c.type];
  const sorted = c.standings;
  const idx = sorted.findIndex((s) => s.isSelf);
  const above = sorted.slice(0, idx).reverse().find((s) => s.score > self.score);
  const below = sorted.slice(idx + 1).find((s) => s.score < self.score);

  return (
    <View style={styles.standingCard}>
      <LinearGradient colors={['rgba(186, 134, 84,0.10)', 'transparent'] as const} locations={[0, 0.55] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.rankZone}>
        <Text style={styles.rankLabel}>Your Rank</Text>
        <Text style={styles.rankValue}>{ordinal(self.place, self.tied)}</Text>
        <Text style={styles.rankLabel}>Out of {sorted.length}</Text>
      </View>

      <View style={styles.rule} />

      <View style={styles.compareZone}>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreValue}>{formatScore(c.type, self.score)}</Text>
          <Text style={styles.scoreUnit}>{meta.unit}</Text>
        </View>
        {above ? (
          <Text style={styles.behindLine}>
            {formatScore(c.type, above.score - self.score)} behind {above.name}
          </Text>
        ) : null}
        {below ? (
          <Text style={styles.aheadLine}>
            {formatScore(c.type, self.score - below.score)} ahead of {below.name}
          </Text>
        ) : null}
        {!above && !below ? <Text style={styles.aheadLine}>Everyone is level so far.</Text> : null}
      </View>
    </View>
  );
}

function Standings({ challenge: c, onAthlete }: { challenge: ChallengeDetail; onAthlete: (userId: string) => void }) {
  const meta = CHALLENGE_TYPES[c.type];

  return (
    <>
      <View style={styles.standHead}>
        <Text style={styles.standLabel}>Standings</Text>
        <View style={styles.legend}>
          <PulseDot />
          <Text style={styles.legendText}>LOGGED TODAY</Text>
        </View>
      </View>

      {c.standings.length === 0 ? (
        <View style={styles.dashedEmpty}>
          <Text style={styles.dashedText}>No one has opted in yet.</Text>
        </View>
      ) : (
        <View style={styles.standList}>
          {c.standings.map((s, i) => (
            <StandingRow key={s.userId} standing={s} index={i} type={c.type} unit={meta.unit} onPress={() => onAthlete(s.userId)} />
          ))}
        </View>
      )}
    </>
  );
}

function StandingRow({ standing: s, index, type, unit, onPress }: { standing: Standing; index: number; type: ChallengeDetail['type']; unit: string; onPress: () => void }) {
  const leader = s.place === 1;
  const podium = s.place <= 3;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${s.name}, ${ordinal(s.place, s.tied)}, ${formatScore(type, s.score)} ${unit}`}
      style={({ pressed }) => [styles.standRow, leader ? styles.standRowLeader : null, s.place === 3 ? styles.standRowThird : null, s.isSelf ? styles.standRowSelf : null, pressed ? styles.standRowPressed : null]}
    >
      {leader || s.place === 3 ? (
        <LinearGradient colors={leader ? (['rgba(186, 134, 84,0.09)', 'rgba(186, 134, 84,0.02)'] as const) : (['rgba(186, 134, 84,0.045)', 'transparent'] as const)} locations={[0, leader ? 1 : 0.6] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}

      <View style={styles.rankSlot}>
        {leader ? <CrownGlyph size={17} /> : <Text style={[styles.rankNum, podium ? styles.rankNumPodium : null]}>{s.tied ? `T${s.place}` : s.place}</Text>}
      </View>

      <View style={styles.avatarWrap}>
        <Avatar src={s.avatarUrl ?? undefined} name={s.name} size={40} />
        {s.loggedToday ? <PulseDot size={11} ringed /> : null}
      </View>

      <View style={styles.standBody}>
        <Text style={[styles.standName, leader || s.isSelf ? styles.standNameStrong : null]} numberOfLines={1}>
          {s.name}
          {s.isSelf ? ' (You)' : ''}
        </Text>
        {/* Positive-only: an athlete with nothing to add simply has no second line. */}
        {s.recent > 0 ? (
          <View style={styles.momRow}>
            <ArrowUpGlyph />
            <Text style={styles.momText}>
              +{formatScore(type, s.recent)} this week
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.standScore}>
        <Text style={[styles.standScoreValue, leader ? styles.standScoreLeader : null]}>{formatScore(type, s.score)}</Text>
        <Text style={styles.standScoreUnit}>{unit}</Text>
      </View>
    </Pressable>
  );
}

function HowItWorks({ challenge: c }: { challenge: ChallengeDetail }) {
  const meta = CHALLENGE_TYPES[c.type];
  const gain = isGainType(c.type);
  const rules = [
    { glyph: <DumbbellGlyph />, text: gain ? `Your ${meta.unit.replace(' gained', '')} during the challenge, measured against the same length of time before it.` : `${metricLabel(c.type, c.metricKey)} — counted in ${meta.unit}.` },
    { glyph: <FlameGlyph size={15} />, text: 'Scores update as you log. Nothing to submit.' },
    { glyph: <MedalGlyph />, text: 'The highest score at the end takes the crown. Ties share it.' },
  ];

  return (
    <>
      <Text style={styles.sectionLabel}>How It Works</Text>
      <View style={styles.rulesCard}>
        {rules.map((r, i) => (
          <View key={i} style={styles.ruleRow}>
            <View style={styles.ruleIcon}>{r.glyph}</View>
            <Text style={styles.ruleText}>{r.text}</Text>
          </View>
        ))}
      </View>
      {c.description ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>“{c.description}”</Text>
        </View>
      ) : null}
    </>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Competition" serif onBack={onBack} />
      {children}
    </View>
  );
}

/** The design's breathing dot — 2.8s in and out, marking who has trained today. */
function PulseDot({ size = 6, ringed = false }: { size?: number; ringed?: boolean }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [v]);
  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: flRadius.round, backgroundColor: flColor.bronze300 },
        ringed ? styles.dotRinged : null,
        { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
      ]}
    />
  );
}

// ── glyphs ──
function CrownGlyph({ size = 15, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function ArrowUpGlyph({ size = 10, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  );
}
function DumbbellGlyph({ size = 15, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
    </Svg>
  );
}
function FlameGlyph({ size = 15, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z" />
    </Svg>
  );
}
function MedalGlyph({ size = 15, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8.5 3 L12 9M15.5 3 L12 9" />
      <Circle cx={12} cy={15} r={5.4} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 30 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },

  // hero — bleeds past the scroller's padding
  hero: { position: 'relative', marginHorizontal: -16, paddingTop: 14, paddingHorizontal: 24, paddingBottom: 30, overflow: 'hidden' },
  crownWrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  ember: {
    position: 'absolute',
    bottom: 70,
    left: '56%',
    width: 2.5,
    height: 2.5,
    borderRadius: flRadius.round,
    backgroundColor: flColor.bronze300,
    boxShadow: '0 0 5px 1px rgba(186, 134, 84,0.6)',
  },
  heroContent: { paddingTop: 158, alignItems: 'center' },
  heroName: { fontFamily: flFont.display, fontSize: 31, fontWeight: '700', letterSpacing: -0.4, lineHeight: 34, textAlign: 'center', color: flColor.cream100 },
  timeline: { flexDirection: 'row', gap: 5, width: 214, marginTop: 16 },
  weekTrack: { flex: 1, height: 5, borderRadius: flRadius.pill, overflow: 'hidden', backgroundColor: flColor.charcoal700, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' },
  weekFill: { height: '100%', borderRadius: flRadius.pill, overflow: 'hidden' },
  weekFillCurrent: { boxShadow: flShadow.glowSubtle },
  seasonLabel: { marginTop: 9, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  raceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  raceLine: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: flColor.bronze300 },
  heroMeta: { marginTop: 7, fontSize: 11.5, color: flColor.gray600 },

  // your standing
  standingCard: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 4,
    padding: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  rankZone: { minWidth: 70, alignItems: 'center', justifyContent: 'center', gap: 2 },
  rankLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },
  rankValue: { fontFamily: flFont.display, fontSize: 44, fontWeight: '700', letterSpacing: -1, lineHeight: 48, color: flColor.bronze300 },
  rule: { width: 1, alignSelf: 'stretch', marginHorizontal: 16, backgroundColor: flColor.bronzeBorderSubtle },
  compareZone: { flex: 1, justifyContent: 'center', gap: 5 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  scoreValue: { fontFamily: flFont.display, fontSize: 22, fontWeight: '700', color: flColor.cream100 },
  scoreUnit: { fontSize: 9, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase', color: flColor.gray600 },
  /** Deliberately not red/green — muted clay and sage, the design's "premium comparison tones". */
  behindLine: { fontSize: 12.5, color: '#A97E68' },
  aheadLine: { fontSize: 12.5, color: '#7E8E74' },

  // standings
  standHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12, marginHorizontal: 4 },
  standLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.7, textTransform: 'uppercase', color: flColor.bronze400 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 9, fontWeight: '600', letterSpacing: 0.8, color: flColor.gray600 },
  standList: { gap: 8 },
  standRow: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
  },
  standRowLeader: { borderColor: flColor.bronzeBorder },
  standRowThird: {},
  /** Applied last so it wins on border and glow, while a leader's wash survives underneath. */
  standRowSelf: { borderColor: flColor.bronze400, boxShadow: `0 0 0 1px ${flColor.bronzeBorder}, 0 0 18px rgba(186, 134, 84,0.16), ${flShadow.card}` },
  standRowPressed: { opacity: 0.9 },
  rankSlot: { width: 24, alignItems: 'center', flexShrink: 0 },
  rankNum: { fontFamily: flFont.display, fontSize: 17, fontWeight: '700', color: flColor.gray600 },
  rankNumPodium: { color: flColor.bronze400 },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  dotRinged: { position: 'absolute', right: -1, bottom: -1, borderWidth: 2, borderColor: flColor.charcoal800 },
  standBody: { flex: 1, minWidth: 0, gap: 3 },
  standName: { fontSize: 15, fontWeight: '500', color: flColor.cream100 },
  standNameStrong: { fontWeight: '700' },
  momRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  momText: { fontSize: 11.5, color: flColor.bronze400 },
  standScore: { flexShrink: 0, alignItems: 'flex-end' },
  standScoreValue: { fontFamily: flFont.display, fontSize: 19, fontWeight: '700', color: flColor.cream100 },
  standScoreLeader: { color: flColor.bronze300 },
  standScoreUnit: { fontSize: 9, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },

  /* Charcoal, not red. A transition that did not fire is a fault in the app, not a failure of the
     athlete's season — the standings above it are still true, and it must not read like a warning about
     them. Legible and unmissable is the whole requirement. */
  advanceWarn: { marginTop: 4, marginBottom: 12, padding: 13, gap: 4, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  advanceWarnTitle: { fontSize: 13, fontWeight: '600', color: flColor.cream100 },
  advanceWarnBody: { fontSize: 11.5, lineHeight: 17, color: flColor.gray400 },

  finalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 4, marginBottom: 10, padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  finalBtnLabel: { fontSize: 14, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze300 },
  joinBtn: {
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 15,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeMetalBorder,
    boxShadow: `${flShadow.bronzeMetalTopRim}, ${flShadow.card}`,
  },
  joinLabel: { fontSize: 15, fontWeight: '700', color: '#F7F5F1', textShadowColor: 'rgba(8,5,2,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  joinNote: { marginTop: 9, marginBottom: 6, fontSize: 11.5, lineHeight: 17, textAlign: 'center', color: flColor.gray600 },
  callOffBtn: { marginTop: 26, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600 },
  callOffLabel: { fontSize: 13, fontWeight: '600', color: flColor.gray600 },

  // how it works
  sectionLabel: { marginTop: 26, marginBottom: 12, marginHorizontal: 4, fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  rulesCard: { gap: 14, padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.surfaceRecessed },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  ruleIcon: { width: 30, height: 30, flexShrink: 0, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronzeTint },
  ruleText: { flex: 1, paddingTop: 5, fontSize: 13.5, lineHeight: 19, color: flColor.gray400 },
  messageCard: { marginTop: 12, padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  messageText: { fontFamily: flFont.displayMedium, fontSize: 14.5, lineHeight: 22, color: flColor.cream100 },

  dashedEmpty: { paddingVertical: 22, paddingHorizontal: 16, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.charcoal600 },
  dashedText: { fontSize: 12.5, textAlign: 'center', color: flColor.gray600 },

  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
