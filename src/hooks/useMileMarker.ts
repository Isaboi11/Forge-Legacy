import { useEffect, useRef } from 'react';

import { markerLabel, markerSpeech, observeRun, splitUnitFor, type MileMarkerState } from '@/domain/run/mile-marker';
import { totalMiles, type TrackPoint } from '@/domain/run/run-core';
import type { UnitSystem } from '@/domain/settings/units';
/* Resolves `mile-voice.ts` on native and `mile-voice.web.ts` (silent) on web. */
import { announceMileMarker, prepareMileVoice, releaseMileVoice } from '@/lib/mile-voice';
import { useAppPrefs } from '@/lib/settings';
import type { RunPhase } from './useRunTracker';

/**
 * The mile marker, wired to a live GPS bout: a chime, a buzz and the spoken split at every mile (km on
 * metric). PO 2026-09-28. The deciding is `domain/run/mile-marker.ts` (pure, tested); the sound is
 * `lib/mile-voice`; this hook only connects the tracker to the two.
 *
 * ⚠ IT RUNS WITH THE PHONE LOCKED. That is the whole feature, and it works only because the tracker now
 *   drains the background buffer as fixes arrive (`useRunTracker`, build 10) — so `track` keeps growing
 *   in a pocket and this effect keeps seeing it. React still renders and runs effects while the app is in
 *   the background; nothing here needs the screen.
 *
 * ⚠ SIDE EFFECTS ONLY, NO STATE. The marker state lives in a ref written inside the effect (never read in
 *   render), and the on-screen line goes out through `onMarker` — a sync setState here would be the
 *   strict-lint error, and a state-held marker would re-render the card for nothing.
 *
 * Idempotent by construction: the effect runs every second (the clock ticks), and observing the same run
 * twice never fires twice — see `observeRun`.
 */
export function useMileMarker({
  track,
  elapsedSec,
  phase,
  units,
  enabled,
  onMarker,
}: {
  track: TrackPoint[];
  elapsedSec: number;
  phase: RunPhase;
  units: UnitSystem;
  /** A GPS run, walk or ride (rides: PO 09-28). Off for treadmills and machines. */
  enabled: boolean;
  /** The on-screen line — "Mile 3 · 8:42". Keep it stable (useCallback); a new one each render is harmless but wasteful. */
  onMarker?: (label: string) => void;
}): void {
  const { prefs } = useAppPrefs();
  const state = useRef<MileMarkerState | null>(null);
  const on = enabled && phase !== 'idle';

  /* Set the audio session up while the screen is still on; stop talking when the bout ends. */
  useEffect(() => {
    if (!on) return;
    prepareMileVoice();
    return () => releaseMileVoice();
  }, [on]);

  useEffect(() => {
    if (!on) {
      /* The next bout seeds afresh. */
      state.current = null;
      return;
    }
    const r = observeRun(state.current, {
      miles: totalMiles(track),
      elapsedSec,
      unit: splitUnitFor(units),
      track,
      nowMs: Date.now(),
    });
    state.current = r.state;
    if (!r.marker) return;
    announceMileMarker({ speech: markerSpeech(r.marker), voice: prefs.runVoice, sound: prefs.sound, haptics: prefs.haptics });
    onMarker?.(markerLabel(r.marker));
  }, [on, track, elapsedSec, units, prefs.runVoice, prefs.sound, prefs.haptics, onMarker]);
}
