/**
 * The `import_external_workouts` RPC payload and the words around it (Build 10 · Apple-Health-Build-Plan §3.3,
 * §6.4). Pure.
 *
 * ══ saved_at IS THE WORKOUT'S END, NOT NOW ══
 *
 * Every server read — honors, goals, competitions, squad totals — keys on `saved_at`. The RPC stamps it from
 * `ended_at` here; stamping `now()` would drop 90 days of history into this week's goals and streaks. This
 * payload carries both ends so the server never has to guess.
 *
 * ⚠ The RPC (migration 0234) is not written yet. The field names below are this module's proposal; the
 *   migration must read the same names, and `import-rows.test.mjs` pins them so a rename is a visible edit.
 */

import type { ImportCandidate } from './dedup.ts';

/** §6.4: at most 200 rows per call. */
export const MAX_ROWS_PER_CALL = 200;

export const IMPORT_SOURCE = 'apple_health' as const;

/** One row of `p_rows`. Distance is miles, like every Forge distance row (`distance_unit 'mi'`). */
export interface ImportRowPayload {
  external_id: string;
  activity_type: string;
  workout_name: string;
  started_at: string;
  ended_at: string;
  duration_sec: number;
  distance: number | null;
  distance_unit: 'mi';
  indoor: boolean;
  source_label: string;
}

export function toPayloadRow(c: ImportCandidate): ImportRowPayload {
  return {
    external_id: c.externalId,
    activity_type: c.activityType,
    workout_name: c.name,
    started_at: c.startedAt,
    ended_at: c.endedAt,
    duration_sec: c.durationSec,
    distance: c.distanceMi,
    distance_unit: 'mi',
    indoor: c.indoor,
    source_label: c.sourceLabel,
  };
}

/** Split into RPC-sized calls, oldest first — so an interrupted import leaves a contiguous past, not holes. */
export function chunkPayload(rows: readonly ImportCandidate[], size: number = MAX_ROWS_PER_CALL): ImportRowPayload[][] {
  const sorted = [...rows].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const out: ImportRowPayload[][] = [];
  for (let i = 0; i < sorted.length; i += size) out.push(sorted.slice(i, i + size).map(toPayloadRow));
  return out;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * What the first-connect screen says after the query (§3.3 step 3). HealthKit never says whether read
 * access was granted — zero results and a denial look identical — so "none found" always carries the way
 * to check the permission.
 */
export function foundSummary(found: number, windowDays: number): string {
  if (found <= 0) {
    return 'No workouts found. If you turned off Workouts for Forge, you can change that in the Health app → Sharing → Apps → Forge Legacy.';
  }
  return `Found ${plural(found, 'workout', 'workouts')} from the last ${windowDays} days.`;
}

/** "N other workouts not imported" — strength, HIIT, yoga … (§4). Null when there are none to mention. */
export function notImportedLine(count: number): string | null {
  if (count <= 0) return null;
  return `${plural(count, 'other workout', 'other workouts')} not imported`;
}

/** The one quiet line for honors earned from imported history (PO 09-28: no one-by-one ceremonies). */
export function historyHonorsLine(count: number): string | null {
  if (count <= 0) return null;
  return `${plural(count, 'honor', 'honors')} from your history`;
}

/** The Review step's one button. */
export function addButtonLabel(count: number): string {
  return `Add ${plural(count, 'workout', 'workouts')}`;
}

/** The ongoing-sync badge on the Settings row when a possible duplicate is held (§5 rule 4). */
export function needsLookBadge(count: number): string | null {
  if (count <= 0) return null;
  return `${plural(count, 'workout needs', 'workouts need')} a look`;
}
