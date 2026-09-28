import { Platform } from 'react-native';

import { hkTypeNumber } from '@/domain/health/activity-map';
import type { HealthWorkout } from '@/domain/health/dedup';
import { hkErrorReport, type HkErrorCode } from '@/domain/health/error-report';
import { normalizeHealthWorkout, type RawHealthWorkout } from '@/domain/health/normalize';
import type { WriteBackSample } from '@/domain/health/write-back';
import { reportError } from '@/lib/diagnostics';

/**
 * THE ONE DOOR TO HEALTHKIT (Build 10 · `Docs/Apple-Health-Build-Plan.md` §3.1–3.2, §7).
 *
 * Everything that touches `@kingstinct/react-native-healthkit@16.0.0` goes through this file. Nothing else
 * may import the package: the package creates its Nitro hybrid objects AT IMPORT TIME
 * (`src/modules.ts` → `NitroModules.createHybridObject('CoreModule')` …), and on a binary without the
 * native half that is a throw during module evaluation — a launch crash on build 9, which runs the same JS
 * through OTAs only from `ota/build9-js`, but the guard is here anyway.
 *
 * ══ appleHealthAvailable() — ALL FOUR MUST HOLD (§3.2) ══
 *
 *   1. Platform.OS === 'ios'
 *   2. NitroModules.hasHybridObject('CoreModule') && ('WorkoutsModule') — the names are the package's own
 *      autolinking registrations (`nitrogen/generated/ios/ReactNativeHealthkitAutolinking.mm`). Nitro
 *      itself is in every build since `react-native-compressor` brought it, and is required lazily too.
 *   3. the lazy `require` of the package, inside try/catch
 *   4. `isHealthDataAvailable()` — false on an iPad without Health
 * Decided once per launch and cached; none of the four can change while the app runs.
 *
 * The web gets `apple-health.web.ts` instead, so the package never enters the web bundle.
 *
 * ══ ⚠ NOTHING HEALTH-SHAPED LEAVES THIS FILE AS AN ERROR ══
 *
 * Every call catches everything. A failure is reported as an allow-listed CODE only (`error-report.ts`:
 * `hk_auth_failed` · `hk_query_failed` · `hk_save_failed` · `hk_anchor_invalid`) — never the thrown error,
 * whose message could carry a date or a type, and never a sample. Nothing here reaches a global handler.
 */

// Only the handful of calls v1 needs, typed structurally so this file compiles without the package's
// generated types in the web/tsc graph mattering.
interface HealthKitModule {
  isHealthDataAvailable(): boolean;
  requestAuthorization(req: { toRead?: readonly string[]; toShare?: readonly string[] }): Promise<boolean>;
  queryWorkoutSamplesWithAnchor(options: {
    limit: number;
    anchor?: string;
    filter?: { date?: { startDate?: Date; endDate?: Date }; uuids?: string[] };
  }): Promise<{ workouts: readonly unknown[]; newAnchor: string }>;
  queryWorkoutSamples(options: {
    limit: number;
    ascending?: boolean;
    filter?: { uuids?: string[]; metadata?: { withMetadataKey: string; operatorType?: number; value?: string } };
  }): Promise<readonly unknown[]>;
  saveWorkoutSample(
    workoutActivityType: number,
    quantities: readonly unknown[],
    startDate: Date,
    endDate: Date,
    totals?: { distance?: number },
    metadata?: Record<string, string | boolean>,
  ): Promise<unknown>;
}

const HYBRID_OBJECTS = ['CoreModule', 'WorkoutsModule'] as const;

const WORKOUT_TYPE = 'HKWorkoutTypeIdentifier';
/** §3.3 step 2 — read: workouts + the distances they carry; share: workouts (+ distances Forge writes). */
const TO_READ = [
  WORKOUT_TYPE,
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKQuantityTypeIdentifierDistanceCycling',
  'HKQuantityTypeIdentifierDistanceSwimming',
] as const;
const TO_SHARE = [WORKOUT_TYPE, 'HKQuantityTypeIdentifierDistanceWalkingRunning', 'HKQuantityTypeIdentifierDistanceCycling'] as const;

/** `ComparisonPredicateOperator.equalTo` (core's enum, 4). */
const OP_EQUAL = 4;

let cached: HealthKitModule | null | undefined;

function load(): HealthKitModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS !== 'ios') return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NitroModules } = require('react-native-nitro-modules') as { NitroModules: { hasHybridObject(name: string): boolean } };
    if (!HYBRID_OBJECTS.every((n) => NitroModules.hasHybridObject(n))) return cached;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const hk = require('@kingstinct/react-native-healthkit') as HealthKitModule;
    if (typeof hk?.isHealthDataAvailable !== 'function' || !hk.isHealthDataAvailable()) return cached;
    cached = hk;
  } catch {
    cached = null;
  }
  return cached;
}

/** True only on an iPhone running a build with HealthKit linked, where Health exists. Never throws. */
export function appleHealthAvailable(): boolean {
  return load() !== null;
}

/** Report a failure as its code and nothing else. Total: it cannot throw. */
export function reportHealthError(code: HkErrorCode): void {
  const report = hkErrorReport(code);
  if (!report) return;
  // A plain object: `reportError` then takes `code` as the name and has no stack to carry anything else.
  reportError({ code: report.code, message: report.code }, { source: 'manual' });
}

/**
 * Show Apple's permission sheet. Resolves true when the sheet was shown and closed — which says NOTHING
 * about whether read access was granted (HealthKit never tells an app; §3.3 step 3).
 */
export async function requestAppleHealthAccess(): Promise<boolean> {
  const hk = load();
  if (!hk) return false;
  try {
    return await hk.requestAuthorization({ toRead: TO_READ, toShare: TO_SHARE });
  } catch {
    reportHealthError('hk_auth_failed');
    return false;
  }
}

export interface WorkoutPage {
  workouts: HealthWorkout[];
  /** HealthKit's opaque anchor after this read — store it for the next incremental sync. */
  newAnchor: string | null;
}

function normalizeAll(raw: readonly unknown[]): HealthWorkout[] {
  const out: HealthWorkout[] = [];
  for (const w of raw) {
    const n = normalizeHealthWorkout(w as RawHealthWorkout);
    if (n) out.push(n);
  }
  return out;
}

/**
 * Workouts since `anchor` (incremental), or — with no anchor — every workout that STARTED on or after
 * `sinceMs` (the first pull, and the fallback when an anchor stops being valid). `deletedSamples` are not
 * read at all: ownership never reverts (DEDUP §1), so a workout deleted in Health stays in Forge (§3.4).
 *
 * v16 throws on an invalid anchor instead of silently re-reading everything (§3.1). So when an anchored
 * read fails, it is retried ONCE as a date-window read from `sinceMs`; dedup (the ledger and the unique
 * index) makes the overlap harmless. Returns null when Health could not be read at all.
 */
export async function readHealthWorkouts(opts: { anchor: string | null; sinceMs: number }): Promise<WorkoutPage | null> {
  const hk = load();
  if (!hk) return null;
  const windowRead = () =>
    hk.queryWorkoutSamplesWithAnchor({ limit: 0, filter: { date: { startDate: new Date(opts.sinceMs) } } });
  try {
    let res: { workouts: readonly unknown[]; newAnchor: string };
    if (opts.anchor) {
      try {
        res = await hk.queryWorkoutSamplesWithAnchor({ limit: 0, anchor: opts.anchor });
      } catch {
        reportHealthError('hk_anchor_invalid');
        res = await windowRead();
      }
    } else {
      res = await windowRead();
    }
    return { workouts: normalizeAll(res.workouts ?? []), newAnchor: typeof res.newAnchor === 'string' && res.newAnchor ? res.newAnchor : null };
  } catch {
    reportHealthError('hk_query_failed');
    return null;
  }
}

/** Specific workouts by HealthKit UUID — the held possible duplicates the Review step asks about. */
export async function readHealthWorkoutsById(uuids: readonly string[]): Promise<HealthWorkout[] | null> {
  const hk = load();
  if (!hk) return null;
  if (!uuids.length) return [];
  try {
    return normalizeAll(await hk.queryWorkoutSamples({ limit: 0, filter: { uuids: [...uuids] } }));
  } catch {
    reportHealthError('hk_query_failed');
    return null;
  }
}

/**
 * Write one finished Forge workout to Health (§3.5). Idempotent by `HKExternalUUID`: when Health already
 * holds a workout carrying this Forge id (a retried save, a replayed offline save), nothing is written.
 * Resolves whether a sample is now in Health. Never throws.
 */
export async function writeHealthWorkout(sample: WriteBackSample): Promise<boolean> {
  const hk = load();
  if (!hk) return false;
  try {
    const existing = await hk.queryWorkoutSamples({
      limit: 1,
      filter: { metadata: { withMetadataKey: 'HKExternalUUID', operatorType: OP_EQUAL, value: sample.metadata.HKExternalUUID } },
    });
    if (existing.length) return true;
  } catch {
    // The check is a courtesy; the echo check on import is what actually prevents a loop. Write anyway.
  }
  try {
    await hk.saveWorkoutSample(
      hkTypeNumber(sample.activityType),
      [],
      new Date(sample.start),
      new Date(sample.end),
      sample.totalDistanceMeters != null ? { distance: sample.totalDistanceMeters } : undefined,
      { HKExternalUUID: sample.metadata.HKExternalUUID, HKIndoorWorkout: sample.metadata.HKIndoorWorkout },
    );
    return true;
  } catch {
    reportHealthError('hk_save_failed');
    return false;
  }
}
