/**
 * ══ THE MILE MARKER — WHEN A RUN CROSSES A WHOLE MILE (OR KM), AND WHAT TO SAY ABOUT IT ══
 *
 * PO, 2026-09-28: *"a sound + buzz each mile"*, then *"build the full version (chime + buzz + spoken split)
 * and ship it IN build 10."* `Docs/Live-Activities-Build-Plan.md` header.
 *
 * Pure: no React, no audio, no clock of its own. `useMileMarker` feeds it the run as the tracker sees it —
 * credited distance and MOVING seconds — and it answers "did a marker just pass, and what was the split".
 * Everything that makes a noise lives in `lib/mile-voice`.
 *
 * ══ THE FOUR WAYS THIS GOES WRONG, AND THE RULE FOR EACH ══
 *
 *  · DOUBLE FIRE. The screen re-renders every second and the same distance is observed many times. The
 *    state carries how many whole units have been PASSED, and a marker only fires when that count rises.
 *    Observing the same run twice is a no-op, by construction.
 *
 *  · A BURST. A drain after the phone was away can hand over two miles in one observation. That is ONE
 *    announcement — the newest marker — with the split averaged over what was crossed ("Mile 3. Averaging
 *    8 minutes 42 seconds"), never "Mile 2. Mile 3." read back to back.
 *
 *  · A LATE MARKER. If JS could not run while locked (no background permission), the miles arrive when
 *    the athlete next opens the phone. Saying "Mile 2" three minutes after mile 2 is noise, so a marker
 *    whose boundary is more than `MARKER_STALE_SEC` in the past is passed SILENTLY.
 *
 *    ⚠ "IN THE PAST" IS READ OFF THE TRACK'S OWN TIMESTAMPS, NOT OFF THE CLOCK. The tracker's clock is
 *    wall-time driven, so on unlock it jumps forward FIRST and the drained distance lands a tick later —
 *    interpolating between those two readings would put a ten-minute-old boundary one second ago. The
 *    track point where the boundary was crossed carries the wall time it was actually crossed at.
 *
 *  · A NEW START. Remounting mid-run (a JS reload), a unit switch, or a second bout on the same card
 *    must not replay markers already said. The first observation SEEDS the count from where the run
 *    already is; a clock that goes backwards means a new bout and seeds again.
 *
 * Pause/resume needs no rule of its own: the tracker's clock is MOVING time and its distance does not
 * grow while paused, so a split never includes the water fountain.
 *
 * ⚠ NO `@/` RUNTIME IMPORTS — `node --test` loads this file directly.
 */

import type { UnitSystem } from './run-core.ts';

export type SplitUnit = 'mi' | 'km';

const KM_PER_MI = 1.609344;

/** A marker whose boundary is further in the past than this is passed without a sound. See the header. */
export const MARKER_STALE_SEC = 90;

/** Float slack: 2.9999999997 miles of summed haversines is three miles. */
const EPS = 1e-6;

export const splitUnitFor = (u: UnitSystem): SplitUnit => (u === 'metric' ? 'km' : 'mi');

const inUnits = (miles: number, unit: SplitUnit): number => (unit === 'km' ? miles * KM_PER_MI : miles);

export interface MileMarkerState {
  unit: SplitUnit;
  /** Whole units already passed — announced, or deliberately passed in silence. */
  passed: number;
  /**
   * Moving seconds at the last boundary: where the split being measured began.
   * `null` when it is unknown (seeded mid-run, or after a unit switch) — that split is then not spoken.
   */
  boundarySec: number | null;
  /** The previous observation, for interpolating where between two readings a boundary fell. */
  lastUnits: number;
  lastSec: number;
}

export interface RunObservation {
  /** Credited distance so far, canonical miles — `totalMiles(track)`. */
  miles: number;
  /** MOVING seconds — the tracker's clock, which a pause stops. */
  elapsedSec: number;
  unit: SplitUnit;
  /**
   * The track itself (cumulative `mi`, wall `at`) and the wall clock now — used ONLY to tell whether a
   * boundary was crossed long ago. See "A LATE MARKER". Optional so a caller without them still works;
   * the staleness test then falls back to the moving clock.
   */
  track?: readonly { mi: number; at: number }[];
  nowMs?: number;
}

/** Wall ms of the first point at or past `miles`, or null. The track is sorted by `mi`, so bisect. */
export function crossedAtMs(track: readonly { mi: number; at: number }[], miles: number): number | null {
  let lo = 0;
  let hi = track.length - 1;
  if (hi < 0 || track[hi].mi + EPS < miles) return null;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (track[mid].mi + EPS >= miles) hi = mid;
    else lo = mid + 1;
  }
  return track[lo].at;
}

export interface Marker {
  /** Which marker: 3 for "Mile 3". */
  index: number;
  unit: SplitUnit;
  /** Seconds per unit for the split just finished, or null when it cannot be known honestly. */
  splitSec: number | null;
  /** More than one unit was crossed at once, so `splitSec` is their average. */
  averaged: boolean;
}

function seed(obs: RunObservation): MileMarkerState {
  const units = Math.max(0, inUnits(obs.miles, obs.unit));
  const passed = Math.floor(units + EPS);
  return {
    unit: obs.unit,
    passed,
    /* At the very start the split begins when the clock did, at zero. Seeded past a marker, it began at
       a boundary nobody observed — so it is unknown rather than guessed. */
    boundarySec: passed === 0 ? 0 : null,
    lastUnits: units,
    lastSec: Math.max(0, obs.elapsedSec),
  };
}

/**
 * Fold one observation in. Returns the new state and, at most, ONE marker to announce.
 *
 * `state` null means "nothing observed yet" — the first call seeds and never fires.
 */
export function observeRun(state: MileMarkerState | null, obs: RunObservation): { state: MileMarkerState; marker: Marker | null } {
  if (!Number.isFinite(obs.miles) || !Number.isFinite(obs.elapsedSec)) {
    return { state: state ?? seed({ ...obs, miles: 0, elapsedSec: 0 }), marker: null };
  }
  if (!state || state.unit !== obs.unit) return { state: seed(obs), marker: null };

  /* A clock that went backwards is a new bout — `start()` zeroes it. Seed from wherever that bout is. */
  if (obs.elapsedSec + 1 < state.lastSec) return { state: seed(obs), marker: null };

  /* Distance is monotonic in a bout, but the provisional head can refine a hair backwards. Never let the
     left-hand end of the interpolation move back, or a boundary could be "crossed" twice. */
  const units = Math.max(state.lastUnits, inUnits(obs.miles, obs.unit));
  const sec = Math.max(state.lastSec, obs.elapsedSec);
  const whole = Math.floor(units + EPS);
  const crossed = whole - state.passed;

  if (crossed <= 0) {
    return { state: { ...state, lastUnits: units, lastSec: sec }, marker: null };
  }

  /*
   * WHEN, on the moving clock, the newest boundary fell.
   *
   * Best: off the track's own wall timestamp — how long ago the crossing point was recorded, taken back
   * off the clock. Nothing can pause a run between a crossing and the next observation of it (a pause
   * needs the screen, and the screen observes every second), so wall seconds there ARE moving seconds.
   * Fallback: linear between the last reading and this one.
   */
  const boundaryMiles = state.unit === 'km' ? whole / KM_PER_MI : whole;
  const wallAt = obs.track && obs.nowMs != null ? crossedAtMs(obs.track, boundaryMiles) : null;
  const floorSec = state.boundarySec ?? 0;
  let atSec: number;
  let lateSec: number;
  if (wallAt != null && obs.nowMs != null) {
    lateSec = Math.max(0, (obs.nowMs - wallAt) / 1000);
    atSec = Math.min(sec, Math.max(floorSec, sec - lateSec));
  } else {
    const span = units - state.lastUnits;
    const frac = span > 0 ? Math.min(1, Math.max(0, (whole - state.lastUnits) / span)) : 1;
    atSec = state.lastSec + frac * (sec - state.lastSec);
    lateSec = sec - atSec;
  }

  const raw = state.boundarySec == null ? null : (atSec - state.boundarySec) / crossed;
  const splitSec = raw != null && raw > 0 ? raw : null;

  const next: MileMarkerState = { unit: state.unit, passed: whole, boundarySec: atSec, lastUnits: units, lastSec: sec };

  /* Late: pass it quietly. The count still moves, so it can never fire afterwards either. */
  if (lateSec > MARKER_STALE_SEC) return { state: next, marker: null };

  return { state: next, marker: { index: whole, unit: state.unit, splitSec, averaged: crossed > 1 } };
}

// ── words ────────────────────────────────────────────────────────────────────

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * A duration the way a person says it: "8 minutes 42 seconds", "9 minutes", "45 seconds",
 * "1 hour 2 minutes". Rounded to the second; zero parts are left out.
 */
export function durationWords(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const parts: string[] = [];
  if (h) parts.push(plural(h, 'hour'));
  if (m) parts.push(plural(m, 'minute'));
  if (ss || !parts.length) parts.push(plural(ss, 'second'));
  return parts.join(' ');
}

const UNIT_WORD: Record<SplitUnit, string> = { mi: 'Mile', km: 'Kilometer' };

/**
 * What is SPOKEN. Short and plain, because it arrives mid-stride over music:
 * "Mile 3. 8 minutes 42 seconds."
 */
export function markerSpeech(m: Marker): string {
  const head = `${UNIT_WORD[m.unit]} ${m.index}.`;
  if (m.splitSec == null) return head;
  return `${head} ${m.averaged ? 'Averaging ' : ''}${durationWords(m.splitSec)}.`;
}

/** What is SHOWN — the on-screen line, and all the web preview gets. "Mile 3 · 8:42". */
export function markerLabel(m: Marker): string {
  const head = `${UNIT_WORD[m.unit]} ${m.index}`;
  if (m.splitSec == null) return head;
  const s = Math.max(0, Math.round(m.splitSec));
  const clock = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return `${head} · ${m.averaged ? 'avg ' : ''}${clock}`;
}
