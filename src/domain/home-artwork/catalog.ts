/**
 * Catalog enrichment — app-facing wrapper (Metro). Imports the real catalog +
 * muscle-role datasets and exposes `enrichSessionExercises`, which Phase 2's Home
 * wiring calls before handing the enriched list to the resolver. The pure logic
 * lives in catalog-core.ts (kept JSON-free so tests import it directly).
 */

import type { SessionExercise } from '../training/schema';
import type { ResolvedExercise } from './types';
import exercisesData from '../exercise-relationships/source/exercises.json';
import muscleRoleData from '../exercise-relationships/source/exercise_muscles.json';
import {
  buildCatalogIndex,
  enrichWithIndex,
  type CatalogExerciseRow,
  type CatalogIndex,
  type MuscleRoleRow,
} from './catalog-core';

let cachedIndex: CatalogIndex | null = null;

function getIndex(): CatalogIndex {
  if (!cachedIndex) {
    cachedIndex = buildCatalogIndex(
      exercisesData as unknown as CatalogExerciseRow[],
      muscleRoleData as unknown as MuscleRoleRow[],
    );
  }
  return cachedIndex;
}

/** Enrich a session's exercises from the real catalog for the resolver. */
export function enrichSessionExercises(items: readonly SessionExercise[]): ResolvedExercise[] {
  return enrichWithIndex(getIndex(), items);
}
