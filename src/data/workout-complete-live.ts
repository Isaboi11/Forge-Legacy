import { supabase } from '@/lib/supabase';
import { e1rm } from '@/domain/workout/metrics';
import { fetchProgram, fetchProgramCompletedCount } from '@/data/programs-live';
import { dayLabel, nextSession } from '@/domain/program/progress-core';

/** This session's top set vs the same lift's previous session → +weight / +reps / Held (or null if new). */
function deltaOf(now: { w: number; r: number } | null, last: { w: number; r: number } | null): ExerciseDelta | null {
  if (!now || !last) return null;
  if (now.w > last.w) return { kind: 'weight', n: Math.round((now.w - last.w) * 10) / 10 };
  if (now.w === last.w && now.r > last.r) return { kind: 'reps', n: now.r - last.r };
  return { kind: 'hold' };
}
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/**
 * W-17 reads the COMMITTED workout back from the DB (real render on committed data — the workout is
 * durable from W-9 Finish; W-17 is presentation after). Volume + per-exercise top set are computed from
 * the persisted sets; PRs come from today's personal_records for this workout's exercises.
 */
export type ExerciseDelta = { kind: 'weight'; n: number } | { kind: 'reps'; n: number } | { kind: 'hold' };
export interface CompletionExercise {
  name: string;
  topSet: string | null; // "225 × 5" (heaviest set by e1RM)
  sets: number; // done-set count this workout
  isPR: boolean;
  delta: ExerciseDelta | null; // vs this lift's previous session (null = no prior)
}
export type CompletionHero =
  | { kind: 'honor' | 'pr'; eyebrow: string; title: string; note: string; featured: true }
  | { kind: 'milestone' | 'consistency'; eyebrow: string; title: string; note: string; featured: false };
export interface Completion {
  workoutId: string;
  workoutName: string;
  chapterName: string | null;
  dateLabel: string | null; // "Mar 14" from saved_at
  volume: number;
  volumeDelta: number | null; // vs the previous saved session's volume (null = no prior)
  chapterOrdinal: number | null; // "your Nth session in this chapter"
  sets: number;
  durationSec: number;
  exercises: CompletionExercise[];
  prs: { exercise: string; weight: number; reps: number }[];
  hero: CompletionHero | null;
  pastReflection: { label: string; text: string } | null;
  reflection: string | null;
  /** True iff this is the EARLIEST saved workout in its chapter — id-scoped + re-fetch-stable (ONB-D18
   *  first-run reveal). Never a workout_count snapshot: re-opening workout #1 always reads true. */
  isFirstWorkout: boolean;
  /** Honors earned by THIS workout's commit — matched by awarded_at = saved_at (same transaction),
   *  id-scoped + re-open-stable. The W-17 honor hero (minimal M-2). */
  honorsEarned: { honorType: string; displayName: string }[];
  /** The next session in THIS workout's program, or null for a session that wasn't part of one. */
  nextWorkoutName: string | null;
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
    .select('workout_name, duration_sec, chapter_id, reflection, saved_at, program_id')
    .eq('id', workoutId)
    .single();
  if (we) throw we;
  const workout = wk as WorkoutRow & { saved_at: string | null; program_id: string | null };

  /**
   * "Up next" comes from the program this workout actually belonged to. It used to be looked up by name
   * against the built-in catalog's workout list, so the moment an athlete trained a program they'd built
   * themselves the name was never found and the line silently disappeared.
   */
  let nextWorkoutName: string | null = null;
  if (workout.program_id) {
    try {
      const [program, done] = await Promise.all([
        fetchProgram(workout.program_id),
        fetchProgramCompletedCount(workout.program_id),
      ]);
      if (program) {
        const next = nextSession(program.structure, done);
        if (next) nextWorkoutName = dayLabel(next.day, next.dayIndex);
      }
    } catch {
      // a lookup failure just means no "Up next" line — never fail the completion screen over it
    }
  }

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

  // ── prior-session context: per-lift previous top set, previous volume, resurfaced reflection, ordinal ──
  const savedAt = workout.saved_at;
  let volumeDelta: number | null = null;
  let chapterOrdinal: number | null = null;
  let pastReflection: { label: string; text: string } | null = null;
  const priorTop = new Map<string, { w: number; r: number }>();

  if (savedAt) {
    const { data: priorWk } = await supabase
      .from('workouts')
      .select('id')
      .eq('athlete_id', user.id)
      .eq('state', 'saved')
      .lt('saved_at', savedAt)
      .order('saved_at', { ascending: false })
      .limit(30);
    const priorIds = (priorWk ?? []).map((w) => w.id as string);

    if (priorIds.length && names.length) {
      const { data: pex } = await supabase.from('workout_exercises').select('id, name, workout_id').in('workout_id', priorIds).in('name', names);
      const pexRows = (pex ?? []) as { id: string; name: string; workout_id: string }[];
      if (pexRows.length) {
        const { data: psets } = await supabase
          .from('workout_sets')
          .select('workout_exercise_id, weight, reps')
          .in('workout_exercise_id', pexRows.map((e) => e.id));
        const psetsByEx = new Map<string, SetRow[]>();
        for (const s of (psets ?? []) as SetRow[]) {
          const arr = psetsByEx.get(s.workout_exercise_id) ?? [];
          arr.push(s);
          psetsByEx.set(s.workout_exercise_id, arr);
        }
        const rank = new Map(priorIds.map((id, i) => [id, i])); // 0 = most recent
        const bestRank = new Map<string, number>();
        for (const e of pexRows) {
          const r = rank.get(e.workout_id) ?? 999;
          if ((bestRank.get(e.name) ?? 999) <= r) continue; // keep the most-recent occurrence per lift
          let top: SetRow | null = null;
          for (const s of psetsByEx.get(e.id) ?? []) {
            if (s.weight == null || s.reps == null) continue;
            if (!top || e1rm(s.weight, s.reps) > e1rm(top.weight ?? 0, top.reps ?? 0)) top = s;
          }
          if (top && top.weight != null && top.reps != null) {
            priorTop.set(e.name, { w: top.weight, r: top.reps });
            bestRank.set(e.name, r);
          }
        }
      }
    }

    if (priorIds.length) {
      const { data: prevEx } = await supabase.from('workout_exercises').select('id').eq('workout_id', priorIds[0]);
      const prevExIds = (prevEx ?? []).map((e) => e.id as string);
      if (prevExIds.length) {
        const { data: prevSets } = await supabase.from('workout_sets').select('weight, reps').in('workout_exercise_id', prevExIds);
        let prevVol = 0;
        for (const s of (prevSets ?? []) as SetRow[]) if (s.weight != null && s.reps != null) prevVol += s.weight * s.reps;
        volumeDelta = Math.round(volume) - Math.round(prevVol);
      }
    }

    const { data: pr } = await supabase
      .from('workouts')
      .select('reflection, saved_at')
      .eq('athlete_id', user.id)
      .eq('state', 'saved')
      .lt('saved_at', savedAt)
      .not('reflection', 'is', null)
      .order('saved_at', { ascending: false })
      .limit(1);
    const pastRow = pr?.[0] as { reflection: string | null; saved_at: string } | undefined;
    if (pastRow?.reflection) {
      const days = Math.round((Date.parse(savedAt) - Date.parse(pastRow.saved_at)) / 86400000);
      pastReflection = { label: days >= 300 ? 'A year ago, you wrote' : 'Last time, you wrote', text: pastRow.reflection };
    }
  }

  if (workout.chapter_id && savedAt) {
    const { count } = await supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('chapter_id', workout.chapter_id)
      .eq('state', 'saved')
      .lte('saved_at', savedAt);
    chapterOrdinal = count ?? null;
  }

  const completionExercises: CompletionExercise[] = exercises.map((ex) => {
    const exSets = setsByEx.get(ex.id) ?? [];
    let top: SetRow | null = null;
    for (const s of exSets) {
      if (s.weight == null || s.reps == null) continue;
      if (!top || e1rm(s.weight, s.reps) > e1rm(top.weight ?? 0, top.reps ?? 0)) top = s;
    }
    const now = top && top.weight != null && top.reps != null ? { w: top.weight, r: top.reps } : null;
    return {
      name: ex.name,
      topSet: top ? `${top.weight} × ${top.reps}` : null,
      sets: exSets.filter((s) => s.weight != null && s.reps != null).length,
      isPR: prByExercise.has(ex.name),
      delta: deltaOf(now, priorTop.get(ex.name) ?? null),
    };
  });

  // ── hero moment: honor > PR > milestone (every 10th) > consistency ──
  let hero: CompletionHero | null = null;
  if (honorsEarned.length) {
    hero = { kind: 'honor', eyebrow: 'Honor Earned', title: honorsEarned[0].displayName, note: honorsEarned.length > 1 ? `+${honorsEarned.length - 1} more this session` : 'A permanent mark', featured: true };
  } else if (prByExercise.size) {
    const [name, v] = [...prByExercise.entries()][0];
    hero = { kind: 'pr', eyebrow: 'New Personal Record', title: `${name} · ${v.weight} × ${v.reps}`, note: 'A new best', featured: true };
  } else if (chapterOrdinal && chapterOrdinal % 10 === 0) {
    hero = { kind: 'milestone', eyebrow: 'Milestone', title: `${ordinal(chapterOrdinal)} Session`, note: chapterName ?? 'and climbing', featured: false };
  } else if (chapterOrdinal) {
    hero = { kind: 'consistency', eyebrow: 'Consistency', title: 'Another one down', note: `Your ${ordinal(chapterOrdinal)} session this chapter`, featured: false };
  }

  return {
    workoutId,
    workoutName: workout.workout_name ?? 'Workout',
    chapterName,
    dateLabel: fmtDate(savedAt),
    volume: Math.round(volume),
    volumeDelta,
    chapterOrdinal,
    sets: sets.length,
    durationSec: workout.duration_sec ?? 0,
    exercises: completionExercises,
    prs: [...prByExercise.entries()].map(([exercise, v]) => ({ exercise, weight: v.weight, reps: v.reps })),
    hero,
    pastReflection,
    reflection: workout.reflection ?? null,
    isFirstWorkout,
    honorsEarned,
    nextWorkoutName,
  };
}

/** Persist the Reflect note — a post-commit single-row owner-scoped update (no RPC). */
export async function saveReflection(workoutId: string, text: string): Promise<void> {
  const { error } = await supabase.from('workouts').update({ reflection: text }).eq('id', workoutId);
  if (error) throw error;
}
