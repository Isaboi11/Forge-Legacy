import { supabase } from '@/lib/supabase';
import type { ActiveSession, SessionExercise, SessionSet } from '@/domain/workout/types';

/**
 * Reopen a finished workout as a live session.
 *
 * ══ WHAT COMES BACK, AND WHY IT LOOKS DONE ══
 *
 * Every set that was already committed returns marked `done` **and** `saved`. Done because the athlete
 * did it and should see it; `saved` because `buildAppendExercises` uses that flag to leave it out of the
 * write on the way back — the first half of the session is already in the database and must not be
 * inserted a second time.
 *
 * `continuingWorkoutId` is what makes Finish behave differently: it appends to this workout rather than
 * creating a second one. Without it, continuing would produce two entries in history for one session,
 * two chapter counts, and a duplicate program slot.
 *
 * ⚠ THE WINDOW IS THE SERVER'S CALL. `continue_workout` refuses anything older than an hour and says so.
 * This function will happily rehydrate a week-old workout; the write is what stops it. That order is
 * deliberate — a device clock is an input, not a fact.
 */
export async function fetchWorkoutAsSession(workoutId: string): Promise<ActiveSession | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('workouts')
    .select(
      'id, workout_name, activity_type, started_at, program_id, template_id, workout_exercises(name, catalog_key, section, position, notes, group_id, group_name, group_kind, group_rounds, workout_sets(set_index, weight, reps, duration_sec, distance, modality, incline_pct))',
    )
    .eq('id', workoutId)
    .eq('athlete_id', user.id)
    .maybeSingle();

  if (error || !data) return null;

  type SetRow = {
    set_index: number;
    weight: number | null;
    reps: number | null;
    duration_sec: number | null;
    distance: number | null;
    modality: string | null;
    incline_pct: number | null;
  };
  type ExRow = {
    name: string;
    catalog_key: string | null;
    section: string;
    position: number;
    notes: string | null;
    group_id: string | null;
    group_name: string | null;
    group_kind: string | null;
    group_rounds: number | null;
    workout_sets: SetRow[] | null;
  };
  const row = data as unknown as {
    id: string;
    workout_name: string | null;
    activity_type: string | null;
    started_at: string;
    program_id: string | null;
    template_id: string | null;
    workout_exercises: ExRow[] | null;
  };

  const exercises: SessionExercise[] = [...(row.workout_exercises ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((ex) => {
      const sets: SessionSet[] = [...(ex.workout_sets ?? [])]
        .sort((a, b) => a.set_index - b.set_index)
        .map((s) => ({
          setIndex: s.set_index,
          weight: s.weight,
          // The prescription is gone — what survives is what was actually done, which is the honest
          // thing to show. Target mirrors actual so the row reads as complete rather than as a goal.
          targetReps: s.reps ?? 0,
          actualReps: s.reps,
          durationSec: s.duration_sec,
          distanceMi: s.distance,
          inclinePct: s.incline_pct,
          modality: (s.modality as SessionSet['modality']) ?? null,
          done: true,
          saved: true,
        }));

      return {
        name: ex.name,
        catalogKey: ex.catalog_key ?? undefined,
        section: (['warmup', 'main', 'cooldown'].includes(ex.section) ? ex.section : 'main') as SessionExercise['section'],
        position: ex.position,
        ...(ex.notes ? { note: ex.notes } : {}),
        ...(ex.group_id ? { groupId: ex.group_id } : {}),
        ...(ex.group_name ? { groupName: ex.group_name } : {}),
        ...(ex.group_kind ? { groupKind: ex.group_kind as SessionExercise['groupKind'] } : {}),
        ...(ex.group_rounds != null ? { groupRounds: ex.group_rounds } : {}),
        sets,
      } as SessionExercise;
    });

  return {
    workoutName: row.workout_name ?? 'Workout',
    activityType: row.activity_type ?? 'strength',
    startedAt: row.started_at,
    exercises,
    exerciseIndex: 0,
    ...(row.program_id ? { programId: row.program_id } : {}),
    ...(row.template_id ? { templateId: row.template_id } : {}),
    continuingWorkoutId: row.id,
  } as ActiveSession;
}
