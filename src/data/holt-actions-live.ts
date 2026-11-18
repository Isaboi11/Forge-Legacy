/**
 * The executors behind Holt's action cards, and the loaders the cards read. AI Road to 10 Sprint 4a §1.2 — lane C.
 *
 * The rules live in `domain/coach/holt-action-exec.ts` (executors) and `domain/coach/holt-action-cards.ts` (cards),
 * where `node --test` reaches them; this file only hands them the real calls. Lane B's meal executors
 * (`src/data/holt-meal-live.ts`) and lane A's program ones are registered in `executorFor` at merge.
 *
 * ══ FOR THE SHEET (lane A) ══
 *
 *   const hold = holdTurnActions();                 // holt-action-cards.ts, one per turn
 *   hold.hold(action)                                // each {action} off the wire
 *   const shown = await hold.release(end, await liveCardContext({ units, nutritionAccess }))  // [] unless cardsMayShow
 *   hold.drop()                                      // Stop, a timeout, the sheet closing
 *   const res = await confirmHoltAction(shown[i], key)   // the ONLY way a card writes
 *   if (res.ok && res.go) { handOff(); router.push(res.go) }
 *   await undoHoltAction(shown[i].action.name, res.undo)
 *   dismissHoltAction(shown[i].action.name)
 *
 * `schedule_session` has no executor in 4a: there is no table for a dated session (Calendar CAL-D8 is not built),
 * and a migration is not this lane's. Its card says so and offers no Confirm.
 */
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { consentForRoute } from '@/lib/consent';
import { clearWorkoutLaunch, readWorkoutLaunch, writeWorkoutLaunch, type WorkoutLaunch } from '@/lib/workout-launch';
import { clearSession, hasLoggedWork, loadSession, persistSession } from '@/domain/workout/autosave';
import { fetchActiveProgram, fetchProgram, fetchProgramSessions, updateProgram } from '@/data/programs-live';
import { fetchTemplateDetail, fetchTemplates } from '@/data/templates-live';
import { fetchPlannedWorkout } from '@/data/planned-workout-live';
import { fetchBodyEntries, latestBodyReading } from '@/data/body-metrics-live';
import { fetchNutritionProfile, fetchRangeTotals, fetchTargetHistory, saveTargets } from '@/data/nutrition-live';
import { addNotes, deleteNote } from '@/data/holt-notes-live';
import { PICKER_DB } from '@/domain/exercise-picker/data';
import { slotStates } from '@/domain/program/progress-core';
import { isCardioKey } from '@/domain/workout/conditioning';
import { activityByKey, type AthleteSex } from '@/domain/nutrition/targets';
import { careLineActive, careWindow } from '@/domain/nutrition/care-line';
import { localToday } from '@/domain/nutrition/day';
import type { CatalogExercise } from '@/domain/coach/candidates';
import type { ActiveSession } from '@/domain/workout/types';
import type { ApplyResult, HoltActionExecutor, HoltActionName, HoltActionOutcome, UndoToken } from '@/domain/coach/holt-actions';
import { applyShown, holtActionEvent, type CardContext, type ShownCard, type StartChoices, type TargetFactsRead, type TodaySession } from '@/domain/coach/holt-action-cards';
import { doorExecutor, noteExecutor, startExecutor, swapExecutor, targetsExecutor, type ExecDeps, type TargetRow } from '@/domain/coach/holt-action-exec';

/* ── the real calls ───────────────────────────────────────────────────────────────────────────────────────── */

async function athleteId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const missingColumn = (e: unknown): boolean => {
  const o = e as { code?: string; message?: string } | null;
  return o?.code === '42703' || o?.code === 'PGRST204' || /column .* does not exist/i.test(o?.message ?? '');
};

/** `nutrition_targets` rows up to `day`, exactly as stored. `weight_lb` arrives with 0209; without it, null. */
async function readTargetRows(day: string): Promise<TargetRow[]> {
  const id = await athleteId();
  if (!id) throw new Error('Not signed in');
  const cols = 'effective_from, method, kcal, protein_g, carb_g, fat_g';
  const read = (withWeight: boolean) =>
    supabase
      .from('nutrition_targets')
      .select(withWeight ? `${cols}, weight_lb` : cols)
      .eq('athlete_id', id)
      .lte('effective_from', day)
      .order('effective_from', { ascending: true });
  let { data, error } = await read(true);
  if (error && missingColumn(error)) ({ data, error } = await read(false));
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    effectiveFrom: String(r.effective_from),
    method: r.method === 'manual' ? 'manual' : 'recommended',
    kcal: Number(r.kcal),
    protein: Number(r.protein_g),
    carb: Number(r.carb_g),
    fat: Number(r.fat_g),
    weightLb: r.weight_lb != null ? Number(r.weight_lb) : null,
  }));
}

/** One row back exactly as it was — the same upsert key `saveTargets` writes on. */
async function restoreTargetRow(row: TargetRow): Promise<void> {
  const id = await athleteId();
  if (!id) throw new Error('Not signed in');
  /* One type with an OPTIONAL `weight_lb`, as `saveTargets` does — a union of payloads trips the excess-property check. */
  type Row = { athlete_id: string; effective_from: string; method: 'manual' | 'recommended'; kcal: number; protein_g: number; carb_g: number; fat_g: number; weight_lb?: number | null };
  const base: Row = {
    athlete_id: id,
    effective_from: row.effectiveFrom,
    method: row.method,
    kcal: Math.round(row.kcal),
    protein_g: Math.round(row.protein),
    carb_g: Math.round(row.carb),
    fat_g: Math.round(row.fat),
  };
  const write = (withWeight: boolean) =>
    supabase.from('nutrition_targets').upsert(withWeight ? { ...base, weight_lb: row.weightLb } : base, { onConflict: 'athlete_id,effective_from' });
  let { error } = await write(true);
  if (error && missingColumn(error)) ({ error } = await write(false));
  if (error) throw error;
}

const DEPS: ExecDeps = {
  now: () => new Date(),
  loadSession,
  persistSession,
  clearSession,
  hasLoggedWork,
  writeLaunch: (ctx) => writeWorkoutLaunch(ctx as WorkoutLaunch),
  readLaunch: async () => (await readWorkoutLaunch()) as Record<string, unknown> | null,
  clearLaunch: clearWorkoutLaunch,
  fetchProgram: async (id) => {
    const p = await fetchProgram(id);
    return p ? { id: p.id, structure: p.structure } : null;
  },
  fetchMarks: fetchProgramSessions,
  updateProgram,
  /* The chat's own edit path looks the replacement up the same way (`applyEdit`): the real record, never a copy. */
  catalogByKey: (key) => (PICKER_DB.find((e) => e.key === key) as CatalogExercise | undefined) ?? null,
  fetchTemplate: async (id) => {
    const t = await fetchTemplateDetail(id);
    return t ? { id: t.id, name: t.name, exercises: t.exercises } : null;
  },
  fetchPlanned: async () => {
    const p = await fetchPlannedWorkout();
    return p ? { name: p.name, exercises: p.exercises, brief: p.brief } : null;
  },
  readTargetRows,
  saveTargets: (t, weightLb) => saveTargets(t, 'recommended', weightLb),
  restoreTargetRow,
  addNotes: (texts, source) => addNotes(texts, source),
  deleteNote,
  consentForRoute,
};

const EXECUTORS: Partial<Record<HoltActionName, HoltActionExecutor>> = {
  swap_exercise_today: swapExecutor(DEPS),
  start_workout: startExecutor(DEPS),
  set_targets: targetsExecutor(DEPS),
  remember_note: noteExecutor(DEPS),
  open_door: doorExecutor(DEPS),
};

/**
 * The executor for an action, or null when this app does not perform it (`schedule_session` in 4a; the meal and
 * program ones until the integrator registers them here).
 */
export function executorFor(name: HoltActionName): HoltActionExecutor | null {
  return EXECUTORS[name] ?? null;
}

/* ── what the cards read ──────────────────────────────────────────────────────────────────────────────────── */

const workoutOpen = async (): Promise<ActiveSession | null> => {
  const s = await loadSession();
  /* A started workout with nothing logged is not resumable — the logger builds over it (`autosave.ts`). */
  return s && hasLoggedWork(s) ? s : null;
};

async function loadToday(): Promise<TodaySession | null> {
  const open = await workoutOpen();
  if (open) {
    return {
      source: 'open',
      name: open.workoutName,
      startedAt: open.startedAt,
      exercises: open.exercises.map((e) => ({
        name: e.name,
        catalogKey: e.catalogKey ?? null,
        section: e.section,
        kind: e.kind === 'cardio' ? 'cardio' : 'strength',
        logged: e.sets.some((s) => s.done) || e.boutOpen === true,
      })),
    };
  }
  const program = await fetchActiveProgram();
  if (!program) return null;
  const marks = await fetchProgramSessions(program.id);
  const next = slotStates(program.structure, marks).find((s) => s.state === null && s.day != null);
  if (!next?.day) return null;
  return {
    source: 'program',
    name: next.day.name.trim() || `Day ${next.day.letter}`,
    programId: program.id,
    programName: program.name,
    weekIndex: next.weekIndex,
    dayIndex: next.dayIndex,
    exercises: next.day.main.map((e, i) => ({
      name: e.name,
      catalogKey: e.catalogKey ?? null,
      section: 'main',
      kind: e.kind === 'cardio' || isCardioKey(e.catalogKey) ? 'cardio' : 'strength',
      logged: false,
      mainIndex: i,
    })),
  };
}

async function loadStartChoices(): Promise<StartChoices> {
  const [program, planned, templates, open] = await Promise.all([
    fetchActiveProgram().catch(() => null),
    fetchPlannedWorkout().catch(() => null),
    fetchTemplates().catch(() => []),
    workoutOpen(),
  ]);
  const marks = program ? await fetchProgramSessions(program.id).catch(() => []) : [];
  return {
    program: program
      ? {
          id: program.id,
          name: program.name,
          open: slotStates(program.structure, marks)
            .filter((s) => s.state === null && s.day != null)
            .map((s) => ({
              weekIndex: s.weekIndex,
              dayIndex: s.dayIndex,
              name: s.day!.name.trim() || `Day ${s.day!.letter}`,
              exerciseCount: s.day!.warmup.length + s.day!.main.length + s.day!.cooldown.length,
            })),
        }
      : null,
    planned: planned ? { name: planned.name, exerciseCount: planned.exercises.length } : null,
    templates: templates.map((t) => ({ id: t.id, name: t.name, exerciseCount: t.exercises.length })),
    open: open ? { name: open.workoutName, logged: true } : null,
  };
}

/** The Targets screen's facts, read the way it reads them (strict profile; latest weigh-in; target in force). */
async function loadTargetFacts(today: string): Promise<TargetFactsRead | null> {
  try {
    const id = await athleteId();
    if (!id) return null;
    const window = careWindow(today);
    const [sexRow, profile, body, history, days] = await Promise.all([
      supabase.from('profiles').select('sex').eq('id', id).maybeSingle(),
      fetchNutritionProfile({ strict: true }),
      fetchBodyEntries(),
      fetchTargetHistory(today),
      fetchRangeTotals(window.from, window.to),
    ]);
    if (sexRow.error) return null;
    const sex = (['male', 'female'].includes(String(sexRow.data?.sex)) ? sexRow.data?.sex : 'unspecified') as AthleteSex;
    return {
      facts: {
        sex,
        weightLb: latestBodyReading(body, 'weight'),
        birthYear: profile.birthYear,
        heightIn: profile.heightIn,
        activity: activityByKey(profile.activityLevel),
      },
      current: history.length ? history[history.length - 1].targets : null,
      /* The care line's rule with no snooze: a dismissed line still means a chat card sets no deficit. */
      lowWeek: careLineActive({ days, sex, todayIso: today, dismissedUntil: null }),
    };
  } catch {
    return null;
  }
}

/** Everything a card may read, for this athlete, today. */
export async function liveCardContext(opts: { units: 'imperial' | 'metric'; nutritionAccess: boolean }): Promise<CardContext> {
  const today = localToday();
  return {
    units: opts.units,
    today,
    nutritionAccess: opts.nutritionAccess,
    catalog: PICKER_DB,
    loadToday,
    loadStartChoices,
    loadTargetFacts: () => loadTargetFacts(today),
    canSchedule: false,
  };
}

/* ── the sheet's three calls ──────────────────────────────────────────────────────────────────────────────── */

/** §1.9 — `holt_action` {kind: the action's name, result: the outcome}. Names only; nothing typed, no number. */
export function trackHoltAction(name: HoltActionName, outcome: HoltActionOutcome): void {
  const props = holtActionEvent(name, outcome);
  if (props) track('holt_action', props);
}

/**
 * Confirm one SHOWN card (§1.3: only `release` makes a `ShownCard`, so a dropped action can never get here). The
 * executor is handed the card's plan — what the athlete saw — not the model's input. Never throws.
 */
export async function confirmHoltAction(shown: ShownCard, key?: string, exec: (n: HoltActionName) => HoltActionExecutor | null = executorFor): Promise<ApplyResult> {
  const res = await applyShown(shown, key, exec);
  trackHoltAction(shown.action.name, res.ok ? 'confirmed' : 'failed');
  return res;
}

/** Undo one write. True = put back; false = left as it is (it changed since, or the undo could not land). */
export async function undoHoltAction(name: HoltActionName, token: UndoToken, exec: (n: HoltActionName) => HoltActionExecutor | null = executorFor): Promise<boolean> {
  let ok = false;
  try {
    ok = (await exec(name)?.undo(token)) ?? false;
  } catch {
    ok = false;
  }
  if (ok) trackHoltAction(name, 'undone');
  return ok;
}

export function dismissHoltAction(name: HoltActionName): void {
  trackHoltAction(name, 'dismissed');
}
