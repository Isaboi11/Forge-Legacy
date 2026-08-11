/**
 * Custom exercises — the rules, with no Supabase in them.
 *
 * `Exercise-001-Custom-Exercise-Architecture` and `W-28-Create-Edit-Custom-Exercise` are both LOCKED and
 * were both unbuilt. This is the part of them worth a test: what a valid name is, when to warn about a
 * duplicate, when the cap bites, and how an athlete's own row becomes something the Picker can render
 * beside the 733 shipped ones.
 *
 * Pure so `node --test` can load it — `data.ts` imports the catalogue JSON and cannot be tested.
 */

import type { ExerciseCategoryKey, ExerciseUnit, PickerItem } from './catalog-core.ts';
import { asUnit } from './catalog-core.ts';

/** EX-001-D5. Warned from `CUSTOM_WARN_AT`, blocked at this number. Active rows only. */
export const CUSTOM_LIMIT = 500;
export const CUSTOM_WARN_AT = 480;

export const NAME_MAX = 60;
export const NOTES_MAX = 300;

/** One athlete-authored exercise, as stored. */
export interface CustomExercise {
  id: string;
  name: string;
  category: ExerciseCategoryKey | null;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  environments: string[];
  notes: string | null;
  unit: ExerciseUnit;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** What W-28's form holds. Everything but the name is optional (EX-001-D3). */
export interface CustomDraft {
  name: string;
  category: ExerciseCategoryKey | null;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  environments: string[];
  notes: string;
  unit: ExerciseUnit;
}

export const emptyDraft = (): CustomDraft => ({
  name: '',
  category: null,
  equipment: [],
  primaryMuscles: [],
  secondaryMuscles: [],
  environments: [],
  notes: '',
  unit: 'reps',
});

export const draftFrom = (ex: CustomExercise): CustomDraft => ({
  name: ex.name,
  category: ex.category,
  equipment: [...ex.equipment],
  primaryMuscles: [...ex.primaryMuscles],
  secondaryMuscles: [...ex.secondaryMuscles],
  environments: [...ex.environments],
  notes: ex.notes ?? '',
  unit: ex.unit,
});

/**
 * Is this draft saveable?
 *
 * W-28 §5.1: the Save button is disabled until the name holds at least one non-whitespace character.
 * Nothing else blocks — "fast enough to create in seconds" is the requirement, and every additional
 * mandatory field is a reason to abandon the form mid-workout.
 */
export const canSave = (d: Pick<CustomDraft, 'name'>): boolean => d.name.trim().length > 0;

/** True when the athlete has changed anything — drives the discard prompt on back. */
export function isDirty(a: CustomDraft, b: CustomDraft): boolean {
  const same = (x: readonly string[], y: readonly string[]) => x.length === y.length && x.every((v, i) => v === y[i]);
  return (
    a.name !== b.name ||
    a.category !== b.category ||
    a.notes !== b.notes ||
    a.unit !== b.unit ||
    !same(a.equipment, b.equipment) ||
    !same(a.primaryMuscles, b.primaryMuscles) ||
    !same(a.secondaryMuscles, b.secondaryMuscles) ||
    !same(a.environments, b.environments)
  );
}

/**
 * ══ A DUPLICATE NAME IS A WARNING, NEVER A BLOCK (EX-001-D4) ══
 *
 * Two rules, and the second is the one that is easy to get wrong:
 *
 *  1. Checked only against the athlete's OWN custom exercises. Never against the shipped catalogue —
 *     an athlete who names their machine "Leg Press" because that is what the gym calls it is not
 *     making a mistake, and telling them they are would be the app arguing with their gym.
 *  2. In EDIT mode the exercise being edited is excluded. Without that, opening an exercise and saving
 *     it unchanged warns you that it collides with itself.
 *
 * Case- and whitespace-insensitive, because "Belt squat " and "Belt Squat" are the same thing to
 * everyone except a string comparison.
 */
export function duplicateOf(
  name: string,
  mine: readonly CustomExercise[],
  excludeId?: string | null,
): CustomExercise | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  return (
    mine.find((x) => !x.deletedAt && x.id !== excludeId && x.name.trim().toLowerCase() === key) ?? null
  );
}

export type CapState = 'ok' | 'approaching' | 'full';

/**
 * How close the athlete is to the cap. `count` is ACTIVE exercises — soft-deleting to make room is a
 * legitimate way back under the limit, which is why tombstones are not counted here or in the trigger.
 */
export function capState(count: number): CapState {
  if (count >= CUSTOM_LIMIT) return 'full';
  return count >= CUSTOM_WARN_AT ? 'approaching' : 'ok';
}

export function capMessage(count: number): string | null {
  switch (capState(count)) {
    case 'full':
      return `Exercise limit reached (${CUSTOM_LIMIT}). Delete unused exercises to create new ones.`;
    case 'approaching':
      return `You're approaching the exercise limit (${count}/${CUSTOM_LIMIT}).`;
    default:
      return null;
  }
}

/**
 * ══ THE KEY PREFIX, AND WHY A CUSTOM EXERCISE NEEDS ONE ══
 *
 * Everything downstream keys off `catalogKey` — the logger, lift history, personal records, the
 * exercise detail route, `itemByKey`. A raw uuid would be indistinguishable from a catalogue id at
 * every one of those call sites, so a custom exercise carries a namespace it can be recognised by.
 *
 * The same trick conditioning already uses (`cardio:run`), for the same reason and with the same
 * shape — one prefix, one `isX` predicate, and no reader has to consult a table to know what it holds.
 */
export const CUSTOM_KEY_PREFIX = 'custom:';
export const customKey = (id: string): string => `${CUSTOM_KEY_PREFIX}${id}`;
export const isCustomKey = (key: string | null | undefined): boolean =>
  typeof key === 'string' && key.startsWith(CUSTOM_KEY_PREFIX);
/** The uuid back out of a key, or null if that is not what this is. */
export const customIdOf = (key: string | null | undefined): string | null =>
  isCustomKey(key) ? (key as string).slice(CUSTOM_KEY_PREFIX.length) || null : null;

/**
 * An athlete's exercise, in the shape the Picker renders.
 *
 * ⚠ NOT MERGED INTO `PICKER_DB`. That list is invariant-tested to come wholly from `exercises.json`,
 * name-sorted, and it is a module-level constant — custom exercises are per-athlete and arrive async.
 * They are folded in at the surfaces that want them, exactly as `CONDITIONING_ROWS` already is.
 *
 * EX-001-D9 keeps them OUT of the six FORGE category browse tiles: browsing "Push" is browsing the
 * shipped catalogue, and injecting one athlete's "Belt Squat Machine" into it would blur the line
 * between what Forge has authored and what they have. They are reachable by search and by My Exercises,
 * which is where somebody looking for their own exercise actually looks.
 */
export function customToPickerItem(
  ex: CustomExercise,
  lookup: { muscleName: (id: string) => string; equipName: (id: string) => string },
): PickerItem {
  const muscleIds = [...ex.primaryMuscles, ...ex.secondaryMuscles];
  return {
    key: customKey(ex.id),
    name: ex.name,
    // Uncategorised custom work lands in FULL_BODY — the same fallback `categoryFor` uses for a pattern
    // it does not recognise, rather than a seventh pseudo-category nothing else knows about.
    cat: (ex.category ?? 'FULL_BODY') as ExerciseCategoryKey,
    equipId: ex.equipment[0] ?? 'custom',
    equip: ex.equipment.length ? ex.equipment.map(lookup.equipName).join(', ') : 'Custom',
    // Free Weight is the honest default: it is what the row glyph should show for "an athlete said
    // this exists and did not say what it needs".
    equipClass: 'Free Weight',
    muscleIds,
    muscles: muscleIds.map(lookup.muscleName),
    primaryMuscleIds: [...ex.primaryMuscles],
    difficulty: 'Intermediate',
    pattern: 'Other',
    modality: 'Strength',
    aliases: [],
    environments: [...ex.environments],
    unit: asUnit(ex.unit),
  };
}

/**
 * The athlete's own exercises plus the shipped catalogue, for SEARCH.
 *
 * Theirs first when the names tie, and otherwise plain alphabetical — an athlete who created "Belt
 * Squat Machine" and types it should not have to scroll past a catalogue near-match to reach the row
 * they authored themselves.
 */
export function mergeForSearch(catalogue: readonly PickerItem[], mine: readonly PickerItem[]): PickerItem[] {
  return [...mine, ...catalogue].sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) return byName;
    const aMine = isCustomKey(a.key) ? 0 : 1;
    const bMine = isCustomKey(b.key) ? 0 : 1;
    return aMine - bMine;
  });
}
