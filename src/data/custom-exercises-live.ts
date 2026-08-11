import { supabase } from '@/lib/supabase';
import {
  CUSTOM_LIMIT,
  type CustomDraft,
  type CustomExercise,
} from '@/domain/exercise-picker/custom-core';
import type { ExerciseCategoryKey, ExerciseUnit } from '@/domain/exercise-picker/catalog-core';

/**
 * Custom exercises — the ONE read/write path (migration 0128).
 *
 * Everything about WHAT a custom exercise is lives in `domain/exercise-picker/custom-core` (pure,
 * tested). This file is the boundary: it talks to Postgres, maps snake_case to the domain shape, and
 * turns the two failures that matter into sentences a person can act on.
 *
 * ══ WHY A MISSING TABLE DEGRADES INSTEAD OF THROWING ══
 *
 * There is no Supabase CLI and no service key in this project — migrations are pasted into the
 * dashboard by hand, so "the code shipped and the migration has not been run yet" is a real state that
 * lasts hours. PostgREST answers an unknown table with `PGRST205`. Reads map that to an EMPTY LIST:
 * an athlete who has never created a custom exercise and an athlete whose database has not been
 * migrated see the same thing, which is nothing — and the Exercise Library, the Picker and the workout
 * logger all keep working on the shipped catalogue. WRITES say so plainly instead, because silently
 * accepting an exercise that was never stored is the worse failure by far.
 */

const MISSING_TABLE = 'PGRST205';
const isMissingTable = (e: unknown): boolean => (e as { code?: string } | null)?.code === MISSING_TABLE;
/** The cap trigger raises `check_violation` with the message W-28 §8.3 specifies. */
const isCapViolation = (e: unknown): boolean => {
  const err = e as { code?: string; message?: string } | null;
  return err?.code === '23514' || /Exercise limit reached/i.test(err?.message ?? '');
};

interface Row {
  id: string;
  name: string;
  category: string | null;
  equipment: string[] | null;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  environments: string[] | null;
  notes: string | null;
  unit: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const CATEGORIES = new Set<string>(['PUSH', 'PULL', 'LEGS_AND_GLUTES', 'CORE', 'FULL_BODY', 'MOBILITY']);

const toCustom = (r: Row): CustomExercise => ({
  id: r.id,
  name: r.name,
  /* An unrecognised category reads as "uncategorised" rather than being rendered raw. The column is
     deliberately unconstrained (see 0128) so the client vocabulary stays the single definition of it,
     and this is the price of that: the client validates on the way out. */
  category: r.category && CATEGORIES.has(r.category) ? (r.category as ExerciseCategoryKey) : null,
  equipment: r.equipment ?? [],
  primaryMuscles: r.primary_muscles ?? [],
  secondaryMuscles: r.secondary_muscles ?? [],
  environments: r.environments ?? [],
  notes: r.notes,
  unit: r.unit === 'time' ? 'time' : 'reps',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
});

const SELECT =
  'id, name, category, equipment, primary_muscles, secondary_muscles, environments, notes, unit, created_at, updated_at, deleted_at';

/** The athlete's active exercises, newest first. Empty when the table isn't there yet — see the header. */
export async function fetchCustomExercises(): Promise<CustomExercise[]> {
  const { data, error } = await supabase
    .from('custom_exercises')
    .select(SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return ((data ?? []) as Row[]).map(toCustom);
}

/** One exercise by id, including a soft-deleted one — W-28 EDIT mode and the restore path both need it. */
export async function fetchCustomExercise(id: string): Promise<CustomExercise | null> {
  const { data, error } = await supabase.from('custom_exercises').select(SELECT).eq('id', id).maybeSingle();
  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  return data ? toCustom(data as Row) : null;
}

const payload = (d: CustomDraft) => ({
  // Trimmed at the boundary. The column's CHECK is a backstop; this is what makes " Belt Squat " and
  // "Belt Squat" the same exercise rather than two.
  name: d.name.trim(),
  category: d.category,
  equipment: d.equipment,
  primary_muscles: d.primaryMuscles,
  secondary_muscles: d.secondaryMuscles,
  environments: d.environments,
  // An empty string is not a note, and storing one puts an empty block on the detail screen.
  notes: d.notes.trim() || null,
  unit: d.unit satisfies ExerciseUnit,
});

export async function createCustomExercise(d: CustomDraft): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error('Sign in to add your own exercises.');

  const { data, error } = await supabase
    .from('custom_exercises')
    .insert({ ...payload(d), author_id: uid })
    .select('id')
    .single();
  if (error) {
    if (isMissingTable(error)) throw new Error("Custom exercises aren't available yet — migration 0128 hasn't been applied.");
    if (isCapViolation(error)) throw new Error(`Exercise limit reached (${CUSTOM_LIMIT}). Delete unused exercises to create new ones.`);
    throw error;
  }
  return (data as { id: string }).id;
}

export async function updateCustomExercise(id: string, d: CustomDraft): Promise<void> {
  const { error } = await supabase.from('custom_exercises').update(payload(d)).eq('id', id);
  if (error) {
    if (isMissingTable(error)) throw new Error("Custom exercises aren't available yet — migration 0128 hasn't been applied.");
    throw error;
  }
}

/**
 * SOFT delete (EX-001-D7) — the row stays, `deleted_at` is stamped.
 *
 * A template or a program can reference this exercise. Hard-deleting would leave an id resolving to
 * nothing, which renders as a blank row; a tombstone renders as a tombstone and says what happened. It
 * also makes "I deleted that by mistake" recoverable, which for content the athlete hand-wrote it has
 * to be — and `restoreCustomExercise` recovers every reference at once, because they all point at the
 * same id.
 */
export async function deleteCustomExercise(id: string): Promise<void> {
  const { error } = await supabase.from('custom_exercises').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function restoreCustomExercise(id: string): Promise<void> {
  const { error } = await supabase.from('custom_exercises').update({ deleted_at: null }).eq('id', id);
  if (error) throw error;
}
