/**
 * Training model — Program / Workout / SessionExercise + the structured enums the
 * Home Workout Artwork Resolver depends on. Phase 0 of the design handoff.
 *
 * The enums below are taken verbatim from the resolver's registered keys
 * (design_reference `forge-artwork-resolver.js` COLLECTIONS) so the model and the
 * resolver (Phase 1) agree by construction. See FORGE_DELTAS.md §6 and the
 * resolver spec §14 (data-model audit) for what these fields feed.
 *
 * Only the single active program is fully populated in placeholder-data.ts today;
 * populating every program/workout is a documented follow-up (FORGE_DELTAS.md §6).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Program taxonomy
// ─────────────────────────────────────────────────────────────────────────────

/** The six program families. Mirrors the handoff's `ForgePrograms` FAMILIES. */
export type ProgramFamily =
  | 'Strength'
  | 'Muscle Building'
  | 'Running'
  | 'Conditioning'
  | 'Full Body & Home'
  | 'Mobility';

export const PROGRAM_FAMILIES: readonly ProgramFamily[] = [
  'Strength',
  'Muscle Building',
  'Running',
  'Conditioning',
  'Full Body & Home',
  'Mobility',
];

export type ProgramDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

/**
 * Program theme — an explicit editorial enum, distinct from `family`. `cutting`
 * / `offseason` come ONLY from program metadata, never from body weight, calories,
 * appearance, or season (resolver spec §02, rung 5).
 */
export type ProgramTheme =
  | 'powerbuilding'
  | 'bodybuilding'
  | 'strength'
  | 'athletic_performance'
  | 'beginner'
  | 'hypertrophy'
  | 'cutting'
  | 'offseason';

export const PROGRAM_THEMES: readonly ProgramTheme[] = [
  'powerbuilding',
  'bodybuilding',
  'strength',
  'athletic_performance',
  'beginner',
  'hypertrophy',
  'cutting',
  'offseason',
];

/**
 * Program structure — disambiguates Legs vs Lower (resolver spec §08). `lower`
 * is only correct inside an explicit `upper_lower` structure; otherwise a
 * lower-body session is `legs`.
 */
export type ProgramStructure = 'upper_lower' | 'ppl' | 'full_body';

export const PROGRAM_STRUCTURES: readonly ProgramStructure[] = ['upper_lower', 'ppl', 'full_body'];

export type ProgramState = 'preview' | 'future' | 'active' | 'graduated' | 'ended-early';

// ─────────────────────────────────────────────────────────────────────────────
// Workout / session taxonomy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Primary session modality. NOTE: distinct from the exercise-level
 * `modality: 'Strength' | 'Cardio'` in the exercise catalog — this describes the
 * whole session and is the resolver's rung-2 signal.
 */
export type Modality =
  | 'strength'
  | 'running'
  | 'walking'
  | 'sprinting'
  | 'cycling'
  | 'swimming'
  | 'rowing'
  | 'mobility'
  | 'stretching'
  | 'yoga'
  | 'recovery'
  | 'conditioning';

export const MODALITIES: readonly Modality[] = [
  'strength',
  'running',
  'walking',
  'sprinting',
  'cycling',
  'swimming',
  'rowing',
  'mobility',
  'stretching',
  'yoga',
  'recovery',
  'conditioning',
];

/** Strength training split (resolver rung 3). */
export type Split = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body' | 'core' | 'conditioning';

export const SPLITS: readonly Split[] = [
  'push',
  'pull',
  'legs',
  'upper',
  'lower',
  'full_body',
  'core',
  'conditioning',
];

/**
 * Artwork collections the Home workout card may draw from. Legacy & Honors are
 * deliberately EXCLUDED — they are reserved for identity/ceremony surfaces and
 * must never appear on an active workout card (FORGE_DELTAS.md §4).
 */
export type ArtworkCollection = 'training_split' | 'workout_modality' | 'program_theme' | 'exercise_family';

export const ARTWORK_COLLECTIONS: readonly ArtworkCollection[] = [
  'training_split',
  'workout_modality',
  'program_theme',
  'exercise_family',
];

/**
 * Canonical anatomical muscle ids. MIRRORS
 * `src/domain/exercise-relationships/source/muscles.json` (the source of truth) —
 * keep in sync if that file changes. Typing `Workout.targetMuscleGroups` against
 * this (rather than free text) is what lets the Phase 1 muscle-group → split
 * bridge resolve deterministically instead of silently missing.
 */
export type MuscleId =
  | 'chest'
  | 'upper_back'
  | 'lats'
  | 'front_deltoids'
  | 'lateral_deltoids'
  | 'rear_deltoids'
  | 'traps'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'rotator_cuff'
  | 'erector_spinae'
  | 'rectus_abdominis'
  | 'obliques'
  | 'transverse_abdominis'
  | 'hip_flexors'
  | 'glutes'
  | 'quadriceps'
  | 'hamstrings'
  | 'adductors'
  | 'abductors'
  | 'calves'
  | 'tibialis_anterior'
  | 'full_body'
  | 'cardiovascular'
  | 'grip'
  | 'mobility'
  | 'balance'
  | 'neck';

export const MUSCLE_IDS: readonly MuscleId[] = [
  'chest',
  'upper_back',
  'lats',
  'front_deltoids',
  'lateral_deltoids',
  'rear_deltoids',
  'traps',
  'biceps',
  'triceps',
  'forearms',
  'rotator_cuff',
  'erector_spinae',
  'rectus_abdominis',
  'obliques',
  'transverse_abdominis',
  'hip_flexors',
  'glutes',
  'quadriceps',
  'hamstrings',
  'adductors',
  'abductors',
  'calves',
  'tibialis_anterior',
  'full_body',
  'cardiovascular',
  'grip',
  'mobility',
  'balance',
  'neck',
];

export type WorkoutSection = 'warmup' | 'main' | 'cooldown';

/** Editorial/program override forcing a specific registered artwork key (resolver rung 1). */
export interface ArtworkOverride {
  collection: ArtworkCollection;
  key: string;
}

/**
 * One exercise inside a session. `catalogKey` links into the real catalog at
 * `src/domain/exercise-relationships/source/exercises.json` (its `id`), from which
 * the resolver reads `movementPattern` / `equipmentId` for the dominant-family
 * rung. Warm-ups/cooldowns and `optional` finishers are excluded from that
 * calculation (resolver rung 4).
 */
export interface SessionExercise {
  catalogKey: string;
  workingSets: number;
  section: WorkoutSection;
  optional?: boolean;
}

export interface Workout {
  name: string;
  focus?: string;
  /** Primary session modality (resolver rung 2). */
  modality?: Modality;
  /** Explicit strength split (resolver rung 3, source A). */
  split?: Split;
  /** Structured muscle targets (resolver rung 3, source B). */
  targetMuscleGroups?: MuscleId[];
  /** Editorial/program artwork override (resolver rung 1). */
  artworkOverride?: ArtworkOverride;
  /** Count shown on the Home card (main-section exercises). */
  exerciseCount?: number;
  exercises?: SessionExercise[];
}

export interface ScheduleDay {
  name: string;
  focus?: string;
}

export interface ProgramProgress {
  completed: number;
  total: number;
}

export interface Program {
  id: string;
  name: string;
  family: ProgramFamily;
  difficulty: ProgramDifficulty;
  /** Authored length, surfaced from the definition (Programs Catalog meta). */
  durationWeeks?: number;
  /** Authored sessions/week, surfaced from the definition (Programs Catalog meta). */
  frequencyPerWeek?: number;
  /** Explicit theme enum (resolver rung 5). */
  theme?: ProgramTheme;
  /** Program structure — disambiguates Legs vs Lower (resolver spec §08). */
  structure?: ProgramStructure;
  schedule: ScheduleDay[];
  progress?: ProgramProgress;
  /** The day surfaced on the Home "Today's Workout" card. */
  nextWorkout?: Workout;
  state: ProgramState;
}

// ─────────────────────────────────────────────────────────────────────────────
// ProgramDefinition — the full authored program, generated from `Programs/*.docx`
// (Decision Queue #6). ADDITIVE to the runtime `Program` above; the .docx are the
// authoritative source and are never modified. See `ingest/` for the conversion.
// ─────────────────────────────────────────────────────────────────────────────

/** A freeform warm-up drill as authored — mostly non-catalog prep, so NOT catalog-linked. */
export interface WarmupItem {
  name: string;
  detail?: string | null;
  text: string;
}

/** An "Approved substitution: …" attached to a prescription in the source. */
export interface ExerciseSubstitution {
  /** Resolved catalog id for the substitute, if mapped. */
  catalogKey?: string;
  /** Substitute name as authored. */
  name: string;
  sets: number;
  reps: number;
  unit?: PrescriptionUnit;
}

export type PrescriptionUnit = 'reps' | 'seconds' | 'minutes' | 'yards';

/** One prescribed main-work exercise, linked to the authoritative catalog by `catalogKey`. */
export interface ExercisePrescription {
  /** Real id in `exercise-relationships/source/exercises.json` (validated at generation). */
  catalogKey: string;
  /** Exercise name exactly as authored in the `.docx`. */
  displayName: string;
  sets: number;
  reps: number;
  /** Upper bound for a rep range (e.g. "20–30 sec" → repsMax 30). */
  repsMax?: number | null;
  unit: PrescriptionUnit;
  /** "per leg" / "per side" prescriptions. */
  per?: 'leg' | 'side' | null;
  restSec?: number | null;
  /** Weeks 5–6 top-set + backoff pattern collapsed into total sets. */
  intensity?: boolean;
  substitution?: ExerciseSubstitution | null;
}

export interface ProgramWorkout {
  /** 'A' | 'B' | 'C' | 'D'. */
  code: string;
  name: string;
  /** Session modality (all Strength programs → 'strength'). */
  modality: Modality;
  /** Per-workout split — the resolver's primary signal (derived via the muscle bridge). */
  split: Split;
  warmup: WarmupItem[];
  main: ExercisePrescription[];
}

/** A progression block, e.g. "Weeks 1–2". */
export interface ProgramBlock {
  label: string;
  weekStart: number;
  weekEnd: number;
  workouts: ProgramWorkout[];
}

export interface ProgramDefinition {
  id: string;
  name: string;
  family: ProgramFamily;
  difficulty?: ProgramDifficulty;
  durationWeeks: number;
  frequencyPerWeek: number;
  environment?: string;
  description?: string;
  goals: string[];
  /** Successor program name as authored (not yet resolved to an id). */
  successorName?: string | null;
  /** PO-confirmed theme (resolver rung 5). */
  theme?: ProgramTheme;
  /**
   * PO-confirmed structure. Deliberately OMITTED for multi-focus programs (e.g. the
   * 4-day, whose Workout B is an upper/accessory day) — per-workout `split` is used
   * instead, so a program-level `full_body` is never asserted where it isn't true.
   */
  structure?: ProgramStructure;
  blocks: ProgramBlock[];
  /** Source status at conversion time (only LOCKED programs are generated). */
  status: string;
  source: 'forge';
  /** Provenance — the authoritative `.docx` this was generated from. */
  sourceFile: string;
}
