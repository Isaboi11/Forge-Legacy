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
