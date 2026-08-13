import { supabase } from '@/lib/supabase';
import { createProgram, startProgram, type ProgramStructure } from './programs-live';
import { scheduleSlots, sessionsPerWeek } from '@/domain/program/progress-core';

/**
 * Week templates — a week you build once and can run again (migration 0157).
 *
 * ══ THE SHAPE IS A `ProgramStructure`, AND THAT IS THE WHOLE DESIGN ══
 *
 * `structure` is a normal program structure pinned to `weeks: 1, vary: false` by a database CHECK. So
 * everything that already understands a program understands a week template: `scheduleSlots` walks it,
 * the Day Builder edits it, the Picker appends to it, and `templateRowsToDay` drops a saved single-session
 * template into one of its days. Starting one is `createProgram` + `startProgram` and nothing else.
 *
 * ⚠ A WEEK TEMPLATE IS NOT A RECORD OF ANYTHING. It is a shape. The records are the PROGRAMS it produces,
 * which seal as `finished` and are permanent. That asymmetry is why this file has delete and the program
 * side does not, and why there is no history here to read.
 */

export interface WeekTemplate {
  id: string;
  name: string;
  structure: ProgramStructure;
  createdAt: string;
  updatedAt: string;
}

interface WeekTemplateRow {
  id: string;
  name: string;
  structure: ProgramStructure;
  created_at: string;
  updated_at: string;
}

const toWeek = (r: WeekTemplateRow): WeekTemplate => ({
  id: r.id,
  name: r.name,
  structure: r.structure,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/**
 * Force the pin client-side too, before the database has to refuse it.
 *
 * The CHECK is the guarantee; this is so an athlete never fills in a whole week and only then gets an
 * error they cannot act on. Same principle the entitlement layer states: the database decides, the client
 * exists so nobody builds something they cannot save.
 */
export function asWeekStructure(structure: ProgramStructure): ProgramStructure {
  return { ...structure, weeks: 1, vary: false, weekPlans: null };
}

/** "3 sessions · Push, Pull, Legs" — the subtitle a week row carries. */
export function weekSummary(t: WeekTemplate): string {
  const days = scheduleSlots(t.structure)
    .map((s) => s.day?.name?.trim())
    .filter((n): n is string => !!n);
  const n = sessionsPerWeek(t.structure);
  const count = `${n} session${n === 1 ? '' : 's'}`;
  return days.length ? `${count} · ${days.join(', ')}` : count;
}

export async function fetchWeekTemplates(): Promise<WeekTemplate[]> {
  const { data, error } = await supabase
    .from('week_templates')
    .select('id, name, structure, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as WeekTemplateRow[]).map(toWeek);
}

export async function fetchWeekTemplate(id: string): Promise<WeekTemplate | null> {
  const { data, error } = await supabase
    .from('week_templates')
    .select('id, name, structure, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toWeek(data as WeekTemplateRow) : null;
}

/** Create, or update in place when `id` is given (the Builder's edit mode). */
export async function saveWeekTemplate(
  name: string,
  structure: ProgramStructure,
  id?: string | null,
): Promise<{ id: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const payload = { name: name.trim(), structure: asWeekStructure({ ...structure, name: name.trim() }) };

  if (id) {
    const { error } = await supabase
      .from('week_templates')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return { id };
  }

  const { data, error } = await supabase
    .from('week_templates')
    .insert({ athlete_id: user.id, ...payload })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id };
}

export async function deleteWeekTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('week_templates').delete().eq('id', id);
  if (error) throw error;
}

export async function duplicateWeekTemplate(id: string): Promise<{ id: string }> {
  const src = await fetchWeekTemplate(id);
  if (!src) throw new Error('That week is no longer there.');
  return saveWeekTemplate(`${src.name} (copy)`.slice(0, 40), src.structure);
}

/**
 * Run this week: create a one-week program from it and start it.
 *
 * ⚠ TWO ROUND TRIPS, AND THE GAP BETWEEN THEM IS REAL. If `startProgram` fails, the program row already
 * exists — and it has already spent an entitlement unit. Rather than leave an orphan the athlete cannot
 * see and did not ask for, the created row is removed and the original error is re-thrown. Deleting is
 * safe here and nowhere else in this codebase: the row is `future`, untrained, seconds old, and the
 * delete policy permits exactly that state.
 *
 * ⚠ AND STARTING IT ENDS ANY ACTIVE PROGRAM. One Active program at a time, no exceptions
 * (Program-Architecture-Amendment-001 §2) — `start_program` does this server-side, atomically. The
 * CALLER is responsible for having asked first; this function does not warn, because a data function
 * that opened a dialog would be unusable from anywhere else.
 */
export async function startWeekTemplate(id: string): Promise<{ programId: string; endedProgramId: string | null }> {
  const week = await fetchWeekTemplate(id);
  if (!week) throw new Error('That week is no longer there.');

  const { id: programId } = await createProgram(asWeekStructure(week.structure), id);
  try {
    const res = await startProgram(programId);
    return { programId, endedProgramId: res?.ended ?? null };
  } catch (e) {
    await supabase.from('programs').delete().eq('id', programId);
    throw e;
  }
}
