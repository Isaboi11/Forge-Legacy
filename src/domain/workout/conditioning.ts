/**
 * Conditioning as part of a session — the model and the rules, pure so they can be tested.
 *
 * A run, row or ride is an ORDINARY EXERCISE whose set carries duration and distance instead of weight
 * and reps (migration 0096). That is the whole trick: it can sit anywhere in a day, more than once, and
 * every existing reader that walks a session keeps working because the shape didn't change.
 */

import type { DistanceActivity } from './save';

export type ExerciseKind = 'strength' | 'distance';

/** How the athlete is doing it TODAY — chosen at log time, never prescribed by the program. */
export type ConditioningMode = 'outdoor' | 'indoor';

export interface ConditioningPreset {
  key: DistanceActivity;
  /** What the exercise is called in the session. */
  name: string;
  /** The indoor phrasing, because "Treadmill Run" is not "Outdoor Run". */
  indoorName: string;
  /** Whether GPS can measure it at all — a rowing machine and a pool cannot be tracked outdoors. */
  gps: boolean;
}

/**
 * The conditioning an athlete can add. Deliberately a short list rather than the 794-exercise catalog:
 * that catalog is organised by movement pattern and equipment, and none of its entries carry a distance.
 */
export const CONDITIONING: ConditioningPreset[] = [
  { key: 'running', name: 'Run', indoorName: 'Treadmill Run', gps: true },
  { key: 'walking', name: 'Walk', indoorName: 'Treadmill Walk', gps: true },
  { key: 'cycling', name: 'Bike', indoorName: 'Stationary Bike', gps: true },
  { key: 'rowing', name: 'Row', indoorName: 'Rowing Machine', gps: false },
  { key: 'swimming', name: 'Swim', indoorName: 'Pool Swim', gps: false },
];

export const presetFor = (key: string): ConditioningPreset | undefined => CONDITIONING.find((c) => c.key === key);

/** The catalog key a conditioning leg carries, so it round-trips through save and template alike. */
export const conditioningKey = (key: DistanceActivity): string => `conditioning:${key}`;

export const isConditioningKey = (k: string | null | undefined): boolean => !!k?.startsWith('conditioning:');

export function activityFromKey(k: string | null | undefined): DistanceActivity | null {
  if (!isConditioningKey(k)) return null;
  const rest = k!.slice('conditioning:'.length);
  return presetFor(rest) ? (rest as DistanceActivity) : null;
}

/**
 * What a leg is aiming at. Either, both, or neither — "3 miles", "20 minutes", "3 miles under 24:00",
 * and "just go" are all real prescriptions, so none of them is modelled as a special case.
 */
export interface ConditioningTarget {
  distanceMi?: number | null;
  durationSec?: number | null;
}

/** "3.0 mi", "20:00", "3.0 mi · 20:00", or null when nothing was prescribed. */
export function targetLabel(t: ConditioningTarget, unitLabel: string, toDist: (mi: number) => number): string | null {
  const parts: string[] = [];
  if (t.distanceMi != null && t.distanceMi > 0) parts.push(`${toDist(t.distanceMi).toFixed(1)} ${unitLabel}`);
  if (t.durationSec != null && t.durationSec > 0) parts.push(clock(t.durationSec));
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** "20:00", "1:05:00". Shared with the logger's running clock so a target and an actual read alike. */
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return h > 0 ? `${h}:${mm}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
}

/**
 * Is the leg finished?
 *
 * A leg with a target is done when the target is MET; a leg without one is done as soon as anything was
 * recorded. Deliberately not "the timer was stopped" — someone who runs 3.2 of a prescribed 3 miles has
 * finished it, and someone who stops at 1.5 has not, whatever the timer says.
 */
export function legComplete(actual: ConditioningTarget, target: ConditioningTarget): boolean {
  const d = actual.distanceMi ?? 0;
  const t = actual.durationSec ?? 0;
  const wantD = target.distanceMi ?? 0;
  const wantT = target.durationSec ?? 0;
  if (wantD <= 0 && wantT <= 0) return d > 0 || t > 0;
  // Both targets must be met when both were set — "3 miles in 20 minutes" is one prescription, not two.
  if (wantD > 0 && d < wantD) return false;
  if (wantT > 0 && t < wantT) return false;
  return true;
}

/** 0–1 across whichever target exists; the further-along of the two when both do. */
export function legProgress(actual: ConditioningTarget, target: ConditioningTarget): number {
  const parts: number[] = [];
  if ((target.distanceMi ?? 0) > 0) parts.push((actual.distanceMi ?? 0) / target.distanceMi!);
  if ((target.durationSec ?? 0) > 0) parts.push((actual.durationSec ?? 0) / target.durationSec!);
  if (parts.length === 0) return 0;
  return Math.max(0, Math.min(1, Math.max(...parts)));
}

/**
 * Average pace of a leg, in seconds per mile. Null when either half is missing.
 *
 * Deliberately NOT floored at some minimum distance the way the live tracker's readout is: this runs on
 * a completed leg where the athlete typed the distance, so a short treadmill interval has a real pace
 * and should show it.
 */
export function legPaceSec(distanceMi: number | null | undefined, durationSec: number | null | undefined): number | null {
  if (!distanceMi || !durationSec || distanceMi <= 0 || durationSec <= 0) return null;
  return durationSec / distanceMi;
}

/**
 * Parse what someone typed into the distance field.
 *
 * Accepts "3", "3.1", "3,1" (a comma decimal, which a phone keypad will happily produce on many
 * locales) and rejects everything else as null rather than NaN — a NaN reaching the save would store a
 * distance nobody ran.
 */
export function parseDistance(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  if (!/^\d*\.?\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || n > 500) return null;
  return n;
}
