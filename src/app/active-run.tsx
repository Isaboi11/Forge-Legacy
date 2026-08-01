import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { useUnits } from '@/lib/settings';
import { useRunTracker } from '@/hooks/useRunTracker';
import { saveActivity } from '@/domain/workout/save';
import { ACTIVITY_TYPE, fetchPriorSessions } from '@/data/runs-live';
import {
  ACTIVITY,
  averagePaceSec,
  clampStep,
  cueLabel,
  currentPaceSec,
  currentSpeedMph,
  distanceLabel,
  distanceLabelLong,
  fmtClock,
  fmtPace,
  goalProgress,
  paceLabel,
  personalBests,
  routePath,
  sustainedCue,
  speedLabel,
  toDistance,
  toPace,
  toSpeed,
  totalMiles,
  type ActivityKind,
} from '@/domain/run/run-core';

/**
 * Active Run — built to `Forge Active Run.dc.html`.
 *
 * Three phases in one route (setup → live → complete) and three activity types off one param, exactly as
 * the design has it. What differs is that this one measures.
 *
 * ══ THE DESIGN SIMULATED EVERY NUMBER ══
 *
 * Its clock added `1/480` of a mile per second — precisely 8:00/mi, forever — and its live pace was
 * `480 + 24·sin(elapsed/5)`. Nothing was read from a device. That is the correct choice for a design
 * file and the wrong one for an app, so all of it is replaced by `expo-location` and the pure functions
 * in `domain/run/run-core.ts` (36 tests), which handle the parts simulation never has to: fixes that
 * arrive inaccurate, a phone drifting at a traffic light, a signal that recovers a block away.
 *
 * ══ THE DELIBERATE DELTAS ══
 *
 *   · THE ROUTE IS THE ROUTE. The design drew three unrelated hardcoded paths — one live, a ghost
 *     duplicate under it, and a different, more elaborate one on the completion screen — and its position
 *     dot sat at the start of the path forever while the line filled itself in. So the run you watched
 *     was not the run you were shown, and neither was the run you took. Both maps now plot the recorded
 *     track (`routePath`), and the marker is the newest point.
 *   · FINISH IS CONFIRMED. It was the one unguarded destructive action in the app — a single tap ended
 *     the run irreversibly, while deleting a template or sealing a chapter both ask first.
 *   · "VIEW RECORD" SAVES FIRST. In the design only the seal logged the session, so anyone who tapped
 *     View Record instead of holding lost the run entirely. Both paths now persist; the seal is the
 *     ceremony, not the save.
 *   · PERSONAL BESTS ARE COMPUTED. "11 sec faster than best" was a hardcoded string shown on any finish,
 *     including a 0.02-mile one, and the real gate required a distance goal — so an open run could never
 *     earn a best however far it went. Now measured against the athlete's own prior sessions of the same
 *     kind, open runs included, and withheld entirely when there is no history to beat.
 *   · THE PACE CUE HOLDS STILL. Off the raw signal it flipped label every couple of seconds. The pace is
 *     a 30-second trailing window, and `sustainedCue` only reports off-target when that window and a
 *     settled 75-second one agree — stability derived from the data rather than from remembering the
 *     last answer, which would mean reading a ref during render.
 *   · NO CONNECTED WATCH. The design offers a Phone GPS / Connected Watch segment; there is no watch
 *     integration to select, so a control that changes nothing is not shipped. What is shipped in its
 *     place is the honest limit: this tracks in the foreground.
 *   · The dead `targetType` prop and its unused `TARGET_SEC` are dropped rather than carried.
 */

const KINDS: ActivityKind[] = ['run', 'walk', 'bike'];
const HOLD_MS = 900;
const HOLD_TICK_MS = 16;

function Glyph({ kind, size = 40 }: { kind: ActivityKind; size?: number }) {
  const p = { fill: 'none' as const, stroke: flColor.bronze400, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'bike') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={5.5} cy={17.5} r={3.5} {...p} /><Circle cx={18.5} cy={17.5} r={3.5} {...p} />
        <Path d="M5.5 17.5l4-9h5l4 9M9.5 8.5h5" {...p} />
      </Svg>
    );
  }
  if (kind === 'walk') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={13} cy={4} r={1.8} {...p} />
        <Path d="M9 21l2.5-6 2-2.5-1-4.5-3 2-1 3M13.5 12.5l2 3 1 5.5" {...p} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={15} cy={4} r={1.8} {...p} />
      <Path d="M5 20l4-3 1.5-4.5-2-4 4-2 2 3.5 3 1.5M10.5 12.5l3.5 2 1 5.5" {...p} />
    </Svg>
  );
}

export default function ActiveRunScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const kind: ActivityKind = KINDS.includes(type as ActivityKind) ? (type as ActivityKind) : 'run';
  const cfg = ACTIVITY[kind];
  const { units } = useUnits();
  const { showToast } = useToast();

  const [phase, setPhase] = useState<'start' | 'live' | 'finish'>('start');
  const [goalOpen, setGoalOpen] = useState(false);
  const [targetMi, setTargetMi] = useState(cfg.targetMi);
  const [paceOn, setPaceOn] = useState(false);
  const [paceTarget, setPaceTarget] = useState(cfg.paceDefault);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [sealed, setSealed] = useState(false);
  const [hold, setHold] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const tracker = useRunTracker(kind);
  const { data: priors } = useQuery(() => fetchPriorSessions(kind), [kind]);

  const mi = totalMiles(tracker.track);
  const el = tracker.elapsedSec;
  const target = goalOpen ? null : targetMi;
  const progress = goalProgress(mi, target);

  const avgSec = averagePaceSec(mi, el);
  const curSec = currentPaceSec(tracker.track);
  const curMph = currentSpeedMph(tracker.track);

  // Stable without memory: `sustainedCue` requires a responsive and a settled window to agree before it
  // reports off-target, so the pill can't flicker the way the design's raw-signal version did.
  const cue = sustainedCue(tracker.track, paceTarget, cfg.speed);

  useEffect(() => () => { if (holdTimer.current) clearInterval(holdTimer.current); }, []);

  const dUnit = distanceLabel(units);
  const distStr = toDistance(mi, units).toFixed(2);
  const targetStr = target == null ? '' : toDistance(target, units).toFixed(cfg.step < 1 ? 1 : 0);
  const avgStr = cfg.speed
    ? avgSec == null ? '--' : toSpeed(3600 / avgSec, units).toFixed(1)
    : fmtPace(avgSec == null ? null : toPace(avgSec, units));
  const curStr = cfg.speed
    ? curMph == null ? '--' : toSpeed(curMph, units).toFixed(1)
    : fmtPace(curSec == null ? null : toPace(curSec, units));

  // No useMemo: react-compiler is on and memoizes this itself. Hand-written memoization here made it
  // bail out of optimizing the whole component ("existing memoization could not be preserved").
  const bests = phase === 'finish' ? personalBests(mi, el, priors ?? [], kind, units) : [];

  // ── actions ────────────────────────────────────────────────────────────────
  const begin = async () => {
    const ok = await tracker.start();
    if (ok) setPhase('live');
  };

  /** Both the seal and "View Record" come through here — the run is saved exactly once, either way. */
  const persist = async (): Promise<string | null> => {
    if (savedId) return savedId;
    if (mi <= 0) return null;
    const { workoutId } = await saveActivity({
      activityType: ACTIVITY_TYPE[kind],
      distanceMi: +mi.toFixed(3),
      durationSec: el,
    });
    setSavedId(workoutId);
    return workoutId;
  };

  const doFinish = () => {
    setConfirmFinish(false);
    tracker.stop();
    setPhase('finish');
  };

  const completeSeal = async () => {
    if (sealed || saving) return;
    setSaving(true);
    try {
      await persist();
      setSealed(true);
      setHold(1);
      setTimeout(() => router.replace('/(tabs)'), 850);
    } catch (e) {
      setHold(0);
      showToast(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const startHold = () => {
    if (sealed || holdTimer.current) return;
    // Counted in ticks rather than measured against a captured `Date.now()` — the clock read would be an
    // impure call in the render body, which react-compiler rejects. Over 900ms the drift is invisible,
    // and unlike the run's own timer this is a progress fill, not a measurement anyone will keep.
    let ms = 0;
    holdTimer.current = setInterval(() => {
      ms += HOLD_TICK_MS;
      const p = Math.min(1, ms / HOLD_MS);
      setHold(p);
      if (p >= 1) {
        if (holdTimer.current) clearInterval(holdTimer.current);
        holdTimer.current = null;
        void completeSeal();
      }
    }, HOLD_TICK_MS);
  };

  const endHold = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    if (!sealed) setHold(0);
  };

  const viewRecord = async () => {
    setSaving(true);
    try {
      const id = await persist();
      // Saving FIRST is the whole point: in the design this path logged nothing, so choosing to look at
      // your run instead of holding the seal threw the run away.
      if (id) router.replace({ pathname: '/activity/[id]', params: { id } });
      else router.replace('/activity-history');
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    tracker.stop();
    router.back();
  };

  // ── phase 1 · setup ────────────────────────────────────────────────────────
  if (phase === 'start') {
    const denied = tracker.status === 'denied' || tracker.status === 'unavailable';
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
        <AppBar onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} title={<Text style={styles.barTitle}>{cfg.eyebrow}</Text>} />

        <ScrollView contentContainerStyle={styles.setup} showsVerticalScrollIndicator={false}>
          <Glyph kind={kind} />

          <View style={styles.segment}>
            <Pressable
              onPress={() => setGoalOpen(false)}
              accessibilityRole="button"
              accessibilityState={{ selected: !goalOpen }}
              accessibilityLabel="Set a distance target"
              style={[styles.seg, !goalOpen ? styles.segOn : null]}
            >
              <Text style={[styles.segText, !goalOpen ? styles.segTextOn : null]}>Set Distance</Text>
            </Pressable>
            <Pressable
              onPress={() => setGoalOpen(true)}
              accessibilityRole="button"
              accessibilityState={{ selected: goalOpen }}
              accessibilityLabel="Open session — just start and track"
              style={[styles.seg, goalOpen ? styles.segOn : null]}
            >
              <Text style={[styles.segText, goalOpen ? styles.segTextOn : null]}>Open</Text>
            </Pressable>
          </View>

          {goalOpen ? (
            <Text style={styles.openTitle}>Open {cfg.verb}</Text>
          ) : (
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setTargetMi((v) => clampStep(v - cfg.step, cfg.minMi, cfg.maxMi))}
                accessibilityRole="button"
                accessibilityLabel="Decrease distance"
                style={({ pressed }) => [styles.stepBtn, pressed ? styles.pressed : null]}
              >
                <Text style={styles.stepGlyph}>−</Text>
              </Pressable>
              <View style={styles.stepValue}>
                <Text style={styles.stepNumber}>{toDistance(targetMi, units).toFixed(cfg.step < 1 ? 1 : 0)}</Text>
                <Text style={styles.stepUnit}>{distanceLabelLong(units).toUpperCase()}</Text>
              </View>
              <Pressable
                onPress={() => setTargetMi((v) => clampStep(v + cfg.step, cfg.minMi, cfg.maxMi))}
                accessibilityRole="button"
                accessibilityLabel="Increase distance"
                style={({ pressed }) => [styles.stepBtn, pressed ? styles.pressed : null]}
              >
                <Text style={styles.stepGlyph}>+</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.goalSub}>
            {goalOpen ? 'Just start — we’ll track distance, pace, and time as you go.' : 'We’ll mark the moment you reach your target.'}
          </Text>

          <Pressable
            onPress={() => setPaceOn((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ selected: paceOn }}
            accessibilityLabel={`${paceOn ? 'Remove' : 'Add'} target ${cfg.speed ? 'speed' : 'pace'}`}
            style={[styles.pill, paceOn ? styles.pillOn : null]}
          >
            <Text style={[styles.pillText, paceOn ? styles.pillTextOn : null]}>
              {paceOn ? `Target ${cfg.speed ? 'speed' : 'pace'}` : `Add target ${cfg.speed ? 'speed' : 'pace'}`}
            </Text>
          </Pressable>

          {paceOn ? (
            <View style={styles.paceStepper}>
              <Pressable
                onPress={() => setPaceTarget((v) => clampStep(v - cfg.paceStep, cfg.paceMin, cfg.paceMax))}
                accessibilityRole="button"
                /* On foot, MORE seconds per mile is slower; on a bike, more mph is faster. The label has
                   to follow the meaning, not the arithmetic. */
                accessibilityLabel={cfg.speed ? 'Lower target speed' : 'Faster target pace'}
                style={({ pressed }) => [styles.stepBtnSm, pressed ? styles.pressed : null]}
              >
                <Text style={styles.stepGlyphSm}>−</Text>
              </Pressable>
              <View style={styles.stepValue}>
                <Text style={styles.paceNumber}>
                  {cfg.speed ? toSpeed(paceTarget, units).toFixed(1) : fmtPace(toPace(paceTarget, units))}
                </Text>
                <Text style={styles.stepUnit}>{(cfg.speed ? speedLabel(units) : paceLabel(units)).toUpperCase()}</Text>
              </View>
              <Pressable
                onPress={() => setPaceTarget((v) => clampStep(v + cfg.paceStep, cfg.paceMin, cfg.paceMax))}
                accessibilityRole="button"
                accessibilityLabel={cfg.speed ? 'Higher target speed' : 'Slower target pace'}
                style={({ pressed }) => [styles.stepBtnSm, pressed ? styles.pressed : null]}
              >
                <Text style={styles.stepGlyphSm}>+</Text>
              </Pressable>
            </View>
          ) : null}

          {denied ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                {tracker.status === 'denied'
                  ? 'Location is off for Forge Legacy, so there’s nothing to measure a route with. Turn it on in Settings, or log this session by hand afterwards.'
                  : 'This device can’t provide a location, so a live route isn’t possible here. You can still log the session by hand.'}
              </Text>
              <Pressable onPress={() => router.replace('/log-activity')} accessibilityRole="button" accessibilityLabel="Log it by hand" style={styles.noticeBtn}>
                <Text style={styles.noticeBtnText}>Log it by hand</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.trackHint}>
              Your phone measures distance and pace by GPS. Keep the app open — this tracks while you’re in it, not in the background.
            </Text>
          )}

          <Pressable
            onPress={() => void begin()}
            disabled={tracker.status === 'requesting'}
            accessibilityRole="button"
            accessibilityLabel={`Start ${cfg.verb}`}
            style={({ pressed }) => [styles.primary, tracker.status === 'requesting' ? styles.disabled : null, pressed ? styles.pressed : null]}
          >
            {tracker.status === 'requesting' ? (
              <ActivityIndicator color={flColor.cream100} />
            ) : (
              <Text style={styles.primaryText}>Start {cfg.verb}</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── phase 2 · live ─────────────────────────────────────────────────────────
  if (phase === 'live') {
    const R = 110;
    const CIRC = 2 * Math.PI * R;
    const route = routePath(tracker.track, 120, 84, 8);
    const paused = tracker.status === 'paused';

    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
        <View style={styles.live}>
          <View style={styles.liveTop}>
            <Text style={styles.prescribed}>
              {goalOpen ? `OPEN ${cfg.verb.toUpperCase()}` : `${cfg.verb.toUpperCase()} · ${targetStr} ${dUnit.toUpperCase()}`}
            </Text>
            <View style={styles.badge}>
              <View style={[styles.badgeDot, paused ? styles.badgeDotOff : null]} />
              <Text style={styles.badgeText}>{paused ? 'PAUSED' : 'GPS'}</Text>
            </View>
          </View>

          <View style={styles.liveCenter}>
            <View style={styles.ringWrap}>
              <Svg width={246} height={246} viewBox="0 0 246 246">
                <Circle cx={123} cy={123} r={R} fill="none" stroke={flColor.charcoal700} strokeWidth={10} />
                <Circle
                  cx={123}
                  cy={123}
                  r={R}
                  fill="none"
                  stroke={flColor.bronze300}
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={`${CIRC}`}
                  strokeDashoffset={CIRC * (1 - progress)}
                  transform="rotate(-90 123 123)"
                />
              </Svg>
              <View style={styles.ringCenter}>
                <Text style={styles.clock}>{fmtClock(el)}</Text>
                <Text style={styles.progressLabel}>
                  {goalOpen ? `${distStr} ${dUnit} tracked` : `${distStr} / ${targetStr} ${dUnit}`}
                </Text>
              </View>
            </View>

            {/* The real trace. Empty until a fix is good enough to plot — no invented line. */}
            <View style={styles.mapWrap}>
              <View style={styles.map}>
                {route.d ? (
                  <Svg width="100%" height="100%" viewBox="0 0 120 84">
                    <Path d={route.d} fill="none" stroke={flColor.bronze300} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                    {route.head ? <Circle cx={route.head.x} cy={route.head.y} r={4} fill={flColor.bronze300} /> : null}
                  </Svg>
                ) : (
                  <Text style={styles.mapWait}>{tracker.weakSignal ? 'Finding you…' : ''}</Text>
                )}
              </View>
              <Text style={styles.mapLabel}>LIVE ROUTE</Text>
            </View>
          </View>

          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{distStr}</Text>
              <Text style={styles.metricLabel}>DISTANCE</Text>
            </View>
            <View style={styles.metricDiv} />
            <View style={styles.metric}>
              <Text style={[styles.metricValue, styles.metricValueLive]}>{curStr}</Text>
              <Text style={styles.metricLabel}>{cfg.speed ? 'CURRENT SPEED' : 'CURRENT PACE'}</Text>
            </View>
            <View style={styles.metricDiv} />
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{avgStr}</Text>
              <Text style={styles.metricLabel}>{cfg.speed ? 'AVG SPEED' : 'AVG PACE'}</Text>
            </View>
          </View>

          {paceOn && cue ? (
            <View style={styles.cueWrap}>
              <View style={[styles.cuePill, cue === 'on' ? styles.cuePillOn : null]}>
                {/* Off-target recedes rather than scolding — never red. */}
                <Text style={[styles.cueText, cue === 'on' ? styles.cueTextOn : null]}>{cueLabel(cue, cfg.speed)}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.liveActions}>
            <Pressable
              onPress={() => (paused ? tracker.resume() : tracker.pause())}
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Resume' : 'Pause'}
              style={({ pressed }) => [styles.secondary, pressed ? styles.pressed : null]}
            >
              <Text style={styles.secondaryText}>{paused ? 'Resume' : 'Pause'}</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmFinish(true)}
              accessibilityRole="button"
              accessibilityLabel="Finish"
              style={({ pressed }) => [styles.primary, styles.primaryHalf, pressed ? styles.pressed : null]}
            >
              <Text style={styles.primaryText}>Finish</Text>
            </Pressable>
          </View>
        </View>

        <ConfirmSheet
          open={confirmFinish}
          onClose={() => setConfirmFinish(false)}
          headline={`Finish this ${cfg.verb.toLowerCase()}?`}
          body={`You're at ${distStr} ${dUnit} in ${fmtClock(el)}. Finishing stops tracking — you'll see the summary next, and nothing is saved until you seal it.`}
          confirmLabel="Finish"
          onConfirm={doFinish}
        />
      </View>
    );
  }

  // ── phase 3 · complete ─────────────────────────────────────────────────────
  const finishRoute = routePath(tracker.track, 360, 186, 18);
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <ScrollView contentContainerStyle={styles.finish} showsVerticalScrollIndicator={false}>
        <Text style={styles.completeLabel}>{cfg.complete.toUpperCase()}</Text>

        <View style={styles.finishMap}>
          {finishRoute.d ? (
            <Svg width="100%" height="100%" viewBox="0 0 360 186">
              <Path d={finishRoute.d} fill="none" stroke={flColor.bronze300} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
              {finishRoute.start ? <Circle cx={finishRoute.start.x} cy={finishRoute.start.y} r={7} fill={flColor.bronze300} stroke={flColor.base} strokeWidth={2.5} /> : null}
              {finishRoute.head ? (
                <>
                  <Circle cx={finishRoute.head.x} cy={finishRoute.head.y} r={7} fill="none" stroke={flColor.bronze300} strokeWidth={3} />
                  <Circle cx={finishRoute.head.x} cy={finishRoute.head.y} r={2.5} fill={flColor.bronze300} />
                </>
              ) : null}
            </Svg>
          ) : (
            /* No usable fixes — say so rather than draw a route that wasn't taken. */
            <View style={styles.mapEmpty}>
              <Text style={styles.mapEmptyText}>No route recorded — the signal never settled.</Text>
            </View>
          )}
        </View>

        <View style={styles.summary}>
          <View style={styles.metric}>
            <Text style={styles.sumValue}>{distStr}</Text>
            <Text style={styles.metricLabel}>{distanceLabelLong(units).toUpperCase()}</Text>
          </View>
          <View style={styles.metricDiv} />
          <View style={styles.metric}>
            <Text style={styles.sumValue}>{fmtClock(el)}</Text>
            <Text style={styles.metricLabel}>TIME</Text>
          </View>
          <View style={styles.metricDiv} />
          <View style={styles.metric}>
            <Text style={[styles.sumValue, styles.metricValueLive]}>{avgStr}</Text>
            <Text style={styles.metricLabel}>{cfg.speed ? `AVG ${speedLabel(units).toUpperCase()}` : `AVG /${dUnit.toUpperCase()}`}</Text>
          </View>
        </View>

        {bests.length > 0 ? (
          <View style={styles.pbBlock}>
            <Text style={styles.pbHeading}>PERSONAL BESTS</Text>
            <View style={styles.pbList}>
              {bests.map((pb) => (
                <View key={pb.kind} style={styles.pbRow}>
                  <View style={styles.pbIcon}>
                    <Svg width={19} height={19} viewBox="0 0 24 24">
                      <Path d="M12 3l2.2 6.1H21l-5.4 3.9 2 6.1-5.6-4-5.6 4 2-6.1L3 9.1h6.8z" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinejoin="round" />
                    </Svg>
                  </View>
                  <View style={styles.pbText}>
                    <Text style={styles.pbLabel}>{pb.label}</Text>
                    <Text style={styles.pbDetail}>{pb.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.sealBlock}>
          <Pressable
            onPressIn={startHold}
            onPressOut={endHold}
            disabled={sealed || saving || mi <= 0}
            accessibilityRole="button"
            accessibilityLabel="Press and hold to seal this session"
            style={[styles.seal, mi <= 0 ? styles.disabled : null]}
          >
            <View style={[styles.sealFill, { width: `${Math.round(hold * 100)}%` }]} />
            {/* The ink flips to dark once the bronze has flooded past it — a contrast crossover, not a
                colour change. */}
            <Text style={[styles.sealText, hold > 0.55 || sealed ? styles.sealTextOver : null]}>
              {sealed ? 'SEALED' : hold > 0 ? 'KEEP HOLDING…' : 'HOLD TO SEAL SESSION'}
            </Text>
          </Pressable>

          {mi <= 0 ? (
            <Text style={styles.nothingText}>
              No distance was recorded, so there’s nothing to seal. You can log this session by hand instead.
            </Text>
          ) : null}

          <Pressable
            onPress={() => void (mi > 0 ? viewRecord() : router.replace('/log-activity'))}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel={mi > 0 ? 'View record' : 'Log it by hand'}
            style={styles.textBtn}
          >
            <Text style={styles.textBtnText}>{mi > 0 ? 'View Record' : 'Log it by hand'}</Text>
          </Pressable>

          {mi <= 0 ? (
            <Pressable onPress={discard} accessibilityRole="button" accessibilityLabel="Discard" style={styles.textBtn}>
              <Text style={styles.discardText}>Discard</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  barTitle: { fontSize: 15, fontWeight: '600', letterSpacing: 1.4, color: flColor.gray400 },

  setup: { padding: 24, paddingBottom: 34, alignItems: 'center', gap: 16 },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: flRadius.lg, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal600, width: '100%', maxWidth: 284 },
  seg: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.md },
  segOn: { backgroundColor: flColor.bronzeTint },
  segText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  segTextOn: { color: flColor.bronze300 },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  stepBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal900, alignItems: 'center', justifyContent: 'center' },
  stepBtnSm: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal900, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontSize: 26, lineHeight: 30, color: flColor.bronze300 },
  stepGlyphSm: { fontSize: 22, lineHeight: 26, color: flColor.bronze300 },
  stepValue: { minWidth: 118, alignItems: 'center' },
  stepNumber: { fontFamily: flFont.display, fontSize: 52, lineHeight: 54, fontWeight: '700', color: flColor.cream100 },
  paceNumber: { fontFamily: flFont.display, fontSize: 26, lineHeight: 28, fontWeight: '600', color: flColor.bronze300 },
  stepUnit: { marginTop: 5, fontSize: 10, fontWeight: '600', letterSpacing: 1.6, color: flColor.gray600 },
  openTitle: { fontFamily: flFont.display, fontSize: 44, lineHeight: 46, fontWeight: '700', color: flColor.cream100 },
  goalSub: { fontSize: 14, lineHeight: 21, color: flColor.gray400, textAlign: 'center', maxWidth: 264 },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1, borderColor: flColor.charcoal600 },
  pillOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  pillText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  pillTextOn: { color: flColor.bronze300 },
  paceStepper: { flexDirection: 'row', alignItems: 'center', gap: 18 },

  trackHint: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600, textAlign: 'center', maxWidth: 284 },
  notice: { padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, gap: 11 },
  noticeText: { fontSize: 12.5, lineHeight: 19, color: flColor.gray400 },
  noticeBtn: { paddingVertical: 10, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, alignItems: 'center' },
  noticeBtnText: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },

  primary: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeMetalBorder, backgroundColor: flColor.bronze600, boxShadow: flShadow.card },
  primaryHalf: { flex: 1, width: undefined },
  primaryText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: flColor.cream100 },
  secondary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  secondaryText: { fontSize: 14, fontWeight: '600', color: flColor.gray400 },

  live: { flex: 1, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 26 },
  liveTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prescribed: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, color: flColor.gray600 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: flColor.charcoal600 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: flColor.greenMuted },
  badgeDotOff: { backgroundColor: flColor.gray600 },
  badgeText: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.4, color: flColor.gray400 },

  liveCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  ringWrap: { width: 246, height: 246, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  clock: { fontFamily: flFont.display, fontSize: 54, lineHeight: 58, fontWeight: '600', color: flColor.cream100 },
  progressLabel: { marginTop: 8, fontSize: 13, fontWeight: '500', letterSpacing: 0.5, color: flColor.gray400 },

  mapWrap: { alignItems: 'center', gap: 6 },
  map: { width: 100, height: 74, borderRadius: flRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, alignItems: 'center', justifyContent: 'center' },
  mapWait: { fontSize: 9, color: flColor.gray600 },
  mapLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.4, color: flColor.gray600 },

  metrics: { flexDirection: 'row', paddingTop: 16, paddingBottom: 22, borderTopWidth: 1, borderTopColor: flColor.charcoal700, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  metric: { flex: 1, alignItems: 'center', gap: 3 },
  metricDiv: { width: 1, backgroundColor: flColor.bronzeBorderSubtle },
  metricValue: { fontFamily: flFont.display, fontSize: 23, fontWeight: '600', color: flColor.cream100 },
  metricValueLive: { color: flColor.bronze300 },
  metricLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.2, color: flColor.gray600, textAlign: 'center' },

  cueWrap: { alignItems: 'center', marginTop: 14 },
  cuePill: { paddingVertical: 6, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: flColor.charcoal600 },
  cuePillOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  cueText: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.gray400 },
  cueTextOn: { color: flColor.bronze300 },
  liveActions: { flexDirection: 'row', gap: 12, marginTop: 20 },

  finish: { padding: 22, paddingBottom: 34 },
  completeLabel: { textAlign: 'center', fontSize: 11, fontWeight: '600', letterSpacing: 2.4, color: flColor.bronze400 },
  finishMap: { height: 186, marginTop: 16, borderRadius: flRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  mapEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  mapEmptyText: { fontSize: 12.5, color: flColor.gray600, textAlign: 'center' },
  summary: { flexDirection: 'row', marginTop: 22 },
  sumValue: { fontFamily: flFont.display, fontSize: 32, lineHeight: 34, fontWeight: '600', color: flColor.cream100 },

  pbBlock: { marginTop: 28 },
  pbHeading: { fontSize: 10, fontWeight: '600', letterSpacing: 1.6, color: flColor.bronze400, marginBottom: 11 },
  pbList: { borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, overflow: 'hidden', backgroundColor: flColor.charcoal900 },
  pbRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  pbIcon: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, alignItems: 'center', justifyContent: 'center' },
  pbText: { flex: 1, gap: 2 },
  pbLabel: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  pbDetail: { fontSize: 12, lineHeight: 17, color: flColor.gray600 },

  sealBlock: { marginTop: 30, gap: 10 },
  seal: { height: 54, borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, alignItems: 'center', justifyContent: 'center' },
  sealFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: flColor.bronze600 },
  sealText: { fontSize: 13, fontWeight: '700', letterSpacing: 1.6, color: flColor.bronze300 },
  sealTextOver: { color: '#1A1206' },
  nothingText: { fontSize: 12.5, lineHeight: 19, color: flColor.gray600, textAlign: 'center' },
  textBtn: { alignItems: 'center', paddingVertical: 10 },
  textBtnText: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
  discardText: { fontSize: 13, fontWeight: '600', color: flColor.gray600 },

  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
});
