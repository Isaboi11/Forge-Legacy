import { supabase } from '@/lib/supabase';
import { fetchActiveProgram, fetchProgramCompletedCount } from './programs-live';
import { nextSession } from '@/domain/program/progress-core';
import { exerciseNameFor } from '@/domain/training/exercise-names';
import {
  copyName,
  durationText,
  estimatedMinutes,
  groupBySection,
  historyDate,
  schemeText,
  statDate,
  type TemplateSection,
} from '@/domain/workout/template-format';

// The pure display rules live in the domain module so `node --test` can load them — this file imports
// the Supabase client, which it cannot. Re-exported so a screen has one import, not two.
export { copyName, durationText, estimatedMinutes, historyDate, schemeText, statDate };
export type { TemplateSection };

/**
 * Workout templates (migration 0091) — a session you already did and want again.
 *
 * Built from the CAPTURE end. Templates are not authored from nothing: they come from a free workout you
 * shaped as you went, or a program day you changed enough that the program no longer describes it. Those
 * are the sessions with no home — a program day is already reusable BY the program.
 */

export interface TemplateExercise {
  catalogKey: string | null;
  name: string;
  sets: number;
  targetReps: number;
  /**
   * Which block it belongs to. Absent on a template saved before 0095 — those read as 'main', which is
   * what they were, since 0091 dropped the section when deriving the template in the first place.
   */
  section?: TemplateSection;
  /**
   * The block this lift belongs to (0106). A template made from a session built around a superset
   * comes back as that superset, not as loose lifts in a suggestive order. Absent on every template
   * saved before 0106 — those were flat, and read as flat.
   */
  groupId?: string | null;
  groupName?: string | null;
  groupKind?: 'superset' | 'circuit' | null;
  groupRounds?: number | null;
  /** 'cardio' is a run/walk/ride block. Absent means strength, as every older template was. */
  kind?: 'strength' | 'cardio';
  /** How it was trained — carried so repeating a treadmill session doesn't put you on the road (0097). */
  modality?: 'outdoor' | 'indoor';
  targetMi?: number | null;
  targetDurationSec?: number | null;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  /** DERIVED from `workouts.template_id` (0095), never a stored counter — see the migration header. */
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  /** The Forge starter this was adopted from (0115), or null for a captured/authored one. Provenance
   *  only: the row belongs to the athlete and behaves like any other template. Reads null on a
   *  database without 0115, which is the right answer for every row that predates it. */
  sourceDefinitionId: string | null;
}

/** One finished session trained from this template. */
export interface TemplateSession {
  /** The session's own workout — so a history row opens ITS session, not a generic activity screen. */
  workoutId: string;
  at: string;
  durationSec: number | null;
  note: string | null;
}

export interface TemplateDetail extends WorkoutTemplate {
  history: TemplateSession[];
}

const MISSING = 'Templates aren’t available yet — migration 0091 hasn’t been applied.';
const DETAIL_MISSING = 'Template details aren’t available yet — migration 0095 hasn’t been applied.';

const toExercise = (e: Record<string, unknown>): TemplateExercise => ({
  catalogKey: (e.catalogKey as string) ?? null,
  name: String(e.name ?? 'Exercise'),
  sets: Number(e.sets ?? 0),
  targetReps: Number(e.targetReps ?? 0),
  section: (['warmup', 'main', 'cooldown'] as TemplateSection[]).includes(e.section as TemplateSection) ? (e.section as TemplateSection) : 'main',
  groupId: (e.groupId as string) ?? null,
  groupName: (e.groupName as string) ?? null,
  // A grouped row that never said which kind it was is a circuit — the same reading the session and
  // the database both take, so the three cannot drift.
  groupKind: e.groupId == null ? null : e.groupKind === 'superset' ? 'superset' : 'circuit',
  groupRounds: e.groupRounds == null ? null : Number(e.groupRounds),
  kind: e.kind === 'cardio' ? 'cardio' : 'strength',
  modality: e.modality === 'indoor' ? 'indoor' : e.modality === 'outdoor' ? 'outdoor' : undefined,
  targetMi: e.targetMi == null ? null : Number(e.targetMi),
  targetDurationSec: e.targetDurationSec == null ? null : Number(e.targetDurationSec),
});

const toTemplate = (r: Record<string, unknown>): WorkoutTemplate => ({
  id: String(r.id),
  name: String(r.name),
  exercises: ((r.exercises ?? []) as Record<string, unknown>[]).map(toExercise),
  useCount: Number(r.use_count ?? 0),
  lastUsedAt: (r.last_used_at as string) ?? null,
  createdAt: String(r.created_at),
  sourceDefinitionId: (r.source_definition_id as string) ?? null,
});

/**
 * The session the athlete already has planned today — the most likely thing to ask someone to do with
 * you, and the one thing an invite could not offer before 0093.
 *
 * Returned in TEMPLATE shape, because an invite snapshots it rather than pointing at it: the person you
 * ask may not own the program, and "next session" resolves from each athlete's own completed count, so a
 * pointer would open a different workout for each of you.
 *
 * Null when there is no active program, which is an ordinary state, not a failure.
 */
export async function fetchPlannedSession(): Promise<{ name: string; exercises: TemplateExercise[] } | null> {
  try {
    const program = await fetchActiveProgram();
    if (!program) return null;
    const done = await fetchProgramCompletedCount(program.id, program.structure);
    const next = nextSession(program.structure, done);
    const day = next?.day ?? program.structure.days.find((d) => d.main.length > 0) ?? program.structure.days[0] ?? null;
    if (!day || day.main.length === 0) return null;
    return {
      name: day.name.trim() || `Day ${day.letter}`,
      exercises: day.main.map((ex) => ({
        catalogKey: ex.catalogKey ?? null,
        name: exerciseNameFor(ex.catalogKey),
        sets: ex.sets ?? 3,
        targetReps: ex.reps ?? 8,
      })),
    };
  } catch {
    // A lookup failure must not block sending an invite — it just means one fewer option.
    return null;
  }
}

/**
 * The library, ordered by when each template was last actually trained.
 *
 * Through the RPC rather than the table, because `use_count` and `last_used_at` are DERIVED from
 * `workouts.template_id` (0095). The direct select ordered by the STORED `last_used_at`, which nothing
 * has ever written — so "most recently used" silently meant "most recently created", and the list would
 * have disagreed with the count on each template's own detail screen.
 */
export async function fetchTemplates(): Promise<WorkoutTemplate[]> {
  const { data, error } = await supabase.rpc('workout_templates_list');
  // An unapplied migration reads as "no templates", which is the safe direction.
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map(toTemplate);
}

/** One template with everything W-27 renders. Null when it isn't yours or no longer exists. */
export async function fetchTemplateDetail(id: string): Promise<TemplateDetail | null> {
  const { data, error } = await supabase.rpc('template_detail', { p_template: id });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') throw new Error(DETAIL_MISSING);
    throw error;
  }
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    ...toTemplate(d),
    history: ((d.history ?? []) as Record<string, unknown>[]).map((h) => ({
      workoutId: String(h.workout_id),
      at: String(h.at),
      durationSec: h.duration_sec == null ? null : Number(h.duration_sec),
      note: (h.note as string) ?? null,
    })),
  };
}

/** Copy a template — lands you on the copy, so the thing you just made is the thing you're looking at. */
export async function duplicateTemplate(id: string): Promise<string | null> {
  const src = await fetchTemplateDetail(id);
  if (!src) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('workout_templates')
    // The copy starts its own history at zero — it has never been trained, and `use_count` is derived
    // from workouts anyway, so there is nothing to reset and nothing that could be inherited by mistake.
    .insert({ athlete_id: user.id, name: copyName(src.name), exercises: src.exercises })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/**
 * Keep this session's shape. The database derives it from the workout — the client has already navigated
 * away from the session by the time this is offered, so describing it from memory would be describing
 * something it no longer holds.
 *
 * Returns null when the workout logged nothing worth repeating.
 */
export async function saveWorkoutAsTemplate(workoutId: string, name?: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('save_workout_as_template', { p_workout: workoutId, p_name: name ?? null });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') throw new Error(MISSING);
    throw error;
  }
  return (data as string | null) ?? null;
}

/**
 * Author a template from nothing, or rewrite one — the Free Workout Builder's save (W-25).
 *
 * The SECOND way a template comes into existence. 0091 built templates from the capture end, which is
 * still the better loop — a session you already did is a shape you know you can do — but it left no
 * answer for "I want to plan Thursday before Thursday", which is the whole of `Forge Strength Start`'s
 * "Build it first". A plain insert through the existing RLS policy; no RPC, because unlike
 * `save_workout_as_template` there is nothing to derive: the client is describing the shape directly.
 *
 * Returns the template's id so the caller can land on it, or start it.
 */
export async function saveTemplate(name: string, exercises: TemplateExercise[], id?: string | null): Promise<string> {
  const clean = name.trim().slice(0, 60) || 'Saved Workout';
  if (id) {
    const { error } = await supabase.from('workout_templates').update({ name: clean, exercises }).eq('id', id);
    if (error) throw error;
    return id;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('workout_templates')
    .insert({ athlete_id: user.id, name: clean, exercises })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/**
 * Take a Forge starter as your own (0115).
 *
 * Structurally `adoptCatalogProgram`: look for a copy you already took, return that if it exists, and
 * otherwise write one. IDEMPOTENT — the athlete's copy is the thing, not the definition, so adopting
 * twice must resume rather than fork. The partial unique index on `(athlete_id, source_definition_id)`
 * backstops a double-tap that races past this check.
 *
 * Returns the template id, so the caller can land on it.
 */
export async function adoptStarterTemplate(def: { id: string; name: string; exercises: TemplateExercise[] }): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: existing, error: lookupError } = await supabase
    .from('workout_templates')
    .select('id')
    .eq('athlete_id', user.id)
    .eq('source_definition_id', def.id)
    .maybeSingle();
  /* 42703 = the column doesn't exist, i.e. 0115 hasn't been applied. Named explicitly because a
     stopped migration chain fails on a missing COLUMN, and the PGRST205/PGRST202 guards used
     elsewhere in this repo do NOT catch that. Silence here would adopt a fresh copy on every tap. */
  if (lookupError) {
    if ((lookupError as { code?: string }).code === '42703') {
      throw new Error('Forge templates aren’t available yet — migration 0115 hasn’t been applied.');
    }
    throw lookupError;
  }
  if (existing) return String((existing as { id: string }).id);

  const { data, error } = await supabase
    .from('workout_templates')
    .insert({ athlete_id: user.id, name: def.name, exercises: def.exercises, source_definition_id: def.id })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function renameTemplate(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('workout_templates').update({ name: name.trim() }).eq('id', id);
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('workout_templates').delete().eq('id', id);
  if (error) throw error;
}

/** "5 lifts · 18 sets" — what the template is, at a glance. */
export function templateSummary(t: WorkoutTemplate): string {
  const lifts = t.exercises.length;
  const sets = t.exercises.reduce((n, e) => n + e.sets, 0);
  return `${lifts} ${lifts === 1 ? 'lift' : 'lifts'} · ${sets} ${sets === 1 ? 'set' : 'sets'}`;
}

/** "6 exercises · ~48 min" — the hero's one line. */
export function heroSummary(t: WorkoutTemplate): string {
  const n = t.exercises.length;
  return `${n} ${n === 1 ? 'exercise' : 'exercises'} · ~${estimatedMinutes(t.exercises)} min`;
}

/** The three blocks, empties dropped. */
export function templateSections(t: WorkoutTemplate) {
  return groupBySection(t.exercises);
}
