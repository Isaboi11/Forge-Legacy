import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

import { ACCURACY_FLOOR_M, acceptFix, totalMiles, type ActivityKind, type Fix, type TrackPoint } from '@/domain/run/run-core';
import { clearBackgroundFixes, drainBackgroundFixes, startBackgroundFixes, stopBackgroundFixes } from '@/domain/run/background-task';

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
    if (!running.current) return; // paused: the ground still moves, the run does not

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
    /* A new run never inherits the last one's tail. The buffer is durable, so a run the app was killed
       during can leave fixes behind — draining them into THIS track would add somebody's walk home. */
    void clearBackgroundFixes().then(() => startBackgroundFixes());
    // Wall-time-driven rather than a counter, so a throttled background tab can't make a 40-minute run
    // report 26 minutes.
    let lastTick = Date.now();
    timer.current = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTick) / 1000;
      lastTick = now;
      if (running.current) setElapsedSec((s) => s + delta);
    }, 1000);
    void attachGps();
  }, [attachGps, commit]);

  const pause = useCallback(() => {
    running.current = false;
    setPhase('paused');
  }, []);

  const resume = useCallback(() => {
    running.current = true;
    reanchor.current = true;
    setPhase('live');
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
      if (next !== 'active' || !running.current) return;
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
  };
}
