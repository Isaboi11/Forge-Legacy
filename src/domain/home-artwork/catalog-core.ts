/**
 * Catalog enrichment core (pure — no JSON import, so `node --test` and Metro both
 * consume it). Turns `SessionExercise` (catalogKey only) into the `ResolvedExercise`
 * shape the resolver's composition rungs read, using catalog + muscle-role data
 * passed in by the caller (see catalog.ts for the app wiring).
 */

import type { MuscleId, SessionExercise } from '../training/schema';
import type { ResolvedExercise } from './types';

export interface CatalogExerciseRow {
  id: string;
  movementPattern: string;
  equipmentId: string;
}

export interface MuscleRoleRow {
  exerciseId: string;
  muscleId: string;
  role: string; // 'Primary' | 'Secondary'
}

export interface CatalogIndexEntry {
  movementPattern: string;
  equipmentId: string;
  primaryMuscleIds: MuscleId[];
}

export type CatalogIndex = Map<string, CatalogIndexEntry>;

/** Build a catalogKey → { movementPattern, equipmentId, primaryMuscleIds } index. */
export function buildCatalogIndex(
  exercises: readonly CatalogExerciseRow[],
  muscleRoles: readonly MuscleRoleRow[],
): CatalogIndex {
  const primaryByExercise = new Map<string, MuscleId[]>();
  for (const row of muscleRoles) {
    if (row.role !== 'Primary') continue;
    const list = primaryByExercise.get(row.exerciseId) ?? [];
    list.push(row.muscleId as MuscleId);
    primaryByExercise.set(row.exerciseId, list);
  }
  const index: CatalogIndex = new Map();
  for (const ex of exercises) {
    index.set(ex.id, {
      movementPattern: ex.movementPattern,
      equipmentId: ex.equipmentId,
      primaryMuscleIds: primaryByExercise.get(ex.id) ?? [],
    });
  }
  return index;
}

/** Enrich a session's exercises against a prebuilt index. Dangling keys are dropped (fail safe). */
export function enrichWithIndex(index: CatalogIndex, items: readonly SessionExercise[]): ResolvedExercise[] {
  const out: ResolvedExercise[] = [];
  for (const item of items) {
    const entry = index.get(item.catalogKey);
    if (!entry) continue;
    out.push({
      catalogKey: item.catalogKey,
      movementPattern: entry.movementPattern,
      equipmentId: entry.equipmentId,
      primaryMuscleIds: entry.primaryMuscleIds,
      workingSets: item.workingSets,
      section: item.section,
      optional: item.optional,
    });
  }
  return out;
}
