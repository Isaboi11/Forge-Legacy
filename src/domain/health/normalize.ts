/**
 * A HealthKit workout, as `@kingstinct/react-native-healthkit@16.0.0` hands it over → the plain
 * `HealthWorkout` the rest of `src/domain/health` reads (Build 10 · Apple-Health-Build-Plan §2).
 *
 * Pure, and typed STRUCTURALLY rather than against the library's types, so `node --test` can load it and a
 * library bump that renames a field fails a test here instead of silently dropping every workout.
 *
 * ══ WHAT IS READ, AND NOTHING ELSE ══
 *
 * §2's list exactly: UUID, activity type, start/end, duration, total distance, the indoor flag, the source
 * name + bundle ID, and the device product type. Energy, heart rate, events and routes are on the sample
 * too — they are never touched here, so they can never travel further.
 *
 * ══ UNITS ══
 *
 * v16's `WorkoutProxy.totalDistance` is `{ unit: 'meters', quantity }` and `duration` is seconds (read from
 * the Swift source). Other spellings are accepted because a library bump may change them; an unknown
 * distance unit is dropped to null (no distance) rather than guessed — a wrong guess would be a wrong mile.
 */

import type { HealthWorkout } from './dedup.ts';

interface Quantity {
  unit?: string | null;
  quantity?: number | null;
}

/** The fields this module reads off a library workout sample (a `WorkoutProxy`, or its `toJSON()`). */
export interface RawHealthWorkout {
  uuid?: string | null;
  workoutActivityType?: number | string | null;
  startDate?: Date | string | number | null;
  endDate?: Date | string | number | null;
  duration?: Quantity | null;
  totalDistance?: Quantity | null;
  metadata?: Record<string, unknown> | null;
  sourceRevision?: {
    source?: { name?: string | null; bundleIdentifier?: string | null } | null;
    productType?: string | null;
  } | null;
  device?: { model?: string | null; hardwareVersion?: string | null } | null;
}

const METERS_PER: Readonly<Record<string, number>> = {
  m: 1,
  meter: 1,
  meters: 1,
  km: 1000,
  mi: 1609.344,
  yd: 0.9144,
  ft: 0.3048,
  cm: 0.01,
};

const SECONDS_PER: Readonly<Record<string, number>> = { s: 1, sec: 1, seconds: 1, ms: 0.001, min: 60, hr: 3600, h: 3600 };

/** A distance quantity → meters, or null when there is none or the unit is unknown. */
export function quantityMeters(q: Quantity | null | undefined): number | null {
  if (!q || typeof q.quantity !== 'number' || !Number.isFinite(q.quantity)) return null;
  const per = METERS_PER[(q.unit ?? '').trim().toLowerCase()];
  return per == null ? null : q.quantity * per;
}

function toIso(d: Date | string | number | null | undefined): string | null {
  if (d == null) return null;
  const ms = d instanceof Date ? d.getTime() : typeof d === 'number' ? d : Date.parse(d);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** `HKIndoorWorkout` arrives as a boolean from v16, but HealthKit itself stores an NSNumber — accept 1/0. */
const truthy = (v: unknown): boolean => v === true || v === 1 || v === '1' || v === 'true';

/**
 * Library sample → `HealthWorkout`, or null when the sample is unusable (no UUID, no type, bad dates).
 * Unusable is dropped quietly: it could not have been imported, and nothing about it is reported.
 */
export function normalizeHealthWorkout(raw: RawHealthWorkout | null | undefined): HealthWorkout | null {
  if (!raw) return null;
  const uuid = str(raw.uuid);
  const type = raw.workoutActivityType;
  const start = toIso(raw.startDate);
  const end = toIso(raw.endDate);
  if (!uuid || type == null || type === '' || !start || !end) return null;

  const spanSec = (Date.parse(end) - Date.parse(start)) / 1000;
  const d = raw.duration;
  const per = d ? SECONDS_PER[(d.unit ?? 's').trim().toLowerCase()] : undefined;
  const durationSec = d && typeof d.quantity === 'number' && Number.isFinite(d.quantity) && per != null ? d.quantity * per : spanSec;

  const meta = raw.metadata ?? {};
  return {
    uuid,
    activityType: typeof type === 'number' ? type : String(type),
    start,
    end,
    durationSec,
    distanceMeters: quantityMeters(raw.totalDistance),
    indoor: truthy(meta.HKIndoorWorkout),
    sourceName: str(raw.sourceRevision?.source?.name),
    bundleId: str(raw.sourceRevision?.source?.bundleIdentifier),
    // `sourceRevision.productType` is the recording device's model id ("Watch7,1"); `device` is the fallback.
    productType: str(raw.sourceRevision?.productType) ?? str(raw.device?.hardwareVersion) ?? str(raw.device?.model),
    externalUuid: str(meta.HKExternalUUID),
  };
}
