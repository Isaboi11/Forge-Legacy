import { supabase } from '@/lib/supabase';
import { e1rm } from '@/domain/workout/metrics';

/**
 * W-17 reads the COMMITTED workout back from the DB (real render on committed data — the workout is
 * durable from W-9 Finish; W-17 is presentation after). Volume + per-exercise top set are computed from
 * the persisted sets; PRs come from today's personal_records for this workout's exercises.
 */
export interface CompletionExercise {
  name: string;
  topSet: string | null; // "225 × 5" (heaviest set by e1RM)
  isPR: boolean;
}
export interface Completion {
  workoutId: string;
  workoutName: string;
  chapterName: string | null;
  volume: number;
  sets: number;
  durationSec: number;
  exercises: CompletionExercise[];
  prs: { exercise: string; weight: number; reps: number }[];
  reflection: string | null;
  /** True iff this is the EARLIEST saved workout in its chapter — id-scoped + re-fetch-stable (ONB-D18
   *  first-run reveal). Never a workout_count snapshot: re-opening workout #1 always reads true. */
  isFirstWorkout: boolean;
  /** Honors earned by THIS workout's commit — matched by awarded_at = saved_at (same transaction),
   *  id-scoped + re-open-stable. The W-17 honor hero (minimal M-2). */
  honorsEarned: { honorType: string; displayName: string }[];
}

interface WorkoutRow {
  workout_name: string | null;
  duration_sec: number | null;
  chapter_id: string | null;
  reflection: string | null;
}
interface ExRow {
  id: string;
  name: string;
  position: number;
}
interface SetRow {
  workout_exercise_id: string;
  weight: number | null;
  reps: number | null;
}

export async function fetchCompletion(workoutId: string): Promise<Completion> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');

  const { data: wk, error: we } = await supabase
    .from('workouts')
    .select('workout_name, duration_sec, chapter_id, reflection, saved_at')
    .eq('id', workoutId)
    .single();
  if (we) throw we;
  const workout = wk as WorkoutRow & { saved_at: string | null };

  const { data: exRows, error: ee } = await supabase
    .from('workout_exercises')
    .select('id, name, position')
    .eq('workout_id', workoutId)
    .order('position', { ascending: true });
  if (ee) throw ee;
  const exercises = (exRows ?? []) as ExRow[];

  const exIds = exercises.map((e) => e.id);
  const { data: setRows, error: se } = exIds.length
    ? await supabase.from('workout_sets').select('workout_exercise_id, weight, reps').in('workout_exercise_id', exIds)
    : { data: [], error: null };
  if (se) throw se;
  const sets = (setRows ?? []) as SetRow[];

  const chapterName = workout.chapter_id
    ? ((await supabase.from('chapters').select('name').eq('id', workout.chapter_id).single()).data?.name ?? null)
    : null;

  // First-run detection (ONB-D18): is THIS workout the earliest saved workout in its chapter? Id-scoped
  // by identity, not the mutable counter — re-opening workout #1 after more workouts still reads true.
  let isFirstWorkout = false;
  if (workout.chapter_id) {
    const { data: earliest } = await supabase
      .from('workouts')
      .select('id')
      .eq('chapter_id', workout.chapter_id)
      .eq('state', 'saved')
      .order('saved_at', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1);
    isFirstWorkout = earliest?.[0]?.id === workoutId;
  }

  // Honors earned by THIS commit share the workout's saved_at (same transaction now()).
  const honorsEarned: { honorType: string; displayName: string }[] = [];
  if (workout.saved_at) {
    const { data: hRows } = await supabase
      .from('honor_instances')
      .select('honor_type, display_name')
      .eq('athlete_id', user.id)
      .eq('awarded_at', workout.saved_at);
    for (const h of hRows ?? []) honorsEarned.push({ honorType: h.honor_type, displayName: h.display_name });
  }

  // PRs from this workout = today's load PRs for these exercises.
  const names = exercises.map((e) => e.name);
  const today = new Date().toISOString().slice(0, 10);
  const { data: prRows } = names.length
    ? await supabase
        .from('personal_records')
        .select('exercise, load_value, load_reps')
        .eq('athlete_id', user.id)
        .eq('measure_kind', 'load')
        .eq('achieved_on', today)
        .in('exercise', names)
    : { data: [] };
  const prByExercise = new Map<string, { weight: number; reps: number }>();
  for (const p of prRows ?? []) {
    if (p.load_value != null) prByExercise.set(p.exercise, { weight: p.load_value, reps: p.load_reps ?? 1 });
  }

  // volume + per-exercise top set (heaviest by e1RM)
  let volume = 0;
  const setsByEx = new Map<string, SetRow[]>();
  for (const s of sets) {
    if (s.weight != null && s.reps != null) volume += s.weight * s.reps;
    const arr = setsByEx.get(s.workout_exercise_id) ?? [];
    arr.push(s);
    setsByEx.set(s.workout_exercise_id, arr);
  }

  const completionExercises: CompletionExercise[] = exercises.map((ex) => {
    let top: SetRow | null = null;
    for (const s of setsByEx.get(ex.id) ?? []) {
      if (s.weight == null || s.reps == null) continue;
      if (!top || e1rm(s.weight, s.reps) > e1rm(top.weight ?? 0, top.reps ?? 0)) top = s;
    }
    return {
      name: ex.name,
      topSet: top ? `${top.weight} × ${top.reps}` : null,
      isPR: prByExercise.has(ex.name),
    };
  });

  return {
    workoutId,
    workoutName: workout.workout_name ?? 'Workout',
    chapterName,
    volume: Math.round(volume),
    sets: sets.length,
    durationSec: workout.duration_sec ?? 0,
    exercises: completionExercises,
    prs: [...prByExercise.entries()].map(([exercise, v]) => ({ exercise, weight: v.weight, reps: v.reps })),
    reflection: workout.reflection ?? null,
    isFirstWorkout,
    honorsEarned,
  };
}

/** Persist the Reflect note — a post-commit single-row owner-scoped update (no RPC). */
export async function saveReflection(workoutId: string, text: string): Promise<void> {
  const { error } = await supabase.from('workouts').update({ reflection: text }).eq('id', workoutId);
  if (error) throw error;
}
