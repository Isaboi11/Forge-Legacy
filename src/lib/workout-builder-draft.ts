import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProgramExercise } from '@/data/programs-live';

/**
 * The single-day Workout Builder's in-progress draft (W-25).
 *
 * It has to be durable for one specific reason: adding an exercise LEAVES THE SCREEN. The Exercise
 * Picker is a route, not a sheet, so anything held only in component state would be gone by the time
 * the athlete picked something — which is the same reason the Program Builder autosaves its draft.
 *
 * Rows are `ProgramExercise`-shaped rather than `TemplateExercise`-shaped on purpose: that is the type
 * the pure superset helpers (`pairWithNext` / `unpairAt` / `pairingAt`) already operate on, so the
 * builder and the program builder cannot drift on what a pairing means. It converts on save.
 */
export interface WorkoutDraft {
  name: string;
  warmup: ProgramExercise[];
  main: ProgramExercise[];
  cooldown: ProgramExercise[];
  /** Set when editing an existing template — save writes back rather than creating a second one. */
  editId: string | null;
  /**
   * When editing: the fingerprint of the template AS LOADED. Back compares against it, so opening a saved
   * template and leaving without touching it does not ask "Discard?" (QA 09-26 library-19). Absent on a
   * new build, where any content at all is worth a confirm.
   */
  baseline?: string | null;
}

const KEY = 'forge_workout_builder_draft_v1';

export const emptyWorkoutDraft = (): WorkoutDraft => ({ name: '', warmup: [], main: [], cooldown: [], editId: null });

export const workoutDraftTotal = (d: WorkoutDraft) => d.warmup.length + d.main.length + d.cooldown.length;

/** Worth a confirmation before discarding? A name typed or a single exercise added both count. */
export const workoutDraftHasContent = (d: WorkoutDraft) => d.name.trim().length > 0 || workoutDraftTotal(d) > 0;

/** What "unchanged" compares: the name and the three sections, never the edit bookkeeping. */
export const workoutDraftFingerprint = (d: WorkoutDraft) => JSON.stringify([d.name.trim(), d.warmup, d.main, d.cooldown]);

/** Stamp the as-loaded fingerprint onto an edit draft that has just been read from the server. */
export const withWorkoutBaseline = (d: WorkoutDraft): WorkoutDraft => ({ ...d, baseline: workoutDraftFingerprint(d) });

/**
 * Worth a "Discard?" on Back. An edit with a baseline asks only when something CHANGED; a new build (or an
 * edit draft saved before baselines existed) asks whenever it holds anything.
 */
export const workoutDraftIsDirty = (d: WorkoutDraft) =>
  d.editId && d.baseline ? workoutDraftFingerprint(d) !== d.baseline : workoutDraftHasContent(d);

export async function loadWorkoutDraft(): Promise<WorkoutDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<WorkoutDraft>;
    if (!v || typeof v !== 'object') return null;
    // Repaired rather than trusted: a draft written by an older build may be missing a section entirely.
    return {
      name: typeof v.name === 'string' ? v.name : '',
      warmup: Array.isArray(v.warmup) ? v.warmup : [],
      main: Array.isArray(v.main) ? v.main : [],
      cooldown: Array.isArray(v.cooldown) ? v.cooldown : [],
      editId: typeof v.editId === 'string' ? v.editId : null,
      baseline: typeof v.baseline === 'string' ? v.baseline : null,
    };
  } catch {
    return null;
  }
}

export async function saveWorkoutDraft(d: WorkoutDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // best-effort; a dropped autosave costs the draft, never the saved template
  }
}

export async function clearWorkoutDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
