/**
 * What Holt's day becomes when the athlete keeps it — `Save for later` and `Start it now`.
 *
 * ══ WHY THIS IS A DOMAIN MODULE AND NOT TEN LINES IN THE SHEET ══
 *
 * It is a translation between three shapes that do not agree, and each disagreement is a way to lose
 * training silently:
 *
 *   · `buildDayWorkout` returns a `ProgramDay` — `warmup` / `main` / `cooldown`, and **it only ever
 *     fills `main`**. The other two come back empty, every time.
 *   · A `workout_templates` row is a flat list with a `section` on each entry.
 *   · The Active Workout opens on four fields and no more.
 *
 * A mapping that quietly invented a warm-up, or turned "to failure" into eight reps, would produce a
 * template that looks right and prescribes something Holt never wrote. That belongs somewhere
 * `node --test` can prove it, not in a component.
 *
 * ⚠ THIS MODULE IMPORTS NOTHING. The shapes are declared structurally so it stays loadable under
 * `node --test`, and so the call site's real types (`TemplateExercise`, `WorkoutLaunch['exercises']`)
 * check assignability at the boundary where they actually matter.
 */

/** The fields the mapping reads off `buildDayWorkout`'s result. */
export interface BuiltDay {
  name: string;
  main: {
    catalogKey?: string | null;
    name: string;
    sets?: number;
    /** `'F'` is to failure — a real prescription with no column to live in. See below. */
    reps?: number | 'F' | null;
    coachNote?: string | null;
  }[];
}

export interface TemplateRow {
  catalogKey: string | null;
  name: string;
  sets: number;
  targetReps: number;
  section: 'main';
  coachNote?: string;
}

/** The four fields the Active Workout opens with. */
export interface LaunchRow {
  catalogKey: string | null;
  name: string;
  sets: number;
  targetReps: number;
}

/**
 * ⚠ THREE SETS IS THE FALLBACK AND IT IS NEVER REACHED IN PRACTICE — `prescribeReps` always sets one.
 * It exists because `sets` is optional on the shape, and a template row with `undefined` sets is a row
 * the workout screen cannot draw.
 */
const SETS_FALLBACK = 3;

/**
 * ⚠ `'F'` MEANS TO FAILURE, AND A TEMPLATE HAS NO FIELD FOR IT.
 *
 * `targetReps` is a number. Writing a plausible one — eight, ten — would turn "go until you can't" into
 * a specific target the athlete never chose, which is the engine's prescription being rewritten by a
 * type mismatch. `0` is what the rest of the app already reads as "no number here", the same value a
 * freestyle row carries, so the workout screen shows an open rep field rather than a fabricated target.
 */
const targetReps = (reps: number | 'F' | null | undefined): number => (typeof reps === 'number' ? reps : 0);

/**
 * The day as a `workout_templates` row set.
 *
 * ⚠ `main` ONLY, and that is the honest answer rather than a shortcut: `warmup` and `cooldown` come back
 * empty from `buildDayWorkout`, so there is nothing to carry. A template that claimed sections it does
 * not have would be the one thing this surface must never do — say Holt wrote something he did not.
 */
export function templateRowsFor(day: BuiltDay): TemplateRow[] {
  return day.main.map((e) => ({
    catalogKey: e.catalogKey ?? null,
    name: e.name,
    sets: e.sets ?? SETS_FALLBACK,
    targetReps: targetReps(e.reps),
    section: 'main' as const,
    ...(e.coachNote ? { coachNote: e.coachNote } : {}),
  }));
}

/**
 * The same day, as the shape the Active Workout opens with.
 *
 * The coaching cue does NOT travel: `WorkoutLaunch.exercises` carries four fields, and inventing a fifth
 * would put a field into a payload three other callers write. Starting a day Holt built loses his cue;
 * saving it as a template keeps it. That is a real gap and it is stated rather than papered over.
 */
export function launchRowsFor(day: BuiltDay): LaunchRow[] {
  return day.main.map((e) => ({
    catalogKey: e.catalogKey ?? null,
    name: e.name,
    sets: e.sets ?? SETS_FALLBACK,
    targetReps: targetReps(e.reps),
  }));
}
