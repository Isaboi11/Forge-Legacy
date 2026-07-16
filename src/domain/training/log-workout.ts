import { supabase } from '@/lib/supabase';

/**
 * The Phase 3 WRITE — turning "Finish Workout" into a real mutation. One logged session becomes:
 *   workouts(state='saved') → workout_exercises → performed workout_sets
 *   → derived load PRs (vs the athlete's current max) → an ACCOMPLISHMENT timeline row per PR
 *   → the active chapter's workout_count +1.
 *
 * There is no client transaction in supabase-js, so this is sequential-with-cleanup: if any step after
 * the parent insert fails, the workout is deleted (cascades exercises/sets) and any PR/timeline rows
 * written so far are removed — so a failure never leaves a partial log. Every write is RLS-checked as
 * self (athlete_id = auth.uid()). A load PR needs a real entered weight; the program prescribes only
 * sets×reps, so lifts with no weight persist as sets but never fabricate a PR.
 */
export interface LoggedLift {
  catalogKey?: string;
  name: string;
  /** lb; null = bodyweight / not entered → a set with no load, never a PR. */
  weight: number | null;
  reps: number | null;
}

export interface LogWorkoutInput {
  workoutName: string;
  startedAt: string; // ISO
  modality?: string; // maps to workouts.activity_type; default 'strength'
  lifts: LoggedLift[];
}

export interface LogWorkoutResult {
  workoutId: string;
  prs: { exercise: string; weight: number; unit: string }[];
  timelineAdded: number;
}

const LB = 'lb';

export async function logWorkout(input: LogWorkoutInput): Promise<LogWorkoutResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');
  const uid = user.id;
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  // Active chapter (nest the workout + count it there).
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, workout_count')
    .eq('athlete_id', uid)
    .eq('is_active', true)
    .maybeSingle();
  const chapterId = chapter?.id ?? null;

  // Parent workout.
  const { data: wk, error: we } = await supabase
    .from('workouts')
    .insert({
      athlete_id: uid,
      chapter_id: chapterId,
      workout_name: input.workoutName,
      activity_type: input.modality ?? 'strength',
      started_at: input.startedAt,
      saved_at: nowIso,
      duration_sec: Math.max(0, Math.round((Date.parse(nowIso) - Date.parse(input.startedAt)) / 1000)),
      state: 'saved',
    })
    .select('id')
    .single();
  if (we || !wk) throw we ?? new Error('workout insert failed');
  const workoutId = wk.id;

  const prIds: string[] = [];
  const timelineIds: string[] = [];
  try {
    // Exercises (ordered).
    const exRows = input.lifts.map((l, i) => ({
      workout_id: workoutId,
      catalog_key: l.catalogKey ?? null,
      name: l.name,
      section: 'main',
      position: i,
    }));
    const { data: exercises, error: ee } = await supabase.from('workout_exercises').insert(exRows).select('id, position');
    if (ee || !exercises) throw ee ?? new Error('exercise insert failed');
    const exIdByPos = new Map<number, string>(exercises.map((r) => [r.position, r.id]));

    // Performed sets (one entered top set per lift that has a weight+reps).
    const setRows = input.lifts
      .map((l, i) => ({ l, id: exIdByPos.get(i) }))
      .filter((x) => x.id && x.l.weight != null && x.l.reps != null)
      .map((x) => ({ workout_exercise_id: x.id, set_index: 0, weight: x.l.weight, weight_unit: LB, reps: x.l.reps }));
    if (setRows.length > 0) {
      const { error: se } = await supabase.from('workout_sets').insert(setRows);
      if (se) throw se;
    }

    // Derive load PRs — a new max (or first record) for the exercise.
    const prs: LogWorkoutResult['prs'] = [];
    for (const l of input.lifts) {
      if (l.weight == null) continue;
      const { data: best, error: pe } = await supabase
        .from('personal_records')
        .select('load_value')
        .eq('athlete_id', uid)
        .eq('exercise', l.name)
        .eq('measure_kind', 'load')
        .order('load_value', { ascending: false })
        .limit(1);
      if (pe) throw pe;
      const currentMax = best?.[0]?.load_value ?? null;
      if (currentMax != null && l.weight <= currentMax) continue; // not a PR

      const { data: prRow, error: prErr } = await supabase
        .from('personal_records')
        .insert({
          athlete_id: uid,
          exercise: l.name,
          achieved_on: today,
          measure_kind: 'load',
          load_value: l.weight,
          load_unit: LB,
          load_reps: l.reps,
        })
        .select('id')
        .single();
      if (prErr || !prRow) throw prErr ?? new Error('PR insert failed');
      prIds.push(prRow.id);

      const { data: tlRow, error: tlErr } = await supabase
        .from('timeline_events')
        .insert({
          athlete_id: uid,
          event_type: 'ACCOMPLISHMENT',
          object_name: `${l.name} — ${l.weight} ${LB} PR`,
          chapter_id: chapterId,
          occurred_at: nowIso,
          source_entity_type: 'personal_record',
          source_entity_id: prRow.id,
        })
        .select('id')
        .single();
      if (tlErr || !tlRow) throw tlErr ?? new Error('timeline insert failed');
      timelineIds.push(tlRow.id);
      prs.push({ exercise: l.name, weight: l.weight, unit: LB });
    }

    // Count the workout in the active chapter.
    if (chapter) {
      const { error: ce } = await supabase
        .from('chapters')
        .update({ workout_count: (chapter.workout_count ?? 0) + 1 })
        .eq('id', chapter.id);
      if (ce) throw ce;
    }

    return { workoutId, prs, timelineAdded: timelineIds.length };
  } catch (err) {
    // Cleanup so a mid-write failure never leaves a partial log.
    if (timelineIds.length) await supabase.from('timeline_events').delete().in('id', timelineIds);
    if (prIds.length) await supabase.from('personal_records').delete().in('id', prIds);
    await supabase.from('workouts').delete().eq('id', workoutId); // cascades exercises + sets
    throw err;
  }
}
