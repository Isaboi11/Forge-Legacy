/**
 * Taxonomy bridges (Phase 1 carry-forwards) — explicit, exhaustive, unit-tested
 * lookup tables that translate our REAL catalog vocabulary into the resolver's
 * artwork vocabulary. NEVER string-guess: every input is mapped or explicitly a
 * no-match (null).
 *
 *   (a) MovementPattern → exercise-family   (the 18-value catalog taxonomy)
 *   (b) MuscleId        → split bucket       (push | pull | legs | core)
 *
 * These are pure data — no JSON, no catalog import — so both Metro and
 * `node --test` consume them identically.
 */

import type { MuscleId, Split } from '../training/schema';

// ─────────────────────────────────────────────────────────────────────────────
// (a) MovementPattern → exercise-family
// Keys are the canonical `MovementPattern` values from
// exercise-relationships/schema.ts. Every one of the 18 is present (a test
// asserts this). `null` = deliberate no-match (not a strength family).
// ─────────────────────────────────────────────────────────────────────────────

export type ExerciseFamily =
  | 'pressing'
  | 'pulling'
  | 'squatting'
  | 'hip_hinge'
  | 'carry'
  | 'rotation'
  | 'isolation'
  | 'machines'
  | 'bodyweight';

export const MOVEMENT_PATTERN_TO_FAMILY: Readonly<Record<string, ExerciseFamily | null>> = {
  'Horizontal Push': 'pressing',
  'Vertical Push': 'pressing',
  'Horizontal Pull': 'pulling',
  'Vertical Pull': 'pulling',
  'Squat / Knee Dominant': 'squatting',
  'Hinge / Hip Dominant': 'hip_hinge',
  'Carry': 'carry',
  'Core': 'rotation', // the artwork family "rotation" represents trunk/core work
  'Elbow Flexion': 'isolation',
  'Elbow Extension': 'isolation',
  'Hip Isolation': 'isolation',
  'Shoulder Isolation': 'isolation',
  'Neck Isolation': 'isolation',
  'Calf / Ankle': 'isolation',
  // Non-strength / non-discriminating patterns → resolved by other rungs, not family:
  'Cardio / Locomotion': null,
  'Power / Plyometric': null,
  'Mobility': null,
  'Other': null,
};

/** Equipment ids that define a "machines" / "bodyweight" session (equipment.json category). */
export const MACHINE_EQUIPMENT: ReadonlySet<string> = new Set([
  'cable',
  'selectorized_machine',
  'smith_machine',
]);
export const BODYWEIGHT_EQUIPMENT: ReadonlySet<string> = new Set(['bodyweight']);

/**
 * Exercise family for one enriched exercise. Equipment method (machines /
 * bodyweight) wins first — it only *matters* at the dominant-family rung, which
 * requires a whole-session majority (resolver spec §09). Otherwise the movement
 * pattern decides.
 */
export function familyOfExercise(movementPattern: string, equipmentId: string): ExerciseFamily | null {
  if (MACHINE_EQUIPMENT.has(equipmentId)) return 'machines';
  if (BODYWEIGHT_EQUIPMENT.has(equipmentId)) return 'bodyweight';
  return MOVEMENT_PATTERN_TO_FAMILY[movementPattern] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// (b) MuscleId → split bucket → split
// Buckets mirror the resolver's muscle logic (spec §08). `null` = a muscle that
// does not discriminate a split (accessory / system muscles).
// ─────────────────────────────────────────────────────────────────────────────

export type SplitBucket = 'push' | 'pull' | 'legs' | 'core';

export const MUSCLE_TO_BUCKET: Readonly<Record<MuscleId, SplitBucket | null>> = {
  // push
  chest: 'push',
  front_deltoids: 'push',
  lateral_deltoids: 'push',
  triceps: 'push',
  // pull
  upper_back: 'pull',
  lats: 'pull',
  rear_deltoids: 'pull',
  traps: 'pull',
  biceps: 'pull',
  // legs
  glutes: 'legs',
  quadriceps: 'legs',
  hamstrings: 'legs',
  adductors: 'legs',
  abductors: 'legs',
  calves: 'legs',
  tibialis_anterior: 'legs',
  hip_flexors: 'legs',
  // core
  rectus_abdominis: 'core',
  obliques: 'core',
  transverse_abdominis: 'core',
  erector_spinae: 'core',
  // non-discriminating (accessory / system)
  forearms: null,
  rotator_cuff: null,
  neck: null,
  grip: null,
  full_body: null,
  cardiovascular: null,
  mobility: null,
  balance: null,
};

/**
 * Resolve a split from a set of muscle buckets, mirroring the resolver spec:
 * prefer the broader category (upper > push, full_body > legs). `structure`
 * disambiguates Legs vs Lower — `lower` only inside an explicit upper/lower program.
 */
export function splitFromMuscles(muscleIds: readonly MuscleId[], structure: string | null): Split | null {
  let push = false;
  let pull = false;
  let legs = false;
  let core = false;
  for (const m of muscleIds) {
    const bucket = MUSCLE_TO_BUCKET[m];
    if (bucket === 'push') push = true;
    else if (bucket === 'pull') pull = true;
    else if (bucket === 'legs') legs = true;
    else if (bucket === 'core') core = true;
  }
  if (core && !push && !pull && !legs) return 'core';
  if (legs && (push || pull)) return 'full_body';
  if (legs) return structure === 'upper_lower' ? 'lower' : 'legs';
  if (push && pull) return 'upper';
  if (push) return 'push';
  if (pull) return 'pull';
  return null;
}
