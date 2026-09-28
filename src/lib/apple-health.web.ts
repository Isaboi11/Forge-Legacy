import type { HealthWorkout } from '@/domain/health/dedup';
import type { HkErrorCode } from '@/domain/health/error-report';
import type { WriteBackSample } from '@/domain/health/write-back';

/**
 * The web's Apple Health: the same API as `apple-health.ts` with nothing behind it (plan §3.2), so the
 * HealthKit package never enters the web bundle. Every call answers "not here".
 */

export interface WorkoutPage {
  workouts: HealthWorkout[];
  newAnchor: string | null;
}

export const appleHealthAvailable = (): boolean => false;
export const reportHealthError = (code: HkErrorCode): void => void code;
export const requestAppleHealthAccess = async (): Promise<boolean> => false;
export const readHealthWorkouts = async (opts: { anchor: string | null; sinceMs: number }): Promise<WorkoutPage | null> => (void opts, null);
export const readHealthWorkoutsById = async (uuids: readonly string[]): Promise<HealthWorkout[] | null> => (void uuids, null);
export const writeHealthWorkout = async (sample: WriteBackSample): Promise<boolean> => (void sample, false);
