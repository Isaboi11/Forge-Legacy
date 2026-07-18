import exercisesData from '../exercise-relationships/source/exercises.json';

/**
 * catalogKey (`exercises.json` id) → display name. The session prescription carries only catalogKeys;
 * the Finish log sheet + the persisted `workout_exercises.name` need the human name. Built once, lazily.
 */
let index: Map<string, string> | null = null;

function getIndex(): Map<string, string> {
  if (!index) {
    index = new Map((exercisesData as { id: string; name: string }[]).map((e) => [e.id, e.name]));
  }
  return index;
}

/** Human name for a catalog key; falls back to a prettified key so nothing renders blank. */
export function exerciseNameFor(catalogKey: string | undefined): string {
  if (!catalogKey) return 'Exercise';
  return getIndex().get(catalogKey) ?? catalogKey.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** One browsable catalog entry — the Program Builder's inline exercise picker (name + family, searchable). */
export type CatalogExercise = { id: string; name: string; family: string; aliases: string[] };

let catalog: CatalogExercise[] | null = null;

/** The full exercise catalog (794), name-sorted — for the Program Builder picker. Built once, lazily. */
export function listExercises(): CatalogExercise[] {
  if (!catalog) {
    catalog = (exercisesData as { id: string; name: string; family: string; aliases?: string[] }[])
      .map((e) => ({ id: e.id, name: e.name, family: e.family, aliases: e.aliases ?? [] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return catalog;
}
