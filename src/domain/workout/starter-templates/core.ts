import type { TemplateExercise } from '@/data/templates-live';
import type { Sex } from '@/domain/profile/schema';

/**
 * Starter-template types and selection rules — everything that does NOT touch `definitions.json`.
 *
 * SPLIT FROM `index.ts` FOR ONE REASON: `node --test` cannot load a plain JSON import (it demands
 * `with { type: 'json' }`, which is not what Metro is given anywhere else in this repo), so a test that
 * imported the wired module would fail on the import rather than on anything it was checking. The same
 * split `templates-live.ts` makes for `template-format.ts`, and for the same reason.
 *
 * Every function here takes the definitions it operates on. `index.ts` binds the shipped set to them.
 */

export type StarterLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type StarterVenue = 'gym' | 'home';
/** 'all' is the three legacy splits, which predate the axis and are not tracked by sex. */
export type StarterAudience = 'men' | 'women' | 'all';
export type StarterFocus =
  | 'push'
  | 'pull'
  | 'legs'
  | 'arms'
  | 'chest-triceps'
  | 'back-biceps'
  | 'glutes'
  | 'upper'
  | 'lower'
  | 'full-body';

export interface StarterTemplateDefinition {
  /** Stable — becomes `workout_templates.source_definition_id`. Never renumber or reuse. */
  id: string;
  name: string;
  /** One line for the shelf card. */
  blurb: string;
  level: StarterLevel;
  focus: StarterFocus;
  venue: StarterVenue;
  audience: StarterAudience;
  exercises: TemplateExercise[];
}

/**
 * What "at home" is allowed to assume: no rack, no cable, no selectorized stack, no sled.
 *
 * NARROWER THAN `equipment.json`'s "Home Gym" environment, deliberately. That table tags the BARBELL as
 * available in a home gym, which is true of a home gym and false of a home: a session opening with a
 * loaded back squat is not a home session for someone training in a bedroom, however the equipment table
 * classifies the bar. This is the product answer, and `definitions.test.mjs` holds every `venue: 'home'`
 * row to it against the catalogue so the two cannot drift apart silently.
 */
export const HOME_EQUIPMENT: ReadonlySet<string> = new Set([
  'bodyweight',
  'dumbbell',
  'resistance_band',
  'kettlebell',
  'suspension_trainer',
  'medicine_ball',
]);

/** Display order and labels for the browse filter. The three legacy splits sit last. */
export const STARTER_FOCUSES: readonly { key: StarterFocus; label: string }[] = [
  { key: 'push', label: 'Push' },
  { key: 'pull', label: 'Pull' },
  { key: 'legs', label: 'Legs' },
  { key: 'glutes', label: 'Glutes' },
  { key: 'arms', label: 'Arms' },
  { key: 'chest-triceps', label: 'Chest & Triceps' },
  { key: 'back-biceps', label: 'Back & Biceps' },
  { key: 'upper', label: 'Upper Body' },
  { key: 'lower', label: 'Lower Body' },
  { key: 'full-body', label: 'Full Body' },
];

export const STARTER_LEVELS: readonly StarterLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

export const focusLabel = (f: StarterFocus): string =>
  STARTER_FOCUSES.find((x) => x.key === f)?.label ?? f;

/**
 * Which tracks an athlete is shown by default.
 *
 * `'unspecified'` SEES EVERYTHING. It is the explicit default for someone who has not chosen, and the
 * profile model's own rule is that it is never silently coerced to `'male'` — so it must not be here
 * either. Showing both tracks is the only answer that neither guesses nor hides half the library.
 *
 * A DEFAULT, not a restriction: the browse screen's audience filter is free, and a man who wants the
 * women's glute day can take it.
 */
export function defaultAudiences(sex: Sex | null | undefined): readonly StarterAudience[] {
  if (sex === 'male') return ['men', 'all'];
  if (sex === 'female') return ['women', 'all'];
  return ['men', 'women', 'all'];
}

export interface StarterFilter {
  audiences?: readonly StarterAudience[];
  venue?: StarterVenue | null;
  level?: StarterLevel | null;
  focus?: StarterFocus | null;
  /** Ids the athlete has already adopted — filtered out, since the shelf offers what you haven't taken. */
  exclude?: ReadonlySet<string>;
}

export function filterStarters(
  defs: readonly StarterTemplateDefinition[],
  f: StarterFilter = {},
): StarterTemplateDefinition[] {
  return defs.filter(
    (t) =>
      (!f.audiences || f.audiences.includes(t.audience)) &&
      (!f.venue || t.venue === f.venue) &&
      (!f.level || t.level === f.level) &&
      (!f.focus || t.focus === f.focus) &&
      !f.exclude?.has(t.id),
  );
}

/** Intermediate before Beginner before Advanced; gym before home. The order a sample is drawn in. */
const rank = (t: StarterTemplateDefinition): number =>
  (t.level === 'Intermediate' ? 0 : t.level === 'Beginner' ? 1 : 2) * 2 + (t.venue === 'gym' ? 0 : 1);

/**
 * The handful the Templates hub offers inline, above the athlete's own list.
 *
 * ONE PER FOCUS, so the sample reads as a range of sessions rather than three levels of the same one —
 * the full grid is a tap away and does not need previewing on a screen that is mostly somebody else's
 * templates. Intermediate first because it is the commonest starting point and the level the original
 * six were written at; gym first because it needs no equipment caveat. Deterministic: no shuffling, so
 * the shelf does not rearrange itself between visits.
 */
export function suggestedStarters(
  defs: readonly StarterTemplateDefinition[],
  sex: Sex | null | undefined,
  adopted: ReadonlySet<string>,
  limit = 4,
): StarterTemplateDefinition[] {
  const pool = filterStarters(defs, { audiences: defaultAudiences(sex), exclude: adopted });
  const out: StarterTemplateDefinition[] = [];

  for (const { key } of STARTER_FOCUSES) {
    if (out.length >= limit) break;
    const best = pool.filter((t) => t.focus === key).sort((a, b) => rank(a) - rank(b))[0];
    if (best) out.push(best);
  }
  // Every focus already represented and still short — fall back to whatever is left rather than
  // showing a shelf with two cards on it.
  if (out.length < limit) {
    for (const t of pool.slice().sort((a, b) => rank(a) - rank(b))) {
      if (out.length >= limit) break;
      if (!out.includes(t)) out.push(t);
    }
  }
  return out;
}

/** "6 lifts · 21 sets" — the same phrasing `templateSummary` gives an adopted one. */
export function starterSummary(t: Pick<StarterTemplateDefinition, 'exercises'>): string {
  const lifts = t.exercises.length;
  const sets = t.exercises.reduce((n, e) => n + e.sets, 0);
  return `${lifts} ${lifts === 1 ? 'lift' : 'lifts'} · ${sets} ${sets === 1 ? 'set' : 'sets'}`;
}

/** "Gym · Intermediate" — the two facts a card needs that its name doesn't already carry. */
export function starterMeta(t: Pick<StarterTemplateDefinition, 'venue' | 'level'>): string {
  return `${t.venue === 'home' ? 'Home' : 'Gym'} · ${t.level}`;
}
