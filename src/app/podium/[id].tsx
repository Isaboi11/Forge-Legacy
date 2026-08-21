import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, FeTurbulence, Filter, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { initials } from '@/components/forge/composites/Avatar/AvatarGlyph';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { CHALLENGE_TYPES, fetchChallengeResults, formatScore, type ChallengeResultsDetail, type FinalStanding } from '@/data/challenges-live';
import { markPodiumSeen } from '@/lib/podium-seen';
import { svgStop } from '@/lib/svg-color';
import { useQuery } from '@/lib/useQuery';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

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
 * ── THE ONE DELTA LEFT AGAINST THE `.dc` ──
 * The `.dc` renders against the Visual Foundation's OLDER bronze ramp (`--fl-bronze-400: #BF8F4F`,
 * `--fl-bronze-300: #CDA063`); the app's `foundation.ts` is a deeper ramp (`#BA8654` / `#C99767`).
 * Every screen in the app uses the app ramp, so the podium uses it too — matching the `.dc`'s literal
 * rgba values here would make this the one screen wearing a different bronze. Palette reconciliation
 * is an app-wide job, not a podium job.
 */

/** `--fl-ease-out` — the design's single timing function, on all twelve keyframe blocks. */
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
/** CSS `ease-out` (the keyword), which only the ember loop uses. */
const EASE_OUT_CSS = Easing.bezier(0, 0, 0.58, 1);
/** Samples per keyframe segment. The native driver rejects an `easing` fn on `interpolate()`, so the
 *  curve gets baked into the range instead — 8 steps is well under a pixel at these distances. */
const SAMPLES = 8;

/** One CSS `@keyframes` stop: `[milliseconds on the master clock, value]`. */
type Frame = readonly [number, number];

/**
 * A `@keyframes` block read off the master clock: held flat before the first stop and after the last,
 * with the easing applied BETWEEN each pair — which is what a CSS `animation-timing-function` does by
 * default. Interpolating the stops linearly (what this screen used to do) is the difference between
 * the design's snap and a dead mechanical slide.
 */
function keyframes(t: Animated.Value, frames: readonly Frame[], end: number, easing: (v: number) => number = EASE_OUT) {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  const push = (input: number, output: number) => {
    // Animated demands a strictly increasing input range; coincident stops collapse to the first.
    if (inputRange.length > 0 && input <= inputRange[inputRange.length - 1]) return;
    inputRange.push(input);
    outputRange.push(output);
  };

  push(0, frames[0][1]);
  push(frames[0][0], frames[0][1]);
  for (let i = 1; i < frames.length; i += 1) {
    const [fromMs, fromV] = frames[i - 1];
    const [toMs, toV] = frames[i];
    for (let s = 1; s <= SAMPLES; s += 1) {
      const p = s / SAMPLES;
      push(fromMs + (toMs - fromMs) * p, fromV + (toV - fromV) * easing(p));
    }
  }
  push(end, frames[frames.length - 1][1]);

  return t.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });
}

/** Beats measured from the champion's landing, so the climax stays the anchor at any field size. */
const BEATS = {
  countdown: [300, 900, 1500],
  countdownDur: 620,
  zoomDur: 5200,
  afterClimax: { crown: 550, eyebrow: 750, name: 950, cta: 1300, end: 2100 },
} as const;

/** Gold / silver / bronze TIER, indexed by podium slot — never by place, so ties can't shift the look. */
const SLOT = [
  {
    avatar: 78,
    avatarFs: 28,
    ring: flColor.bronze400,
    glow: '0 0 26px rgba(186, 134, 84, 0.5)',
    medal: flColor.bronze300,
    medalSize: 24,
    name: 15,
    dropDur: 900,
    pedestal: 128,
    pedestalDur: 560,
    pedestalBorder: flColor.bronzeBorder,
    pedestalFill: ['#3a2c1a', '#241a0f'] as const,
    pedestalShadow: 'inset 0 1px 0 rgba(186, 134, 84, 0.35), 0 -2px 14px rgba(186, 134, 84, 0.18)',
    numeral: 30,
    numeralColor: flColor.bronze300,
  },
  {
    avatar: 60,
    avatarFs: 21,
    ring: 'rgba(190,193,199,0.75)',
    glow: '0 0 14px rgba(185,188,194,0.18)',
    medal: '#C7CAD0',
    medalSize: 20,
    name: 13.5,
    dropDur: 640,
    pedestal: 92,
    pedestalDur: 520,
    pedestalBorder: flColor.charcoal500,
    pedestalFill: [flColor.charcoal600, flColor.charcoal800] as const,
    pedestalShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
    numeral: 24,
    numeralColor: flColor.gray400,
  },
  {
    avatar: 56,
    avatarFs: 19,
    ring: 'rgba(196,140,90,0.7)',
    glow: '0 0 12px rgba(176,124,78,0.16)',
    medal: '#B07C4E',
    medalSize: 20,
    name: 13,
    dropDur: 640,
    pedestal: 68,
    pedestalDur: 520,
    pedestalBorder: flColor.charcoal500,
    pedestalFill: [flColor.charcoal600, flColor.charcoal800] as const,
    pedestalShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
    numeral: 22,
    numeralColor: flColor.gray600,
  },
] as const;

/** The design's three avatar tints, picked per athlete so a podium is never three identical discs. */
const TINT = [
  { cx: '42%', cy: '32%', from: '#4a3826', to: '#1c1510' },
  { cx: '45%', cy: '35%', from: '#34302a', to: '#17130f' },
  { cx: '40%', cy: '30%', from: '#40301f', to: '#17120c' },
] as const;

/** The three embers, verbatim: offset, size, drift, loop length and the delay after the climax. */
const EMBERS = [
  { bottom: 150, left: '47%', size: 3, dx: -14, dur: 2600, after: 300, shadow: '0 0 6px 1px rgba(205,160,99,0.7)' },
  { bottom: 160, left: '53%', size: 2.5, dx: 16, dur: 3000, after: 700, shadow: '0 0 6px 1px rgba(205,160,99,0.6)' },
  { bottom: 145, left: '50%', size: 2, dx: 4, dur: 3400, after: 1100, shadow: '0 0 5px 1px rgba(205,160,99,0.6)' },
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
        <Backdrop />
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
      <Backdrop />
    </View>
  );
}

/** `forge-bg-2.png` under the design's two-stop darkening ramp on the cooler `#060708` base. */
function Backdrop() {
  return (
    <ScreenBackground
      image={SCREEN_BG.bg2}
      base="#060708"
      overlay={{ colors: ['rgba(6,7,8,0.42)', 'rgba(4,5,6,0.60)'], locations: [0, 1] }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Ceremony({ result: r, onDone }: { result: ChallengeResultsDetail; onDone: () => void }) {
  const meta = CHALLENGE_TYPES[r.type];
  const insets = useSafeAreaInsets();

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
  const [breatheSlow] = useState(() => new Animated.Value(0));
  const [embers] = useState(() => EMBERS.map(() => new Animated.Value(0)));
  const [reduced, setReduced] = useState<boolean | null>(null);
  // The champion's name is wiped on by CLIP-PATH in the design, which RN cannot interpolate. Measured
  // off a hidden copy, then an explicit numeric width — a percentage width against a content-sized
  // parent resolves to `auto` in Yoga, so the wipe never clipped and the name sat on screen from the
  // very first frame, spoiling its own reveal.
  const [nameWidth, setNameWidth] = useState(0);

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
      breatheSlow.setValue(0.7);
      return undefined;
    }

    const clock = Animated.timing(t, { toValue: END, duration: END, easing: Easing.linear, useNativeDriver: true });
    const wipe = Animated.sequence([
      Animated.delay(climax + BEATS.afterClimax.name),
      Animated.timing(engrave, { toValue: 1, duration: 780, easing: EASE_OUT, useNativeDriver: false }),
    ]);
    /** `pGlow` — the design breathes the halo on a 4s cycle and the ambient light on 5.5s. */
    const glow = (v: Animated.Value, cycle: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: cycle / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: cycle / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
    const halo = glow(breathe, 4000);
    const ambient = glow(breatheSlow, 5500);
    // Each ember runs its own loop at its own length — sharing one clock put all three in lockstep,
    // which reads as three synchronised dots rather than a drift of sparks.
    const emberLoops = embers.map((v, i) =>
      Animated.loop(Animated.timing(v, { toValue: 1, duration: EMBERS[i].dur, easing: EASE_OUT_CSS, useNativeDriver: true })),
    );

    clock.start();
    wipe.start();
    halo.start();
    ambient.start();
    const emberTimers = emberLoops.map((loop, i) => setTimeout(() => loop.start(), climax + EMBERS[i].after));

    return () => {
      clock.stop();
      wipe.stop();
      halo.stop();
      ambient.stop();
      emberLoops.forEach((loop) => loop.stop());
      emberTimers.forEach(clearTimeout);
    };
  }, [reduced, t, engrave, breathe, breatheSlow, embers, climax, END]);

  if (reduced === null) {
    return (
      <View style={styles.root}>
        <Backdrop />
      </View>
    );
  }

  const at = (from: number, to: number) => keyframes(t, [[from, 0], [to, 1]], END);

  const champions = slots[0]?.athletes ?? [];
  const championNames = champions.map((c) => c.name).join(' & ');
  // Display order puts silver left, gold centre, bronze right — the data stays in finishing order.
  const display = [slots[1], slots[0], slots[2]].filter((s): s is Slot => !!s);

  return (
    <View style={styles.root}>
      <Backdrop />

      {/* Ambient forge glow — the light source sits off the top edge for the whole screen. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.ambient, { opacity: breatheSlow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] }) }]}
      >
        <Bloom id="podium-ambient" stops={[[0, 'rgba(186, 134, 84,0.18)'], [0.66, 'rgba(186, 134, 84,0)']]} />
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
          {/* Hidden measuring copy — it alone sizes the block, so the wipe can't feed back into it. */}
          <Text
            style={[styles.headName, styles.headMeasure]}
            numberOfLines={1}
            onLayout={(e) => setNameWidth(e.nativeEvent.layout.width)}
          >
            {championNames}
          </Text>
          <Animated.View
            style={[
              styles.headWipe,
              { width: nameWidth > 0 ? engrave.interpolate({ inputRange: [0, 1], outputRange: [0, nameWidth] }) : 0 },
            ]}
          >
            <Text style={[styles.headName, { width: nameWidth || undefined }]} numberOfLines={1}>
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
                opacity: keyframes(t, [[delay, 0], [delay + 149, 1], [delay + 484, 1], [delay + BEATS.countdownDur, 0]], END),
                transform: [
                  // `translate(-50%,-50%)` — the design centres the numeral ON 42%, not below it.
                  { translateY: -COUNT_LINE / 2 },
                  { scale: keyframes(t, [[delay, 1.7], [delay + 149, 1], [delay + 484, 1], [delay + BEATS.countdownDur, 0.85]], END) },
                ],
              },
            ]}
          >
            {3 - i}
          </Animated.Text>
        ))}

        {/* Victory halo — blooms exactly as the champion lands, then breathes. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            { opacity: Animated.multiply(at(climax, climax + 500), breathe.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] })) },
          ]}
        >
          <Bloom
            id="podium-halo"
            stops={[[0, 'rgba(186, 134, 84,0.32)'], [0.42, 'rgba(186, 134, 84,0.10)'], [0.68, 'rgba(186, 134, 84,0)']]}
          />
        </Animated.View>

        {/* Podium — the whole row eases back from 1.075 over the full reveal: a slow camera pull-back. */}
        <Animated.View style={[styles.podium, { transform: [{ scale: keyframes(t, [[0, 1.075], [BEATS.zoomDur, 1]], END) }] }]}>
          {display.map((s) => (
            <Column key={s.place} slot={s} t={t} end={END} climax={climax} type={r.type} unit={meta.unit} />
          ))}
        </Animated.View>

        {/* Embers rising past the champion — last, so they drift IN FRONT of him as the design has them. */}
        {EMBERS.map((e, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              styles.ember,
              { bottom: e.bottom, left: e.left, width: e.size, height: e.size, boxShadow: e.shadow },
              {
                opacity: embers[i].interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.9, 0] }),
                transform: [
                  { translateY: embers[i].interpolate({ inputRange: [0, 1], outputRange: [0, -120] }) },
                  { translateX: embers[i].interpolate({ inputRange: [0, 1], outputRange: [0, e.dx] }) },
                  { scale: embers[i].interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <Animated.View
        style={[
          styles.ctaWrap,
          { paddingBottom: 26 + insets.bottom },
          {
            opacity: at(climax + BEATS.afterClimax.cta, climax + BEATS.afterClimax.cta + 800),
            transform: [{ translateY: keyframes(t, [[climax + BEATS.afterClimax.cta, 14], [climax + BEATS.afterClimax.cta + 800, 0]], END) }],
          },
        ]}
      >
        <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel="See full results" style={({ pressed }) => [styles.cta, pressed ? styles.pressed : null]}>
          {/* `--fl-bronze-fill` — the forged-metal button, never a flat tint. */}
          <LinearGradient
            colors={flGradient.bronzeFill.colors}
            locations={flGradient.bronzeFill.locations}
            start={flGradient.bronzeFill.start}
            end={flGradient.bronzeFill.end}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.ctaLabel}>See Full Results</Text>
          <ArrowGlyph />
        </Pressable>
      </Animated.View>

      {/* Film grain over the whole frame. */}
      <Grain />
    </View>
  );
}

function Column({
  slot: s,
  t,
  end,
  climax,
  type,
  unit,
}: {
  slot: Slot;
  t: Animated.Value;
  end: number;
  climax: number;
  type: ChallengeResultsDetail['type'];
  unit: string;
}) {
  const cfg = SLOT[s.slot];
  const gold = s.slot === 0;
  const d = cfg.dropDur;
  const a = s.athleteAt;
  const p = s.pedestalAt;

  // The champion's entrance is heavier and slower — `pSlam`, with compression and rebound, against the
  // minor places' light `pDrop`. The fractions are the design's keyframe stops.
  const drop = gold
    ? keyframes(t, [[a, -96], [a + d * 0.74, 9], [a + d * 0.88, -2], [a + d, 0]], end)
    : keyframes(t, [[a, -58], [a + d * 0.68, 6], [a + d * 0.84, -3], [a + d, 0]], end);
  const dropScale = gold
    ? keyframes(t, [[a, 1.16], [a + d * 0.74, 0.96], [a + d * 0.88, 1.02], [a + d, 1]], end)
    : keyframes(t, [[a, 1], [a + d, 1]], end);
  const athleteOpacity = keyframes(t, [[a, 0], [a + d * (gold ? 0.56 : 0.68), 1]], end);

  const visible = s.athletes.slice(0, 2);
  const overflow = s.athletes.length - visible.length;
  const self = visible.some((x) => x.isSelf);

  const crownAt = climax + BEATS.afterClimax.crown;

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
                  opacity: keyframes(t, [[climax + 360, 0], [climax + 486, 0.9], [climax + 900, 0]], end),
                  transform: [{ scale: keyframes(t, [[climax + 360, 0.4], [climax + 486, 1.05], [climax + 900, 1.7]], end) }],
                },
              ]}
            >
              <Bloom id="podium-flash" stops={[[0, 'rgba(230,202,156,0.55)'], [0.66, 'rgba(230,202,156,0)']]} />
            </Animated.View>

            {/* Crown drops on as its own beat, after the champion has already landed. */}
            <Animated.View
              style={[
                styles.crown,
                {
                  opacity: keyframes(t, [[crownAt, 0], [crownAt + 374, 1]], end),
                  transform: [
                    { translateY: keyframes(t, [[crownAt, -42], [crownAt + 374, 3], [crownAt + 490, -5], [crownAt + 605, 2], [crownAt + 720, 0]], end) },
                    { scale: keyframes(t, [[crownAt, 0.8], [crownAt + 374, 1], [crownAt + 490, 1.03], [crownAt + 605, 1], [crownAt + 720, 1]], end) },
                  ],
                },
              ]}
            >
              <CrownGlyph size={42} />
            </Animated.View>
          </>
        ) : null}

        <View style={styles.avatarRow}>
          {visible.map((athlete) => (
            <PodiumAvatar
              key={athlete.userId}
              size={visible.length > 1 ? cfg.avatar - 18 : cfg.avatar}
              fontSize={visible.length > 1 ? cfg.avatarFs - 6 : cfg.avatarFs}
              ring={cfg.ring}
              glow={cfg.glow}
              seed={athlete.name.length + s.place}
              src={athlete.avatarUrl}
              name={athlete.name}
            />
          ))}
        </View>
        {overflow > 0 ? <Text style={styles.overflowText}>+{overflow} more</Text> : null}

        <View style={styles.medal}>
          <MedalGlyph size={cfg.medalSize} color={cfg.medal} />
        </View>

        {/* Name and the You pill share one row — the design never stacks them. */}
        <View style={styles.nameRow}>
          <Text style={[styles.name, { fontSize: cfg.name }, gold ? styles.nameStrong : null, self ? styles.nameSelf : null]} numberOfLines={1}>
            {visible.map((x) => x.name).join(' & ')}
          </Text>
          {self ? (
            <View style={styles.youPill}>
              <Text style={styles.youPillText}>You</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.score}>
          {formatScore(type, visible[0]?.score ?? 0)} {unit}
        </Text>
      </Animated.View>

      {/* Pedestal grows up out of the floor. */}
      <Animated.View
        style={[
          styles.pedestal,
          { height: cfg.pedestal, borderColor: cfg.pedestalBorder, boxShadow: cfg.pedestalShadow },
          {
            opacity: keyframes(t, [[p, 0], [p + cfg.pedestalDur * 0.7, 1]], end),
            transform: [{ scaleY: keyframes(t, [[p, 0.12], [p + cfg.pedestalDur, 1]], end) }],
          },
        ]}
      >
        <LinearGradient colors={cfg.pedestalFill} style={StyleSheet.absoluteFill} />
        {/* `line-height:1` — the numeral has to hug the pedestal's 12px top padding, not float below it. */}
        <Text style={[styles.numeral, { fontSize: cfg.numeral, lineHeight: cfg.numeral, color: cfg.numeralColor }]}>{s.place}</Text>
      </Animated.View>
    </View>
  );
}

/**
 * The podium disc: a 2px place-tiered ring at the EXACT design diameter (border-box, so the champion
 * is 78px across and not 86), the tinted well behind the initials, and the inset that seats the face
 * into the metal — painted OVER the photo, so a real avatar gets the same seating the initials do.
 */
function PodiumAvatar({
  size,
  fontSize,
  ring,
  glow,
  seed,
  src,
  name,
}: {
  size: number;
  fontSize: number;
  ring: string;
  glow: string;
  seed: number;
  src: string | null;
  name: string;
}) {
  const i = seed % TINT.length;
  const tint = TINT[i];
  return (
    <View style={{ width: size, height: size, borderRadius: flRadius.round, boxShadow: glow }}>
      <View style={[styles.avatarDisc, { borderRadius: flRadius.round, borderColor: ring }]}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient id={`podium-tint-${i}`} cx={tint.cx} cy={tint.cy} r="72%">
              <Stop offset="0" stopColor={tint.from} stopOpacity={1} />
              <Stop offset="1" stopColor={tint.to} stopOpacity={1} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#podium-tint-${i})`} />
        </Svg>
        {src ? (
          <Image source={{ uri: src }} accessibilityLabel={name} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Text style={[styles.avatarInitials, { fontSize }]} accessibilityLabel={`${name}, no photo`}>
            {initials(name)}
          </Text>
        )}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.avatarInset, { borderRadius: flRadius.round }]} />
      </View>
    </View>
  );
}

/**
 * A `radial-gradient(circle, …)`. `expo-linear-gradient` has no radial, and the vertical stand-in this
 * screen used read as a band across the stage rather than a bloom around the champion. `r="70.71%"` is
 * the CSS `farthest-corner` default for a square box, which makes the stop offsets the design's own.
 */
function Bloom({ id, stops }: { id: string; stops: readonly (readonly [number, string])[] }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="70.71%">
          {stops.map(([offset, css]) => {
            const s = svgStop(css);
            return <Stop key={offset} offset={offset} stopColor={s.color} stopOpacity={s.opacity} />;
          })}
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * The design's `feTurbulence` film grain over the whole frame. The wrapper carries `pointerEvents` and
 * the z-index: every other child of the ceremony sets an explicit `zIndex`, so an unranked grain layer
 * would slide UNDER the podium instead of lying over it — and a grain that swallowed taps would take
 * both Skip and the CTA with it.
 */
function Grain() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.grain]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Filter id="podium-grain">
            <FeTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
          </Filter>
        </Defs>
        <Rect width="100%" height="100%" filter="url(#podium-grain)" />
      </Svg>
    </View>
  );
}

// ── glyphs ──
function CrownGlyph({ size = 42, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function MedalGlyph({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={14.5} r={4.8} />
      <Circle cx={12} cy={14.5} r={1.8} />
      <Path d="M8.8 10.4L6 4h4l2 3.2L14 4h4l-2.8 6.4" />
    </Svg>
  );
}
function ChevronsGlyph({ size = 15, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 5l7 7-7 7M13 5l7 7-7 7" />
    </Svg>
  );
}
function ArrowGlyph({ size = 18, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

/** 96px display type; the line box the countdown's `translate(-50%)` centring is measured against. */
const COUNT_LINE = 116;

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },

  ambient: { position: 'absolute', top: '-14%', alignSelf: 'center', width: 380, height: 380, borderRadius: flRadius.round, overflow: 'hidden' },
  grain: { opacity: 0.06, zIndex: 20 },

  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 10, zIndex: 6 },
  eyebrow: { flexShrink: 1, fontSize: 10, fontWeight: '700', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400 },
  skip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 12 },
  skipText: { fontSize: 12, fontWeight: '600', color: flColor.gray600 },

  headline: { alignItems: 'center', paddingTop: 6, paddingHorizontal: 24, zIndex: 4 },
  headEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.bronze300 },
  engraveClip: { marginTop: 5 },
  headWipe: { position: 'absolute', top: 0, left: 0, bottom: 0, overflow: 'hidden' },
  headMeasure: { opacity: 0 },
  headName: { fontFamily: flFont.display, fontSize: 26, fontWeight: '700', letterSpacing: -0.4, lineHeight: 29, color: flColor.cream100 },

  stage: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 14, zIndex: 2 },
  count: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
    fontFamily: flFont.display,
    fontSize: 96,
    lineHeight: COUNT_LINE,
    fontWeight: '700',
    color: flColor.bronze300,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  halo: { position: 'absolute', bottom: 96, alignSelf: 'center', width: 300, height: 300, borderRadius: flRadius.round, overflow: 'hidden' },
  ember: { position: 'absolute', borderRadius: flRadius.round, backgroundColor: flColor.bronze300 },

  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, maxWidth: 360, width: '100%', alignSelf: 'center', marginBottom: 30 },
  column: { flex: 1, alignItems: 'center' },

  athleteBlock: { alignItems: 'center' },
  crown: { position: 'absolute', top: -30, zIndex: 3, filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.7))' },
  /** `translate(-50%,-50%)` on a 170px bloom — its CENTRE sits at the design's `top`, not its edge. */
  flash: { position: 'absolute', top: -55, width: 170, height: 170, borderRadius: flRadius.round, overflow: 'hidden' },
  avatarRow: { flexDirection: 'row', gap: 6 },
  avatarDisc: { flex: 1, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarInset: { boxShadow: 'inset 0 1px 5px rgba(0,0,0,0.55)' },
  avatarInitials: { fontFamily: flFont.display, fontWeight: '700', color: flColor.bronze300 },
  overflowText: { marginTop: 4, fontSize: 10, color: flColor.gray600 },
  medal: { marginTop: 9 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, maxWidth: 108 },
  name: { flexShrink: 1, fontWeight: '500', textAlign: 'center', color: flColor.cream100 },
  nameStrong: { fontWeight: '700' },
  nameSelf: { color: flColor.bronze300, fontWeight: '700' },
  youPill: { flexGrow: 0, flexShrink: 0, paddingHorizontal: 6, paddingVertical: 1, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  youPillText: { fontSize: 8, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze300 },
  score: { marginTop: 2, fontSize: 11, fontWeight: '600', color: flColor.gray600 },

  pedestal: {
    width: '100%',
    marginTop: 12,
    alignItems: 'center',
    // The numeral is pinned near the TOP of the pedestal face, not floated in the middle of it.
    justifyContent: 'flex-start',
    paddingTop: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    transformOrigin: 'bottom',
  },
  numeral: { fontFamily: flFont.display, fontWeight: '700', includeFontPadding: false },

  ctaWrap: { paddingHorizontal: 24, zIndex: 5 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: flRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: flColor.bronzeMetalBorder,
    boxShadow: `${flShadow.glowSubtle}, ${flShadow.card}`,
  },
  ctaLabel: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3, color: flColor.bronze300 },
});
