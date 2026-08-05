import type { TemplateExercise } from '@/data/templates-live';

/**
 * FORGE STARTER TEMPLATES — the six sessions an athlete has before they have made one.
 *
 * Templates were capture-only, then authorable (W-25). Both require the athlete to have already done
 * something: you can keep a session you trained, or plan one you intend to. Neither answers the first
 * screen a new athlete sees, which was an empty panel reading "No templates yet" under a heading that
 * promised templates. `Forge Strength Start.dc.html` has meanwhile said "Start a workout you've saved
 * — **or one built by Forge**" since it was drawn, and the second half of that sentence was untrue.
 *
 * ── SHIPPED AS DEFINITIONS, ADOPTED AS COPIES ────────────────────────────────────────────────────
 *
 * The same model as the built-in program catalogue (`adoptCatalogProgram`, `programs-live.ts`): the
 * JSON here is the DEFINITION, and adopting one writes the athlete their own row in
 * `workout_templates` stamped with `source_definition_id`. From that moment it is an ordinary template
 * — editable in W-25, deletable, and accruing its own history.
 *
 * The alternative — seeded rows with a null `athlete_id` and a read policy — was rejected, and not on
 * taste:
 *
 *   · `template_detail()` and `workout_templates_list()` (0095) are both `security invoker` and both
 *     end `where t.athlete_id = auth.uid()`. `save_workout` re-checks ownership and DEGRADES TO AN
 *     UNATTRIBUTED WORKOUT when it fails — so every session trained from a Forge template would
 *     silently lose its `template_id`, and W-27 would show no history for the one kind of template
 *     everybody used.
 *   · `use_count` is DERIVED from `workouts.template_id`, which 0095's header argues at length it must
 *     be. A shared row makes that a GLOBAL count — how many times everyone on the platform has trained
 *     Push Day — rendered on a screen that means "how many times you have".
 *   · The athlete must be able to edit their copy, so copy-on-write is required either way. Seeding
 *     defers the fork rather than removing it, and leaves two representations of one thing.
 *
 * As definitions, an app update that rewrites `push-day` cannot rewrite what anyone already adopted —
 * the same contract a live program holds against its catalogue entry.
 *
 * ── CONTENT PROVENANCE ───────────────────────────────────────────────────────────────────────────
 *
 * Push Day · Pull Day · Leg Day · Full Body Express are the design's own, from
 * `design_reference/Forge Modal Library Design/forge-templates.js` `seeds()`, lift for lift and set
 * for set. Upper Body and Lower Body are added to cover the other common split, built from the same
 * movements. Every `catalogKey` is a real id in the 794-exercise catalogue and is checked by
 * `__tests__/definitions.test.mjs` — a typo here would reach an athlete as a lift with no detail page.
 *
 * ⚠ NO ISOMETRIC HOLDS. The design's Leg Day cools down with a Plank at "45 reps", which means 45
 * SECONDS. `TemplateExercise` has `targetReps`, and `targetDurationSec` for cardio blocks only — a
 * strength row cannot express a hold. The plank is omitted rather than shipped as a prescription for
 * forty-five planks. This is a pre-existing limit of the model (W-25's builder has it too), not one
 * this file introduces.
 */

export interface StarterTemplateDefinition {
  /** Stable — becomes `workout_templates.source_definition_id`. Never renumber or reuse. */
  id: string;
  name: string;
  /** One line for the shelf card. */
  blurb: string;
  level: 'Beginner' | 'Intermediate';
  exercises: TemplateExercise[];
}

/** Terser than repeating the object shape thirty-four times, and it keeps every row the same shape. */
const ex = (catalogKey: string, name: string, sets: number, targetReps: number, section: 'warmup' | 'main' | 'cooldown' = 'main'): TemplateExercise => ({
  catalogKey,
  name,
  sets,
  targetReps,
  section,
  kind: 'strength',
});

export const STARTER_TEMPLATES: readonly StarterTemplateDefinition[] = [
  {
    id: 'push-day',
    name: 'Push Day',
    blurb: 'Chest, shoulders and triceps — the pressing half of an upper/lower split.',
    level: 'Intermediate',
    exercises: [
      ex('push-up', 'Push-Up', 2, 15, 'warmup'),
      ex('barbell-bench-press', 'Barbell Bench Press', 4, 8),
      ex('barbell-overhead-press', 'Barbell Overhead Press', 3, 8),
      ex('dumbbell-incline-bench-press', 'Dumbbell Incline Bench Press', 3, 10),
      ex('high-to-low-cable-fly', 'High-to-Low Cable Fly', 3, 12),
      ex('cable-triceps-pushdown', 'Cable Triceps Pushdown', 3, 12),
    ],
  },
  {
    id: 'pull-day',
    name: 'Pull Day',
    blurb: 'Back and biceps. Starts heavy off the floor, finishes with the arms.',
    level: 'Intermediate',
    exercises: [
      ex('cable-face-pull', 'Cable Face Pull', 2, 15, 'warmup'),
      ex('barbell-deadlift', 'Barbell Deadlift', 3, 5),
      ex('pull-up', 'Pull-Up', 4, 8),
      ex('barbell-bent-over-row', 'Barbell Bent-Over Row', 3, 10),
      ex('cable-lat-pulldown', 'Cable Lat Pulldown', 3, 12),
      ex('barbell-biceps-curl', 'Barbell Biceps Curl', 3, 12),
    ],
  },
  {
    id: 'leg-day',
    name: 'Leg Day',
    blurb: 'Squat first, then everything that holds the squat up.',
    level: 'Intermediate',
    exercises: [
      ex('barbell-back-squat', 'Barbell Back Squat', 4, 6),
      ex('barbell-romanian-deadlift', 'Barbell Romanian Deadlift', 3, 8),
      ex('machine-leg-press', 'Machine Leg Press', 3, 12),
      ex('dumbbell-walking-lunge', 'Dumbbell Walking Lunge', 3, 10),
      ex('lying-leg-curl-machine', 'Lying Leg Curl Machine', 3, 12),
    ],
  },
  {
    id: 'full-body-express',
    name: 'Full Body Express',
    blurb: 'Four compound lifts, whole body. For the day you have forty minutes.',
    level: 'Beginner',
    exercises: [
      ex('push-up', 'Push-Up', 2, 12, 'warmup'),
      ex('barbell-back-squat', 'Barbell Back Squat', 3, 8),
      ex('barbell-bench-press', 'Barbell Bench Press', 3, 8),
      ex('barbell-bent-over-row', 'Barbell Bent-Over Row', 3, 10),
      ex('barbell-overhead-press', 'Barbell Overhead Press', 3, 10),
    ],
  },
  {
    id: 'upper-body',
    name: 'Upper Body',
    blurb: 'Push and pull in the same session — the upper half of an upper/lower week.',
    level: 'Beginner',
    exercises: [
      ex('barbell-bench-press', 'Barbell Bench Press', 4, 6),
      ex('barbell-bent-over-row', 'Barbell Bent-Over Row', 4, 6),
      ex('seated-dumbbell-shoulder-press', 'Seated Dumbbell Shoulder Press', 3, 10),
      ex('cable-lat-pulldown', 'Cable Lat Pulldown', 3, 12),
      ex('dumbbell-hammer-curl', 'Dumbbell Hammer Curl', 3, 12),
      ex('cable-triceps-pushdown', 'Cable Triceps Pushdown', 3, 12),
    ],
  },
  {
    id: 'lower-body',
    name: 'Lower Body',
    blurb: 'Quads, hamstrings, glutes and calves — the other half of the week.',
    level: 'Beginner',
    exercises: [
      ex('barbell-back-squat', 'Barbell Back Squat', 4, 6),
      ex('barbell-hip-thrust', 'Barbell Hip Thrust', 3, 10),
      ex('bulgarian-split-squat', 'Bulgarian Split Squat', 3, 10),
      ex('seated-leg-curl-machine', 'Seated Leg Curl Machine', 3, 12),
      ex('leg-extension-machine', 'Leg Extension Machine', 3, 15),
      ex('standing-calf-raise-machine', 'Standing Calf Raise Machine', 4, 12),
    ],
  },
];

export function getStarterTemplates(): readonly StarterTemplateDefinition[] {
  return STARTER_TEMPLATES;
}

export function getStarterTemplate(id: string): StarterTemplateDefinition | null {
  return STARTER_TEMPLATES.find((t) => t.id === id) ?? null;
}

/** "6 lifts · 21 sets" — the same phrasing `templateSummary` gives an adopted one. */
export function starterSummary(t: StarterTemplateDefinition): string {
  const lifts = t.exercises.length;
  const sets = t.exercises.reduce((n, e) => n + e.sets, 0);
  return `${lifts} ${lifts === 1 ? 'lift' : 'lifts'} · ${sets} ${sets === 1 ? 'set' : 'sets'}`;
}
