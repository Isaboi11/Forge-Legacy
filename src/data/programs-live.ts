import { supabase } from '@/lib/supabase';
import type { LoggedWorkout, ProgramState } from '@/domain/program/progress-core';

/**
 * The Forge Program Builder `.dc` model, persisted to the `programs` table (0013), plus the lifecycle
 * (0017) and the workout attribution (0018) that Program Detail reads.
 */
export type ProgramExercise = {
  id?: string;
  catalogKey?: string;
  name: string;
  equip?: string;
  muscles?: string[];
  type?: string;
  sets?: number;
  reps?: number;
  /**
   * 'cardio' prescribes a run, walk or ride at any position in the day. Absent means 'strength', so
   * every program authored before this reads unchanged. The structure is jsonb, so these cost no
   * migration.
   *
   * `modality` is the AUTHOR'S DEFAULT, not a rule: the athlete can switch it on the day, because
   * nobody knows the weather when they write a training block.
   *
   * Every target is nullable and `null` is MEANINGFUL — it prescribes nothing, an open session. It must
   * survive persistence uncoerced: a 0 would read as a target that is permanently, absurdly met.
   */
  kind?: 'strength' | 'cardio';
  activity?: 'run' | 'walk' | 'bike';
  modality?: 'outdoor' | 'indoor';
  targetMi?: number | null;
  targetPaceSec?: number | null;
  targetSpdMph?: number | null;
};
export type ProgramDay = {
  letter: string;
  name: string;
  warmup: ProgramExercise[];
  main: ProgramExercise[];
  cooldown: ProgramExercise[];
};
export type ProgramWeekPlan = { days: ProgramDay[] };
export type ProgramStructure = {
  name: string;
  weeks: number;
  daysPerWeek: number;
  vary: boolean;
  days: ProgramDay[];
  weekPlans: ProgramWeekPlan[] | null;
};

export type SavedProgram = {
  id: string;
  name: string;
  structure: ProgramStructure;
  state: ProgramState;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  /** Set when this row was adopted from a built-in catalog program (0019). */
  sourceDefinitionId: string | null;
};

/**
 * `*`, not an explicit column list, on purpose: the lifecycle columns arrive in migration 0017, and
 * naming them explicitly would make every program read (including Home's) fail against a database that
 * hasn't been migrated yet. With `*`, a pre-0017 row simply comes back without them and `asState`
 * defaults it to 'future'.
 */
const SELECT = '*';

type ProgramRow = {
  id: string;
  name: string;
  structure: ProgramStructure;
  state: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  source_definition_id?: string | null;
};

const asState = (v: string | null): ProgramState =>
  v === 'active' || v === 'graduated' || v === 'ended_early' ? v : 'future';

const toProgram = (r: ProgramRow): SavedProgram => ({
  id: r.id,
  name: r.name,
  structure: r.structure,
  state: asState(r.state),
  startedAt: r.started_at,
  endedAt: r.ended_at,
  createdAt: r.created_at,
  sourceDefinitionId: r.source_definition_id ?? null,
});

/** Persist a user-authored program (owner RLS). Returns the new id. */
export async function createProgram(structure: ProgramStructure): Promise<{ id: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');
  const { data, error } = await supabase
    .from('programs')
    .insert({ athlete_id: user.id, name: structure.name, structure })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id };
}

/**
 * Adopt a built-in catalog program: write it out as a real `programs` row so it can hold a lifecycle
 * and collect workouts. Idempotent — starting the same catalog program again resumes the existing row
 * (enforced by 0019's partial unique index) rather than forking a second copy with separate progress.
 */
export async function adoptCatalogProgram(
  sourceDefinitionId: string,
  structure: ProgramStructure,
): Promise<SavedProgram> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { data: existing, error: fe } = await supabase
    .from('programs')
    .select(SELECT)
    .eq('athlete_id', user.id)
    .eq('source_definition_id', sourceDefinitionId)
    .maybeSingle();
  if (fe) throw fe;
  if (existing) return toProgram(existing as ProgramRow);

  const { data, error } = await supabase
    .from('programs')
    .insert({
      athlete_id: user.id,
      name: structure.name,
      structure,
      source_definition_id: sourceDefinitionId,
    })
    .select(SELECT)
    .single();
  if (error) throw error;
  return toProgram(data as ProgramRow);
}

/** Overwrite an existing program in place (the builder's edit mode). */
export async function updateProgram(id: string, structure: ProgramStructure): Promise<void> {
  const { error } = await supabase
    .from('programs')
    .update({ name: structure.name, structure, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** The athlete's authored programs, newest first. */
export async function fetchMyPrograms(): Promise<SavedProgram[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('programs')
    .select(SELECT)
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toProgram(r as ProgramRow));
}

/** One program by id, or null when it doesn't exist / isn't the athlete's. */
export async function fetchProgram(id: string): Promise<SavedProgram | null> {
  const { data, error } = await supabase.from('programs').select(SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toProgram(data as ProgramRow) : null;
}

/** The athlete's currently-active program, if any. */
export async function fetchActiveProgram(): Promise<SavedProgram | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('programs')
    .select(SELECT)
    .eq('athlete_id', user.id)
    .eq('state', 'active')
    .maybeSingle();
  if (error) throw error;
  return data ? toProgram(data as ProgramRow) : null;
}

/**
 * Start `id`, ending whatever was active. Atomic in the DB (0017) so the "one active program" rule
 * can't be broken by a race between two devices.
 */
export async function startProgram(id: string): Promise<void> {
  const { error } = await supabase.rpc('start_program', { p_program_id: id });
  if (error) throw error;
}

export async function endProgram(id: string, outcome: Extract<ProgramState, 'graduated' | 'ended_early'>): Promise<void> {
  const { error } = await supabase
    .from('programs')
    .update({ state: outcome, ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Delete a planned program. The workouts logged against it survive (0018 uses `on delete set null`) —
 * removing a plan must never erase training the athlete actually did.
 */
export async function deleteProgram(id: string): Promise<void> {
  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (error) throw error;
}

/**
 * How many sessions of this program are logged — the single number every progress read reduces to.
 * A HEAD count, so Home can pick the right next workout without pulling the whole log.
 * Returns 0 (rather than throwing) pre-0018, so Home keeps working on an un-migrated database.
 */
export async function fetchProgramCompletedCount(programId: string): Promise<number> {
  const { count, error } = await supabase
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .eq('program_id', programId)
    .eq('state', 'saved');
  if (error) return 0;
  return count ?? 0;
}

type WorkoutRow = {
  id: string;
  workout_name: string | null;
  started_at: string;
  duration_sec: number | null;
  workout_exercises:
    | {
        name: string;
        section: string;
        position: number;
        workout_sets: { set_index: number; weight: number | null; reps: number | null }[] | null;
      }[]
    | null;
};

/**
 * Every saved workout attributed to this program, oldest first, with exercises and sets — the raw
 * material for the progress count, "Your Log" and the stat tiles.
 */
export async function fetchProgramWorkouts(programId: string): Promise<LoggedWorkout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, workout_name, started_at, duration_sec, workout_exercises(name, section, position, workout_sets(set_index, weight, reps))')
    .eq('program_id', programId)
    .eq('state', 'saved')
    .order('started_at', { ascending: true });
  if (error) throw error;

  return ((data ?? []) as WorkoutRow[]).map((w) => ({
    id: w.id,
    name: w.workout_name ?? 'Workout',
    startedAt: w.started_at,
    durationSec: w.duration_sec,
    exercises: [...(w.workout_exercises ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((ex) => ({
        name: ex.name,
        section: ex.section,
        sets: [...(ex.workout_sets ?? [])]
          .sort((a, b) => a.set_index - b.set_index)
          .map((s) => ({ setIndex: s.set_index, weight: s.weight, reps: s.reps })),
      })),
  }));
}
