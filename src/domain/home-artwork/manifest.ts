/**
 * Asset manifest (Phase 1) — the single registry mapping a registered artwork key
 * (`<collection>.<key>.<servedSex>`) to a concrete asset + metadata. Per the
 * handoff (README §Phase 1, spec §05): the resolver returns a KEY; this manifest
 * is the ONLY place a file path is produced. Call sites never build filenames.
 *
 * Keys and file directories were verified against the delivered artwork on disk
 * (`design_reference/.../assets/artwork/<dir>/<sex>/<file>.png`). For all four
 * resolvable collections the female set equals the male set. Legacy & Honors are
 * NOT registered here and are additionally guarded as reserved (FORGE_DELTAS §4) —
 * they can never be selected for the workout card even via an override.
 *
 * Paths point at `assets/artwork/...`, where Phase 4 imports the high-res masters.
 * `version` is `1.0.0` (prototype crops; Phase 4 bumps it); `aspectRatio` /
 * `placement` carry the intended card treatment (spec §05) and are refined with
 * the real masters.
 */

import type { ArtworkCollection } from '../training/schema';
import type { SexVariant } from './types';

export interface AssetEntry {
  assetPath: string;
  version: string;
  aspectRatio: number;
  placement: string;
}

interface CollectionDef {
  dir: string;
  keys: readonly string[];
}

/** Declarative source of the registry — keys verified against files on disk. */
const COLLECTIONS: Readonly<Record<ArtworkCollection, CollectionDef>> = {
  training_split: {
    dir: 'training-splits',
    keys: ['push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'core', 'conditioning'],
  },
  workout_modality: {
    dir: 'workout-modalities',
    keys: ['strength', 'running', 'walking', 'sprinting', 'cycling', 'swimming', 'rowing', 'mobility', 'stretching', 'yoga', 'recovery'],
  },
  program_theme: {
    dir: 'program-themes',
    keys: ['powerbuilding', 'bodybuilding', 'strength', 'athletic_performance', 'beginner', 'hypertrophy', 'cutting', 'offseason'],
  },
  exercise_family: {
    dir: 'exercise-families',
    keys: ['pressing', 'pulling', 'squatting', 'hip_hinge', 'carry', 'rotation', 'isolation', 'machines', 'bodyweight'],
  },
};

/** Reserved collections — never valid on the workout card, even if assets exist. */
const RESERVED: ReadonlySet<string> = new Set(['legacy', 'honors']);

/** Sexes that have real files on disk. Neutral is served from `male` (documented placeholder). */
const SERVED_SEXES: readonly Exclude<SexVariant, 'neutral'>[] = ['male', 'female'];

const BASE = 'assets/artwork';

/** Canonical (underscore) key → on-disk (hyphen) filename. */
function fileKey(key: string): string {
  return key.replace(/_/g, '-');
}

function registryKey(collection: string, key: string, servedSex: string): string {
  return `${collection}.${key}.${servedSex}`;
}

/**
 * Materialize the registry ONCE, centrally (this module IS the manifest — this is
 * not a "call site" building a filename). Every registered key resolves through
 * this Map; anything not present is a miss.
 */
const REGISTRY: Map<string, AssetEntry> = (() => {
  const map = new Map<string, AssetEntry>();
  (Object.keys(COLLECTIONS) as ArtworkCollection[]).forEach((collection) => {
    const def = COLLECTIONS[collection];
    def.keys.forEach((key) => {
      SERVED_SEXES.forEach((servedSex) => {
        map.set(registryKey(collection, key, servedSex), {
          assetPath: `${BASE}/${def.dir}/${servedSex}/${fileKey(key)}.png`,
          version: '1.0.0',
          aspectRatio: 1,
          placement: 'card-hero-right',
        });
      });
    });
  });
  return map;
})();

/** A reserved collection may never be selected for the workout card. */
export function isReserved(collection: string): boolean {
  return RESERVED.has(collection);
}

/** True only for a registered, non-reserved (collection, key). */
export function hasKey(collection: string, key: string): boolean {
  if (isReserved(collection)) return false;
  return REGISTRY.has(registryKey(collection, key, 'male'));
}

/** Validate an editorial/program override against the registry + reserved guard. */
export function validateOverride(collection: string, key: string): boolean {
  return hasKey(collection, key);
}

/**
 * Resolve the concrete asset for a registered key + served sex. Returns null for
 * an unregistered/reserved key (the caller then fails safe to the next rung).
 */
export function resolveAsset(collection: string, key: string, servedSex: Exclude<SexVariant, 'neutral'>): string | null {
  if (isReserved(collection)) return null;
  return REGISTRY.get(registryKey(collection, key, servedSex))?.assetPath ?? null;
}

/** Exposed for tests/tooling. */
export const MANIFEST_COLLECTIONS = COLLECTIONS;
