import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { useWallClockTimer } from '@/hooks/useWallClockTimer';
import { useKeepScreenAwake } from '@/hooks/useKeepScreenAwake';
import { useRunTracker } from '@/hooks/useRunTracker';
import { useReduceMotion } from '@/lib/settings';
import {
  activitySymbol,
  avgPaceSec,
  bumpDistanceUnit,
  bumpDuration,
  bumpPace,
  bumpSpeed,
  distanceStepIn,
  distanceUnitFor,
  FIRST_TARGET,
  floorsStep,
  fmtClock,
  fmtDistanceIn,
  fmtDuration,
  fmtFloors,
  fmtPace,
  fromDistanceIn,
  hasRateTarget,
  isLogged,
  parseClock,
  parseDistanceIn,
  parseFloors,
  parsePace,
  parseWithin,
  toDistanceIn,
  TRACKS_DISTANCE,
  TRACKS_FLOORS,
  usesSpeed,
  VERB,
  type CardioActivity,
  type CardioResult,
  type Modality,
  OUTDOOR_CAPABLE,
} from '@/domain/workout/conditioning';
import {
  currentPaceSec,
  cueLabel,
  goalMet,
  goalProgress,
  routePath,
  signalNote,
  sustainedCue,
  toDistance,
  toPace,
  toSpeed,
  totalMiles,
  totalGainM,
  hasClimbData,
  displayGain,
  type ActivityKind,
  type UnitSystem,
} from '@/domain/run/run-core';
import type { SessionExercise } from '@/domain/workout/types';

/**
 * The cardio block card — what stands where the exercise hero and the set table would.
 *
 * ══ THE GOVERNING RULE ══
 *
 * Outdoor runs have GPS; treadmill runs have only a clock. The card must never draw a route, a map or an
 * incline history for a treadmill session, and must never show a distance the app did not measure. Every
 * branch below is that rule applied once more.
 *
 * ══ loggedModality, NOT modality ══
 *
 * `modality` is the live toggle: which LAYOUT you're looking at. `cardio.loggedModality` is how the bout
 * was actually recorded, written once at log time. Flipping the toggle after a treadmill run must not
 * repaint it as a traced GPS route, so every "was this really outdoors" question below reads
 * `loggedModality` and never `modality`.
 *
 * ══ THE RUN HAPPENS HERE ══
 *
 * An outdoor block used to hand off to a full-screen Active Run and wait for an answer to come back
 * through storage. That existed because the two were separate design documents, not because a run inside
 * a workout is a different thing — and it cost a route change, a request/result round trip and an entire
 * second way for a measurement to go missing, all to collect two numbers.
 *
 * THAT SCREEN IS RETIRED and this card is the only place a run is measured. The duplication was worse
 * than the round trip: a run could enter the record two ways (a standalone activity row, or cardio legs
 * on a session), so everything downstream — Activity History, the rank engine, auto-goals, run records —
 * had two shapes to handle. GPS reporting was written twice and one copy said nothing at all, which is
 * how a walk around the block looked like a dead app. One surface, one writer, one place to be wrong.
 *
 * What that screen had and this now has: a distance goal (a bar along the band, not a ring — this is
 * 140px with a route in it), a pace target with `sustainedCue`, and a chooser for both when the program
 * prescribed neither. What did NOT come across is its hold-to-seal ceremony: a run-only session already
 * ends at the workout's own Finish, and a second seal just for runs is the inconsistency, not a feature.
 *
 * So the two modalities are one shape with one difference. A treadmill gives a clock; outdoors gives a
 * clock AND a measured distance. Same live band, same End, same log form — the outdoor one arrives with
 * its numbers already filled in.
 */

const BAND_H = 140;

interface Draft {
  distanceMi: number;
  /** Stair climber only — the machine's floor count. Zero means "not entered", as Open does elsewhere. */
  floors: number;
  timeSec: number;
  inclinePct: number;
  /** Frozen when the form opens. A toggle flipped mid-edit must not change the form's shape. */
  hasIncline: boolean;
  modality: Modality;
  /**
   * Whether these numbers were MEASURED by GPS or typed by hand — frozen with the rest of the form.
   *
   * It survives editing: nudging a tracked distance by a tenth does not turn the run into a claim, and
   * pretending otherwise would erase the only durable difference between a run the app watched and a
   * number somebody remembered.
   */
  source: 'tracked' | 'manual';
}

interface Props {
  exercise: SessionExercise;
  index: number;
  units: UnitSystem;
  onSetModality: (m: Modality) => void;
  onSave: (r: {
    /**
     * ⚠ NULL FOR AN ACTIVITY THAT COVERS NO GROUND. It used to be `number`, and the form seeded it from
     * `targetMi ?? 1` for every activity alike — so a stair bout logged without touching the field wrote
     * ONE MILE the athlete never travelled, into the column `save_workout` rolls up as `workouts.distance`
     * and distance goals, honors and challenge leaderboards all read. `TRACKS_DISTANCE` existed the whole
     * time and this card never consulted it.
     */
    distanceMi: number | null;
    /** Stair climber only, and the other half of that fix. Never a distance — see `TRACKS_FLOORS`. */
    floors: number | null;
    timeSec: number;
    inclinePct: number | null;
    modality: Modality;
    /** Whether the distance was MEASURED or typed. A tracked run must never be filed as a claim. */
    source: 'tracked' | 'manual';
  }) => void;
  /**
   * A bout has started, or has ended.
   *
   * The screen above needs this because a bout under way is the one state in which leaving this
   * exercise is wrong: an athlete who walks away from a running clock, trains something else and
   * finishes ends up with a walk in their record that they never completed and the app never measured.
   *
   * Reported from the HANDLERS that start and end the bout rather than from an effect watching the
   * timer — an effect here would be setState-during-render in the parent, which this repo's lint bans
   * outright, and the handlers are the more precise signal anyway.
   */
  onLiveChange?: (live: boolean) => void;
}

export function CardioBlockCard({ exercise, index, units, onSetModality, onSave, onLiveChange }: Props) {
  const activity: CardioActivity = exercise.activity ?? 'run';
  const modality: Modality = exercise.modality ?? 'outdoor';
  const treadmill = modality === 'indoor';
  const result: CardioResult | undefined = exercise.cardio;
  const logged = isLogged(result);
  /** How it was RECORDED. Everything visual keys off this, never off the live toggle. */
  const lm = result?.loggedModality ?? null;
  const traced = logged && lm === 'outdoor';
  const loggedIndoors = logged && lm === 'indoor';

  const [draft, setDraft] = useState<Draft | null>(null);
  const [distanceText, setDistanceText] = useState('');

  /**
   * ══ WHAT THIS BOUT ACTUALLY MEASURES ══
   *
   * `TRACKS_DISTANCE` and `TRACKS_FLOORS` have been the model's answer to that question since the model
   * existed, and this card never asked. Everything below — which field the form draws, which cells the
   * result row shows, whether an average is even a meaningful thing to compute — follows from these two
   * booleans rather than from an activity name compared inline.
   */
  const tracksDistance = TRACKS_DISTANCE[activity];
  const tracksFloors = TRACKS_FLOORS[activity];

  /**
   * A target the ATHLETE set for this one bout, when the program set none.
   *
   * This is what the retired Active Run screen's setup step did, and it is the only part of it worth
   * keeping: choosing "three miles at 8:30" before you start is a real decision. It is deliberately
   * NOT written back to the exercise — a program's prescription is the program's, and a target invented
   * on the day must not look like one afterwards. It lives as long as the card does.
   *
   * `null` means "hasn't opened the chooser"; `{mi: null, paceSec: null}` means open on purpose.
   */
  const [ownTarget, setOwnTarget] = useState<{ mi: number | null; paceSec: number | null; spdMph: number | null; sec: number | null } | null>(null);
  const reduceMotion = useReduceMotion();

  const timer = useWallClockTimer(logged ? null : `forge_cardio_timer_v1:${index}`);
  /*
   * GPS SPEAKS ONLY ROAD.
   *
   * `ActivityKind` is the tracker's vocabulary, and it is deliberately narrower than `CardioActivity`:
   * it exists to gate impossible movement (`MAX_MPH`), which is a question about travelling over ground.
   * A rower, an elliptical, a stair climber and a pool swim never travel over ground, so widening the
   * tracker to accept them would advertise a GPS capability that does not exist for any of them.
   *
   * They are indoor-only (`OUTDOOR_CAPABLE`), so the Outdoor toggle never renders and `start()` is never
   * reached — the hook is instantiated but idle. The fallback kind is therefore never consulted; it is
   * here because the hook needs A kind, not because any machine has one.
   */
  const tracker = useRunTracker(OUTDOOR_CAPABLE[activity] ? (activity as ActivityKind) : 'walk');

  /**
   * One notion of "in progress" across both modalities: the belt is moving, or GPS is.
   *
   * The screen must stay awake for either. On a treadmill the clock survives a sleep (it reads the time
   * of day) but you cannot see it; outdoors a sleeping screen suspends the fix stream on the web and the
   * distance simply stops, which is the worse of the two failures.
   */
  const live = tracker.phase === 'live';
  useKeepScreenAwake(timer.running || live);

  // Live measurements. Zero and null until GPS has actually accepted movement — never seeded, never
  // simulated: an empty track has nothing to say and says nothing.
  const liveMi = totalMiles(tracker.track);
  const livePaceSec = currentPaceSec(tracker.track);
  /**
   * Climb so far, or null when this device never reported a usable altitude.
   *
   * PO: *"Do we have trail runs that can track time, distance, and climb or elevation gain?"* The fixes
   * always carried it and the tracker threw it away. Null rather than 0 is the whole point — see the
   * readout — and `hasClimbData` is what tells the two apart.
   */
  const liveClimb = hasClimbData(tracker.track) ? displayGain(totalGainM(tracker.track), units === 'metric') : null;
  /**
   * The bout is UNDER WAY — running or paused, measured or not.
   *
   * Keyed off the run, never off GPS. This used to be true only once a position stream existed, which
   * is why a refused permission produced no live card at all: the athlete had started, and the screen
   * disagreed.
   */
  const tracking = live || tracker.phase === 'paused';
  /** Nothing will be measured. The clock still runs; the distance gets typed at the end. */
  const noGps = tracker.noGps;

  /**
   * ══ THE UNIT THIS ACTIVITY IS MEASURED IN ══
   *
   * Miles or kilometres for a road bout; YARDS OR METRES for a swim, because a pool session is written
   * "1200 yd" and nobody converts it in their head. Storage stays canonical miles throughout — this
   * chooses the scale that is read, typed and stepped, and nothing else.
   */
  const dU = distanceUnitFor(activity, units === 'metric');
  const pool = dU === 'yd' || dU === 'm';
  /** A display figure back to canonical miles — the one conversion, replacing four inline `/ 1.609344`. */
  const dMi = (v: number) => fromDistanceIn(v, dU);
  /**
   * How a distance READS on this card.
   *
   * ⚠ TWO DECIMALS ON THE ROAD, AND IT USED TO BE ONE.
   *
   * PO: *"The distance should track with 3 digits and not just 2 (ie 1.23 instead of 1.2)."* They are
   * right, and the half of it that matters is that the number was already there. `fmtDistanceIn` rounds
   * to a tenth, but `dText` — the string the SAVE parses — has always kept two, and `parseDistanceIn`
   * accepts any decimal. So an athlete typing the 1.23 they actually ran had it stored as 1.23, filed as
   * 1.23, and shown back to them as "1.2". The card was under-reporting its own value.
   *
   * A tenth of a mile is 176 yards. On a run that is the difference between a route and an approximation
   * of one, and it is exactly the precision a watch hands you.
   *
   * A POOL IS STILL WHOLE LENGTHS. `fmtDistanceIn` is kept for that, and left alone everywhere else: on
   * the Program Builder it formats a prescribed TARGET, where "3.0 mi" is the honest grain of an
   * instruction and "3.00 mi" claims a precision nobody asked for.
   */
  const d1 = (mi: number | null | undefined) => (pool ? fmtDistanceIn(mi ?? 0, dU) : toDistanceIn(mi ?? 0, dU).toFixed(2));
  /** What the typed field holds — the same grain the card now displays, so the two cannot disagree. */
  const dText = (mi: number) => (pool ? String(Math.round(toDistanceIn(mi, dU))) : toDistance(mi, units).toFixed(2));
  /**
   * The figure that gets STORED, rounded in the unit it was entered in.
   *
   * ⚠ `+mi.toFixed(2)` is two decimals OF A MILE — 35 yards. Applied to a pool distance it would file
   * a 1200 yd swim as 0.68 mi, which reads back as 1197, and every length the athlete actually swam
   * between those two numbers would be rounded away at the moment of saving it.
   */
  const dRound = (mi: number) => (pool ? fromDistanceIn(Math.round(toDistanceIn(mi, dU)), dU) : +mi.toFixed(2));
  const speed = usesSpeed(activity);
  /** A rower, an elliptical and a swimmer hold no pace (EPS-D12) — so they are offered none. */
  const rated = hasRateTarget(activity);

  /**
   * The target in force — the program's if it prescribed one, otherwise whatever the athlete chose
   * before starting. The program always wins: a prescription is not the athlete's to overwrite here.
   */
  const targetMi = exercise.targetMi ?? ownTarget?.mi ?? null;
  const targetPaceSec = exercise.targetPaceSec ?? ownTarget?.paceSec ?? null;
  const targetSpdMph = exercise.targetSpdMph ?? ownTarget?.spdMph ?? null;
  /** A bout can be prescribed by the clock as well as by the distance — or by both, or by neither. */
  const targetSec = exercise.targetSec ?? ownTarget?.sec ?? null;
  const hasTarget = targetMi != null;
  /** A pace cue needs something to compare against; without one there is nothing honest to say. */
  const effortTarget = speed ? targetSpdMph : targetPaceSec;
  /** The program prescribed it, so there is nothing here for the athlete to choose. */
  /*
   * ⚠ `targetSec` BELONGS IN THIS TEST. An imported endurance day prescribes "75 min ride" and NO
   * distance, so without it the card decided nothing had been prescribed and offered the athlete a
   * "Set a target" link over the top of a target the plan had already set.
   */
  const prescribed =
    exercise.targetMi != null || exercise.targetSec != null || exercise.targetPaceSec != null || exercise.targetSpdMph != null;

  /**
   * One line under the name, saying what this block asks for.
   *
   * It used to read `Hold ${targetPaceSec ?? 0} or better` whenever a distance existed — so a block with
   * three miles and no pace told the athlete to hold 0:00, a target nobody has ever hit. Each clause now
   * only claims what was actually prescribed.
   */
  const paceStr = speed
    ? targetSpdMph != null
      ? `${toSpeed(targetSpdMph, units).toFixed(1)} ${units === 'metric' ? 'km/h' : 'mph'}`
      : null
    : targetPaceSec != null
      ? `${fmtPace(toPace(targetPaceSec, units))} /${dU}`
      : null;
  const subtitle = hasTarget
    ? paceStr
      ? `${d1(targetMi)} ${dU} · hold ${paceStr} or better`
      : `${d1(targetMi)} ${dU} — take the pace you want`
    : paceStr
      ? `Hold ${paceStr} or better · go as far as you like`
      : `No target — ${VERB[activity].toLowerCase()} what you’ve got`;

  // ── the belt, only while the timer runs ───────────────────────────────────
  // The hatch scrolls downward, toward the runner, 28px per 900ms. Started in an EFFECT, not in render:
  // kicking an animation off during render is a side effect, and it would restart on every re-render —
  // which, with a clock ticking once a second, is every second.
  const [belt] = useState(() => new Animated.Value(0));
  const beltRunning = timer.running && !reduceMotion;
  useEffect(() => {
    if (!beltRunning) return;
    const loop = Animated.loop(
      Animated.timing(belt, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => {
      loop.stop();
      belt.setValue(0);
    };
  }, [beltRunning, belt]);

  /**
   * End the bout and open the form on it.
   *
   * `measured` is passed when GPS did the measuring, and then it wins over every default below — the
   * whole point of having tracked is that nobody has to remember or re-enter anything.
   */
  const openLog = (bout?: { distanceMi?: number; timeSec: number }) => {
    // Opening the form ENDS the bout. The clock was running because the athlete was; they have stopped
    // to write the numbers down, and a timer still counting behind the form would keep inflating a
    // duration they are in the middle of confirming.
    if (timer.running) timer.pause();
    /* Fire-and-forget is correct HERE and only here: these are the paths that carry no measured
       distance (a treadmill bout, an edit, a manual entry), so nothing downstream is waiting on what
       the drain returns. The outdoor End button awaits it — see `endBout`. */
    if (tracking) void tracker.stop();
    onLiveChange?.(false);
    // The form's shape is decided ONCE, here, from how the bout was (or will be) recorded — not from
    // whatever the toggle says later. Otherwise editing an outdoor-toggled treadmill run drops its incline.
    const formTreadmill = logged && lm ? lm === 'indoor' : treadmill;
    const target = targetMi ?? 1;
    const pace = targetPaceSec ?? 540;
    // A bout with a measured distance is TRACKED; one with only a clock is not, and must not be filed
    // as though GPS vouched for the number the athlete is about to type.
    const gpsMeasured = bout?.distanceMi != null;
    /*
     * ⚠ A BOUT THAT COVERS NO GROUND OPENS AT ZERO, NOT AT ONE.
     *
     * The seed used to be `targetMi ?? 1` for every activity alike, so a stair block — which has no
     * distance and never had one — opened its form on "1.0 mi" and wrote that mile on save unless the
     * athlete happened to notice and zero it. Guarding the seed rather than the save keeps the two ends
     * agreeing: the number the form shows is the number that gets filed.
     */
    const distanceMi = tracksDistance ? (bout?.distanceMi ?? result?.distanceMi ?? target) : 0;
    setDraft({
      distanceMi,
      floors: result?.floors ?? 0,
      /* Without a distance there is nothing to multiply by a pace, and `target * pace` would seed the
         clock off a mile that does not exist. The athlete's own timer is the honest default. */
      timeSec: bout
        ? bout.timeSec
        : (result?.timeSec ?? (timer.elapsedSec || (tracksDistance ? Math.round(target * pace) : 0))),
      inclinePct: result?.inclinePct ?? (formTreadmill ? 1 : 0),
      hasIncline: formTreadmill,
      modality: formTreadmill ? 'indoor' : 'outdoor',
      source: gpsMeasured ? 'tracked' : (result?.source ?? 'manual'),
    });
    setDistanceText(dText(distanceMi));
  };

  /**
   * End an OUTDOOR bout, and read the distance only once the run has actually finished producing one.
   *
   * ⚠ THE ORDER HERE IS THE FIX. This used to be `openLog({ distanceMi: liveMi, … })` inline on the
   * button, and `liveMi` is a render value — the track as it stood before `stop()` drained whatever the
   * OS was still holding. So the last stretch before pressing End, which on a pocketed phone is most of
   * the run, landed in the track a moment AFTER the number it belonged to had been written into the form.
   *
   * `stop()` now hands back the finished track and the distance is taken from that.
   */
  const endBout = async () => {
    const timeSec = tracker.elapsedSec;
    const finished = await tracker.stop();
    const mi = totalMiles(finished);
    // A bout GPS never measured opens the form on the distance field, exactly like a treadmill one.
    openLog(mi > 0 ? { distanceMi: +mi.toFixed(2), timeSec } : { timeSec });
  };

  const adj = (field: 'distanceMi' | 'floors' | 'timeSec' | 'inclinePct', delta: number) =>
    setDraft((d) => {
      if (!d) return d;
      /* Whole floors, five at a tap. There is no such reading as 12.4 floors, so this is the one field
         here that never touches a decimal. */
      if (field === 'floors') return { ...d, floors: Math.max(0, d.floors + delta * floorsStep()) };
      if (field === 'distanceMi') {
        /* Stepped IN THE DISPLAY UNIT. Rounding the mile figure to a tenth would move a pool session by
           176 yards a tap and land it somewhere no lane ever ends. `delta` is ±1 tap; the size of a tap
           belongs to the unit. */
        const next = Math.max(0, dMi(Math.round((toDistanceIn(d.distanceMi, dU) + delta * distanceStepIn(dU)) * 100) / 100));
        setDistanceText(dText(next));
        return { ...d, distanceMi: next };
      }
      if (field === 'timeSec') return { ...d, timeSec: Math.max(0, d.timeSec + delta) };
      return { ...d, inclinePct: Math.max(0, Math.min(15, Math.round((d.inclinePct + delta) * 2) / 2)) };
    });

  /**
   * A typed value replaces outright — no stepping, no rounding to a step boundary. Someone who typed
   * 42:30 meant 42:30, and snapping it to the nearest fifteen seconds would undo the whole point.
   *
   * `distanceText` is kept in step here for the same reason `adj` does it: the save reads it as the
   * authoritative distance when it parses, and letting the two drift is how a typed distance would be
   * discarded at the last moment.
   */
  const setTyped = (field: 'distanceMi' | 'floors' | 'timeSec' | 'inclinePct', value: number) =>
    setDraft((d) => {
      if (!d) return d;
      if (field === 'floors') return { ...d, floors: value };
      if (field === 'distanceMi') {
        setDistanceText(dText(value));
        return { ...d, distanceMi: value };
      }
      if (field === 'timeSec') return { ...d, timeSec: value };
      return { ...d, inclinePct: value };
    });

  const draftPace = draft ? avgPaceSec(draft.distanceMi, draft.timeSec) : null;

  /**
   * The athlete's own trace, fitted to the band — or null, which draws the dashed placeholder instead.
   *
   * Two points is the minimum that can be a line rather than a dot. `start` and `head` are guaranteed
   * non-null by then, and narrowing them here keeps the JSX from having to ask again.
   */
  const fitted = routePath(tracker.track, 372, 126, 14);
  /*
   * ⚠ IT TAKES DISTANCE, NOT TWO POINTS. The test was `track.length > 1`, which under the old accept rule
   * meant two places the athlete had demonstrably been. `acceptFix` now keeps a provisional head that
   * every fix refines, so a phone sitting on the doorstep reaches two points within a second or so — and
   * this would have drawn a solid route, a start dot and a head dot on top of each other, in place of the
   * dashed "your route traces as you run" placeholder, before the run had gone anywhere.
   */
  const route = liveMi > 0 && tracker.track.length > 1 && fitted.start && fitted.head
    ? { d: fitted.d, start: fitted.start, head: fitted.head }
    : null;

  const note = signalNote(tracker.phase === 'paused', tracker.weakSignal, tracker.accuracyM, tracker.gps);

  /**
   * The pace cue, ported from the retired Active Run screen.
   *
   * `sustainedCue` demands that a 30-second and a 75-second window AGREE before it says anything, which
   * is what keeps it from flickering "EASE OFF / PUSH" every two seconds on ordinary GPS noise. Null
   * when there's no target to compare against, and null is the right answer — a cue with nothing behind
   * it is just a colour.
   */
  const cue = effortTarget != null && live ? sustainedCue(tracker.track, effortTarget, speed) : null;
  /**
   * Distance is only a number when something measured it. Untracked, the clock is the whole readout.
   *
   * ⚠ CREDITED DISTANCE, NOT TRACK LENGTH. This read `track.length > 1`, which under the old accept rule
   * meant "movement has cleared the noise floor". `acceptFix` now keeps a provisional head that every fix
   * refines, so the track passes two points while the athlete is still standing on the doorstep — and
   * this would have put a 0.00 in 46pt type over a run that had not started measuring yet.
   */
  const measured = liveMi > 0;
  /** Fraction of the distance target covered, clamped — or null when the bout is open. */
  const progress = targetMi != null ? goalProgress(liveMi, targetMi) : null;
  const reached = goalMet(liveMi, targetMi);

  /**
   * "Set a target" — the one piece of the retired Active Run setup step worth keeping.
   *
   * Hidden entirely when the PROGRAM prescribed something: that target is not the athlete's to re-choose
   * mid-session, exactly as the set table's Target column isn't. Shown as a link rather than as open
   * steppers so the default path — press Start, go — stays one tap. Stepping either value below its
   * minimum clears it back to open, so there is no separate "actually, no target" control.
   */
  const targetChooser = prescribed ? null : ownTarget == null ? (
    <Pressable
      onPress={() => setOwnTarget({ mi: null, paceSec: null, spdMph: null, sec: null })}
      accessibilityRole="button"
      accessibilityLabel="Set a target for this bout"
      style={styles.textBtn}
    >
      <Text style={styles.textBtnText}>Set a target</Text>
    </Pressable>
  ) : (
    <View style={styles.chooser}>
      <Field
        label="DISTANCE"
        hint=""
        value={ownTarget.mi == null ? 'Open' : `${d1(ownTarget.mi)} ${dU}`}
        onDec={() => setOwnTarget((t) => (t ? { ...t, mi: bumpDistanceUnit(t.mi, -1, dU, FIRST_TARGET[activity].mi) } : t))}
        onInc={() => setOwnTarget((t) => (t ? { ...t, mi: bumpDistanceUnit(t.mi, 1, dU, FIRST_TARGET[activity].mi) } : t))}
        decLabel="Less distance"
        incLabel="More distance"
        parse={(raw) => parseDistanceIn(raw, dU)}
        onCommit={(n) => setOwnTarget((t) => (t ? { ...t, mi: n } : t))}
        placeholder={dU}
        keyboard="decimal-pad"
      />
      {/*
        ⚠ THE CLOCK WAS MISSING FROM THIS CHOOSER ENTIRELY. The model has held `targetSec` since cardio
        existed and the Program Builder now authors it, but an athlete setting their own target here
        could only ever state a DISTANCE — so "go ride for forty minutes", the commonest intention there
        is, was the one thing they could not say.
      */}
      <Field
        label="TIME"
        hint=""
        value={ownTarget.sec == null ? 'Open' : fmtDuration(ownTarget.sec)}
        onDec={() => setOwnTarget((t) => (t ? { ...t, sec: bumpDuration(t.sec, -1) } : t))}
        onInc={() => setOwnTarget((t) => (t ? { ...t, sec: bumpDuration(t.sec, 1) } : t))}
        decLabel="Less time"
        incLabel="More time"
        /* Typed in MINUTES — the unit the intention is spoken in ("go for forty"). */
        parse={(raw) => parseWithin(raw, 1, 8 * 60)}
        onCommit={(n) => setOwnTarget((t) => (t ? { ...t, sec: Math.round(n * 60) } : t))}
        placeholder="minutes"
        keyboard="decimal-pad"
      />
      {!rated ? null : speed ? (
        <Field
          label="SPEED"
          hint=""
          value={ownTarget.spdMph == null ? 'Any' : `${toSpeed(ownTarget.spdMph, units).toFixed(1)}`}
          onDec={() => setOwnTarget((t) => (t ? { ...t, spdMph: bumpSpeed(t.spdMph, -1, FIRST_TARGET[activity].spdMph) } : t))}
          onInc={() => setOwnTarget((t) => (t ? { ...t, spdMph: bumpSpeed(t.spdMph, 1, FIRST_TARGET[activity].spdMph) } : t))}
          decLabel="Slower target"
          incLabel="Faster target"
          parse={(raw) => parseWithin(raw, 0.5, 30)}
          onCommit={(n) => setOwnTarget((t) => (t ? { ...t, spdMph: units === 'metric' ? n / 1.609344 : n } : t))}
          placeholder={units === 'metric' ? 'km/h' : 'mph'}
          keyboard="decimal-pad"
        />
      ) : (
        <Field
          label="PACE"
          hint=""
          value={ownTarget.paceSec == null ? 'Any' : `${fmtPace(toPace(ownTarget.paceSec, units))} /${dU}`}
          /* `−` is FASTER for a pace: the numeral going down is the runner speeding up. */
          onDec={() => setOwnTarget((t) => (t ? { ...t, paceSec: bumpPace(t.paceSec, -1, FIRST_TARGET[activity].paceSec) } : t))}
          onInc={() => setOwnTarget((t) => (t ? { ...t, paceSec: bumpPace(t.paceSec, 1, FIRST_TARGET[activity].paceSec) } : t))}
          decLabel="Faster target"
          incLabel="Slower target"
          parse={parsePace}
          /* Typed per display unit; a metric pace is per kilometre, so it converts back to per-mile. */
          onCommit={(n) => setOwnTarget((t) => (t ? { ...t, paceSec: units === 'metric' ? n * 1.609344 : n } : t))}
          placeholder="mm:ss"
        />
      )}
    </View>
  );

  return (
    <View style={styles.card}>
      {/* ── TERRAIN BAND ─────────────────────────────────────────────────── */}
      <View style={[styles.band, treadmill ? styles.bandIndoor : styles.bandOutdoor]}>
        {treadmill ? (
          <>
            {/* A treadmill reports elapsed time and nothing more, so the band shows exactly that. */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.belt,
                { transform: [{ translateY: belt.interpolate({ inputRange: [0, 1], outputRange: [0, 28] }) }] },
              ]}
            >
              {Array.from({ length: 8 }, (_, i) => (
                <View key={i} style={[styles.beltLine, { top: i * 28 }]} />
              ))}
            </Animated.View>
            <View style={styles.bandCentre}>
              <Text style={[styles.bandClock, timer.running ? styles.bandClockLive : null]}>
                {fmtClock(logged ? result?.timeSec : timer.elapsedSec)}
              </Text>
              <View style={styles.bandStatus}>
                {timer.running ? <View style={styles.liveDot} /> : null}
                <Text style={styles.bandStatusText}>
                  {/* The caption names what was measured. A stair bout says its floors; a machine with
                      neither distance nor floors says it was logged, because "0.0 mi ON THE BELT" is a
                      claim about ground that was never covered. */}
                  {logged
                    ? tracksFloors
                      ? result?.floors != null
                        ? `${fmtFloors(result.floors).toUpperCase()} CLIMBED`
                        : 'LOGGED'
                      : !tracksDistance
                        ? 'LOGGED'
                        : loggedIndoors
                          ? `${d1(result?.distanceMi)} ${dU} ON THE BELT`
                          : `${d1(result?.distanceMi)} ${dU} LOGGED OUTDOORS`
                    : timer.running
                      ? 'BELT RUNNING'
                      : timer.elapsedSec > 0
                        ? 'PAUSED'
                        : 'TIME ONLY · NO GPS INDOORS'}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <Svg width="100%" height={BAND_H} viewBox="0 0 372 126" pointerEvents="none">
              <Defs>
                <RadialGradient id="cbg" cx="50%" cy="12%" r="130%">
                  <Stop offset="0" stopColor="#131A20" />
                  <Stop offset="1" stopColor="#080C10" />
                </RadialGradient>
                <LinearGradient id="cscrim" x1="0" y1="1" x2="0" y2="0">
                  <Stop offset="0" stopColor="#080C10" stopOpacity={0.9} />
                  <Stop offset="1" stopColor="#080C10" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={372} height={126} fill="url(#cbg)" />
              {/* A faint bronze map grid, drawn rather than tiled — no map library, no imagery. */}
              {Array.from({ length: 5 }, (_, i) => (
                <Rect key={`h${i}`} x={0} y={i * 30} width={372} height={1} fill="rgba(191,143,79,0.045)" />
              ))}
              {Array.from({ length: 13 }, (_, i) => (
                <Rect key={`v${i}`} x={i * 30} y={0} width={1} height={126} fill="rgba(191,143,79,0.045)" />
              ))}
              {/* THE ROUTE IS THE REAL ONE or it is visibly not a route at all.
                  With fixes in hand, this is the athlete's own trace, drawn from the track. With none,
                  it is a dashed placeholder that says so in the caption — never a solid line implying a
                  run that the app did not watch. */}
              {route ? (
                <>
                  <Path d={route.d} fill="none" stroke={flColor.bronze300} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
                  <Circle cx={route.start.x} cy={route.start.y} r={5} fill={flColor.bronze300} stroke={flColor.bronze400} strokeWidth={2} opacity={0.9} />
                  <Circle cx={route.head.x} cy={route.head.y} r={5} fill="none" stroke={flColor.bronze400} strokeWidth={2} opacity={0.9} />
                </>
              ) : (
                <>
                  <Path
                    d="M44 100 C 28 70 70 66 72 46 C 74 24 42 20 66 12 C 92 4 152 14 172 44 C 194 78 262 70 278 40 C 288 22 318 30 320 52"
                    fill="none"
                    stroke={flColor.bronzeBorder}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="5 8"
                    opacity={loggedIndoors ? 0.22 : 0.4}
                  />
                  <Circle cx={44} cy={100} r={5} fill="none" stroke={flColor.bronze400} strokeWidth={2} opacity={0.7} />
                </>
              )}
              <Rect x={0} y={74} width={372} height={52} fill="url(#cscrim)" />
            </Svg>

            {/* The live read-out sits ON the route while it's being drawn — the number and the shape it
                came from in one place, rather than a clock at the top and a distance three rows down. */}
            {tracking ? (
              <View style={styles.liveOverlay} pointerEvents="none">
                {/* THE HEADLINE IS WHAT IS ACTUALLY KNOWN.
                    With GPS that is the distance, and the clock rides underneath. Without it the clock
                    IS the measurement — a 0.00 in 46pt type over a run that is genuinely happening reads
                    as a broken app, and it would be the largest thing on screen. */}
                {measured ? (
                  <>
                    <Text style={styles.liveDistance}>{dText(liveMi)}</Text>
                    <Text style={styles.liveUnit}>{dU.toUpperCase()}</Text>
                    <View style={styles.liveMetaRow}>
                      <Text style={styles.liveMeta}>{fmtClock(tracker.elapsedSec)}</Text>
                      <Text style={styles.liveMetaDot}>·</Text>
                      <Text style={styles.liveMeta}>
                        {livePaceSec == null
                          ? '--'
                          : speed
                            ? `${toSpeed(3600 / livePaceSec, units).toFixed(1)} ${units === 'metric' ? 'km/h' : 'mph'}`
                            : `${fmtPace(toPace(livePaceSec, units))} /${dU}`}
                      </Text>
                      {/* ⚠ ONLY WHEN THE PHONE ACTUALLY MEASURED ALTITUDE. `hasClimbData` is the
                          difference between "0 ft" — a claim that the route was flat — and a device that
                          never reported a usable altitude, where the honest answer is to say nothing.
                          Same rule as the missing exercise count on the Home hero. */}
                      {liveClimb != null ? (
                        <>
                          <Text style={styles.liveMetaDot}>·</Text>
                          <Text style={styles.liveMeta}>
                            ↑ {liveClimb.value} {liveClimb.unit}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.liveDistance}>{fmtClock(tracker.elapsedSec)}</Text>
                    <Text style={styles.liveUnit}>{noGps ? 'ELAPSED' : 'ELAPSED · FINDING YOU'}</Text>
                  </>
                )}
                {cue ? (
                  <View style={[styles.cue, cue === 'on' ? styles.cueOn : styles.cueOff]}>
                    <Text style={[styles.cueText, cue === 'on' ? styles.cueTextOn : null]}>{cueLabel(cue, speed)}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* THE GOAL, as a bar rather than the retired screen's ring.
                The ring owned a full-screen layout; this band is 140px tall with a route in it, and a
                ring here would either shrink to unreadable or crowd out the number it describes. The
                information is identical: how much of the target is behind you. */}
            {tracking && measured && progress != null ? (
              <View style={styles.goalTrack} pointerEvents="none">
                <View style={[styles.goalFill, { width: `${Math.round(progress * 100)}%` }, reached ? styles.goalFillMet : null]} />
              </View>
            ) : null}

            <Text style={styles.bandCaption}>
              {tracking
                ? reached
                  ? `${d1(targetMi)} ${dU} target reached · keep going if you like`
                  : note
                : traced
                  ? `${d1(result?.distanceMi)} ${dU} · ${fmtClock(result?.timeSec)}`
                  : loggedIndoors
                    ? 'Logged on a treadmill · no route'
                    : 'Your route traces as you run'}
            </Text>
          </>
        )}

        <View style={styles.bandLabel} pointerEvents="none">
          <Glyph name={activitySymbol(activity)} size={12} color={flColor.bronze400} />
          <Text style={styles.bandLabelText}>CARDIO BLOCK</Text>
        </View>

        {logged ? (
          <View style={styles.loggedBadge}>
            <Svg width={10} height={10} viewBox="0 0 24 24">
              <Path d="M20 6L9 17l-5-5" fill="none" stroke={flColor.greenMuted} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.loggedBadgeText}>LOGGED</Text>
          </View>
        ) : null}
      </View>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <View style={styles.nameText}>
            <Text style={styles.name}>{exercise.name}</Text>
            <Text style={styles.prescription}>{subtitle}</Text>
          </View>
          {/* Decorative: the toggle and the name already say the modality. */}
          <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Glyph name={treadmill ? 'stopwatch' : activitySymbol(activity)} size={17} color={flColor.bronze400} />
          </View>
        </View>

        <View style={styles.segment}>
          {(['outdoor', 'indoor'] as Modality[]).map((m) => {
            const on = modality === m;
            const label = m === 'outdoor' ? 'Outdoor' : activity === 'bike' ? 'Indoor' : 'Treadmill';
            return (
              <Pressable
                key={m}
                onPress={() => onSetModality(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={label}
                style={[styles.seg, on ? styles.segOn : null]}
              >
                <Glyph name={m === 'outdoor' ? activitySymbol(activity) : 'stopwatch'} size={17} color={on ? flColor.bronze300 : flColor.gray400} />
                <Text style={[styles.segText, on ? styles.segTextOn : null]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* THE PRESCRIPTION, and only when there is one.
            Read-only, on the strength logger's rule: Target comes from the program and does not move;
            Actual is what you log. An editable prescription would be the one place in a workout where you
            can quietly rewrite the program, and it would destroy the comparison.

            An open block draws NOTHING here. It used to render "DISTANCE · Open" beside a "LAST · —" that
            was never once populated — two cells of chrome saying there is nothing to say, on the card
            that most needed to be short. The subtitle already says it in words. */}
        {hasTarget || effortTarget != null ? (
          <View style={styles.strip}>
            {hasTarget ? <StripCell label="TARGET" value={`${d1(targetMi)} ${dU}`} big accent first /> : null}
            {/* A prescribed clock, spelled — "1h 45m", never "105:00". */}
            {targetSec != null && targetSec > 0 ? (
              <StripCell label="TARGET TIME" value={fmtDuration(targetSec)} first={!hasTarget} big={!hasTarget} accent={!hasTarget} />
            ) : null}
            {speed
              ? targetSpdMph != null && (
                  <StripCell label="TARGET SPEED" value={`${toSpeed(targetSpdMph, units).toFixed(1)}`} first={!hasTarget} big={!hasTarget} accent={!hasTarget} />
                )
              : targetPaceSec != null && (
                  <StripCell label="TARGET PACE" value={`${fmtPace(toPace(targetPaceSec, units))} /${dU}`} first={!hasTarget} big={!hasTarget} accent={!hasTarget} />
                )}
          </View>
        ) : null}

        {/* ── STATE C · the log form ─────────────────────────────────────── */}
        {draft ? (
          <View style={styles.form}>
            {/* One slot, and the activity decides what belongs in it: ground covered, floors climbed, or
                — for a machine that reports neither — nothing at all, leaving the clock to carry the bout. */}
            {tracksDistance ? (
              <Field
                label="DISTANCE"
                hint={draft.hasIncline ? 'Read it off the console' : ''}
                value={`${d1(draft.distanceMi)} ${dU}`}
                onDec={() => adj('distanceMi', -1)}
                onInc={() => adj('distanceMi', 1)}
                decLabel="Less distance"
                incLabel="More distance"
                /* Bounded by the UNIT: the mile parser refuses anything over 500 and would throw away a
                   typed 1200 yards without saying so. */
                parse={(raw) => parseDistanceIn(raw, dU)}
                /* Typed in the athlete's display units; stored in miles, like every other write here. */
                onCommit={(n) => setTyped('distanceMi', n)}
                placeholder={dU}
                keyboard="decimal-pad"
              />
            ) : tracksFloors ? (
              <Field
                label="FLOORS"
                hint="Read it off the console"
                value={draft.floors > 0 ? String(draft.floors) : '—'}
                onDec={() => adj('floors', -1)}
                onInc={() => adj('floors', 1)}
                decLabel="Fewer floors"
                incLabel="More floors"
                /* No unit and no conversion — a floor is the same for a metric athlete as an imperial
                   one, which is why nothing here consults `dU`. */
                parse={parseFloors}
                onCommit={(n) => setTyped('floors', n)}
                placeholder="floors"
                keyboard="number-pad"
              />
            ) : null}
            <Field
              label="TIME"
              /*
               * ⚠ THE CLOCK DOES NOT SAY WHAT IT IS. "45:00" is forty-five minutes and "1:05:20" is an
               * hour and five, and nothing on the card said which end was which — so the athlete typing
               * a number had to guess whether it would be read as minutes or as seconds. It reads as
               * MINUTES (see `parseClock`), and now the field says so.
               */
              hint={draft.hasIncline && timer.elapsedSec > 0 ? 'From your timer' : draft.timeSec >= 3600 ? 'h:mm:ss' : 'min:sec'}
              value={fmtClock(draft.timeSec)}
              onDec={() => adj('timeSec', -15)}
              onInc={() => adj('timeSec', 15)}
              decLabel="Less time"
              incLabel="More time"
              parse={parseClock}
              onCommit={(n) => setTyped('timeSec', n)}
              placeholder="min:sec"
            />
            {/* Said once more in words, because a colon is not a unit and this is the number that gets
                filed as the athlete's training. */}
            <Text style={styles.timeSpell}>{fmtDuration(draft.timeSec)}</Text>
            {draft.hasIncline ? (
              <Field
                label="INCLINE"
                hint=""
                value={`${draft.inclinePct.toFixed(1)}%`}
                onDec={() => adj('inclinePct', -0.5)}
                onInc={() => adj('inclinePct', 0.5)}
                decLabel="Lower incline"
                incLabel="Higher incline"
                parse={(raw) => parseWithin(raw, 0, 15)}
                onCommit={(n) => setTyped('inclinePct', n)}
                placeholder="%"
                keyboard="decimal-pad"
              />
            ) : null}
            {/* An average is a distance over a time. Without the distance it is not "—", it is not a
                question — so the row goes, rather than standing there with a dash in it. */}
            {tracksDistance ? (
              <View style={styles.computed}>
                <Text style={styles.computedLabel}>{speed ? 'AVG SPEED' : 'AVG PACE'}</Text>
                <Text style={styles.computedValue}>
                  {draftPace == null ? '—' : speed ? `${toSpeed(3600 / draftPace, units).toFixed(1)}` : `${fmtPace(toPace(draftPace, units))} /${dU}`}
                </Text>
              </View>
            ) : tracksFloors && draft.floors > 0 ? (
              <View style={styles.computed}>
                <Text style={styles.computedLabel}>CLIMBED</Text>
                <Text style={styles.computedValue}>{fmtFloors(draft.floors)}</Text>
              </View>
            ) : null}
            <View style={styles.formActions}>
              <View style={styles.half}>
                <Button variant="secondary" fullWidth onPress={() => setDraft(null)} accessibilityLabel="Cancel">
                  Cancel
                </Button>
              </View>
              <View style={styles.saveBtn}>
                <Button
                  variant="primary"
                  fullWidth
                  accessibilityLabel="Save run"
                  onPress={() => {
                  const typed = parseDistanceIn(distanceText, dU);
                  const mi = typed ?? draft.distanceMi;
                  onSave({
                    /* NULL, not 0, for a machine that covers no ground — the record should say "this bout
                       had no distance", not "it travelled nothing". Zero is a measurement. */
                    distanceMi: tracksDistance ? dRound(mi) : null,
                    floors: tracksFloors && draft.floors > 0 ? Math.round(draft.floors) : null,
                    timeSec: draft.timeSec,
                    inclinePct: draft.hasIncline ? draft.inclinePct : null,
                    modality: draft.modality,
                    source: draft.source,
                  });
                    setDraft(null);
                    timer.reset();
                  }}
                >
                  Save {VERB[activity]}
                </Button>
              </View>
            </View>
          </View>
        ) : logged ? (
          /* ── STATE D · logged ─────────────────────────────────────────── */
          <View style={styles.form}>
            <View style={styles.resultRow}>
              {/* The bout reports what it measured and nothing else. A stair session shows its floors
                  where a run shows its miles; a machine that measures neither shows the clock alone,
                  rather than three cells of dashes claiming the numbers went missing. */}
              {tracksDistance ? <ResultCell value={d1(result?.distanceMi)} label={dU.toUpperCase()} first /> : null}
              {tracksFloors ? <ResultCell value={result?.floors != null ? String(result.floors) : '—'} label="FLOORS" first accent /> : null}
              <ResultCell
                value={fmtClock(result?.timeSec)}
                label={(result?.timeSec ?? 0) >= 3600 ? 'TIME · H:MM:SS' : 'TIME · MIN:SEC'}
                first={!tracksDistance && !tracksFloors}
              />
              {tracksDistance ? (
                <ResultCell
                  value={(() => {
                    const p = avgPaceSec(result?.distanceMi, result?.timeSec);
                    return p == null ? '—' : speed ? toSpeed(3600 / p, units).toFixed(1) : fmtPace(toPace(p, units));
                  })()}
                  label={speed ? 'AVG' : `AVG /${dU.toUpperCase()}`}
                  accent
                />
              ) : null}
              {/* Incline is a treadmill fact. It shows only when the bout was RECORDED indoors — not
                  when the toggle happens to be sitting there now. */}
              {loggedIndoors && result?.inclinePct != null ? (
                <ResultCell value={`${result.inclinePct.toFixed(1)}%`} label="INCLINE" />
              ) : null}
            </View>
            <Pressable onPress={() => openLog()} accessibilityRole="button" accessibilityLabel="Edit these numbers" style={styles.textBtn}>
              <Text style={styles.textBtnText}>Edit these numbers</Text>
            </Pressable>
          </View>
        ) : treadmill ? (
          /* ── STATE B · treadmill, not yet run ─────────────────────────── */
          <View style={styles.form}>
            {timer.elapsedSec === 0 && !timer.running ? targetChooser : null}
            <View style={styles.formActions}>
              <View style={styles.half}>
                <Button
                  variant={timer.elapsedSec > 0 || timer.running ? 'secondary' : 'primary'}
                  fullWidth
                  onPress={() => {
                    if (timer.running) timer.pause();
                    else if (timer.elapsedSec > 0) timer.resume();
                    else timer.start();
                    // Paused still counts as under way: the bout is open until it is logged.
                    onLiveChange?.(true);
                  }}
                  accessibilityLabel={timer.running ? 'Pause the timer' : timer.elapsedSec > 0 ? 'Resume the timer' : 'Start the timer'}
                >
                  {timer.running ? 'Pause' : timer.elapsedSec > 0 ? 'Resume' : 'Start Timer'}
                </Button>
              </View>
              {timer.elapsedSec > 0 ? (
                <View style={styles.half}>
                  {/* "End" and not "Log": it stops the clock. Calling it Log made it read like a
                      passive write while the timer kept counting behind the form. */}
                  <Button variant="primary" fullWidth onPress={() => openLog()} accessibilityLabel={`End ${VERB[activity].toLowerCase()}`}>
                    End {VERB[activity]}
                  </Button>
                </View>
              ) : null}
            </View>
            {timer.elapsedSec === 0 && !timer.running ? (
              <Pressable onPress={() => openLog()} accessibilityRole="button" accessibilityLabel="Skip the timer and enter it myself" style={styles.textBtn}>
                <Text style={styles.textBtnText}>Skip timer · enter it myself</Text>
              </Pressable>
            ) : null}
            {/* ONE line. Two stacked notes on the shortest card in the app was the bulk the athlete was
                looking at — and the second only mattered mid-run, when the first no longer did. */}
            <Text style={styles.note}>
              {timer.running || timer.elapsedSec > 0
                ? 'The clock reads the time of day, so it stays right even if your screen sleeps.'
                : 'A treadmill only gives us time — you’ll read the distance off the console at the end.'}
            </Text>
          </View>
        ) : (
          /* ── STATE A · outdoor ────────────────────────────────────────── */
          <View style={styles.form}>
            {tracking ? (
              <>
                <View style={styles.formActions}>
                  <View style={styles.half}>
                    <Button
                      variant="secondary"
                      fullWidth
                      onPress={tracker.phase === 'paused' ? tracker.resume : tracker.pause}
                      accessibilityLabel={tracker.phase === 'paused' ? `Resume the ${VERB[activity].toLowerCase()}` : `Pause the ${VERB[activity].toLowerCase()}`}
                    >
                      {tracker.phase === 'paused' ? 'Resume' : 'Pause'}
                    </Button>
                  </View>
                  <View style={styles.half}>
                    {/* Ends the run AND carries whatever was measured straight into the form. With GPS
                        that is the distance and the clock; without it, the clock alone — and the form
                        opens on the distance field for them to fill in, exactly like a treadmill. */}
                    <Button
                      variant="primary"
                      fullWidth
                      onPress={() => void endBout()}
                      accessibilityLabel={`End ${VERB[activity].toLowerCase()}`}
                    >
                      End {VERB[activity]}
                    </Button>
                  </View>
                </View>
                <Text style={styles.note}>
                  {noGps
                    ? tracker.gps === 'denied'
                      ? 'Location is off for Forge Legacy, so we can’t measure the distance — the clock is still running, and you can type the distance in when you finish.'
                      : 'No location signal here. The clock is still running; you’ll add the distance at the end.'
                    /* ⚠ THIS TOLD THE ATHLETE THE OPPOSITE OF THE TRUTH for a build after background
                       location shipped — "tracking stops if the app goes to the background". It does
                       not: the OS buffers fixes while the phone is locked and the run drains them on
                       the way back. Someone reading the old line would have run the whole way holding
                       an unlocked phone for no reason. */
                    : 'Lock your phone and put it away if you like — the run keeps measuring in your pocket.'}
                </Text>
              </>
            ) : (
              <>
                {targetChooser}
                {/* PRESSING THIS STARTS THE RUN. It does not ask permission first and wait to find out
                    whether it is allowed to agree — that is what left an athlete who pressed Start with
                    no clock, no card and no way to end anything. GPS attaches underneath. */}
                <Button variant="primary" fullWidth onPress={() => {
                    tracker.start();
                    onLiveChange?.(true);
                  }} accessibilityLabel={`Start ${VERB[activity].toLowerCase()}`}>
                  Start {VERB[activity]}
                </Button>
                <Pressable onPress={() => openLog()} accessibilityRole="button" accessibilityLabel="Already did it — log manually" style={styles.textBtn}>
                  <Text style={styles.textBtnText}>Already did it · log manually</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ── pieces ────────────────────────────────────────────────────────────────

function StripCell({ label, value, big, accent, first }: { label: string; value: string; big?: boolean; accent?: boolean; first?: boolean }) {
  return (
    <View style={[styles.stripCell, first ? styles.stripCellFirst : null]}>
      <Text style={[styles.stripLabel, accent ? styles.stripLabelAccent : null]}>{label}</Text>
      <Text style={[styles.stripValue, big ? styles.stripValueBig : null, accent ? styles.stripValueAccent : null]}>{value}</Text>
    </View>
  );
}

function ResultCell({ value, label, accent, first }: { value: string; label: string; accent?: boolean; first?: boolean }) {
  return (
    <View style={[styles.resultCell, first ? null : styles.resultCellDiv]}>
      <Text style={[styles.resultValue, accent ? styles.resultValueAccent : null]}>{value}</Text>
      <Text style={styles.resultLabel}>{label}</Text>
    </View>
  );
}

/**
 * One value with its two steppers — and, since the PO asked for it, a value you can just type.
 *
 * ══ WHY ══
 *
 * *"When adjusting things across the app (like time for a race) would be nice to have the option to
 * click and enter the time."* TIME stepped in fixed fifteen-second jumps, so reaching 42:30 from a
 * seeded 0:00 was a hundred and seventy taps. The value was a `<Text>`; there was no `TextInput`
 * anywhere in this file.
 *
 * Typing is opt-in per call site: pass `parse` and `onCommit` and the value becomes pressable. Without
 * them the field behaves exactly as it did, so a call site that has no sensible typed form (a target
 * that can read "Open" or "Any") is not forced into one.
 *
 * The steppers stay. They are still the right control for a nudge, and they are the only one that
 * works with a bar in your other hand.
 *
 * A rejected parse leaves the previous value standing rather than clamping to a guess: this field's
 * whole job is to replace a number, and replacing it with something invented would be worse than
 * refusing.
 *
 * ══ ⚠ THE INPUT IS ALWAYS MOUNTED, AND ON AN IPHONE THAT IS THE DIFFERENCE BETWEEN WORKING AND NOT ══
 *
 * PO: *"When I go to log a run it's not letting me put in the time."*
 *
 * This used to be a `<Text>` inside a `Pressable` that swapped to a `<TextInput autoFocus>` on tap. On
 * native that is fine. On web it is not, and the app already knew: a browser raises the software
 * keyboard only for a `focus()` issued INSIDE the user-gesture call stack, and `autoFocus` fires after
 * the element mounts — one state commit later, outside the gesture. iOS Safari then focuses the field
 * and silently declines to show a keyboard. The caret appears, the field looks live, and nothing can be
 * typed into it.
 *
 * `workout.tsx` hit this and worked around it with a permanently-mounted invisible "primer" input that
 * takes focus during the tap so the keyboard is already up before the real field mounts. That was the
 * right fix there, because the field lives in a sheet that genuinely does not exist at tap time.
 *
 * Here it does exist, so there is nothing to work around: tapping an input that is already on screen
 * focuses it inside the gesture and the keyboard comes up by itself. `SetGoalPanel` was written this way
 * from the start and its header names THIS FILE as the one still carrying the broken pattern — the
 * defect was documented in a comment for a fortnight instead of being fixed.
 *
 * The behaviour the athlete sees is unchanged: the field shows the formatted value, tapping it clears to
 * empty so the first keystroke replaces rather than appends, and blurring commits.
 */
function Field({
  label,
  hint,
  value,
  onDec,
  onInc,
  decLabel,
  incLabel,
  parse,
  onCommit,
  placeholder,
  keyboard = 'numbers-and-punctuation',
}: {
  label: string;
  hint: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  decLabel: string;
  incLabel: string;
  /** Text → value, or null to reject. Supplying this (with `onCommit`) is what enables typing. */
  parse?: (raw: string) => number | null;
  onCommit?: (n: number) => void;
  placeholder?: string;
  /** 'number-pad' is the floors field: whole numbers only, so the decimal key should not be offered. */
  keyboard?: 'numbers-and-punctuation' | 'decimal-pad' | 'number-pad';
}) {
  const typeable = !!parse && !!onCommit;
  /** What is in the box WHILE they are typing. `null` means "show the committed value". */
  const [text, setText] = useState<string | null>(null);
  /** So the pencil can put the caret in the field it marks. Read only from an event handler. */
  const inputRef = useRef<TextInput>(null);

  const commit = () => {
    const n = text == null ? null : parse?.(text);
    setText(null);
    if (n != null) onCommit?.(n);
  };

  return (
    <View style={styles.field}>
      <View style={styles.fieldText}>
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
        </View>
        {typeable ? (
          /*
           * ══ THE FIELD HAS TO LOOK LIKE A FIELD ══
           *
           * PO, on being unable to enter an exact run time: they did not know the number could be typed.
           * It always could — this is a mounted `TextInput` and has been since the keyboard fix — but the
           * only thing saying so was a 1px dotted rule at 40% opacity under a 22px display face, on a
           * dark card. An affordance nobody can see is not an affordance, and the athlete's conclusion
           * was the reasonable one: that the steppers were the only way in, and 15 seconds was the
           * finest their time could be.
           *
           * So the rule is drawn in a colour that reads, and the value carries the same bronze pencil the
           * Goal figure uses on the strength card — one mark, meaning "this one is yours to change",
           * already established elsewhere in this screen.
           *
           * The pencil is a TAP TARGET, not a picture. Focusing from its `onPress` is inside the gesture
           * stack, which is the condition iOS Safari actually requires — the bug this file's header
           * describes was `autoFocus` firing a commit later, outside it.
           */
          <View style={styles.fieldInputRow}>
            <TextInput
              ref={inputRef}
              value={text ?? value}
              /* Cleared on FOCUS rather than seeded with the current value: `selectTextOnFocus` is
                 unreliable across platforms, and having to clear a pre-filled field before typing is most
                 of the tedium this exists to remove. It happens on focus rather than in a press handler
                 because focus arrives from BOTH doors now — the input itself and the pencil beside it. */
              onFocus={() => setText('')}
              onChangeText={setText}
              onBlur={commit}
              onSubmitEditing={commit}
              keyboardType={keyboard}
              returnKeyType="done"
              placeholder={placeholder}
              placeholderTextColor={flColor.gray600}
              accessibilityLabel={`${label} is ${value}. Type to change it.`}
              /* Dotted while idle, solid while they are in it — the app's own "you can type in here" mark
                 (cf. `SetGoalPanel`). The BOX is identical in both states so focusing cannot shift the
                 layout; only the underline changes, which is the whole reason these are two style objects
                 rather than one swapped wholesale. */
              style={[styles.fieldValue, styles.fieldInput, text == null ? styles.fieldInputIdle : styles.fieldInputActive]}
            />
            <Pressable
              onPress={() => inputRef.current?.focus()}
              accessibilityRole="button"
              accessibilityLabel={`Type an exact ${label.toLowerCase()}`}
              hitSlop={10}
              style={styles.fieldPencil}
            >
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}>
                <Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </Svg>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.fieldValue}>{value}</Text>
        )}
      </View>
      <View style={styles.fieldBtns}>
        <Pressable onPress={onDec} accessibilityRole="button" accessibilityLabel={decLabel} style={({ pressed }) => [styles.stepBtn, pressed ? styles.pressed : null]}>
          <Text style={styles.stepGlyph}>−</Text>
        </Pressable>
        <Pressable onPress={onInc} accessibilityRole="button" accessibilityLabel={incLabel} style={({ pressed }) => [styles.stepBtn, pressed ? styles.pressed : null]}>
          <Text style={styles.stepGlyph}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The shared symbol set, drawn locally — same paths as `forge-symbols.js`. */
function Glyph({ name, size, color }: { name: string; size: number; color: string }) {
  const p = { fill: 'none' as const, stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'bicycle') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={5.5} cy={15.5} r={3.2} {...p} /><Circle cx={18.5} cy={15.5} r={3.2} {...p} />
        <Path d="M5.5 15.5l4-7h6M9.5 8.5l3 7M18.5 15.5l-3-7" {...p} />
      </Svg>
    );
  }
  if (name === 'footprints') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M8 4.5c1.4 0 2.2 1.5 2.2 3.3 0 1.4-.6 2.7-2.2 2.7s-2.2-1.3-2.2-2.7C5.6 6 6.6 4.5 8 4.5z" {...p} />
        <Path d="M16 8.5c1.4 0 2.2 1.5 2.2 3.3 0 1.4-.6 2.7-2.2 2.7s-2.2-1.3-2.2-2.7C13.8 10 14.6 8.5 16 8.5z" {...p} />
      </Svg>
    );
  }
  if (name === 'stopwatch') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={13.5} r={7} {...p} /><Path d="M12 6.5V4M9.8 3.5h4.4M12 13.5l3-2.4" {...p} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 15.6v-3c0-.5.4-.8.9-.6l3.3.8 2.6-2.9c.4-.5 1.2-.4 1.5.2l.7 1.5 6 1.7c1.2.3 2 1.1 2 2.4v.7c0 .4-.3.7-.7.7H4c-.6 0-1-.5-1-1z" {...p} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  /* The live read-out, centred over the route it came from. */
  liveOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  liveDistance: {
    fontFamily: flFont.display,
    fontSize: 46,
    lineHeight: 50,
    letterSpacing: -1,
    color: flColor.bronze300,
    fontVariant: ['tabular-nums'],
  },
  liveUnit: { fontFamily: flFont.sans, fontSize: 9.5, letterSpacing: 1.6, color: flColor.gray400, marginTop: -2 },
  liveMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
  liveMeta: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray400, fontVariant: ['tabular-nums'] },
  liveMetaDot: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray600 },
  chooser: { gap: 8, marginBottom: 2 },
  cue: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 3.5, borderRadius: 999, borderWidth: 1 },
  cueOn: { borderColor: 'rgba(122,155,110,0.5)', backgroundColor: 'rgba(122,155,110,0.14)' },
  cueOff: { borderColor: flColor.bronzeBorder, backgroundColor: 'rgba(191,143,79,0.1)' },
  cueText: { fontFamily: flFont.sans, fontSize: 9.5, letterSpacing: 1.3, color: flColor.bronze400 },
  cueTextOn: { color: flColor.greenMuted },
  /* The distance goal, along the foot of the band. */
  goalTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.06)' },
  goalFill: { height: 3, backgroundColor: flColor.bronze400 },
  goalFillMet: { backgroundColor: flColor.greenMuted },
  /**
   * `flex: none` is LOAD-BEARING. The scroll body is a column flex container, so children default to
   * shrinking — and because this card clips (for the rounded band) a shrunk card silently clips its own
   * content while the parent never overflows, putting the clipped region out of reach rather than merely
   * below the fold. The strength cards don't expose this because they don't clip.
   */
  card: { flexGrow: 0, flexShrink: 0, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: '#0D1116', overflow: 'hidden', boxShadow: flShadow.card },

  band: { height: BAND_H, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700, position: 'relative', justifyContent: 'center' },
  bandOutdoor: { backgroundColor: '#080C10' },
  bandIndoor: { backgroundColor: '#0A0E13' },
  belt: { position: 'absolute', top: -28, left: 0, right: 0, bottom: -28 },
  beltLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: 'rgba(191,143,79,0.085)' },
  bandCentre: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 7 },
  bandClock: { fontFamily: flFont.display, fontSize: 46, lineHeight: 48, fontWeight: '600', letterSpacing: 1, color: flColor.cream100 },
  bandClockLive: { color: flColor.bronze300 },
  bandStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bandStatusText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: flColor.gray600 },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: flColor.greenMuted },
  bandCaption: { position: 'absolute', bottom: 11, right: 14, fontSize: 11, fontWeight: '600', letterSpacing: 0.2, color: flColor.gray400 },
  bandLabel: { position: 'absolute', top: 11, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  bandLabelText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: flColor.bronze400 },
  loggedBadge: { position: 'absolute', top: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(90,158,104,0.34)', backgroundColor: 'rgba(90,158,104,0.12)' },
  loggedBadgeText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 1, color: flColor.greenMuted },

  body: { padding: 15, paddingBottom: 16, gap: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  nameText: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily: flFont.display, fontSize: 24, lineHeight: 26, fontWeight: '600', color: flColor.cream100 },
  prescription: { fontSize: 11.5, color: flColor.gray600 },
  mark: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal800, alignItems: 'center', justifyContent: 'center' },

  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: flRadius.lg, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal600 },
  seg: { flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: flRadius.md },
  segOn: { backgroundColor: flColor.bronzeTint },
  segText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  segTextOn: { color: flColor.bronze300 },

  strip: { flexDirection: 'row', paddingVertical: 12, borderTopWidth: 1, borderTopColor: flColor.charcoal700, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  stripCell: { flex: 1, minWidth: 0, gap: 3, paddingHorizontal: 12, borderLeftWidth: 1, borderLeftColor: flColor.charcoal700 },
  stripCellFirst: { paddingLeft: 0, borderLeftWidth: 0 },
  stripLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.2, color: flColor.gray600 },
  stripLabelAccent: { fontWeight: '700', color: flColor.bronze400 },
  stripValue: { fontFamily: flFont.display, fontSize: 16, lineHeight: 18, fontWeight: '600', color: flColor.cream100 },
  stripValueBig: { fontSize: 20, lineHeight: 23 },
  stripValueAccent: { color: flColor.bronze300 },

  form: { gap: 12 },
  /** The clock in words, under the field — "1h 45m". A colon is not a unit. */
  timeSpell: { fontSize: 11, color: flColor.gray600, textAlign: 'right', marginTop: -4, marginBottom: 2 },
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal500, backgroundColor: flColor.charcoal800 },
  fieldText: { gap: 2, minWidth: 0 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  fieldLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, color: flColor.gray600 },
  fieldHint: { fontSize: 9, fontWeight: '600', letterSpacing: 0.6, color: flColor.bronze400 },
  fieldValue: { fontFamily: flFont.display, fontSize: 22, lineHeight: 24, fontWeight: '600', color: flColor.cream100 },
  /* A dotted rule under a typeable value — enough to read as an editable field, quiet enough that the
     value is still the thing you see. Same weight the set table uses for its editable cells. */
  /* `outlineWidth: 0` for the same reason as the Set Input Sheet's fields: react-native-web's TextInput
     reset does not cover `outline`, so the browser would paint a blue focus ring over the bronze. It
     matters more now than it did — the input is mounted the whole time rather than only while editing. */
  fieldInput: { minWidth: 110, padding: 0, borderBottomWidth: 1, alignSelf: 'flex-start', paddingRight: 6, outlineWidth: 0 },
  /* ⚠ `bronze400`, NOT `bronzeBorder`. The border token is 40% opacity, which under a 22px display face
     on a near-black card is a rule you cannot see — and an invisible affordance is the reason the PO
     believed the steppers were the only way to enter a time. Dotted still distinguishes it from focused. */
  fieldInputIdle: { borderBottomColor: flColor.bronze400, borderStyle: 'dotted' },
  fieldInputActive: { borderBottomColor: flColor.bronze400, borderStyle: 'solid' },
  fieldInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldPencil: { paddingVertical: 2 },
  fieldBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal900, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontSize: 22, lineHeight: 26, color: flColor.bronze300 },
  computed: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 2 },
  computedLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.3, color: flColor.bronze400 },
  computedValue: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.bronze300 },
  formActions: { flexDirection: 'row', gap: 9 },
  half: { flex: 1 },
  saveBtn: { flex: 1.15 },

  resultRow: { flexDirection: 'row', paddingVertical: 14, borderRadius: flRadius.lg, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: 'rgba(90,158,104,0.24)' },
  resultCell: { flex: 1, alignItems: 'center', gap: 4 },
  resultCellDiv: { borderLeftWidth: 1, borderLeftColor: flColor.bronzeBorderSubtle },
  resultValue: { fontFamily: flFont.display, fontSize: 24, lineHeight: 25, fontWeight: '600', color: flColor.cream100 },
  resultValueAccent: { color: flColor.bronze300 },
  resultLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.2, color: flColor.gray600 },

  primary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeMetalBorder, backgroundColor: flColor.bronze600 },
  tall: { paddingVertical: 17 },
  primaryText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.4, color: flColor.cream100 },
  secondary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  secondaryText: { fontSize: 14, fontWeight: '600', color: flColor.gray400 },
  textBtn: { alignItems: 'center', paddingVertical: 9 },
  textBtnText: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  note: { fontSize: 11, lineHeight: 17, color: flColor.gray600, textAlign: 'center' },
  pressed: { opacity: 0.85 },
});
