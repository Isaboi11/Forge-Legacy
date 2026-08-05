import { supabase } from '@/lib/supabase';
import { playlistFromRow, playlistToRow, type WorkoutPlaylistLink } from '@/domain/workout/playlist';
import { personalBests, type ActivityKind, type PersonalBest, type UnitSystem } from '@/domain/run/run-core';
import { fetchPriorSessions } from '@/data/runs-live';
import { completionSetCount, e1rm } from '@/domain/workout/metrics';
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
/**
 * `'honor'` IS NO LONGER PRODUCED — `fetchCompletion` stopped electing it as the hero when M-2 moved
 * to the Legacy tab (migration 0112; see the hero block below). The variant and its laurel glyph are
 * kept rather than deleted because the shape is still correct for an honor and the artwork exists
 * nowhere else in the tree; nothing renders it today. Do not read a live `kind: 'honor'` as evidence
 * that the summary still announces honors — reach it and you have reintroduced the thing that moved.
 */
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
  /**
   * The attached playlist, or null — Workout-Playlist-Amendment-001 §8A.
   *
   * Rebuilt through `playlistFromRow`, which re-checks the URL's host against the service tag, so a row
   * that predates 0105's constraint reads as "no playlist" rather than rendering a service-labelled chip
   * the app would refuse to open.
   */
  playlist: WorkoutPlaylistLink | null;
  /** True iff this is the EARLIEST saved workout in its chapter — id-scoped + re-fetch-stable (ONB-D18
   *  first-run reveal). Never a workout_count snapshot: re-opening workout #1 always reads true. */
  isFirstWorkout: boolean;
  /** Honors earned by THIS workout's commit — matched by awarded_at = saved_at (same transaction),
   *  id-scoped + re-open-stable. The W-17 honor hero (minimal M-2). */
  honorsEarned: { honorType: string; displayName: string }[];
  /** The next session in THIS workout's program, or null for a session that wasn't part of one. */
  nextWorkoutName: string | null;
  /**
   * The program THIS workout graduated, or null — the M-4 ceremony's trigger and payload.
   *
   * ══ DERIVED FROM THE DATABASE, NOT HANDED OVER BY WHOEVER NAVIGATED HERE ══
   *
   * Matched by `programs.ended_at = workouts.saved_at`: both are the same `now()` inside `save_workout`'s
   * transaction (0104), which is the identical trick `honorsEarned` above uses and for the identical
   * reason. It survives a cold start, needs no navigation param, and — the part that matters — it cannot
   * claim a graduation that did not actually happen, because the only thing that writes that timestamp
   * is the transition itself.
   */
  graduation: {
    programId: string;
    programName: string;
    startedAt: string | null;
    graduatedAt: string;
    workouts: number;
  } | null;
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
  let graduation: Completion['graduation'] = null;
  if (workout.program_id) {
    try {
      const [program, done] = await Promise.all([
        fetchProgram(workout.program_id),
        fetchProgramCompletedCount(workout.program_id),
      ]);
      if (program) {
        const next = nextSession(program.structure, done);
        if (next) nextWorkoutName = dayLabel(next.day, next.dayIndex);

        /*
         * Did THIS save graduate it? `ended_at === saved_at` is the proof — both are the same `now()`
         * from inside save_workout's transaction (0104). Re-opening an older workout of the same program
         * reads false, so the ceremony belongs to the session that actually earned it and to no other.
         */
        if (program.state === 'graduated' && workout.saved_at && program.endedAt === workout.saved_at) {
          graduation = {
            programId: program.id,
            programName: program.name,
            startedAt: program.startedAt,
            graduatedAt: program.endedAt,
            workouts: done,
          };
        }
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

  /*
   * The playlist columns, FETCHED SEPARATELY AND TOLERANTLY — exactly as `partners` is read in
   * activity-live.ts, and for the identical reason.
   *
   * ══ A MISSING COLUMN IS A 42703, AND 42703 FAILS THE WHOLE SELECT ══
   *
   * These three columns arrive in migration 0105. Naming them in the big select above would mean that on
   * any database where 0105 has not been applied yet, `fetchCompletion` throws and W-17 — the screen an
   * athlete lands on the instant they finish training — shows "Couldn't load your summary" for every
   * session. The playlist is an optional annotation; it must never be able to take the summary down with
   * it.
   *
   * So it is its own query, and its failure is swallowed into "no playlist attached", which is also the
   * honest answer on a database that cannot store one yet.
   */
  let playlist: WorkoutPlaylistLink | null = null;
  {
    const { data: plRow } = await supabase
      .from('workouts')
      .select('playlist_url, playlist_service, playlist_name')
      .eq('id', workoutId)
      .maybeSingle();
    playlist = playlistFromRow(plRow as Parameters<typeof playlistFromRow>[0]);
  }

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
      // A set logged at 0 lb is a bodyweight set, and "0 × 12" is not what the athlete did.
      topSet: top ? `${top.weight === 0 ? 'BW' : top.weight} × ${top.reps}` : null,
      cardio,
      /*
       * EVERY SET THAT WAS LOGGED, whether or not it carried a weight.
       *
       * This filtered on `s.weight != null && s.reps != null`, so an exercise done for three unweighted
       * warm-up sets reported "0 sets" — to an athlete who had just done three. The header count on the
       * same screen is `sets.length`, unfiltered, so the screen also contradicted itself: 3 at the top,
       * 0 on the row. Bodyweight work, banded work and warm-ups were all invisible by the same rule.
       *
       * The rule now lives in the domain with a test around it (`completionSetCount`) so it cannot
       * quietly regain a weight filter. Volume and top-set still require a load, and correctly so — a set
       * with nothing on the bar moves no volume — but the COUNT of what you did never depended on it.
       */
      sets: completionSetCount(exSets.map((s) => ({ weight: s.weight, reps: s.reps, distance: s.distance, durationSec: s.duration_sec }))),
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

  /*
   * ── hero moment: PR > milestone (every 10th) > consistency ──
   *
   * HONORS USED TO OUTRANK ALL OF THESE, and no longer appear here at all. An honor is a Legacy fact,
   * not a fact about the session just trained, and announcing it as a line of text on the Seal screen
   * both put it in the wrong room and spent the moment cheaply — the forged-medallion M-2 ceremony was
   * built for exactly this and had never once played. It now fires on the Legacy tab, which is where
   * this screen navigates next anyway (`goHome` → `/(tabs)/legacy`). See migration 0112.
   *
   * `honorsEarned` stays on the payload: the Record stage still lists what this session earned. It is
   * the HEADLINE that moved, not the information.
   */
  let hero: CompletionHero | null = null;
  if (prByExercise.size) {
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
    playlist,
    reflection: workout.reflection ?? null,
    isFirstWorkout,
    honorsEarned,
    nextWorkoutName,
    graduation,
  };
}

/** Persist the Reflect note — a post-commit single-row owner-scoped update (no RPC). */
export async function saveReflection(workoutId: string, text: string): Promise<void> {
  const { error } = await supabase.from('workouts').update({ reflection: text }).eq('id', workoutId);
  if (error) throw error;
}

/**
 * Attach, edit or REMOVE the session's playlist link — §8A.2.
 *
 * Pass null to remove; `playlistToRow` writes three explicit nulls, because clearing only the URL would
 * leave an orphan name that 0105's `workouts_playlist_name_needs_link` rejects outright.
 *
 * ══ THIS ONE THROWS, UNLIKE THE ATTACH DURING THE WORKOUT ══
 *
 * `saveWorkout` swallows its playlist write because a failure there would cost a session that had already
 * been committed. Here there is no session at risk — the workout is long since durable — and the athlete
 * is watching a sheet they just tapped "Save Playlist" in. Silence would leave them believing a link was
 * attached that wasn't, and they would find out on W-19, weeks later, when it wasn't there.
 *
 * §8A.2: saving "updates the session record immediately, independent of 'Done'."
 */
export async function savePlaylist(workoutId: string, link: WorkoutPlaylistLink | null): Promise<void> {
  const { error } = await supabase.from('workouts').update(playlistToRow(link)).eq('id', workoutId);
  if (error) throw error;
}
