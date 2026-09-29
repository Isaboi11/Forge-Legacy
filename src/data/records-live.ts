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

/**
 * Every load row for this athlete. Empty on any failure — a record read never takes a screen down.
 *
 * ⚠ `workout_id` ARRIVES WITH 0242, AND THIS MUST WORK BEFORE IT IS PASTED. Named in the select on a
 * database without the column, PostgREST refuses the whole read — every record on every screen would
 * vanish. So it asks with the column and, on any error, asks again without it: the rows then carry no
 * `workout_id` and `recordsByWorkout` attributes all of them by their sets, as it did before 0242.
 */
export async function fetchLoadRecordRows(athleteId: string): Promise<RecordRow[]> {
  const read = (cols: string) =>
    supabase.from('personal_records').select(cols).eq('athlete_id', athleteId).eq('measure_kind', 'load');
  let { data, error } = await read(`${RECORD_COLS}, workout_id`);
  if (error) ({ data, error } = await read(RECORD_COLS));
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
    // 0242: a row that names its workout is this session's exactly when it names THIS one. Only rows
    // from before 0242 (no `workout_id`) go through the date window and the set-matching below.
    const own = annotated.filter((r) => r.isRecord && r.row.workout_id === workoutId);
    const relevant = annotated.filter(
      (r) => r.isRecord && !r.row.workout_id && (r.row.achieved_on === day || r.row.achieved_on === next),
    );
    if (!relevant.length) return recordsByWorkout(own, []).get(workoutId) ?? [];

    const from = `${dayBefore(day)}T00:00:00Z`;
    const to = new Date(Date.parse(`${next}T00:00:00Z`) + 86_400_000).toISOString();
    const { data, error } = await supabase
      .from('workouts')
      .select(ATTRIBUTION_SELECT)
      .eq('athlete_id', athleteId)
      .eq('state', 'saved')
      .gte('started_at', from)
      .lt('started_at', to);
    if (error || !data) return recordsByWorkout(own, []).get(workoutId) ?? [];
    const by = recordsByWorkout([...own, ...relevant], (data as unknown as AttributionRow[]).map(toAttributionWorkout));
    return by.get(workoutId) ?? [];
  } catch {
    return [];
  }
}

export type { AnnotatedRecord, RecordRow, WorkoutRecord };
