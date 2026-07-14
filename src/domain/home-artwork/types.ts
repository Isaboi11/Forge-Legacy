/**
 * Home Workout Artwork Resolver — public types (Phase 1).
 * See design_reference `Forge Home Artwork Resolver.dc.html` (Spec v1.0) §04.
 */

import type { Sex, UserProfile } from '../profile/schema';
import type { ArtworkCollection, Program, WorkoutSection, MuscleId, Workout } from '../training/schema';

/** The artwork variant actually served (neutral is served from the male placeholder today). */
export type SexVariant = 'male' | 'female' | 'neutral';

/**
 * A session exercise ENRICHED from the catalog — the shape the resolver's
 * composition rungs (3C split, 4 dominant-family) read. Produced by
 * `catalog.ts#enrichSessionExercises` from a `SessionExercise` + the real catalog.
 */
export interface ResolvedExercise {
  catalogKey?: string;
  /** Catalog `movementPattern` (18-value taxonomy). */
  movementPattern: string;
  /** Catalog `equipmentId`. */
  equipmentId: string;
  primaryMuscleIds: MuscleId[];
  workingSets: number;
  section: WorkoutSection;
  optional?: boolean;
}

/** Resolver input. `exercises` is the ENRICHED list (may be empty, as the Home card passes today). */
export interface ResolveContext {
  user?: UserProfile | { sex?: Sex } | null;
  workout?: Workout | null;
  program?: Program | null;
  exercises?: ResolvedExercise[];
}

/** The resolved artwork object — the only thing a consuming surface reads. */
export interface ResolvedArtwork {
  collection: ArtworkCollection;
  key: string;
  sexVariant: SexVariant;
  /** 0.00–1.00 (see spec §06). */
  confidence: number;
  /** Human-readable explanation for logging/debugging. */
  reason: string;
  /** Which rung/field produced the result, e.g. "split:structured". */
  source: string;
  /** Resolved from the manifest by key + served sex — never string-built at the call site. */
  assetPath: string;
}
