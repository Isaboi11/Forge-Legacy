/**
 * Forge workout → the Apple Health sample written after a save (Build 10 · Apple-Health-Build-Plan §3.5).
 * Pure; the native wrapper hands the result to `saveWorkoutSample`.
 *
 * `HKExternalUUID = <forge workout id>` is what lets the import recognise its own echo (`isForgeEcho`),
 * even if the sample ever arrives under a bundle ID other than Forge's.
 *
 * Not written: energy (Forge doesn't measure it) and routes (Decision 3). Distance is written for distance
 * activities only — a strength session's `distance` column is null anyway, but the rule is stated, not
 * relied on.
 */

import { forgeToHealthType, toMeters } from './activity-map.ts';

export interface WriteBackSource {
  id: string;
  activityType: string;
  startedAt: string; // ISO
  durationSec: number;
  distance: number | null;
  distanceUnit: string | null;
  indoor?: boolean;
}

export interface WriteBackSample {
  /** HK case name, e.g. `running`, `traditionalStrengthTraining`. */
  activityType: string;
  start: string;
  end: string;
  totalDistanceMeters: number | null;
  metadata: { HKExternalUUID: string; HKIndoorWorkout: boolean };
}

const DISTANCE_TYPES = new Set(['running', 'walking', 'cycling', 'swimming', 'rowing', 'elliptical', 'stair_climber']);

/** Null when there is nothing sensible to write (no id, bad date, no duration). */
export function toWriteBackSample(w: WriteBackSource): WriteBackSample | null {
  const startMs = Date.parse(w.startedAt);
  if (!w.id || !Number.isFinite(startMs) || !(w.durationSec > 0)) return null;
  const type = w.activityType.toLowerCase();
  return {
    activityType: forgeToHealthType(type),
    start: new Date(startMs).toISOString(),
    end: new Date(startMs + Math.round(w.durationSec) * 1000).toISOString(),
    totalDistanceMeters: DISTANCE_TYPES.has(type) ? toMeters(w.distance, w.distanceUnit) : null,
    metadata: { HKExternalUUID: w.id, HKIndoorWorkout: w.indoor === true },
  };
}
