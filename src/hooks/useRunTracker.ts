import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import { ACCURACY_FLOOR_M, acceptFix, type ActivityKind, type TrackPoint } from '@/domain/run/run-core';

/**
 * The GPS side of Active Run — permissions, the position subscription, the clock, and pause.
 *
 * Kept out of the screen because none of it is presentation and all of it needs teardown. The design had
 * no equivalent: it advanced a counter on a `setInterval` at exactly 8:00/mi, so it never had to hold a
 * subscription, ask for anything, or decide what a paused run does with the ground you cover anyway.
 *
 * FOREGROUND ONLY. Background tracking needs `isIosBackgroundLocationEnabled` plus a task-manager task,
 * a heavier permission prompt, and a native build to verify — none of which can be tested from this
 * project's setup. Locking the phone will pause the trace on a real device; that limit is stated on the
 * screen rather than discovered mid-run.
 */

export type TrackerStatus = 'idle' | 'requesting' | 'denied' | 'unavailable' | 'acquiring' | 'tracking' | 'paused';

export interface RunTracker {
  status: TrackerStatus;
  track: TrackPoint[];
  /** Whole seconds of MOVING time — a pause stops this, so pace stays honest across a rest. */
  elapsedSec: number;
  /** Metres of uncertainty on the newest fix, for the signal read-out. Null before the first one. */
  accuracyM: number | null;
  /**
   * True while the tracker is live but no MOVEMENT has been accepted yet.
   *
   * Deliberately `< 2` and not `=== 0`: the very first fix always seeds the track at zero miles, so a
   * length of 1 means "we know where you are and nothing you've done since has cleared the noise floor".
   * That is the exact state that used to sit on screen as a silent 0.00 while someone walked around.
   */
  weakSignal: boolean;
  start: () => Promise<boolean>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function useRunTracker(kind: ActivityKind): RunTracker {
  const [status, setStatus] = useState<TrackerStatus>('idle');
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

    setTrack((prev) => {
      const fix = {
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? null,
        at: loc.timestamp,
      };
      if (reanchor.current) {
        if (fix.accuracy != null && fix.accuracy > ACCURACY_FLOOR_M) return prev;
        reanchor.current = false;
        const last = prev[prev.length - 1];
        return last ? [...prev, { lat: fix.lat, lon: fix.lon, at: fix.at, mi: last.mi }] : [{ ...fix, mi: 0 }];
      }
      return acceptFix(prev, fix, kind).track;
    });
    // `kind` comes from a route param and cannot change mid-session, so closing over it is safe and
    // avoids writing a ref during render — which the react-compiler lint forbids, correctly: a value
    // that changes without a render is a value the UI can disagree with.
  }, [kind]);

  const start = useCallback(async () => {
    setStatus('requesting');
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setStatus('denied');
        return false;
      }
    } catch {
      // No location provider at all — a desktop browser with the API blocked, say.
      setStatus('unavailable');
      return false;
    }

    try {
      sub.current = await Location.watchPositionAsync(
        {
          // BestForNavigation is the point of the screen: Balanced rounds a run into a shape.
          accuracy: Location.Accuracy.BestForNavigation,
          // Distance rather than time — a stationary phone should not generate fixes to reject.
          distanceInterval: 3,
          timeInterval: 1000,
        },
        onFix,
      );
    } catch {
      setStatus('unavailable');
      return false;
    }

    running.current = true;
    reanchor.current = false;
    setStatus('acquiring');
    // The clock is wall-time-driven rather than a counter, so a throttled background tab can't make a
    // 40-minute run report 26 minutes.
    let lastTick = Date.now();
    timer.current = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTick) / 1000;
      lastTick = now;
      if (running.current) setElapsedSec((s) => s + delta);
    }, 1000);
    return true;
  }, [onFix]);

  // "Acquiring" resolves into "tracking" the moment a fix is good enough to have entered the track.
  // Pure derivation from state, not a write inside the callback — the strict react-compiler lint forbids
  // a synchronous setState in an effect body, and this needs no state of its own.
  const settled = track.length > 0;
  const effective: TrackerStatus =
    status === 'acquiring' && settled ? 'tracking' : status === 'paused' ? 'paused' : status;

  const pause = useCallback(() => {
    running.current = false;
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    running.current = true;
    reanchor.current = true;
    setStatus('tracking');
  }, []);

  const stop = useCallback(() => {
    clearAll();
    setStatus('idle');
  }, [clearAll]);

  return {
    status: effective,
    track,
    elapsedSec: Math.floor(elapsedSec),
    accuracyM,
    weakSignal: (effective === 'acquiring' || effective === 'tracking') && track.length < 2,
    start,
    pause,
    resume,
    stop,
  };
}
