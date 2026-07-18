import { supabase } from '@/lib/supabase';

/**
 * The Forge Program Builder `.dc` model, persisted to the `programs` table (0013). B1 writes a SUBSET —
 * name + daysPerWeek + each day's `main` — with warmup/cooldown empty and weeks/vary/weekPlans defaulted;
 * the full builder (C) fills the rest with no schema change.
 */
export type ProgramExercise = { catalogKey: string; name: string };
export type ProgramDay = {
  letter: string;
  name: string;
  warmup: ProgramExercise[];
  main: ProgramExercise[];
  cooldown: ProgramExercise[];
};
export type ProgramStructure = {
  name: string;
  weeks: number;
  daysPerWeek: number;
  vary: boolean;
  days: ProgramDay[];
  weekPlans: null;
};

export type SavedProgram = { id: string; name: string; structure: ProgramStructure; createdAt: string };

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

/** The athlete's authored programs, newest first (for the builder's list + later Home wiring). */
export async function fetchMyPrograms(): Promise<SavedProgram[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('programs')
    .select('id, name, structure, created_at')
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    structure: r.structure as ProgramStructure,
    createdAt: r.created_at as string,
  }));
}
