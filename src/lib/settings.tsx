import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { setAnalyticsEnabled } from './analytics';
import { useAuth } from './auth';
import { useQuery } from './useQuery';
import { fetchAppPrefs } from '@/data/settings-live';
import { APP_PREFS_DEFAULTS, type AppPrefs } from '@/domain/settings/preferences';
import type { IntensityLevel } from '@/domain/coach/rulebook/intensity';
import { convertMeasure, formatLoad, type UnitSystem } from '@/domain/settings/units';

/**
 * App-wide experience preferences (units, haptics, sound, reduce-motion), fetched once and shared so a
 * weight renders in the same system on every screen. Modelled on `ProfileProvider`; re-fetches when the
 * session identity changes.
 *
 * Until the profile loads (or when signed out) it serves `APP_PREFS_DEFAULTS`, so nothing waits on it —
 * imperial is the default, matching a fresh athlete.
 */
interface SettingsState {
  prefs: AppPrefs;
  refetch: () => void;
}

const SettingsContext = createContext<SettingsState | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const { data, refetch } = useQuery<AppPrefs>(async () => (uid ? fetchAppPrefs() : APP_PREFS_DEFAULTS), [uid]);

  /**
   * Reconcile the analytics opt-out from SERVER truth into the emitter's local mirror.
   *
   * The mirror is written on tap, which covers the device where the athlete flipped it — and nothing
   * else. On a new device, a reinstall, or after AsyncStorage is cleared, the mirror is absent and the
   * emitter falls back to the disclosed default of ON. For somebody who opted out on their phone and
   * then signed in on the web, that would silently resume collecting from a person who had said no.
   *
   * `data` is the same fetch every unit preference already rides on, so this costs no extra request.
   * The write is inside the effect's callback, never in its body — react-compiler treats a synchronous
   * setState in an effect body as an error, and `setAnalyticsEnabled` is deliberately not React state.
   */
  useEffect(() => {
    if (data) setAnalyticsEnabled(!data.analyticsOptOut);
  }, [data]);

  return <SettingsContext.Provider value={{ prefs: data ?? APP_PREFS_DEFAULTS, refetch }}>{children}</SettingsContext.Provider>;
}

export function useAppPrefs(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useAppPrefs must be used within SettingsProvider');
  return ctx;
}

/**
 * The units view: the chosen system plus two formatters. `fmt` re-expresses an already-formatted
 * pounds string ("315 lb × 3") in the athlete's system — the light-touch way to make the many existing
 * weight strings unit-aware without threading a number through every layer that builds them.
 */
export function useUnits(): {
  units: UnitSystem;
  fmt: (formatted: string) => string;
  load: (lb: number, reps?: number | null) => string;
} {
  const { prefs } = useAppPrefs();
  const fmt = useCallback((formatted: string) => convertMeasure(formatted, prefs.units), [prefs.units]);
  const load = useCallback((lb: number, reps?: number | null) => formatLoad(lb, prefs.units, reps), [prefs.units]);
  return { units: prefs.units, fmt, load };
}

/** Whether to simplify animation — the athlete's preference (the OS setting is honoured separately). */
export function useReduceMotion(): boolean {
  return useAppPrefs().prefs.reduceMotion;
}

/** Whether the app is allowed to make a sound. Real since the rest-timer ding — see `lib/ding`. */
export function useSoundEnabled(): boolean {
  return useAppPrefs().prefs.sound;
}

/**
 * How hard Holt pushes. Feeds `profileFor(level, experience)` — see `domain/coach/rulebook/intensity`.
 *
 * ⚠ THIS IS THE CHOSEN LEVEL, NOT THE PROFILE. Experience bounds it, and experience is device-local
 * (`coach-memory.ts`), so the two are resolved together at the point of use rather than here — a hook
 * that returned a finished profile would have to reach into the coach's memory from the settings layer
 * and would go stale the moment the athlete answered the experience question.
 */
export function useCoachIntensity(): IntensityLevel {
  return useAppPrefs().prefs.coachIntensity;
}
