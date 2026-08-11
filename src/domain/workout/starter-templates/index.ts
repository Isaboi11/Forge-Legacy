import type { Sex } from '@/domain/profile/schema';
import DEFINITIONS_JSON from './definitions.json';
import {
  filterStarters as filterIn,
  suggestedStarters as suggestIn,
  type StarterFilter,
  type StarterTemplateDefinition,
} from './core';

/**
 * FORGE STARTER TEMPLATES — the sessions an athlete has before they have made one.
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
 * ── THE LIBRARY: 6 → 81 ──────────────────────────────────────────────────────────────────────────
 *
 * The original six were one session per common split, gym only, and unisex by omission. They are still
 * here and their IDS ARE UNCHANGED — `push-day`, `pull-day` and `leg-day` are now the gym/Intermediate
 * men's slots of a full grid rather than one-offs, which is why their DISPLAY NAMES gained
 * "— Intermediate" to sit beside their siblings. Renaming a definition is safe where renumbering an id
 * would not be: `adoptStarterTemplate` snapshots the name into the athlete's row, so a copy taken
 * yesterday keeps the name it was taken under and only the shelf changes.
 *
 * The grid around them is seven FOCUSES × two VENUES × three LEVELS, tracked for men and women, minus
 * the men's glute day nobody asked for:
 *
 *   focus    push · pull · legs · arms · chest-triceps · back-biceps · glutes
 *   venue    gym · home          — 'home' means no rack, no cable, no stack (`HOME_EQUIPMENT`)
 *   level    Beginner · Intermediate · Advanced
 *   audience men · women · all   — 'all' is the three legacy splits that predate the axis
 *
 * At 81 the shelf stopped being a list: `/templates` now samples one per focus and `/forge-templates`
 * browses the grid.
 *
 * ── WHY `venue` IS AUTHORED, NOT DERIVED ─────────────────────────────────────────────────────────
 *
 * It could be derived — every row's equipment is in the catalogue, so "does this need a gym" is a
 * computable question. The two answers differ, and `HOME_EQUIPMENT`'s comment in `core.ts` says how.
 *
 * ── ⚠ NO ISOMETRIC HOLDS, AND THE TRAP THAT LOOKS LIKE ONE ───────────────────────────────────────
 *
 * The design's Leg Day cools down with a Plank at "45 reps", which means 45 SECONDS. `TemplateExercise`
 * has `targetReps`, and `targetMi`/`targetDurationSec` for cardio blocks only — a strength row cannot
 * express a hold.
 *
 * `schemeText` LOOKS like it can: a cooldown row with `targetReps >= 30` renders as "2 × 30s". That
 * convention lives only on the preview surfaces (the starter preview, W-27, program share). The LOGGER
 * renders `{targetReps} Reps` flat, so a 45-second plank authored that way previews as "45s" and then
 * asks the athlete for forty-five planks. `definitions.test.mjs` fails any strength row with
 * `targetReps >= 30` for exactly this reason. If holds are ever wanted here, the session model already
 * has `targetSec` — `TemplateExercise` is the layer that would need to carry it.
 *
 * ── CARDIO FINISHERS ─────────────────────────────────────────────────────────────────────────────
 *
 * A cooldown row may be a conditioning block. It carries `kind: 'cardio'` and a `cardio:<activity>` key,
 * which `workout.tsx` turns back into a real cardio block rather than sets of a run. Its target is
 * `targetMi` and ONLY `targetMi` — `cardioExercise` does not read `targetDurationSec`, so a duration
 * would be accepted, stored, and silently dropped on the way into the session. The test rejects one.
 *
 * ── CONTENT PROVENANCE ───────────────────────────────────────────────────────────────────────────
 *
 * Push Day · Pull Day · Leg Day · Full Body Express are the design's own, from
 * `design_reference/Forge Modal Library Design/forge-templates.js` `seeds()`, lift for lift and set
 * for set. Upper Body and Lower Body cover the other common split, built from the same movements. The
 * 75 added around them are authored in-repo against the 809-exercise catalogue.
 *
 * Every `catalogKey` is a real id in that catalogue and is checked by `__tests__/definitions.test.mjs`
 * — a typo here would reach an athlete as a lift with no detail page, and this is the only content in
 * the app that names catalogue exercises by hand rather than picking them.
 */

/* Everything from `core` EXCEPT `filterStarters` and `suggestedStarters`, which are re-bound below to
   the shipped set. A blanket `export *` re-exports the two-argument originals under the same names and
   collides with the wrappers. */
export {
  HOME_EQUIPMENT,
  STARTER_FOCUSES,
  STARTER_LEVELS,
  defaultAudiences,
  focusLabel,
  starterMeta,
  starterSummary,
} from './core';
export type {
  StarterAudience,
  StarterFilter,
  StarterFocus,
  StarterLevel,
  StarterTemplateDefinition,
  StarterVenue,
} from './core';

/** JSON import widens literals (level: string); the definitions test enforces the real contract. */
export const STARTER_TEMPLATES: readonly StarterTemplateDefinition[] =
  DEFINITIONS_JSON as unknown as StarterTemplateDefinition[];

export function getStarterTemplates(): readonly StarterTemplateDefinition[] {
  return STARTER_TEMPLATES;
}

export function getStarterTemplate(id: string): StarterTemplateDefinition | null {
  return STARTER_TEMPLATES.find((t) => t.id === id) ?? null;
}

/** `core.filterStarters` bound to the shipped set — what every screen actually wants. */
export function filterStarters(f: StarterFilter = {}): StarterTemplateDefinition[] {
  return filterIn(STARTER_TEMPLATES, f);
}

/** `core.suggestedStarters` bound to the shipped set. */
export function suggestedStarters(
  sex: Sex | null | undefined,
  adopted: ReadonlySet<string>,
  limit = 4,
): StarterTemplateDefinition[] {
  return suggestIn(STARTER_TEMPLATES, sex, adopted, limit);
}
