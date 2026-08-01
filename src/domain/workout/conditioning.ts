/**
 * Conditioning as part of a session — the model and the rules, pure so they can be tested.
 *
 * A run, row or ride is an ORDINARY EXERCISE whose set carries duration and distance instead of weight
 * and reps (migration 0096). That is the whole trick: it can sit anywhere in a day, more than once, and
 * every existing reader that walks a session keeps working because the shape didn't change.
 */

import type { DistanceActivity } from './save';

export type ExerciseKind = 'strength' | 'distance';

/**
 * The three ways to run, and the whole list.
 *
 * This was five activities (run/walk/bike/row/swim) with an outdoor-or-indoor toggle inside each leg —
 * two choices to express one thing. The mode IS the exercise: pick "Outdoor Run" and you have said both
 * what you are doing and how it will be measured, and the record says the same. If it rains, swapping
 * the exercise is the same gesture as swapping any other.
 *
 * Treadmill and Indoor measure identically — a clock and a number you read off something. They are two
 * entries because they are two different things to have done, and the record should be able to say
 * which. Walking, cycling, rowing and swimming remain available through Log a Run, where a whole session
 * is the activity; inside a workout, this is the list.
 */
export type RunMode = 'outdoor' | 'treadmill' | 'indoor';

export interface ConditioningPreset {
  key: RunMode;
  name: string;
  /** What it is, in the picker's second line. */
  detail: string;
  /** Whether the Active Run screen measures it. False = a clock, and a distance the athlete enters. */
  gps: boolean;
}

export const CONDITIONING: ConditioningPreset[] = [
  { key: 'outdoor', name: 'Outdoor Run', detail: 'GPS tracks distance, pace and route', gps: true },
  { key: 'treadmill', name: 'Treadmill Run', detail: 'Timed — read the distance off the machine', gps: false },
  { key: 'indoor', name: 'Indoor Run', detail: 'Timed — track, court, or anywhere indoors', gps: false },
];

export const presetFor = (key: string): ConditioningPreset | undefined =>
  CONDITIONING.find((c) => c.key === key);

/** The catalog key a leg carries, so it round-trips through the picker, save and template alike. */
export const conditioningKey = (mode: RunMode): string => `conditioning:${mode}`;

export const isConditioningKey = (k: string | null | undefined): boolean => !!k?.startsWith('conditioning:');

export function modeFromKey(k: string | null | undefined): RunMode | null {
  if (!isConditioningKey(k)) return null;
  const rest = k!.slice('conditioning:'.length);
  return presetFor(rest) ? (rest as RunMode) : null;
}

/** Every run is a run as far as the record is concerned; the mode is how it was measured. */
export const activityForMode = (): DistanceActivity => 'running';

/**
 * The three runs in the Exercise Picker's own shape, so they sit in the same list as everything else.
 *
 * NOT added to `PICKER_DB` and NOT given a browse category. The six-category taxonomy is LOCKED
 * (`Exercise-Library-Wireframe-Spec-W21` §5), the catalog is invariant-tested to be name-sorted and to
 * come entirely from `exercises.json`, and a run is none of those things — it has no muscle map, no
 * movement pattern and no difficulty, because it is a different KIND of exercise. So the picker pins
 * these three above its results rather than the catalog absorbing them.
 */
export const CONDITIONING_PICKER_ITEMS = CONDITIONING.map((c) => ({
  catalogKey: conditioningKey(c.key),
  name: c.name,
  equip: c.detail,
  muscles: [] as string[],
  type: 'cardio',
}));

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
