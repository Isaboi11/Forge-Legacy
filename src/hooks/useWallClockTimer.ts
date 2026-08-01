import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A timer that cannot be cheated by the app being asleep.
 *
 * ══ WHY THIS IS NOT THE SAME PROBLEM AS BACKGROUND GPS ══
 *
 * A counter incremented once a second stops when the screen locks, the tab is hidden, or the OS throttles
 * the timer — and then under-reports, silently, by exactly the time the athlete was away. That is the
 * trap, and it is why treadmill timing looks like it needs background execution.
 *
 * It doesn't. A timer doesn't need to KEEP RUNNING, it needs to know WHEN IT STARTED. Elapsed is
 * `now − startedAt`, so the answer is correct the instant anyone looks, regardless of what happened in
 * between. The interval below exists only to re-render; it contributes nothing to the measurement, and
 * losing ticks costs nothing.
 *
 * So treadmill mode has none of the background limitation outdoor running has — no permission, no native
 * build. GPS genuinely needs to be awake to sample position; a clock does not.
 *
 * Persisted to AsyncStorage on state CHANGES only (start / pause / resume / reset), never per second —
 * there is nothing per-second to save. A session killed mid-leg comes back with its time intact.
 */

export interface WallClockTimer {
  elapsedSec: number;
  running: boolean;
  /** True until the persisted state has been read, so a restored timer never flashes 0:00. */
  loading: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

interface Persisted {
  /** Epoch ms the current running stretch began; null while paused or stopped. */
  startedAt: number | null;
  /** Seconds banked from previous stretches. */
  accumulated: number;
}

const EMPTY: Persisted = { startedAt: null, accumulated: 0 };

export function useWallClockTimer(storageKey: string | null): WallClockTimer {
  const [state, setState] = useState<Persisted>(EMPTY);
  /**
   * Which key has finished restoring. `loading` is DERIVED from it rather than being its own flag —
   * a boolean would need `setLoading(false)` in the no-key branch of the effect below, and a synchronous
   * setState in an effect body is what the strict react-compiler lint forbids.
   */
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  // Only a re-render trigger. The measurement is `now - startedAt`, so a missed tick costs nothing.
  const [now, setNow] = useState(() => Date.now());

  // Restore. Async, so the setState lands in a promise callback rather than an effect body — which the
  // strict react-compiler lint forbids.
  useEffect(() => {
    if (!storageKey) return;
    let cancelled = false;
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const p = JSON.parse(raw) as Persisted;
            setState({ startedAt: p.startedAt ?? null, accumulated: Number(p.accumulated) || 0 });
          } catch {
            // Unreadable state is no state — better a fresh timer than a restored lie.
          }
        }
        setRestoredKey(storageKey);
      })
      .catch(() => {
        if (!cancelled) setRestoredKey(storageKey);
      });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  // Tick while running. One second is a display cadence, not a sampling rate.
  useEffect(() => {
    if (state.startedAt == null) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [state.startedAt]);

  /**
   * Catch up the instant the app comes back. Without this the display would hold its last value until
   * the next interval fires — up to a second of visibly wrong time at exactly the moment someone looks
   * at their phone to see how long they've been running.
   */
  useEffect(() => {
    const sync = () => setNow(Date.now());
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') sync();
    });
    let onVisible: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      onVisible = () => {
        if (document.visibilityState === 'visible') sync();
      };
      document.addEventListener('visibilitychange', onVisible);
    }
    return () => {
      sub.remove();
      if (onVisible && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const persist = useCallback(
    (next: Persisted) => {
      setState(next);
      setNow(Date.now());
      if (storageKey) void AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
    },
    [storageKey],
  );

  const start = useCallback(() => persist({ startedAt: Date.now(), accumulated: 0 }), [persist]);

  const pause = useCallback(() => {
    setState((s) => {
      if (s.startedAt == null) return s;
      const next: Persisted = { startedAt: null, accumulated: s.accumulated + (Date.now() - s.startedAt) / 1000 };
      if (storageKey) void AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [storageKey]);

  const resume = useCallback(() => {
    setState((s) => {
      if (s.startedAt != null) return s;
      const next: Persisted = { startedAt: Date.now(), accumulated: s.accumulated };
      if (storageKey) void AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
      return next;
    });
    setNow(Date.now());
  }, [storageKey]);

  const reset = useCallback(() => {
    persist(EMPTY);
    if (storageKey) void AsyncStorage.removeItem(storageKey).catch(() => {});
  }, [persist, storageKey]);

  const elapsedSec = Math.max(
    0,
    Math.floor(state.accumulated + (state.startedAt != null ? (now - state.startedAt) / 1000 : 0)),
  );

  const loading = storageKey != null && restoredKey !== storageKey;

  return { elapsedSec, running: state.startedAt != null, loading, start, pause, resume, reset };
}
