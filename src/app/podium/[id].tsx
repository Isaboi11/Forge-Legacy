import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { CHALLENGE_TYPES, fetchChallengeResults, formatScore, type ChallengeResultsDetail, type FinalStanding } from '@/data/challenges-live';
import { markPodiumSeen } from '@/lib/podium-seen';
import { useQuery } from '@/lib/useQuery';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';

/**
 * Podium Reveal — the coronation. Built to `Forge Podium Reveal.dc.html`.
 *
 * A ~6 second scripted reveal that plays once when a season closes, then hands off to C-4. The design
 * is twelve CSS keyframes and a per-place `meta` table; this is the same score driven by ONE native
 * clock (`t`, 0→END ms) that every element interpolates against. Timings live in `BEATS` and the slot
 * table below, so changing a beat is still editing one number — the property of the design worth
 * keeping.
 *
 * SIX GAPS IN THE DESIGN, ALL FIXED:
 *
 * 1. IT INVENTED ITS OWN WINNER. `TOP` is a literal (Marcus Vale 7, Ada Ridge 5, Dana Cole 4) and the
 *    eyebrow is the string 'Forge League · Season 3'. Worse, the design's own notes flag that it never
 *    writes the payload it hands to Results — so the ceremony and the results screen could crown
 *    different people. Both screens read `challenge_results_detail` here; they cannot disagree.
 *
 * 2. THE UNIT WAS "wkts", HARDCODED. A volume or max-lift season showed the wrong label.
 *
 * 3. IT ASSUMED EXACTLY THREE ATHLETES with you at 2nd. A duel had no branch, and a field of two would
 *    have rendered an empty third pedestal. Slots are built from the real standings, and the reveal
 *    plan compresses so a 1- or 2-athlete field still gets the quick-drops-then-heavy-champion pacing
 *    rather than staring at a gap where the bronze beat used to be.
 *
 * 4. IT HAD NO TIE BRANCH. CS-D15 makes co-winners share first place with full credit each. A tie now
 *    puts both athletes on the champion's pedestal, and — because `rank()` skips — the next slot
 *    correctly shows 3rd rather than a 2nd that doesn't exist. Slot governs the VISUALS (gold/silver/
 *    bronze tier), place governs the NUMERAL, which is what makes that work.
 *
 * 5. REDUCE MOTION WAS HALF-DONE. The design zeroes animation durations but leaves the delays intact,
 *    so a reduced-motion athlete watches an empty stage and gets abrupt pops for 5.4 seconds. Here it
 *    collapses to the rest state on the first frame — no countdown, no drops, no loops.
 *
 * 6. NOTHING NAVIGATED TO IT. Wired into the hub: a season that closed within the last week and hasn't
 *    been played on this device opens the ceremony once.
 *
 * WHAT THE CEREMONY DOES NOT DO: mention where you finished. It is the champion's coronation, and an
 * athlete who placed outside the podium simply attends it — no placement line, no consolation. Adding
 * "you finished 8th" to a celebration is exactly the dramatization CC-D3 forbids; C-4 states placement
 * plainly, which is the right surface for it.
 *
 * NOT PORTED: the champion name's `clip-path` engrave runs on a separate non-native value (RN cannot
 * interpolate clip-path, and a measured-width wipe is the honest equivalent).
 */

/** Beats measured from the champion's landing, so the climax stays the anchor at any field size. */
const BEATS = {
  countdown: [300, 900, 1500],
  countdownDur: 620,
  pedestalDur: 700,
  dropDur: 700,
  slamDur: 900,
  zoomDur: 5200,
  afterClimax: { flash: 0, halo: 0, ember: 300, crown: 550, eyebrow: 750, name: 950, cta: 1300, end: 2100 },
} as const;

/** Gold / silver / bronze TIER, indexed by podium slot — never by place, so ties can't shift the look. */
const SLOT = [
  { avatar: 78, ring: flColor.bronze400, medal: flColor.bronze300, medalSize: 24, pedestal: 128, numeral: 30, numeralColor: flColor.bronze300, name: 15, glow: true },
  { avatar: 60, ring: 'rgba(190,193,199,0.75)', medal: '#C7CAD0', medalSize: 20, pedestal: 92, numeral: 24, numeralColor: flColor.gray400, name: 13.5, glow: false },
  { avatar: 56, ring: 'rgba(196,140,90,0.7)', medal: '#B07C4E', medalSize: 20, pedestal: 68, numeral: 22, numeralColor: flColor.gray600, name: 13, glow: false },
] as const;

interface Slot {
  slot: number;
  place: number;
  athletes: FinalStanding[];
  pedestalAt: number;
  athleteAt: number;
}

/**
 * Reveal order is lowest podium slot first, champion last. The gaps are the design's: two quick light
 * drops, a held pause, then the heavy entrance.
 */
function planReveal(count: number): number[] {
  if (count >= 3) return [2100, 2800, 3900];
  if (count === 2) return [2100, 3200];
  return [2100];
}

export default function PodiumRevealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challengeId = String(id ?? '');
  const router = useRouter();
  const { data, loading, error } = useQuery(() => fetchChallengeResults(challengeId), [challengeId]);

  // Played once per device — marked on arrival, so a crash mid-ceremony doesn't re-trap the athlete.
  const marked = useRef(false);
  useEffect(() => {
    if (marked.current || !challengeId) return;
    marked.current = true;
    void markPodiumSeen(challengeId);
  }, [challengeId]);

  const toResults = () => router.replace({ pathname: '/challenge-results/[id]', params: { id: challengeId } });

  if (loading && !data) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,6,0.5)' }} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }

  // A ceremony with nothing to crown is not worth an error screen — go where they were headed.
  if (error || !data || data.winners.length === 0) {
    return <Redirect onReady={toResults} />;
  }

  return <Ceremony result={data} onDone={toResults} />;
}

function Redirect({ onReady }: { onReady: () => void }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    onReady();
  }, [onReady]);
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,6,0.5)' }} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Ceremony({ result: r, onDone }: { result: ChallengeResultsDetail; onDone: () => void }) {
  const meta = CHALLENGE_TYPES[r.type];

  // ── Podium composition: up to three distinct PLACES, tallest first ──
  const slots = useMemo<Slot[]>(() => {
    const byPlace = new Map<number, FinalStanding[]>();
    for (const s of r.standings) {
      const list = byPlace.get(s.place);
      if (list) list.push(s);
      else byPlace.set(s.place, [s]);
    }
    const places = [...byPlace.keys()].sort((a, b) => a - b).slice(0, 3);
    const plan = planReveal(places.length);
    return places.map((place, i) => {
      const gold = i === 0;
      // Plan is authored lowest-slot-first; the champion is always the final beat.
      const pedestalAt = plan[places.length - 1 - i];
      return {
        slot: i,
        place,
        athletes: byPlace.get(place) ?? [],
        pedestalAt,
        athleteAt: pedestalAt + (gold ? 200 : 150),
      };
    });
  }, [r.standings]);

  const climax = slots[0]?.athleteAt ?? 2300;
  const END = climax + BEATS.afterClimax.end;

  // ── The clock ──
  const [t] = useState(() => new Animated.Value(0));
  const [engrave] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(0));
  const [ember] = useState(() => new Animated.Value(0));
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(
      (v) => alive && setReduced(v),
      () => alive && setReduced(false),
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduced === null) return undefined;

    // Reduce Motion: the rest state, immediately. No countdown, no drops, no loops — the design's own
    // gap was zeroing durations while leaving the delays, which is worse than no animation at all.
    if (reduced) {
      t.setValue(END);
      engrave.setValue(1);
      breathe.setValue(0.7);
      return undefined;
    }

    const clock = Animated.timing(t, { toValue: END, duration: END, easing: Easing.linear, useNativeDriver: true });
    const wipe = Animated.sequence([
      Animated.delay(climax + BEATS.afterClimax.name),
      Animated.timing(engrave, { toValue: 1, duration: 780, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]);
    const halo = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    );
    const embers = Animated.loop(Animated.timing(ember, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }));

    clock.start();
    wipe.start();
    halo.start();
    const emberTimer = setTimeout(() => embers.start(), climax + BEATS.afterClimax.ember);

    return () => {
      clock.stop();
      wipe.stop();
      halo.stop();
      embers.stop();
      clearTimeout(emberTimer);
    };
  }, [reduced, t, engrave, breathe, ember, climax, END]);

  if (reduced === null) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,6,0.5)' }} />
      </View>
    );
  }

  const at = (from: number, to: number) => t.interpolate({ inputRange: [0, Math.max(1, from), to, END], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });

  const champions = slots[0]?.athletes ?? [];
  const championNames = champions.map((c) => c.name).join(' & ');
  // Display order puts silver left, gold centre, bronze right — the data stays in finishing order.
  const display = [slots[1], slots[0], slots[2]].filter((s): s is Slot => !!s);

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,6,0.5)' }} />

      {/* Ambient forge glow — the light source sits off the top edge for the whole screen. */}
      <Animated.View style={[styles.ambient, { opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] }) }]}>
        <LinearGradient colors={['rgba(186, 134, 84,0.20)', 'rgba(186, 134, 84,0.05)', 'transparent'] as const} locations={[0, 0.45, 1] as const} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Top bar — Skip is live from the first frame, so the ceremony is never a trap. */}
      <View style={styles.topBar}>
        <Animated.Text style={[styles.eyebrow, { opacity: at(0, 800) }]} numberOfLines={1}>
          {r.name}
          {r.squadName ? ` · ${r.squadName}` : ''}
        </Animated.Text>
        <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel="Skip the ceremony" hitSlop={12} style={({ pressed }) => [styles.skip, pressed ? styles.pressed : null]}>
          <Text style={styles.skipText}>Skip</Text>
          <ChevronsGlyph />
        </Pressable>
      </View>

      {/* Headline — arrives after the champion has landed and been crowned. */}
      <View style={styles.headline} pointerEvents="none">
        <Animated.Text style={[styles.headEyebrow, { opacity: at(climax + BEATS.afterClimax.eyebrow, climax + BEATS.afterClimax.eyebrow + 700) }]}>
          {champions.length > 1 ? 'Co-Champions' : 'Season Champion'}
        </Animated.Text>
        <View style={styles.engraveClip}>
          <Animated.View style={{ width: engrave.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), overflow: 'hidden' }}>
            <Text style={styles.headName} numberOfLines={1}>
              {championNames}
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* Stage */}
      <View style={styles.stage}>
        {/* Countdown */}
        {BEATS.countdown.map((delay, i) => (
          <Animated.Text
            key={i}
            aria-hidden
            style={[
              styles.count,
              {
                opacity: t.interpolate({ inputRange: [0, delay, delay + 50, delay + 484, delay + BEATS.countdownDur, END], outputRange: [0, 0, 1, 1, 0, 0], extrapolate: 'clamp' }),
                transform: [
                  { scale: t.interpolate({ inputRange: [0, delay, delay + 149, delay + 484, delay + BEATS.countdownDur, END], outputRange: [1.7, 1.7, 1, 1, 0.85, 0.85], extrapolate: 'clamp' }) },
                ],
              },
            ]}
          >
            {3 - i}
          </Animated.Text>
        ))}

        {/* Victory halo — blooms exactly as the champion lands, then breathes. */}
        <Animated.View
          style={[
            styles.halo,
            {
              opacity: Animated.multiply(at(climax, climax + 1000), breathe.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })),
            },
          ]}
        >
          <LinearGradient colors={['rgba(186, 134, 84,0.34)', 'rgba(186, 134, 84,0.10)', 'transparent'] as const} locations={[0, 0.5, 1] as const} style={StyleSheet.absoluteFill} />
        </Animated.View>

        {/* Podium — the whole row eases back from 1.075 over the full reveal: a slow camera pull-back. */}
        <Animated.View
          style={[
            styles.podium,
            { transform: [{ scale: t.interpolate({ inputRange: [0, BEATS.zoomDur, END], outputRange: [1.075, 1, 1], extrapolate: 'clamp' }) }] },
          ]}
        >
          {display.map((s) => (
            <Column key={s.place} slot={s} t={t} end={END} climax={climax} ember={ember} type={r.type} unit={meta.unit} />
          ))}
        </Animated.View>
      </View>

      {/* CTA */}
      <Animated.View
        style={[
          styles.ctaWrap,
          {
            opacity: at(climax + BEATS.afterClimax.cta, climax + BEATS.afterClimax.cta + 800),
            transform: [{ translateY: at(climax + BEATS.afterClimax.cta, climax + BEATS.afterClimax.cta + 800).interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          },
        ]}
      >
        <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel="See full results" style={({ pressed }) => [styles.cta, pressed ? styles.pressed : null]}>
          <Text style={styles.ctaLabel}>See Full Results</Text>
          <ArrowGlyph />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function Column({
  slot: s,
  t,
  end,
  climax,
  ember,
  type,
  unit,
}: {
  slot: Slot;
  t: Animated.Value;
  end: number;
  climax: number;
  ember: Animated.Value;
  type: ChallengeResultsDetail['type'];
  unit: string;
}) {
  const cfg = SLOT[s.slot];
  const gold = s.slot === 0;
  const dur = gold ? BEATS.slamDur : BEATS.dropDur;
  const a = s.athleteAt;
  const p = s.pedestalAt;

  // The champion's entrance is heavier and slower — a slam with compression and rebound, against the
  // minor places' light drop-and-overshoot.
  const drop = gold
    ? t.interpolate({ inputRange: [0, a, a + dur * 0.74, a + dur * 0.84, a + dur, end], outputRange: [-96, -96, 9, -2, 0, 0], extrapolate: 'clamp' })
    : t.interpolate({ inputRange: [0, a, a + dur * 0.68, a + dur * 0.84, a + dur, end], outputRange: [-58, -58, 6, -3, 0, 0], extrapolate: 'clamp' });
  const dropScale = gold
    ? t.interpolate({ inputRange: [0, a, a + dur * 0.74, a + dur * 0.84, a + dur, end], outputRange: [1.16, 1.16, 0.96, 1.02, 1, 1], extrapolate: 'clamp' })
    : t.interpolate({ inputRange: [0, a, a + dur, end], outputRange: [1, 1, 1, 1], extrapolate: 'clamp' });
  const athleteOpacity = t.interpolate({ inputRange: [0, a, a + 90, end], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });

  const visible = s.athletes.slice(0, 2);
  const overflow = s.athletes.length - visible.length;

  return (
    <View style={styles.column}>
      <Animated.View style={[styles.athleteBlock, { opacity: athleteOpacity, transform: [{ translateY: drop }, { scale: dropScale }] }]}>
        {gold ? (
          <>
            {/* Impact bloom — invisible until the landing, then snaps and expands away. */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.flash,
                {
                  opacity: t.interpolate({ inputRange: [0, climax + 360, climax + 486, climax + 900, end], outputRange: [0, 0, 0.9, 0, 0], extrapolate: 'clamp' }),
                  transform: [{ scale: t.interpolate({ inputRange: [0, climax + 360, climax + 900, end], outputRange: [0.6, 0.6, 1.7, 1.7], extrapolate: 'clamp' }) }],
                },
              ]}
            >
              <LinearGradient colors={['rgba(230,202,156,0.55)', 'transparent'] as const} style={StyleSheet.absoluteFill} />
            </Animated.View>

            {/* Crown drops on as its own beat, after the champion has already landed. */}
            <Animated.View
              style={[
                styles.crown,
                {
                  opacity: t.interpolate({ inputRange: [0, climax + BEATS.afterClimax.crown, climax + BEATS.afterClimax.crown + 120, end], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' }),
                  transform: [
                    { translateY: t.interpolate({ inputRange: [0, climax + BEATS.afterClimax.crown, climax + BEATS.afterClimax.crown + 430, climax + BEATS.afterClimax.crown + 580, climax + BEATS.afterClimax.crown + 720, end], outputRange: [-42, -42, 4, -3, 0, 0], extrapolate: 'clamp' }) },
                    { scale: t.interpolate({ inputRange: [0, climax + BEATS.afterClimax.crown, climax + BEATS.afterClimax.crown + 430, end], outputRange: [0.8, 0.8, 1, 1], extrapolate: 'clamp' }) },
                  ],
                },
              ]}
            >
              <CrownGlyph size={34} />
            </Animated.View>

            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={[
                  styles.ember,
                  { bottom: 145 + i * 7, left: `${47 + i * 3}%`, width: 3 - i * 0.5, height: 3 - i * 0.5 },
                  {
                    opacity: ember.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 0.9, 0.35, 0] }),
                    transform: [
                      { translateY: ember.interpolate({ inputRange: [0, 1], outputRange: [0, -120] }) },
                      { translateX: ember.interpolate({ inputRange: [0, 1], outputRange: [0, [-14, 16, 4][i]] }) },
                      { scale: ember.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) },
                    ],
                  },
                ]}
              />
            ))}
          </>
        ) : null}

        <View style={styles.avatarRow}>
          {visible.map((athlete) => (
            <View key={athlete.userId} style={[styles.avatarRing, { borderColor: cfg.ring, borderRadius: flRadius.round }, cfg.glow ? styles.avatarGlow : null]}>
              <Avatar src={athlete.avatarUrl ?? undefined} name={athlete.name} size={visible.length > 1 ? cfg.avatar - 18 : cfg.avatar} />
            </View>
          ))}
        </View>
        {overflow > 0 ? <Text style={styles.overflowText}>+{overflow} more</Text> : null}

        <View style={styles.medal}>
          <MedalGlyph size={cfg.medalSize} color={cfg.medal} />
        </View>

        <View style={styles.nameRow}>
          <Text style={[styles.name, { fontSize: cfg.name }, gold ? styles.nameStrong : null, visible.some((x) => x.isSelf) ? styles.nameSelf : null]} numberOfLines={1}>
            {visible.map((x) => x.name).join(' & ')}
          </Text>
        </View>
        {visible.some((x) => x.isSelf) ? (
          <View style={styles.youPill}>
            <Text style={styles.youPillText}>You</Text>
          </View>
        ) : null}
        <Text style={styles.score}>
          {formatScore(type, visible[0]?.score ?? 0)} {unit}
        </Text>
      </Animated.View>

      {/* Pedestal grows up out of the floor. */}
      <Animated.View
        style={[
          styles.pedestal,
          { height: cfg.pedestal, borderColor: gold ? flColor.bronzeBorder : flColor.charcoal600 },
          gold ? styles.pedestalGold : null,
          {
            opacity: t.interpolate({ inputRange: [0, p, p + BEATS.pedestalDur * 0.7, end], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' }),
            transform: [{ scaleY: t.interpolate({ inputRange: [0, p, p + BEATS.pedestalDur, end], outputRange: [0.12, 0.12, 1, 1], extrapolate: 'clamp' }) }],
          },
        ]}
      >
        <LinearGradient
          colors={gold ? (['#3a2c1a', '#241a0f'] as const) : ([flColor.charcoal600, flColor.charcoal800] as const)}
          style={StyleSheet.absoluteFill}
        />
        <Text style={[styles.numeral, { fontSize: cfg.numeral, color: cfg.numeralColor }]}>{s.place}</Text>
      </Animated.View>
    </View>
  );
}

// ── glyphs ──
function CrownGlyph({ size = 34, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function MedalGlyph({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8.8 10.4L6 4h4l2 3.2L14 4h4l-2.8 6.4" />
      <Path d="M12 9.7a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6z" />
    </Svg>
  );
}
function ChevronsGlyph({ size = 13, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 5l7 7-7 7M13 5l7 7-7 7" />
    </Svg>
  );
}
function ArrowGlyph({ size = 16, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h13M12 5l7 7-7 7" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },

  ambient: { position: 'absolute', top: '-14%', alignSelf: 'center', width: 380, height: 380, borderRadius: flRadius.round, overflow: 'hidden' },

  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, zIndex: 6 },
  eyebrow: { flexShrink: 1, fontSize: 10, fontWeight: '700', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400 },
  skip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingLeft: 12 },
  skipText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },

  headline: { alignItems: 'center', paddingHorizontal: 24, zIndex: 4 },
  headEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze300 },
  engraveClip: { marginTop: 8, alignItems: 'center', overflow: 'hidden' },
  headName: { fontFamily: flFont.display, fontSize: 26, fontWeight: '700', letterSpacing: -0.3, color: flColor.cream100 },

  stage: { flex: 1, justifyContent: 'flex-end', zIndex: 2 },
  count: { position: 'absolute', top: '42%', alignSelf: 'center', fontFamily: flFont.display, fontSize: 96, fontWeight: '700', color: flColor.bronze300, textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 14 },
  halo: { position: 'absolute', bottom: 96, alignSelf: 'center', width: 300, height: 300, borderRadius: flRadius.round, overflow: 'hidden' },

  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, maxWidth: 360, width: '100%', alignSelf: 'center' },
  column: { flex: 1, alignItems: 'center', maxWidth: 120 },

  athleteBlock: { alignItems: 'center', paddingBottom: 10 },
  crown: { position: 'absolute', top: -30, zIndex: 3 },
  flash: { position: 'absolute', top: 30, width: 170, height: 170, borderRadius: flRadius.round, overflow: 'hidden' },
  ember: { position: 'absolute', borderRadius: flRadius.round, backgroundColor: flColor.bronze300, boxShadow: '0 0 6px rgba(186, 134, 84,0.8)' },
  avatarRow: { flexDirection: 'row', gap: 6 },
  avatarRing: { borderWidth: 2, padding: 2 },
  avatarGlow: { boxShadow: '0 0 26px rgba(186, 134, 84,0.5)' },
  overflowText: { marginTop: 4, fontSize: 10, color: flColor.gray600 },
  medal: { marginTop: 8 },
  nameRow: { marginTop: 6, maxWidth: 108 },
  name: { fontWeight: '500', textAlign: 'center', color: flColor.cream100 },
  nameStrong: { fontWeight: '700' },
  nameSelf: { color: flColor.bronze300, fontWeight: '700' },
  youPill: { marginTop: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  youPillText: { fontSize: 8, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.bronze300 },
  score: { marginTop: 4, fontSize: 11, color: flColor.gray600 },

  pedestal: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    transformOrigin: 'bottom',
  },
  /** Warm forged metal, lit from above by the athlete standing on it. */
  pedestalGold: { boxShadow: 'inset 0 1px 0 rgba(230,202,156,0.35), 0 -2px 14px rgba(186, 134, 84,0.30)' },
  numeral: { fontFamily: flFont.display, fontWeight: '700' },

  ctaWrap: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30, zIndex: 5 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    padding: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
    boxShadow: `${flShadow.glowSubtle}, ${flShadow.card}`,
  },
  ctaLabel: { fontSize: 15, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze300 },
});
