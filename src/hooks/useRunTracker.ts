import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

import { ACCURACY_FLOOR_M, acceptFix, totalMiles, type ActivityKind, type Fix, type TrackPoint } from '@/domain/run/run-core';
import { clearBackgroundFixes, drainBackgroundFixes, startBackgroundFixes, stopBackgroundFixes } from '@/domain/run/background-task';
import { autoResumeStep, probeAt, shouldAutoPause, type AutoResumeProbe } from '@/domain/run/auto-pause';

/**
 * How long the device may go quiet before "the track stopped growing" stops meaning "the athlete stopped".
 *
 * Comfortably longer than `AUTO_PAUSE_WINDOW_SEC` so a single dropped fix cannot flip the reading, and
 * short enough that a real tunnel is recognised as one within a few seconds of entering it.
 */
const FIX_SILENCE_MS = 15_000;

/** Fold a batch of buffered fixes into a track through the ONE accept rule. Order matters; it is time. */
const applyFixes = (track: TrackPoint[], fixes: Fix[], kind: ActivityKind): TrackPoint[] =>
  fixes.reduce((t, f) => acceptFix(t, f, kind).track, track);

/**
 * The GPS side of a run — permissions, the position subscription, the clock, and pause.
 *
 * ══ THE RUN AND THE SIGNAL ARE TWO DIFFERENT THINGS ══
 *
 * This used to be ONE status, and conflating them broke the screen. `start()` awaited a permission
 * request, and anything short of an outright grant returned false and left the run un-started — so
 * pressing Start Run produced no clock, no live card and no way to end anything, just a dead end
 * offering to let you type it in.
 *
 * On the web that path was the NORMAL one. `requestForegroundPermissionsAsync` there reports the
 * current permission state; it does not raise the browser prompt, because browsers only ask when you
 * actually request a position. A first-time athlete is in state "prompt", which is not "granted", so
 * the run was refused before the browser had been given the chance to ask.
 *
 * So: `phase` is whether the athlete is running, `gps` is whether we can measure it. Pressing Start
 * starts the run — immediately, synchronously, before any permission is resolved. GPS attaches
 * underneath if it can, and adds distance to a run that is already happening. If it never arrives, the
 * athlete still has a timed run and types the distance at the end, exactly as they would on a treadmill.
 * A run is not contingent on being measurable.
 *
 * ⚠ NOT FOREGROUND ONLY — this header said it was, for a build after the one that fixed it. Background
 * tracking arrived with `background-task.ts` and shipped in iOS build 5: the OS buffers fixes while the
 * app is suspended and this hook drains them through the same `acceptFix`. Two streams therefore feed one
 * track, which is why a fix that does not advance the clock is refused as `stale` — see `acceptFix`.
 *
 * ⚠ AND IT SHIPPED WITHOUT WORKING, FOR TWO BUILDS. Every piece above was correct and none of it ever
 * ran: the permission it needed was requested in a way iOS discards (see `start()`), so
 * `startLocationUpdatesAsync` was never called and the app was suspended on lock like before. A
 * 100-minute trail run recorded 0.01 miles under a perfectly correct clock. Shipping the mechanism is
 * not shipping the feature, and nothing on this side of the boundary can tell the two apart.
 */

/** Is the athlete running? */
export type RunPhase = 'idle' | 'live' | 'paused';
/** Can we measure it? Independent of the above — a run happens either way. */
export type GpsState = 'off' | 'acquiring' | 'tracking' | 'denied' | 'unavailable';

/**
 * Seconds of running with not one accepted fix before we stop saying "acquiring" and say so plainly.
 *
 * Without this the card sits on "Looking for satellites…" forever when a browser silently refuses to
 * deliver positions — no error, no rejection, just nothing — and forever is indistinguishable from
 * about to work.
 */
export const GPS_PATIENCE_SEC = 25;

export interface RunTracker {
  phase: RunPhase;
  gps: GpsState;
  track: TrackPoint[];
  /** Whole seconds of MOVING time — a pause stops this, so pace stays honest across a rest. */
  elapsedSec: number;
  /** Metres of uncertainty on the newest fix, for the signal read-out. Null before the first one. */
  accuracyM: number | null;
  /**
   * True while the run is live but no MOVEMENT has been credited yet.
   *
   * ⚠ THIS USED TO READ `track.length < 2`, AND THAT STOPPED MEANING ANYTHING. Under the old accept rule
   * a point only entered the track by clearing the noise floor, so a length of one WAS "we know where you
   * are and nothing since has counted". `acceptFix` now keeps a provisional head that every fix refines,
   * so the track reaches two points within a second or so of standing still — and the state this flag
   * exists to name, a silent 0.00 while someone walks around, would never be reported again.
   *
   * Distance is the honest test: nothing has cleared the gate, whatever the array length says.
   */
  weakSignal: boolean;
  /** Nothing has arrived for long enough that "still looking" would be a lie. */
  gpsStalled: boolean;
  /** No distance will be measured — refused, unavailable, or given up on. Manual entry is the path. */
  noGps: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  /**
   * The run is paused because the app decided it was, not because the athlete did.
   *
   * The card reads this to say "Auto-paused" rather than "Paused" — the athlete needs to know the clock
   * will start again on its own, or they will stand there waiting to press something.
   */
  autoPaused: boolean;
  /**
   * End the run and hand back the FINISHED track — the one that includes whatever the OS was still
   * holding when the athlete pressed the button.
   *
   * ⚠ IT RETURNS A PROMISE, AND THAT IS THE WHOLE POINT. This used to return void and kick the final
   * drain off in the background, so the log form was seeded from `track` as it stood one render EARLIER
   * — before the buffered tail had been folded in. The miles measured in the last stretch before
   * stopping, which on a phone carried in a pocket is most of them, arrived a moment after the number
   * they were supposed to be part of had already been written into the form.
   *
   * Awaiting it is not optional for any caller that reads a distance.
   */
  stop: () => Promise<TrackPoint[]>;
}

export function useRunTracker(kind: ActivityKind): RunTracker {
  const [phase, setPhase] = useState<RunPhase>('idle');
  const [gps, setGps] = useState<GpsState>('off');
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  /**
   * Paused by the app rather than by the athlete.
   *
   * ⚠ STATE, NOT A REF, BECAUSE THE CARD RENDERS IT. A ref read during render is what the strict
   * react-compiler lint errors on, and the athlete has to be told which kind of pause this is: "Paused"
   * they chose, "Auto-paused" the app chose, and the second one starts again on its own.
   */
  const [autoPaused, setAutoPaused] = useState(false);

  const sub = useRef<Location.LocationSubscription | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const running = useRef(false);
  /**
   * Set on resume. The first fix after a pause re-anchors the position WITHOUT crediting distance —
   * otherwise walking to the water fountain and back while "paused" is silently added to the run.
   */
  const reanchor = useRef(false);
  /** Ends a bout exactly once, so a second `stop()` returns the finished track instead of re-draining. */
  const stopped = useRef(false);
  /**
   * Where the athlete was when AUTO-pause engaged, and how many fixes have arrived far from it.
   *
   * ⚠ NULL IS THE WHOLE SIGNAL. Non-null means "the app paused this and is watching for movement"; null
   * means either running or paused BY THE ATHLETE, and a manual pause must never end itself. See
   * `autoResumeStep`.
   */
  const autoProbe = useRef<AutoResumeProbe | null>(null);
  /**
   * When a fix was last DELIVERED — whether or not it was used.
   *
   * `shouldAutoPause` refuses to read silence as stillness, and this is the fact it refuses on. A frozen
   * track means "standing still" only while the device is still talking to us; in a tunnel it means the
   * opposite, and pausing there would stop the clock on someone still running.
   */
  const lastFixAt = useRef(0);
  /** The clock, readable from inside the interval without making it a dependency. */
  const elapsedRef = useRef(0);
  /**
   * ⚠ AUTO-PAUSE IS A FOREGROUND-ONLY FEATURE, AND THIS REF IS THE ENFORCEMENT.
   *
   * Auto-RESUME reads the raw fix stream in `onFix` — and `onFix` does not run while the app is
   * suspended. That is the whole reason `background-task.ts` exists: the OS buffers fixes and this hook
   * drains them later. So a run auto-paused with the phone in a pocket would have **no mechanism able to
   * start it again**, and would sit paused for the rest of the session while the athlete ran on.
   *
   * The rule is therefore: pause only while we can also see them leave. Mounted in the foreground, so it
   * starts true.
   */
  const appActive = useRef(true);

  /**
   * ══ THE TRACK IS HELD IN A REF AS WELL AS IN STATE, AND THE REF IS THE ONE THAT IS TRUE NOW ══
   *
   * Every writer here is an event — a fix arriving, the app coming forward, the athlete pressing End —
   * and every one of them needs the CURRENT track to fold the next thing into. React state cannot answer
   * that: inside a handler it is the value from the last render, and `setTrack(prev => …)` can answer it
   * only by refusing to tell anyone else, which is exactly why `stop()` could not report what it drained.
   *
   * So the ref is the accumulator and the state is the copy the screen renders. `commit` is the only
   * place they are both written, so they cannot drift.
   *
   * This is safe precisely BECAUSE nothing here runs during render: writing a ref while rendering is what
   * this repo's lint forbids, and rightly — a value that changes without a render is a value the UI can
   * disagree with. These all run from callbacks, where the ref is simply the newest answer.
   */
  const trackRef = useRef<TrackPoint[]>([]);
  const commit = useCallback((next: TrackPoint[]) => {
    trackRef.current = next;
    setTrack(next);
  }, []);

  const clearAll = useCallback(() => {
    sub.current?.remove();
    sub.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    running.current = false;
  }, []);

  // One teardown for unmount. A subscription that outlives the screen keeps the GPS radio warm and
  // quietly drains the battery of someone who thinks they stopped.
  useEffect(() => clearAll, [clearAll]);

  const onFix = useCallback((loc: Location.LocationObject) => {
    setAccuracyM(loc.coords.accuracy ?? null);
    /* Delivery is recorded BEFORE anything can return — that is the point of it. See `lastFixAt`. */
    lastFixAt.current = Date.now();

    if (!running.current) {
      /*
       * ══ AUTO-RESUME LIVES HERE, AND IT HAS TO ══
       *
       * The line below drops every fix while paused, so the TRACK is frozen for the whole pause — it
       * stops being evidence at exactly the moment resuming needs some. The raw stream is still
       * arriving though, and that is what this reads. A manual pause leaves `autoProbe` null and
       * `autoResumeStep` then decides nothing, which is the rule that keeps a deliberate pause paused.
       */
      const step = autoResumeStep(autoProbe.current, {
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? null,
      });
      autoProbe.current = step.probe;
      if (step.resume) {
        /* The same three lines `resume()` runs — including `reanchor`, so the distance covered while
           stopped is not credited to the run. */
        running.current = true;
        reanchor.current = true;
        /*
         * ⚠ AND DROP WHAT THE OS BUFFERED WHILE WE WERE STOPPED.
         *
         * `reanchor` protects the FOREGROUND stream only. The background drain folds its batch straight
         * through `applyFixes` → `acceptFix`, which knows nothing about a pause — so without this, the
         * walk to the water fountain arrives on the next foreground and is credited to the run. This is
         * a pre-existing defect of manual pause that auto-pause would have fired many times a session.
         */
        void clearBackgroundFixes();
        setPhase('live');
        setAutoPaused(false);
      }
      return; // paused: the ground still moves, the run does not
    }

    commit((() => {
      const prev = trackRef.current;
      const fix = {
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? null,
        at: loc.timestamp,
        /* ⚠ THESE WERE BEING DROPPED. Every fix has carried an altitude since the day this was written;
           the destructuring took three fields and discarded it, so a hill climbed was a hill unrecorded.
           `acceptFix` decides whether a reading is believable — see `CLIMB_THRESHOLD_M`. */
        alt: loc.coords.altitude ?? null,
        altAccuracy: loc.coords.altitudeAccuracy ?? null,
      };
      if (reanchor.current) {
        if (fix.accuracy != null && fix.accuracy > ACCURACY_FLOOR_M) return prev;
        reanchor.current = false;
        const last = prev[prev.length - 1];
        /* A re-anchor after a pause credits neither distance NOR climb: whatever happened while the run
           was stopped is not the run. The altitude is carried so the NEXT climb measures from here.

           ⚠ IT ALSO RESTARTS THE FILTER. This point is hand-built rather than folded through `acceptFix`,
           so it has to carry what `acceptFix` would have left on it: the estimate begins again AT this
           raw fix, believing it exactly as much as the device does, and the anchor is this point. Without
           `varM2` the next fix would read the seed default, and without the anchor it would measure its
           first step from wherever the athlete was standing when they pressed Pause. */
        const restart = { varM2: (fix.accuracy ?? 12) ** 2, aLat: fix.lat, aLon: fix.lon, aAt: fix.at };
        return last
          ? [...(last.provisional ? prev.slice(0, -1) : prev), { lat: fix.lat, lon: fix.lon, at: fix.at, mi: last.mi, alt: fix.alt, gainM: last.gainM ?? 0, climbRef: fix.alt ?? last.climbRef ?? null, ...restart }]
          : [{ lat: fix.lat, lon: fix.lon, at: fix.at, mi: 0, alt: fix.alt, gainM: 0, climbRef: fix.alt, ...restart }];
      }
      return acceptFix(prev, fix, kind).track;
    })());
    // `kind` cannot change mid-session, so closing over it is safe.
  }, [kind, commit]);

  /**
   * Attach the position stream. Separate from `start` because it must not be able to prevent one.
   *
   * The permission request is fired for its SIDE EFFECT — raising the native prompt — and its answer is
   * deliberately not treated as final. On the web it reports state rather than asking, so a first-time
   * athlete reads back "not granted" purely because the browser has not been given a reason to ask yet.
   * The watch below is the thing that actually asks, and the thing that actually knows.
   */
  const attachGps = useCallback(async () => {
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      // Swallowed on purpose: the watch is the real test, and it is about to run either way.
    }

    try {
      sub.current = await Location.watchPositionAsync(
        {
          // BestForNavigation is the point of tracking at all: Balanced rounds a run into a shape.
          accuracy: Location.Accuracy.BestForNavigation,
          // Distance rather than time — a stationary phone should not generate fixes to reject.
          distanceInterval: 3,
          timeInterval: 1000,
        },
        onFix,
      );
    } catch (e) {
      // A refusal and a missing provider read differently to the athlete: one is theirs to undo in
      // settings, the other is not worth being told to go and fix.
      const msg = String((e as { message?: string })?.message ?? e).toLowerCase();
      setGps(msg.includes('denied') || msg.includes('permission') ? 'denied' : 'unavailable');
    }
  }, [onFix]);

  /**
   * Begin the run. Synchronous and unconditional — this is the athlete saying they have started, and
   * nothing about the state of a radio makes that untrue.
   */
  const start = useCallback(() => {
    running.current = true;
    reanchor.current = false;
    stopped.current = false;
    /*
     * ⚠ A SECOND BOUT USED TO CONTINUE THE FIRST ONE'S NUMBERS.
     *
     * Neither the track nor the clock was reset here, and `stop()` leaves both standing so the finished
     * run can still be read off the card. Ending a run and then pressing Start again — which the card
     * offers the moment the log form is cancelled — resumed the old track: `acceptFix` measured the
     * first new fix from where the last run finished, and the mileage carried straight over.
     */
    commit([]);
    setElapsedSec(0);
    setAccuracyM(null);
    setPhase('live');
    setGps('acquiring');
    /* A fresh bout owns none of the last one's pause state — see `commit([])` above, same reason. */
    setAutoPaused(false);
    autoProbe.current = null;
    elapsedRef.current = 0;
    lastFixAt.current = Date.now();
    // Wall-time-driven rather than a counter, so a throttled background tab can't make a 40-minute run
    // report 26 minutes.
    let lastTick = Date.now();
    timer.current = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTick) / 1000;
      lastTick = now;
      if (!running.current) return;
      elapsedRef.current += delta;
      setElapsedSec((s) => s + delta);
      /*
       * ══ THE AUTO-PAUSE DECISION, ONCE A SECOND ══
       *
       * On the timer rather than on a fix, because the evidence for a stop is the ABSENCE of movement —
       * and when an athlete stands still `acceptFix` rejects their jitter as drift, so fixes stop
       * entering the track and a fix-driven check would go quiet exactly when it was needed.
       */
      /* Foreground only — see `appActive`. Nothing may pause a run it cannot also un-pause. */
      if (!appActive.current) return;
      if (
        shouldAutoPause({
          track: trackRef.current,
          nowMs: now,
          elapsedSec: elapsedRef.current,
          receivingFixes: now - lastFixAt.current < FIX_SILENCE_MS,
        })
      ) {
        const last = trackRef.current[trackRef.current.length - 1];
        if (last) {
          running.current = false;
          autoProbe.current = probeAt(last.lat, last.lon);
          setPhase('paused');
          setAutoPaused(true);
        }
      }
    }, 1000);
    /*
     * ══ ⚠ THE ORDER OF THESE THREE IS THE FEATURE, NOT A TIDY-UP ══
     *
     * They used to be two parallel fire-and-forgets — `clearBackgroundFixes().then(startBackgroundFixes)`
     * and `attachGps()` — so the ALWAYS request raced the WHEN-IN-USE one. On iOS you cannot be granted
     * Always from `notDetermined`: the OS shows exactly one prompt, and an upgrade request raised while
     * that prompt is still on screen is discarded SILENTLY and never re-raised. Background tracking could
     * therefore never attach, for the entire life of the install, on a permission that could not arrive.
     *
     * Observed on device: the When-In-Use prompt appeared, was granted, and the second prompt never came.
     *
     * `attachGps` is awaited for its PERMISSION, not for its subscription — the await ends once the
     * athlete has answered, which is the first moment Always is askable. The run itself started
     * synchronously above and is waiting for none of this; a refusal anywhere in here still leaves a
     * timed run the athlete types the distance into.
     *
     * The clear stays first for the reason it always did: the buffer is durable, so a run the app was
     * killed during can leave fixes behind, and draining them into THIS track would add somebody's
     * walk home.
     */
    void (async () => {
      await clearBackgroundFixes();
      await attachGps();
      await startBackgroundFixes();
    })();
  }, [attachGps, commit]);

  /**
   * ⚠ BOTH OF THESE CLEAR `autoProbe`, AND THAT IS THE MANUAL-OVERRIDE RULE.
   *
   * Pressing Pause is a statement — the athlete is stopping for as long as they mean to, and the app
   * ending that pause for them the moment they take fifteen steps is worse than never having had the
   * feature. Clearing the probe is what makes `autoResumeStep` decline to decide.
   */
  const pause = useCallback(() => {
    running.current = false;
    autoProbe.current = null;
    setPhase('paused');
    setAutoPaused(false);
  }, []);

  const resume = useCallback(() => {
    running.current = true;
    reanchor.current = true;
    autoProbe.current = null;
    /* See the auto-resume path: the OS kept buffering through the pause, and the drain does not honour
       `reanchor`. Pre-existing, and fixed here rather than left inconsistent with the automatic one. */
    void clearBackgroundFixes();
    setPhase('live');
    setAutoPaused(false);
  }, []);

  const stop = useCallback(async (): Promise<TrackPoint[]> => {
    /* Pressing End twice, or a caller ending a bout that `openLog` also ends, must not re-drain: the
       buffer is destructive to read, so the second call would find it empty and report a shorter run
       than the first. It returns the finished track instead. */
    if (stopped.current) return trackRef.current;
    stopped.current = true;
    clearAll();
    /* ⚠ DRAIN BEFORE STOPPING, and apply what comes back. Ending a run that was backgrounded to its last
       foreground fix would throw away the miles the athlete actually cared most about measuring.

       AWAITED, not fired off. The distance this produces is the distance that goes into the log form. */
    const fixes = await drainBackgroundFixes();
    const finished = fixes.length ? applyFixes(trackRef.current, fixes, kind) : trackRef.current;
    commit(finished);
    void stopBackgroundFixes();
    setPhase('idle');
    setGps('off');
    return finished;
  }, [clearAll, kind, commit]);

  /**
   * ══ COMING BACK ══
   *
   * The buffer is what the OS collected while the JS was asleep; this is the only place it becomes
   * distance. Draining on FOREGROUND rather than only on stop means an athlete who glances at the card
   * mid-run sees the miles they have actually covered, not the miles from before they pocketed the phone.
   *
   * `applyFixes` is the same `acceptFix` the live watcher uses, in order, so a backgrounded segment gets
   * the identical jitter, teleport and climb treatment as a watched one. There is one distance rule in
   * this app and this is it — a second one here is how the two halves of a run would start to disagree.
   */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      appActive.current = next === 'active';

      if (next !== 'active') {
        /*
         * ══ LEAVING THE FOREGROUND WHILE AUTO-PAUSED RESUMES THE RUN ══
         *
         * Not a tidy-up — the alternative is a silently ruined session. From here on, nothing can
         * observe the athlete starting again (`onFix` is about to stop running; only the background
         * buffer keeps filling), so a pause held now is a pause held forever.
         *
         * Err toward the clock running. A few seconds of standing still counted into a run is a
         * rounding error; forty minutes of running counted as a pause is the run.
         */
        if (autoProbe.current) {
          autoProbe.current = null;
          running.current = true;
          reanchor.current = true;
          void clearBackgroundFixes(); // same reason as the other two resumes
          setPhase('live');
          setAutoPaused(false);
        }
        return;
      }
      if (!running.current) return;
      void drainBackgroundFixes().then((fixes) => {
        if (fixes.length) commit(applyFixes(trackRef.current, fixes, kind));
      });
    });
    return () => sub.remove();
  }, [kind, commit]);

  // Everything below is DERIVED. "Acquiring" becomes "tracking" the moment a fix is good enough to have
  // entered the track, and patience runs out on its own — both are functions of state already held, and
  // a synchronous setState in an effect body is exactly what the strict react-compiler lint forbids.
  const live = phase === 'live' || phase === 'paused';
  const settled = track.length > 0;
  const gpsStalled = live && gps === 'acquiring' && !settled && elapsedSec >= GPS_PATIENCE_SEC;
  const effectiveGps: GpsState =
    gps === 'acquiring' && settled ? 'tracking' : gpsStalled ? 'unavailable' : gps;

  return {
    phase,
    gps: effectiveGps,
    track,
    elapsedSec: Math.floor(elapsedSec),
    accuracyM,
    weakSignal: live && (effectiveGps === 'acquiring' || effectiveGps === 'tracking') && totalMiles(track) === 0,
    gpsStalled,
    noGps: effectiveGps === 'denied' || effectiveGps === 'unavailable',
    start,
    pause,
    resume,
    stop,
    /** Paused by the app, not by the athlete — the card says so, and it will start again on its own. */
    autoPaused,
  };
}
