import { supabase } from '@/lib/supabase';
import { personalBests, type ActivityKind, type PersonalBest, type UnitSystem } from '@/domain/run/run-core';
import { fetchPriorSessions } from '@/data/runs-live';
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
/* `clock` and `pace2` used to live here — private copies of run-core's `fmtClock` and `fmtPace`, needed
   only because this layer was formatting the cardio line itself. It no longer formats anything; the
   screen does, with the shared functions. Two implementations of "seconds to 24:45" is one too many. */

export type ExerciseDelta = { kind: 'weight'; n: number } | { kind: 'reps'; n: number } | { kind: 'hold' };

/** One conditioning bout as it was recorded. Miles and seconds — the screen converts for display. */
export interface CompletionCardio {
  distanceMi: number | null;
  durationSec: number | null;
  /** Seconds per mile. Null when there isn't enough distance to divide by honestly. */
  paceSecPerMi: number | null;
  /** Treadmill grade. Null outdoors, and null indoors when it was flat. */
  inclinePct: number | null;
  /** Where it was actually done, as recorded — never the toggle's last position (0097). */
  modality: 'outdoor' | 'indoor' | null;
}
/**
 * What a run beat — ported from the retired Active Run screen, which owned this and nothing else does.
 *
 * Empty for a strength session, and empty for a first-ever run: there is no best to beat yet, and
 * "your longest ever" on somebody's first walk is a hollow thing to be told.
 */
export interface CompletionExercise {
  name: string;
  topSet: string | null; // "225 × 5" (heaviest set by e1RM); null on a cardio block
  /**
   * A cardio block's actual result, STRUCTURED — not a pre-joined string.
   *
   * It was `"3.10 mi · 24:45 · 7:59 /mi"`, built here with a hardcoded `mi`, so an athlete on metric
   * finished a 5 km run and read "3.11 mi" on the one screen that summarises what they just did. This
   * layer has no business formatting a unit it doesn't know; the screen holds `useUnits`, so it converts
   * and the record stays in miles as it always does.
   *
   * Structured also means the screen can lay a run out as the run it was — where it was done, what the
   * incline was, whether GPS measured it or the athlete typed it — instead of a single wrapping line.
   */
  cardio: CompletionCardio | null;
  sets: number; // done-set count this workout
  isPR: boolean;
  delta: ExerciseDelta | null; // vs this lift's previous session (null = no prior)
}
export type CompletionHero =
  | { kind: 'honor' | 'pr'; eyebrow: string; title: string; note: string; featured: true }
  | { kind: 'milestone' | 'consistency'; eyebrow: string; title: string; note: string; featured: false };
export interface Completion {
  /** What this run beat, when it was a run. Empty for a strength session and for a first-ever run. */
  runBests: PersonalBest[];
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
  /** Derived from the session's content at save time — 'running' when the session WAS a run. */
  activity_type?: string | null;
  /** Miles, rolled up from the bout's sets by 0096 when the caller passes none. */
  distance?: number | null;
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
  /** Cardio bouts (0096/0097). Null on every strength set. */
  duration_sec?: number | null;
  distance?: number | null;
  modality?: string | null;
  incline_pct?: number | null;
}

/**
 * `units` is here only because `personalBests` writes its own sentences ("0.42 mi farther than your
 * best"), and a sentence has to know whether it is speaking miles or kilometres. Everything else this
 * function returns is raw — the cardio bout used to be a pre-joined string with a hardcoded `mi` in it,
 * and a metric athlete finished a 5 km run and read "3.11 mi" on the screen summarising their session.
 */
export async function fetchCompletion(workoutId: string, units: UnitSystem = 'imperial'): Promise<Completion> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');

  const { data: wk, error: we } = await supabase
    .from('workouts')
    .select('workout_name, duration_sec, chapter_id, reflection, saved_at, program_id, activity_type, distance')
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
    ? await supabase
        .from('workout_sets')
        .select('workout_exercise_id, weight, reps, duration_sec, distance, modality, incline_pct')
        .in('workout_exercise_id', exIds)
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
  /*
   * A BASELINE IS NOT A RECORD, so it does not get the badge.
   *
   * The first mark on a lift is written — the next session needs something to beat — but an athlete's
   * first ever bench press is not a personal record, it is the start of the data. This asks whether an
   * EARLIER mark exists for the same lift; if none does, today's row is that start.
   *
   * Derived rather than stored: "is this the earliest row for this exercise" is already answerable from
   * the rows themselves, and a column would be one more thing to write correctly forever.
   */
  const prByExercise = new Map<string, { weight: number; reps: number }>();
  if ((prRows ?? []).length) {
    const todaysNames = [...new Set((prRows ?? []).map((p) => p.exercise))];
    const { data: earlier } = await supabase
      .from('personal_records')
      .select('exercise')
      .eq('athlete_id', user.id)
      .eq('measure_kind', 'load')
      .lt('achieved_on', today)
      .in('exercise', todaysNames);
    const hasHistory = new Set((earlier ?? []).map((e) => (e as { exercise: string }).exercise));
    for (const p of prRows ?? []) {
      if (p.load_value == null) continue;
      if (!hasHistory.has(p.exercise)) continue; // first mark on this lift — a baseline, not a record
      prByExercise.set(p.exercise, { weight: p.load_value, reps: p.load_reps ?? 1 });
    }
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

    // A cardio block is recognised by what it MEASURED, not by a stored flag — the evidence of what it
    // was is the distance and the clock.
    const bout = exSets.find((x) => (x.distance ?? 0) > 0 || (x.duration_sec ?? 0) > 0) ?? null;
    const dist = bout?.distance != null && bout.distance > 0 ? Number(bout.distance) : null;
    const dur = bout?.duration_sec != null && bout.duration_sec > 0 ? Number(bout.duration_sec) : null;
    const cardio: CompletionCardio | null = bout
      ? {
          distanceMi: dist,
          durationSec: dur,
          // 0.05 mi is the floor under the division: a 90-foot bout would otherwise report a pace, and
          // it would be a wild one.
          paceSecPerMi: dist != null && dur != null && dist > 0.05 ? dur / dist : null,
          // A zero grade is flat, not "no incline recorded" — but showing "0.0%" on every treadmill run
          // is noise, so it reads as absent. Outdoors it is meaningless and stays null.
          inclinePct: bout.incline_pct != null && bout.incline_pct > 0 ? Number(bout.incline_pct) : null,
          modality: bout.modality === 'indoor' || bout.modality === 'outdoor' ? bout.modality : null,
        }
      : null;

    return {
      name: ex.name,
      topSet: top ? `${top.weight} × ${top.reps}` : null,
      cardio,
      // A block counts as the one bout it is, the same way it counts as one unit of progress.
      sets: bout ? 1 : exSets.filter((s) => s.weight != null && s.reps != null).length,
      isPR: prByExercise.has(ex.name),
      delta: bout ? null : deltaOf(now, priorTop.get(ex.name) ?? null),
    };
  });

  /*
   * Run records, for a session that WAS a run.
   *
   * Keyed off the workout's own activity_type, which is now derived from its content at save time
   * (`sessionActivityType`) rather than hard-coded 'strength' — without that this branch could never
   * fire, because every run was filed as a strength workout carrying a distance nobody looked at.
   *
   * A leg day with a cool-down walk stays 'strength' and correctly claims nothing: three minutes on a
   * treadmill at the end of a session is not a walking record.
   */
  const RUN_KIND: Record<string, ActivityKind> = { running: 'run', walking: 'walk', cycling: 'bike' };
  const runKind = RUN_KIND[String(workout.activity_type ?? '')] ?? null;
  let runBests: PersonalBest[] = [];
  if (runKind && workout.distance != null && Number(workout.distance) > 0 && (workout.duration_sec ?? 0) > 0) {
    // Excluding THIS workout matters: it is already saved by the time this screen loads, so without the
    // exclusion the run would be compared against itself and could never be a record.
    const priors = await fetchPriorSessions(runKind, { id: workoutId, savedAt: savedAt ?? new Date().toISOString() });
    runBests = personalBests(Number(workout.distance), workout.duration_sec ?? 0, priors, runKind, units);
  }

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
    runBests,
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
