import { supabase } from '@/lib/supabase';
import {
  annotateRecords,
  dayBefore,
  recordsByWorkout,
  utcDay,
  type AnnotatedRecord,
  type AttributionWorkout,
  type RecordRow,
  type WorkoutRecord,
} from '@/domain/workout/records-core';

/**
 * The ONE read of `personal_records` for "what is my best" and "which session set a record" (QA F9).
 * The rules live in `domain/workout/records-core.ts`; this only fetches.
 *
 * An athlete's load rows are few (one per record broken), so the whole set is read and annotated —
 * whether a row is a record depends on every row before it.
 */

export const RECORD_COLS = 'id, exercise, catalog_key, load_value, load_reps, achieved_on, created_at';

/** Every load row for this athlete. Empty on any failure — a record read never takes a screen down. */
export async function fetchLoadRecordRows(athleteId: string): Promise<RecordRow[]> {
  const { data, error } = await supabase
    .from('personal_records')
    .select(RECORD_COLS)
    .eq('athlete_id', athleteId)
    .eq('measure_kind', 'load');
  if (error || !data) return [];
  return data as unknown as RecordRow[];
}

/** The persisted-session shape `recordsByWorkout` reads, as PostgREST returns it. */
export const ATTRIBUTION_SELECT = 'id, started_at, workout_exercises(name, catalog_key, section, workout_sets(weight, reps))';

type AttributionRow = {
  id: string;
  started_at: string;
  workout_exercises:
    | { name: string; catalog_key: string | null; section: string | null; workout_sets: { weight: number | null; reps: number | null }[] | null }[]
    | null;
};

export function toAttributionWorkout(w: AttributionRow): AttributionWorkout {
  return {
    id: w.id,
    startedAt: w.started_at,
    exercises: (w.workout_exercises ?? []).map((e) => ({
      name: e.name,
      catalogKey: e.catalog_key,
      section: e.section,
      sets: e.workout_sets ?? [],
    })),
  };
}

/**
 * The records ONE session set. Reads the records, then every saved session that could have lifted them
 * (the record's day and the day before), so "the earliest session with that set" is decided against the
 * real neighbours rather than this session alone.
 */
export async function fetchRecordsSetBy(athleteId: string, workoutId: string, startedAt: string): Promise<WorkoutRecord[]> {
  try {
    const annotated = annotateRecords(await fetchLoadRecordRows(athleteId));
    const day = utcDay(startedAt);
    // A record dated `day` or the day after can belong to a session started on `day`.
    const next = utcDay(new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString());
    const relevant = annotated.filter((r) => r.isRecord && (r.row.achieved_on === day || r.row.achieved_on === next));
    if (!relevant.length) return [];

    const from = `${dayBefore(day)}T00:00:00Z`;
    const to = new Date(Date.parse(`${next}T00:00:00Z`) + 86_400_000).toISOString();
    const { data, error } = await supabase
      .from('workouts')
      .select(ATTRIBUTION_SELECT)
      .eq('athlete_id', athleteId)
      .eq('state', 'saved')
      .gte('started_at', from)
      .lt('started_at', to);
    if (error || !data) return [];
    const by = recordsByWorkout(relevant, (data as unknown as AttributionRow[]).map(toAttributionWorkout));
    return by.get(workoutId) ?? [];
  } catch {
    return [];
  }
}

export type { AnnotatedRecord, RecordRow, WorkoutRecord };
